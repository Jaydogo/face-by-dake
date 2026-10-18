/* =========================================================
   FACE BY DAKĒ — back office, gestes et mouvements « app » (téléphone)
   - barre du haut qui prend sa matière au défilement
   - barre du bas compacte et bouton + masqué quand on descend
   - retour à la liste en glissant depuis le bord gauche (comme iOS)
   - feuilles (fenêtres, menu •••) qu'on ferme en les tirant vers le bas
   Rien ici ne change les données : uniquement l'interface.
   ========================================================= */
(function () {
  const phone = () => matchMedia('(max-width:760px)').matches;
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  const SPRING = 'cubic-bezier(.32,.72,0,1)';
  const b = document.body;

  /* ---------- Défilement : matière de la barre du haut, barre du bas compacte ---------- */
  let lastY = scrollY, ticking = false;
  function onScroll() {
    ticking = false;
    const y = scrollY, dy = y - lastY;
    b.classList.toggle('is-scrolled', y > 4);
    if (Math.abs(dy) > 6) {
      // en bas de page ou en remontant : tout réapparaît
      const atEnd = innerHeight + y >= document.documentElement.scrollHeight - 8;
      b.classList.toggle('scroll-down', dy > 0 && y > 80 && !atEnd);
      lastY = y;
    }
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  // Changement d'écran ou d'onglet : la barre revient
  document.addEventListener('click', e => { if (e.target.closest('.tabbar, .li, [data-a="back"], [data-pane]')) { b.classList.remove('scroll-down'); lastY = scrollY; } }, true);

  /* ---------- Retour en glissant depuis le bord gauche ---------- */
  let sw = null;
  document.addEventListener('touchstart', e => {
    if (!phone() || e.touches.length !== 1) return;
    const st = document.getElementById('studio'), t = e.touches[0];
    if (!st || st.dataset.screen !== 'edit' || t.clientX > 28 || st.classList.contains('show-preview')) return;
    const ed = st.querySelector('.editor'); if (!ed) return;
    sw = { ed, x0: t.clientX, y0: t.clientY, x: t.clientX, t0: performance.now(), on: false };
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (!sw) return;
    const t = e.touches[0], dx = t.clientX - sw.x0, dy = t.clientY - sw.y0;
    if (!sw.on) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) { sw = null; return; }   // défilement vertical : on laisse faire
      if (dx < 8) return;
      sw.on = true; sw.ed.style.transition = 'none'; b.classList.add('is-swiping');
    }
    sw.x = t.clientX;
    const p = Math.max(0, dx);
    sw.ed.style.transform = `translateX(${p}px)`;
    sw.ed.style.boxShadow = `-12px 0 40px rgba(26,20,18,${0.16 * (1 - p / innerWidth)})`;
    e.preventDefault();
  }, { passive: false });
  document.addEventListener('touchend', () => {
    if (!sw) return;
    const { ed, on } = sw, dx = sw.x - sw.x0, v = dx / Math.max(1, performance.now() - sw.t0);
    sw = null; b.classList.remove('is-swiping');
    if (!on) return;
    const go = dx > innerWidth * 0.33 || v > 0.5;
    ed.style.transition = `transform .38s ${SPRING}, box-shadow .38s`;
    ed.style.transform = go ? `translateX(${innerWidth}px)` : '';
    ed.style.boxShadow = '';
    setTimeout(() => {
      ed.style.transition = ''; ed.style.transform = ''; ed.style.boxShadow = '';
      if (go) document.querySelector('[data-a="back"]')?.click();
    }, go ? 300 : 380);
  });

  /* ---------- Feuilles : tirer vers le bas pour fermer ---------- */
  let sh = null;
  function sheetFrom(target) {
    const modal = target.closest('#modal[open] .modal-box');
    if (modal) return { el: document.getElementById('modal'), scroller: modal, close: () => document.getElementById('modal').close() };
    const cp = target.closest('.combo-pop.is-sheet');
    if (cp) return { el: cp, scroller: cp, close: () => cp.querySelector('.combo-done')?.click() };
    const acts = target.closest('.ed-title.is-more .acts');
    if (acts) return { el: acts, scroller: acts, close: () => document.querySelector('.ed-title.is-more [data-a="more"]')?.click() };
    return null;
  }
  document.addEventListener('touchstart', e => {
    if (!phone() || e.touches.length !== 1) return;
    const s = sheetFrom(e.target); if (!s || s.scroller.scrollTop > 0) return;
    if (e.target.closest('input, textarea, select')) return;
    sh = Object.assign(s, { y0: e.touches[0].clientY, y: e.touches[0].clientY, t0: performance.now(), on: false });
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (!sh) return;
    const dy = e.touches[0].clientY - sh.y0;
    if (!sh.on) { if (dy < 6) { if (dy < -6) sh = null; return; } sh.on = true; sh.el.style.transition = 'none'; }
    sh.y = e.touches[0].clientY;
    // au-delà de 0, résistance façon iOS
    sh.el.style.transform = `translateY(${dy > 0 ? dy : dy / 4}px)`;
    e.preventDefault();
  }, { passive: false });
  document.addEventListener('touchend', () => {
    if (!sh) return;
    const s = sh; sh = null; if (!s.on) return;
    const dy = s.y - s.y0, v = dy / Math.max(1, performance.now() - s.t0), go = dy > 110 || v > 0.6;
    s.el.style.transition = `transform .34s ${SPRING}`;
    s.el.style.transform = go ? 'translateY(110%)' : '';
    setTimeout(() => { s.el.style.transition = ''; s.el.style.transform = ''; if (go) s.close(); }, go ? 260 : 340);
  });

  /* ---------- Liste : apparition en cascade, indice posé sur chaque ligne ---------- */
  const stagger = () => document.querySelectorAll('.list-items .li').forEach((li, i) => li.style.setProperty('--d', Math.min(i, 14)));
  new MutationObserver(stagger).observe(document.getElementById('views'), { childList: true });
  stagger();

  if (calm.matches) b.classList.add('calm');
})();

