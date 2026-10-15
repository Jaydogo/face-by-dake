(() => {
'use strict';

/* Langue de la page (fr / en) : t('texte FR', 'texte EN') */
const EN = document.documentElement.lang === 'en';
const t = (fr, en) => EN ? en : fr;
const LOC = EN ? 'en-GB' : 'fr-FR';

/* =========================================================
   CONFIG : source unique des prix, des règles et des photos
   ========================================================= */
const CONFIG = {
  email: 'face@dake.studio',
  instagram: 'dake.face',
  deposit: 50,             // acompte fixe en €, déduit du total
  minNoticeDays: 2,
  closedDays: [],          // jours fermés : 0 = dimanche, 1 = lundi… ex. [0]
  // Adresse de la fonction « dispos » (Cloudflare Worker, voir /dispos/README.md). Vide = calendrier ouvert.
  availabilityUrl: 'https://face-dispos.dispos.workers.dev/',
  weeksPerPage: 5,
  maxPages: 3,
  // photo : photo supplémentaire (books) · pola : pola supplémentaire (formule Polas)
  options: { photo: 20, pola: 15, hour: 80, express: 50, polas: 80, script: 100, maxPhotos: 30, maxHours: 4 },
  offers: [
    { id: 'polas',      name: 'Polas / Digitals', price: 150, duration: '30 min',  outfits: t('1 tenue', '1 outfit'), output: t('10 polas livrés', '10 polas delivered'),   photos: true, extraUnit: 'pola',  express: false,
      images: ['bw-debardeur.jpg', 'bw-assise.jpg', 'bw-denim.jpg'] },
    { id: 'decouverte', name: t('Book Découverte', 'Starter Book'), price: 300, duration: t('1 h 30', '1 h 30 min'), outfits: t('1 à 2 tenues', '1–2 outfits'), output: t('6 photos livrées', '6 photos delivered'),  photos: true, extraUnit: 'photo', express: true, polasOption: true,
      images: ['film-pied.jpg', 'debardeur-chaud.jpg', 'rouge.jpg'] },
    { id: 'book',       name: 'Book',             price: 400, duration: t('2 à 3 h', '2–3 h'), outfits: t('1 à 3 tenues', '1–3 outfits'), output: t('15 photos livrées', '15 photos delivered'), photos: true, extraUnit: 'photo', express: true, polasOption: true, reco: true,
      images: ['jean-pied.jpg', 'denim-brun.jpg', 'rideau-bleu.jpg', 'hoodie.jpg'] },
    { id: 'signature',  name: t('Book Signature', 'Signature Book'), price: 600, duration: t('3 à 4 h', '3–4 h'), outfits: t('1 à 4 tenues', '1–4 outfits'), output: t('25 photos livrées', '25 photos delivered'), photos: true, extraUnit: 'photo', express: true, polasIncluded: true, extra: t('polas inclus', 'polas included'),
      images: ['rouge.jpg', 'bw-lampe.jpg', 'debardeur-chaud.jpg', 'bw-sol.jpg'] },
    { id: 'demo',       name: t('Scène de jeu', 'Acting scene'), price: 250, duration: '1 h',     outfits: '',             output: t('vidéo de 45 s à 1 min livrée', '45 s to 1 min video delivered'), photos: false, express: false, scriptOption: true }
  ],
  imgPath: 'img/',
  stageDelay: 3600,        // durée d'une photo dans le visuel qui défile (ms)
  slots: [
    { id: 'matin', label: t('Matin', 'Morning'), hours: t('9\u00a0h\u00a0–\u00a012\u00a0h', '9\u00a0am\u00a0–\u00a012\u00a0pm') },
    { id: 'aprem', label: t('Après-midi', 'Afternoon'), hours: t('13\u00a0h\u00a0–\u00a017\u00a0h', '1\u00a0pm\u00a0–\u00a05\u00a0pm') },
    { id: 'soir',  label: t('Soirée', 'Evening'), hours: t('18\u00a0h\u00a0–\u00a021\u00a0h', '6\u00a0pm\u00a0–\u00a09\u00a0pm') }
  ],
  profiles: EN ? ['Model', 'Actor', 'Dancer', 'Creative', 'Other'] : ['Mannequin', 'Comédien·ne', 'Danseur·se', 'Créatif·ve', 'Autre'],
  storageKey: 'dakeface-booking-v2'
};

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const nf = new Intl.NumberFormat('fr-FR');
const eur = n => nf.format(n) + ' €';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const offerById = id => CONFIG.offers.find(o => o.id === id) || null;
const root = document.documentElement;

/* Prix affichés depuis CONFIG */
$$('[data-price]').forEach(el => { const o = offerById(el.dataset.price); if (o) el.textContent = nf.format(o.price); });
$$('[data-opt-price]').forEach(el => { const v = CONFIG.options[el.dataset.optPrice]; if (v != null) el.textContent = nf.format(v); });
$$('[data-deposit]').forEach(el => el.textContent = nf.format(CONFIG.deposit));

/* =========================================================
   Scroll lissé + ancres
   ========================================================= */
let lenis = null;
if (window.Lenis && !reduced) {
  try { lenis = new window.Lenis({ lerp: 0.08, wheelMultiplier: 0.9, autoRaf: true }); root.classList.add('has-lenis'); window.lenis = lenis; } catch (e) { lenis = null; }
}
const headerH = () => $('.header').offsetHeight;
function scrollToEl(el) {
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset: -headerH() - 8, duration: 1.4 });
  else el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
}
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]');
  if (!a || a.closest('.booking')) return;
  const id = a.getAttribute('href');
  if (id === '#' || id.startsWith('#reserver') || id === '#mentions') return;
  const target = id === '#top' ? document.body : $(id);
  if (!target) return;
  e.preventDefault();
  const toY = y => lenis ? lenis.scrollTo(y, { duration: 1.4 }) : scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
  const run = () => {
    if (id === '#top') toY(0);
    else if (id === '#contact') toY(document.documentElement.scrollHeight); // footer fixe : on va tout en bas
    else scrollToEl(target);
  };
  if (root.classList.contains('menu-open')) { setMenu(false, false); requestAnimationFrame(run); }
  else run();
});

