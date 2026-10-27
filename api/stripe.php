<?php
/* =========================================================
   DAKÉ© · acomptes payés avec Stripe (page de paiement hébergée par Stripe)
   Les clés vivent hors du site et hors de GitHub, dans /home/<compte>/dake-stripe.json :
     { "test": { "secret": "sk_test_…", "webhook": "whsec_…" },
       "live": { "secret": "sk_live_… ou rk_live_…", "webhook": "whsec_…" } }
   Le site de test (staging, local) n'utilise que « test » ; les vrais sites que « live ».
   Une vraie demande se paie toujours sur dake.studio, une demande de test sur le site de test.
   Le lien envoyé au client (api/acompte.php?d=…&k=…) n'expire pas : il crée une
   page de paiement Stripe neuve à chaque clic, tant que l'acompte n'est pas réglé.
   ========================================================= */
if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) { http_response_code(404); exit; }

function dake_base() { return dirname($_SERVER['DOCUMENT_ROOT']) . '/dake-demandes'; }
function dake_host_test($host = null) { return (bool)preg_match('/^(staging\.|localhost|127\.0\.0\.1)/', $host ?? ($_SERVER['HTTP_HOST'] ?? '')); }
// Demande de test : faite sur le site de test ou au nom de « Test » (comme dans le back office)
function dake_demande_test($d) {
  $nom = trim(($d['data']['prenom'] ?? '') . ' ' . ($d['data']['nom'] ?? '')) ?: ($d['data']['email'] ?? '');
  return dake_host_test($d['site'] ?? '') || (bool)preg_match('/^test\b/i', $nom);
}
function stripe_env() { return dake_host_test() ? 'test' : 'live'; }
// Clés du mode demandé ; l'ancien fichier à une seule clé ne sert que si son mode correspond
function stripe_conf($env = null) {
  static $all = null;
  if ($all === null) $all = json_decode(@file_get_contents(dirname($_SERVER['DOCUMENT_ROOT']) . '/dake-stripe.json') ?: '{}', true) ?: [];
  $env = $env ?? stripe_env();
  $c = isset($all['test']) || isset($all['live']) ? ($all[$env] ?? []) : $all;
  return preg_match('/^(sk|rk)_' . $env . '_/', $c['secret'] ?? '') ? $c : [];
}
function stripe_ok($env = null) { return !empty(stripe_conf($env)['secret']); }
function stripe_mode() { return stripe_env(); }

function stripe_call($method, $path, $params = []) {
  $ch = curl_init('https://api.stripe.com/v1/' . $path . ($method === 'GET' && $params ? '?' . http_build_query($params) : ''));
  curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 20, CURLOPT_USERPWD => stripe_conf()['secret'] . ':',
    CURLOPT_HTTPHEADER => ['Stripe-Version: 2024-06-20']]);
  if ($method === 'POST') { curl_setopt($ch, CURLOPT_POST, true); curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($params)); }
  $r = curl_exec($ch); $code = curl_getinfo($ch, CURLINFO_RESPONSE_CODE); curl_close($ch);
  $j = json_decode($r ?: '', true);
  return $code >= 200 && $code < 300 && is_array($j) ? $j : null;
}

// « 50 € », « 216,67 € » → centimes
function euros_cents($v) { $n = (float)str_replace(',', '.', preg_replace('/[^\d,.]/u', '', (string)$v)); return (int)round($n * 100); }

// Lien d'acompte : signé avec une clé du serveur, impossible à deviner pour une autre demande
function acompte_cle() {
  $f = dake_base() . '/.cle';
  $k = @file_get_contents($f);
  if (!$k) { $k = bin2hex(random_bytes(32)); @file_put_contents($f, $k, LOCK_EX); @chmod($f, 0600); }
  return $k;
}
function acompte_token($id) { return substr(hash_hmac('sha256', $id, acompte_cle()), 0, 24); }
// Une vraie demande se paie sur dake.studio ; une demande de test sur le site où l'on est
function acompte_lien($id, $test = false) { return 'https://' . ($test ? ($_SERVER['HTTP_HOST'] ?? 'staging.dake.studio') : 'dake.studio') . '/api/acompte.php?d=' . $id . '&k=' . acompte_token($id); }

function suivi_lire() { return json_decode(@file_get_contents(dake_base() . '/.suivi.json') ?: '{}', true) ?: []; }