/* =========================================================
   Listes de choix (yeux, cheveux, légendes des polas…)
   Remplace la liste native du navigateur (<datalist>), illisible sur
   iPhone et qui masque les autres choix dès qu'un mot est saisi.
   Toujours tous les choix, filtrés si on tape ; texte libre possible.
   Ordinateur : menu sous le champ. Téléphone : feuille en bas d'écran.
   ========================================================= */
(function () {
  const phone = () => matchMedia('(max-width:760px)').matches;
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const CHEV = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
  let pop = null, cur = null, idx = -1;

  // Champ avec list="…" : on lit les choix, on retire la liste native, on ajoute la flèche
  function enhance(root) {
    root.querySelectorAll('input[list]').forEach(inp => {
      const dl = document.getElementById(inp.getAttribute('list'));
      inp.dataset.options = JSON.stringify(dl ? [...dl.options].map(o => o.value) : []);
      inp.removeAttribute('list');
      inp.setAttribute('autocomplete', 'off'); inp.setAttribute('role', 'combobox'); inp.setAttribute('aria-expanded', 'false');
      const wrap = document.createElement('span'); wrap.className = 'combo';
      inp.parentNode.insertBefore(wrap, inp); wrap.appendChild(inp);
      const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'combo-btn'; btn.tabIndex = -1; btn.setAttribute('aria-label', 'Afficher les choix'); btn.innerHTML = CHEV;
      wrap.appendChild(btn);
    });
  }
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => n.nodeType === 1 && enhance(n)))).observe(document.body, { childList: true, subtree: true });
  enhance(document);

  function labelOf(inp) { const f = inp.closest('.field'); const s = f && f.querySelector(':scope > span'); return (s ? s.firstChild.textContent : inp.placeholder || 'Choisir').trim(); }

  function open(inp, filter) {
    const all = JSON.parse(inp.dataset.options || '[]');
    const q = filter ? norm(inp.value) : '';
    const list = q ? all.filter(o => norm(o).includes(q)) : all;
    if (!list.length && !phone()) return close();
    if (!pop || cur !== inp) { close(true); build(inp); }
    cur = inp; inp.setAttribute('aria-expanded', 'true');
    const v = norm(inp.value);
    pop.querySelector('.combo-list').innerHTML = (list.length ? list : all).map((o, i) => `<li role="option" data-v="${esc(o)}" aria-selected="${norm(o) === v}">${esc(o)}<svg class="tick" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></li>`).join('');
    idx = -1;
    place();
  }
  function build(inp) {
    pop = document.createElement('div');
    pop.className = 'combo-pop' + (phone() ? ' is-sheet' : '');
    pop.innerHTML = (phone() ? `<div class="combo-sheet-head"><span class="grab"></span><b>${esc(labelOf(inp))}</b><button type="button" class="combo-done">OK</button></div>` : '') + '<ul class="combo-list" role="listbox"></ul>'
      + (phone() ? '<p class="combo-hint">Ou écris directement dans le champ.</p>' : '');
    document.body.appendChild(pop);
    if (phone()) { const sc = document.createElement('div'); sc.className = 'combo-scrim'; document.body.appendChild(sc); pop._scrim = sc; sc.addEventListener('click', () => close()); requestAnimationFrame(() => { sc.classList.add('on'); pop.classList.add('on'); }); }
    else requestAnimationFrame(() => pop.classList.add('on'));
    pop.addEventListener('mousedown', e => e.preventDefault());   // garde le focus dans le champ
    pop.addEventListener('click', e => {
      if (e.target.closest('.combo-done')) return close();
      const li = e.target.closest('li[data-v]'); if (li) choose(li.dataset.v);
    });
  }
  function place() {
    if (!pop || !cur || pop.classList.contains('is-sheet')) return;
    const r = cur.getBoundingClientRect(), h = Math.min(260, pop.scrollHeight);
    const below = innerHeight - r.bottom > h + 12 || r.top < h + 12;
    Object.assign(pop.style, { left: Math.max(8, Math.min(r.left, innerWidth - Math.max(r.width, 180) - 8)) + 'px', width: Math.max(r.width, 180) + 'px', top: (below ? r.bottom + 6 : r.top - h - 6) + 'px' });
    pop.classList.toggle('is-up', !below);
  }
  function choose(v) {
    if (!cur) return;
    cur.value = v;
    cur.dispatchEvent(new Event('input', { bubbles: true }));
    cur.dispatchEvent(new Event('change', { bubbles: true }));
    close();
  }
  function close(now) {
    if (!pop) return;
    const p = pop, sc = p._scrim; pop = null;
    if (cur) cur.setAttribute('aria-expanded', 'false');
    cur = null;
    p.classList.remove('on'); if (sc) sc.classList.remove('on');
    setTimeout(() => { p.remove(); if (sc) sc.remove(); }, now ? 0 : 320);
  }

  document.addEventListener('click', e => {
    const btn = e.target.closest('.combo-btn');
    if (btn) { const inp = btn.parentNode.querySelector('input'); if (pop && cur === inp) return close(); if (!phone()) inp.focus(); return open(inp, false); }
    const inp = e.target.closest('.combo input');
    // Téléphone : toucher le champ ouvre le clavier (texte libre), la flèche ouvre la liste
    if (inp) { if (!phone()) open(inp, false); return; }
    if (pop && !e.target.closest('.combo-pop')) close();
  });
  document.addEventListener('input', e => { const inp = e.target.closest && e.target.closest('.combo input'); if (inp && !phone() && e.isTrusted) open(inp, true); });
  document.addEventListener('keydown', e => {
    if (!pop || !cur || e.target !== cur) return;
    const items = [...pop.querySelectorAll('li[data-v]')];
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); idx = (idx + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; items.forEach((li, i) => li.classList.toggle('is-active', i === idx)); items[idx]?.scrollIntoView({ block: 'nearest' }); }
    else if (e.key === 'Enter' && idx >= 0) { e.preventDefault(); choose(items[idx].dataset.v); }
    else if (e.key === 'Escape' || e.key === 'Tab') close();
  });
  document.addEventListener('focusout', e => { if (cur && e.target === cur && !phone()) setTimeout(() => { if (cur && document.activeElement !== cur) close(); }, 120); });
  addEventListener('scroll', () => { if (pop && !pop.classList.contains('is-sheet')) place(); }, { passive: true, capture: true });
  addEventListener('resize', () => close(true));
})();