/* Vidéo du hero : version horizontale ou verticale selon l'écran, sans son */
(function heroVideo() {
  const v = $('#hero-video'); if (!v) return;
  const mq = matchMedia('(max-aspect-ratio: 4/5), (max-width: 620px)');
  const pick = () => {
    const k = mq.matches ? 'mobile' : 'desktop';
    if (v.dataset.current === k) return;
    v.dataset.current = k;
    v.poster = v.dataset['poster' + (k === 'mobile' ? 'Mobile' : 'Desktop')];
    v.src = v.dataset[k];
    v.muted = true;
    if (reduced) { v.removeAttribute('autoplay'); v.pause(); return; }
    const p = v.play(); if (p && p.catch) p.catch(() => {});
  };
  // Arrivée en douceur : la vidéo apparaît en fondu dès qu'elle joue (ou au bout de 3 s, avec son image d'attente)
  const show = () => v.classList.add('is-playing');
  v.addEventListener('playing', show, { once: true });
  setTimeout(show, 3000);
  pick();
  mq.addEventListener ? mq.addEventListener('change', pick) : mq.addListener(pick);
  // Pause quand le hero n'est plus visible (économie batterie)
  if ('IntersectionObserver' in window && !reduced) new IntersectionObserver(([en]) => { if (en.isIntersecting) v.play().catch(() => {}); else v.pause(); }).observe(v);
})();

/* Vidéos en boucle (aperçu bande démo) : lecture seulement quand elles sont visibles */
$$('video.loop').forEach(v => {
  v.muted = true;
  if (reduced) { v.removeAttribute('autoplay'); v.pause(); return; }
  if ('IntersectionObserver' in window) new IntersectionObserver(([en]) => { if (en.isIntersecting) v.play().catch(() => {}); else v.pause(); }, { threshold: 0.2 }).observe(v);
});

/* Changement de langue en douceur : fondu, puis même position de lecture sur l'autre page */
document.addEventListener('click', e => {
  const a = e.target.closest('a[data-lang]'); if (!a || e.metaKey || e.ctrlKey) return;
  e.preventDefault();
  try { sessionStorage.setItem('face-lang-scroll', String(window.scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight))); } catch (_) {}
  root.classList.add('is-leaving');
  setTimeout(() => { location.href = a.href; }, reduced ? 0 : 380);
});
(function restoreScroll() {
  let r = null; try { r = sessionStorage.getItem('face-lang-scroll'); sessionStorage.removeItem('face-lang-scroll'); } catch (_) {}
  if (r === null) return;
  const go = () => { const y = parseFloat(r) * (document.documentElement.scrollHeight - innerHeight); lenis ? lenis.scrollTo(y, { immediate: true }) : scrollTo(0, y); };
  requestAnimationFrame(() => requestAnimationFrame(go));
})();
addEventListener('pageshow', e => { if (e.persisted) root.classList.remove('is-leaving'); });

/* Horloge du studio */
const clock = $('#clock');
const tick = () => { if (clock) clock.textContent = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }).format(new Date()); };
tick(); setInterval(tick, 20000);
/* Horloges du menu (Paris, Abidjan), à la seconde, seulement quand le menu est ouvert */
const tzEls = $$('[data-tz]');
const tickTz = () => tzEls.forEach(el => { el.textContent = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: el.dataset.tz }).format(new Date()); });
tickTz(); setInterval(() => { if (root.classList.contains('menu-open')) tickTz(); }, 1000);

