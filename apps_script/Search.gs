/**
 * Fase 1: búsqueda con SerpAPI.
 * - Motor Google Jobs: vacantes formales con DESCRIPCIÓN COMPLETA (LinkedIn, Indeed, Computrabajo, sitios de empresas...).
 * - Google Dorking en linkedin.com/posts: reclutadores que contratan por publicación (solo fragmento visible).
 */
function searchUxJobs_() {
  const apiKey = getProp_(PROPS.SERPAPI_API_KEY);
  if (!apiKey) throw new Error('Falta la propiedad SERPAPI_API_KEY en Propiedades del script.');

  const byKey = {};   // Misma vacante en ambas búsquedas -> una sola
  const today = new Date();
  const queries = [{ q: pickDailyItems(CONFIG.SEARCH_QUERY_POOL, 1, today)[0], remote: false },
                   { q: pickDailyItems(CONFIG.REMOTE_QUERY_POOL, 1, today)[0], remote: true }];
  console.log('Búsquedas de hoy: ' + queries.map(x => x.q).join(' | '));
  queries.forEach(({ q, remote }) => {
    // Las remotas no se limitan a Colombia: cualquier país, siempre que la vacante diga remoto/LATAM/Colombia
    const params = remote ? { engine: 'google_jobs', q: q, hl: 'en', api_key: apiKey }
                          : { engine: 'google_jobs', q: q, location: CONFIG.SEARCH_LOCATION, hl: 'es', gl: 'co', api_key: apiKey };
    const query = Object.keys(params).map(k => k + '=' + encodeURIComponent(params[k])).join('&');
    const response = UrlFetchApp.fetch('https://serpapi.com/search.json?' + query, { muteHttpExceptions: true });
    if (response.getResponseCode() !== 200) {
      console.warn('SerpAPI respondió ' + response.getResponseCode() + ' para "' + q + '": ' + response.getContentText().slice(0, 200));
      return;
    }
    const data = JSON.parse(response.getContentText());
    if (data.error) console.warn('SerpAPI para "' + q + '": ' + data.error);
    const jobs = (data.jobs_results || []).map(parseGoogleJob);
    const blocked = jobs.filter(v => !v.link).length;
    const recent = jobs.filter(v => v.link && isRecent(v.postedAt, CONFIG.MAX_POST_AGE_DAYS));
    const usable = remote ? recent.filter(isReachableRemoteJob) : recent;
    console.log('"' + q + '": ' + jobs.length + ' resultados, ' + blocked + ' solo en sitios bloqueados, ' +
                (jobs.length - blocked - recent.length) + ' viejas' +
                (remote ? ', ' + (recent.length - usable.length) + ' no accesibles desde Colombia' : ''));
    usable.forEach(v => { byKey[vacancyKey(v)] = byKey[vacancyKey(v)] || v; });
  });
  [searchRemotive_, searchGetOnBoard_, searchJobicy_].forEach(source => {
    try {
      source().forEach(v => { byKey[vacancyKey(v)] = byKey[vacancyKey(v)] || v; });
    } catch (e) {
      console.warn('Fuente ' + source.name + ' falló: ' + e.message);
    }
  });
  if (CONFIG.LINKEDIN_POST_ROLE_POOL.length) {
    searchLinkedInPosts_(apiKey).forEach(v => { byKey[v.link] = byKey[v.link] || v; });
  }
  return Object.keys(byKey).map(k => byKey[k]).filter(v => {
    const reason = exclusionReason(v);
    if (reason) console.log('Descartada (' + reason + '): ' + v.title + ' @ ' + v.company);
    return !reason;
  });
}

// ---------- Fuentes gratuitas (API pública, 0 créditos de SerpAPI) ----------

function fetchJson_(url) {
  const r = UrlFetchApp.fetch(url, { muteHttpExceptions: true, headers: { Accept: 'application/json' } });
  if (r.getResponseCode() !== 200) throw new Error('HTTP ' + r.getResponseCode() + ' en ' + url);
  return JSON.parse(r.getContentText());
}

