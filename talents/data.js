/* =========================================================
   FACE BY DAKĒ — logique partagée
   Les contenus (fiches, propositions de casting, réglages) sont dans talents-data.js,
   écrit par le back office (talents/admin). Ce fichier ne contient que du code.
   ========================================================= */
(function () {
  const q = new URLSearchParams(location.search);
  let data = window.TALENTS_DATA || { settings: {}, talents: [], selections: {} };

  // Aperçu du back office : ?preview=1 lit le brouillon local au lieu des données publiées
  window.TALENTS_PREVIEW = q.get('preview') === '1';
  if (window.TALENTS_PREVIEW) {
    try { const d = JSON.parse(localStorage.getItem('dake-admin-preview') || 'null'); if (d) data = d; } catch (e) {}
  }
  // Vidéos : liste (fichiers ou liens YouTube / Vimeo). Les anciennes fiches n'avaient qu'un champ « video ».
  (data.talents || []).forEach(t => {
    if (!Array.isArray(t.videos)) t.videos = t.video && (t.video.src || t.video.url) ? [t.video] : [];
    t.videos = t.videos.filter(v => v && (v.src || v.url));
  });
  window.TALENTS_DATA = data;

  // Public : seulement les fiches visibles ET avec accord droit à l'image. En aperçu : tout.
  const all = data.talents || [];
  window.TALENTS = window.TALENTS_PREVIEW ? all.slice() : all.filter(t => t.visible !== false && t.consent);
  window.ALL_TALENTS = all;
  window.SELECTIONS = data.selections || {};
  window.SETTINGS = Object.assign({ mail: 'contact@dake.studio', instagram: 'dake.face', studio: 'https://dake.studio', studioSoon: '', phone: '', city: 'Paris, France', reach: "Productions en France et à l'international" }, data.settings || {});
})();

window.CAT_LABEL = { mannequin: T('Mannequin', 'Model'), comedien: T('Comédien·ne', 'Actor'), influence: 'Influence' };