/* Header en verre après le hero, barre mobile masquée en fin de page */
if ('IntersectionObserver' in window) {
  new IntersectionObserver(([en]) => root.classList.toggle('past-hero', !en.isIntersecting), { rootMargin: `-${72}px 0px 0px 0px` }).observe($('.hero'));
  const io = new IntersectionObserver(entries => entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px' });
  $$('.reveal').forEach(el => io.observe(el));
} else { $$('.reveal').forEach(el => el.classList.add('in')); }

/* Couleur du header selon la section dessous */
const header = $('.header');
const toneSections = [...$$('main > section'), $('#contact')]; // le footer fixe en dernier : il n'est « dessous » qu'une fois la page passée
const revealEnd = $('#reveal-end');
function syncHeaderTone() {
  const endTop = revealEnd.getBoundingClientRect().top;
  // Footer entièrement découvert = on est tout en bas (fiable aussi sur iOS, où la hauteur d'écran varie)
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const footerFull = endTop <= 4 || window.scrollY >= maxScroll - 24;
  root.classList.toggle('is-scrolled', window.scrollY > 10 && !footerFull);
  root.classList.toggle('footer-full', footerFull);
  root.classList.toggle('at-end', endTop < innerHeight * 0.85);
  if (root.classList.contains('menu-open')) { header.classList.remove('on-light'); return; }
  const hr = header.getBoundingClientRect(); const y = hr.top + hr.height / 2;
  const s = toneSections.find(el => { const r = el.getBoundingClientRect(); return r.top <= y && r.bottom > y; });
  header.classList.toggle('on-light', !!s && s.dataset.tone !== 'dark');
}
/* Section active dans la nav (desktop + menu mobile) */
const spyLinks = $$('.nav a[href^="#"], .menu nav a[href^="#"]');
const spyTargets = [...new Set(spyLinks.map(a => a.getAttribute('href')))].map(id => $(id)).filter(Boolean);
let spyCurrent = null;
function syncActiveSection() {
  const y = innerHeight * 0.4;
  const cur = spyTargets.find(el => { const r = el.getBoundingClientRect(); return r.top <= y && r.bottom > y; });
  const id = cur ? '#' + cur.id : null;
  if (id === spyCurrent) return;
  spyCurrent = id;
  spyLinks.forEach(a => { if (a.getAttribute('href') === id) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
  $$('.nav, .menu nav').forEach(n => n.classList.toggle('has-active', !!id));
  placeIndicator();
}
const navEl = $('.nav');
const navInd = document.createElement('span'); navInd.className = 'nav-ind'; navInd.setAttribute('aria-hidden', 'true');
navEl.prepend(navInd);
function placeIndicator() {
  const a = $('a[aria-current]', navEl); if (!a) return;
  const pad = 13;
  navInd.style.width = (a.offsetWidth + pad * 2) + 'px';
  navInd.style.transform = `translateX(${a.offsetLeft - pad}px)`;
}
addEventListener('resize', placeIndicator);
if (document.fonts) document.fonts.ready.then(placeIndicator);
let toneRaf = 0;
addEventListener('scroll', () => { cancelAnimationFrame(toneRaf); toneRaf = requestAnimationFrame(() => { syncHeaderTone(); syncActiveSection(); }); }, { passive: true });
addEventListener('resize', () => requestAnimationFrame(syncHeaderTone), { passive: true });
syncHeaderTone(); syncActiveSection();

/* =========================================================
   Menu mobile
   ========================================================= */
const menu = $('#menu'), menuBtn = $('.menu-btn');
function lockScroll(lock) {
  if (lock) { if (lenis) lenis.stop(); document.body.style.overflow = 'hidden'; }
  else if (!root.classList.contains('menu-open') && !root.classList.contains('booking-open')) { if (lenis) lenis.start(); document.body.style.overflow = ''; }
}
function setMenu(open, restoreFocus = true) {
  root.classList.toggle('menu-open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.textContent = open ? t('Fermer', 'Close') : 'Menu';
  syncHeaderTone();
  if (open) { menu.removeAttribute('inert'); lockScroll(true); setTimeout(() => { const a = $('nav a', menu); if (a) a.focus({ preventScroll: true }); }, 60); }
  else { menu.setAttribute('inert', ''); lockScroll(false); if (restoreFocus) menuBtn.focus({ preventScroll: true }); }
}
menuBtn.addEventListener('click', () => setMenu(!root.classList.contains('menu-open')));
addEventListener('keydown', e => { if (e.key === 'Escape' && root.classList.contains('menu-open')) setMenu(false); });
const mqMobile = matchMedia('(max-width: 860px)');
const onMq = () => { if (!mqMobile.matches && root.classList.contains('menu-open')) setMenu(false, false); };
mqMobile.addEventListener ? mqMobile.addEventListener('change', onMq) : mqMobile.addListener(onMq);

/* =========================================================
   Grille photo : les images s'alternent en fondu
   ========================================================= */
const MOSAIC_POOL = [
  { f: 'bw-debardeur.jpg', pos: '50% 20%', cap: [t('Pola agence', 'Agency pola'), 'df.01'] },
  { f: 'rideau-bleu.jpg', cap: [t('Portrait comédien', 'Actor portrait'), 'df.03'] },
  { f: 'bw-assise.jpg' }, { f: 'rouge.jpg', pos: '50% 0' }, { f: 'film-pied.jpg' }, { f: 'debardeur-chaud.jpg' },
  { f: 'denim-brun.jpg', cap: [t('Éditorial', 'Editorial'), 'df.04'] }, { f: 'hoodie.jpg', pos: '50% 10%' },
  { f: 'jean-pied.jpg' }, { f: 'bw-denim.jpg' }, { f: 'bw-lampe.jpg' }, { f: 'sol-bleu.jpg', pos: '60% 40%' },
  { f: 'bw-sol.jpg' }, { f: 'pola-tresses.jpg', pos: '50% 25%' }
];
const MOSAIC_DELAY = 2000;   // toutes les ~2 s, deux cases changent (la 2e avec 0,65 s de décalage)
(function mosaicFade() {
  const grid = $('.mosaic'); if (!grid || reduced) return;
  const tiles = $$('.media', grid);
  const fileOf = t => (t.querySelector('img:last-of-type').getAttribute('src') || '').split('/').pop();
  let visible = false, timer = null, recent = [];
  const pendingFiles = new Set(), pendingTiles = new Set();
  function swap() {
    const shown = tiles.filter(t => t.offsetParent !== null);
    const used = new Set([...tiles.map(fileOf), ...pendingFiles]); // y compris les cases masquées en mobile : jamais de doublon
    const free = MOSAIC_POOL.filter(p => !used.has(p.f));
    const candidates = shown.filter(t => !recent.includes(t) && !pendingTiles.has(t));
    if (!free.length || !candidates.length) return;
    const tile = candidates[Math.floor(Math.random() * candidates.length)];
    const next = free[Math.floor(Math.random() * free.length)];
    recent = [tile, ...recent].slice(0, 3);
    pendingFiles.add(next.f); pendingTiles.add(tile);
    const old = tile.querySelector('img:last-of-type');
    const img = new Image();
    img.alt = ''; img.decoding = 'async';
    img.className = 'mosaic-in';
    if (next.pos) img.style.objectPosition = next.pos;
    img.onload = () => {
      pendingFiles.delete(next.f); pendingTiles.delete(tile);
      old.after(img);
      requestAnimationFrame(() => requestAnimationFrame(() => img.classList.add('on')));
      setTimeout(() => old.remove(), 2100);
      let cap = tile.querySelector('figcaption');
      if (cap) cap.classList.add('out');
      setTimeout(() => {
        if (cap && !next.cap) cap.remove();
        if (next.cap) {
          if (!cap) { cap = document.createElement('figcaption'); cap.className = 'caps out'; tile.appendChild(cap); }
          cap.innerHTML = `<span>${next.cap[0]}</span><span>${next.cap[1]}</span>`;
          requestAnimationFrame(() => cap.classList.remove('out'));
        }
      }, 500);
    };
    img.onerror = () => { pendingFiles.delete(next.f); pendingTiles.delete(tile); };
    img.src = CONFIG.imgPath + next.f;
  }
  // Deux cases changent à chaque fois, en décalé
  const loop = () => { clearTimeout(timer); if (visible && !document.hidden) { swap(); setTimeout(() => { if (visible) swap(); }, 650); timer = setTimeout(loop, MOSAIC_DELAY + Math.random() * 600); } };
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) timer = setTimeout(loop, 1200); else clearTimeout(timer); }, { threshold: 0.25 }).observe(grid);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && visible) loop(); });
})();

/* =========================================================
   Séances : accordéon + photos d'exemple
   ========================================================= */
const img = (file, alt = '') => `<img src="${CONFIG.imgPath}${file}" alt="${alt}" loading="lazy" decoding="async">`;

