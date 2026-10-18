/* =========================================================
   FACE BY DAKĒ — tunnel « Booker » (même principe que FACE)
   Tout lien ou bouton [data-book="slug,slug"] ouvre le panneau,
   talents pré-cochés. Envoi par mail pré-rempli + récap copiable.
   Le brouillon est gardé dans ce navigateur (localStorage).
   ========================================================= */
(function () {
  const P = window.TALENTS_PREFIX || '../';
  const KEY = 'dake-talents-booking';
  const STEPS = T(['Talents', 'Projet', 'Dates & budget', 'Contact', 'Récapitulatif'], ['Talents', 'Project', 'Dates & budget', 'Contact', 'Summary']);
  const TYPES = T(['Campagne', 'Publicité', 'Éditorial', 'E-shop / lookbook', 'Contenu UGC', 'Défilé / événement', 'Film / série', 'Autre'], ['Campaign', 'Advertising', 'Editorial', 'E-commerce / lookbook', 'UGC content', 'Runway / event', 'Film / series', 'Other']);
  const USAGES = T(['Réseaux sociaux', 'Web', 'Print', 'Affichage', 'TV / cinéma', 'Interne'], ['Social media', 'Web', 'Print', 'Out of home', 'TV / cinema', 'Internal']);
  const DURS = T(['½ journée', '1 jour', '2 jours', '3 jours et +'], ['½ day', '1 day', '2 days', '3 days +']);
  const BUDGETS = T(['À définir', '< 1 000 €', '1 000 – 3 000 €', '3 000 – 8 000 €', '8 000 € +'], ['To be defined', '< €1,000', '€1,000 – 3,000', '€3,000 – 8,000', '€8,000 +']);
  const OPT = T('facultatif', 'optional');
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const blank = () => ({ kind: 'booking', talents: [], type: '', usages: [], brand: '', brief: '', date: '', duration: '', city: 'Paris', flexible: false, budget: '', first: '', last: '', role: '', email: '', phone: '', message: '' });
  let state = blank();
  try { const d = JSON.parse(localStorage.getItem(KEY) || 'null'); if (d) state = Object.assign(blank(), d, { talents: [], kind: 'booking' }); } catch (e) {}
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
            <h3>${T('Quel <em>talent ?</em>', 'Which <em>talent?</em>')}</h3>
            <p class="hint">${T('Un ou plusieurs profils. Tu pourras en ajouter après.', 'One or more profiles. You can add more later.')}</p>
            <div class="bk-talents" id="bk-talents"></div>
            <p class="err" id="err-talents">${T('Choisis au moins un talent.', 'Pick at least one talent.')}</p>
          </section>

          <section class="bk-step" data-step="2" hidden>
            <h3>${T('Le <em>projet</em>', 'The <em>project</em>')}</h3>
            <p class="hint">${T('Pour qu\'on te réponde avec un vrai devis.', 'So we can reply with a real quote.')}</p>
            <div class="field"><span class="label">${T('Type de projet', 'Project type')}</span><div class="chips" data-single="type">${TYPES.map(x => `<button type="button" class="chip" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div><p class="err" id="err-type">${T('Choisis un type de projet.', 'Pick a project type.')}</p></div>
            <div class="field"><span class="label">${T('Diffusion', 'Usage')} <span class="opt">${T('plusieurs choix', 'multiple choice')}</span></span><div class="chips" data-multi="usages">${USAGES.map(x => `<button type="button" class="chip" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div></div>
            <div class="field"><label for="bk-brand">${T('Marque ou société', 'Brand or company')}</label><input class="input" id="bk-brand" data-f="brand" autocomplete="organization"><p class="err" id="err-brand">${T('Indique la marque ou la société.', 'Enter the brand or company.')}</p></div>
            <div class="field"><label for="bk-brief">${T('Le projet en deux lignes', 'The project in two lines')} <span class="opt">${OPT}</span></label><textarea class="input" id="bk-brief" data-f="brief" placeholder="${T('Ambiance, références, nombre de looks…', 'Mood, references, number of looks…')}"></textarea></div>
          </section>

          <section class="bk-step" data-step="3" hidden>
            <h3>${T('Quand, où, <em>combien ?</em>', 'When, where, <em>how much?</em>')}</h3>
            <p class="hint" id="bk-hint3">${T('Une estimation suffit, on affine ensemble.', 'An estimate is enough, we\'ll refine it together.')}</p>
            <div class="row2">
              <div class="field"><label for="bk-date">${T('Date souhaitée', 'Preferred date')}</label><input class="input" id="bk-date" type="date" data-f="date"><p class="err" id="err-date">${T('Choisis une date à venir.', 'Pick a future date.')}</p></div>
              <div class="field"><label for="bk-city">${T('Ville', 'City')}</label><input class="input" id="bk-city" data-f="city" autocomplete="address-level2"></div>
            </div>
            <label class="check"><input type="checkbox" id="bk-flex"><span>${T('Dates flexibles', 'Flexible dates')}</span></label>
            <div class="field"><span class="label">${T('Durée', 'Duration')}</span><div class="chips" data-single="duration">${DURS.map(x => `<button type="button" class="chip" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div><p class="err" id="err-duration">${T('Choisis une durée.', 'Pick a duration.')}</p></div>
            <div class="field"><span class="label">${T('Budget talent', 'Talent budget')}</span><div class="chips" data-single="budget">${BUDGETS.map(x => `<button type="button" class="chip" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div></div>
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
      paint(); $('#err-talents').classList.remove('on');
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
    const n = state.talents.length;
    $('#bk-next').textContent = step === 1 && n ? `${T('Continuer avec', 'Continue with')} ${n === 1 ? names()[0].split(' ')[0] : n + ' talents'}` : step === 4 ? T('Voir le récapitulatif', 'See the summary') : T('Continuer', 'Continue');
  }

  function valid(s) {
    const bad = [];
    if (s === 1 && !state.talents.length) bad.push('talents');
    if (s === 2) { if (!state.type) bad.push('type'); if (!state.brand.trim()) bad.push('brand'); }
    if (s === 3) { if (!state.date || state.date < today()) bad.push('date'); if (!state.duration) bad.push('duration'); }
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
      [T('Demande', 'Request'), state.kind === 'option' ? T('Option (pré-réservation des dates)', 'Hold (dates pencilled in)') : 'Booking'],
      ['Talent' + (state.talents.length > 1 ? 's' : ''), names().join(', ')],
      [T('Projet', 'Project'), [state.type, state.brand].filter(Boolean).join(' · ')],
      [T('Diffusion', 'Usage'), state.usages.join(', ')],
      ['Date', fmtDate(state.date) + (state.flexible ? ' (flexible)' : '')],
      [T('Durée', 'Duration'), state.duration],
      [T('Lieu', 'Location'), state.city],
      ['Budget', state.budget],
      ['Contact', [`${state.first} ${state.last}`.trim(), state.role].filter(Boolean).join(', ')],
      ['Email', state.email], [T('Téléphone', 'Phone'), state.phone],
      ['Brief', state.brief], ['Message', state.message]
    ].filter(r => r[1] && String(r[1]).trim());
  }
  function recapText() {
    return [T('Bonjour,', 'Hello,'), '', (state.kind === 'option' ? T('Je souhaite poser une option via Face by Daké :', 'I would like to put a hold via Face by Daké:') : T('Nouvelle demande de booking via Face by Daké :', 'New booking request via Face by Daké:')), '', ...rows().map(([k, v]) => `${k}${T(' :', ':')} ${v}`), '', T('Merci !', 'Thank you!'), state.first].join('\n');
  }
  function mailHref() {
    const subject = `${state.kind === 'option' ? 'Option' : 'Booking'} ${names().join(', ')} – ${state.brand || state.type}${state.date ? ' – ' + new Date(state.date + 'T12:00').toLocaleDateString(T('fr-FR', 'en-GB'), { day: 'numeric', month: 'short' }) : ''}`;
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
    state.kind = kind === 'option' ? 'option' : 'booking';
    $('#bk-title').textContent = state.kind === 'option' ? T('Poser une option', 'Put a hold') : T('Demande de booking', 'Booking request');
    $('#bk-send').textContent = state.kind === 'option' ? T("Envoyer l'option", 'Send the hold') : T('Envoyer la demande', 'Send the request');
    state.talents = ids.filter(id => TALENTS.some(t => t.slug === id));
    // Talents déjà choisis : on passe directement au projet
    go(state.talents.length ? 2 : 1);
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
