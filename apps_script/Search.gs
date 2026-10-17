/**
 * Fase 1: Google Dorking en LinkedIn vía SerpAPI (últimas 2 semanas).
 */
function searchJuniorUxJobs_() {
  const apiKey = getProp_(PROPS.SERPAPI_API_KEY);
  if (!apiKey) throw new Error('Falta la propiedad SERPAPI_API_KEY en Propiedades del script.');

  const params = {
    engine: 'google',
    q: 'site:linkedin.com/jobs/view OR site:linkedin.com/posts "diseñador ux" OR "ux/ui designer" "junior" "Bogotá" OR "Medellín"',
    tbs: 'qdr:w2',
    hl: 'es',
    gl: 'co',
    api_key: apiKey,
  };
  const query = Object.keys(params).map(k => k + '=' + encodeURIComponent(params[k])).join('&');
  const response = UrlFetchApp.fetch('https://serpapi.com/search.json?' + query, { muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) {
    throw new Error('SerpAPI respondió ' + response.getResponseCode() + ': ' + response.getContentText().slice(0, 200));
  }

  const results = JSON.parse(response.getContentText()).organic_results || [];
  return results.map(item => {
    const parsed = parseLinkedInTitle(item.title || '');
    return {
      title: parsed.title,
      company: parsed.company,
      link: item.link,
      snippet: item.snippet || '',
      source: 'LinkedIn via SerpAPI',
    };
  });
}

/**
 * Títulos de LinkedIn: "Empresa hiring Cargo in Ciudad | LinkedIn"
 * o "Empresa está contratando Cargo en Ciudad | LinkedIn".
 */
function parseLinkedInTitle(rawTitle) {
  const clean = rawTitle.replace(/\s*\|\s*LinkedIn\s*$/i, '').trim();
  const match = clean.match(/^(.+?)\s+(?:hiring|está contratando|contrata)\s+(.+?)(?:\s+(?:in|en)\s+.+)?$/i);
  if (match) return { company: match[1].trim(), title: match[2].trim() };
  return { company: '', title: clean };
}