/* Desktop : visuel qui défile à droite de la liste */
const stage = $('.stage');
let track = $('#stage-track'); const bars = $('#stage-bars');
let stageOffer = null, stageIndex = 0, stageTimer = null;
function renderStage(id) {
  const o = offerById(id); if (!o || !o.images) return;
  stageOffer = o; stageIndex = 0;
  // + une copie de la 1re photo à la fin : permet de boucler à l'infini sans rembobiner
  const html = o.images.map((f, i) => img(f, `${t('Exemple', 'Example')} ${o.name}, photo ${i + 1}`)).join('') + img(o.images[0], '').replace('<img ', '<img aria-hidden="true" ');
  if (!track.children.length || reduced) { track.innerHTML = html; }
  else {
    // Changement de formule : la nouvelle série monte comme un volet depuis le bas
    const prev = track;
    const next = document.createElement('div');
    next.className = 'stage-track wipe'; next.innerHTML = html;
    prev.after(next); prev.removeAttribute('id'); next.id = 'stage-track';
    track = next;
    requestAnimationFrame(() => requestAnimationFrame(() => next.classList.add('in')));
    setTimeout(() => { prev.remove(); next.classList.remove('wipe', 'in'); }, 1000);
  }
  bars.innerHTML = o.images.map(() => '<span><i></i></span>').join('');
  $('#stage-name').textContent = `${t('Exemples', 'Examples')} · ${o.name}`;
  showSlide(0);
}
const setX = (pos, animate = true) => {
  if (!animate) { track.style.transition = 'none'; track.style.transform = `translateX(-${pos * 100}%)`; void track.offsetWidth; track.style.transition = ''; }
  else track.style.transform = `translateX(-${pos * 100}%)`;
};
let loopTimer = null;
function showSlide(i) {
  if (!stageOffer) return;
  const n = stageOffer.images.length;
  if (loopTimer) { clearTimeout(loopTimer); loopTimer = null; setX(0, false); } // clic rapide pendant le bouclage
  if (i >= n) {
    // après la dernière : on glisse vers la copie de la 1re, puis on revient à 0 sans animation
    setX(n); loopTimer = setTimeout(() => { loopTimer = null; setX(0, false); }, 950);
  } else if (i < 0) {
    // avant la 1re : on se place sur la copie (identique) puis on recule vers la dernière
    setX(n, false); requestAnimationFrame(() => setX(n - 1));
  } else setX(i);
  stageIndex = (i + n) % n;
  $('#stage-count').textContent = `${stageIndex + 1} / ${n}`;
  $$('span', bars).forEach((b, k) => {
    b.classList.toggle('cur', k === stageIndex);
    b.classList.remove('run');
    if (k === stageIndex && !reduced) { void b.offsetWidth; b.classList.add('run'); }
  });
  clearTimeout(stageTimer);
  if (!reduced && !stage.classList.contains('is-paused')) stageTimer = setTimeout(() => showSlide(stageIndex + 1), CONFIG.stageDelay);
}
if (stage) {
  bars.style.setProperty('--dur', CONFIG.stageDelay + 'ms');
  $('#stage-prev').addEventListener('click', () => showSlide(stageIndex - 1));
  $('#stage-next').addEventListener('click', () => showSlide(stageIndex + 1));
  stage.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { stage.classList.add('is-paused'); clearTimeout(stageTimer); } });
  stage.addEventListener('pointerleave', () => { stage.classList.remove('is-paused'); showSlide(stageIndex); });
}

/* Mobile : carrousel à glisser dans la formule ouverte.
   Défile tout seul comme une story quand personne ne touche, et boucle à l'infini. */
$$('.offer-car').forEach(car => {
  const o = offerById(car.dataset.car); if (!o) return;
  const n = o.images.length;
  // + une 2e série en copie : il y a toujours une photo qui dépasse à droite, et on boucle sans rembobiner
  car.innerHTML = o.images.map((f, i) => img(f, `${t('Exemple', 'Example')} ${o.name}, photo ${i + 1}`)).join('') + o.images.map(f => img(f, '').replace('<img ', '<img aria-hidden="true" ')).join('');
  const dots = $('.dots', car.nextElementSibling);
  dots.innerHTML = o.images.map(() => '<span><i></i></span>').join('');
  dots.style.setProperty('--dur', CONFIG.stageDelay + 'ms');
  const article = car.closest('.offer');
  let shownIdx = -1;
  // Barre de la photo en cours : se remplit pendant l'affichage (comme une story)
  const setBar = idx => {
    shownIdx = idx;
    $$('span', dots).forEach((d, k) => {
      d.classList.toggle('on', k === idx);
      d.classList.remove('run');
      if (k === idx && !reduced) { void d.offsetWidth; d.classList.add('run'); }
    });
  };
  const pos = i => car.children[i].offsetLeft - car.children[0].offsetLeft;
  const current = () => { let best = 0, d = Infinity; for (let i = 0; i < 2 * n; i++) { const dd = Math.abs(pos(i) - car.scrollLeft); if (dd < d) { d = dd; best = i; } } return best; };
  let raf = 0, timer = null, touching = false, resumeT = null;
  car.addEventListener('scroll', () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const idx = current() % n; // la copie = la même photo
      if (idx !== shownIdx) setBar(idx);
    });
  }, { passive: true });
  // arrivé sur la copie de la 1re photo : retour instantané au vrai début
  const rewindIfCopy = () => { const i = current(); if (i >= n) { car.style.scrollSnapType = 'none'; car.scrollLeft = pos(i - n); requestAnimationFrame(() => car.style.scrollSnapType = ''); } };
  car.addEventListener('scrollend', rewindIfCopy);
  const visible = () => article.classList.contains('is-open') && mqMobile.matches && !document.hidden;
  const next = () => {
    if (!touching && visible()) {
      let i = current();
      if (i >= n) { car.style.scrollSnapType = 'none'; car.scrollLeft = pos(i - n); car.style.scrollSnapType = ''; i -= n; } // filet de sécurité
      car.scrollTo({ left: pos(i + 1), behavior: 'smooth' });
      if (!('onscrollend' in window)) setTimeout(rewindIfCopy, 800);
    }
    timer = setTimeout(next, CONFIG.stageDelay);
  };
  setBar(0);
  if (!reduced) timer = setTimeout(next, CONFIG.stageDelay);
  // Formule rouverte : on repart de la 1re photo, barre et minuteur à zéro
  car.addEventListener('restart', () => { setBar(0); clearTimeout(timer); if (!reduced) timer = setTimeout(next, CONFIG.stageDelay); });
  // Pause pendant que la personne touche ou fait défiler, reprise 4 s après
  car.addEventListener('touchstart', () => { touching = true; dots.classList.add('paused'); clearTimeout(resumeT); }, { passive: true });
  car.addEventListener('touchend', () => { clearTimeout(resumeT); resumeT = setTimeout(() => { touching = false; dots.classList.remove('paused'); setBar(shownIdx); clearTimeout(timer); timer = setTimeout(next, CONFIG.stageDelay); }, 4000); }, { passive: true });
});

