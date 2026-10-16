/* =========================================================
   CARTE COMPOSITE EN IMAGE (JPG) — pour mobile
   Même mise en page que la version imprimée (A4 paysage, DA du site),
   dessinée dans un canvas puis partagée / téléchargée.
   ========================================================= */
(function () {
  const INK = '#1A1412', LINE = 'rgba(26,20,18,.18)', MUTED = 'rgba(26,20,18,.5)', PH = '#F0F0EE';

  const load = src => new Promise(res => {
    const i = new Image(); i.decoding = 'async';
    i.onload = () => res(i); i.onerror = () => res(null); i.src = src;
  });

  // Recadrage façon object-fit: cover, point d'intérêt un peu au-dessus du centre (visages)
  function cover(ctx, img, x, y, w, h, py = 0.3) {
    ctx.fillStyle = PH; ctx.fillRect(x, y, w, h);
    if (!img) return;
    const r = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const sw = w / r, sh = h / r;
    const sx = (img.naturalWidth - sw) / 2, sy = (img.naturalHeight - sh) * py;
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }

  function text(ctx, s, x, y, { font, color = INK, align = 'left', spacing = 0 }) {
    ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
    if ('letterSpacing' in ctx) ctx.letterSpacing = spacing + 'px';
    ctx.fillText(s, x, y);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }
  const width = (ctx, s, font, spacing = 0) => { ctx.font = font; if ('letterSpacing' in ctx) ctx.letterSpacing = spacing + 'px'; const w = ctx.measureText(s).width; if ('letterSpacing' in ctx) ctx.letterSpacing = '0px'; return w; };
  const line = (ctx, x1, y1, x2, y2, k) => { ctx.strokeStyle = LINE; ctx.lineWidth = Math.max(1, 0.2 * k); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };

  /* t : talent, imgs : [couverture, 4 images], opts.k : pixels par millimètre (8 ≈ 2376 px de large) */
  window.compositeJPG = async function (t, srcs, opts = {}) {
    const k = opts.k || 8, W = Math.round(297 * k), H = Math.round(210 * k), m = v => v * k;
    const pt = v => v * 0.3528 * k; // points typographiques → px
    await Promise.all([
      document.fonts.load(`300 ${pt(40)}px Newsreader`), document.fonts.load(`italic 300 ${pt(40)}px Newsreader`),
      document.fonts.load(`500 ${pt(8)}px "Instrument Sans"`), document.fonts.load(`400 ${pt(8)}px "IBM Plex Mono"`)
    ].map(p => p.catch(() => {})));
    const [main, ...rest] = await Promise.all(srcs.map(load));

    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    const L = m(13), R = W - m(13), T = m(12);

    // En-tête : nom en Newsreader, catégories + ville à droite, filet
    const fsName = pt(40), fName = `300 ${fsName}px Newsreader`, fNameI = `italic 300 ${fsName}px Newsreader`;
    const yName = T + fsName * 0.82;
    const first = t.first + ' ';
    text(ctx, first, L, yName, { font: fName, spacing: -fsName * 0.04 });
    text(ctx, t.last, L + width(ctx, first, fName, -fsName * 0.04), yName, { font: fNameI, spacing: -fsName * 0.04 });
    const fCaps = `500 ${pt(7.5)}px "Instrument Sans"`, capsSp = pt(7.5) * 0.14;
    text(ctx, TU.cats(t).toUpperCase(), R, yName - pt(7.5) * 1.6, { font: fCaps, align: 'right', spacing: capsSp });
    text(ctx, (t.city || '').toUpperCase(), R, yName, { font: fCaps, align: 'right', spacing: capsSp, color: MUTED });
    const yLine1 = yName + m(5);
    line(ctx, L, yLine1, R, yLine1, k);

    // Photos : grand portrait + grille 2×2, toutes en 3:4
    const y0 = yLine1 + m(6), hMain = m(142), wMain = hMain * 3 / 4, g = m(3);
    cover(ctx, main, L, y0, wMain, hMain);
    const hS = (hMain - g) / 2, wS = hS * 3 / 4, xg = L + wMain + g;
    [0, 1, 2, 3].forEach(n => cover(ctx, rest[n], xg + (n % 2) * (wS + g), y0 + Math.floor(n / 2) * (hS + g), wS, hS));

    // Colonne fiche (mono)
    const xs = xg + 2 * wS + g + m(3), xsT = xs + m(4);
    line(ctx, xs, y0, xs, y0 + hMain, k);
    const f = t.fiche || {}, s = t.social;
    const rows = [['Taille', f.taille && f.taille + ' cm'], ['Poitrine', f.poitrine && f.poitrine + ' cm'], ['Tour de taille', f.tailleT && f.tailleT + ' cm'], ['Hanches', f.hanches && f.hanches + ' cm'], ['Pointure', f.pointure && f.pointure + ' EU'], ['Yeux', f.yeux], ['Cheveux', f.cheveux]]
      .concat((t.specs || []).length ? [['Spécialités', t.specs.join(', ')]] : [])
      .concat(t.agency ? [['Agence', t.agency]] : [])
      .concat(s && s.ig && s.tt ? [['Instagram', TU.k(s.ig.followers)], ['TikTok', TU.k(s.tt.followers)]] : [])
      .filter(r => r[1]);
    const fMono = `400 ${pt(7.5)}px "IBM Plex Mono"`, rowH = pt(7.5) * 1.35 + m(2.4);
    const colV = xsT + Math.max(...rows.map(r => width(ctx, r[0].toUpperCase(), fMono))) + m(4);
    // Valeurs longues : retour à la ligne pour rester dans la colonne
    const maxW = R - colV, lh = pt(7.5) * 1.35;
    const wrap = v => {
      const words = String(v).toUpperCase().split(' '), out = [];
      let cur = '';
      words.forEach(w => { const tryL = cur ? cur + ' ' + w : w; if (cur && width(ctx, tryL, fMono) > maxW) { out.push(cur); cur = w; } else cur = tryL; });
      if (cur) out.push(cur); return out;
    };
    let y = y0 + pt(7.5);
    rows.forEach(r => {
      text(ctx, r[0].toUpperCase(), xsT, y, { font: fMono, color: MUTED });
      const ls = wrap(r[1]);
      ls.forEach((l, j) => text(ctx, l, colV, y + j * lh, { font: fMono }));
      y += rowH + (ls.length - 1) * lh;
    });
    text(ctx, 'TALENTS BY DAKĒ©', xsT, y0 + hMain, { font: `500 ${pt(9)}px "Instrument Sans"`, spacing: -pt(9) * 0.01 });

    // Pied : filet + mono
    const yF = y0 + hMain + m(5);
    line(ctx, L, yF, R, yF, k);
    const fFoot = `400 ${pt(7)}px "IBM Plex Mono"`, sp = pt(7) * 0.06, yFt = yF + m(3) + pt(7);
    text(ctx, (SETTINGS.mail || '').toUpperCase(), L, yFt, { font: fFoot, spacing: sp, color: 'rgba(26,20,18,.7)' });
    text(ctx, 'CARTE COMPOSITE', W / 2, yFt, { font: fFoot, spacing: sp, align: 'center', color: 'rgba(26,20,18,.7)' });
    text(ctx, (t.code || '').toUpperCase(), R, yFt, { font: fFoot, spacing: sp, align: 'right', color: 'rgba(26,20,18,.7)' });

    return new Promise(res => c.toBlob(res, 'image/jpeg', 0.9));
  };

  // Partage natif (iPhone : « Enregistrer l'image ») ou téléchargement
  window.shareComposite = async function (blob, name) {
    const file = new File([blob], name, { type: 'image/jpeg' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: name.replace(/\.jpg$/, '') }); return 'shared'; }
      catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; }
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return 'downloaded';
  };
})();
