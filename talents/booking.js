/* =========================================================
   FACE BY DAKĒ — tunnel « Proposer un projet »
   Le client propose une PRODUCTION Daké (concept, direction artistique,
   casting, prise de vue, livrables). Les talents sont un casting envisagé,
   jamais une réservation : pas de date bloquée, pas d'option, pas de budget talent.
   Tout lien ou bouton [data-book="slug,slug"] ouvre le panneau, talents pré-cochés.
   Envoi par mail pré-rempli + récap copiable.
   Le brouillon est gardé dans ce navigateur (localStorage).
   ========================================================= */
(function () {
  const P = window.TALENTS_PREFIX || '../';
  const KEY = 'dake-talents-booking';
  const STEPS = T(['Projet', 'Casting', 'Production', 'Contact', 'Récapitulatif'], ['Project', 'Casting', 'Production', 'Contact', 'Summary']);
  const TYPES = T(['Campagne', 'Contenu réseaux sociaux', 'Éditorial', 'E-shop / lookbook', 'Film / vidéo', 'Événement', 'Autre'], ['Campaign', 'Social content', 'Editorial', 'E-commerce / lookbook', 'Film / video', 'Event', 'Other']);
  const USAGES = T(['Réseaux sociaux', 'Web', 'Print', 'Affichage', 'TV / cinéma', 'Interne'], ['Social media', 'Web', 'Print', 'Out of home', 'TV / cinema', 'Internal']);
  const DELIVERABLES = T(['Photos', 'Vidéo', 'Formats courts', 'Film', 'Direction artistique seule'], ['Photos', 'Video', 'Short formats', 'Film', 'Art direction only']);
  const BUDGETS = T(['À définir', '< 3 000 €', '3 000 – 8 000 €', '8 000 – 20 000 €', '20 000 € +'], ['To be defined', '< €3,000', '€3,000 – 8,000', '€8,000 – 20,000', '€20,000 +']);
  const OPT = T('facultatif', 'optional');
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const blank = () => ({ kind: 'project', talents: [], casting: false, type: '', usages: [], deliverables: [], brand: '', brief: '', date: '', city: 'Paris', flexible: true, budget: '', first: '', last: '', role: '', email: '', phone: '', message: '' });
  let state = blank();
  try { const d = JSON.parse(localStorage.getItem(KEY) || 'null'); if (d) state = Object.assign(blank(), d, { talents: [], kind: 'project' }); if (!Array.isArray(state.deliverables)) state.deliverables = []; } catch (e) {}
  const save = () => { try { const { talents, ...keep } = state; localStorage.setItem(KEY, JSON.stringify(keep)); } catch (e) {} };

  let step = 1, el, lastFocus;
  const $ = s => el.querySelector(s);
  const today = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); };

  function build() {
    el = document.createElement('div');
    el.className = 'booking'; el.id = 'booking';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'bk-title'); el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `
      <div class="booking-scrim" data-close></div>
      <div class="booking-panel" tabindex="-1">
        <div class="bk-head">
          <div class="bk-top"><h2 class="bk-title" id="bk-title"></h2><button class="bk-x" type="button" data-close aria-label="${T('Fermer', 'Close')}"><span></span></button></div>
          <div class="bk-progress" aria-hidden="true">${STEPS.map(() => '<span></span>').join('')}</div>
          <p class="bk-steplabel"><span id="bk-n"></span><span id="bk-name"></span></p>
        </div>
        <div class="bk-body" data-lenis-prevent>

          <section class="bk-step" data-step="1">
            <h3>${T('Votre <em>projet</em>', 'Your <em>project</em>')}</h3>
            <p class="hint">${T('Daké conçoit et produit : direction artistique, casting, prise de vue, livrables.', 'Daké designs and produces: art direction, casting, shoot, deliverables.')}</p>
            <div class="field"><span class="label">${T('Type de production', 'Type of production')}</span><div class="chips" data-single="type">${TYPES.map(x => `<button type="button" class="chip" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div><p class="err" id="err-type">${T('Choisis un type de production.', 'Pick a type of production.')}</p></div>
            <div class="field"><span class="label">${T('Diffusion', 'Usage')} <span class="opt">${T('plusieurs choix', 'multiple choice')}</span></span><div class="chips" data-multi="usages">${USAGES.map(x => `<button type="button" class="chip" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div></div>
            <div class="field"><label for="bk-brand">${T('Marque ou société', 'Brand or company')}</label><input class="input" id="bk-brand" data-f="brand" autocomplete="organization"><p class="err" id="err-brand">${T('Indique la marque ou la société.', 'Enter the brand or company.')}</p></div>
            <div class="field"><label for="bk-brief">${T('Le projet en deux lignes', 'The project in two lines')} <span class="opt">${OPT}</span></label><textarea class="input" id="bk-brief" data-f="brief" placeholder="${T('Ambiance, références, message de la campagne…', 'Mood, references, campaign message…')}"></textarea></div>
          </section>

          <section class="bk-step" data-step="2" hidden>
            <h3>${T('Le <em>casting</em>', 'The <em>casting</em>')}</h3>
            <p class="hint">${T('Des visages Daké Face en tête ? Ils seront intégrés à la production. Sinon, Daké compose le casting.', 'Daké Face profiles in mind? They will be part of the production. Otherwise, Daké builds the casting.')}</p>
            <div class="bk-talents" id="bk-talents"></div>
            <label class="check"><input type="checkbox" id="bk-casting"><span>${T('Laisser Daké proposer le casting', 'Let Daké propose the casting')}</span></label>
          </section>

          <section class="bk-step" data-step="3" hidden>
            <h3>${T('La <em>production</em>', 'The <em>production</em>')}</h3>
            <p class="hint" id="bk-hint3">${T('Une estimation suffit, on affine ensemble.', 'An estimate is enough, we\'ll refine it together.')}</p>
            <div class="field"><span class="label">${T('Livrables', 'Deliverables')} <span class="opt">${T('plusieurs choix', 'multiple choice')}</span></span><div class="chips" data-multi="deliverables">${DELIVERABLES.map(x => `<button type="button" class="chip" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div></div>
            <div class="row2">
              <div class="field"><label for="bk-date">${T('Période envisagée', 'Target timing')} <span class="opt">${OPT}</span></label><input class="input" id="bk-date" type="date" data-f="date"><p class="err" id="err-date">${T('Choisis une date à venir.', 'Pick a future date.')}</p></div>
              <div class="field"><label for="bk-city">${T('Lieu', 'Location')}</label><input class="input" id="bk-city" data-f="city" autocomplete="address-level2"></div>
            </div>
            <label class="check"><input type="checkbox" id="bk-flex"><span>${T('Calendrier flexible', 'Flexible timing')}</span></label>
            <div class="field"><span class="label">${T('Budget de production', 'Production budget')}</span><div class="chips" data-single="budget">${BUDGETS.map(x => `<button type="button" class="chip" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div></div>
          </section>

          <section class="bk-step" data-step="4" hidden>
            <h3>${T('Tes <em>coordonnées</em>', 'Your <em>details</em>')}</h3>
            <p class="hint">${T('Réponse sous 24 h ouvrées.', 'Reply within one business day.')}</p>
            <div class="row2">
              <div class="field"><label for="bk-first">${T('Prénom', 'First name')}</label><input class="input" id="bk-first" data-f="first" autocomplete="given-name"><p class="err" id="err-first">${T('Ton prénom.', 'Your first name.')}</p></div>
              <div class="field"><label for="bk-last">${T('Nom', 'Last name')} <span class="opt">${OPT}</span></label><input class="input" id="bk-last" data-f="last" autocomplete="family-name"></div>
            </div>
            <div class="field"><label for="bk-role">${T('Fonction', 'Role')} <span class="opt">${OPT}</span></label><input class="input" id="bk-role" data-f="role" placeholder="${T('Directrice artistique, chef de projet…', 'Art director, producer…')}" autocomplete="organization-title"></div>
            <div class="field"><label for="bk-email">Email</label><input class="input" id="bk-email" type="email" inputmode="email" data-f="email" autocomplete="email"><p class="err" id="err-email">${T('Un email valide.', 'A valid email.')}</p></div>
            <div class="field"><label for="bk-phone">${T('Téléphone', 'Phone')} <span class="opt">${OPT}</span></label><input class="input" id="bk-phone" type="tel" inputmode="tel" data-f="phone" autocomplete="tel"></div>
            <div class="field"><label for="bk-msg">Message <span class="opt">${OPT}</span></label><textarea class="input" id="bk-msg" data-f="message"></textarea></div>
          </section>

          <section class="bk-step" data-step="5" hidden>
            <h3>${T('On <em>récapitule</em>', 'Quick <em>recap</em>')}</h3>
            <p class="hint">${T('Vérifie, puis envoie : ta messagerie s\'ouvre avec tout pré-rempli.', 'Check, then send: your email app opens with everything filled in.')}</p>
            <dl class="bk-recap" id="bk-recap"></dl>
          </section>

          <section class="bk-step bk-done" data-step="6" hidden>
            <h3>${T('Demande <em>prête.</em>', 'Request <em>ready.</em>')}</h3>
            <p class="hint">${T('Si ta messagerie ne s\'est pas ouverte, copie le récap et envoie-le à', 'If your email app didn\'t open, copy the summary and send it to')} <a href="mailto:${ECO.mail}">${ECO.mail}</a>.</p>
            <button class="btn btn--ghost" type="button" id="bk-copy2">${T('Copier le récap', 'Copy the summary')}</button>
          </section>
        </div>
        <div class="bk-toast" id="bk-toast" role="status" aria-live="polite"></div>
        <div class="bk-foot">
          <div class="bk-actions">
            <button class="btn btn--ghost" type="button" id="bk-back">${T('Retour', 'Back')}</button>
            <button class="btn" type="button" id="bk-next">${T('Continuer', 'Continue')}</button>
            <a class="btn" id="bk-send" href="#" hidden></a>
          </div>
          <button class="bk-copy" type="button" id="bk-copy" hidden>${T('ou copier le récapitulatif', 'or copy the summary')}</button>
        </div>
      </div>`;
    document.body.appendChild(el);

    // Talents : cartes à cocher
    $('#bk-talents').innerHTML = TALENTS.map(t => `
      <button type="button" class="bk-t" data-id="${t.slug}" aria-pressed="false">
        <span class="bk-t-img"><img src="${TU.src(t.cover)}" alt="" loading="lazy"></span>
        <span class="bk-t-name">${esc(t.first)} <em>${esc(t.last)}</em></span>
        <span class="bk-t-cat">${esc(TU.cats(t))}</span>
        <span class="bk-t-tick" aria-hidden="true"></span>
      </button>`).join('');
    $('#bk-talents').addEventListener('click', e => {
      const b = e.target.closest('.bk-t'); if (!b) return;
      const id = b.dataset.id, k = state.talents.indexOf(id);
      k < 0 ? state.talents.push(id) : state.talents.splice(k, 1);
      paint();
    });

    // Puces à choix unique / multiple
    el.querySelectorAll('[data-single]').forEach(g => g.addEventListener('click', e => {
      const b = e.target.closest('.chip'); if (!b) return;
      const f = g.dataset.single; state[f] = state[f] === b.dataset.v && f === 'budget' ? '' : b.dataset.v;
      paint(); save(); el.querySelector('#err-' + f)?.classList.remove('on');
    }));
    el.querySelectorAll('[data-multi]').forEach(g => g.addEventListener('click', e => {
      const b = e.target.closest('.chip'); if (!b) return;
      const arr = state[g.dataset.multi], k = arr.indexOf(b.dataset.v);
      k < 0 ? arr.push(b.dataset.v) : arr.splice(k, 1);
      paint(); save();
    }));
    el.querySelectorAll('[data-f]').forEach(i => i.addEventListener('input', () => { state[i.dataset.f] = i.value; save(); el.querySelector('#err-' + i.dataset.f)?.classList.remove('on'); }));
    $('#bk-flex').addEventListener('change', e => { state.flexible = e.target.checked; save(); });
    $('#bk-casting').addEventListener('change', e => { state.casting = e.target.checked; save(); });
    $('#bk-date').min = today();

    el.addEventListener('click', e => { if (e.target.closest('[data-close]')) close(); });
    $('#bk-back').addEventListener('click', () => go(step - 1));
    $('#bk-next').addEventListener('click', () => { if (valid(step)) go(step + 1); });
    $('#bk-send').addEventListener('click', () => setTimeout(() => go(6), 300));
    $('#bk-copy').addEventListener('click', copy);
    $('#bk-copy2').addEventListener('click', copy);
    el.addEventListener('keydown', e => {
      if (e.key === 'Escape') close();
      if (e.key === 'Enter' && e.target.matches('input') && step < 5) { e.preventDefault(); $('#bk-next').click(); }
      if (e.key === 'Tab') { // focus piégé dans le panneau
        const f = [...el.querySelectorAll('button:not([hidden]),a[href]:not([hidden]),input,textarea')].filter(x => x.offsetParent);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    });
  }

  function paint() {
    el.querySelectorAll('.bk-t').forEach(b => b.setAttribute('aria-pressed', state.talents.includes(b.dataset.id)));
    el.querySelectorAll('[data-single]').forEach(g => g.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', state[g.dataset.single] === c.dataset.v)));
    el.querySelectorAll('[data-multi]').forEach(g => g.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', state[g.dataset.multi].includes(c.dataset.v))));
    el.querySelectorAll('[data-f]').forEach(i => { if (i.value !== state[i.dataset.f]) i.value = state[i.dataset.f] || ''; });
    $('#bk-flex').checked = !!state.flexible;
    $('#bk-casting').checked = !!state.casting;
    const n = state.talents.length;
    $('#bk-next').textContent = step === 2 && n ? `${T('Continuer avec', 'Continue with')} ${n === 1 ? names()[0].split(' ')[0] : n + ' talents'}` : step === 4 ? T('Voir le récapitulatif', 'See the summary') : T('Continuer', 'Continue');
  }

  function valid(s) {
    const bad = [];
    if (s === 1) { if (!state.type) bad.push('type'); if (!state.brand.trim()) bad.push('brand'); }
    if (s === 3 && state.date && state.date < today()) bad.push('date');
    if (s === 4) { if (!state.first.trim()) bad.push('first'); if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(state.email.trim())) bad.push('email'); }
    bad.forEach(k => el.querySelector('#err-' + k)?.classList.add('on'));
    if (bad.length) {
      const first = el.querySelector('#err-' + bad[0]);
      first?.closest('.field, .bk-step')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      el.querySelector('#bk-' + bad[0])?.focus({ preventScroll: true });
      $('.booking-panel').classList.remove('shake'); void el.offsetWidth; $('.booking-panel').classList.add('shake');
    }
    return !bad.length;
  }

  const names = () => state.talents.map(id => { const t = TALENTS.find(x => x.slug === id); return t ? `${t.first} ${t.last}` : id; });
  const fmtDate = d => d ? new Date(d + 'T12:00').toLocaleDateString(T('fr-FR', 'en-GB'), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '';
  function rows() {
    return [
      [T('Demande', 'Request'), T('Projet de production Daké', 'Daké production project')],
      [T('Production', 'Production'), [state.type, state.brand].filter(Boolean).join(' · ')],
      [T('Casting envisagé', 'Casting in mind'), [names().join(', '), state.casting ? (state.talents.length ? T('casting complété par Daké', 'casting completed by Daké') : T('casting proposé par Daké', 'casting proposed by Daké')) : ''].filter(Boolean).join(' + ')],
      [T('Livrables', 'Deliverables'), state.deliverables.join(', ')],
      [T('Diffusion', 'Usage'), state.usages.join(', ')],
      [T('Période', 'Timing'), state.date ? fmtDate(state.date) + (state.flexible ? T(' (flexible)', ' (flexible)') : '') : (state.flexible ? T('Flexible', 'Flexible') : '')],
      [T('Lieu', 'Location'), state.city],
      [T('Budget de production', 'Production budget'), state.budget],
      ['Contact', [`${state.first} ${state.last}`.trim(), state.role].filter(Boolean).join(', ')],
      ['Email', state.email], [T('Téléphone', 'Phone'), state.phone],
      ['Brief', state.brief], ['Message', state.message]
    ].filter(r => r[1] && String(r[1]).trim());
  }
  function recapText() {
    return [T('Bonjour,', 'Hello,'), '', T('Voici un projet que nous aimerions produire avec Daké :', 'Here is a project we would like to produce with Daké:'), '', ...rows().map(([k, v]) => `${k}${T(' :', ':')} ${v}`), '', T('Merci !', 'Thank you!'), state.first].join('\n');
  }
  function mailHref() {
    const subject = `${T('Projet', 'Project')} ${state.brand || state.type}${state.talents.length ? ' – ' + T('avec', 'with') + ' ' + names().join(', ') : ''}${state.date ? ' – ' + new Date(state.date + 'T12:00').toLocaleDateString(T('fr-FR', 'en-GB'), { day: 'numeric', month: 'short' }) : ''}`;
    return `mailto:${ECO.mail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(recapText())}`;
  }
  async function copy(e) {
    const btn = e && e.currentTarget; // gardé avant l'attente, sinon perdu
    const txt = recapText();
    let ok = false;
    try { await navigator.clipboard.writeText(txt); ok = true; }
    catch (_) {
      const ta = document.createElement('textarea'); ta.value = txt; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0';
      el.appendChild(ta); ta.select(); try { ok = document.execCommand('copy'); } catch (__) {} ta.remove();
    }
    if (!ok && step === 5) { // échec : on sélectionne le récap pour un copier à la main
      const r = document.createRange(); r.selectNodeContents($('#bk-recap'));
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    }
    flash(ok, btn);
  }
  // Retour visible : bouton qui passe en « Copié ✓ » + toast en bas du panneau
  let tTimer = 0;
  function flash(ok, btn) {
    if (btn) {
      if (!btn.dataset.label) btn.dataset.label = btn.textContent;
      btn.textContent = ok ? T('Copié ✓', 'Copied ✓') : T('Copie impossible', 'Copy failed');
      btn.classList.toggle('is-copied', ok);
      clearTimeout(btn._t); btn._t = setTimeout(() => { btn.textContent = btn.dataset.label; btn.classList.remove('is-copied'); }, 2400);
    }
    const t = $('#bk-toast');
    t.innerHTML = ok ? '<span class="bk-toast-ic" aria-hidden="true"></span>' + T('Récapitulatif copié, colle-le dans un email', 'Summary copied, paste it into an email') : T('Copie bloquée : le récap est sélectionné, fais Copier', 'Copy blocked: the summary is selected, press Copy');
    t.classList.toggle('is-err', !ok);
    t.classList.remove('on'); void t.offsetWidth; t.classList.add('on');
    clearTimeout(tTimer); tTimer = setTimeout(() => t.classList.remove('on'), 2800);
  }

  function go(n) {
    if (n < 1) return close();
    const back = n < step; step = n;
    el.querySelectorAll('.bk-step').forEach(s => {
      const on = +s.dataset.step === n; s.hidden = !on;
      if (on) { s.classList.remove('enter', 'enter-back'); void s.offsetWidth; s.classList.add(back ? 'enter-back' : 'enter'); }
    });
    el.querySelectorAll('.bk-progress span').forEach((s, i) => s.classList.toggle('done', i < Math.min(n, 5)));
    $('#bk-n').textContent = n <= 5 ? T(`Étape ${n} sur 5`, `Step ${n} of 5`) : T('Envoyé', 'Sent');
    $('#bk-name').textContent = STEPS[n - 1] || '';
    if (n === 5) $('#bk-recap').innerHTML = rows().map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v).replace(/\n/g, '<br>')}</dd>`).join('') + `<button type="button" class="bk-edit" data-go="1">${T('Modifier', 'Edit')}</button>`;
    $('#bk-next').hidden = n >= 5;
    $('#bk-send').hidden = n !== 5; $('#bk-copy').hidden = n !== 5;
    if (n === 5) $('#bk-send').href = mailHref();
    $('#bk-back').textContent = n === 1 ? T('Fermer', 'Close') : T('Retour', 'Back');
    $('#bk-back').hidden = n === 6;
    $('.bk-foot').hidden = n === 6;
    $('.bk-body').scrollTop = 0;
    paint();
    setTimeout(() => el.querySelector(`.bk-step[data-step="${n}"] input, .bk-step[data-step="${n}"] .bk-t, .bk-step[data-step="${n}"] .chip`)?.focus({ preventScroll: true }), 420);
  }

  function open(ids, kind) {
    if (!el) build();
    lastFocus = document.activeElement;
    state.kind = 'project';
    $('#bk-title').textContent = T('Proposer un projet', 'Start a project');
    $('#bk-send').textContent = T('Envoyer le projet', 'Send the project');
    state.talents = ids.filter(id => TALENTS.some(t => t.slug === id));
    // On commence toujours par le projet : c'est la production qui est proposée, pas un talent
    go(1);
    el.classList.add('is-open'); el.setAttribute('aria-hidden', 'false');
    document.body.classList.add('booking-open');
    window.lockScroll?.(true);
    $('.booking-panel').focus({ preventScroll: true });
  }
  function close() {
    el.classList.remove('is-open'); el.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('booking-open');
    window.lockScroll?.(false);
    if (step === 6) { state = Object.assign(blank(), { first: state.first, last: state.last, role: state.role, email: state.email, phone: state.phone, brand: state.brand }); save(); }
    lastFocus?.focus?.({ preventScroll: true });
  }
  el = null;
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-book]'); if (!b) return;
    e.preventDefault();
    if (document.body.classList.contains('menu-open')) document.querySelector('.menu-btn')?.click();
    open((b.dataset.book || '').split(',').filter(Boolean), b.dataset.kind);
  });
  document.addEventListener('click', e => { const g = e.target.closest('.bk-edit'); if (g) go(+g.dataset.go); });
  window.openBooking = open;
})();
