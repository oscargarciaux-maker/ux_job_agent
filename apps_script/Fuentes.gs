/**
 * Fuentes de vacantes del plan de búsqueda del usuario (2026-10-27, "Plan sistema automático de búsqueda de vacantes"):
 * - JobSpy: Indeed Colombia y LinkedIn desde GitHub Actions (tools/jobspy_buscar.py), 4 veces al día;
 *   Apps Script lee el JSON que el flujo deja en la rama "datos".
 * - Sistemas de empleo (ATS) de las empresas de la pestaña "Empresas objetivo": Greenhouse, Lever, Ashby y Workable.
 * - Alertas de LinkedIn en el Gmail del usuario (solo lectura): vacantes y publicaciones que la búsqueda pública no ve.
 * - Brave Search: más búsquedas de publicaciones de reclutadores (si existe la propiedad BRAVE_API_KEY).
 * Ninguna usa la cuenta de LinkedIn del usuario. Si una falla, solo se registra.
 */

// ---------- JobSpy (GitHub Actions) ----------

function searchJobSpy_() {
  const cfg = CONFIG.EXTRA_SOURCES.jobspy;
  const r = UrlFetchApp.fetch(cfg.url, { muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) throw new Error('HTTP ' + r.getResponseCode() + ' en ' + cfg.url);
  const data = JSON.parse(r.getContentText());
  const today = new Date();
  const jobs = (data.vacantes || []).map(parseJobSpyJob);
  const kept = jobs.filter(v => v.link && acceptRoleTitle_(v) && isRecent(v.postedAt, CONFIG.MAX_POST_AGE_DAYS, today) &&
                                (/colombia|bogot|medell|cali|barranquilla|bucaramanga/i.test(v.location) || isReachableRemoteJob(v)));
  console.log('JobSpy (' + (data.generado || 'sin fecha') + '): ' + jobs.length + ' avisos, ' + kept.length +
              ' de diseño, recientes y abiertos a Colombia');
  return kept;
}

/** Una fila del JSON de tools/jobspy_buscar.py → vacante del agente. */
function parseJobSpyJob(job) {
  const site = String(job.sitio || '').toLowerCase();
  const known = CONFIG.SOURCE_PRIORITY.filter(s => s.pattern.test(job.enlace || ''))[0];
  return {
    title: job.titulo || '', company: job.empresa || '', location: job.ubicacion || (job.remoto ? 'Remoto' : ''),
    description: job.descripcion || '', snippet: '', link: job.enlace || '', postedAt: job.fecha || '',
    source: ({ indeed: 'Indeed', linkedin: 'LinkedIn', google: 'Google Jobs', elempleo: 'elempleo' })[site] || site || 'JobSpy',
    sourceBonus: known ? known.bonus : site === 'elempleo' ? CONFIG.EXTRA_SOURCES.elempleo.bonus : 0,
    // Nombre en la pestaña "Fuentes"; elempleo se busca en GitHub Actions desde el 27 oct 2026 (ahí ya se leyó su ficha)
    origin: ({ indeed: 'Indeed (JobSpy)', linkedin: 'LinkedIn (GitHub Actions)', elempleo: 'elempleo (GitHub Actions)' })[site] || 'JobSpy (GitHub Actions)',
    // No se reabren desde Google: Indeed le responde 401, y de LinkedIn y elempleo GitHub ya trajo fecha y descripción.
    // Si sigue abierta lo comprueba la verificación de la IA.
    pageChecked: true,
  };
}

// ---------- Sistemas de empleo (ATS) de las empresas objetivo ----------

/**
 * Vacantes de diseño publicadas en el sistema de empleo de cada empresa de "Empresas objetivo". El sistema de cada empresa
 * se detecta una vez (enlace de la página de empleo o nombre/dominio probado en cada API) y se guarda en ATS_CACHE.
 */
function searchAtsBoards_() {
  const cfg = CONFIG.EXTRA_SOURCES.ats;
  const sheet = SpreadsheetApp.openById(getProp_(PROPS.SHEET_ID)).getSheetByName(CONFIG.TARGET_COMPANIES_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  const head = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  const col = name => head.indexOf(name);
  const companies = rows.map(r => ({ name: String(r[col('Empresa')] || '').trim(), web: String(r[col('Web')] || ''),
                                     jobs: String(r[col('Página de empleo')] || '') })).filter(c => c.name);
  const cache = JSON.parse(getProp_('ATS_CACHE') || '{}');
  const today = Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd');

  // 1. Detectar el sistema de las empresas nuevas (o sin sistema revisadas hace más de cfg.recheckDays días)
  const pending = companies.filter(c => {
    const hit = cache[c.name];
    return !hit || (hit.none && daysBetween_(hit.d, new Date()) > cfg.recheckDays);
  }).slice(0, cfg.maxDetectPerRun);
  // Todas las pruebas de la corrida en una sola tanda de peticiones (el pipeline tiene 6 minutos en total)
  const tries = [];
  pending.forEach(c => atsCandidates(c.name, c.web, c.jobs).forEach(t => tries.push(Object.assign({ company: c.name }, t))));
  const detect = tries.length ? fetchAllPaced_(tries.map(t => ({ url: atsApiUrl(t.ats, t.slug), muteHttpExceptions: true })),
                                               cfg.batch, 300) : [];
  pending.forEach(c => { cache[c.name] = { none: true, d: today }; });
  tries.forEach((t, i) => {
    if (cache[t.company].ats || detect[i].getResponseCode() !== 200 || !atsHasJobsShape(t.ats, detect[i].getContentText())) return;
    cache[t.company] = { ats: t.ats, slug: t.slug, d: today };
  });
  setProp_('ATS_CACHE', JSON.stringify(cache));

  // 2. Leer las vacantes de las empresas con sistema conocido
  const boards = companies.map(c => Object.assign({ company: c.name }, cache[c.name] || {})).filter(b => b.ats);
  const responses = boards.length ? fetchAllPaced_(boards.map(b => ({ url: atsApiUrl(b.ats, b.slug), muteHttpExceptions: true })),
                                                   cfg.batch, 300) : [];
  const now = new Date();
  let all = [];
  boards.forEach((b, i) => {
    if (responses[i].getResponseCode() !== 200) return;
    try { all = all.concat(parseAtsJobs(b.ats, responses[i].getContentText(), b.company)); } catch (e) { /* formato raro */ }
  });
  const kept = all.filter(v => acceptRoleTitle_(v) && isRecent(v.postedAt, CONFIG.OFFICIAL_BOARD_MAX_AGE_DAYS, now) &&
                               (/colombia|bogot|latam|latin america|am[eé]rica latina|south america/i.test(v.location) ||
                                isReachableRemoteJob(v)));
  kept.forEach(v => { v.maxAgeDays = CONFIG.OFFICIAL_BOARD_MAX_AGE_DAYS; v.officialBoard = true; v.pageChecked = true; });
  console.log('ATS de empresas objetivo: ' + boards.length + ' empresas con sistema conocido de ' + companies.length +
              ' (' + pending.length + ' revisadas hoy), ' + all.length + ' vacantes publicadas, ' + kept.length + ' de diseño para Colombia/LATAM');
  return kept;
}

/** Sistemas y nombres de tablero a probar para una empresa: los del enlace de empleo primero, luego nombre y dominio. */
function atsCandidates(name, web, jobsPage) {
  const text = String(web || '') + ' ' + String(jobsPage || '');
  const exact = [
    { ats: 'greenhouse', re: /(?:boards|job-boards)\.greenhouse\.io\/(?:embed\/job_board\?for=)?([a-z0-9_-]+)/i },
    { ats: 'lever', re: /jobs\.lever\.co\/([a-z0-9_-]+)/i },
    { ats: 'ashby', re: /jobs\.ashbyhq\.com\/([a-z0-9_.-]+)/i },
    { ats: 'workable', re: /apply\.workable\.com\/([a-z0-9_-]+)/i },
  ].map(p => { const m = text.match(p.re); return m ? { ats: p.ats, slug: m[1].toLowerCase() } : null; }).filter(Boolean);
  if (exact.length) return exact;
  const base = String(name || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\(.*?\)/g, '')
    .replace(/\b(s\.?a\.?s?|ltda|inc|llc|group|colombia|co)\b\.?/g, ' ').trim();
  const domain = (String(web || '').match(/^(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+)\./i) || [])[1];
  const slugs = [];
  [base.replace(/[^a-z0-9]+/g, ''), base.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), (domain || '').toLowerCase()]
    .forEach(s => { if (s && s.length > 2 && slugs.indexOf(s) === -1) slugs.push(s); });
  const out = [];
  slugs.forEach(slug => ['greenhouse', 'lever', 'ashby', 'workable'].forEach(ats => out.push({ ats: ats, slug: slug })));
  return out;
}

function atsApiUrl(ats, slug) {
  return ({
    greenhouse: 'https://boards-api.greenhouse.io/v1/boards/' + slug + '/jobs?content=true',
    lever: 'https://api.lever.co/v0/postings/' + slug + '?mode=json',
    ashby: 'https://api.ashbyhq.com/posting-api/job-board/' + slug,
    workable: 'https://apply.workable.com/api/v1/widget/accounts/' + slug,
  })[ats];
}

/** true si la respuesta tiene la forma de un tablero de ese sistema (algunos devuelven 200 con un error). */
function atsHasJobsShape(ats, text) {
  try {
    const d = JSON.parse(text);
    return ats === 'lever' ? Array.isArray(d) : Array.isArray(d && d.jobs);
  } catch (e) {
    return false;
  }
}

/** Vacantes de la respuesta de un ATS en el formato del agente. */
function parseAtsJobs(ats, text, company) {
  const d = JSON.parse(text);
  const day = v => (v ? new Date(typeof v === 'number' ? v : String(v)).toISOString().slice(0, 10) : '');
  const base = { company: company, snippet: '', source: 'Portal de la empresa (' + ats + ')', sourceBonus: 0 };
  if (ats === 'greenhouse') {
    return (d.jobs || []).map(j => Object.assign({}, base, {
      title: j.title || '', location: (j.location && j.location.name) || '', link: j.absolute_url || '',
      postedAt: day(j.first_published || j.updated_at), description: stripHtml_(decodeHtml_(j.content || '')),
    }));
  }
  if (ats === 'lever') {
    return (Array.isArray(d) ? d : []).map(j => Object.assign({}, base, {
      title: j.text || '', location: [(j.categories && j.categories.location) || '', j.workplaceType || ''].join(' ').trim(),
      link: j.hostedUrl || '', postedAt: day(j.createdAt), description: j.descriptionPlain || stripHtml_(j.description || ''),
    }));
  }
  if (ats === 'ashby') {
    return (d.jobs || []).filter(j => j.isListed !== false).map(j => Object.assign({}, base, {
      title: j.title || '', location: [j.location || '', j.isRemote ? 'Remote' : ''].join(' ').trim(), link: j.jobUrl || '',
      postedAt: day(j.publishedAt), description: j.descriptionPlain || stripHtml_(j.descriptionHtml || ''),
    }));
  }
  if (ats === 'workable') {
    return (d.jobs || []).map(j => Object.assign({}, base, {
      title: j.title || '', location: [j.city || '', j.country || '', j.telecommuting ? 'Remote' : ''].join(' ').trim(),
      link: j.url || j.shortlink || '', postedAt: day(j.published_on || j.created_at), description: '',
    }));
  }
  return [];
}

// ---------- Alertas de LinkedIn en Gmail (solo lectura) ----------

/**
 * Lee los correos de alertas de empleo y notificaciones de LinkedIn de los últimos días (el usuario crea las alertas una
 * vez) y abre cada vacante o publicación por su página pública. No marca ni mueve correos: lo ya registrado lo descarta
 * la deduplicación contra el registro.
 */
function searchEmailAlerts_() {
  const cfg = CONFIG.EXTRA_SOURCES.alertas;
  const list = Gmail.Users.Messages.list('me', { q: cfg.query, maxResults: cfg.maxMessages });
  const messages = (list && list.messages) || [];
  const jobIds = {}, activityIds = {};
  let unreadable = 0;
  messages.forEach(m => {
    let links;
    try {
      links = alertLinksFromHtml(messageHtml_(Gmail.Users.Messages.get('me', m.id, { format: 'full' }).payload));
    } catch (e) {
      unreadable++;  // Un correo que no se puede leer no detiene a los demás
      return;
    }
    links.jobIds.forEach(id => { jobIds[id] = true; });
    links.activityIds.forEach(id => { activityIds[id] = true; });
  });
  if (unreadable) console.warn('Alertas de correo: ' + unreadable + ' de ' + messages.length + ' correos no se pudieron leer');
  const ids = Object.keys(jobIds).slice(0, cfg.maxJobs);
  const li = CONFIG.EXTRA_SOURCES.linkedin;
  const headers = { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'es-CO,es;q=0.9,en;q=0.8' };
  const details = ids.length ? fetchAllPaced_(ids.map(id => ({ url: li.detailUrl + id, headers: headers, muteHttpExceptions: true })),
                                              li.batch, li.pauseMs) : [];
  const jobs = [];
  details.forEach((r, i) => {
    if (r.getResponseCode() !== 200) return;
    const d = parseLinkedInJobDetail(r.getContentText());
    if (d.closed || !d.title) return;
    jobs.push({ title: d.title, company: d.company, location: d.location, description: d.description, snippet: '',
                link: 'https://www.linkedin.com/jobs/view/' + ids[i] + '/', postedAt: d.postedAgo || '',
                source: 'LinkedIn (alerta por correo)', sourceBonus: li.bonus, id: ids[i], pageChecked: true });
  });
  const kept = jobs.filter(v => acceptRoleTitle_(v) && isRecent(v.postedAt, CONFIG.MAX_POST_AGE_DAYS));
  const posts = Object.keys(activityIds).slice(0, cfg.maxPosts).map(id => ({
    title: 'Publicación de LinkedIn', company: 'Post LinkedIn', location: '', description: '', snippet: '',
    link: 'https://www.linkedin.com/feed/update/urn:li:activity:' + id + '/', postedAt: linkedInPostDate('activity-' + id),
    source: 'Publicación LinkedIn (notificación por correo)', isPost: true,
  })).filter(p => isRecent(p.postedAt, CONFIG.MAX_POST_AGE_DAYS));
  const readPosts = enrichLinkedInPosts_(posts).filter(p => p.fromPost);  // Sin texto no se puede filtrar: se omite
  console.log('Alertas de correo: ' + messages.length + ' correos, ' + ids.length + ' vacantes (' + kept.length +
              ' de diseño y vigentes), ' + posts.length + ' publicaciones (' + readPosts.length + ' leídas y útiles)');
  return kept.concat(readPosts);
}

/** HTML (o texto) de un mensaje de la API de Gmail, recorriendo sus partes. */
function messageHtml_(payload) {
  if (!payload) return '';
  if (payload.body && payload.body.data && /text\/(html|plain)/.test(payload.mimeType || '')) return gmailBodyText_(payload.body.data);
  return (payload.parts || []).map(messageHtml_).join('\n');
}

/**
 * Texto de body.data de la API de Gmail. El servicio avanzado de Apps Script lo puede entregar como bytes o como base64
 * (web-safe y a veces sin relleno): base64DecodeWebSafe falló el 27 oct 2026 con "No se pudo descifrar la cadena".
 */
function gmailBodyText_(data) {
  const bytes = Array.isArray(data) ? data : Utilities.base64Decode(normalizeBase64(data));
  return Utilities.newBlob(bytes).getDataAsString('UTF-8');
}

/** Base64 estándar con relleno a partir de base64 web-safe o estándar, con o sin relleno y saltos de línea. */
function normalizeBase64(text) {
  const s = String(text || '').replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
  return s + '='.repeat((4 - s.length % 4) % 4);
}

/** Ids de vacantes (jobs/view/<id>) y de publicaciones (urn:li:activity:<id>) en el HTML de un correo de LinkedIn. */
function alertLinksFromHtml(html) {
  const text = String(html || '').replace(/&amp;/g, '&').replace(/%3A/gi, ':');
  const unique = arr => arr.filter((x, i) => arr.indexOf(x) === i);
  return {
    jobIds: unique((text.match(/linkedin\.com\/(?:comm\/)?jobs\/view\/(\d{6,})/g) || []).map(s => s.match(/(\d{6,})$/)[1])),
    activityIds: unique((text.match(/urn:li:activity:(\d{15,})/g) || []).map(s => s.match(/(\d{15,})$/)[1])),
  };
}

// ---------- Brave Search: publicaciones de reclutadores ----------

/** Publicaciones de LinkedIn de la última semana con frases de contratación; solo si existe BRAVE_API_KEY. */
function searchBravePosts_() {
  const key = getProp_('BRAVE_API_KEY');
  if (!key) return [];
  const cfg = CONFIG.EXTRA_SOURCES.brave;
  const queries = buildBraveQueries(cfg.phrases, cfg.roles, cfg.queriesPerRun, new Date());
  const responses = fetchAllPaced_(queries.map(q => ({
    url: cfg.url + '?q=' + encodeURIComponent(q) + '&count=20&freshness=pw&country=co&search_lang=es',
    headers: { 'Accept': 'application/json', 'X-Subscription-Token': key }, muteHttpExceptions: true,
  })), 1, cfg.pauseMs);  // El plan gratuito permite 1 consulta por segundo
  const byLink = {};
  let failed = 0;
  responses.forEach(r => {
    if (r.getResponseCode() !== 200) { failed++; return; }
    const results = ((JSON.parse(r.getContentText()).web || {}).results) || [];
    results.forEach(it => {
      if (!/linkedin\.com\/(posts|feed\/update)\//i.test(it.url || '')) return;
      byLink[it.url] = byLink[it.url] || {
        title: stripHtml_(it.title || '').replace(/\s*\|\s*LinkedIn\s*$/i, '').slice(0, 80) || 'Publicación de LinkedIn',
        company: 'Post LinkedIn', location: '', description: stripHtml_(it.description || ''), snippet: '', link: it.url,
        postedAt: linkedInPostDate(it.url) || '', source: 'Publicación LinkedIn (Brave)', isPost: true,
      };
    });
  });
  const posts = Object.keys(byLink).map(k => byLink[k]).filter(p => isRecent(p.postedAt, CONFIG.MAX_POST_AGE_DAYS));
  // Se leen completas; las que no abren solo siguen si su fragmento ya pasa el filtro de publicaciones
  const kept = enrichLinkedInPosts_(posts).filter(p => p.fromPost || isReachablePost(p));
  console.log('Brave: ' + queries.length + ' búsquedas (' + failed + ' fallaron), ' + posts.length + ' publicaciones recientes, ' +
              kept.length + ' útiles');
  return kept;
}

/** Consultas del día: rota frases × roles para no repetir siempre las mismas (n por corrida). */
function buildBraveQueries(phrases, roles, n, date) {
  const all = [];
  roles.forEach(role => phrases.forEach(phrase => all.push('site:linkedin.com/posts "' + phrase + '" "' + role + '"')));
  return pickDailyItems(all, n, date);
}

// ---------- Conteo por fuente (pestaña "Fuentes") ----------

/** Filas para la pestaña Fuentes: una por origen, con cuántas trajo, cuántas eran nuevas y cuántas carpetas se crearon. */
function sourceStatsRows(stamp, found, fresh, created) {
  const names = Object.keys(found).concat(Object.keys(fresh), Object.keys(created))
    .filter((x, i, a) => a.indexOf(x) === i).sort((a, b) => (found[b] || 0) - (found[a] || 0));
  return names.map(n => [stamp.date, stamp.time, stamp.run, n, found[n] || 0, fresh[n] || 0, created[n] || 0]);
}

function countByOrigin(vacancies) {
  const out = {};
  vacancies.forEach(v => { const k = v.origin || 'Sin fuente'; out[k] = (out[k] || 0) + 1; });
  return out;
}

function logSourceStats_(found, fresh, created) {
  const ss = SpreadsheetApp.openById(getProp_(PROPS.SHEET_ID));
  let sheet = ss.getSheetByName(CONFIG.SOURCES_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SOURCES_SHEET_NAME);
    sheet.appendRow(CONFIG.SOURCES_HEADERS);
    sheet.setFrozenRows(1);
  }
  const now = new Date();
  const stamp = { date: Utilities.formatDate(now, tz_(), 'yyyy-MM-dd'), time: Utilities.formatDate(now, tz_(), 'HH:mm'),
                  run: 'Búsqueda ' + Utilities.formatDate(now, tz_(), 'HH') + ' h' };
  const rows = sourceStatsRows(stamp, found, fresh, created);
  if (rows.length) sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}

// ---------- Calidad por fuente ----------

/**
 * Por fuente, qué pasó con las vacantes registradas desde `since` (filas de Hoja 1: Fecha, Empresa, Cargo, Link, Match
 * Score, Estado, Fuente). La pestaña "Fuentes" dice cuántas trae cada una; esta dice cuántas terminan con HV, cuántas
 * quedan dudosas y cuántas se descartan (decisión del usuario 2026-10-27: medir calidad, no solo cantidad). Las
 * publicaciones manuales no cuentan. Ordenadas por vacantes con HV.
 */
function sourceQualityRows(rows, since) {
  const by = {};
  rows.filter(r => String(r[0]) >= since && !/^Manual/i.test(String(r[5]))).forEach(r => {
    const name = String(r[6] || '').trim() || 'Sin fuente (antes del 27 oct)';
    const s = by[name] = by[name] || { total: 0, hv: 0, wait: 0, doubt: 0, out: 0, dup: 0 };
    const status = String(r[5] || '');
    s.total++;
    if (/^Pendiente|HV|enviad/i.test(status)) s.hv++;
    else if (/^Dudosa/i.test(status)) s.doubt++;
    else if (/^Descartada/i.test(status)) s.out++;
    else if (/^Repetida/i.test(status)) s.dup++;
    else s.wait++;
  });
  return Object.keys(by).map(name => {
    const s = by[name];
    return [name, s.total, s.hv, s.wait, s.doubt, s.out, s.dup, s.total ? Math.round(100 * s.hv / s.total) + '%' : '—'];
  }).sort((a, b) => b[2] - a[2] || b[1] - a[1]);
}

/** Reescribe la pestaña "Calidad por fuente" (la llama sincronizarAplicadas cada hora). */
function writeSourceQuality_() {
  const ss = SpreadsheetApp.openById(getProp_(PROPS.SHEET_ID));
  const registry = ss.getSheets()[0];
  if (registry.getLastRow() < 2) return;
  const rows = registry.getRange(2, 1, registry.getLastRow() - 1, CONFIG.SHEET_HEADERS.length).getDisplayValues();
  const since = Utilities.formatDate(new Date(Date.now() - (CONFIG.SOURCE_QUALITY_DAYS - 1) * 86400000), tz_(), 'yyyy-MM-dd');
  const values = [CONFIG.SOURCE_QUALITY_HEADERS].concat(sourceQualityRows(rows, since));
  const sheet = ss.getSheetByName(CONFIG.SOURCE_QUALITY_SHEET_NAME) ||
                ss.insertSheet(CONFIG.SOURCE_QUALITY_SHEET_NAME, ss.getNumSheets());
  sheet.clear();
  sheet.getRange(1, 1, values.length, values[0].length).setValues(values);
  sheet.getRange(values.length + 2, 1).setValue('Vacantes registradas desde ' + since + ' (' + CONFIG.SOURCE_QUALITY_DAYS +
    ' días). Con HV = la IA la verificó y se armó su hoja de vida. Actualizado ' +
    Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd HH:mm') + '.');
  sheet.setFrozenRows(1);
}