/** Remotive: empleos remotos de diseño; solo los abiertos a LATAM/Colombia/mundo y de UX/UI/producto. */
function searchRemotive_() {
  const jobs = (fetchJson_(CONFIG.EXTRA_SOURCES.remotive.url).jobs || []).map(parseRemotiveJob);
  const kept = jobs.filter(v => isDesignRole(v) && CONFIG.REACHABLE_REMOTE_LOCATION.test(v.location) &&
                                isRecent(v.postedAt, CONFIG.MAX_POST_AGE_DAYS));
  console.log('Remotive: ' + jobs.length + ' de diseño remoto, ' + kept.length + ' de UX/UI recientes y abiertas a Colombia/LATAM');
  return kept;
}

function parseRemotiveJob(job) {
  return {
    title: job.title || '', company: job.company_name || '', location: job.candidate_required_location || '',
    description: stripHtml_(job.description), snippet: '', link: job.url || '',
    postedAt: String(job.publication_date || '').slice(0, 10), source: 'Remotive', sourceBonus: 0,
  };
}

/** Get on Board (portal tech de LATAM): remotas o en Colombia. */
function searchJobicy_() {
  const jobs = (fetchJson_(CONFIG.EXTRA_SOURCES.jobicy.url).jobs || [])
    .filter(j => !/freelance/i.test([].concat(j.jobType || []).join(' '))).map(parseJobicyJob);
  const kept = jobs.filter(v => isDesignRole(v) && isRecent(v.postedAt, CONFIG.MAX_POST_AGE_DAYS));
  console.log('Jobicy: ' + jobs.length + ' remotas para LATAM, ' + kept.length + ' de UX/UI recientes');
  return kept;
}

function parseJobicyJob(job) {
  return {
    title: job.jobTitle || '', company: job.companyName || '', location: 'Remote ' + (job.jobGeo || 'LATAM'),
    description: stripHtml_(job.jobDescription || job.jobExcerpt), snippet: '', link: job.url || '',
    postedAt: String(job.pubDate || '').slice(0, 10), source: 'Jobicy', sourceBonus: 0,
  };
}

function searchGetOnBoard_() {
  const cfg = CONFIG.EXTRA_SOURCES.getonbrd;
  const byLink = {};
  cfg.queries.forEach(q => {
    (fetchJson_(cfg.url + encodeURIComponent(q)).data || []).map(parseGetOnBoardJob)
      .forEach(v => { if (v.link) byLink[v.link] = v; });
  });
  const jobs = Object.keys(byLink).map(k => byLink[k]);
  const kept = jobs.filter(v => isDesignRole(v) && CONFIG.REACHABLE_REMOTE_LOCATION.test(v.location) &&
                                isRecent(v.postedAt, CONFIG.MAX_POST_AGE_DAYS));
  console.log('Get on Board: ' + jobs.length + ' resultados, ' + kept.length + ' de UX/UI recientes y abiertas a Colombia/LATAM');
  return kept;
}

function parseGetOnBoardJob(item) {
  const a = (item && item.attributes) || {};
  const company = (((a.company || {}).data || {}).attributes || {}).name || '';
  const countries = [].concat(a.countries || []).join(', ');
  const remote = a.remote || /remote|fully/i.test(String(a.remote_modality || ''));
  const published = a.published_at ? new Date(Number(a.published_at) * 1000).toISOString().slice(0, 10) : '';
  return {
    title: a.title || '', company: company, location: (remote ? 'Remote LATAM ' : '') + countries,
    description: stripHtml_([a.description_headline, a.description, a.functions, a.desirable].filter(Boolean).join('\n')),
    snippet: '', link: ((item && item.links) || {}).public_url || '',
    postedAt: published, source: 'Get on Board', sourceBonus: 0,
  };
}

