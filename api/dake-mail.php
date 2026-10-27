<?php
/* =========================================================
   DAKÉ© · e-mails envoyés aux clients (accusé de réception, confirmation de séance)
   Une petite ligne en haut, les paragraphes, puis la carte de visite DAKÉ©.
   Version HTML + version texte. Inclus par api/demande.php et admin/api/demandes.php.
   ========================================================= */
if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) { http_response_code(404); exit; }

function dake_mail($to, $subject, $label, $blocks, $extraHeaders = []) {
  // Blocs : un texte = un paragraphe ; ['titre' => …] ; ['details' => [[libellé, valeur, lien?], …]] ; ['cta' => …, 'url' => …, 'note' => …]
  // Typographie française : espace insécable avant ? ! : ; (le signe ne part pas seul à la ligne)
  $h = fn($s) => htmlspecialchars(preg_replace('/ ([?!:;])/u', "\u{00A0}$1", (string)$s), ENT_QUOTES, 'UTF-8');
  if (str_starts_with($_SERVER['HTTP_HOST'] ?? '', 'staging.')) $subject = '[TEST] ' . $subject;
  $ink = '#1A1412'; $mute = '#8A7F78'; $line = '#E8E2DA';
  $sans = "font-family:'Instrument Sans','Helvetica Neue',Helvetica,Arial,sans-serif";
  $mono = "font-family:'IBM Plex Mono','SF Mono',Menlo,Consolas,'Courier New',monospace";
  $cm = "$mono;font-size:9px;line-height:1.35;letter-spacing:0.04em;color:#141414;-webkit-text-size-adjust:none;text-size-adjust:none";
  $lien = 'color:#141414;text-decoration:none';
  $carte = '<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse"><tr>'
    . '<td class="dk-c" width="226" height="151" bgcolor="#efefed" valign="bottom" style="width:226px;height:151px;padding:0 13px 12px;background:#efefed;vertical-align:bottom"><a href="https://dake.studio" style="text-decoration:none"><img src="https://dake.studio/dake-logo.png" width="226" height="60" alt="DAKÉ©" style="display:block;width:226px;height:60px;border:0"></a></td>'
    . '<td class="dk-gap" width="10" style="width:10px;min-width:10px;font-size:1px;line-height:1px">&nbsp;</td>'
    . '<td class="dk-c dk-c2" width="226" height="151" bgcolor="#efefed" valign="top" style="width:226px;height:151px;padding:12px 13px 0;background:#efefed;vertical-align:top"><table cellpadding="0" cellspacing="0" border="0" width="226" style="border-collapse:collapse;width:226px">'
    . "<tr><td width=\"76\" style=\"width:76px;padding:0;vertical-align:top;$cm\">DAKÉ©</td><td style=\"padding:0;vertical-align:top;$cm\">JAY DOGO<br>CREATIVE DIRECTOR<br>+ PHOTOGRAPHER</td></tr>"
    . "<tr><td style=\"padding:22px 0 0;vertical-align:top;$cm\">A.</td><td style=\"padding:22px 0 0;vertical-align:top;$cm\">PARIS, FRANCE</td></tr>"
    . "<tr><td style=\"padding:6px 0 0;vertical-align:top;$cm\">E:</td><td style=\"padding:6px 0 0;vertical-align:top;$cm\"><a href=\"mailto:contact@dake.studio\" style=\"$lien\">CONTACT@DAKE.STUDIO</a></td></tr>"
    . "<tr><td style=\"padding:0;vertical-align:top;$cm\">W:</td><td style=\"padding:0;vertical-align:top;$cm\"><a href=\"https://dake.studio\" style=\"$lien\">DAKE.STUDIO</a></td></tr>"
    . "<tr><td style=\"padding:0 0 12px;vertical-align:top;$cm\">I:</td><td style=\"padding:0 0 12px;vertical-align:top;$cm\"><a href=\"https://instagram.com/dake.creatives\" style=\"$lien\">@DAKE.CREATIVES</a><br><a href=\"https://instagram.com/dake.face\" style=\"$lien\">@DAKE.FACE</a><br><a href=\"https://instagram.com/ledockernoir\" style=\"$lien\">@LEDOCKERNOIR</a></td></tr>"
    . '</table></td></tr></table>';
  $rows = ''; $plain = [];
  foreach ($blocks as $b) {
    if (is_string($b)) {
      $rows .= "<tr><td style=\"padding:0 0 16px;$sans;font-size:15px;line-height:24px;color:$ink\">" . nl2br($h($b)) . '</td></tr>';
      $plain[] = $b;
    } elseif (isset($b['titre'])) {
      $rows .= "<tr><td class=\"dk-title\" style=\"padding:0 0 20px;$sans;font-size:32px;line-height:36px;font-weight:600;letter-spacing:-1px;color:$ink\">" . $h($b['titre']) . '</td></tr>';
      $plain[] = mb_strtoupper($b['titre']);
    } elseif (isset($b['details'])) {
      $t = '';
      foreach ($b['details'] as $i => $d) {
        $val = !empty($d[2]) ? '<a href="' . $h($d[2]) . "\" style=\"color:$ink;text-decoration:underline;text-decoration-color:#CFC6BC\">" . $h($d[1]) . '</a>' : $h($d[1]);
        $t .= '<tr><td width="96" valign="top" style="width:96px;padding:12px 12px 12px 0;border-top:1px solid ' . $line . ";$mono;font-size:10px;line-height:20px;letter-spacing:1px;text-transform:uppercase;color:$mute\">" . $h($d[0]) . '</td>'
          . '<td valign="top" style="padding:12px 0;border-top:1px solid ' . $line . ";$sans;font-size:15px;line-height:20px;color:$ink\">$val</td></tr>";
        $plain[] = $d[0] . ' : ' . $d[1];
      }
      $rows .= '<tr><td style="padding:6px 0 26px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border-bottom:1px solid ' . $line . "\">$t</table></td></tr>";
    } elseif (isset($b['cta'])) {
      $rows .= '<tr><td style="padding:4px 0 8px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate"><tr>'
        . "<td align=\"center\" bgcolor=\"$ink\" style=\"border-radius:12px;background:$ink\"><a href=\"" . $h($b['url']) . "\" style=\"display:block;padding:17px 24px;$sans;font-size:16px;line-height:20px;font-weight:500;letter-spacing:0.1px;color:#F3EDE3;text-decoration:none;border-radius:12px\">" . $h($b['cta']) . ' &nbsp;&rarr;</a></td></tr></table></td></tr>'
        . (!empty($b['note']) ? "<tr><td align=\"center\" style=\"padding:4px 0 26px;$mono;font-size:10px;line-height:16px;letter-spacing:0.5px;color:$mute\">" . $h($b['note']) . '</td></tr>' : '<tr><td style="padding:0 0 18px"></td></tr>');
      $plain[] = $b['cta'] . ' : ' . $b['url'];
    }
  }
  $html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only">'
    . '<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">'
    // Téléphone : marges réduites, la carte de visite passe sur deux lignes (Gmail, Apple Mail lisent ce bloc)
    . '<style>@media only screen and (max-width:520px){.dk-card{padding:28px 20px 24px!important}.dk-c{display:block!important;width:auto!important;height:auto!important}.dk-c2{padding:12px 13px 4px!important}.dk-gap{display:block!important;height:8px!important;width:auto!important}.dk-title{font-size:27px!important;line-height:31px!important}}</style></head>'
    . '<body style="margin:0;padding:0;background:#F3EDE3;-webkit-text-size-adjust:100%;text-size-adjust:100%">'
    . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F3EDE3" style="border-collapse:collapse;background:#F3EDE3"><tr><td align="center" style="padding:32px 14px">'
    . '<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:100%;max-width:560px">'
    // En-tête : la marque, la nature de l'e-mail
    . "<tr><td style=\"padding:0 4px 16px\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td style=\"$sans;font-size:19px;line-height:20px;font-weight:600;letter-spacing:-0.3px;color:$ink\">DAKÉ©</td>"
    . "<td align=\"right\" style=\"$mono;font-size:10px;line-height:20px;letter-spacing:1px;text-transform:uppercase;color:$mute\">" . $h($label) . '</td></tr></table></td></tr>'
    // Carte blanche
    . "<tr><td class=\"dk-card\" bgcolor=\"#FFFFFF\" style=\"background:#FFFFFF;border-radius:16px;padding:40px 36px 34px\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"border-collapse:collapse\">$rows</table>"
    . "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"border-collapse:collapse;margin-top:12px\"><tr><td>$carte</td></tr></table></td></tr>"
    // Pied
    . "<tr><td align=\"center\" style=\"padding:18px 8px 0;$mono;font-size:10px;line-height:16px;letter-spacing:0.5px;color:$mute\">DAKÉ© Studio · Paris · <a href=\"https://dake.studio\" style=\"color:$mute;text-decoration:none\">dake.studio</a></td></tr>"
    . '</table></td></tr></table></body></html>';
  $plain = implode("\n\n", $plain) . "\n\n--\nDAKÉ© · JAY DOGO\nCREATIVE DIRECTOR + PHOTOGRAPHER\nPARIS, FRANCE\ncontact@dake.studio · https://dake.studio\n@dake.creatives · @dake.face · @ledockernoir";
  $b = 'dake-' . bin2hex(random_bytes(8));
  $corps = "--$b\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($plain))
    . "--$b\r\nContent-Type: text/html; charset=utf-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($html))
    . "--$b--";
  $headers = "From: =?UTF-8?B?" . base64_encode('DAKÉ©') . "?= <contact@dake.studio>\r\nReply-To: contact@dake.studio\r\nMIME-Version: 1.0\r\nContent-Type: multipart/alternative; boundary=\"$b\"";
  foreach ($extraHeaders as $k => $v) $headers .= "\r\n$k: $v";
  return @mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $corps, $headers);
}

