/* =========================================================
   Accès par code — à charger dans le <head> des pages privées.
   Ce n'est PAS une vraie sécurité (site statique) : ça écarte
   les curieux, pas quelqu'un qui lit le code source.

   Changer le code : dans un terminal
     printf 'TONCODE' | shasum -a 256
   puis coller le résultat dans HASH ci-dessous (code en MAJUSCULES).
   ========================================================= */
(function () {
  var HASH = 'c81dd57160b8d94fce186d8d696b372bb1cac090a3f663d91322e9b787ec1833';
  var KEY = 'dake-talents-gate';
  var d = document.documentElement;

  // SHA-256 compact (marche aussi en http, où crypto.subtle n'existe pas)
  function sha256(s) {
    function r(n, x) { return (x >>> n) | (x << (32 - n)); }
    var K = [], H = [], i = 0, j, p = 2;
    for (; i < 64; p++) { for (j = 2; j * j <= p && p % j; j++); if (j * j > p) { if (i < 8) H[i] = (Math.pow(p, 1 / 2) * 4294967296) | 0; K[i++] = (Math.pow(p, 1 / 3) * 4294967296) | 0; } }
    s = unescape(encodeURIComponent(s));
    var l = s.length * 8, w = [];
    for (i = 0; i < s.length; i++) w[i >> 2] |= s.charCodeAt(i) << (24 - (i % 4) * 8);
    w[l >> 5] |= 0x80 << (24 - l % 32); w[((l + 64 >> 9) << 4) + 15] = l;
    for (j = 0; j < w.length; j += 16) {
      var a = H.slice(0), W = [];
      for (i = 0; i < 64; i++) {
        W[i] = i < 16 ? w[i + j] | 0 : (r(17, W[i - 2]) ^ r(19, W[i - 2]) ^ (W[i - 2] >>> 10)) + W[i - 7] + (r(7, W[i - 15]) ^ r(18, W[i - 15]) ^ (W[i - 15] >>> 3)) + W[i - 16] | 0;
        var t1 = a[7] + (r(6, a[4]) ^ r(11, a[4]) ^ r(25, a[4])) + (a[4] & a[5] ^ ~a[4] & a[6]) + K[i] + W[i] | 0;
        var t2 = (r(2, a[0]) ^ r(13, a[0]) ^ r(22, a[0])) + (a[0] & a[1] ^ a[0] & a[2] ^ a[1] & a[2]) | 0;
        a = [t1 + t2 | 0].concat(a); a[4] = a[4] + t1 | 0; a.pop();
      }
      for (i = 0; i < 8; i++) H[i] = H[i] + a[i] | 0;
    }
    return H.map(function (x) { return ('00000000' + (x >>> 0).toString(16)).slice(-8); }).join('');
  }

  var ok = false;
  try { ok = localStorage.getItem(KEY) === HASH; } catch (e) {}
  if (ok) return;
  d.classList.add('locked');
  // Styles du cadenas intégrés ici : il protège n'importe quelle page, même sans talents.css
  var css = 'html.locked body>*:not(.gate){display:none!important}html.locked body{background:#1A1412!important}'
    + '.gate{position:fixed;inset:0;z-index:2147483647;background:#1A1412;color:#F3EDE3;display:grid;place-items:center;padding:24px;font-family:"Instrument Sans","Helvetica Neue",Arial,sans-serif}'
    + '.gate form{width:min(420px,100%);display:grid;gap:22px}'
    + '.gate .g-k{font-size:.75rem;letter-spacing:.14em;text-transform:uppercase;opacity:.6;margin:0}'
    + '.gate h1{margin:0;font-family:"Newsreader",Georgia,serif;font-weight:300;font-size:clamp(3rem,8vw,5rem);line-height:.9;letter-spacing:-.05em}'
    + '.gate h1 em{font-style:italic}.gate .br{opacity:.45;font-style:normal}'
    + '.gate input{font:inherit;font-family:"IBM Plex Mono",ui-monospace,Menlo,monospace;font-size:1.125rem;letter-spacing:.3em;text-transform:uppercase;padding:14px 18px;border:1px solid rgba(243,237,227,.3);border-radius:999px;background:transparent;color:#F3EDE3;text-align:center;outline:none}'
    + '.gate input:focus{border-color:#F3EDE3}'
    + '.gate button{min-height:48px;border-radius:999px;border:1px solid #F3EDE3;background:#F3EDE3;color:#1A1412;font:inherit;font-weight:500;cursor:pointer}'
    + '.gate .err{font-family:"IBM Plex Mono",monospace;font-size:.75rem;color:#E5574C;min-height:1.2em;text-align:center;margin:0}'
    + '.gate .sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}'
    + '.gate.shake form{animation:gshake .4s}@keyframes gshake{25%{transform:translateX(-8px)}50%{transform:translateX(8px)}75%{transform:translateX(-4px)}}';
  var st = document.createElement('style'); st.textContent = css;
  (document.head || d).appendChild(st);

  document.addEventListener('DOMContentLoaded', function () {
    var g = document.createElement('div');
    g.className = 'gate';
    g.innerHTML = '<form autocomplete="off"><p class="caps" style="opacity:.6">face by dakē · accès privé</p>' +
      '<h1><span class="br">[</span><em>Code</em><span class="br">]</span></h1>' +
      '<label class="sr-only" for="gate-code">Code d’accès</label><input id="gate-code" type="password" inputmode="text" autocapitalize="characters" spellcheck="false" placeholder="••••••" required>' +
      '<button type="submit">Entrer</button><p class="err" aria-live="polite"></p></form>';
    document.body.appendChild(g);
    var f = g.querySelector('form'), inp = g.querySelector('input'), err = g.querySelector('.err');
    inp.focus();
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sha256(inp.value.trim().toUpperCase()) === HASH) {
        try { localStorage.setItem(KEY, HASH); } catch (e2) {}
        d.classList.remove('locked'); g.remove();
      } else {
        err.textContent = 'Code incorrect.'; inp.select();
        g.classList.remove('shake'); void g.offsetWidth; g.classList.add('shake');
      }
    });
  });
})();