/* Accordéon */
const offers = $$('.offer');
function setOpen(article, open) {
  article.classList.toggle('is-open', open);
  $('.offer-head', article).setAttribute('aria-expanded', String(open));
  const body = $('.offer-body', article);
  if (open) body.removeAttribute('inert'); else body.setAttribute('inert', '');
}
offers.forEach(a => {
  setOpen(a, a.classList.contains('is-open'));
  $('.offer-head', a).addEventListener('click', () => {
    const willOpen = !a.classList.contains('is-open');
    // Hauteur qui va se replier au-dessus (formule ouverte placée avant celle-ci)
    const prevOpen = offers.find(o => o !== a && o.classList.contains('is-open'));
    const collapse = prevOpen && prevOpen.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING ? $('.offer-body', prevOpen).getBoundingClientRect().height : 0;
    offers.forEach(o => { if (o !== a) setOpen(o, false); });
    setOpen(a, willOpen);
    if (willOpen) {
      const y = window.scrollY + a.getBoundingClientRect().top - collapse - headerH() - 8;
      if (lenis) lenis.scrollTo(y, { duration: 1.1 }); else scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
    }
    if (willOpen) { renderStage(a.dataset.offer); const car = $('.offer-car', a); if (car) { car.scrollLeft = 0; car.dispatchEvent(new Event('restart')); } }
  });
});
renderStage(($('.offer.is-open') || {}).dataset?.offer || 'book');

/* Questions fréquentes : une seule ouverte à la fois, ouverture animée */
$$('.ed-qi button').forEach(b => b.addEventListener('click', () => {
  const item = b.parentElement, open = !item.classList.contains('open');
  $$('.ed-qi').forEach(x => { x.classList.remove('open'); $('button', x).setAttribute('aria-expanded', 'false'); $('.a', x).setAttribute('inert', ''); });
  if (open) { item.classList.add('open'); b.setAttribute('aria-expanded', 'true'); $('.a', item).removeAttribute('inert'); }
}));
$$('.ed-qi:not(.open) .a').forEach(a => a.setAttribute('inert', ''));

/* =========================================================
   Tunnel de réservation
   ========================================================= */
const defaults = () => ({
  step: 1, offer: null, photos: 0, hours: 0, express: false, polasAdd: false, scriptAdd: false, team: false, elsewhere: false,
  date: null, slot: null, flexible: false, page: 0,
  firstName: '', lastName: '', email: '', phone: '', instagram: '', profile: '', goal: '', message: ''
});
let state = defaults();
try {
  const saved = JSON.parse(localStorage.getItem(CONFIG.storageKey) || 'null');
  if (saved && typeof saved === 'object') state = Object.assign(defaults(), saved, { step: 1 });
} catch (e) {}
const save = () => { try { localStorage.setItem(CONFIG.storageKey, JSON.stringify(state)); } catch (e) {} };

const booking = $('#booking');
const panel = $('.booking-panel', booking);
const STEP_NAMES = EN ? ['Session', 'Options', 'Date', 'Your details', 'Summary'] : ['Formule', 'Options', 'Date', 'Coordonnées', 'Récapitulatif'];
let lastFocus = null;

