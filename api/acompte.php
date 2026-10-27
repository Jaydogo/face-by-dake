<?php
/* =========================================================
   DAKÉ© · lien d'acompte envoyé dans l'e-mail de confirmation
   ?d=<demande>&k=<signature>  → crée une page de paiement Stripe et y envoie le client
   ?d=<demande>&retour=1&session_id=…  → retour après paiement : vérifié auprès de Stripe, puis noté
   ========================================================= */
require __DIR__ . '/dake-mail.php';
require __DIR__ . '/stripe.php';
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');

$id = (string)($_GET['d'] ?? '');
$base = dake_base();
function page($titre, $texte) {
  http_response_code(200); header('Content-Type: text/html; charset=utf-8');
  $h = fn($s) => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
  echo '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>' . $h($titre) . ' · DAKÉ©</title>'
    . '<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#F3EDE3;color:#1A1412;font:16px/1.5 "Helvetica Neue",Arial,sans-serif}main{max-width:440px;padding:32px 24px}h1{font:300 2.4rem/1.05 Georgia,serif;letter-spacing:-.03em;margin:0 0 12px}p{margin:0 0 20px;color:#5f524b}a{color:#1A1412}</style></head>'
    . '<body><main><h1>' . $h($titre) . '</h1><p>' . $h($texte) . '</p><p><a href="mailto:contact@dake.studio">contact@dake.studio</a> · <a href="/">dake.studio</a></p></main></body></html>';
  exit;
}
if (!preg_match('/^\d{8}-\d{6}-[a-f0-9]{6}$/', $id) || !is_file("$base/$id.json")) page('Lien introuvable', 'Ce lien de paiement n’est pas valable. Répondez simplement à l’e-mail reçu, je vous renvoie le bon lien.');
$d = json_decode(file_get_contents("$base/$id.json"), true) ?: [];
$en = str_starts_with($d['langue'] ?? 'fr', 'en');
$retour = '/seances/' . ($en ? 'en.html' : '');
// Fin du parcours : bandeau sur la page Séances si ce site l'a, sinon une page ici même
function fin($etat, $en, $retour) {
  if (is_file($_SERVER['DOCUMENT_ROOT'] . '/seances/index.html')) { header("Location: $retour?acompte=$etat", true, 303); exit; }
  $M = [
    'ok' => $en ? ['Deposit received, thank you!', 'Your session is booked. The payment receipt is on its way by email.'] : ['Acompte reçu, merci !', 'Votre séance est réservée. Le reçu de paiement arrive par e-mail.'],
    'deja' => $en ? ['Deposit already paid', 'All set: your session is booked.'] : ['Acompte déjà réglé', 'Tout est en ordre : votre séance est réservée.'],
    'annule' => $en ? ['Payment interrupted', 'Nothing was charged. You can resume anytime from the link in your confirmation email.'] : ['Paiement interrompu', 'Rien n’a été débité. Vous pouvez le reprendre à tout moment depuis le lien de l’e-mail de confirmation.'],
    'attente' => $en ? ['Payment being checked', 'You will get an email as soon as it is confirmed.'] : ['Paiement en cours de vérification', 'Vous recevrez une confirmation par e-mail dès qu’il est validé.'],
  ][$etat];
  page($M[0], $M[1]);
}
if (($_GET['etat'] ?? '') === 'annule') fin('annule', $en, $retour);

// Retour de Stripe : on ne croit que Stripe (session payée et rattachée à cette demande)
if (isset($_GET['retour'])) {
  $sid = (string)($_GET['session_id'] ?? '');
  if (stripe_ok() && preg_match('/^cs_[A-Za-z0-9_]+$/', $sid)) {
    $s = stripe_call('GET', "checkout/sessions/$sid");
    if ($s && ($s['payment_status'] ?? '') === 'paid' && ($s['metadata']['demande'] ?? '') === $id) { acompte_paye($id, $s); fin('ok', $en, $retour); }
  }
  fin('attente', $en, $retour);
}

if (!hash_equals(acompte_token($id), (string)($_GET['k'] ?? ''))) page('Lien introuvable', 'Ce lien de paiement n’est pas valable. Répondez simplement à l’e-mail reçu, je vous renvoie le bon lien.');
$suivi = suivi_lire()[$id] ?? [];
if (!empty($suivi['acompte']['paye'])) fin('deja', $en, $retour);
$data = $d['data'] ?? [];
$cents = euros_cents($data['acompte'] ?? '');
if (!stripe_ok() || $cents < 50) page($en ? 'Online payment unavailable' : 'Paiement en ligne indisponible', $en ? 'Simply reply to the confirmation email and I will send you another way to pay the deposit.' : 'Répondez simplement à l’e-mail de confirmation : je vous envoie un autre moyen de régler l’acompte.');

$formule = preg_replace('/\s*\([^)]*€[^)]*\)\s*$/u', '', $data['formule'] ?? '');
$host = 'https://' . $_SERVER['HTTP_HOST'];
$s = stripe_call('POST', 'checkout/sessions', [
  'mode' => 'payment',
  // Carte seulement (Apple Pay et Google Pay compris) : pas de Klarna, Bancontact… pour un acompte
  'payment_method_types' => ['card'],
  'submit_type' => 'pay',
  'custom_text' => ['submit' => ['message' => $en ? 'The deposit secures your slot and is deducted from the total. One free reschedule up to 48 h before; after that, or if you cancel, the deposit is kept.' : 'L’acompte bloque votre créneau et se déduit du total. Un report gratuit jusqu’à 48 h avant ; au-delà, ou en cas d’annulation, l’acompte reste acquis.']],
  'locale' => $en ? 'en' : 'fr',
  'customer_email' => filter_var($data['email'] ?? '', FILTER_VALIDATE_EMAIL) ?: null,
  'client_reference_id' => $id,
  'metadata' => ['demande' => $id],
  'payment_intent_data' => ['metadata' => ['demande' => $id], 'description' => ($en ? 'Deposit · ' : 'Acompte · ') . $formule],
  'line_items' => [[
    'quantity' => 1,
    'price_data' => ['currency' => 'eur', 'unit_amount' => $cents, 'product_data' => [
      'name' => ($en ? 'Deposit · ' : 'Acompte · ') . ($formule ?: 'DAKÉ© Studio'),
      'description' => !empty($data['date']) && !empty($suivi['heure']) ? dake_quand($data['date'], $suivi['heure'], $en) : 'DAKÉ© Studio']],
  ]],
  'success_url' => "$host/api/acompte.php?d=$id&retour=1&session_id={CHECKOUT_SESSION_ID}",
  'cancel_url' => "$host/api/acompte.php?d=$id&etat=annule",
]);
if (!$s || empty($s['url'])) page($en ? 'Payment page unavailable' : 'Paiement momentanément indisponible', $en ? 'Please try again in a few minutes, or reply to the confirmation email.' : 'Réessayez dans quelques minutes, ou répondez à l’e-mail de confirmation.');
header('Location: ' . $s['url'], true, 303);
