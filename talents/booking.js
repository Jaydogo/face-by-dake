/* =========================================================
   FACE BY DAKĒ — tunnel « Booker » (même principe que FACE)
   Tout lien ou bouton [data-book="slug,slug"] ouvre le panneau,
   talents pré-cochés. Envoi par mail pré-rempli + récap copiable.
   Le brouillon est gardé dans ce navigateur (localStorage).
   ========================================================= */
(function () {
  const P = window.TALENTS_PREFIX || '../';
  const KEY = 'dake-talents-booking';
  const STEPS = ['Talents', 'Projet', 'Dates & budget', 'Contact', 'Récapitulatif'];
  const TYPES = ['Campagne', 'Publicité', 'Éditorial', 'E-shop / lookbook', 'Contenu UGC', 'Défilé / événement', 'Film / série', 'Autre'];
  const USAGES = ['Réseaux sociaux', 'Web', 'Print', 'Affichage', 'TV / cinéma', 'Interne'];
  const DURS = ['½ journée', '1 jour', '2 jours', '3 jours et +'];
  const BUDGETS = ['À définir', '< 1 000 €', '1 000 – 3 000 €', '3 000 – 8 000 €', '8 000 € +'];
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
          <div class="bk-top"><h2 class="bk-title" id="bk-title">Demande de booking</h2><button class="bk-x" type="button" data-close aria-label="Fermer"><span></span></button></div>
          <div class="bk-progress" aria-hidden="true">${STEPS.map(() => '<span></span>').join('')}</div>
          <p class="bk-steplabel"><span id="bk-n"></span><span id="bk-name"></span></p>
        </div>
        <div class="bk-body" data-lenis-prevent>

          <section class="bk-step" data-step="1">
            <h3>Quel <em>talent ?</em></h3>
            <p class="hint">Un ou plusieurs profils. Tu pourras en ajouter après.</p>
            <div class="bk-talents" id="bk-talents"></div>
            <p class="err" id="err-talents">Choisis au moins un talent.</p>
          </section>

          <section class="bk-step" data-step="2" hidden>
            <h3>Le <em>projet</em></h3>
            <p class="hint">Pour qu'on te réponde avec un vrai devis.</p>
            <div class="field"><span class="label">Type de projet</span><div class="chips" data-single="type">${TYPES.map(x => `<button type="button" class="chip" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div><p class="err" id="err-type">Choisis un type de projet.</p></div>
            <div class="field"><span class="label">Diffusion <span class="opt">plusieurs choix</span></span><div class="chips" data-multi="usages">${USAGES.map(x => `<button type="button" class="chip" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div></div>
            <div class="field"><label for="bk-brand">Marque ou société</label><input class="input" id="bk-brand" data-f="brand" autocomplete="organization"><p class="err" id="err-brand">Indique la marque ou la société.</p></div>
            <div class="field"><label for="bk-brief">Le projet en deux lignes <span class="opt">facultatif</span></label><textarea class="input" id="bk-brief" data-f="brief" placeholder="Ambiance, références, nombre de looks…"></textarea></div>
          </section>

          <section class="bk-step" data-step="3" hidden>
            <h3>Quand, où, <em>combien ?</em></h3>
            <p class="hint" id="bk-hint3">Une estimation suffit, on affine ensemble.</p>
            <div class="row2">
              <div class="field"><label for="bk-date">Date souhaitée</label><input class="input" id="bk-date" type="date" data-f="date"><p class="err" id="err-date">Choisis une date à venir.</p></div>
              <div class="field"><label for="bk-city">Ville</label><input class="input" id="bk-city" data-f="city" autocomplete="address-level2"></div>
            </div>
            <label class="check"><input type="checkbox" id="bk-flex"><span>Dates flexibles</span></label>
            <div class="field"><span class="label">Durée</span><div class="chips" data-single="duration">${DURS.map(x => `<button type="button" class="chip" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div><p class="err" id="err-duration">Choisis une durée.</p></div>
            <div class="field"><span class="label">Budget talent</span><div class="chips" data-single="budget">${BUDGETS.map(x => `<button type="button" class="chip" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div></div>
          </section>

          <section class="bk-step" data-step="4" hidden>
            <h3>Tes <em>coordonnées</em></h3>
            <p class="hint">Réponse sous 24 h ouvrées.</p>
            <div class="row2">
              <div class="field"><label for="bk-first">Prénom</label><input class="input" id="bk-first" data-f="first" autocomplete="given-name"><p class="err" id="err-first">Ton prénom.</p></div>
              <div class="field"><label for="bk-last">Nom <span class="opt">facultatif</span></label><input class="input" id="bk-last" data-f="last" autocomplete="family-name"></div>
            </div>
            <div class="field"><label for="bk-role">Fonction <span class="opt">facultatif</span></label><input class="input" id="bk-role" data-f="role" placeholder="Directrice artistique, chef de projet…" autocomplete="organization-title"></div>
            <div class="field"><label for="bk-email">Email</label><input class="input" id="bk-email" type="email" inputmode="email" data-f="email" autocomplete="email"><p class="err" id="err-email">Un email valide.</p></div>
            <div class="field"><label for="bk-phone">Téléphone <span class="opt">facultatif</span></label><input class="input" id="bk-phone" type="tel" inputmode="tel" data-f="phone" autocomplete="tel"></div>
            <div class="field"><label for="bk-msg">Message <span class="opt">facultatif</span></label><textarea class="input" id="bk-msg" data-f="message"></textarea></div>
          </section>

          <section class="bk-step" data-step="5" hidden>
            <h3>On <em>récapitule</em></h3>
            <p class="hint">Vérifie, puis envoie : ta messagerie s'ouvre avec tout pré-rempli.</p>
            <dl class="bk-recap" id="bk-recap"></dl>
          </section>

          <section class="bk-step bk-done" data-step="6" hidden>
            <h3>Demande <em>prête.</em></h3>
            <p class="hint">Si ta messagerie ne s'est pas ouverte, copie le récap et envoie-le à <a href="mailto:${ECO.mail}">${ECO.mail}</a>.</p>
            <button class="btn btn--ghost" type="button" id="bk-copy2">Copier le récap</button>
          </section>
        </div>
        <div class="bk-toast" id="bk-toast" role="status" aria-live="polite"></div>
        <div class="bk-foot">
          <div class="bk-actions">
            <button class="btn btn--ghost" type="button" id="bk-back">Retour</button>
            <button class="btn" type="button" id="bk-next">Continuer</button>
            <a class="btn" id="bk-send" href="#" hidden>Envoyer la demande</a>
          </div>
          <button class="bk-copy" type="button" id="bk-copy" hidden>ou copier le récapitulatif</button>
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
    $('#bk-next').textContent = step === 1 && n ? `Continuer avec ${n === 1 ? names()[0].split(' ')[0] : n + ' talents'}` : step === 4 ? 'Voir le récapitulatif' : 'Continuer';
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
  const fmtDate = d => d ? new Date(d + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '';
  function rows() {
    return [
      ['Demande', state.kind === 'option' ? 'Option (pré-réservation des dates)' : 'Booking'],
      ['Talent' + (state.talents.length > 1 ? 's' : ''), names().join(', ')],
      ['Projet', [state.type, state.brand].filter(Boolean).join(' · ')],
      ['Diffusion', state.usages.join(', ')],
      ['Date', fmtDate(state.date) + (state.flexible ? ' (flexible)' : '')],
      ['Durée', state.duration],
      ['Lieu', state.city],
      ['Budget', state.budget],
      ['Contact', [`${state.first} ${state.last}`.trim(), state.role].filter(Boolean).join(', ')],
      ['Email', state.email], ['Téléphone', state.phone],
      ['Brief', state.brief], ['Message', state.message]
    ].filter(r => r[1] && String(r[1]).trim());
  }
  function recapText() {
    return ['Bonjour,', '', (state.kind === 'option' ? 'Je souhaite poser une option via Face by Daké :' : 'Nouvelle demande de booking via Face by Daké :'), '', ...rows().map(([k, v]) => `${k} : ${v}`), '', 'Merci !', state.first].join('\n');
  }
  function mailHref() {
    const subject = `${state.kind === 'option' ? 'Option' : 'Booking'} ${names().join(', ')} – ${state.brand || state.type}${state.date ? ' – ' + new Date(state.date + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''}`;
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
      btn.textContent = ok ? 'Copié ✓' : 'Copie impossible';
      btn.classList.toggle('is-copied', ok);
      clearTimeout(btn._t); btn._t = setTimeout(() => { btn.textContent = btn.dataset.label; btn.classList.remove('is-copied'); }, 2400);
    }
    const t = $('#bk-toast');
    t.innerHTML = ok ? '<span class="bk-toast-ic" aria-hidden="true"></span>Récapitulatif copié, colle-le dans un email' : 'Copie bloquée : le récap est sélectionné, fais Copier';
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
    $('#bk-n').textContent = n <= 5 ? `Étape ${n} sur 5` : 'Envoyé';
    $('#bk-name').textContent = STEPS[n - 1] || '';
    if (n === 5) $('#bk-recap').innerHTML = rows().map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v).replace(/\n/g, '<br>')}</dd>`).join('') + `<button type="button" class="bk-edit" data-go="1">Modifier</button>`;
    $('#bk-next').hidden = n >= 5;
    $('#bk-send').hidden = n !== 5; $('#bk-copy').hidden = n !== 5;
    if (n === 5) $('#bk-send').href = mailHref();
    $('#bk-back').textContent = n === 1 ? 'Fermer' : 'Retour';
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
    $('#bk-title').textContent = state.kind === 'option' ? 'Poser une option' : 'Demande de booking';
    $('#bk-send').textContent = state.kind === 'option' ? "Envoyer l'option" : 'Envoyer la demande';
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