/* Dates */
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromIso = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const minDate = () => addDays(today(), CONFIG.minNoticeDays);
const longDate = d => d.toLocaleDateString(LOC, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
if (state.date && fromIso(state.date) < minDate()) state.date = null;

/* Calculs */
const unitPrice = o => (o && o.extraUnit === 'pola') ? CONFIG.options.pola : CONFIG.options.photo;
const unitWord = (o, n) => ((o && o.extraUnit === 'pola') ? 'pola' : 'photo') + (n > 1 ? 's' : '');
function lines() {
  const o = offerById(state.offer); if (!o) return [];
  const L = [{ label: o.name, amount: o.price }];
  if (o.photos && state.photos) L.push({ label: EN ? `${state.photos} extra ${unitWord(o, state.photos)}` : `${state.photos} ${unitWord(o, state.photos)} supplémentaire${state.photos > 1 ? 's' : ''}`, amount: state.photos * unitPrice(o) });
  if (state.hours) L.push({ label: EN ? `${state.hours} extra hour${state.hours > 1 ? 's' : ''}` : `${state.hours} h supplémentaire${state.hours > 1 ? 's' : ''}`, amount: state.hours * CONFIG.options.hour });
  if (o.polasOption && state.polasAdd) L.push({ label: t('Polas pendant la séance', 'Polas during the session'), amount: CONFIG.options.polas });
  if (o.polasIncluded) L.push({ label: 'Polas', amount: 0 });
  if (o.scriptOption && state.scriptAdd) L.push({ label: t('Texte fourni par le studio', 'Script provided by the studio'), amount: CONFIG.options.script });
  if (o.express && state.express) L.push({ label: t('Retouche express 24 h', 'Express retouching (24 h)'), amount: CONFIG.options.express });
  return L;
}
const total = () => lines().reduce((s, l) => s + l.amount, 0);
const deposit = () => Math.min(CONFIG.deposit, total());

/* Étape 1 */
function renderOffers() {
  $('#bk-offers').innerHTML = CONFIG.offers.map(o => `
    <label class="choice">
      <input type="radio" name="bk-offer" value="${o.id}" ${state.offer === o.id ? 'checked' : ''}>
      <span class="choice-card">
        <span class="choice-name">${o.name}${o.reco ? ` <span class="choice-reco">${t('Recommandé', 'Recommended')}</span>` : ''}</span>
        <span class="choice-price">${eur(o.price)}</span>
        <span class="choice-meta">${[o.duration, o.outfits, o.output, o.extra].filter(Boolean).join(', ')}</span>
      </span>
    </label>`).join('');
}
$('#bk-offers').addEventListener('change', e => {
  if (e.target.name !== 'bk-offer') return;
  state.offer = e.target.value; showErr('err-offer', false); syncOptions(); updateTotals(); save();
});

/* Étape 2 */
function syncOptions() {
  const o = offerById(state.offer);
  const photosRow = $('[data-row="photos"]'), expressRow = $('[data-row="express"]');
  const photosOk = !o || o.photos, expressOk = !o || o.express;
  if (!photosOk) state.photos = 0;
  if (!expressOk) state.express = false;
  const isPola = o && o.extraUnit === 'pola';
  $('#photos-label').textContent = isPola ? t('Polas supplémentaires', 'Extra polas') : t('Photos supplémentaires', 'Extra photos');
  $('#photos-sub').textContent = photosOk ? `${eur(unitPrice(o))} ${isPola ? t('le pola', 'per pola') : t('la photo retouchée', 'per retouched photo')}` : t('Non disponible pour la scène de jeu', 'Not available for the acting scene');
  photosRow.classList.toggle('is-disabled', !photosOk);
  expressRow.classList.toggle('is-disabled', !expressOk);
  $('#f-express').disabled = !expressOk;
  $('#express-sub').textContent = expressOk ? eur(CONFIG.options.express) : (isPola ? t('Polas déjà livrés sous 48 h', 'Polas already delivered within 48 h') : t('Non disponible', 'Not available'));
  $('#out-photos').textContent = state.photos;
  $('#out-hours').textContent = state.hours;
  $('[data-dec="photos"]').disabled = !photosOk || state.photos <= 0;
  $('[data-inc="photos"]').disabled = !photosOk || state.photos >= CONFIG.options.maxPhotos;
  $('[data-dec="hours"]').disabled = state.hours <= 0;
  $('[data-inc="hours"]').disabled = state.hours >= CONFIG.options.maxHours;
  $('#f-express').checked = state.express;
  const scriptOk = !!(o && o.scriptOption);
  if (!scriptOk) state.scriptAdd = false;
  $('[data-row="script"]').hidden = !scriptOk;
  $('#f-script').checked = state.scriptAdd;
  $('#script-sub').textContent = `+${eur(CONFIG.options.script)}, ${t('si tu n’as pas ton propre texte', 'if you don’t have your own text')}`;
  const polasRow = $('[data-row="polas"]'), polasBox = $('#f-polas');
  const inc = !!(o && o.polasIncluded), opt = !o || !!o.polasOption;
  if (!opt) state.polasAdd = false;
  polasRow.classList.toggle('is-disabled', !opt && !inc);
  polasBox.disabled = !opt;
  polasBox.checked = inc || state.polasAdd;
  $('#polas-sub').textContent = inc ? t(`Inclus dans le ${o.name}`, `Included in the ${o.name}`) : opt ? eur(CONFIG.options.polas) : t('Réservé aux books', 'Books only');
}
booking.addEventListener('click', e => {
  const inc = e.target.closest('[data-inc]'), dec = e.target.closest('[data-dec]');
  if (!inc && !dec) return;
  const k = (inc || dec).dataset[inc ? 'inc' : 'dec'];
  const max = k === 'photos' ? CONFIG.options.maxPhotos : CONFIG.options.maxHours;
  state[k] = Math.max(0, Math.min(max, state[k] + (inc ? 1 : -1)));
  syncOptions(); updateTotals(); save();
});

/* Étape 3 : calendrier
   Disponibilités réelles lues dans Google Agenda via la fonction « dispos ».
   Si elle ne répond pas, le calendrier reste ouvert et le créneau est confirmé à la main. */
const avail = { offer: null, days: null, partial: new Set(), loading: false };
async function loadAvailability() {
  if (!CONFIG.availabilityUrl || !state.offer) { avail.days = null; return; }
  if (avail.offer === state.offer && avail.days) return;
  avail.loading = true; avail.offer = state.offer;
  $('#cal').classList.add('is-loading');
  try {
    const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 6000);
    const r = await fetch(`${CONFIG.availabilityUrl}?offer=${encodeURIComponent(state.offer)}&v=3`, { signal: ctrl.signal });
    clearTimeout(to);
    if (!r.ok) throw new Error(r.status);
    const data = await r.json();
    avail.days = data.days || null;
    avail.partial = new Set(data.partial || []);
  } catch (e) { avail.days = null; avail.partial = new Set(); }
  avail.loading = false;
  $('#cal').classList.remove('is-loading');
  // la date ou le moment choisis ne sont plus libres : on les retire
  if (avail.days && state.date && !avail.days[state.date]) { state.date = null; state.slot = null; }
  if (avail.days && state.date && state.slot && !avail.days[state.date].includes(state.slot)) state.slot = null;
  if (state.step === 3) { renderCal(); renderSlots(); }
}
const dayOpen = id => !avail.days || !!avail.days[id];
const slotOpen = id => !avail.days || !state.date || (avail.days[state.date] || []).includes(id);
const DOW = EN ? ['M', 'T', 'W', 'T', 'F', 'S', 'S'] : ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
function gridStart() { const t = today(); const dow = (t.getDay() + 6) % 7; return addDays(t, -dow); }
function renderCal() {
  const start = addDays(gridStart(), state.page * CONFIG.weeksPerPage * 7);
  const days = CONFIG.weeksPerPage * 7;
  const end = addDays(start, days - 1);
  const min = minDate();
  const fmtM = d => d.toLocaleDateString(LOC, { month: 'long' });
  const label = start.getMonth() === end.getMonth() ? `${fmtM(start)} ${end.getFullYear()}` : `${fmtM(start)} – ${fmtM(end)} ${end.getFullYear()}`;
  $('#cal-label').textContent = label.charAt(0).toUpperCase() + label.slice(1);
  let html = DOW.map(d => `<span class="dow" aria-hidden="true">${d}</span>`).join('');
  for (let i = 0; i < days; i++) {
    const d = addDays(start, i), id = iso(d), dis = d < min || CONFIG.closedDays.includes(d.getDay()) || !dayOpen(id);
    const first = d.getDate() === 1 ? `<small>${d.toLocaleDateString(LOC, { month: 'short' })}</small>` : '';
    const part = !dis && avail.partial.has(id);
    html += `<button type="button" class="day${part ? ' is-partial' : ''}" data-date="${id}" ${dis ? 'disabled' : ''} aria-pressed="${state.date === id}" aria-label="${longDate(d)}${dis ? t(', indisponible', ', unavailable') : part ? t(', quelques créneaux restants', ', a few slots left') : ''}">${d.getDate()}${first}</button>`;
  }
  $('#cal').innerHTML = html;
  $('#cal-prev').disabled = state.page <= 0;
  $('#cal-next').disabled = state.page >= CONFIG.maxPages - 1;
}
$('#cal').addEventListener('click', e => {
  const b = e.target.closest('.day'); if (!b || b.disabled) return;
  state.date = b.dataset.date; showErr('err-date', false);
  $$('.day', $('#cal')).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  if (state.slot && !slotOpen(state.slot)) state.slot = null;
  renderSlots();
  save();
});
$('#cal-prev').addEventListener('click', () => { state.page = Math.max(0, state.page - 1); renderCal(); });
$('#cal-next').addEventListener('click', () => { state.page = Math.min(CONFIG.maxPages - 1, state.page + 1); renderCal(); });
function renderSlots() {
  $('#slots').innerHTML = CONFIG.slots.map(s => { const ok = slotOpen(s.id); return `
    <label class="choice slot${ok ? '' : ' is-full'}">
      <input type="radio" name="bk-slot" value="${s.id}" ${state.slot === s.id ? 'checked' : ''} ${ok ? '' : 'disabled'}>
      <span class="choice-card"><span class="choice-name">${s.label}</span><span class="choice-meta">${ok ? s.hours : t('Complet', 'Fully booked')}</span></span>
    </label>`; }).join('');
}
$('#slots').addEventListener('change', e => { state.slot = e.target.value; showErr('err-slot', false); save(); });

