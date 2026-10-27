<?php
/* =========================================================
   DAKĒ — réception des demandes (séances, projets de marque)
   Appelé par le site au moment où le visiteur envoie sa demande.
   - une demande = un fichier JSON, rangé HORS du dossier public du site
     (/home/<compte>/dake-demandes), lisible seulement par le back office
   - un e-mail de notification part vers contact@dake.studio
   - garde-fous : taille maximale, champ piège anti-robots, 10 envois / heure / adresse
   ========================================================= */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');

function reply($code, $data) { http_response_code($code); echo json_encode($data); exit; }

if ($_SERVER['REQUEST_METHOD'] !== 'POST') reply(405, ['ok' => false]);

$raw = file_get_contents('php://input', false, null, 0, 40000);
$in = json_decode($raw, true);
if (!is_array($in)) reply(400, ['ok' => false]);
// Champ piège : invisible pour un humain, rempli par les robots
if (!empty($in['site'])) reply(200, ['ok' => true]);

$type = in_array($in['type'] ?? '', ['seance', 'projet'], true) ? $in['type'] : 'autre';
$canal = in_array($in['canal'] ?? '', ['email', 'instagram', 'site'], true) ? $in['canal'] : 'site';

// Nettoyage : uniquement des textes courts, à plat
function clean($v, $max = 2000) {
  if (is_array($v)) return array_slice(array_map(fn($x) => clean($x, 300), $v), 0, 30);
  if (is_bool($v) || is_int($v) || is_float($v)) return $v;
  $v = trim(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/u', '', (string)$v));
  return mb_substr($v, 0, $max);
}
$data = [];
foreach ((array)($in['data'] ?? []) as $k => $v) {
  if (!preg_match('/^[a-zA-Z_]{1,40}$/', (string)$k)) continue;
  $data[$k] = clean($v);
}
if (!$data) reply(400, ['ok' => false]);

$base = dirname($_SERVER['DOCUMENT_ROOT']) . '/dake-demandes';
if (!is_dir($base) && !@mkdir($base, 0700, true)) reply(500, ['ok' => false]);

// Limite : 10 demandes par heure et par adresse (empreinte, l'adresse n'est pas gardée)
$who = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . '|dake');
$limFile = $base . '/.limites.json';
$lim = json_decode(@file_get_contents($limFile) ?: '{}', true) ?: [];
$now = time();
$lim = array_filter($lim, fn($t) => max($t) > $now - 3600);
$mine = array_values(array_filter($lim[$who] ?? [], fn($t) => $t > $now - 3600));
if (count($mine) >= 10) reply(429, ['ok' => false]);
$mine[] = $now; $lim[$who] = $mine;
@file_put_contents($limFile, json_encode($lim), LOCK_EX);

