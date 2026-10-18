/* Rendus partagés V1 / V2 : stats influence, lecteur vidéo, révélations */
(function () {
  /* Fond blanc retenu : la classe est posée directement sur <html> dans chaque page */
  document.documentElement.classList.add('theme-white');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function plat(name, p) {
    return `<article class="plat">
      <div class="plat-head caps"><b>${name}</b><span class="dim">${esc(p.handle)}</span></div>
      <p class="plat-big num">${TU.k(p.followers)}<small>${T('abonnés', 'followers')}</small></p>
      ${TU.spark(p.spark)}
      <dl>
        <dt>Engagement</dt><dd class="num">${TU.pct(p.er)}</dd>
        <dt>${T('Vues moy. / post', 'Avg. views / post')}</dt><dd class="num">${TU.k(p.views)}</dd>
        <dt>${T('Likes moy.', 'Avg. likes')}</dt><dd class="num">${TU.k(p.likes)}</dd>
        <dt>${T('Croissance 30 j', '30-day growth')}</dt><dd class="num up">+${TU.pct(p.growth)}</dd>
      </dl>
    </article>`;
  }

  function bars(rows) {
    const max = Math.max(...rows.map(r => r[1]));
    return `<div class="bars">${rows.map(r => `<div class="bar"><span>${esc(r[0])}</span><span class="t"><i class="${r[1] === max ? 'top' : ''}" style="width:${(r[1] / max * 100).toFixed(0)}%"></i></span><b class="num">${r[1]}%</b></div>`).join('')}</div>`;
  }

  window.renderStats = function (s) {
    const best = s.tt.er > s.ig.er ? 'TikTok' : 'Instagram';
    return `<div class="stats-kpis reveal">
        <div class="kpi"><span class="caps dim">${T('Audience cumulée', 'Total audience')}</span><span class="v num">${TU.k(TU.reach(s))}</span><span class="s caps dim">IG + TikTok</span></div>
        <div class="kpi"><span class="caps dim">${T('Engagement moyen', 'Avg. engagement')}</span><span class="v num">${TU.pct(TU.erAvg(s))}</span><span class="s caps dim">${T('Pondéré par audience', 'Audience-weighted')}</span></div>
        <div class="kpi"><span class="caps dim">${T('Vues moy. TikTok', 'Avg. TikTok views')}</span><span class="v num">${TU.k(s.tt.views)}</span><span class="s caps dim">${T('30 derniers jours', 'Last 30 days')}</span></div>
        <div class="kpi"><span class="caps dim">${T('Plateforme forte', 'Top platform')}</span><span class="v">${best}</span><span class="s caps dim">${T('Meilleur taux', 'Highest rate')}</span></div>
      </div>
      <div class="platforms reveal">${plat('Instagram', s.ig)}${plat('TikTok', s.tt)}</div>
      <div class="audience reveal">
        <div class="aud"><h3 class="caps">${T('Genre', 'Gender')}</h3>
          <div class="split"><i style="flex:${s.gender[0]}"></i><i style="flex:${s.gender[1]}"></i><i style="flex:${s.gender[2]}"></i></div>
          <div class="legend mono"><span>F ${s.gender[0]}%</span><span>${T('H', 'M')} ${s.gender[1]}%</span><span>${T('Autre', 'Other')} ${s.gender[2]}%</span></div>
          <h3 class="caps" style="margin-top:28px">${T('Marques', 'Brands')}</h3>
          <div class="brands">${s.brands.map(b => `<span>${esc(b)}</span>`).join('')}</div>
        </div>
        <div class="aud"><h3 class="caps">${T('Âge', 'Age')}</h3>${bars(s.ages)}</div>
        <div class="aud"><h3 class="caps">${T('Top villes', 'Top cities')}</h3>${bars(s.geo)}</div>
      </div>
      <p class="stats-note caps dim"><span>${T('Données au 15.10.2026', 'Data as of 15.10.2026')}</span><span>${T('Source : insights partagés par le talent', 'Source: insights shared by the talent')}</span></p>`;
  };

  window.initPlayer = function (root) {
    root.querySelectorAll('.player').forEach(p => {
      const v = p.querySelector('video'), b = p.querySelector('.play');
      if (!b) return;
      b.addEventListener('click', () => {
        // Une seule vidéo joue à la fois
        root.querySelectorAll('.player video').forEach(o => { if (o !== v) o.pause(); });
        if (p.dataset.embed) {   // YouTube / Vimeo : iframe créée au clic (rien de chargé avant, pas de cookies)
          const f = document.createElement('iframe');
          f.src = p.dataset.embed; f.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media'; f.allowFullscreen = true; f.title = p.dataset.title || 'Vidéo';
          p.appendChild(f); p.classList.add('is-playing', 'is-embed'); return;
        }
        v.muted = false; v.controls = true; v.play(); p.classList.add('is-playing');
      });
      if (v) v.addEventListener('pause', () => { if (v.ended) p.classList.remove('is-playing'); });
    });
  };

  window.initReveal = function () {
    const els = document.querySelectorAll('.reveal:not(.in)');
    if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in')); return; }
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    els.forEach(e => io.observe(e));
  };

  // Lien actif dans une navigation d'ancres
  window.initSpy = function (links) {
    const map = new Map([...links].map(a => [a.getAttribute('href').slice(1), a]));
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(a => a.classList.remove('is-active'));
      const a = map.get(e.target.id); if (!a) return;
      a.classList.add('is-active');
      // Barre plus large que l'écran (mobile) : l'ancre active revient au centre
      const bar = a.parentElement;
      if (bar.scrollWidth > bar.clientWidth) bar.scrollTo({ left: a.offsetLeft - (bar.clientWidth - a.offsetWidth) / 2, behavior: 'smooth' });
    }), { rootMargin: '-40% 0px -55% 0px' });
    map.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
  };

  /* Footer plein, même structure que DAKĒ STUDIO.
     root = chemin vers la racine du site (là où est la page FACE). */
  // Coordonnées : réglées dans le back office (onglet Réglages)
  window.ECO = {
    get studio() { return (window.SETTINGS || {}).studio || 'https://dake.studio'; },
    get studioSoon() { return (window.SETTINGS || {}).studioSoon || ''; },
    get mail() { return (window.SETTINGS || {}).mail || 'contact@dake.studio'; },
    get instagram() { return ((window.SETTINGS || {}).instagram || 'dake.face').replace(/^@/, ''); }
  };
  // Mention de positionnement (réglable dans le back office, Réglages) ; texte par défaut si vide
  const NOTE_FR = window.FACE_NOTE.fr, NOTE_EN = window.FACE_NOTE.en;   // texte par défaut : i18n.js
  function faceNote() {
    const S = window.SETTINGS || {};
    if (!EN) return S.note || NOTE_FR;
    return S.note_en || (S.note && S.note !== NOTE_FR ? S.note : NOTE_EN);
  }
  window.renderFooter = function (el, o) {
    const arr = '<svg class="arr" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 9 9 3M4 3h5v5" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>';
    const letters = 'FACE BY DAKĒ'.split('').map(c => c === ' ' ? '<span class="gap"></span>' : `<span>${c}</span>`).join('');
    el.className = 'final';
    el.id = el.id || 'contact';
    el.innerHTML = `
      <h2 class="h2">${o.title || T('Une campagne, un contenu, <em>un film ?</em>', 'A campaign, content, <em>a film?</em>')}</h2>
      <div class="actions">${(o.actions || [{ label: T('Proposer un projet', 'Start a project'), href: 'mailto:' + ECO.mail, book: '' }]).map(a => `<a class="btn${a.ghost ? ' btn--ghost' : ''}" href="${a.href}"${a.book !== undefined ? ` data-book="${a.book}"` : ''}${a.kind ? ` data-kind="${a.kind}"` : ''}>${a.label}</a>`).join('')}</div>
      <div class="coords">
        <div><span class="caps">Contact</span><a href="mailto:${ECO.mail}">${ECO.mail}</a>${SETTINGS.phone ? `<a href="tel:${esc(SETTINGS.phone.replace(/\s/g, ''))}">${esc(SETTINGS.phone)}</a>` : ''}<a href="https://instagram.com/${ECO.instagram}" target="_blank" rel="noopener">@${ECO.instagram}</a></div>
        <div><span class="caps">${T('Écosystème', 'Ecosystem')}</span>
          <a href="${ECO.studio}" target="_blank" rel="noopener">Daké© ${arr}</a>
          <a href="${o.root}${EN ? 'en.html' : ''}">Daké Studio© ${arr}</a>
          <span class="is-here">Face by Daké©<small> · ${T('ici', 'here')}</small></span>
          ${ECO.studioSoon ? `<span class="soon">${T('Bientôt', 'Soon')} ${ECO.studioSoon}</span>` : ''}
        </div>
        <div><span class="caps">${T('Basé à', 'Based in')}</span><span>${esc(TR(SETTINGS.city))}</span><span>${esc(TX(SETTINGS, 'reach'))}</span></div>
        <div><span class="caps">${T('Heure à Paris', 'Paris time')}</span><span class="num" data-clock>--:--</span></div>
      </div>
      <p class="spread" aria-hidden="true">${letters}</p>
      <div class="face-note"><span class="caps">Talent roster by Daké Studio</span><p>${esc(faceNote())}</p></div>
      <div class="final-foot">
        <span>© 2026 <a href="${ECO.studio}" target="_blank" rel="noopener">Daké Creative Studio</a></span>
        <span class="links"><a href="${o.root}${EN ? 'en.html' : ''}">Daké Studio</a><a href="${o.legal || 'mentions.html'}">${T('Mentions légales', 'Legal notice')}</a></span>
      </div>`;


    const c = el.querySelector('[data-clock]');
    const tick = () => { c.textContent = new Intl.DateTimeFormat(T('fr-FR', 'en-GB'), { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }).format(new Date()); };
    tick(); setInterval(tick, 15000);
  };

  /* Nav reprise de DAKĒ STUDIO : header verre + menu plein écran + barre d'action mobile + footer en volet.
     o = { root, home, sections: [[href, label]], book: { label, href }, dock: 'texte à gauche (HTML)' } */
  window.renderShell = function (o) {
    const arr = '<svg class="arr" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 9 9 3M4 3h5v5" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>';
    const b = document.body;
    b.classList.add('shell');
    const ext = [[ECO.studio, 'Daké©', true], [o.root + (EN ? 'en.html' : ''), 'Daké Studio©', false]];
    // Sélecteur FR / EN, comme sur Daké Studio
    const LANG_LINKS = ['fr', 'en'].map(l => LANG === l ? `<span class="is-current" aria-current="true">${l.toUpperCase()}</span>` : `<a href="#" data-lang="${l}" lang="${l}" aria-label="${l === 'en' ? 'English version' : 'Version française'}">${l.toUpperCase()}</a>`).join('');
    const langSw = mod => `<span class="lang-switch${mod ? ' lang-switch--menu' : ''}" role="group" aria-label="${T('Langue', 'Language')}">${LANG_LINKS}</span>`;
    const extA = (cls, i) => ext.map(([h, l, blank], k) => `<a class="${cls}" ${i ? `style="--i:${i + k}"` : ''} href="${h}"${blank ? ' target="_blank" rel="noopener"' : ''}>${l} ${arr}</a>`).join('');
    const header = document.createElement('header');
    header.className = 'header on-light';
    header.innerHTML = `
      <a class="logo" href="${o.home}">FACE BY DAKĒ<span class="c">©</span></a>
      <nav class="nav caps" aria-label="Sections">${o.sections.map(([h, l]) => `<a href="${h}">${l}</a>`).join('')}</nav>
      <div class="header-cta">${langSw()}<a class="btn btn--s" href="${o.book.href}" data-book="${o.book.ids || ''}"${o.book.kind ? ` data-kind="${o.book.kind}"` : ''}>${o.book.label}</a></div>
      <button class="menu-btn" type="button" aria-expanded="false" aria-controls="menu">Menu</button>`;
    const menu = document.createElement('div');
    menu.className = 'menu'; menu.id = 'menu'; menu.setAttribute('inert', '');
    menu.innerHTML = `
      <div class="menu-top"><nav aria-label="Menu">${o.sections.map(([h, l], i) => `<a style="--i:${i + 1}" href="${h}">${l}</a>`).join('')}</nav></div>
      <div class="menu-mid">
        <nav aria-label="${T('Écosystème Daké', 'Daké ecosystem')}">${extA('menu-ext', o.sections.length + 1)}</nav>
        ${langSw(1)}
        <div class="menu-clocks" aria-label="${T('Heure locale', 'Local time')}">
          <div><span class="caps">Paris</span><span class="num" data-tz="Europe/Paris">00:00:00</span></div>
          <div><span class="caps">Abidjan</span><span class="num" data-tz="Africa/Abidjan">00:00:00</span></div>
        </div>
      </div>
      <div class="menu-foot"><a class="btn" href="${o.book.href}" data-book="${o.book.ids || ''}"${o.book.kind ? ` data-kind="${o.book.kind}"` : ''}>${o.book.label}</a></div>`;
    const dock = document.createElement('div');
    dock.className = 'dock';
    dock.innerHTML = `<span>${o.dock}</span><a class="btn" href="${o.book.href}" data-book="${o.book.ids || ''}"${o.book.kind ? ` data-kind="${o.book.kind}"` : ''}>${o.book.label}</a>`;
    b.prepend(menu); b.prepend(header); b.append(dock);
    b.addEventListener('click', e => { const a = e.target.closest('a[data-lang]'); if (!a) return; e.preventDefault(); if (a.dataset.lang !== LANG) setLang(a.dataset.lang); });
    const main = document.querySelector('main');
    const end = document.createElement('div'); end.className = 'reveal-end'; end.id = 'reveal-end'; end.setAttribute('aria-hidden', 'true');
    main.append(end);
    // Le footer est fixe sous la page : un lien vers lui descend tout en bas
    // Ancres : défilement lissé (Lenis), le footer fixe = tout en bas
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href^="#"]'); if (!a || a.getAttribute('href').length < 2) return;
      const id = a.getAttribute('href');
      const el = id === '#contact' ? null : document.querySelector(id);
      if (id !== '#contact' && !el) return;
      e.preventDefault();
      const wasOpen = b.classList.contains('menu-open');
      if (wasOpen) setMenu(false, false);
      const sub = document.querySelector('.subnav');
      // Bas exact de ce qui reste collé en haut : barre d'ancres si elle existe, sinon le header
      const off = () => {
        if (sub) return parseFloat(getComputedStyle(sub).top) + sub.offsetHeight;
        return innerWidth > 860 ? 72 : header.offsetHeight;
      };
      if (sub && el) { sub.querySelectorAll('a').forEach(x => x.classList.toggle('is-active', x === a)); }
      const go = () => window.smoothTo ? smoothTo(el || document.documentElement.scrollHeight, { offset: off, duration: el ? 1.2 : 1.6 }) : (el ? el.scrollIntoView({ behavior: 'smooth' }) : scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' }));
      wasOpen ? setTimeout(go, 350) : go();
    });

    /* Couleur du header selon ce qui passe dessous ; pilule retirée quand le footer est entièrement découvert */
    const darks = () => [...document.querySelectorAll('main [data-tone="dark"]')];
    function tone() {
      const endTop = end.getBoundingClientRect().top;
      const max = document.documentElement.scrollHeight - innerHeight;
      const full = endTop <= 4 || scrollY >= max - 24;
      b.classList.toggle('is-scrolled', scrollY > 10 && !full);
      b.classList.toggle('at-end', endTop < innerHeight * .85);
      if (b.classList.contains('menu-open')) { header.classList.remove('on-light'); return; }
      const hr = header.getBoundingClientRect(), y = hr.top + hr.height / 2;
      const dark = endTop <= y || darks().some(el => { const r = el.getBoundingClientRect(); return r.top <= y && r.bottom > y; });
      header.classList.toggle('on-light', !dark);
      // Les ancres prennent la couleur de ce qui passe sous elles
      const sub = document.querySelector('.subnav');
      if (sub) {
        const sr = sub.getBoundingClientRect(), sy = sr.top + sr.height / 2;
        sub.classList.toggle('on-light', !(endTop <= sy || darks().some(el => { const r = el.getBoundingClientRect(); return r.top <= sy && r.bottom > sy; })));
      }
    }
    /* Section active + pastille qui glisse */
    const links = [...document.querySelectorAll('.nav a[href^="#"], .menu nav a[href^="#"]')];
    const targets = [...new Set(links.map(a => a.getAttribute('href')))].map(h => document.querySelector(h)).filter(el => el && main.contains(el));
    const navEl = header.querySelector('.nav');
    const ind = document.createElement('span'); ind.className = 'nav-ind'; ind.setAttribute('aria-hidden', 'true'); navEl.prepend(ind);
    let cur = null;
    function place() { const a = navEl.querySelector('a[aria-current]'); if (!a) return; ind.style.width = (a.offsetWidth + 26) + 'px'; ind.style.transform = `translateX(${a.offsetLeft - 13}px)`; }
    function spy() {
      const y = innerHeight * .4;
      const t = targets.find(el => { const r = el.getBoundingClientRect(); return r.top <= y && r.bottom > y; });
      const id = t ? '#' + t.id : null;
      if (id === cur) return; cur = id;
      links.forEach(a => a.getAttribute('href') === id ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current'));
      document.querySelectorAll('.nav, .menu nav').forEach(n => n.classList.toggle('has-active', !!id));
      place();
    }
    let raf = 0;
    addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { tone(); spy(); }); }, { passive: true });
    addEventListener('resize', () => requestAnimationFrame(() => { tone(); place(); }), { passive: true });
    if (document.fonts) document.fonts.ready.then(place);
    tone(); spy();

    /* Menu mobile */
    const btn = header.querySelector('.menu-btn');
    function setMenu(open, focus = true) {
      b.classList.toggle('menu-open', open);
      btn.setAttribute('aria-expanded', String(open));
      btn.textContent = open ? T('Fermer', 'Close') : 'Menu';
      tone();
      if (window.lockScroll) lockScroll(open);
      if (open) { menu.removeAttribute('inert'); setTimeout(() => menu.querySelector('nav a')?.focus({ preventScroll: true }), 60); }
      else { menu.setAttribute('inert', ''); if (focus) btn.focus({ preventScroll: true }); }
    }
    btn.addEventListener('click', () => setMenu(!b.classList.contains('menu-open')));
    menu.addEventListener('click', e => { if (e.target.closest('a[href^="#"]')) setMenu(false, false); });
    addEventListener('keydown', e => { if (e.key === 'Escape' && b.classList.contains('menu-open')) setMenu(false); });
    matchMedia('(max-width: 860px)').addEventListener('change', e => { if (!e.matches && b.classList.contains('menu-open')) setMenu(false, false); });
    const tz = menu.querySelectorAll('[data-tz]');
    const tick = () => tz.forEach(el => { el.textContent = new Intl.DateTimeFormat(T('fr-FR', 'en-GB'), { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: el.dataset.tz }).format(new Date()); });
    tick(); setInterval(() => { if (b.classList.contains('menu-open')) tick(); }, 1000);
  };

  // Flèche éditoriale (trait droit, pointe en deux courbes)
  window.ARROW = '<svg class="arr arr-ed" viewBox="0 0 24 16" aria-hidden="true"><path d="M2 8h19" /><path d="M15 1.5c.9 3.4 3.1 5.7 7 6.5-3.9.8-6.1 3.1-7 6.5" /></svg>';

  window.esc = esc;
})();
