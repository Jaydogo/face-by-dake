/* =========================================================
   TALENTS BY DAKĒ — couche « fluide » (V1)
   Scroll lissé (Lenis, même réglage que FACE), images en fondu,
   préchargement des pages, transitions, visionneuse plein écran,
   carte composite imprimable.
   ========================================================= */
(function () {
  const d = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Scroll lissé : mêmes valeurs que FACE BY DAKĒ */
  window.lenis = null;
  if (window.Lenis && !reduced) {
    try { window.lenis = new Lenis({ lerp: 0.08, wheelMultiplier: 0.9, autoRaf: true }); d.classList.add('has-lenis'); } catch (e) { window.lenis = null; }
  }
  const ease = t => 1 - Math.pow(1 - t, 4);
  // offset peut être une fonction : recalculée à l'arrivée pour un placement au pixel
  window.smoothTo = function (target, opts = {}) {
    const off = () => typeof opts.offset === 'function' ? opts.offset() : (opts.offset ?? 0);
    const yOf = () => typeof target === 'number' ? target : Math.round(target.getBoundingClientRect().top + scrollY - off());
    const fix = () => { const y = yOf(); if (Math.abs(scrollY - y) > 1) { lenis ? lenis.scrollTo(y, { immediate: true, force: true }) : scrollTo(0, y); } };
    if (lenis) lenis.scrollTo(yOf(), { duration: opts.duration || 1.2, easing: ease, lock: true, force: true, onComplete: () => requestAnimationFrame(fix) });
    else { scrollTo({ top: yOf(), behavior: reduced ? 'auto' : 'smooth' }); addEventListener('scrollend', fix, { once: true }); }
  };
  window.lockScroll = function (lock) {
    if (lenis) lock ? lenis.stop() : lenis.start();
    document.body.style.overflow = lock ? 'hidden' : '';
  };

  /* Images : fondu à l'arrivée, sans flash */
  function fade(img) {
    if (img.dataset.f) return; img.dataset.f = 1;
    img.decoding = 'async';
    const done = () => img.classList.add('is-loaded');
    if (img.complete && img.naturalWidth) done(); else { img.addEventListener('load', done, { once: true }); img.addEventListener('error', done, { once: true }); }
  }
  window.fadeImages = root => (root || document).querySelectorAll('.media img').forEach(fade);
  new MutationObserver(() => fadeImages()).observe(document.documentElement, { childList: true, subtree: true });

  /* Préchargement des pages internes au survol / au toucher : navigation quasi instantanée */
  const seen = new Set();
  function prefetch(a) {
    const url = a.href;
    if (!url || seen.has(url) || a.target === '_blank' || new URL(url).origin !== location.origin || url.split('#')[0] === location.href.split('#')[0]) return;
    seen.add(url);
    const l = document.createElement('link'); l.rel = 'prefetch'; l.href = url; document.head.appendChild(l);
    const img = a.dataset.img; if (img) { const i = new Image(); i.src = img; }
  }
  document.addEventListener('pointerover', e => { const a = e.target.closest('a[href]'); if (a) prefetch(a); }, { passive: true });
  document.addEventListener('touchstart', e => { const a = e.target.closest('a[href]'); if (a) prefetch(a); }, { passive: true });

  /* Transition de sortie (repli si le navigateur ne gère pas les View Transitions) */
  const vt = 'onpagereveal' in window || (window.CSS && CSS.supports && CSS.supports('view-transition-name: none'));
  if (!vt && !reduced) {
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank' || a.hasAttribute('download')) return;
      const u = new URL(a.href, location.href);
      if (u.origin !== location.origin || (u.pathname === location.pathname && u.search === location.search) || a.protocol === 'mailto:') return;
      e.preventDefault(); d.classList.add('is-leaving');
      setTimeout(() => { location.href = a.href; }, 280);
    });
    addEventListener('pageshow', () => d.classList.remove('is-leaving'));
  }

  /* Visionneuse plein écran : book et polas */
  let box = null;
  window.openViewer = function (items, start, title) {
    if (!box) {
      box = document.createElement('div');
      box.className = 'viewer'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Visionneuse');
      box.innerHTML = `<div class="viewer-top caps"><span class="viewer-title"></span><span class="viewer-n mono"></span><button type="button" class="viewer-close">Fermer</button></div>
        <div class="viewer-track" data-lenis-prevent></div>
        <div class="viewer-nav"><button type="button" data-d="-1" aria-label="Image précédente">←</button><button type="button" data-d="1" aria-label="Image suivante">→</button></div>`;
      document.body.appendChild(box);
      const tr = box.querySelector('.viewer-track');
      const n = () => Math.round(tr.scrollLeft / tr.clientWidth);
      const sync = () => { box.querySelector('.viewer-n').textContent = String(n() + 1).padStart(2, '0') + ' / ' + String(tr.children.length).padStart(2, '0'); };
      tr.addEventListener('scroll', () => requestAnimationFrame(sync), { passive: true });
      box.querySelectorAll('.viewer-nav button').forEach(b => b.addEventListener('click', () => tr.scrollTo({ left: (n() + +b.dataset.d) * tr.clientWidth, behavior: 'smooth' })));
      box.querySelector('.viewer-close').addEventListener('click', close);
      tr.addEventListener('click', e => { if (e.target === tr || e.target.classList.contains('viewer-slide')) close(); });
      addEventListener('keydown', e => {
        if (!box.classList.contains('is-open')) return;
        if (e.key === 'Escape') close();
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') tr.scrollTo({ left: (n() + (e.key === 'ArrowRight' ? 1 : -1)) * tr.clientWidth, behavior: 'smooth' });
      });
      box._sync = sync;
    }
    const tr = box.querySelector('.viewer-track');
    box.querySelector('.viewer-title').textContent = title || '';
    tr.innerHTML = items.map(([src, cap]) => `<figure class="viewer-slide"><img src="${src}" alt="${cap || ''}">${cap ? `<figcaption class="mono">${cap}</figcaption>` : ''}</figure>`).join('');
    box._last = document.activeElement;
    box.classList.add('is-open'); lockScroll(true);
    requestAnimationFrame(() => { tr.scrollLeft = start * tr.clientWidth; box._sync(); box.querySelector('.viewer-close').focus({ preventScroll: true }); });
  };
  function close() {
    box.classList.remove('is-open'); lockScroll(false);
    box._last?.focus({ preventScroll: true });
  }
})();