/* Étape 4 */
function renderProfiles() {
  $('#chips-profile').innerHTML = CONFIG.profiles.map(p => `
    <label class="choice chip"><input type="radio" name="bk-profile" value="${p}" ${state.profile === p ? 'checked' : ''}><span class="choice-card">${p}</span></label>`).join('');
}
$('#chips-profile').addEventListener('change', e => { state.profile = e.target.value; save(); });

$$('[data-field]', booking).forEach(el => {
  const k = el.dataset.field;
  if (el.type === 'checkbox') el.checked = !!state[k]; else el.value = state[k] || '';
  el.addEventListener(el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'input', () => {
    state[k] = el.type === 'checkbox' ? el.checked : el.value;
    if (el.getAttribute('aria-invalid') === 'true') validateField(k);
    if (k === 'express' || k === 'polasAdd' || k === 'scriptAdd') updateTotals();
    save();
  });
  if (el.type !== 'checkbox' && el.required) el.addEventListener('blur', () => { if (el.value) validateField(k); });
});

/* Validation */
function showErr(id, on) { const el = $('#' + id); if (el) el.classList.toggle('show', on); }
const RULES = {
  firstName: v => v.trim().length > 0,
  email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
  phone: v => v.replace(/\D/g, '').length >= 10
};
const ERR = { firstName: 'err-first', email: 'err-email', phone: 'err-phone' };
function validateField(k) {
  if (!RULES[k]) return true;
  const ok = RULES[k](state[k] || '');
  const el = $(`[data-field="${k}"]`, booking);
  el.setAttribute('aria-invalid', String(!ok)); showErr(ERR[k], !ok);
  return ok;
}
function validate(step) {
  if (step === 1) { const ok = !!state.offer; showErr('err-offer', !ok); if (!ok) focusFirst('#bk-offers input'); return ok; }
  if (step === 3) {
    const d = !!state.date, s = !!state.slot;
    showErr('err-date', !d); showErr('err-slot', !s);
    if (!d) focusFirst('.day:not([disabled])'); else if (!s) focusFirst('#slots input');
    return d && s;
  }
  if (step === 4) {
    const bad = ['firstName', 'email', 'phone'].filter(k => !validateField(k));
    if (bad.length) { $(`[data-field="${bad[0]}"]`, booking).focus(); return false; }
    return true;
  }
  return true;
}
function focusFirst(sel) { const el = $(sel, booking); if (el) el.focus(); }

/* Récapitulatif */
function slotLabel() { const s = CONFIG.slots.find(x => x.id === state.slot); return s ? `${s.label.toLowerCase()} (${s.hours})` : ''; }
function extrasList() {
  const x = [];
  if (state.team) x.push(t('maquillage / coiffure / stylisme (sur demande)', 'make-up / hair / styling (on request)'));
  if (state.elsewhere) x.push(t('autre lieu (sur devis)', 'other location (quote on request)'));
  return x;
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function renderRecap() {
  const o = offerById(state.offer);
  const rows = [
    [t('Formule', 'Session'), o ? o.name : '', 1],
    ['Date', state.date ? `${longDate(fromIso(state.date))}, ${slotLabel()}${state.flexible ? t('. Flexible', '. Flexible') : ''}` : '', 3],
    ['Contact', [`${state.firstName} ${state.lastName}`.trim(), state.email, state.phone, state.instagram].filter(Boolean), 4],
    [t('Profil', 'Profile'), [state.profile, state.goal].filter(Boolean).join(', ') || '—', 4]
  ];
  const extras = extrasList();
  if (extras.length) rows.splice(1, 0, [t('Demandes', 'Requests'), extras.join(', '), 2]);
  $('#recap').innerHTML = rows.map(([k, v, s]) => `<div><dt>${k}</dt><dd>${Array.isArray(v) ? v.map(esc).join('<br>') : esc(v)}<button type="button" class="edit" data-goto="${s}">Modifier</button></dd></div>`).join('');
  $('#bill').innerHTML = lines().map(l => `<li><span>${esc(l.label)}</span><span class="num">${l.amount ? eur(l.amount) : 'Inclus'}</span></li>`).join('')
    + `<li class="total"><span>${t('Total estimé', 'Estimated total')}</span><span class="num">${eur(total())}</span></li>`
    + `<li class="muted"><span>${t('Acompte à la confirmation', 'Deposit on confirmation')}</span><span class="num">${eur(deposit())}</span></li>`;
  syncSend();
}
$('#recap').addEventListener('click', e => { const b = e.target.closest('[data-goto]'); if (b) go(Number(b.dataset.goto)); });

function recapText() {
  const o = offerById(state.offer);
  const L = [
    t('Salut Jay, j’espère que tu vas bien !', 'Hi Jay, hope you’re well!'), '',
    t('Voici ma demande de réservation pour une séance FACE BY DAKĒ :', 'Here is my booking request for a FACE BY DAKĒ session:'), '',
    `${t('Formule', 'Session')} : ${o ? `${o.name} (${eur(o.price)})` : ''}`,
    ...lines().slice(1).map(l => `Option : ${l.label} (${l.amount ? eur(l.amount) : t('inclus', 'included')})`),
    ...extrasList().map(x => `${t('Demande', 'Request')} : ${x}`),
    `${t('Date souhaitée', 'Preferred date')} : ${state.date ? longDate(fromIso(state.date)) : ''}, ${slotLabel()}${state.flexible ? ' (flexible)' : ''}`,
    `${t('Total estimé', 'Estimated total')} : ${eur(total())}, ${t('dont acompte à la confirmation', 'including deposit on confirmation')} : ${eur(deposit())}`, '',
    `${t('Nom', 'Name')} : ${`${state.firstName} ${state.lastName}`.trim()}`,
    `Email : ${state.email}`,
    `${t('Téléphone', 'Phone')} : ${state.phone}`,
    state.instagram ? `Instagram : ${state.instagram}` : null,
    state.profile ? `${t('Profil', 'Profile')} : ${state.profile}` : null,
    state.goal ? `${t('Objectif', 'Goal')} : ${state.goal}` : null,
    state.message ? `\nMessage :\n${state.message}` : null,
    '', t('Merci, à très vite !', 'Thanks, speak soon!'), state.firstName || null
  ];
  return L.filter(l => typeof l === 'string').join('\n');
}
function mailHref() {
  const o = offerById(state.offer);
  const subject = `${t('Réservation', 'Booking')} ${o ? o.name : ''} – ${state.date ? fromIso(state.date).toLocaleDateString(LOC, { day: 'numeric', month: 'short' }) : ''} – ${state.firstName}`;
  return `mailto:${CONFIG.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(recapText())}`;
}
function syncSend() {
  $('#send-mail').href = mailHref();
}
async function copyRecap() {
  const txt = recapText();
  try { await navigator.clipboard.writeText(txt); toast(t('Récapitulatif copié', 'Summary copied')); return true; }
  catch (e) {
    const ta = document.createElement('textarea'); ta.value = txt; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch (_) {}
    ta.remove(); toast(ok ? t('Récapitulatif copié', 'Summary copied') : t('Copie impossible, sélectionne le texte manuellement', 'Couldn’t copy, please select the text manually')); return ok;
  }
}
$('#send-mail').addEventListener('click', e => {
  setTimeout(() => go(6), 250);
});
$('#send-ig').addEventListener('click', e => {
  copyRecap(); setTimeout(() => go(6), 250);
});
$('#copy-recap').addEventListener('click', copyRecap);

let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200); }

