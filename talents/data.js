/* =========================================================
   TALENTS BY DAKĒ — données de démo (maquette)
   Noms, mensurations et chiffres fictifs. Les chemins d'images
   sont relatifs au dossier /talents ; chaque page ajoute son préfixe.
   ========================================================= */
window.TALENTS = [
  {
    slug: 'prune', code: 't.01', first: 'Prune', last: 'Gauthier',
    cats: ['mannequin'], specs: ['Publicité', 'Commercial'], city: 'Paris',
    fiche: { taille: 176, poitrine: 82, tailleT: 61, hanches: 89, pointure: 39, yeux: 'Noisette', cheveux: 'Châtain' },
    cover: 'img/prune/web/polas-01.jpg',
    polas: [['img/prune/web/polas-01.jpg', 'Portrait'], ['img/prune/web/polas-02.jpg', 'Face'], ['img/prune/web/polas-03.jpg', 'Profil'], ['img/prune/web/polas-04.jpg', '3/4'], ['img/prune/web/polas-05.jpg', 'Pied face'], ['img/prune/web/polas-06.jpg', 'Pied profil'], ['img/prune/web/polas-07.jpg', 'Pied 3/4'], ['img/prune/web/polas-08.jpg', 'Pose'], ['img/prune/web/polas-09.jpg', 'Pose dos'], ['img/prune/web/polas-10.jpg', 'Assise'], ['img/prune/web/polas-11.jpg', 'Assise'], ['img/prune/web/polas-12.jpg', 'Assise pied']],
    book: ['img/prune/web/book-01.jpg', 'img/prune/web/book-02.jpg', 'img/prune/web/book-03.jpg', 'img/prune/web/book-04.jpg', 'img/prune/web/book-05.jpg', 'img/prune/web/book-06.jpg', 'img/prune/web/book-07.jpg', 'img/prune/web/book-08.jpg', 'img/prune/web/book-09.jpg', 'img/prune/web/book-10.jpg', 'img/prune/web/book-11.jpg', 'img/prune/web/book-12.jpg', 'img/prune/web/book-13.jpg'],
    // Carte composite : portrait + pied face + pied profil + assise + une image du book
    composite: ['img/prune/web/polas-05.jpg', 'img/prune/web/polas-06.jpg', 'img/prune/web/polas-12.jpg', 'img/prune/web/book-07.jpg'],
    video: { src: 'img/prune/web/film.mp4', poster: 'img/prune/web/film-poster.jpg', title: 'Film, campagne Daké', len: '0:30' },
    social: null
  },
  {
    slug: 'awa', code: 't.02', first: 'Awa', last: 'Diallo',
    cats: ['comedien', 'influence'], city: 'Paris',
    fiche: { taille: 170, poitrine: 84, tailleT: 64, hanches: 92, pointure: 38, yeux: 'Marron', cheveux: 'Noir, tresses' },
    cover: '../img/pola-tresses.jpg',
    polas: [['../img/pola-tresses.jpg', 'Face'], ['img/boucles.jpg', 'Profil'], ['img/jean-studio.jpg', 'Pied'], ['img/boucles-regard.jpg', '3/4']],
    book: ['img/boucles-regard.jpg', '../img/sol-bleu.jpg', 'img/chemise.jpg', 'img/dehors.jpg', 'img/tapis.jpg', 'img/jean-portrait.jpg'],
    video: { src: '../video/bandedemo/apercu.mp4', poster: '../video/bandedemo/apercu.jpg', title: 'Bande démo, scène dramatique', len: '1:12' },
    social: {
      ig: { handle: '@awa.dll', followers: 21400, er: 6.3, likes: 1350, views: 9800, growth: 3.9, spark: [16, 16.5, 17, 17.6, 18, 18.4, 19, 19.5, 20, 20.6, 21, 21.4] },
      tt: { handle: '@awadiallo', followers: 312000, er: 9.4, likes: 27400, views: 210000, growth: 18.2, spark: [120, 140, 152, 171, 190, 205, 226, 241, 260, 278, 296, 312] },
      gender: [64, 34, 2],
      ages: [['13–17', 14], ['18–24', 46], ['25–34', 28], ['35–44', 9], ['45+', 3]],
      geo: [['Paris', 29], ['Abidjan', 12], ['Dakar', 8], ['Lyon', 6], ['Bruxelles', 5]],
      brands: ['Fenty Beauty', 'Netflix FR', 'Canal+', 'Orange', 'Maison Château Rouge']
    }
  },
  {
    slug: 'sacha', code: 't.03', first: 'Sacha', last: 'Lemoine',
    cats: ['mannequin'], city: 'Paris',
    fiche: { taille: 178, poitrine: 80, tailleT: 60, hanches: 88, pointure: 40, yeux: 'Verts', cheveux: 'Brun' },
    cover: '../img/bw-assise.jpg',
    polas: [['../img/bw-assise.jpg', 'Face'], ['../img/bw-lampe.jpg', 'Profil'], ['../img/bw-denim.jpg', 'Pied'], ['../img/bw-sol.jpg', '3/4']],
    book: ['../img/bw-lampe.jpg', '../img/debardeur-chaud.jpg', '../img/bw-denim.jpg', '../img/hoodie.jpg', 'img/escarpins.jpg', '../img/sol-bleu.jpg'],
    video: { src: '../video/hero-desktop.mp4', poster: '../video/hero-desktop.jpg', title: 'Walk + digitals en mouvement', len: '0:24' },
    social: null
  },
  {
    slug: 'lou', code: 't.04', first: 'Lou', last: 'Ferreira',
    cats: ['mannequin', 'comedien'], city: 'Lyon',
    fiche: { taille: 174, poitrine: 83, tailleT: 62, hanches: 90, pointure: 39, yeux: 'Bleus', cheveux: 'Roux' },
    cover: 'img/rousse-sourire.jpg',
    polas: [['img/rousse-sourire.jpg', 'Face'], ['img/rousse-rire.jpg', 'Expression'], ['img/jean-studio.jpg', 'Pied'], ['img/chemise.jpg', '3/4']],
    book: ['img/rousse-rire.jpg', 'img/chemise.jpg', 'img/dehors.jpg', 'img/blazer.jpg', '../img/rideau-bleu.jpg', 'img/tapis.jpg'],
    video: { src: '../video/bandedemo/apercu.mp4', poster: '../video/bandedemo/apercu.jpg', title: 'Self-tape, monologue', len: '1:12' },
    social: {
      ig: { handle: '@lou.frr', followers: 12800, er: 5.6, likes: 720, views: 6100, growth: 2.4, spark: [10.4, 10.6, 10.9, 11.1, 11.3, 11.6, 11.8, 12, 12.2, 12.4, 12.6, 12.8] },
      tt: { handle: '@loufrr', followers: 9400, er: 8.2, likes: 1100, views: 14000, growth: 9.1, spark: [3, 3.6, 4.1, 4.9, 5.5, 6, 6.6, 7.2, 7.8, 8.4, 8.9, 9.4] },
      gender: [58, 40, 2],
      ages: [['13–17', 6], ['18–24', 35], ['25–34', 38], ['35–44', 15], ['45+', 6]],
      geo: [['Lyon', 31], ['Paris', 22], ['Genève', 7], ['Grenoble', 5], ['Lisbonne', 4]],
      brands: ['Aesop', 'Make My Lemonade']
    }
  },
  {
    slug: 'camille', code: 't.05', first: 'Camille', last: 'Okafor',
    cats: ['comedien'], city: 'Paris',
    fiche: { taille: 168, poitrine: 85, tailleT: 65, hanches: 94, pointure: 38, yeux: 'Marron', cheveux: 'Bouclés, noir' },
    cover: 'img/boucles.jpg',
    polas: [['img/boucles.jpg', 'Face'], ['img/boucles-regard.jpg', 'Profil'], ['img/jean-studio.jpg', 'Pied'], ['img/jean-portrait.jpg', '3/4']],
    book: ['img/jean-portrait.jpg', 'img/backstage.jpg', 'img/demo.jpg', 'img/dehors.jpg', '../img/sol-bleu.jpg', 'img/tapis.jpg'],
    video: { src: '../video/bandedemo/apercu.mp4', poster: '../video/bandedemo/apercu.jpg', title: 'Bande démo, deux scènes', len: '1:12' },
    social: null
  },
  {
    slug: 'nora', code: 't.06', first: 'Nora', last: 'Benali',
    cats: ['influence', 'mannequin'], city: 'Marseille',
    fiche: { taille: 172, poitrine: 81, tailleT: 61, hanches: 88, pointure: 38, yeux: 'Noirs', cheveux: 'Brun' },
    cover: '../img/rouge.jpg',
    polas: [['../img/rouge.jpg', 'Face'], ['../img/denim-brun.jpg', 'Profil'], ['../img/film-pied.jpg', 'Pied'], ['../img/hoodie.jpg', '3/4']],
    book: ['../img/denim-brun.jpg', '../img/hoodie.jpg', 'img/veste-rouge.jpg', '../img/film-pied.jpg', 'img/escarpins.jpg', '../img/debardeur-chaud.jpg'],
    video: { src: '../video/hero-desktop.mp4', poster: '../video/hero-desktop.jpg', title: 'Contenu UGC, format vertical', len: '0:24' },
    social: {
      ig: { handle: '@nora.bnl', followers: 89300, er: 3.9, likes: 3400, views: 27000, growth: 4.1, spark: [70, 72, 74, 75, 77, 79, 81, 83, 84, 86, 88, 89.3] },
      tt: { handle: '@norabnl', followers: 54700, er: 6.6, likes: 4100, views: 39000, growth: 7.8, spark: [28, 31, 33, 36, 38, 41, 43, 45, 48, 50, 52, 54.7] },
      gender: [81, 18, 1],
      ages: [['13–17', 7], ['18–24', 38], ['25–34', 39], ['35–44', 11], ['45+', 5]],
      geo: [['Marseille', 24], ['Paris', 21], ['Alger', 8], ['Nice', 6], ['Montpellier', 5]],
      brands: ['Jacquemus', 'Sephora', 'Zara', 'Lancôme']
    }
  },
  {
    slug: 'jade', code: 't.07', first: 'Jade', last: 'Morel',
    cats: ['mannequin'], city: 'Paris',
    fiche: { taille: 177, poitrine: 79, tailleT: 59, hanches: 87, pointure: 40, yeux: 'Gris', cheveux: 'Blond foncé' },
    cover: '../img/sol-bleu.jpg',
    polas: [['../img/sol-bleu.jpg', 'Face'], ['../img/bw-lampe.jpg', 'Profil'], ['../img/jean-pied.jpg', 'Pied'], ['../img/bw-denim.jpg', '3/4']],
    book: ['../img/bw-denim.jpg', 'img/escarpins.jpg', '../img/rideau-bleu.jpg', 'img/blazer.jpg', '../img/bw-assise.jpg', '../img/debardeur-chaud.jpg'],
    video: { src: '../video/hero-desktop.mp4', poster: '../video/hero-desktop.jpg', title: 'Digitals en mouvement', len: '0:24' },
    social: null
  },
  {
    slug: 'maya', code: 't.08', first: 'Maya', last: 'Laurent',
    cats: ['comedien', 'mannequin'], city: 'Bruxelles',
    fiche: { taille: 171, poitrine: 82, tailleT: 63, hanches: 91, pointure: 39, yeux: 'Noisette', cheveux: 'Châtain clair' },
    cover: 'img/veste-rouge.jpg',
    polas: [['img/veste-rouge.jpg', 'Face'], ['img/chemise.jpg', 'Profil'], ['img/jean-studio.jpg', 'Pied'], ['img/blazer.jpg', '3/4']],
    book: ['img/blazer.jpg', 'img/dehors.jpg', 'img/backstage.jpg', '../img/rouge.jpg', 'img/tapis.jpg', 'img/demo.jpg'],
    video: { src: '../video/bandedemo/apercu.mp4', poster: '../video/bandedemo/apercu.jpg', title: 'Bande démo, comédie', len: '1:12' },
    social: null
  }
];