/** Rol de diseño UX/UI/producto (no diseño gráfico puro, no otros oficios). */
function isDesignRole(vacancy) {
  const title = vacancy.title || '';
  return /ux|ui\b|user experience|experiencia de usuario|product design|dise[nñ]ador(a)? de producto|interaction|interfaz|interfaces|dise[nñ]o de (producto|experiencia|interacci)|dise[nñ]ador(a)? (digital|web)|web designer|visual designer|service design|design system/i.test(title) &&
    !/copywrit|writer|redactor|\bseo\b|content/i.test(title);  // "Senior SEO & UX Copywriter" no es diseño
}

function stripHtml_(html) {
  return String(html || '').replace(/<br\s*\/?>|<\/p>|<\/li>/gi, '\n').replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
}

/** Posts de reclutadores en LinkedIn (últimas 2 semanas) vía Google Dorking, con el rol del día. */
function searchLinkedInPosts_(apiKey) {
  const q = buildLinkedInPostsQuery(pickDailyItems(CONFIG.LINKEDIN_POST_ROLE_POOL, 1, new Date())[0]);
  console.log('Publicaciones de LinkedIn de hoy: ' + q);
  const params = { engine: 'google', q: q, tbs: 'qdr:w2', hl: 'es', gl: 'co', num: 20, api_key: apiKey };
  const query = Object.keys(params).map(k => k + '=' + encodeURIComponent(params[k])).join('&');
  const response = UrlFetchApp.fetch('https://serpapi.com/search.json?' + query, { muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) {
    console.warn('SerpAPI respondió ' + response.getResponseCode() + ' para publicaciones de LinkedIn.');
    return [];
  }
  const posts = (JSON.parse(response.getContentText()).organic_results || []).map(parseLinkedInPost);
  const kept = posts.filter(v => v.link && isRecent(v.postedAt, CONFIG.MAX_POST_AGE_DAYS) && isReachablePost(v));
  console.log('Publicaciones: ' + posts.length + ' resultados, ' + kept.length + ' de diseño y accesibles desde Colombia');
  return kept;
}

/** Vacante remota a la que se puede aplicar desde Colombia: su ubicación o descripción dice remoto/LATAM/Colombia. */
function isReachableRemoteJob(job) {
  const text = (job.location || '') + ' ' + (job.description || '');
  if (/\b(us|u\.s\.|usa|united states|uk|europe|eu|india)\s*(only|residents?|based)\b|must (reside|live) in (the )?(us|usa|united states|uk|europe)/i.test(text)) return false;
  return CONFIG.LINKEDIN_POST_LOCATION_PATTERN.test(text);
}

function buildLinkedInPostsQuery(roles) {
  return 'site:linkedin.com/posts (' + roles + ') ' + CONFIG.LINKEDIN_POST_HIRING_TERMS + ' ' + CONFIG.LINKEDIN_POST_LOCATION_TERMS;
}

/** Solo publicaciones a las que se puede aplicar desde Colombia (Colombia, LATAM o remoto) y de un rol de diseño. */
function isReachablePost(post) {
  const text = post.description || '';
  // Solo publicaciones reales (no páginas de listados de empleos de LinkedIn) y que no estén cerradas
  return /linkedin\.com\/(posts|feed\/update)\//i.test(post.link || '') && !/caducad|expirad|expired|cerrad|closed|ya no/i.test(text) &&
    CONFIG.LINKEDIN_POST_LOCATION_PATTERN.test(text) && CONFIG.LINKEDIN_POST_ROLE_PATTERN.test(text);
}

/** n elementos consecutivos del pool que cambian cada día (mismo día = mismas búsquedas; rota sin repetir). */
function pickDailyItems(pool, n, date) {
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  const start = (day * n) % pool.length;
  return Array.from({ length: Math.min(n, pool.length) }, (_, i) => pool[(start + i) % pool.length]);
}

/** Fecha (YYYY-MM-DD) de una publicación de LinkedIn: el id de "activity-<id>" lleva los milisegundos en sus bits altos. */
function linkedInPostDate(link) {
  const m = String(link || '').match(/activity[-:](\d{19})/);
  return m ? new Date(Math.floor(Number(m[1]) / 4194304)).toISOString().slice(0, 10) : '';
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
    postedAt: linkedInPostDate(item.link) || item.date || '',
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
    postedAt: ext.posted_at || (job.extensions || []).filter(e => /\bhace\b|\bago\b/i.test(e))[0] || '',  // No "30–80 an hour" (salario)
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

/**
 * Para las vacantes sin fecha en Google Jobs, lee la página original (UrlFetchApp, sin créditos de SerpAPI) y toma
 * "datePosted"/"validThrough" de su JobPosting (JSON-LD, el formato que Google Jobs exige a los portales).
 * Devuelve solo las vacantes vigentes (descarta las de enlace 404/410); marca dateUnverified en las que no se pudo verificar.
 */
function verifyPostingDates_(vacancies) {
  const pending = vacancies.filter(v => !v.isPost && !v.postedAt);
  if (pending.length) {
    let responses = [];
    try {
      responses = UrlFetchApp.fetchAll(pending.map(v => ({ url: v.link, muteHttpExceptions: true, followRedirects: true })));
    } catch (e) {
      console.warn('No se pudieron leer las páginas de las vacantes para verificar su fecha: ' + e.message);
    }
    pending.forEach((v, i) => {
      const r = responses[i];
      if (r && (r.getResponseCode() === 404 || r.getResponseCode() === 410)) v.deadLink = true;  // La vacante ya no existe
      const dates = r && r.getResponseCode() === 200 ? extractJobPostingDates(r.getContentText()) : {};
      if (dates.posted) v.postedAt = dates.posted;
      if (dates.validThrough) v.validThrough = dates.validThrough;
      if (!dates.posted) v.dateUnverified = true;
    });
  }
  const today = new Date();
  return vacancies.filter(v => {
    const ok = !v.deadLink && isRecent(v.postedAt, CONFIG.MAX_POST_AGE_DAYS, today) && !isExpired(v.validThrough, today);
    if (!ok) console.log('Descartada (' + (v.deadLink ? 'enlace ya no existe' : 'antigüedad, publicada ' + v.postedAt) + '): ' +
                        v.title + ' @ ' + v.company);
    return ok;
  });
}

/** Fechas del JobPosting (JSON-LD) de la página de una vacante: { posted, validThrough } en YYYY-MM-DD o null. */
function extractJobPostingDates(html) {
  const find = key => {
    const m = String(html || '').match(new RegExp('"' + key + '"\\s*:\\s*"(\\d{4}-\\d{2}-\\d{2})'));
    return m ? m[1] : null;
  };
  return { posted: find('datePosted'), validThrough: find('validThrough') };
}

function isExpired(validThrough, today) {
  return !!validThrough && daysBetween_(validThrough, today) > 0;
}

function daysBetween_(isoDate, today) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return Math.floor((Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - Date.UTC(y, m - 1, d)) / 86400000);
}

/** true si la vacante tiene <= maxDays de publicada. Si no se puede saber, se conserva. */
function isRecent(postedAt, maxDays, today) {
  const text = (postedAt || '').toLowerCase();
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return daysBetween_(text.slice(0, 10), today || new Date()) <= maxDays;
  const n = parseInt((text.match(/\d+/) || ['1'])[0], 10);
  if (/hora|hour|minut/.test(text)) return true;
  if (/d[ií]a|day/.test(text)) return n <= maxDays;
  if (/semana|week/.test(text)) return n * 7 <= maxDays;
  if (/mes|month|año|year/.test(text)) return false;
  return true;
}