// « mercredi 4 novembre » / « Wednesday 4 November »
function dake_jour($date, $en) {
  $t = mktime(12, 0, 0, (int)substr($date, 5, 2), (int)substr($date, 8, 2), (int)substr($date, 0, 4));
  return $en ? date('l j F', $t)
    : ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'][(int)date('w', $t)] . ' ' . (int)date('j', $t) . ' ' . ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'][(int)date('n', $t) - 1];
}
// « 14 h », « 14 h 30 » / « 2 pm », « 2:30 pm »
function dake_heure($heure, $en) {
  [$h, $m] = array_map('intval', explode(':', $heure));
  $mm = str_pad((string)$m, 2, '0', STR_PAD_LEFT);
  return $en ? (($h % 12) ?: 12) . ($m ? ":$mm" : '') . ($h < 12 ? ' am' : ' pm') : $h . "\u{00A0}h" . ($m ? "\u{00A0}$mm" : '');
}
// « mercredi 4 novembre à 14 h » / « Wednesday 4 November at 2 pm »
function dake_quand($date, $heure, $en) { return dake_jour($date, $en) . ($en ? ' at ' : ' à ') . dake_heure($heure, $en); }

// Accusé de réception d'une demande : chaleureux, avec les prochaines étapes.
// Rien de ce que le visiteur a saisi n'est recopié, sauf son prénom (on pourrait taper l'adresse d'un autre).
function dake_accuse($to, $type, $origine, $langue, $prenom) {
  $en = str_starts_with((string)$langue, 'en');
  $p = mb_substr(trim((string)$prenom), 0, 40);
  $hi = $en ? 'Hello' . ($p ? " $p" : '') : 'Bonjour' . ($p ? " $p" : '');
  $fin = $en ? "Speak soon,\nJay" : "À très vite,\nJay";
  if ($type === 'seance') {
    $sujet = $en ? 'DAKÉ© Studio · Your request has been received' : 'DAKÉ© Studio · Nous avons bien reçu votre demande';
    $blocs = $en ? [
      ['titre' => 'Thank you, your request has arrived.'],
      "$hi, thank you for choosing DAKÉ© Studio for your session. I am checking the schedule and will get back to you very soon to confirm the exact time.",
      'Here is what happens next:',
      ['details' => [['01', 'I confirm your slot and the exact time by email'], ['02', 'You pay the deposit online to secure it'], ['03', 'We meet at the studio for your session']]],
      'Want to share references, a mood or the agency you are aiming for? Simply reply to this email.',
      $fin,
    ] : [
      ['titre' => 'Merci, votre demande est bien arrivée.'],
      "$hi, merci d’avoir pensé à DAKÉ© Studio pour votre séance. Je regarde le planning et je reviens vers vous très vite pour confirmer l’heure exacte.",
      'Voici la suite :',
      ['details' => [['01', 'Je confirme votre créneau et l’heure exacte par e-mail'], ['02', 'Vous réglez l’acompte en ligne pour le bloquer'], ['03', 'On se retrouve au studio pour votre séance']]],
      'Envie de partager des références, une ambiance ou l’agence que vous visez ? Répondez simplement à cet e-mail.',
      $fin,
    ];
    return dake_mail($to, $sujet, $en ? 'Request received' : 'Demande reçue', $blocs, ['Auto-Submitted' => 'auto-replied']);
  }
  $intro = $en ? [
    'talents' => "$hi, thank you for your interest in our talents. Your project request has arrived and I am reading it carefully.",
    'projet' => "$hi, thank you for your interest in our work. Your project request has arrived and I am reading it carefully.",
  ][$origine] ?? "$hi, thank you for reaching out. Your project request has arrived and I am reading it carefully."
  : [
    'talents' => "$hi, merci pour votre intérêt pour nos talents. Votre demande de projet est bien arrivée, je la lis avec attention.",
    'projet' => "$hi, merci pour votre intérêt pour nos réalisations. Votre demande de projet est bien arrivée, je la lis avec attention.",
  ][$origine] ?? "$hi, merci de nous avoir écrit. Votre demande de projet est bien arrivée, je la lis avec attention.";
  $sujet = $en ? 'DAKÉ© · Your project request has been received' : 'DAKÉ© · Nous avons bien reçu votre demande de projet';
  $blocs = $en ? [
    ['titre' => 'Thank you for your project request.'],
    $intro,
    'Here is what happens next:',
    ['details' => [['01', 'I get back to you to talk it through'], ['02', 'We set up a call to refine the brief together'], ['03', 'I send you a tailored proposal']]],
    'References, a moodboard, a deck? Simply reply to this email to share them.',
    $fin,
  ] : [
    ['titre' => 'Merci pour votre demande de projet.'],
    $intro,
    'Voici la suite :',
    ['details' => [['01', 'Je reviens vers vous pour en parler'], ['02', 'On cale un échange pour affiner le brief ensemble'], ['03', 'Je vous envoie une proposition sur mesure']]],
    'Des références, un moodboard, une présentation ? Répondez simplement à cet e-mail pour les partager.',
    $fin,
  ];
  return dake_mail($to, $sujet, $en ? 'Project request received' : 'Demande de projet reçue', $blocs, ['Auto-Submitted' => 'auto-replied']);
}