// Démo uniquement : complète chaque série à 8 polas avec des images du book
TALENTS.forEach(t => {
  const extra = ['Profil droit', 'Sourire', 'Dos', 'Mains'];
  t.book.slice(0, Math.max(0, 8 - t.polas.length)).forEach((b, k) => t.polas.push([b, extra[k]]));
});

window.CAT_LABEL = { mannequin: 'Mannequin', comedien: 'Comédien·ne', influence: 'Influence' };

/* Utilitaires partagés */
window.TU = {
  get(slug) { return TALENTS.find(t => t.slug === slug) || TALENTS[0]; },
  cats(t) { return t.cats.map(c => CAT_LABEL[c]).concat(t.specs || []).join(' · '); },
  k(n) { return n >= 1e6 ? (n / 1e6).toFixed(1).replace('.', ',') + ' M' : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e5 ? 0 : 1).replace('.', ',').replace(',0', '') + ' k' : String(n); },
  pct(n) { return n.toFixed(1).replace('.', ',') + ' %'; },
  // Courbe d'abonnés sur 12 mois, en SVG
  spark(vals, w = 240, h = 56) {
    const min = Math.min(...vals), max = Math.max(...vals), pad = 3;
    const pts = vals.map((v, i) => [pad + i * (w - 2 * pad) / (vals.length - 1), h - pad - (v - min) / (max - min || 1) * (h - 2 * pad)]);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const last = pts[pts.length - 1];
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><path d="${d} L ${last[0]} ${h} L ${pad} ${h} Z" class="spark-area"/><path d="${d}" class="spark-line"/><circle cx="${last[0]}" cy="${last[1]}" r="3" class="spark-dot"/></svg>`;
  },
  // Total audience (IG + TT) et ER moyen pondéré
  reach(s) { return s.ig.followers + s.tt.followers; },
  erAvg(s) { return (s.ig.er * s.ig.followers + s.tt.er * s.tt.followers) / (s.ig.followers + s.tt.followers); }
};

/* =========================================================
   SÉLECTIONS PAR PROSPECT
   Deux façons de faire un lien :
   1. Préréglée ici  → v1/?sel=sezane
   2. À la volée     → v1/?pour=Sézane&projet=Campagne%20SS27&ids=prune,lou,jade
      (le plus simple : passer par v1/prospection/, protégé par code, qui fabrique le lien)
   ========================================================= */
window.SELECTIONS = {
  sezane: { client: 'Sézane', project: 'Campagne printemps-été 2027', ids: ['prune', 'lou', 'jade', 'maya'], note: 'Quatre visages naturels, à l’aise en mouvement, pour une campagne lumière du jour.' }
};

TU.selection = function () {
  const q = new URLSearchParams(location.search);
  let s = null;
  if (q.get('sel') && SELECTIONS[q.get('sel')]) s = { ...SELECTIONS[q.get('sel')], key: q.get('sel') };
  else if (q.get('ids')) s = { client: q.get('pour') || '', project: q.get('projet') || '', note: q.get('note') || '', ids: q.get('ids').split(',') };
  if (!s) return null;
  s.talents = s.ids.map(id => TALENTS.find(t => t.slug === id)).filter(Boolean);
  if (!s.talents.length) return null;
  // Paramètres à recopier sur chaque lien pour garder le contexte de la sélection
  const keep = new URLSearchParams();
  if (s.key) keep.set('sel', s.key);
  else { keep.set('ids', s.ids.join(',')); if (s.client) keep.set('pour', s.client); if (s.project) keep.set('projet', s.project); if (s.note) keep.set('note', s.note); }
  s.qs = keep.toString();
  return s;
};

TU.mailFor = function (sel, talents) {
  const names = talents.map(t => t.first + ' ' + t.last).join(', ');
  const subj = sel ? `Sélection ${sel.client || 'Daké'} : ${names}` : `Booking ${names}`;
  const body = sel ? `Bonjour,\n\nNous souhaitons poser une option sur : ${names}${sel.project ? '\nProjet : ' + sel.project : ''}\nDates envisagées : \n\nMerci !` : '';
  return `mailto:booking@dake.studio?subject=${encodeURIComponent(subj)}${body ? '&body=' + encodeURIComponent(body) : ''}`;
};
