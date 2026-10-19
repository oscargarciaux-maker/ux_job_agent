/**
 * Fase 1: búsqueda con SerpAPI.
 * - Motor Google Jobs: vacantes formales con DESCRIPCIÓN COMPLETA (LinkedIn, Indeed, Computrabajo, sitios de empresas...).
 * - Google Dorking en linkedin.com/posts: reclutadores que contratan por publicación (solo fragmento visible).
 */
function searchUxJobs_() {
  const apiKey = getProp_(PROPS.SERPAPI_API_KEY);
  if (!apiKey) throw new Error('Falta la propiedad SERPAPI_API_KEY en Propiedades del script.');

  const byKey = {};   // Misma vacante en ambas búsquedas -> una sola
  CONFIG.SEARCH_QUERIES.forEach(q => {
    const params = { engine: 'google_jobs', q: q, location: CONFIG.SEARCH_LOCATION, hl: 'es', gl: 'co', api_key: apiKey };
    const query = Object.keys(params).map(k => k + '=' + encodeURIComponent(params[k])).join('&');
    const response = UrlFetchApp.fetch('https://serpapi.com/search.json?' + query, { muteHttpExceptions: true });
    if (response.getResponseCode() !== 200) {
      console.warn('SerpAPI respondió ' + response.getResponseCode() + ' para "' + q + '": ' + response.getContentText().slice(0, 200));
      return;
    }
    (JSON.parse(response.getContentText()).jobs_results || [])
      .map(parseGoogleJob)
      .filter(v => v.link && isRecent(v.postedAt, CONFIG.MAX_POST_AGE_DAYS))
      .forEach(v => { byKey[vacancyKey(v)] = byKey[vacancyKey(v)] || v; });
  });
  if (CONFIG.LINKEDIN_POSTS_QUERY) {
    searchLinkedInPosts_(apiKey).forEach(v => { byKey[v.link] = byKey[v.link] || v; });
  }
  return Object.keys(byKey).map(k => byKey[k]);
}

/** Posts de reclutadores en LinkedIn (últimas 2 semanas) vía Google Dorking. */
function searchLinkedInPosts_(apiKey) {
  const params = { engine: 'google', q: CONFIG.LINKEDIN_POSTS_QUERY, tbs: 'qdr:w2', hl: 'es', gl: 'co', num: 20, api_key: apiKey };
  const query = Object.keys(params).map(k => k + '=' + encodeURIComponent(params[k])).join('&');
  const response = UrlFetchApp.fetch('https://serpapi.com/search.json?' + query, { muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) {
    console.warn('SerpAPI respondió ' + response.getResponseCode() + ' para publicaciones de LinkedIn.');
    return [];
  }
  return (JSON.parse(response.getContentText()).organic_results || []).map(parseLinkedInPost).filter(v => v.link);
}

/** "Ana Gómez en LinkedIn: Buscamos diseñador UX..." -> vacante tipo publicación. */
function parseLinkedInPost(item) {
  const rawTitle = (item.title || '').replace(/\s*\|\s*LinkedIn\s*$/i, '');
  const match = rawTitle.match(/^(.+?)\s+(?:en|on)\s+LinkedIn:\s*(.*)$/i);
  const author = match ? match[1].trim() : '';
  return {
    title: (match ? match[2] : rawTitle).trim().slice(0, 80) || 'Publicación de LinkedIn',
    company: author ? 'Post ' + author : 'Post LinkedIn',
    location: '',
    description: [rawTitle, item.snippet || ''].join('\n'),
    snippet: '',
    link: item.link || '',
    postedAt: item.date || '',
    source: 'Publicación LinkedIn (solo fragmento visible)',
    isPost: true,   // Sin texto completo: proceso manual del usuario, no pasa por la IA
  };
}

/**
 * Convierte un resultado de Google Jobs (SerpAPI) en una vacante del agente.
 * Elige el enlace original según CONFIG.SOURCE_PRIORITY (LinkedIn > Indeed > Computrabajo > portal de la empresa u
 * otro) y nunca uno de CONFIG.BLOCKED_SOURCES; si solo hay enlaces bloqueados, link queda vacío (se descarta).
 */
function parseGoogleJob(job) {
  const best = pickApplyOption((job.apply_options || []).map(o => o.link || ''));
  const ext = job.detected_extensions || {};
  return {
    title: job.title || '',
    company: job.company_name || '',
    location: job.location || '',
    description: job.description || '',
    snippet: '',
    link: best ? best.link : '',
    postedAt: ext.posted_at || '',
    source: best ? best.source : (job.via || 'Google Jobs'),
    sourceBonus: best ? best.bonus : 0,
  };
}

/** Mejor enlace de postulación: { link, source, bonus } o null si todos están bloqueados. */
function pickApplyOption(links) {
  let best = null;
  links.filter(link => link && !CONFIG.BLOCKED_SOURCES.test(link)).forEach(link => {
    const known = CONFIG.SOURCE_PRIORITY.filter(s => s.pattern.test(link))[0];
    const option = known ? { link: link, source: known.name, bonus: known.bonus }
                         : { link: link, source: hostOf_(link), bonus: 0 };
    if (!best || option.bonus > best.bonus) best = option;
  });
  return best;
}

function hostOf_(link) {
  return (link.match(/^https?:\/\/(?:www\.)?([^/?#]+)/i) || [null, link])[1];
}

/** true si la vacante tiene <= maxDays de publicada. Si no se puede saber, se conserva. */
function isRecent(postedAt, maxDays) {
  const text = (postedAt || '').toLowerCase();
  const n = parseInt((text.match(/\d+/) || ['1'])[0], 10);
  if (/hora|hour|minut/.test(text)) return true;
  if (/d[ií]a|day/.test(text)) return n <= maxDays;
  if (/semana|week/.test(text)) return n * 7 <= maxDays;
  if (/mes|month|año|year/.test(text)) return false;
  return true;
}