// Acompte reçu : noté dans le suivi de la demande (+ historique), et e-mail à contact@ ; une seule fois par demande
function acompte_paye($id, $session) {
  $f = dake_base() . '/.suivi.json';
  $fp = fopen($f, 'c+'); if (!$fp) return false;
  flock($fp, LOCK_EX);
  $suivi = json_decode(stream_get_contents($fp) ?: '{}', true) ?: [];
  $cur = $suivi[$id] ?? ['statut' => 'nouvelle', 'note' => ''];
  if (!empty($cur['acompte']['paye'])) { flock($fp, LOCK_UN); fclose($fp); return false; }
  $montant = ($session['amount_total'] ?? 0) / 100;
  $cur['acompte'] = ['paye' => gmdate('c'), 'montant' => $montant, 'session' => $session['id'] ?? '', 'mode' => !empty($session['livemode']) ? 'live' : 'test'];
  $cur['hist'] = array_slice(array_merge($cur['hist'] ?? [], [['statut' => 'acompte', 'date' => gmdate('c')]]), -30);
  $suivi[$id] = $cur;
  ftruncate($fp, 0); rewind($fp); fwrite($fp, json_encode($suivi, JSON_UNESCAPED_UNICODE)); fflush($fp);
  flock($fp, LOCK_UN); fclose($fp);
  $d = json_decode(@file_get_contents(dake_base() . "/$id.json") ?: '{}', true) ?: [];
  $nom = trim(($d['data']['prenom'] ?? '') . ' ' . ($d['data']['nom'] ?? ''));
  $sujet = 'Acompte reçu · ' . number_format($montant, 2, ',', ' ') . ' €' . ($nom ? " · $nom" : '') . ($cur['acompte']['mode'] === 'test' ? ' [TEST]' : '');
  $corps = "Acompte de " . number_format($montant, 2, ',', ' ') . " € payé par carte (Stripe" . ($cur['acompte']['mode'] === 'test' ? ', mode test' : '') . ").\n\n"
    . ($nom ? "Client : $nom\n" : '') . 'Séance : ' . ($d['data']['formule'] ?? '') . "\n\nBack office : https://" . ($_SERVER['HTTP_HOST'] ?? '') . "/admin/";
  @mail('contact@dake.studio', '=?UTF-8?B?' . base64_encode($sujet) . '?=', $corps, "From: =?UTF-8?B?" . base64_encode('DAKÉ©') . "?= <contact@dake.studio>\r\nContent-Type: text/plain; charset=utf-8");
  acompte_merci($d, $cur, $montant);
  return true;
}

// Au client : « Acompte reçu, votre créneau est bloqué », avec le récapitulatif et la règle de report
function acompte_merci($d, $cur, $montant) {
  $data = $d['data'] ?? [];
  if (!function_exists('dake_mail') || !filter_var($data['email'] ?? '', FILTER_VALIDATE_EMAIL)) return;
  $en = str_starts_with($d['langue'] ?? 'fr', 'en');
  $p = mb_substr(trim($data['prenom'] ?? ''), 0, 40);
  $eur = fn($v) => rtrim(rtrim(number_format($v, 2, ',', "\u{202F}"), '0'), ',') . "\u{00A0}€";
  $adresse = (json_decode(@file_get_contents(dake_base() . '/.reglages.json') ?: '{}', true) ?: [])['adresse'] ?? '';
  $solde = euros_cents($data['total'] ?? '') / 100 - $montant;
  $details = array_values(array_filter([
    [$en ? 'Session' : 'Séance', preg_replace('/\s*\([^)]*€[^)]*\)\s*$/u', '', $data['formule'] ?? '')],
    !empty($data['date']) ? ['Date', dake_jour($data['date'], $en)] : null,
    !empty($cur['heure']) ? [$en ? 'Time' : 'Heure', dake_heure($cur['heure'], $en)] : null,
    $adresse ? [$en ? 'Address' : 'Adresse', $adresse, 'https://www.google.com/maps/search/?api=1&query=' . rawurlencode($adresse)] : null,
    [$en ? 'Deposit paid' : 'Acompte payé', $eur($montant)],
    $solde > 0 ? [$en ? 'Balance' : 'Solde', $eur($solde) . ($en ? ' on the day' : ' le jour J')] : null,
  ]));
  $blocs = $en ? [
    ['titre' => 'Deposit received, your slot is booked.'],
    'Hello' . ($p ? " $p" : '') . ', thank you! Your deposit has arrived, so your session is now locked in:',
    ['details' => $details],
    'A small reminder: you can reschedule once, free of charge, up to 48 h before. Just reply to this email.',
    'I look forward to welcoming you to the studio.',
    "Speak soon,\nJay",
  ] : [
    ['titre' => 'Acompte reçu, votre créneau est bloqué.'],
    'Bonjour' . ($p ? " $p" : '') . ', merci ! Votre acompte est bien arrivé, votre séance est donc réservée :',
    ['details' => $details],
    'Petit rappel : vous pouvez décaler votre séance une fois, sans frais, jusqu’à 48 h avant. Répondez simplement à cet e-mail.',
    'J’ai hâte de vous accueillir au studio.',
    "À très vite,\nJay",
  ];
  $sujet = 'DAKÉ© Studio · ' . ($en ? 'Deposit received, your session is booked' : 'Acompte reçu, votre séance est réservée');
  dake_mail($data['email'], $sujet, $en ? 'Deposit received' : 'Acompte reçu', $blocs, [], dake_demande_test($d));
}

