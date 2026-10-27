<?php
/* =========================================================
   DAKÉ© · Stripe prévient le site quand un acompte est payé
   (même si le client ferme la page avant de revenir sur le site).
   À déclarer dans Stripe → Développeurs → Webhooks, événement checkout.session.completed.
   ========================================================= */
require __DIR__ . '/dake-mail.php';
require __DIR__ . '/stripe.php';
header('Content-Type: application/json');
$payload = file_get_contents('php://input', false, null, 0, 200000);
$secret = stripe_conf()['webhook'] ?? '';
$sig = [];
foreach (explode(',', $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '') as $p) { [$k, $v] = array_pad(explode('=', $p, 2), 2, ''); $sig[$k][] = $v; }
$t = (int)($sig['t'][0] ?? 0);
$ok = $secret && $t && abs(time() - $t) < 600
  && array_filter($sig['v1'] ?? [], fn($v) => hash_equals(hash_hmac('sha256', "$t.$payload", $secret), $v));
if (!$ok) { http_response_code(400); echo '{"ok":false}'; exit; }
$e = json_decode($payload, true);
$s = $e['data']['object'] ?? [];
$id = (string)($s['metadata']['demande'] ?? '');
if (in_array($e['type'] ?? '', ['checkout.session.completed', 'checkout.session.async_payment_succeeded'], true)
  && ($s['payment_status'] ?? '') === 'paid' && preg_match('/^\d{8}-\d{6}-[a-f0-9]{6}$/', $id)) acompte_paye($id, $s);
echo '{"ok":true}';
