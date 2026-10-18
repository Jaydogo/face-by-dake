/* =========================================================
   FACE BY DAKĒ — back office
   - Édite talents-data.js (fiches, sélections, réglages)
   - Photos redimensionnées dans le navigateur, gardées en brouillon (IndexedDB)
   - « Publier » = un seul commit GitHub (API Git Data) : données + médias + suppressions
   - Aperçu en direct : la vraie fiche du site, lue en mode ?preview=1
   ========================================================= */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clone = o => JSON.parse(JSON.stringify(o));
  const pad = n => String(n).padStart(2, '0');
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const slugify = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'talent';
  const fmtSize = b => b > 1e6 ? (b / 1e6).toFixed(1).replace('.', ',') + ' Mo' : Math.round(b / 1e3) + ' Ko';
  const KEY = { draft: 'dake-admin-draft', preview: 'dake-admin-preview', gh: 'dake-admin-gh', ui: 'dake-admin-ui' };
  const ls = {
    get(k, d = null) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  const CATS = [['mannequin', 'Mannequin'], ['comedien', 'Comédien·ne'], ['influence', 'Influence']];
  const AVAIL = [['disponible', 'Disponible'], ['option', 'En option'], ['indisponible', 'Indisponible']];
  const POLA_LABELS = ['Portrait', 'Face', 'Profil', '3/4', 'Pied face', 'Pied profil', 'Pied 3/4', 'Dos', 'Sourire', 'Mains', 'Pose', 'Assise', 'Assise pied'];
  const AGES = ['13–17', '18–24', '25–34', '35–44', '45+'];
  // Suggestions : ces mots sont traduits automatiquement sur la version anglaise (dictionnaire dans i18n.js)
  const EYES = ['Noisette', 'Marron', 'Marron foncé', 'Noir', 'Bleu', 'Bleu-vert', 'Vert', 'Gris', 'Gris-bleu', 'Gris-vert', 'Ambre', 'Vairons'];
  const HAIR = ['Châtain', 'Châtain clair', 'Châtain foncé', 'Brun', 'Noir', 'Blond', 'Blond foncé', 'Blond clair', 'Blond vénitien', 'Roux', 'Auburn', 'Poivre et sel', 'Blanc', 'Rasé', 'Bouclés', 'Frisés', 'Tresses', 'Locks'];
  const MAX = { polas: 1400, book: 1600, cover: 1600, poster: 1280 };
  const VIDEO_WARN = 25e6, VIDEO_MAX = 95e6;

  /* ---------- Fichiers en attente (IndexedDB) ---------- */
  const idb = {
    db: null,
    open() {
      if (this.db) return Promise.resolve(this.db);
      return new Promise((res, rej) => {
        const r = indexedDB.open('dake-admin', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('files');
        r.onsuccess = () => { this.db = r.result; res(this.db); };
        r.onerror = () => rej(r.error);
      });
    },
    async tx(mode, fn) { const db = await this.open(); return new Promise((res, rej) => { const t = db.transaction('files', mode); const st = t.objectStore('files'); const out = fn(st); t.oncomplete = () => res(out && out.result); t.onerror = () => rej(t.error); }); },
    put(k, v) { return this.tx('readwrite', s => s.put(v, k)); },
    del(k) { return this.tx('readwrite', s => s.delete(k)); },
    clear() { return this.tx('readwrite', s => s.clear()); },
    async all() {
      const db = await this.open();
      return new Promise((res, rej) => {
        const out = new Map(), t = db.transaction('files', 'readonly'), c = t.objectStore('files').openCursor();
        c.onsuccess = () => { const cur = c.result; if (cur) { out.set(cur.key, cur.value); cur.continue(); } };
        t.oncomplete = () => res(out); t.onerror = () => rej(t.error);
      });
    }
  };

  /* ---------- État ---------- */
  const blankData = () => ({ version: 1, updated: '', settings: {}, talents: [], selections: {} });
  // Mêmes valeurs par défaut des deux côtés, sinon le brouillon paraît toujours « modifié »
  const SITE = 'https://jaydogo.github.io/face-by-dake/talents/v1/';
  function normalize(d) {
    d = Object.assign(blankData(), d || {});
    d.settings = Object.assign({ mail: 'booking@dake.studio', instagram: 'dake.face', studio: 'https://dake.studio', studioSoon: '', phone: '', city: 'Paris, France', reach: "Castings en France et à l'international", siteUrl: SITE }, d.settings || {});
    d.selections = d.selections || {};
    let n = 0;   // brouillons locaux (sans accord) : pas de numéro, ils ne sont jamais publiés
    d.talents.forEach(t => { t.code = t.consent ? 't.' + String(++n).padStart(2, '0') : '—'; });
    return d;
  }
  let published = normalize(clone(window.TALENTS_DATA || blankData()));
  let db = clone(published);
  const pending = new Map();   // chemin → { blob, url }
  let removed = new Set();     // chemins du dépôt à supprimer à la publication
  let gateHash = null;         // nouveau code d'accès (empreinte) à publier
  const ui = Object.assign({ view: 'talents', slug: null, pane: 'profil', device: 'mobile', page: 'talent', q: '' }, ls.get(KEY.ui, {}));
  const gh = Object.assign({ owner: 'Jaydogo', repo: 'face-by-dake', branch: 'main', base: 'talents/', token: '' }, ls.get(KEY.gh, {}));

  const T = () => db.talents.find(t => t.slug === ui.slug) || null;
  const srcFor = p => !p ? '' : pending.has(p) ? pending.get(p).url : /^(blob:|data:|https?:)/.test(p) ? p : '../' + p;
  const isOwned = p => /^img\/[a-z0-9-]+\/web\//.test(p || '');   // fichiers gérés par le back office (supprimables)
  const refsOf = t => [t.cover, ...(t.polas || []).map(p => p[0]), ...(t.book || []), t.video && t.video.src, t.video && t.video.poster, ...(t.composite || [])].filter(Boolean);
  const referenced = (p, except) => db.talents.some(t => t !== except && refsOf(t).includes(p));
  /* Trois états d'une fiche :
     - brouillon local : accord droit à l'image non signé → reste dans ce navigateur, rien n'est envoyé sur GitHub
     - brouillon : accord signé mais pas encore en ligne → enregistré sur GitHub, invisible sur le site
     - en ligne : accord signé et mise en ligne */
  const isLocal = t => !t.consent;
  const isLive = t => !!t.consent && t.visible !== false;
  const stateOf = t => isLocal(t) ? 'local' : isLive(t) ? 'live' : 'draft';
  // Ce qui part sur GitHub : tout sauf les brouillons locaux
  function publicView(d) {
    const o = clone(d); let n = 0;
    o.talents = o.talents.filter(t => !isLocal(t));
    o.talents.forEach(t => { t.code = 't.' + pad(++n); });
    return o;
  }
  const publicFiles = () => new Set(db.talents.filter(t => !isLocal(t)).flatMap(refsOf));
  const dirty = () => { const u = publicFiles(); return [...pending.keys()].some(p => u.has(p)) || removed.size > 0 || !!gateHash || JSON.stringify(publicView(db).talents) !== JSON.stringify(published.talents) || JSON.stringify(Object.assign({}, publicView(db), { talents: 0 })) !== JSON.stringify(Object.assign({}, published, { talents: 0 })); };

  function newTalent(first = '', last = '') {
    return {
      slug: '', code: '', first, last, visible: false, consent: false, consentDate: '', availability: 'disponible', agency: '', languages: '', bio: '',
      cats: ['mannequin'], specs: [], city: 'Paris',
      fiche: { taille: '', poitrine: '', tailleT: '', hanches: '', pointure: '', yeux: '', cheveux: '' },
      cover: '', polas: [], polasNote: 'Pris au studio Daké', book: [], video: null, social: null, composite: null,
      sections: { polas: true, book: true, video: true, stats: true }
    };
  }
  function blankSocial() {
    const net = h => ({ handle: h, followers: 0, er: 0, likes: 0, views: 0, growth: 0, spark: Array(12).fill(0) });
    return { ig: net('@'), tt: net('@'), gender: [60, 38, 2], ages: AGES.map(a => [a, 0]), geo: [['Paris', 0]], brands: [] };
  }
  const uniqueSlug = (base, self) => { let s = slugify(base), n = 2; while (db.talents.some(t => t !== self && t.slug === s)) s = slugify(base) + '-' + n++; return s; };
  const renumber = () => { let n = 0; db.talents.forEach(t => { t.code = isLocal(t) ? '—' : 't.' + pad(++n); }); };

  /* ---------- Brouillon + aperçu ---------- */
  let saveTimer = 0;
  function persist() {
    renumber();
    ls.set(KEY.draft, { db, removed: [...removed], gateHash, base: published.updated || '', at: new Date().toISOString() });
    clearTimeout(saveTimer); saveTimer = setTimeout(pushPreview, 350);
    syncStatus();
  }
  function previewData() {
    const d = clone(db);
    const map = p => pending.has(p) ? pending.get(p).url : p;
    d.talents.forEach(t => {
      t.cover = map(t.cover);
      t.polas = (t.polas || []).map(p => [map(p[0]), p[1]]);
      t.book = (t.book || []).map(map);
      if (t.video) { t.video.src = map(t.video.src); t.video.poster = map(t.video.poster); }
      if (t.composite) t.composite = t.composite.map(map);
    });
    return d;
  }
  function pushPreview() {
    ls.set(KEY.preview, previewData());
    const f = $('#pv-frame'); if (!f || !f.contentWindow) return;
    let y = 0; try { y = f.contentWindow.scrollY; } catch (e) {}
    f.onload = () => { try { const w = f.contentWindow; setTimeout(() => { w.lenis ? w.lenis.scrollTo(y, { immediate: true }) : w.scrollTo(0, y); }, 60); } catch (e) {} };
    try { f.contentWindow.location.reload(); } catch (e) { f.src = f.src; }
  }
  function syncStatus() {
    const d = dirty(), st = $('#status');
    st.className = 'status' + (d ? ' is-dirty' : '');
    const n = pending.size;
    const loc = db.talents.filter(isLocal).length, locTxt = loc ? ` · ${loc} brouillon${loc > 1 ? 's' : ''} dans ce navigateur` : '';
    st.textContent = (d ? 'Modifications non publiées' : (published.updated ? 'À jour · publié le ' + new Date(published.updated).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'À jour')) + locTxt;
    $('#discard').hidden = !d;
    $('#publish').disabled = !d;
  }
  let toastT = 0;
  function toast(msg, err) { const t = $('#toast'); t.textContent = msg; t.classList.toggle('is-err', !!err); t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 3200); }

  /* ---------- Modale ---------- */
  function modal(html, onSubmit) {
    const d = $('#modal'), box = $('#modal-box');
    box.innerHTML = html;
    return new Promise(res => {
      box.onsubmit = e => {
        const v = e.submitter && e.submitter.value;
        if (v === 'ok' && onSubmit) { const r = onSubmit(box); if (r === false) { e.preventDefault(); return; } }
        res(v === 'ok' ? box : null);
      };
      d.onclose = () => res(null);
      d.showModal();
      setTimeout(() => box.querySelector('input')?.focus(), 30);
    });
  }
  const confirmBox = (title, text, okLabel = 'Confirmer', danger) => modal(`<h3>${title}</h3><p>${text}</p><div class="acts"><button class="btn btn--ghost" value="cancel">Annuler</button><button class="btn ${danger ? 'btn--danger' : ''}" value="ok">${okLabel}</button></div>`);

  /* ---------- Médias : images ---------- */
  async function decode(file) {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) {}
    return new Promise((res, rej) => { const u = URL.createObjectURL(file), i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('format')); i.src = u; });
  }
  async function processImage(file, max) {
    const img = await decode(file);
    const w = img.width || img.naturalWidth, h = img.height || img.naturalHeight, r = Math.min(1, max / Math.max(w, h));
    const c = document.createElement('canvas'); c.width = Math.round(w * r); c.height = Math.round(h * r);
    const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, c.width, c.height);
    return new Promise(res => c.toBlob(res, 'image/jpeg', 0.82));
  }
  async function addPending(path, blob) {
    pending.set(path, { blob, url: URL.createObjectURL(blob) });
    removed.delete(path);
    await idb.put(path, blob);
  }
  function dropPath(p, owner) {
    if (!p || referenced(p, owner)) return;
    if (pending.has(p)) { URL.revokeObjectURL(pending.get(p).url); pending.delete(p); idb.del(p); }
    else if (isOwned(p)) removed.add(p);
  }
  async function uploadImages(files, kind, onEach) {
    const t = T(); const out = [];
    const list = [...files].filter(f => /^image\//.test(f.type) || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name));
    for (const [i, f] of list.entries()) {
      try {
        const blob = await processImage(f, MAX[kind] || 1600);
        const path = `img/${t.slug}/web/${kind}-${uid()}.jpg`;
        await addPending(path, blob); out.push(path);
      } catch (e) { toast(`« ${f.name} » n'a pas pu être lu${/heic|heif/i.test(f.name) ? ' (HEIC : ouvre le back office dans Safari, ou exporte en JPG)' : ''}`, true); }
      onEach && onEach(i + 1, list.length);
    }
    return out;
  }

  /* ---------- Médias : vidéo ---------- */
  const fmtLen = s => { s = Math.round(s || 0); return Math.floor(s / 60) + ':' + pad(s % 60); };
  function loadVideo(url) {
    return new Promise((res, rej) => { const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url; v.onloadeddata = () => res(v); v.onerror = () => rej(new Error('video')); });
  }
  async function grabPoster(url, at) {
    const v = await loadVideo(url);
    await new Promise(r => { v.onseeked = r; v.currentTime = Math.min(at, Math.max(0, v.duration - 0.1)); });
    const r = Math.min(1, MAX.poster / v.videoWidth), c = document.createElement('canvas');
    c.width = Math.round(v.videoWidth * r); c.height = Math.round(v.videoHeight * r);
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
    return { blob: await new Promise(r2 => c.toBlob(r2, 'image/jpeg', 0.82)), duration: v.duration };
  }

  /* =========================================================
     RENDU
     ========================================================= */
  function render() {
    $$('.tabs button').forEach(b => b.toggleAttribute('aria-current', b.dataset.view === ui.view));
    const v = $('#views');
    if (ui.view === 'talents') v.innerHTML = viewTalents();
    if (ui.view === 'prospection') v.innerHTML = viewProspection();
    if (ui.view === 'settings') v.innerHTML = viewSettings();
    ls.set(KEY.ui, { view: ui.view, slug: ui.slug, pane: ui.pane, device: ui.device, page: ui.page });
    if (ui.view === 'talents') { bindList(); bindThumbs(); setPreviewSrc(); }
    syncStatus();
  }

  /* ---------- Vue Talents ---------- */
  function talentWarnings(t) {
    const a = [];
    if (!t.first) a.push(['error', 'Le prénom est obligatoire.']);
    if (!t.consent) a.push(['error', "<b>Accord droit à l'image</b> non coché : la fiche reste un <b>brouillon dans ce navigateur</b>. Ni ses infos ni ses photos ne sont envoyées sur GitHub."]);
    else if (t.visible === false) a.push(['info', '<b>Brouillon</b> : enregistré à la publication, visible seulement dans l\'aperçu. Clique « Mettre en ligne » quand la fiche est prête.']);
    if (!t.cover) a.push(['warn', 'Pas de photo de couverture.']);
    if ((t.polas || []).length < 4) a.push(['warn', `${(t.polas || []).length} polas : 4 minimum conseillés (face, profil, pied, 3/4).`]);
    if (!(t.book || []).length) a.push(['warn', 'Le book est vide.']);
    const f = t.fiche || {};
    if (!f.taille || !f.pointure) a.push(['warn', 'Mensurations incomplètes (taille, pointure…).']);
    if ((t.cats || []).includes('influence') && !(t.social && t.social.ig && +t.social.ig.followers)) a.push(['warn', 'Catégorie Influence sans stats renseignées.']);
    if (t.video && t.video.src && pending.has(t.video.src) && pending.get(t.video.src).blob.size > VIDEO_WARN) a.push(['warn', 'Vidéo lourde : la page sera plus lente à charger.']);
    // Version anglaise : mots saisis que le dictionnaire ne connaît pas (ils resteront en français)
    if (window.TR_MISSING) {
      const miss = [...new Set([f.yeux, f.cheveux, t.languages, ...(t.specs || []), ...(t.polas || []).map(p => p[1])].flatMap(v => TR_MISSING(v)))];
      if (miss.length) a.push(['info', `Version anglaise : pas de traduction pour <b>${miss.map(esc).join('</b>, <b>')}</b>, affiché en français. Utilise un mot proposé dans la liste, ou écris-le en anglais.`]);
    }
    return a;
  }
  function viewTalents() {
    if (!ui.slug || !T()) ui.slug = db.talents[0] ? db.talents[0].slug : null;
    const t = T();
    const items = db.talents.filter(x => !ui.q || (x.first + ' ' + x.last).toLowerCase().includes(ui.q.toLowerCase()));
    const list = `<aside class="list">
      <div class="list-head"><input class="input" id="q" placeholder="Rechercher" value="${esc(ui.q)}"><button class="btn btn--s" type="button" data-a="add">+ Talent</button></div>
      <div class="list-items" id="list-items">${[['Brouillons', items.filter(x => !isLive(x))], ['En ligne', items.filter(isLive)]].filter(g => g[1].length).map(([g, arr]) => `<p class="list-group"><span>${g}</span><span class="num">${arr.length}</span></p>` + arr.map(x => {
        const w = talentWarnings(x), state = !isLive(x) ? 'dot--off' : w.some(z => z[0] === 'warn') ? 'dot--warn' : '';
        return `<button class="li${x.slug === ui.slug ? ' is-on' : ''}" type="button" data-a="pick" data-slug="${esc(x.slug)}" draggable="true">
          <span class="grip" aria-hidden="true">⋮⋮</span>
          ${x.cover ? `<img src="${esc(srcFor(x.cover))}" alt="" loading="lazy">` : '<span class="ph"></span>'}
          <span><span class="nm">${esc(x.first) || 'Sans nom'} <em>${esc(x.last)}</em></span><span class="sub">${isLocal(x) ? 'Dans ce navigateur' : esc(x.code)} · ${esc((x.cats || []).map(c => (CATS.find(k => k[0] === c) || [, c])[1]).join(', '))}</span></span>
          <span class="dot ${state}" title="${isLocal(x) ? 'Brouillon dans ce navigateur (accord non signé)' : !isLive(x) ? 'Brouillon' : state ? 'En ligne · à compléter' : 'En ligne'}"></span>
        </button>`; }).join('')).join('') || '<p class="muted" style="padding:12px">Aucun talent.</p>'}</div>
      <div class="list-foot">${db.talents.filter(isLive).length} en ligne · ${db.talents.filter(x => !isLive(x)).length} brouillon${db.talents.filter(x => !isLive(x)).length > 1 ? 's' : ''} · glisse pour réordonner</div>
    </aside>`;
    if (!t) return `<div class="studio no-preview">${list}<section class="editor"><div class="empty"><div><p class="serif">Aucun talent</p><p>Crée la première fiche.</p><button class="btn" data-a="add" type="button">+ Ajouter un talent</button></div></div></section></div>`;
    const w = talentWarnings(t);
    const panes = [['profil', 'Profil'], ['fiche', 'Mensurations'], ['polas', 'Polas', (t.polas || []).length], ['book', 'Book', (t.book || []).length], ['video', 'Vidéo'], ['stats', 'Stats'], ['carte', 'Carte composite'], ['publication', 'Publication']];
    const pubWarn = w.some(z => z[0] === 'error');
    return `<div class="studio${ui.showPv ? ' show-preview' : ''}" id="studio">${list}
      <section class="editor" id="editor">
        <div class="ed-head">
          <div class="ed-title">
            <h2>${esc(t.first) || 'Sans nom'} <em>${esc(t.last)}</em></h2>
            <div class="acts">
              <button class="btn btn--ghost btn--s only-mobile" type="button" data-a="pv-toggle">Aperçu</button>
              <a class="btn btn--ghost btn--s" href="../v1/talent.html?t=${encodeURIComponent(t.slug)}&preview=1" target="_blank" rel="noopener">Ouvrir l'aperçu</a>
              <button class="btn btn--ghost btn--s" type="button" data-a="dup">Dupliquer</button>
              <button class="btn btn--danger btn--s" type="button" data-a="del">Supprimer</button>
            </div>
          </div>
          <nav class="subtabs">${panes.map(([k, l, n]) => `<button type="button" data-pane="${k}"${ui.pane === k ? ' aria-current="true"' : ''}${k === 'publication' && pubWarn ? ' class="warn"' : ''}>${l}${n !== undefined ? `<span class="count">${n}</span>` : ''}${k === 'publication' && pubWarn ? ' ●' : ''}</button>`).join('')}</nav>
        </div>
        <div class="ed-body" id="ed-body">${pane(t, w)}</div>
      </section>
      <aside class="preview" id="preview">
        <div class="pv-head">
          <div class="seg"><button type="button" data-pv-page="talent" aria-pressed="${ui.page === 'talent'}">Fiche</button><button type="button" data-pv-page="home" aria-pressed="${ui.page === 'home'}">Home</button></div>
          <div class="seg"><button type="button" data-pv-dev="mobile" aria-pressed="${ui.device === 'mobile'}">Mobile</button><button type="button" data-pv-dev="desktop" aria-pressed="${ui.device === 'desktop'}">Ordinateur</button></div>
          <span class="sp"></span>
          <button class="icon-btn" type="button" data-a="pv-reload" title="Recharger l'aperçu">↻</button>
          <button class="icon-btn only-mobile" type="button" data-a="pv-toggle" title="Fermer">×</button>
        </div>
        <div class="pv-stage${ui.device === 'mobile' ? ' is-mobile' : ''}"><iframe id="pv-frame" title="Aperçu"></iframe></div>
      </aside>
    </div>`;
  }
  function setPreviewSrc() {
    const f = $('#pv-frame'), t = T(); if (!f) return;
    ls.set(KEY.preview, previewData());
    f.src = ui.page === 'home' ? '../v1/?preview=1' : `../v1/talent.html?t=${encodeURIComponent(t ? t.slug : '')}&preview=1`;
  }

  const field = (label, path, v, o = {}) => `<label class="field${o.cls ? ' ' + o.cls : ''}"><span>${label}${o.hint ? ` <small>${o.hint}</small>` : ''}</span>${o.unit ? '<span class="with-unit">' : ''}${o.area ? `<textarea class="input" data-bind="${path}"${o.ph ? ` placeholder="${esc(o.ph)}"` : ''} maxlength="${o.max || 600}">${esc(v)}</textarea>` : `<input class="input${o.mono ? ' mono' : ''}" data-bind="${path}" value="${esc(v)}"${o.num ? ' inputmode="decimal" data-num="1"' : ''}${o.ph ? ` placeholder="${esc(o.ph)}"` : ''}${o.type ? ` type="${o.type}"` : ''}${o.list ? ` list="${o.list}"` : ''}>`}${o.unit ? `<i>${o.unit}</i></span>` : ''}</label>`;
  const sw = (label, sub, path, on) => `<label class="switch"><input type="checkbox" data-bind="${path}" data-bool="1"${on ? ' checked' : ''}><span><b>${label}</b>${sub ? `<small>${sub}</small>` : ''}</span></label>`;
  const tagsBox = (path, arr, ph) => `<div class="tags" data-tags="${path}">${(arr || []).map((x, i) => `<span>${esc(x)}<button type="button" data-a="tag-del" data-i="${i}" aria-label="Retirer">×</button></span>`).join('')}<input placeholder="${esc(ph)}" data-tag-in="${path}"></div>`;
  const alerts = w => w.length ? `<div class="alerts">${w.map(([k, m]) => `<div class="alert alert--${k}"><span>${m}</span></div>`).join('')}</div>` : '';

  function pane(t, w) {
    const f = t.fiche || {};
    if (ui.pane === 'profil') return `
      ${alerts(w.filter(x => x[0] === 'error'))}
      <div class="section"><h3>Identité</h3><div class="grid2">
        ${field('Prénom', 'first', t.first)}${field('Nom', 'last', t.last)}
        ${field('Ville', 'city', t.city, { ph: 'Paris' })}${field('Agence', 'agency', t.agency, { hint: 'si représenté·e', ph: 'Indépendant·e' })}
        ${field('Langues', 'languages', t.languages, { ph: 'Français, anglais (courant)' })}
        <label class="field"><span>Disponibilité</span><select class="input" data-bind="availability">${AVAIL.map(([k, l]) => `<option value="${k}"${t.availability === k ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
        ${field('Bio courte', 'bio', t.bio, { area: 1, cls: 'span-all', hint: 'facultatif, 2–3 lignes', max: 320 })}
        ${field('Bio courte · anglais', 'bio_en', t.bio_en || '', { area: 1, cls: 'span-all', hint: 'facultatif · vide = le français s\'affiche sur la version EN', max: 320, ph: 'Short bio in English' })}
      </div></div>
      <div class="section"><h3>Catégories</h3>
        <div class="chips">${CATS.map(([k, l]) => `<button type="button" class="chip" data-a="cat" data-k="${k}" aria-pressed="${(t.cats || []).includes(k)}">${l}</button>`).join('')}</div>
        <p class="hint" style="margin:14px 0 6px">Spécialités (Entrée pour ajouter)</p>${tagsBox('specs', t.specs, 'Publicité, Commercial, Défilé…')}
      </div>
      <div class="section"><h3>Couverture <span class="muted" style="text-transform:none;letter-spacing:0">clique une photo pour la choisir</span></h3>
        ${coverPicker(t)}
      </div>
      <div class="section"><h3>Lien de la fiche</h3><div class="grid2">
        ${field('Identifiant', 'slug', t.slug, { mono: 1, hint: 'dans l\'adresse : ?t=…' })}
        <div class="field"><span>Adresse publique</span><div class="out"><code>${esc(db.settings.siteUrl)}talent.html?t=${esc(t.slug)}</code><button class="btn btn--ghost btn--s" type="button" data-a="copy" data-v="${esc(db.settings.siteUrl)}talent.html?t=${esc(t.slug)}">Copier</button><button class="btn btn--ghost btn--s" type="button" data-a="copy" data-v="${esc(db.settings.siteUrl)}talent.html?t=${esc(t.slug)}&amp;lang=en" title="Lien qui ouvre la fiche en anglais">Copier (EN)</button></div></div>
      </div><p class="hint">Changer l'identifiant casse les liens déjà envoyés.</p></div>`;
    if (ui.pane === 'fiche') return `
      <div class="section"><h3>Mensurations</h3><div class="grid4">
        ${field('Taille', 'fiche.taille', f.taille, { num: 1, unit: 'cm' })}${field('Poitrine', 'fiche.poitrine', f.poitrine, { num: 1, unit: 'cm' })}
        ${field('Tour de taille', 'fiche.tailleT', f.tailleT, { num: 1, unit: 'cm' })}${field('Hanches', 'fiche.hanches', f.hanches, { num: 1, unit: 'cm' })}
        ${field('Pointure', 'fiche.pointure', f.pointure, { num: 1, unit: 'EU' })}${field('Yeux', 'fiche.yeux', f.yeux, { ph: 'Noisette', list: 'dl-yeux' })}
        ${field('Cheveux', 'fiche.cheveux', f.cheveux, { ph: 'Châtain', cls: 'span2', list: 'dl-cheveux' })}
        <label class="field span2"><span>Tailles US calculées pour <small>pointure US</small></span><select class="input" data-bind="fiche.genre">${[['', 'Non précisé (femme et homme)'], ['f', 'Femme'], ['h', 'Homme']].map(([k, l]) => `<option value="${k}"${(f.genre || '') === k ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
      </div>
      <datalist id="dl-yeux">${EYES.map(l => `<option value="${l}">`).join('')}</datalist><datalist id="dl-cheveux">${HAIR.map(l => `<option value="${l}">`).join('')}</datalist>
      <p class="hint" style="margin-top:12px">Un champ vide n'apparaît pas sur la fiche. Saisis en cm et en pointure EU : le visiteur peut basculer en pouces / tailles US sur la fiche.</p></div>`;
    if (ui.pane === 'polas') return `
      <div class="section"><h3>Polas / digitals <span class="muted" style="text-transform:none;letter-spacing:0">glisse pour réordonner</span></h3>
        <div class="grid2">${field('Titre du bloc', 'polasTitle', t.polasTitle || '', { ph: 'Au *naturel.*', hint: '*mot* = italique' })}${field('Sous-titre', 'polasNote', t.polasNote, { ph: 'Pris au studio Daké' })}
          ${field('Titre · anglais', 'polasTitle_en', t.polasTitle_en || '', { ph: 'Au *naturel.*', hint: 'facultatif' })}${field('Sous-titre · anglais', 'polasNote_en', t.polasNote_en || '', { ph: 'Shot at the Daké studio', hint: 'facultatif' })}</div>
        <label class="drop" style="margin-top:14px" data-drop="polas"><input type="file" accept="image/*" multiple data-up="polas"><b>Ajouter des polas</b><span class="hint">Glisse tes photos ici ou clique · JPG, PNG, HEIC · redimensionnées automatiquement (1400 px)</span><div class="progress" hidden><i></i></div></label>
        <datalist id="pola-labels">${POLA_LABELS.map(l => `<option value="${l}">`).join('')}</datalist>
        <div class="thumbs" data-list="polas">${(t.polas || []).map((p, i) => thumb(t, p[0], i, 'polas', p[1])).join('')}</div>
      </div>`;
    if (ui.pane === 'book') return `
      <div class="section"><h3>Book <span class="muted" style="text-transform:none;letter-spacing:0">glisse pour réordonner · la mise en page s'adapte</span></h3>
        <label class="drop" data-drop="book"><input type="file" accept="image/*" multiple data-up="book"><b>Ajouter des photos</b><span class="hint">Redimensionnées automatiquement (1600 px)</span><div class="progress" hidden><i></i></div></label>
        <div class="thumbs" data-list="book">${(t.book || []).map((b, i) => thumb(t, b, i, 'book')).join('')}</div>
      </div>`;
    if (ui.pane === 'video') {
      const v = t.video;
      return `<div class="section"><h3>Vidéo</h3>
        ${v && v.src ? `<div class="video-box">
            <video src="${esc(srcFor(v.src))}" controls playsinline preload="metadata" id="ed-video"></video>
            <div class="field"><span>Image d'aperçu</span><div class="poster">${v.poster ? `<img src="${esc(srcFor(v.poster))}" alt="">` : ''}</div>
              <button class="btn btn--ghost btn--s" type="button" data-a="poster">Prendre l'image affichée</button>
              <label class="link" style="cursor:pointer">ou importer une image<input type="file" accept="image/*" data-up="poster" hidden></label></div>
          </div>
          <div class="grid3" style="margin-top:16px">
            ${field('Titre', 'video.title', v.title, { ph: 'Bande démo, scène dramatique', cls: 'span2' })}${field('Durée', 'video.len', v.len, { ph: '0:30', mono: 1 })}
            ${field('Crédit', 'video.credit', v.credit || '', { ph: 'Réalisée par Daké', cls: 'span2' })}<span></span>
            ${field('Titre · anglais', 'video.title_en', v.title_en || '', { ph: 'Showreel, dramatic scene', cls: 'span2', hint: 'facultatif' })}<span></span>
            ${field('Crédit · anglais', 'video.credit_en', v.credit_en || '', { ph: 'Directed by Daké', cls: 'span2', hint: 'facultatif' })}
          </div>
          <div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap"><label class="btn btn--ghost btn--s">Remplacer la vidéo<input type="file" accept="video/mp4,video/quicktime,video/*" data-up="video" hidden></label><button class="btn btn--danger btn--s" type="button" data-a="video-del">Retirer la vidéo</button></div>`
        : `<label class="drop" data-drop="video"><input type="file" accept="video/mp4,video/quicktime,video/*" data-up="video"><b>Ajouter une vidéo</b><span class="hint">MP4 (H.264) conseillé · 25 Mo max conseillé, 95 Mo maximum · l'aperçu et la durée sont faits automatiquement</span><div class="progress" hidden><i></i></div></label>`}
        <p class="hint" style="margin-top:14px">Les .MOV de l'iPhone ne se lisent pas partout (Chrome, Android). Exporte en MP4 si possible.</p>
      </div>`;
    }
    if (ui.pane === 'stats') {
      const s = t.social;
      if (!s) return `<div class="section"><h3>Stats & engagement</h3><div class="empty" style="height:auto;padding:30px 0"><div><p>Pas de stats pour ce talent.</p><button class="btn" type="button" data-a="stats-on">Ajouter les stats Instagram / TikTok</button></div></div></div>`;
      const net = (k, name) => `<div class="section"><h3>${name}</h3><div class="grid3">
        ${field('Compte', `social.${k}.handle`, s[k].handle, { ph: '@compte', mono: 1 })}${field('Abonnés', `social.${k}.followers`, s[k].followers, { num: 1 })}${field('Engagement', `social.${k}.er`, s[k].er, { num: 1, unit: '%' })}
        ${field('Vues moy. / post', `social.${k}.views`, s[k].views, { num: 1 })}${field('Likes moy.', `social.${k}.likes`, s[k].likes, { num: 1 })}${field('Croissance 30 j', `social.${k}.growth`, s[k].growth, { num: 1, unit: '%' })}
        <div class="field span-all"><span>Abonnés sur 12 mois <small>du plus ancien au plus récent · <button type="button" class="link" data-a="spark-gen" data-k="${k}">générer à partir des abonnés et de la croissance</button></small></span>
          <div class="spark-in">${(s[k].spark || []).map((v, i) => `<input class="input" data-bind="social.${k}.spark.${i}" data-num="1" value="${esc(v)}">`).join('')}</div></div>
      </div></div>`;
      const g = s.gender || [0, 0, 0];
      return `<div class="mini-preview"><span>Audience cumulée <b>${tk(+s.ig.followers + +s.tt.followers)}</b></span><span>Engagement moyen <b>${erAvg(s)}</b></span></div><br>
        ${net('ig', 'Instagram')}${net('tt', 'TikTok')}
        <div class="section"><h3>Audience</h3><div class="grid3">
          ${field('Femmes', 'social.gender.0', g[0], { num: 1, unit: '%' })}${field('Hommes', 'social.gender.1', g[1], { num: 1, unit: '%' })}
          <div class="field"><span>Autre</span><input class="input" value="${Math.max(0, 100 - (+g[0] || 0) - (+g[1] || 0))} %" disabled></div>
        </div>
        <div class="grid2" style="margin-top:18px">
          <div class="field"><span>Âge (%)</span><div class="rows">${(s.ages || []).map((a, i) => `<div class="r"><input class="input" value="${esc(a[0])}" data-bind="social.ages.${i}.0"><input class="input" data-bind="social.ages.${i}.1" data-num="1" value="${esc(a[1])}"><span class="muted">%</span></div>`).join('')}</div></div>
          <div class="field"><span>Top villes (%)</span><div class="rows">${(s.geo || []).map((a, i) => `<div class="r"><input class="input" value="${esc(a[0])}" data-bind="social.geo.${i}.0" placeholder="Ville"><input class="input" data-bind="social.geo.${i}.1" data-num="1" value="${esc(a[1])}"><button class="icon-btn" type="button" data-a="geo-del" data-i="${i}" aria-label="Retirer">×</button></div>`).join('')}</div>
            ${(s.geo || []).length < 6 ? '<button class="link" type="button" data-a="geo-add" style="justify-self:start">+ Ajouter une ville</button>' : ''}</div>
        </div></div>
        <div class="section"><h3>Marques déjà travaillées</h3>${tagsBox('social.brands', s.brands, 'Ajoute une marque puis Entrée')}</div>
        <button class="btn btn--danger btn--s" type="button" data-a="stats-off">Retirer les stats</button>`;
    }
    if (ui.pane === 'carte') {
      const imgs = [...(t.polas || []).map(p => p[0]), ...(t.book || [])].filter((x, i, a) => x && x !== t.cover && a.indexOf(x) === i);
      const picks = t.composite || [];
      return `<div class="section"><h3>Carte composite</h3>
        <div class="alert alert--info" style="margin-bottom:14px">La carte (PDF sur ordinateur, image sur mobile) montre la couverture + 4 photos. Laisse en <b>automatique</b> (pied, profil, 3/4, assise + une photo du book) ou choisis tes 4 photos dans l'ordre.</div>
        <div class="chips" style="margin-bottom:16px"><button type="button" class="chip" data-a="comp-auto" aria-pressed="${!t.composite}">Automatique</button><button type="button" class="chip" data-a="comp-custom" aria-pressed="${!!t.composite}">Je choisis</button></div>
        ${t.composite ? `<p class="hint">${picks.length}/4 sélectionnées · clique pour ajouter ou retirer</p><div class="thumbs">${imgs.map(p => { const k = picks.indexOf(p); return `<button type="button" class="thumb${k >= 0 ? ' is-pick' : ''}" data-a="comp-pick" data-p="${esc(p)}" style="cursor:pointer"><div class="img"><img src="${esc(srcFor(p))}" alt="" loading="lazy"></div>${k >= 0 ? `<span class="pick-n">${k + 1}</span>` : ''}</button>`; }).join('')}</div>` : ''}
      </div>`;
    }
    if (ui.pane === 'publication') return `
      ${alerts(w)}
      <div class="section"><h3>Statut</h3>
        <div class="state state--${stateOf(t)}">
          <span class="state-badge">${{ local: 'Brouillon · ce navigateur', draft: 'Brouillon', live: 'En ligne' }[stateOf(t)]}</span>
          <p>${{ local: "Gardé uniquement dans ce navigateur tant que l'accord droit à l'image n'est pas signé. Rien n'est envoyé sur GitHub, même en cliquant Publier.", draft: "Enregistré sur GitHub à chaque publication, retrouvable sur tous tes appareils, mais invisible sur le site.", live: 'Visible sur le site après publication.' }[stateOf(t)]}</p>
          ${isLive(t) ? '<button class="btn btn--ghost btn--s" type="button" data-a="to-draft">Repasser en brouillon</button>' : `<button class="btn btn--s" type="button" data-a="go-live"${t.consent ? '' : ' disabled'}>Mettre en ligne</button>${t.consent ? '' : '<small class="hint">Coche d\'abord l\'accord droit à l\'image</small>'}`}
        </div>
        <div class="switches" style="margin-top:14px">
        ${sw("Accord droit à l'image signé", 'Obligatoire pour enregistrer la fiche sur GitHub et la mettre en ligne', 'consent', !!t.consent)}
      </div>
      <div class="grid2" style="margin-top:12px">${field("Date de l'accord", 'consentDate', t.consentDate || '', { type: 'date' })}</div></div>
      <div class="section"><h3>Blocs affichés sur la fiche</h3><div class="switches">
        ${sw('Polas', `${(t.polas || []).length} photos`, 'sections.polas', !t.sections || t.sections.polas !== false)}
        ${sw('Book', `${(t.book || []).length} photos`, 'sections.book', !t.sections || t.sections.book !== false)}
        ${sw('Vidéo', t.video && t.video.src ? 'vidéo ajoutée' : 'aucune vidéo', 'sections.video', !t.sections || t.sections.video !== false)}
        ${sw('Stats & engagement', t.social ? 'stats renseignées' : 'aucune stat', 'sections.stats', !t.sections || t.sections.stats !== false)}
      </div><p class="hint" style="margin-top:10px">Un bloc vide est masqué automatiquement.</p></div>
      <div class="section"><h3>Ordre des blocs sur la fiche</h3>
        <div class="order"><div class="o is-fixed"><span class="mono">01</span><b>Polas</b><span class="hint">toujours en premier</span></div>
        ${orderOf(t).map((k, i, a) => `<div class="o"><span class="mono">${pad(i + 2)}</span><b>${({ book: 'Book', video: 'Vidéo', stats: 'Stats & engagement' })[k]}</b><button class="icon-btn" type="button" data-a="order" data-k="${k}" data-d="-1" ${i === 0 ? 'disabled' : ''} aria-label="Monter">↑</button><button class="icon-btn" type="button" data-a="order" data-k="${k}" data-d="1" ${i === a.length - 1 ? 'disabled' : ''} aria-label="Descendre">↓</button></div>`).join('')}</div>
        <p class="hint" style="margin-top:10px">Les blocs vides ou désactivés sont sautés automatiquement.</p></div>
      <div class="section"><h3>Ordre dans la liste</h3><div style="display:flex;gap:8px"><button class="btn btn--ghost btn--s" type="button" data-a="move" data-d="-1">↑ Monter</button><button class="btn btn--ghost btn--s" type="button" data-a="move" data-d="1">↓ Descendre</button><span class="hint" style="align-self:center">Position ${db.talents.indexOf(t) + 1} / ${db.talents.length} · code ${esc(t.code)}</span></div></div>`;
    return '';
  }
  const tk = n => { n = +n || 0; return n >= 1e6 ? (n / 1e6).toFixed(1).replace('.', ',') + ' M' : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e5 ? 0 : 1).replace('.', ',').replace(',0', '') + ' k' : String(n); };
  const erAvg = s => { const a = +s.ig.followers || 0, b = +s.tt.followers || 0; return a + b ? (((+s.ig.er || 0) * a + (+s.tt.er || 0) * b) / (a + b)).toFixed(1).replace('.', ',') + ' %' : '—'; };

  const orderOf = t => [...(t.order || []).filter(k => ['book', 'video', 'stats'].includes(k)), ...['book', 'video', 'stats'].filter(k => !(t.order || []).includes(k))];
  function coverPicker(t) {
    const imgs = [t.cover, ...(t.polas || []).map(p => p[0]), ...(t.book || [])].filter((x, i, a) => x && a.indexOf(x) === i);
    return `<div class="thumbs">${imgs.map(p => `<button type="button" class="thumb${p === t.cover ? ' is-pick' : ''}" data-a="cover" data-p="${esc(p)}" style="cursor:pointer"><div class="img"><img src="${esc(srcFor(p))}" alt="" loading="lazy"></div>${p === t.cover ? '<span class="badge">Couverture</span>' : ''}</button>`).join('')}
      <label class="thumb drop" style="cursor:pointer;min-height:120px"><input type="file" accept="image/*" data-up="cover"><b>Importer</b><span class="hint">une autre photo</span></label></div>`;
  }
  function thumb(t, p, i, kind, label) {
    return `<div class="thumb${pending.has(p) ? ' is-pending' : ''}" draggable="true" data-i="${i}" data-kind="${kind}">
      <div class="img"><img src="${esc(srcFor(p))}" alt="" loading="lazy"></div>
      <span class="n">${pad(i + 1)}</span>
      ${p === t.cover ? '<span class="badge">Couverture</span>' : ''}
      <div class="tools"><button class="icon-btn" type="button" data-a="as-cover" data-i="${i}" data-kind="${kind}" title="Mettre en couverture">★</button><button class="icon-btn" type="button" data-a="img-del" data-i="${i}" data-kind="${kind}" title="Supprimer">×</button></div>
      ${kind === 'polas' ? `<div class="cap"><input list="pola-labels" value="${esc(label)}" data-bind="polas.${i}.1" placeholder="Légende"></div>` : ''}
    </div>`;
  }

  /* ---------- Vue Prospection ---------- */
  function pitchFor(sel) {
    const names = (sel.ids || []).map(id => db.talents.find(t => t.slug === id)).filter(Boolean);
    const n = names.length, url = selUrl(sel);
    return n ? `Bonjour,\n\nJe suis Jay, directeur créatif de Daké (Longines, Tissot, Marie Claire). ${sel.project ? `En pensant à ${sel.project}` : 'En pensant à vos prochaines campagnes'}, j'ai réuni ${n === 1 ? 'un profil' : n + ' profils'} que nous avons photographiés au studio${sel.client ? `, choisis pour ${sel.client}` : ''} :\n\n${url}\n\nPolas, book, vidéo et audience Instagram / TikTok sur chaque fiche. Nous pouvons prendre en charge le casting et la production.\n\nUn appel de 15 minutes cette semaine ?\n\nJay` : '';
  }
  const selUrl = sel => `${db.settings.siteUrl}?sel=${encodeURIComponent(sel.key)}`;
  function viewProspection() {
    const sels = Object.entries(db.selections || {}).map(([key, s]) => Object.assign({ key }, s));
    const pub = published.selections || {};
    return `<div class="page">
      <h1>Pro<em>spection</em></h1>
      <p class="lead">Une sélection = une page privée pour une marque, avec les profils choisis pour elle, son nom en titre et un bouton « Poser une option ». Le lien fonctionne une fois la sélection <b>publiée</b>.</p>
      <div style="margin-bottom:18px"><button class="btn" type="button" data-a="sel-add">+ Nouvelle sélection</button></div>
      <div class="cards">${sels.length ? sels.map(s => {
        const live = !!pub[s.key] && JSON.stringify(pub[s.key]) === JSON.stringify(db.selections[s.key]);
        return `<article class="card" data-sel="${esc(s.key)}">
          <div class="card-head"><h3>${esc(s.client || 'Sans nom')} <em>${esc(s.project || '')}</em></h3><span class="mono ${live ? '' : 'muted'}">${live ? '● En ligne' : '○ À publier'}</span></div>
          <div class="grid2">
            <label class="field"><span>Prospect</span><input class="input" data-sbind="client" value="${esc(s.client)}" placeholder="Sézane"></label>
            <label class="field"><span>Projet</span><input class="input" data-sbind="project" value="${esc(s.project)}" placeholder="Campagne printemps-été 2027"></label>
            <label class="field span-all"><span>Mot d'intro <small>affiché sous le titre</small></span><textarea class="input" data-sbind="note" placeholder="Quatre visages naturels, à l'aise en mouvement…">${esc(s.note)}</textarea></label>
            <label class="field span-all"><span>Mot d'intro · anglais <small>facultatif, pour un prospect anglophone</small></span><textarea class="input" data-sbind="note_en" placeholder="Four natural faces, at ease in motion…">${esc(s.note_en || '')}</textarea></label>
          </div>
          <p class="label" style="margin:16px 0 8px">Profils <span class="hint">dans l'ordre de clic</span></p>
          <div class="pick">${db.talents.map(t => { const k = (s.ids || []).indexOf(t.slug); return `<button type="button" data-a="sel-pick" data-slug="${esc(t.slug)}" aria-pressed="${k >= 0}">${k >= 0 ? `<span class="num">${k + 1}</span>` : ''}<span class="img">${t.cover ? `<img src="${esc(srcFor(t.cover))}" alt="" loading="lazy">` : ''}</span><span class="nm">${esc(t.first)} <em>${esc(t.last)}</em></span></button>`; }).join('')}</div>
          <p class="label" style="margin:18px 0 8px">Lien</p>
          <div class="out"><code>${esc(selUrl(s))}</code><button class="btn btn--ghost btn--s" type="button" data-a="copy" data-v="${esc(selUrl(s))}">Copier</button><button class="btn btn--ghost btn--s" type="button" data-a="copy" data-v="${esc(selUrl(s))}&amp;lang=en" title="Lien qui ouvre la sélection en anglais">Copier (EN)</button><a class="btn btn--ghost btn--s" href="../v1/?sel=${encodeURIComponent(s.key)}&preview=1" target="_blank" rel="noopener" data-a="pv-sel">Aperçu</a></div>
          <p class="label" style="margin:18px 0 8px">Message de prospection</p>
          <div class="pitch">${esc(pitchFor(s)) || '<span class="muted">Choisis au moins un profil.</span>'}</div>
          <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button class="btn btn--ghost btn--s" type="button" data-a="copy" data-v="${esc(pitchFor(s))}">Copier le message</button><span class="hint" style="align-self:center">Identifiant : <span class="code">${esc(s.key)}</span></span><span style="flex:1"></span><button class="btn btn--danger btn--s" type="button" data-a="sel-del">Supprimer</button></div>
        </article>`; }).join('') : '<p class="muted">Aucune sélection pour l\'instant.</p>'}</div>
    </div>`;
  }

  /* ---------- Vue Réglages ---------- */
  function viewSettings() {
    const S = db.settings, ok = !!gh.token;
    const set = (label, k, o = {}) => `<label class="field${o.cls ? ' ' + o.cls : ''}"><span>${label}${o.hint ? ` <small>${o.hint}</small>` : ''}</span><input class="input${o.mono ? ' mono' : ''}" data-setbind="${k}" value="${esc(S[k] || '')}"${o.ph ? ` placeholder="${esc(o.ph)}"` : ''}></label>`;
    return `<div class="page">
      <h1>Ré<em>glages</em></h1><p class="lead">Coordonnées affichées sur le site, connexion à GitHub pour publier, sauvegardes.</p>
      <div class="cards">
        <section class="card"><div class="card-head"><h3>Coordonnées</h3></div><div class="grid2">
          ${set('Email de booking', 'mail', { ph: 'booking@dake.studio', hint: 'reçoit les demandes du formulaire' })}${set('Téléphone', 'phone', { ph: '+33 6 …', hint: 'facultatif' })}
          ${set('Instagram', 'instagram', { ph: 'dake.face' })}${set('Lien Daké©', 'studio', { ph: 'https://dake.studio', mono: 1 })}
          ${set('Mention sous Daké©', 'studioSoon', { ph: 'ex. dake.global', hint: 'affiche « Bientôt … »' })}${set('Ville (footer)', 'city', { ph: 'Paris, France' })}
          ${set('Zone (footer)', 'reach', { ph: "Castings en France et à l'international", cls: 'span-all' })}
          ${set('Zone (footer) · anglais', 'reach_en', { ph: 'Castings in France and internationally', cls: 'span-all', hint: 'facultatif' })}
          ${set('Adresse publique du site', 'siteUrl', { mono: 1, cls: 'span-all', hint: 'sert à fabriquer les liens de sélection' })}
        </div></section>

        <section class="card"><div class="card-head"><h3>Publication <em>GitHub</em></h3><span class="gh-state">${ok ? '<span class="dot"></span> Clé enregistrée' : '<span class="dot dot--off"></span> Pas connecté'}</span></div>
          <ol class="steps">
            <li>Va sur <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">github.com/settings/personal-access-tokens/new</a> (connecté à ton compte GitHub).</li>
            <li>Nom : <span class="code">Back office Talents</span>, expiration : 1 an.</li>
            <li><b>Repository access</b> → <i>Only select repositories</i> → <span class="code">${esc(gh.repo)}</span>.</li>
            <li><b>Permissions</b> → <i>Repository permissions</i> → <b>Contents : Read and write</b>. Rien d'autre.</li>
            <li>Génère la clé, copie-la et colle-la ci-dessous.</li>
          </ol>
          <div class="grid3" style="margin-top:16px">
            <label class="field"><span>Compte</span><input class="input mono" data-ghbind="owner" value="${esc(gh.owner)}"></label>
            <label class="field"><span>Dépôt</span><input class="input mono" data-ghbind="repo" value="${esc(gh.repo)}"></label>
            <label class="field"><span>Branche</span><input class="input mono" data-ghbind="branch" value="${esc(gh.branch)}"></label>
            <label class="field span-all"><span>Clé d'accès <small>reste uniquement dans ce navigateur</small></span><input class="input mono" type="password" data-ghbind="token" value="${esc(gh.token)}" placeholder="github_pat_…" autocomplete="off"></label>
          </div>
          <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap"><button class="btn btn--s" type="button" data-a="gh-test">Tester la connexion</button><button class="btn btn--ghost btn--s" type="button" data-a="gh-pull">Recharger depuis GitHub</button>${ok ? '<button class="btn btn--danger btn--s" type="button" data-a="gh-forget">Oublier la clé</button>' : ''}</div>
          <p class="hint" style="margin-top:10px">Sur un autre appareil (téléphone, autre ordi), il suffit de recoller la clé ici.</p>
        </section>

        <section class="card"><div class="card-head"><h3>Code d'<em>accès</em></h3></div>
          <p class="hint" style="margin:0 0 12px">Protège ce back office et le créateur de sélections. Le nouveau code est pris en compte à la prochaine publication.</p>
          <div class="out"><input class="input mono" id="new-code" placeholder="Nouveau code" autocomplete="off" style="max-width:260px"><button class="btn btn--ghost btn--s" type="button" data-a="gate">${gateHash ? 'Code modifié · à publier' : 'Changer le code'}</button></div>
        </section>

        <section class="card"><div class="card-head"><h3>Sauvegarde</h3></div>
          <p class="hint" style="margin:0 0 12px">Exporte toutes les données (fiches, sélections, réglages) dans un fichier, pour les garder ou les restaurer. Les photos restent sur GitHub.</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn--ghost btn--s" type="button" data-a="export">Exporter (.json)</button><label class="btn btn--ghost btn--s">Importer<input type="file" accept="application/json,.json" data-up="import" hidden></label><button class="btn btn--danger btn--s" type="button" data-a="reset">Repartir de la version en ligne</button></div>
        </section>
      </div></div>`;
  }

  /* =========================================================
     ÉVÉNEMENTS
     ========================================================= */
  function setPath(obj, path, val) {
    const ks = path.split('.'); let o = obj;
    ks.slice(0, -1).forEach((k, i) => { if (o[k] == null) o[k] = /^\d+$/.test(ks[i + 1]) ? [] : {}; o = o[k]; });
    o[ks[ks.length - 1]] = val;
  }
  const numVal = v => { const s = String(v).replace(',', '.').replace(/\s/g, ''); if (s === '') return ''; const n = Number(s); return isNaN(n) ? v : n; };

  // Saisie : champs liés à la fiche (data-bind), aux sélections, aux réglages, à GitHub
  document.addEventListener('input', e => {
    const el = e.target;
    if (el.id === 'q') { ui.q = el.value; const p = el.selectionStart; render(); const q = $('#q'); q.focus(); q.setSelectionRange(p, p); return; }
    if (el.dataset.bind) {
      const t = T(); if (!t) return;
      if (el.dataset.bind === 'slug') return;   // appliqué à la sortie du champ (voir « change »)
      const v = el.dataset.bool ? el.checked : el.dataset.num ? numVal(el.value) : el.value;
      setPath(t, el.dataset.bind, v);
      if (el.dataset.bind === 'consent' && v && !t.consentDate) { t.consentDate = new Date().toISOString().slice(0, 10); }
      persist();
      if (/^(first|last)$/.test(el.dataset.bind)) refreshHead(t);
      if (el.dataset.bind === 'consent') render();   // change le statut (liste groupée, brouillon local)
      else if (el.dataset.bool || /^social\.gender/.test(el.dataset.bind)) refreshPane();
      return;
    }
    if (el.dataset.sbind) { const k = el.closest('[data-sel]').dataset.sel; db.selections[k][el.dataset.sbind] = el.value; persist(); refreshSelCard(k); return; }
    if (el.dataset.setbind) { db.settings[el.dataset.setbind] = el.value.trim(); persist(); return; }
    if (el.dataset.ghbind) { gh[el.dataset.ghbind] = el.value.trim(); ls.set(KEY.gh, gh); return; }
  });
  document.addEventListener('change', e => {
    const el = e.target;
    if (el.dataset.bind === 'slug') { const t = T(); if (!t) return; updateSlug(t, uniqueSlug(slugify(el.value), t)); render(); return; }
    if (el.dataset.bind && (el.dataset.bool || el.tagName === 'SELECT' || el.type === 'date')) el.dispatchEvent(new Event('input', { bubbles: true }));
  });

  function updateSlug(t, ns) {
    if (ns === t.slug) return;
    Object.values(db.selections || {}).forEach(s => { s.ids = (s.ids || []).map(id => id === t.slug ? ns : id); });
    t.slug = ns; ui.slug = ns; persist();
  }
  function refreshHead(t) { const h = $('.ed-title h2'); if (h) h.innerHTML = `${esc(t.first) || 'Sans nom'} <em>${esc(t.last)}</em>`; const li = $(`.li[data-slug="${CSS.escape(t.slug)}"] .nm`); if (li) li.innerHTML = `${esc(t.first) || 'Sans nom'} <em>${esc(t.last)}</em>`; }
  function refreshPane() { const t = T(); const b = $('#ed-body'); if (!t || !b) return; const sy = $('#editor').scrollTop; b.innerHTML = pane(t, talentWarnings(t)); bindThumbs(); $('#editor').scrollTop = sy; }
  function refreshSelCard(k) { const c = $(`[data-sel="${CSS.escape(k)}"]`); if (!c) return; const s = Object.assign({ key: k }, db.selections[k]); c.querySelector('.pitch').innerHTML = esc(pitchFor(s)) || '<span class="muted">Choisis au moins un profil.</span>'; c.querySelector('.card-head h3').innerHTML = `${esc(s.client || 'Sans nom')} <em>${esc(s.project || '')}</em>`; }

  // Étiquettes (spécialités, marques)
  document.addEventListener('keydown', e => {
    const el = e.target; if (!el.dataset || !el.dataset.tagIn) return;
    if ((e.key === 'Enter' || e.key === ',') && el.value.trim()) {
      e.preventDefault(); const t = T(), path = el.dataset.tagIn;
      const arr = path.split('.').reduce((o, k) => o && o[k], t) || [];
      el.value.split(',').map(x => x.trim()).filter(Boolean).forEach(x => { if (!arr.includes(x)) arr.push(x); });
      setPath(t, path, arr); persist(); refreshPane(); $(`[data-tag-in="${path}"]`)?.focus();
    }
    if (e.key === 'Backspace' && !el.value) { const t = T(), path = el.dataset.tagIn; const arr = path.split('.').reduce((o, k) => o && o[k], t) || []; if (arr.length) { arr.pop(); persist(); refreshPane(); $(`[data-tag-in="${path}"]`)?.focus(); } }
  });

  // Clics
  document.addEventListener('click', async e => {
    const tab = e.target.closest('.tabs button'); if (tab) { ui.view = tab.dataset.view; render(); return; }
    const pn = e.target.closest('[data-pane]'); if (pn) { ui.pane = pn.dataset.pane; $$('.subtabs button').forEach(b => b.toggleAttribute('aria-current', b === pn)); refreshPane(); ls.set(KEY.ui, ui); return; }
    const pvp = e.target.closest('[data-pv-page]'); if (pvp) { ui.page = pvp.dataset.pvPage; $$('[data-pv-page]').forEach(b => b.setAttribute('aria-pressed', b === pvp)); setPreviewSrc(); return; }
    const pvd = e.target.closest('[data-pv-dev]'); if (pvd) { ui.device = pvd.dataset.pvDev; $$('[data-pv-dev]').forEach(b => b.setAttribute('aria-pressed', b === pvd)); $('.pv-stage').classList.toggle('is-mobile', ui.device === 'mobile'); ls.set(KEY.ui, ui); return; }
    const b = e.target.closest('[data-a]'); if (!b) return;
    const a = b.dataset.a, t = T();
    if (a === 'pv-sel') { ls.set(KEY.preview, previewData()); return; }
    if (b.tagName !== 'A') e.preventDefault();
    const act = ACTIONS[a]; if (act) await act(b, t, e);
  });

  const ACTIONS = {
    async add() {
      const box = await modal(`<h3>Nouveau <em>talent</em></h3><div class="grid2"><label class="field"><span>Prénom</span><input class="input" name="first" required></label><label class="field"><span>Nom</span><input class="input" name="last"></label></div><p>La fiche est créée en <b>brouillon dans ce navigateur</b>. Une fois l'accord droit à l'image coché, elle est enregistrée sur GitHub à chaque publication (toujours invisible), puis « Mettre en ligne » la rend visible.</p><div class="acts"><button class="btn btn--ghost" value="cancel" formnovalidate>Annuler</button><button class="btn" value="ok">Créer la fiche</button></div>`);
      if (!box) return;
      const first = box.first.value.trim(), last = box.last.value.trim(); if (!first) return;
      const t = newTalent(first, last); t.slug = uniqueSlug(first + (last ? '-' + last : ''));
      db.talents.push(t); ui.slug = t.slug; ui.pane = 'profil'; persist(); render(); toast('Fiche créée');
    },
    pick(b) { ui.slug = b.dataset.slug; render(); },
    'go-live'(b, t) { if (!t.consent) return; t.visible = true; persist(); render(); toast('Prête : clique Publier pour la mettre en ligne'); },
    'to-draft'(b, t) { t.visible = false; persist(); render(); toast('Repassée en brouillon : clique Publier pour la retirer du site'); },
    async dup(b, t) {
      const c = clone(t); c.first = t.first; c.last = t.last + ' (copie)'; c.slug = uniqueSlug(t.slug + '-copie'); c.visible = false;
      db.talents.splice(db.talents.indexOf(t) + 1, 0, c); ui.slug = c.slug; persist(); render(); toast('Fiche dupliquée (brouillon)');
    },
    async del(b, t) {
      const box = await modal(`<h3>Supprimer <em>${esc(t.first)} ${esc(t.last)}</em> ?</h3><p>La fiche, ses photos et sa vidéo seront supprimées du site à la prochaine publication. Elle est aussi retirée des sélections. Pour la cacher sans la perdre, décoche plutôt « visible ».</p><label class="field"><span>Tape <b>${esc(t.first)}</b> pour confirmer</span><input class="input" name="c" autocomplete="off"></label><div class="acts"><button class="btn btn--ghost" value="cancel">Annuler</button><button class="btn btn--danger" value="ok">Supprimer</button></div>`, box => box.c.value.trim().toLowerCase() === (t.first || '').toLowerCase() || (toast('Le prénom ne correspond pas', true), false));
      if (!box) return;
      const paths = refsOf(t);
      db.talents.splice(db.talents.indexOf(t), 1);
      paths.forEach(p => dropPath(p, null));
      Object.values(db.selections || {}).forEach(s => { s.ids = (s.ids || []).filter(id => id !== t.slug); });
      ui.slug = db.talents[0] ? db.talents[0].slug : null; persist(); render(); toast('Fiche supprimée · publie pour appliquer');
    },
    cat(b, t) { const k = b.dataset.k; t.cats = t.cats || []; const i = t.cats.indexOf(k); i < 0 ? t.cats.push(k) : t.cats.splice(i, 1); if (!t.cats.length) t.cats.push(k); b.setAttribute('aria-pressed', t.cats.includes(k)); if (k === 'influence' && t.cats.includes('influence') && !t.social) t.social = blankSocial(); persist(); },
    'tag-del'(b, t) { const path = b.closest('[data-tags]').dataset.tags; const arr = path.split('.').reduce((o, k) => o && o[k], t) || []; arr.splice(+b.dataset.i, 1); persist(); refreshPane(); },
    cover(b, t) { t.cover = b.dataset.p; persist(); refreshPane(); refreshListThumb(t); },
    'as-cover'(b, t) { const k = b.dataset.kind, i = +b.dataset.i; t.cover = k === 'polas' ? t.polas[i][0] : t.book[i]; persist(); refreshPane(); refreshListThumb(t); toast('Couverture mise à jour'); },
    'img-del'(b, t) {
      const k = b.dataset.kind, i = +b.dataset.i, p = k === 'polas' ? t.polas[i][0] : t.book[i];
      t[k].splice(i, 1);
      if (t.cover === p) t.cover = (t.polas[0] && t.polas[0][0]) || t.book[0] || '';
      if (t.composite) t.composite = t.composite.filter(x => x !== p);
      if (!refsOf(t).includes(p)) dropPath(p, t);
      persist(); refreshPane(); refreshListThumb(t); updateCounts(t);
    },
    async poster(b, t) {
      const v = $('#ed-video'); if (!v || !t.video) return;
      b.textContent = 'Capture…';
      try {
        const { blob } = await grabPoster(srcFor(t.video.src), v.currentTime || 1);
        const old = t.video.poster, path = `img/${t.slug}/web/poster-${uid()}.jpg`;
        await addPending(path, blob); t.video.poster = path; if (old && !refsOf(t).includes(old)) dropPath(old, t);
        persist(); refreshPane(); toast("Image d'aperçu mise à jour");
      } catch (err) { toast("Capture impossible avec ce format de vidéo", true); b.textContent = "Prendre l'image affichée"; }
    },
    'video-del'(b, t) { if (!t.video) return; const { src, poster } = t.video; t.video = null; [src, poster].forEach(p => p && !refsOf(t).includes(p) && dropPath(p, t)); persist(); refreshPane(); },
    'stats-on'(b, t) { t.social = blankSocial(); if (!t.cats.includes('influence')) t.cats.push('influence'); persist(); refreshPane(); },
    async 'stats-off'(b, t) { if (!await confirmBox('Retirer les stats ?', 'Les chiffres Instagram / TikTok de ce talent seront effacés.', 'Retirer', true)) return; t.social = null; persist(); refreshPane(); },
    'spark-gen'(b, t) {
      const k = b.dataset.k, s = t.social[k], end = +s.followers || 0, g = (+s.growth || 0) / 100;
      // croissance mensuelle supposée constante : on remonte 11 mois en arrière
      s.spark = Array.from({ length: 12 }, (_, i) => Math.round(end / Math.pow(1 + g, 11 - i)));
      persist(); refreshPane(); toast('Courbe générée');
    },
    'geo-add'(b, t) { t.social.geo.push(['', 0]); persist(); refreshPane(); },
    'geo-del'(b, t) { t.social.geo.splice(+b.dataset.i, 1); persist(); refreshPane(); },
    'comp-auto'(b, t) { t.composite = null; persist(); refreshPane(); },
    'comp-custom'(b, t) { t.composite = t.composite || []; persist(); refreshPane(); },
    'comp-pick'(b, t) { const p = b.dataset.p, i = t.composite.indexOf(p); if (i >= 0) t.composite.splice(i, 1); else if (t.composite.length < 4) t.composite.push(p); else return toast('4 photos maximum'); persist(); refreshPane(); },
    order(b, t) { const o = orderOf(t), i = o.indexOf(b.dataset.k), j = i + +b.dataset.d; if (j < 0 || j >= o.length) return; o.splice(j, 0, o.splice(i, 1)[0]); t.order = o; persist(); refreshPane(); },
    move(b, t) { const i = db.talents.indexOf(t), j = i + +b.dataset.d; if (j < 0 || j >= db.talents.length) return; db.talents.splice(j, 0, db.talents.splice(i, 1)[0]); persist(); render(); },
    'pv-toggle'() { ui.showPv = !ui.showPv; $('#studio').classList.toggle('show-preview', ui.showPv); },
    'pv-reload'() { pushPreview(); },
    copy(b) { copyText(b.dataset.v).then(ok => toast(ok ? 'Copié' : 'Copie impossible', !ok)); },
    async 'sel-add'() {
      const box = await modal(`<h3>Nouvelle <em>sélection</em></h3><label class="field"><span>Prospect (marque)</span><input class="input" name="client" required placeholder="Sézane"></label><label class="field"><span>Projet <small>facultatif</small></span><input class="input" name="project" placeholder="Campagne printemps-été 2027"></label><div class="acts"><button class="btn btn--ghost" value="cancel" formnovalidate>Annuler</button><button class="btn" value="ok">Créer</button></div>`);
      if (!box || !box.client.value.trim()) return;
      let key = slugify(box.client.value), n = 2; while (db.selections[key]) key = slugify(box.client.value) + '-' + n++;
      db.selections[key] = { client: box.client.value.trim(), project: box.project.value.trim(), ids: [], note: '' };
      persist(); render();
    },
    'sel-pick'(b) { const k = b.closest('[data-sel]').dataset.sel, s = db.selections[k], id = b.dataset.slug, i = s.ids.indexOf(id); i < 0 ? s.ids.push(id) : s.ids.splice(i, 1); persist(); render(); },
    async 'sel-del'(b) { const k = b.closest('[data-sel]').dataset.sel; if (!await confirmBox('Supprimer la sélection ?', `Le lien ?sel=${esc(k)} ne fonctionnera plus après publication.`, 'Supprimer', true)) return; delete db.selections[k]; persist(); render(); },
    async 'gh-test'() { try { const r = await api(`/repos/${gh.owner}/${gh.repo}`); toast(r.permissions && r.permissions.push ? 'Connexion OK · tu peux publier' : 'Connecté, mais la clé ne permet pas d\'écrire (Contents : Read and write)', !(r.permissions && r.permissions.push)); render(); } catch (err) { toast(err.message, true); } },
    async 'gh-pull'() {
      if (dirty() && !await confirmBox('Recharger depuis GitHub ?', 'Tes modifications non publiées seront remplacées par la version en ligne.', 'Recharger', true)) return;
      try { const d = await pullData(); await resetTo(d); toast('Données rechargées depuis GitHub'); } catch (err) { toast(err.message, true); }
    },
    'gh-forget'() { gh.token = ''; ls.set(KEY.gh, gh); render(); toast('Clé oubliée sur cet appareil'); },
    async gate() {
      const v = $('#new-code').value.trim(); if (v.length < 4) return toast('4 caractères minimum', true);
      gateHash = await sha256(v.toUpperCase()); persist(); render(); toast('Nouveau code prêt · publie pour l\'activer');
    },
    export() {
      const blob = new Blob([JSON.stringify(db, null, 1)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `talents-dake-${new Date().toISOString().slice(0, 10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    },
    async reset() { if (!await confirmBox('Repartir de la version en ligne ?', 'Toutes les modifications non publiées, les fichiers en attente et les brouillons gardés dans ce navigateur seront perdus.', 'Tout annuler', true)) return; await resetTo(published); toast('Brouillon effacé'); }
  };
  function refreshListThumb(t) { const li = $(`.li[data-slug="${CSS.escape(t.slug)}"]`); if (!li) return; const old = li.querySelector('img,.ph'); old.outerHTML = t.cover ? `<img src="${esc(srcFor(t.cover))}" alt="">` : '<span class="ph"></span>'; }
  function updateCounts(t) { $$('.subtabs button').forEach(b => { const k = b.dataset.pane, c = b.querySelector('.count'); if (c && (k === 'polas' || k === 'book')) c.textContent = (t[k] || []).length; }); }
  async function copyText(s) { try { await navigator.clipboard.writeText(s); return true; } catch (e) { const ta = document.createElement('textarea'); ta.value = s; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (_) {} ta.remove(); return ok; } }
  async function sha256(s) {
    if (crypto.subtle) { const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join(''); }
    throw new Error('Ouvre le back office en https pour changer le code');
  }

  /* ---------- Envois de fichiers ---------- */
  document.addEventListener('change', async e => {
    const el = e.target; if (!el.dataset || !el.dataset.up || !el.files || !el.files.length) return;
    const kind = el.dataset.up, files = [...el.files]; el.value = '';
    if (kind === 'import') return importJson(files[0]);
    await handleFiles(kind, files, el.closest('.drop'));
  });
  async function handleFiles(kind, files, dropEl) {
    const t = T(); if (!t) return;
    const prog = dropEl && dropEl.querySelector('.progress'), bar = prog && prog.querySelector('i');
    const step = (i, n) => { if (prog) { prog.hidden = false; bar.style.width = (i / n * 100) + '%'; } };
    if (kind === 'polas' || kind === 'book') {
      const paths = await uploadImages(files, kind, step);
      paths.forEach(p => kind === 'polas' ? t.polas.push([p, POLA_LABELS[Math.min(t.polas.length, POLA_LABELS.length - 1)]]) : t.book.push(p));
      if (!t.cover && paths[0]) t.cover = paths[0];
      persist(); refreshPane(); refreshListThumb(t); updateCounts(t);
      if (paths.length) toast(`${paths.length} photo${paths.length > 1 ? 's' : ''} ajoutée${paths.length > 1 ? 's' : ''}`);
    }
    if (kind === 'cover') { const [p] = await uploadImages(files.slice(0, 1), 'cover', step); if (p) { t.cover = p; persist(); refreshPane(); refreshListThumb(t); updateCounts(t); } }
    if (kind === 'poster') { const [p] = await uploadImages(files.slice(0, 1), 'poster'); if (p && t.video) { const old = t.video.poster; t.video.poster = p; if (old && !refsOf(t).includes(old)) dropPath(old, t); persist(); refreshPane(); } }
    if (kind === 'video') {
      const f = files[0];
      if (f.size > VIDEO_MAX) return toast(`Vidéo trop lourde (${fmtSize(f.size)}) : 95 Mo maximum. Exporte-la en MP4 plus léger.`, true);
      if (f.size > VIDEO_WARN && !await confirmBox('Vidéo lourde', `${fmtSize(f.size)} : la fiche sera plus lente à charger, surtout en 4G. Idéalement moins de 25 Mo (1080p, 30 s).`, 'Garder quand même')) return;
      const ext = (f.name.match(/\.(\w+)$/) || [, 'mp4'])[1].toLowerCase();
      const path = `img/${t.slug}/web/film-${uid()}.${ext === 'mov' ? 'mov' : 'mp4'}`;
      step(1, 3); await addPending(path, f);
      const old = t.video ? [t.video.src, t.video.poster] : [];
      t.video = Object.assign({ title: '', credit: 'Réalisée par Daké', len: '' }, t.video || {}, { src: path, poster: '' });
      try {
        step(2, 3); const { blob, duration } = await grabPoster(pending.get(path).url, 1.2);
        const pp = `img/${t.slug}/web/poster-${uid()}.jpg`; await addPending(pp, blob); t.video.poster = pp; t.video.len = fmtLen(duration);
      } catch (err) { toast('Vidéo ajoutée, mais ce format ne se lit pas dans ce navigateur (aperçu impossible). Préfère le MP4.', true); }
      old.forEach(p => p && !refsOf(t).includes(p) && dropPath(p, t));
      if (t.sections) t.sections.video = true;
      step(3, 3); persist(); refreshPane(); toast('Vidéo ajoutée');
    }
  }
  async function importJson(file) {
    try {
      const d = JSON.parse(await file.text());
      if (!d || !Array.isArray(d.talents)) throw new Error();
      if (!await confirmBox('Importer cette sauvegarde ?', `${d.talents.length} talents. Le brouillon actuel sera remplacé (rien n'est publié tant que tu ne cliques pas sur Publier).`, 'Importer')) return;
      db = normalize(d); ui.slug = null; persist(); render(); toast('Sauvegarde importée');
    } catch (e) { toast('Fichier de sauvegarde invalide', true); }
  }

  /* ---------- Glisser-déposer : fichiers et ordre ---------- */
  function bindThumbs() {
    $$('[data-drop]').forEach(d => {
      d.ondragover = e => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); d.classList.add('is-over'); } };
      d.ondragleave = () => d.classList.remove('is-over');
      d.ondrop = e => { if (!e.dataTransfer.files.length) return; e.preventDefault(); d.classList.remove('is-over'); handleFiles(d.dataset.drop, [...e.dataTransfer.files], d); };
    });
    $$('[data-list]').forEach(list => {
      let from = null;
      list.ondragstart = e => { const th = e.target.closest('.thumb'); if (!th) return; from = +th.dataset.i; th.classList.add('is-drag'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', 'x'); };
      list.ondragend = () => { $$('.thumb', list).forEach(x => x.classList.remove('is-drag', 'is-over')); from = null; };
      list.ondragover = e => { if (from === null) return; e.preventDefault(); const th = e.target.closest('.thumb'); $$('.thumb', list).forEach(x => x.classList.toggle('is-over', x === th)); };
      list.ondrop = e => {
        if (from === null) return; e.preventDefault();
        const th = e.target.closest('.thumb'); if (!th) return; const to = +th.dataset.i, t = T(), arr = t[list.dataset.list];
        arr.splice(to, 0, arr.splice(from, 1)[0]); persist(); refreshPane();
      };
    });
  }
  function bindList() {
    const box = $('#list-items'); if (!box) return; let from = null;
    box.ondragstart = e => { const li = e.target.closest('.li'); if (!li) return; from = li.dataset.slug; li.classList.add('is-drag'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', from); };
    box.ondragend = () => $$('.li', box).forEach(x => x.classList.remove('is-drag', 'is-over'));
    box.ondragover = e => { if (!from) return; e.preventDefault(); const li = e.target.closest('.li'); $$('.li', box).forEach(x => x.classList.toggle('is-over', x === li)); };
    box.ondrop = e => {
      if (!from) return; e.preventDefault(); const li = e.target.closest('.li'); if (!li || li.dataset.slug === from) return;
      const a = db.talents.findIndex(t => t.slug === from), b = db.talents.findIndex(t => t.slug === li.dataset.slug);
      db.talents.splice(b, 0, db.talents.splice(a, 1)[0]); from = null; persist(); render();
    };
  }

  /* =========================================================
     GITHUB : lecture et publication en un commit
     ========================================================= */
  async function api(path, opt = {}) {
    if (!gh.token) throw new Error('Ajoute ta clé GitHub dans Réglages');
    const r = await fetch('https://api.github.com' + path, { method: opt.method || 'GET', headers: { Authorization: 'Bearer ' + gh.token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(opt.body ? { 'Content-Type': 'application/json' } : {}) }, body: opt.body ? JSON.stringify(opt.body) : undefined });
    if (!r.ok) {
      let m = ''; try { m = (await r.json()).message || ''; } catch (e) {}
      throw new Error(r.status === 401 ? 'Clé GitHub refusée (expirée ou mal copiée)' : r.status === 403 ? 'La clé ne permet pas cette action (Contents : Read and write ?)' : r.status === 404 ? 'Dépôt ou branche introuvable (vérifie Compte / Dépôt / Branche)' : `GitHub : ${m || r.status}`);
    }
    return r.status === 204 ? null : r.json();
  }
  const b64text = s => { const bytes = new TextEncoder().encode(s); let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(bin); };
  const b64blob = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(blob); });
  const decodeB64 = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g, '')), c => c.charCodeAt(0)));
  function serialize(d) {
    return '/* Données Face by Daké — fichier généré par le back office (talents/admin). Ne pas éditer à la main. */\nwindow.TALENTS_DATA = ' + JSON.stringify(d, null, 1) + ';\n';
  }
  function parseDataFile(txt) { const a = txt.indexOf('{'), b = txt.lastIndexOf('}'); return JSON.parse(txt.slice(a, b + 1)); }
  async function pullData() { const f = await api(`/repos/${gh.owner}/${gh.repo}/contents/${gh.base}talents-data.js?ref=${encodeURIComponent(gh.branch)}`); return parseDataFile(decodeB64(f.content)); }
  async function resetTo(d) {
    published = normalize(clone(d)); db = clone(published);
    pending.forEach(v => URL.revokeObjectURL(v.url)); pending.clear(); removed.clear(); gateHash = null;
    await idb.clear(); ls.del(KEY.draft); ui.slug = null; render(); pushPreview();
  }

  $('#publish').addEventListener('click', publish);
  $('#discard').addEventListener('click', () => ACTIONS.reset());
  async function publish() {
    if (!gh.token) { ui.view = 'settings'; render(); return toast('Connecte d\'abord GitHub (clé d\'accès)', true); }
    renumber();
    // On n'envoie que les fichiers encore utilisés
    // Les brouillons locaux (accord non signé) ne partent jamais : ni données, ni photos
    const used = publicFiles();
    const uploads = [...pending.entries()].filter(([p]) => used.has(p));
    const size = uploads.reduce((s, [, v]) => s + v.blob.size, 0);
    const pub = db.talents.filter(t => !isLocal(t)), local = db.talents.filter(isLocal);
    const drafts = pub.filter(t => t.visible === false);
    // Fiche déjà en ligne dont l'accord a été décoché : retirée du site, ses photos supprimées du dépôt
    const withdrawn = published.talents.filter(p => local.some(t => t.slug === p.slug));
    const wFiles = withdrawn.flatMap(refsOf).filter(p => isOwned(p) && !used.has(p));
    const box = await modal(`<h3>Publier sur le <em>site</em></h3>
      <ul><li>${pub.length - drafts.length} fiche${pub.length - drafts.length > 1 ? 's' : ''} en ligne${drafts.length ? ` · ${drafts.length} brouillon${drafts.length > 1 ? 's' : ''} enregistré${drafts.length > 1 ? 's' : ''}, invisible${drafts.length > 1 ? 's' : ''} sur le site` : ''}</li><li>${Object.keys(db.selections || {}).length} sélections</li>${uploads.length ? `<li>${uploads.length} fichier${uploads.length > 1 ? 's' : ''} à envoyer (${fmtSize(size)})</li>` : ''}${removed.size ? `<li>${removed.size} fichier${removed.size > 1 ? 's' : ''} supprimé${removed.size > 1 ? 's' : ''}</li>` : ''}${gateHash ? '<li>Nouveau code d\'accès</li>' : ''}</ul>
      ${local.length ? `<p>Restent dans ce navigateur, sans rien envoyer (accord droit à l'image non signé) : ${local.map(t => esc(t.first + ' ' + t.last)).join(', ')}.</p>` : ''}
      ${withdrawn.length ? `<p class="warn-txt">Retirées du site, photos supprimées du dépôt : ${withdrawn.map(t => esc(t.first + ' ' + t.last)).join(', ')} (accord décoché).</p>` : ''}
      <label class="field"><span>Note <small>facultatif, pour l'historique</small></span><input class="input" name="msg" placeholder="Ajout de Prune, nouvelles photos…"></label>
      <div class="progress" hidden id="pub-prog"><i></i></div><p class="hint" id="pub-step"></p>
      <div class="acts"><button class="btn btn--ghost" value="cancel">Annuler</button><button class="btn" value="ok" id="pub-go">Publier</button></div>`, box => { runPublish(box, uploads, wFiles); return false; });
  }
  async function runPublish(box, uploads, wFiles = []) {
    const prog = box.querySelector('#pub-prog'), bar = prog.querySelector('i'), stepEl = box.querySelector('#pub-step'), go = box.querySelector('#pub-go');
    go.disabled = true; prog.hidden = false;
    const step = (txt, i, n) => { stepEl.textContent = txt; bar.style.width = (n ? i / n * 100 : 0) + '%'; };
    try {
      const repo = `/repos/${gh.owner}/${gh.repo}`;
      step('Connexion à GitHub…', 0, 1);
      const ref = await api(`${repo}/git/ref/heads/${encodeURIComponent(gh.branch)}`);
      const head = await api(`${repo}/git/commits/${ref.object.sha}`);
      // Conflit : quelqu'un a publié depuis l'ouverture du brouillon ?
      try { const remote = await pullData(); if (remote.updated && published.updated && remote.updated !== published.updated && !confirm('Une autre version a été publiée entre-temps (autre appareil ?). Publier quand même et la remplacer ?')) throw new Error('Publication annulée'); } catch (e) { if (e.message === 'Publication annulée') throw e; }
      const tree = [];
      const n = uploads.length + 1;
      for (const [i, [p, v]] of uploads.entries()) {
        step(`Envoi des fichiers ${i + 1} / ${uploads.length} (${fmtSize(v.blob.size)})…`, i, n);
        const blob = await api(`${repo}/git/blobs`, { method: 'POST', body: { content: await b64blob(v.blob), encoding: 'base64' } });
        tree.push({ path: gh.base + p, mode: '100644', type: 'blob', sha: blob.sha });
      }
      step('Écriture des données…', n - 1, n);
      const out = publicView(db); out.updated = new Date().toISOString(); out.version = 1;
      const dataBlob = await api(`${repo}/git/blobs`, { method: 'POST', body: { content: b64text(serialize(out)), encoding: 'base64' } });
      tree.push({ path: gh.base + 'talents-data.js', mode: '100644', type: 'blob', sha: dataBlob.sha });
      // Plan du site pour Google : à la racine du dépôt, régénéré avec les fiches en ligne
      if (window.buildSitemap) {
        const sm = await api(`${repo}/git/blobs`, { method: 'POST', body: { content: b64text(buildSitemap(out)), encoding: 'base64' } });
        tree.push({ path: gh.base.replace(/talents\/$/, '') + 'sitemap.xml', mode: '100644', type: 'blob', sha: sm.sha });
      }
      if (gateHash) {
        const g = await (await fetch('../gate.js', { cache: 'no-store' })).text();
        const ng = g.replace(/var HASH = '[0-9a-f]+'/, `var HASH = '${gateHash}'`);
        const gb = await api(`${repo}/git/blobs`, { method: 'POST', body: { content: b64text(ng), encoding: 'base64' } });
        tree.push({ path: gh.base + 'gate.js', mode: '100644', type: 'blob', sha: gb.sha });
      }
      const toRemove = new Set([...removed, ...wFiles]);
      if (toRemove.size) {
        // ne supprimer que ce qui existe vraiment dans le dépôt
        const full = await api(`${repo}/git/trees/${head.tree.sha}?recursive=1`);
        const exist = new Set(full.tree.map(x => x.path));
        [...toRemove].map(p => gh.base + p).filter(p => exist.has(p)).forEach(p => tree.push({ path: p, mode: '100644', type: 'blob', sha: null }));
      }
      const nt = await api(`${repo}/git/trees`, { method: 'POST', body: { base_tree: head.tree.sha, tree } });
      const msg = (box.msg.value.trim() || 'Mise à jour des talents') + ' (back office)';
      const nc = await api(`${repo}/git/commits`, { method: 'POST', body: { message: msg, tree: nt.sha, parents: [ref.object.sha] } });
      await api(`${repo}/git/refs/heads/${encodeURIComponent(gh.branch)}`, { method: 'PATCH', body: { sha: nc.sha } });
      step('Publié ✓', 1, 1);
      // Ce qui est publié devient la référence ; les brouillons locaux et leurs fichiers restent dans ce navigateur
      published = normalize(clone(out));
      for (const [p] of uploads) { URL.revokeObjectURL(pending.get(p).url); pending.delete(p); await idb.del(p); }
      removed.clear(); gateHash = null;
      if (db.talents.some(isLocal) || pending.size) persist();
      else { await idb.clear(); ls.del(KEY.draft); }
      $('#modal').close(); render(); pushPreview();
      toast('Publié · le site est à jour dans 1 à 2 minutes');
    } catch (err) {
      step(err.message, 0, 1); go.disabled = false; toast(err.message, true);
    }
  }

  /* =========================================================
     DÉMARRAGE
     ========================================================= */
  async function boot() {
    const draft = ls.get(KEY.draft);
    if (draft && draft.db) {
      db = draft.db; removed = new Set(draft.removed || []); gateHash = draft.gateHash || null;
      try { (await idb.all()).forEach((blob, p) => pending.set(p, { blob, url: URL.createObjectURL(blob) })); } catch (e) {}
    }
    db = normalize(db);
    render();
    // Données publiées les plus récentes (le site peut être en cache quelques minutes)
    if (gh.token) {
      try {
        const remote = await pullData();
        if (!draft) { published = normalize(remote); db = clone(published); render(); }
        else { published = normalize(remote); syncStatus(); if (draft.base && remote.updated && draft.base !== remote.updated) toast('Une version plus récente est en ligne : vérifie avant de publier (Réglages → Recharger)'); }
      } catch (e) { /* pas de réseau : on garde la version du site */ }
    }
    if (draft) toast('Brouillon restauré · pense à publier');
  }
  addEventListener('beforeunload', e => { if (dirty()) { e.preventDefault(); e.returnValue = ''; } });
  boot();
})();
