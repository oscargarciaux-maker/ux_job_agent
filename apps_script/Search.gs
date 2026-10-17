/**
 * Fase 1: búsqueda con SerpAPI (motor Google Jobs), que devuelve la DESCRIPCIÓN COMPLETA de cada vacante
 * (LinkedIn, Computrabajo, sitios de empresas, etc.). La búsqueda orgánica de Google solo daba un fragmento.
 */
function searchUxJobs_() {
  const apiKey = getProp_(PROPS.SERPAPI_API_KEY);
  if (!apiKey) throw new Error('Falta la propiedad SERPAPI_API_KEY en Propiedades del script.');

  const byLink = {};
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
      .forEach(v => { byLink[v.link] = byLink[v.link] || v; });
  });
  return Object.keys(byLink).map(k => byLink[k]);
}

/** Convierte un resultado de Google Jobs (SerpAPI) en una vacante del agente. */
function parseGoogleJob(job) {
  const options = job.apply_options || [];
  const linkedIn = options.filter(o => /linkedin\.com/i.test(o.link || ''))[0];
  const ext = job.detected_extensions || {};
  return {
    title: job.title || '',
    company: job.company_name || '',
    location: job.location || '',
    description: job.description || '',
    snippet: '',
    link: (linkedIn || options[0] || {}).link || job.share_link || '',
    postedAt: ext.posted_at || '',
    source: job.via || 'Google Jobs',
  };
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