/* Utilitaires partagés */
window.TU = {
  get(slug) { return TALENTS.find(t => t.slug === slug) || ALL_TALENTS.find(t => t.slug === slug && TALENTS_PREVIEW) || TALENTS[0]; },
  // Chemin d'image : relatif au dossier talents/, sauf adresses complètes (aperçu : blob:, data:, https:)
  src(x) { return !x ? '' : /^(blob:|data:|https?:|\/)/.test(x) ? x : (window.TALENTS_PREFIX || '../') + x; },
  cats(t) { return (t.cats || []).map(c => CAT_LABEL[c]).concat((t.specs || []).map(TR)).join(' · '); },
  k(n) { n = +n || 0; const d = EN ? '.' : ','; return n >= 1e6 ? (n / 1e6).toFixed(1).replace('.', d) + (EN ? 'M' : ' M') : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e5 ? 0 : 1).replace('.', d).replace(d + '0', '') + (EN ? 'K' : ' k') : String(n); },
  pct(n) { return (+n || 0).toFixed(1).replace('.', EN ? '.' : ',') + (EN ? '%' : ' %'); },
  // Courbe d'abonnés sur 12 mois, en SVG
  spark(vals, w = 240, h = 56) {
    vals = (vals || []).map(Number).filter(v => !isNaN(v));
    if (vals.length < 2) vals = [0, 0];
    const min = Math.min(...vals), max = Math.max(...vals), pad = 3;
    const pts = vals.map((v, i) => [pad + i * (w - 2 * pad) / (vals.length - 1), h - pad - (v - min) / (max - min || 1) * (h - 2 * pad)]);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const last = pts[pts.length - 1];
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><path d="${d} L ${last[0]} ${h} L ${pad} ${h} Z" class="spark-area"/><path d="${d}" class="spark-line"/><circle cx="${last[0]}" cy="${last[1]}" r="3" class="spark-dot"/></svg>`;
  },
  // Total audience (IG + TT) et ER moyen pondéré
  reach(s) { return (+s.ig.followers || 0) + (+s.tt.followers || 0); },
  erAvg(s) { const a = +s.ig.followers || 0, b = +s.tt.followers || 0; return a + b ? ((+s.ig.er || 0) * a + (+s.tt.er || 0) * b) / (a + b) : 0; },
  // Titre éditable : *mot* = italique (seul formatage autorisé)
  title(s) { return String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/\*([^*]+)\*/g, '<em>$1</em>'); },
  // Un bloc est affiché s'il a du contenu et n'est pas désactivé dans le back office
  show(t, k) {
    const on = !t.sections || t.sections[k] !== false;
    if (k === 'polas') return on && (t.polas || []).length > 0;
    if (k === 'book') return on && (t.book || []).length > 0;
    if (k === 'video') return on && (t.videos || []).length > 0;
    if (k === 'stats') return on && !!(t.social && t.social.ig && t.social.tt);
    return on;
  }
};

TU.embed = window.videoEmbed;   // défini dans i18n.js (partagé avec le back office)

/* =========================================================
   SEO : adresse canonique, partage, données structurées
   Une URL par langue (?lang=fr / ?lang=en), l'adresse sans paramètre
   choisit la langue du visiteur (x-default). Les propositions de casting
   et l'aperçu du back office ne sont jamais indexés.
   ========================================================= */
window.SITE_URL = 'https://dake.studio';
TU.seo = function (o) {
  const h = document.head, q = new URLSearchParams(location.search);
  const meta = (attr, k, v) => { let m = h.querySelector(`meta[${attr}="${k}"]`); if (!m) { m = document.createElement('meta'); m.setAttribute(attr, k); h.appendChild(m); } m.setAttribute('content', v); };
  const link = (rel, href, lang) => { const l = document.createElement('link'); l.rel = rel; l.href = href; if (lang) l.hreflang = lang; h.appendChild(l); };
  const base = SITE_URL + '/talents/v1/' + (o.path || '');
  const url = l => { const qs = new URLSearchParams(Object.assign({}, o.params || {}, l ? { lang: l } : {})).toString(); return base + (qs ? '?' + qs : ''); };
  if (o.title) document.title = o.title;
  if (o.description) meta('name', 'description', o.description);
  // Proposition de casting, aperçu, fiche absente : hors index
  if (o.noindex || q.has('sel') || q.has('ids') || q.get('preview') === '1') { meta('name', 'robots', 'noindex, nofollow'); return; }
  link('canonical', url(LANG));
  link('alternate', url('fr'), 'fr'); link('alternate', url('en'), 'en'); link('alternate', url(''), 'x-default');
  meta('property', 'og:type', o.type || 'website');
  meta('property', 'og:site_name', 'FACE BY DAKĒ');
  meta('property', 'og:locale', EN ? 'en_GB' : 'fr_FR');
  meta('property', 'og:url', url(LANG));
  meta('property', 'og:title', o.title || document.title);
  if (o.description) meta('property', 'og:description', o.description);
  meta('property', 'og:image', o.image || SITE_URL + '/talents/img/og-face.jpg');
  meta('name', 'twitter:card', 'summary_large_image');
  if (o.ld) { const sc = document.createElement('script'); sc.type = 'application/ld+json'; sc.textContent = JSON.stringify(Object.assign({ '@context': 'https://schema.org' }, o.ld)); h.appendChild(sc); }
};
TU.abs = x => !x ? '' : /^https?:/.test(x) ? x : SITE_URL + '/talents/' + x;
window.FACE_ORG = { '@type': 'Organization', '@id': SITE_URL + '/talents/v1/#face', name: 'FACE BY DAKĒ', alternateName: ['Face by Daké', 'Face by Dake'], description: T('Talent roster by Daké Studio : talents intégrés aux productions photo et vidéo conçues et réalisées par Daké.', 'Talent roster by Daké Studio: talent featured in photo and video productions designed and made by Daké.'), url: SITE_URL + '/talents/v1/', logo: SITE_URL + '/talents/icon-512.png', parentOrganization: { '@id': SITE_URL + '/#studio', '@type': 'Organization', name: 'DAKĒ STUDIO', url: SITE_URL + '/' } };

/* =========================================================
   SÉLECTIONS PAR PROSPECT (gérées dans le back office, onglet Prospection)
   1. Enregistrée   → v1/?sel=sezane
   2. À la volée    → v1/?pour=Sézane&projet=…&ids=prune,lou
   ========================================================= */
TU.selection = function () {
  const q = new URLSearchParams(location.search);
  let s = null;
  if (q.get('sel') && SELECTIONS[q.get('sel')]) s = { ...SELECTIONS[q.get('sel')], key: q.get('sel') };
  else if (q.get('ids')) s = { client: q.get('pour') || '', project: q.get('projet') || '', note: q.get('note') || '', ids: q.get('ids').split(',') };
  if (!s) return null;
  s.talents = (s.ids || []).map(id => TALENTS.find(t => t.slug === id)).filter(Boolean);
  if (!s.talents.length) return null;
  // Paramètres à recopier sur chaque lien pour garder le contexte du casting
  const keep = new URLSearchParams();
  if (s.key) keep.set('sel', s.key);
  else { keep.set('ids', s.ids.join(',')); if (s.client) keep.set('pour', s.client); if (s.project) keep.set('projet', s.project); if (s.note) keep.set('note', s.note); }
  if (window.TALENTS_PREVIEW) keep.set('preview', '1');
  s.qs = keep.toString();
  return s;
};

TU.mailFor = function (sel, talents) {
  const names = talents.map(t => t.first + ' ' + t.last).join(', ');
  const subj = sel ? `${T('Projet', 'Project')} ${sel.client || 'Daké'} – casting ${names}` : `${T('Projet avec', 'Project with')} ${names}`;
  const body = sel ? T(`Bonjour,\n\nVotre proposition de production nous intéresse${sel.project ? ' (' + sel.project + ')' : ''}.\nCasting envisagé : ${names}\nPériode et livrables envisagés : \n\nMerci !`, `Hello,\n\nWe are interested in your production proposal${sel.project ? ' (' + sel.project + ')' : ''}.\nCasting in mind: ${names}\nTiming and deliverables in mind: \n\nThank you!`) : '';
  return `mailto:${SETTINGS.mail}?subject=${encodeURIComponent(subj)}${body ? '&body=' + encodeURIComponent(body) : ''}`;
};

// En aperçu, les liens internes gardent ?preview=1 pour rester sur le brouillon
if (window.TALENTS_PREVIEW) document.addEventListener('click', e => {
  const a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
  const u = new URL(a.href, location.href);
  if (u.origin === location.origin && /talents\//.test(u.pathname) && !u.searchParams.has('preview')) { u.searchParams.set('preview', '1'); a.href = u.toString(); }
}, true);