/* Navigation entre étapes */
function updateTotals() {
  $('#bk-total').textContent = eur(total());
  $('#bk-deposit').textContent = eur(deposit());
  if (state.step === 5) renderRecap();
}
function go(step) {
  const prev = state.step;
  state.step = step;
  $$('.bk-step', booking).forEach(s => {
    const on = Number(s.dataset.step) === step;
    s.hidden = !on;
    s.classList.remove('enter', 'enter-back');
    if (on && prev !== step && !reduced) { void s.offsetWidth; s.classList.add(step > prev ? 'enter' : 'enter-back'); }
  });
  const shown = Math.min(step, 5);
  $$('.bk-progress span', booking).forEach((s, i) => s.classList.toggle('done', i < shown));
  $('#bk-steptext').textContent = step > 5 ? t('Terminé', 'Done') : t(`Étape ${step} sur 5`, `Step ${step} of 5`);
  $('#bk-stepname').textContent = step > 5 ? '' : STEP_NAMES[step - 1];
  $('#bk-foot').hidden = step >= 5;
  $('#bk-back').style.visibility = step > 1 ? 'visible' : 'hidden';
  $('#bk-next').textContent = step === 4 ? t('Voir le récapitulatif', 'See summary') : t('Continuer', 'Continue');
  if (step === 2) syncOptions();
  if (step === 3) { renderCal(); renderSlots(); loadAvailability(); }
  if (step === 5) renderRecap();
  $('.bk-body', booking).scrollTop = 0;
  const h = $(`.bk-step[data-step="${step}"] h3`, booking);
  if (h && prev !== step) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  save();
}
$('#bk-next').addEventListener('click', () => { if (validate(state.step)) go(state.step + 1); });
$('#bk-back').addEventListener('click', () => go(Math.max(1, state.step - 1)));
booking.addEventListener('click', e => { if (e.target.closest('[data-goto-back]')) go(4); });

/* Ouverture / fermeture */
function openBooking(offerId) {
  lastFocus = document.activeElement;
  if (state.step >= 6) { const keep = { ...state }; state = Object.assign(defaults(), keep); }
  if (offerId && offerById(offerId)) state.offer = offerId;
  renderOffers(); renderProfiles(); syncOptions(); updateTotals();
  booking.classList.add('is-open');
  booking.setAttribute('aria-hidden', 'false');
  root.classList.add('booking-open');
  lockScroll(true);
  go(offerId && offerById(offerId) ? 2 : 1);
  setTimeout(() => { const h = $(`.bk-step[data-step="${state.step}"] h3`, booking); (h || panel).focus({ preventScroll: true }); }, 60);
}
function closeBooking() {
  booking.classList.remove('is-open');
  booking.setAttribute('aria-hidden', 'true');
  root.classList.remove('booking-open');
  lockScroll(false);
  if (state.step >= 6) {
    const keep = { ...state };
    state = Object.assign(defaults(), { firstName: keep.firstName, lastName: keep.lastName, email: keep.email, phone: keep.phone, instagram: keep.instagram, profile: keep.profile });
    save();
    $$('[data-field]', booking).forEach(el => { const k = el.dataset.field; if (el.type === 'checkbox') el.checked = !!state[k]; else el.value = state[k] || ''; });
  }
  if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-book]');
  if (b) { e.preventDefault(); if (root.classList.contains('menu-open')) setMenu(false, false); openBooking(b.dataset.book || null); return; }
  if (e.target.closest('[data-close]') && booking.classList.contains('is-open')) closeBooking();
});
document.addEventListener('keydown', e => {
  if (!booking.classList.contains('is-open')) return;
  if (e.key === 'Escape') { e.preventDefault(); closeBooking(); return; }
  if (e.key !== 'Tab') return;
  const f = $$('button:not([disabled]),a[href]:not([aria-disabled="true"]),input:not([disabled]),select,textarea,[tabindex="0"]', panel)
    .filter(el => el.offsetParent !== null && !el.closest('[hidden]'));
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});

/* Lien direct : #reserver, #reserver-book, ?formule=book */
(function deepLink() {
  const h = location.hash, q = new URLSearchParams(location.search).get('formule');
  if (h.startsWith('#reserver') || q) {
    const id = q || (h.split('-')[1] || null);
    setTimeout(() => openBooking(id), 700);
  }
})();

})();
