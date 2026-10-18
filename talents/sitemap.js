/* =========================================================
   Plan du site pour Google (sitemap.xml)
   Régénéré par le back office à chaque publication : les fiches
   en ligne y apparaissent, en français et en anglais.
   ========================================================= */
window.buildSitemap = function (data, site) {
  site = site || 'https://dake.studio';
  const day = (data.updated || new Date().toISOString()).slice(0, 10);
  const esc = s => s.replace(/&/g, '&amp;');
  const alt = (fr, en, xd) => `\n    <xhtml:link rel="alternate" hreflang="fr" href="${esc(fr)}"/>\n    <xhtml:link rel="alternate" hreflang="en" href="${esc(en)}"/>` + (xd ? `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${esc(xd)}"/>` : '');
  const url = (loc, a, prio, mod) => `  <url>\n    <loc>${esc(loc)}</loc>\n    <lastmod>${mod || day}</lastmod>\n    <priority>${prio}</priority>${a || ''}\n  </url>`;
  const pair = (fr, en, xd, prio, mod) => [url(fr, alt(fr, en, xd), prio, mod), url(en, alt(fr, en, xd), prio, mod)];
  const T = site + '/talents/v1/';
  const live = (data.talents || []).filter(t => t.consent && t.visible !== false);
  const out = [
    ...pair(site + '/', site + '/en.html', site + '/', '1.0'),
    ...pair(T + '?lang=fr', T + '?lang=en', T, '0.8'),
    ...live.flatMap(t => pair(`${T}talent.html?t=${t.slug}&lang=fr`, `${T}talent.html?t=${t.slug}&lang=en`, `${T}talent.html?t=${t.slug}`, '0.6')),
    ...pair(site + '/mentions.html', site + '/legal.html', '', '0.2'),
    url(T + 'mentions.html', '', '0.1')
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${out.join('\n')}\n</urlset>\n`;
};