$id = gmdate('Ymd-His') . '-' . bin2hex(random_bytes(3));
$rec = [
  'id' => $id,
  'recu' => gmdate('c'),
  'type' => $type,
  'canal' => $canal,
  'page' => clean($in['page'] ?? '', 300),
  'langue' => clean($in['langue'] ?? 'fr', 5),
  'site' => clean($_SERVER['HTTP_HOST'] ?? '', 100),
  'data' => $data,
];
if (!@file_put_contents("$base/$id.json", json_encode($rec, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX)) reply(500, ['ok' => false]);

// Notification par e-mail (le récapitulatif complet est dans le back office)
$nom = trim(($data['prenom'] ?? '') . ' ' . ($data['nom'] ?? ''));
$quoi = $type === 'seance' ? 'Séance' : ($type === 'projet' ? 'Projet de marque' : 'Demande');
$sujet = "Nouvelle demande · $quoi" . ($nom ? " · $nom" : '');
if (str_starts_with($_SERVER['HTTP_HOST'] ?? '', 'staging.')) $sujet = '[TEST] ' . $sujet;
$lignes = ["$quoi — reçue le " . date('d/m/Y à H:i') . " (via $canal)", ''];
foreach ($data as $k => $v) $lignes[] = ucfirst(str_replace('_', ' ', $k)) . ' : ' . (is_array($v) ? implode(', ', $v) : (is_bool($v) ? ($v ? 'oui' : 'non') : $v));
// Toutes les demandes (dake.studio, face.dake.studio, site de test) arrivent dans le même back office
$bo = str_starts_with($_SERVER['HTTP_HOST'] ?? '', 'staging.') ? 'https://staging.dake.studio/admin/' : 'https://face.dake.studio/admin/';
$lignes[] = ''; $lignes[] = 'Back office : ' . $bo;
$headers = "From: DAKE <contact@dake.studio>\r\nContent-Type: text/plain; charset=utf-8";
if (!empty($data['email']) && filter_var($data['email'], FILTER_VALIDATE_EMAIL)) $headers .= "\r\nReply-To: " . $data['email'];
@mail('contact@dake.studio', '=?UTF-8?B?' . base64_encode($sujet) . '?=', implode("\n", $lignes), $headers);

// Accusé de réception au visiteur : message court et neutre, sans recopier la demande
// (n'importe qui peut saisir l'adresse d'un autre), avec la carte de visite DAKĒ
if (!empty($data['email']) && filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
  $en = str_starts_with($rec['langue'], 'en');
  $h = fn($s) => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
  $prenom = mb_substr($data['prenom'] ?? '', 0, 40);
  $txt = $en
    ? ['Your request has been received', 'Hello' . ($prenom ? " $prenom" : '') . ',', 'Thank you, your request has been received. I will get back to you as soon as possible.', 'To add anything, simply reply to this email.', 'Speak soon,', 'REQUEST RECEIVED']
    : ['Nous avons bien reçu votre demande', 'Bonjour' . ($prenom ? " $prenom" : '') . ',', 'Merci, votre demande est bien arrivée. Je reviens vers vous au plus vite.', 'Pour ajouter une précision, répondez simplement à cet e-mail.', 'À très vite,', 'DEMANDE REÇUE'];
  $ar_sujet = 'DAKĒ STUDIO · ' . $txt[0];
  if (str_starts_with($_SERVER['HTTP_HOST'] ?? '', 'staging.')) $ar_sujet = '[TEST] ' . $ar_sujet;

  $mono = "font-family:'IBM Plex Mono','SF Mono',Menlo,Consolas,'Courier New',monospace;font-size:9px;line-height:1.35;letter-spacing:0.04em;color:#141414;-webkit-text-size-adjust:none;text-size-adjust:none";
  $serif = "font-family:Newsreader,Georgia,'Times New Roman',serif;font-size:16px;line-height:24px;color:#141414";
  $lien = 'color:#141414;text-decoration:none';
  $carte = '<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse"><tr>'
    . '<td width="226" height="151" bgcolor="#efefed" valign="bottom" style="width:226px;height:151px;padding:0 13px 12px;background:#efefed;vertical-align:bottom"><a href="https://dake.studio" style="text-decoration:none"><img src="https://dake.studio/dake-logo.png" width="226" height="60" alt="DAKÉ®" style="display:block;width:226px;height:60px;border:0"></a></td>'
    . '<td width="10" style="width:10px;min-width:10px;font-size:1px;line-height:1px">&nbsp;</td>'
    . '<td width="226" height="151" bgcolor="#efefed" valign="top" style="width:226px;height:151px;padding:12px 13px 0;background:#efefed;vertical-align:top"><table cellpadding="0" cellspacing="0" border="0" width="226" style="border-collapse:collapse;width:226px">'
    . "<tr><td width=\"76\" style=\"width:76px;padding:0;vertical-align:top;$mono\">DAKÉ®</td><td style=\"padding:0;vertical-align:top;$mono\">JAY DOGO<br>CREATIVE DIRECTOR<br>+ PHOTOGRAPHER</td></tr>"
    . "<tr><td style=\"padding:22px 0 0;vertical-align:top;$mono\">A.</td><td style=\"padding:22px 0 0;vertical-align:top;$mono\">PARIS, FRANCE</td></tr>"
    . "<tr><td style=\"padding:6px 0 0;vertical-align:top;$mono\">E:</td><td style=\"padding:6px 0 0;vertical-align:top;$mono\"><a href=\"mailto:contact@dake.studio\" style=\"$lien\">CONTACT@DAKE.STUDIO</a></td></tr>"
    . "<tr><td style=\"padding:0;vertical-align:top;$mono\">W:</td><td style=\"padding:0;vertical-align:top;$mono\"><a href=\"https://dake.studio\" style=\"$lien\">DAKE.STUDIO</a></td></tr>"
    . "<tr><td style=\"padding:0 0 12px;vertical-align:top;$mono\">I:</td><td style=\"padding:0 0 12px;vertical-align:top;$mono\"><a href=\"https://instagram.com/dake.creatives\" style=\"$lien\">@DAKE.CREATIVES</a><br><a href=\"https://instagram.com/dake.face\" style=\"$lien\">@DAKE.FACE</a><br><a href=\"https://instagram.com/ledockernoir\" style=\"$lien\">@LEDOCKERNOIR</a></td></tr>"
    . '</table></td></tr></table>';
  $html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"></head>'
    . '<body style="margin:0;padding:0;background:#ffffff;-webkit-text-size-adjust:100%;text-size-adjust:100%">'
    . '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background:#ffffff"><tr><td align="left" style="padding:40px 24px">'
    . '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="514" style="border-collapse:collapse;max-width:514px">'
    . "<tr><td style=\"padding:0 0 28px;$mono;color:#8a8a86\">" . $txt[5] . ' — ' . date('d.m.Y') . '</td></tr>'
    . "<tr><td style=\"padding:0 0 16px;$serif\">" . $h($txt[1]) . '</td></tr>'
    . "<tr><td style=\"padding:0 0 16px;$serif\">" . $h($txt[2]) . '</td></tr>'
    . "<tr><td style=\"padding:0 0 16px;$serif\">" . $h($txt[3]) . '</td></tr>'
    . "<tr><td style=\"padding:0 0 36px;$serif\">" . $h($txt[4]) . '</td></tr>'
    . "<tr><td>$carte</td></tr>"
    . '</table></td></tr></table></body></html>';
  $plain = implode("\n\n", array_slice($txt, 1, 4)) . "\n\n--\nDAKÉ® · JAY DOGO\nCREATIVE DIRECTOR + PHOTOGRAPHER\nPARIS, FRANCE\ncontact@dake.studio · https://dake.studio\n@dake.creatives · @dake.face · @ledockernoir";

  $b = 'dake-' . bin2hex(random_bytes(8));
  $corps = "--$b\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($plain))
    . "--$b\r\nContent-Type: text/html; charset=utf-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($html))
    . "--$b--";
  $ar_headers = "From: DAKE STUDIO <contact@dake.studio>\r\nReply-To: contact@dake.studio\r\nAuto-Submitted: auto-replied\r\nMIME-Version: 1.0\r\nContent-Type: multipart/alternative; boundary=\"$b\"";
  @mail($data['email'], '=?UTF-8?B?' . base64_encode($ar_sujet) . '?=', $corps, $ar_headers);
}

reply(200, ['ok' => true, 'id' => $id]);
