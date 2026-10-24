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

reply(200, ['ok' => true, 'id' => $id]);
