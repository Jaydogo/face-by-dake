/* =========================================================
   FACE BY DAKĒ — langue (FR / EN) et unités (cm·EU / in·US)
   Le back office se remplit en français. En anglais :
   - les textes du site sont traduits dans le code avec T('fr', 'en') ;
   - les valeurs choisies dans des listes (yeux, cheveux, spécialités,
     légendes des polas, langues…) passent par le dictionnaire DICT ;
   - les textes libres utilisent le champ « EN » du back office
     (bio_en, polasTitle_en…), sinon le français.
   ========================================================= */
(function () {
  const q = new URLSearchParams(location.search);
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

  // Langue : ?lang= (lien envoyé à un client) > choix gardé > langue du navigateur
  let lang = q.get('lang');
  if (lang !== 'fr' && lang !== 'en') lang = get('dake-talents-lang');
  if (lang !== 'fr' && lang !== 'en') lang = /^fr\b/i.test(navigator.language || 'fr') ? 'fr' : 'en';
  set('dake-talents-lang', lang);
  window.LANG = lang;
  window.EN = lang === 'en';
  if (!/\/admin\//.test(location.pathname)) document.documentElement.lang = lang;
  window.T = (fr, en) => window.EN ? en : fr;

  // Change de langue : recharge la page avec ?lang=, les autres paramètres sont gardés
  window.setLang = function (l) {
    set('dake-talents-lang', l);
    const u = new URL(location.href);
    u.searchParams.set('lang', l);
    location.href = u.toString();
  };

  /* Dictionnaire FR → EN des valeurs saisies dans le back office.
     Clé en minuscules, sans accents. Un mot absent reste en français
     (le back office le signale). */
  const D = {
    // Yeux
    'noisette': 'Hazel', 'marron': 'Brown', 'brun': 'Brown', 'bruns': 'Brown', 'marron fonce': 'Dark brown', 'noir': 'Black', 'noirs': 'Black',
    'bleu': 'Blue', 'bleus': 'Blue', 'bleu-vert': 'Blue-green', 'bleu vert': 'Blue-green', 'vert': 'Green', 'verts': 'Green',
    'gris': 'Grey', 'gris-bleu': 'Grey-blue', 'gris bleu': 'Grey-blue', 'gris-vert': 'Grey-green', 'gris vert': 'Grey-green', 'ambre': 'Amber', 'vairons': 'Heterochromia',
    // Cheveux
    'chatain': 'Brown', 'chatain clair': 'Light brown', 'chatain fonce': 'Dark brown', 'brune': 'Brunette', 'blond': 'Blonde', 'blonde': 'Blonde',
    'blond fonce': 'Dark blonde', 'blond clair': 'Light blonde', 'blond venitien': 'Strawberry blonde', 'roux': 'Red', 'rousse': 'Red', 'auburn': 'Auburn',
    'blanc': 'White', 'blancs': 'White', 'poivre et sel': 'Salt and pepper', 'rase': 'Shaved', 'chauve': 'Bald', 'boucle': 'Curly', 'boucles': 'Curly',
    'frise': 'Coily', 'crepus': 'Coily', 'tresses': 'Braids', 'locks': 'Locs', 'colores': 'Dyed', 'decolores': 'Bleached',
    // Catégories, disponibilité
    'mannequin': 'Model', 'comedien·ne': 'Actor', 'comedien': 'Actor', 'comedienne': 'Actress', 'influence': 'Influence',
    'disponible': 'Available', 'en option': 'On hold', 'indisponible': 'Unavailable',
    // Spécialités
    'publicite': 'Advertising', 'commercial': 'Commercial', 'defile': 'Runway', 'editorial': 'Editorial', 'e-shop': 'E-commerce', 'e-commerce': 'E-commerce',
    'lookbook': 'Lookbook', 'beaute': 'Beauty', 'mode': 'Fashion', 'lingerie': 'Lingerie', 'maillot de bain': 'Swimwear', 'fitness': 'Fitness', 'sport': 'Sport',
    'parties du corps': 'Body parts', 'mains': 'Hands', 'pieds': 'Feet', 'cheveux': 'Hair', 'showroom': 'Showroom', 'fit model': 'Fit model',
    'cinema': 'Film', 'theatre': 'Theatre', 'television': 'Television', 'tv': 'TV', 'court metrage': 'Short film', 'serie': 'Series', 'doublage': 'Dubbing',
    'voix off': 'Voice-over', 'improvisation': 'Improvisation', 'danse': 'Dance', 'chant': 'Singing', 'musique': 'Music', 'cascades': 'Stunts',
    'ugc': 'UGC', 'contenu ugc': 'UGC content', 'lifestyle': 'Lifestyle', 'voyage': 'Travel', 'food': 'Food', 'cuisine': 'Cooking', 'humour': 'Comedy', 'gaming': 'Gaming',
    'tech': 'Tech', 'famille': 'Family', 'parentalite': 'Parenting', 'bien-etre': 'Wellness', 'deco': 'Interiors', 'evenementiel': 'Events', 'hotesse': 'Hostess',
    // Légendes des polas
    'portrait': 'Portrait', 'face': 'Front', 'profil': 'Profile', '3/4': '3/4', 'pied face': 'Full length, front', 'pied profil': 'Full length, profile',
    'pied 3/4': 'Full length, 3/4', 'dos': 'Back', 'sourire': 'Smile', 'pose': 'Pose', 'assise': 'Seated', 'assise pied': 'Seated, full length', 'pied': 'Full length',
    // Langues
    'francais': 'French', 'anglais': 'English', 'espagnol': 'Spanish', 'italien': 'Italian', 'allemand': 'German', 'portugais': 'Portuguese', 'arabe': 'Arabic',
    'chinois': 'Chinese', 'mandarin': 'Mandarin', 'japonais': 'Japanese', 'coreen': 'Korean', 'russe': 'Russian', 'neerlandais': 'Dutch', 'wolof': 'Wolof',
    'lingala': 'Lingala', 'bambara': 'Bambara', 'dioula': 'Dioula', 'creole': 'Creole', 'hebreu': 'Hebrew', 'turc': 'Turkish', 'polonais': 'Polish',
    'notions': 'basic', 'courant': 'fluent', 'bilingue': 'bilingual', 'natif': 'native', 'langue maternelle': 'native',
    // Villes et pays
    'france': 'France', 'londres': 'London', 'bruxelles': 'Brussels', 'geneve': 'Geneva', 'lisbonne': 'Lisbon', 'barcelone': 'Barcelona', 'milan': 'Milan',
    'cote d\'ivoire': 'Ivory Coast', 'paris, france': 'Paris, France',
    // Textes par défaut du back office
    'pris au studio dake': 'Shot at the Daké studio', 'realisee par dake': 'Directed by Daké', 'au *naturel.*': 'Au *naturel.*',
    'castings en france et a l\'international': 'Castings in France and internationally',
    'film, campagne dake': 'Film, Daké campaign', 'bande demo': 'Showreel', 'bande demo, scene dramatique': 'Showreel, dramatic scene'
  };
  const key = s => String(s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');
  window.DICT = D;
  // Traduction d'une valeur : mot connu → anglais ; liste « a, b » ou « a · b » → chaque élément ; parenthèses gardées
  function tr1(v) {
    const m = String(v).match(/^(.*?)(\s*\(([^)]*)\))?$/);
    const base = D[key(m[1])], par = m[3] && (D[key(m[3])] || m[3]);
    return base ? base + (m[2] ? ` (${par})` : '') : null;
  }
  window.TR = function (v) {
    if (!window.EN || v == null || v === '') return v;
    const whole = tr1(v); if (whole) return whole;
    if (/[,·/]/.test(v) && !/^\d/.test(v)) return String(v).split(/(\s*[,·]\s*|\s+\/\s+)/).map((p, i) => i % 2 ? p : (tr1(p) || p)).join('');
    return v;
  };
  // Mot sans traduction (pour l'avertissement du back office)
  window.TR_MISSING = function (v) {
    if (!v) return [];
    return String(v).split(/\s*[,·]\s*|\s+\/\s+/).filter(p => p.trim() && !/^[\d\s.,/+-]+$/.test(p) && !tr1(p));
  };
  // Texte libre : champ _en s'il est rempli, sinon le français passé au dictionnaire
  window.TX = function (obj, k, fallback) {
    if (!obj) return fallback || '';
    const fr = obj[k] || fallback || '';
    return window.EN ? (obj[k + '_en'] || TR(fr)) : fr;
  };

  /* Unités : métrique (cm, EU) ou américaines (ft/in, US).
     Indépendant de la langue : un anglophone européen garde les cm s'il veut. */
  let units = q.get('units') || get('dake-talents-units');
  if (units !== 'metric' && units !== 'us') units = 'metric';
  set('dake-talents-units', units);
  window.UNITS = units;
  window.setUnits = function (u) { window.UNITS = u; set('dake-talents-units', u); document.dispatchEvent(new CustomEvent('units', { detail: u })); };

  const inch = cm => Math.round(cm / 2.54);
  const half = n => Math.round(n * 2) / 2;
  const num = n => String(n).replace('.', window.EN ? '.' : ',');
  window.SIZE = {
    height(cm) {
      if (!cm) return '';
      if (window.UNITS !== 'us') return cm + ' cm';
      const i = Math.round(cm / 2.54);
      return `${Math.floor(i / 12)}′${i % 12}″`;
    },
    body(cm) { return !cm ? '' : window.UNITS === 'us' ? inch(cm) + ' in' : cm + ' cm'; },
    // Pointure US : femme ≈ EU − 30,5 ; homme ≈ EU − 33 (au demi-point)
    shoe(eu, genre) {
      if (!eu) return '';
      if (window.UNITS !== 'us') return eu + ' EU';
      const w = 'US ' + num(half(eu - 30.5)), m = 'US ' + num(half(eu - 33));
      return genre === 'h' ? m : genre === 'f' ? w : `${num(half(eu - 30.5))} ${window.T('F', 'W')} · ${num(half(eu - 33))} ${window.T('H', 'M')} (US)`;
    }
  };

  /* Lien de plateforme → lecteur intégré. YouTube (watch, youtu.be, shorts), Vimeo ; sinon simple lien. */
  window.videoEmbed = function (url) {
    const u = String(url || '').trim();
    let m = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/);
    if (m) return { kind: 'youtube', id: m[1], embed: `https://www.youtube-nocookie.com/embed/${m[1]}?autoplay=1&rel=0&modestbranding=1&playsinline=1`, thumb: `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg`, name: 'YouTube' };
    m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (m) return { kind: 'vimeo', id: m[1], embed: `https://player.vimeo.com/video/${m[1]}?autoplay=1&dnt=1`, thumb: '', name: 'Vimeo' };
    return /^https?:\/\//.test(u) ? { kind: 'link', embed: '', thumb: '', name: (u.match(/^https?:\/\/(?:www\.)?([^/]+)/) || [, 'Lien'])[1] } : null;
  };
})();
