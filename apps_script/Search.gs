/**
 * Fase 1: búsqueda con SerpAPI.
 * - Motor Google Jobs: vacantes formales con DESCRIPCIÓN COMPLETA (LinkedIn, Indeed, Computrabajo, sitios de empresas...).
 * - Google Dorking en linkedin.com/posts: reclutadores que contratan por publicación (solo fragmento visible).
 */
function searchUxJobs_(startedAt) {
  startedAt = startedAt || Date.now();
  const apiKey = getProp_(PROPS.SERPAPI_API_KEY);
  if (!apiKey) throw new Error('Falta la propiedad SERPAPI_API_KEY en Propiedades del script.');

  const byKey = {};   // Misma vacante en varias fuentes -> una sola (la primera que la trae queda como su origen)
  const add = (v, origin, key) => { v.origin = v.origin || origin; const k = key || vacancyKey(v); byKey[k] = byKey[k] || v; };
  const today = new Date();
  // Una sola vez al día (≈3 créditos): el repaso de las 5:45 y las corridas a mano solo usan las fuentes gratuitas
  const day = Utilities.formatDate(today, tz_(), 'yyyy-MM-dd');
  const serpDue = serpApiDue(getProp_(PROPS.SERPAPI_LAST_DAY), day);
  if (serpDue) setProp_(PROPS.SERPAPI_LAST_DAY, day);
  else console.log('SerpAPI ya se consultó hoy (' + day + '): esta corrida usa solo las fuentes gratuitas.');
  const queries = !serpDue ? [] : [{ q: pickDailyItems(CONFIG.SEARCH_QUERY_POOL, 1, today)[0], remote: false },
                                   { q: pickDailyItems(CONFIG.REMOTE_QUERY_POOL, 1, today)[0], remote: true }];
  if (serpDue) console.log('Búsquedas de hoy: ' + queries.map(x => x.q).join(' | '));
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
    usable.forEach(v => add(v, 'Google Jobs (SerpAPI)'));
  });
  // Fuentes gratuitas; el nombre es el que aparece en la pestaña "Fuentes" del registro (conteo por corrida). Van de la
  // más rápida a la más lenta y, pasado SEARCH_BUDGET_MS, no se consultan más. elempleo (3 min desde Google el 27 oct
  // 2026) y el buscador público de LinkedIn (60 búsquedas, 24 con 429) ya no se buscan aquí: llegan en el JSON de GitHub
  // Actions (tools/jobspy_buscar.py).
  [[searchJobSpy_, 'JobSpy (GitHub Actions)'], [searchEmailAlerts_, 'Alertas de LinkedIn (correo)'],
   [searchGetOnBoard_, 'Get on Board'], [searchRemotive_, 'Remotive'], [searchJobicy_, 'Jobicy'], [searchHimalayas_, 'Himalayas'],
   [searchAtsBoards_, 'Portales de empresas objetivo']].forEach(([source, origin]) => {
    if (Date.now() - startedAt > CONFIG.SEARCH_BUDGET_MS) {
      console.warn('Sin tiempo para ' + origin + ' en esta corrida (' + Math.round((Date.now() - startedAt) / 1000) + ' s de búsqueda)');
      return;
    }
    try {
      source().forEach(v => add(v, v.isPost || v.fromPost ? origin + ' · publicaciones' : origin, v.isPost || v.fromPost ? v.link : null));
    } catch (e) {
      console.warn('Fuente ' + source.name + ' falló: ' + e.message);
    }
  });
  if (serpDue && CONFIG.LINKEDIN_POST_ROLE_POOL.length) {
    searchLinkedInPosts_(apiKey).forEach(v => add(v, 'Publicaciones LinkedIn (SerpAPI)', v.link));
  }
  try {
    searchBravePosts_().forEach(v => add(v, 'Publicaciones LinkedIn (Brave)', v.link));
  } catch (e) {
    console.warn('Fuente searchBravePosts_ falló: ' + e.message);
  }
  return Object.keys(byKey).map(k => byKey[k]).filter(v => {
    let reason = exclusionReason(v);
    if (!reason && !v.isPost && !v.fromPost) {
      // Google Jobs llega por búsquedas de diseño: solo se descarta redacción/SEO/programación; los demás títulos que no
      // son de diseño entran marcados para revisar sus funciones
      const cls = roleTitleClass(v.title);
      if (cls === 'excluded') reason = 'no es diseño (redacción, SEO o programación)';
      else if (cls !== 'design') v.roleToVerify = true;
    }
    if (reason) console.log('Descartada (' + reason + '): ' + v.title + ' @ ' + v.company);
    return !reason;
  });
}

/** true si hoy aún no se ha consultado SerpAPI (lastDay y today en yyyy-MM-dd, hora de Bogotá). */
function serpApiDue(lastDay, today) {
  return String(lastDay || '') !== today;
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
  const kept = jobs.filter(v => acceptRoleTitle_(v) && CONFIG.REACHABLE_REMOTE_LOCATION.test(v.location) &&
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
  const kept = jobs.filter(v => acceptRoleTitle_(v) && isRecent(v.postedAt, CONFIG.MAX_POST_AGE_DAYS));
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

function searchHimalayas_() {
  const cfg = CONFIG.EXTRA_SOURCES.himalayas;
  const byLink = {};
  cfg.queries.forEach(q => {
    (fetchJson_(cfg.url + encodeURIComponent(q)).jobs || []).map(parseHimalayasJob)
      .forEach(v => { if (v && v.link) byLink[v.link] = v; });
  });
  const jobs = Object.keys(byLink).map(k => byLink[k]);
  const kept = jobs.filter(v => acceptRoleTitle_(v) && isRecent(v.postedAt, CONFIG.MAX_POST_AGE_DAYS) && isReachableRemoteJob(v));
  console.log('Himalayas: ' + jobs.length + ' resultados abiertos a Colombia, ' + kept.length + ' de UX/UI recientes');
  return kept;
}

/**
 * Un aviso de Himalayas, o null si no sirve: voluntariado, o con países permitidos que no incluyen a Colombia (sin
 * lista = todo el mundo). Muchos dicen la región solo al inicio de la descripción («Remote (Europe)»): se pasa a la
 * ubicación para que isReachableRemoteJob y el prefiltro por país la vean.
 */
function parseHimalayasJob(job) {
  if (!job || /volunteer/i.test(job.employmentType || '')) return null;
  const allowed = [].concat(job.locationRestrictions || []);
  if (allowed.length && !allowed.some(c => /colombia/i.test(c))) return null;
  const description = stripHtml_(job.description || job.excerpt || '');
  const region = (/remote\s*\(([^)]{2,40})\)/i.exec(description.slice(0, 400)) || [])[1] || '';
  if (region && /\b(europe|eu|emea|us|usa|united states|uk|united kingdom|canada|india|apac|asia)\b/i.test(region) &&
      !CONFIG.OPEN_TO_COLOMBIA_PATTERN.test(region)) return null;
  const published = job.pubDate ? new Date(Number(job.pubDate) * 1000).toISOString().slice(0, 10) : '';
  return {
    title: job.title || '', company: job.companyName || '',
    location: 'Remote ' + (allowed.length ? 'Colombia' : 'worldwide') + (region ? ' (' + region + ')' : ''),
    description: description, snippet: '', link: String(job.guid || job.applicationLink || '').replace(/\?utm_source=api$/, ''),
    postedAt: published, source: 'Himalayas', sourceBonus: 0,
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
  const kept = jobs.filter(v => acceptRoleTitle_(v) && CONFIG.REACHABLE_REMOTE_LOCATION.test(v.location) &&
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

/** UrlFetchApp.fetchAll por tandas con pausa: a LinkedIn, muchas peticiones simultáneas le dan 429. */
function fetchAllPaced_(requests, size, pauseMs) {
  let out = [];
  for (let i = 0; i < requests.length; i += size) {
    if (i) Utilities.sleep(pauseMs);
    out = out.concat(UrlFetchApp.fetchAll(requests.slice(i, i + size)));
  }
  return out;
}

function decodeHtml_(text) {
  return String(text || '').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
}

/** Página pública de un aviso de LinkedIn: descripción completa y si ya no recibe postulaciones. */
function parseLinkedInJobDetail(html) {
  const text = String(html || '');
  const markup = (text.match(/show-more-less-html__markup[^>]*>([\s\S]*?)<\/div>/) || [])[1] || '';
  // Encabezado del aviso (lo usan las alertas por correo, que solo traen el id): cargo, empresa, ciudad y "hace N días"
  const field = re => decodeHtml_(stripHtml_((text.match(re) || [])[1] || ''));
  return {
    description: stripHtml_(markup),
    closed: /No longer accepting applications|Ya no se aceptan solicitudes|closed-job/i.test(text),
    title: field(/top-card-layout__title[^>]*>([\s\S]*?)<\/h[12]>/),
    company: field(/topcard__org-name-link[^>]*>([\s\S]*?)<\/a>/),
    location: field(/topcard__flavor topcard__flavor--bullet[^>]*>([\s\S]*?)<\/span>/),
    postedAgo: field(/posted-time-ago__text[^>]*>([\s\S]*?)<\/span>/),
  };
}

/** Rol de diseño UX/UI/producto (no diseño gráfico puro, no otros oficios). */
/**
 * Clase del cargo según su título (decisión del usuario 2026-10-24: el cargo se juzga por funciones, no por título):
 * 'design' = título de diseño; 'verify' = título dudoso (CX, contenido, producto digital, product owner/analyst):
 * entra con menor prioridad y marcado para revisar sus funciones; 'excluded' = redacción, SEO o programación;
 * 'other' = nada de lo anterior.
 */
function roleTitleClass(title) {
  const t = String(title || '');
  // \bux\b: "Linux" contiene "ux" (el 2026-10-19 entraron 2 vacantes de infraestructura Linux)
  if (/copywrit|writer|redactor|\bseo\b|developer|desarrollador|programador|engineer|ingenier/i.test(t)) return 'excluded';
  // 2026-10-28 (decisión del usuario: «acepta más cargos»): también diseño de servicios, de interacción y
  // conversacional, investigación con usuarios y arquitectura de información
  const design = /\bux\b|\bui\b|user experience|experiencia de usuario|product design|dise[nñ]ador(a)? de producto|interaction|interfaz|interfaces|dise[nñ]o de (producto|experiencia|interacci|servicio)|dise[nñ]ador(a)? (digital|web)|web designer|visual designer|service design|design system|dise[nñ]ador(\(a\)|a)? de (servicio|interacci|experiencia(?! (del |de )?cliente))|(?<!customer )experience designer|user research|design research|investigador(\(a\)|a)? (ux|de usuario|de experiencia)|investigaci[oó]n (con|de) usuario|conversation(al)? design|dise[nñ](o|ador(a)?) conversacional|information architect|arquitect(o|a|ura) de (la )?informaci[oó]n/i.test(t);
  if (design && !/content|contenido/i.test(t)) return 'design';
  if (design || /\bcx\b|customer experience|experiencia (del |de )?cliente|content design|producto digital|digital product|product (owner|analyst|specialist)|analista de producto/i.test(t)) return 'verify';
  return 'other';
}

function isDesignRole(vacancy) {
  return roleTitleClass(vacancy.title) === 'design';
}

/** Fuentes gratuitas: entran los títulos de diseño y los dudosos (estos marcados para revisar funciones). */
function acceptRoleTitle_(vacancy) {
  const cls = roleTitleClass(vacancy.title);
  if (cls === 'verify') vacancy.roleToVerify = true;
  return cls === 'design' || cls === 'verify';
}

function stripHtml_(html) {
  return String(html || '').replace(/<br\s*\/?>|<\/p>|<\/li>/gi, '\n').replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
}

/** Posts de reclutadores en LinkedIn (últimas 3 semanas) vía Google Dorking, con el rol del día. */
function searchLinkedInPosts_(apiKey) {
  const q = buildLinkedInPostsQuery(pickDailyItems(CONFIG.LINKEDIN_POST_ROLE_POOL, 1, new Date())[0]);
  console.log('Publicaciones de LinkedIn de hoy: ' + q);
  const params = { engine: 'google', q: q, tbs: 'qdr:w3', hl: 'es', gl: 'co', num: 20, api_key: apiKey };
  const query = Object.keys(params).map(k => k + '=' + encodeURIComponent(params[k])).join('&');
  const response = UrlFetchApp.fetch('https://serpapi.com/search.json?' + query, { muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) {
    console.warn('SerpAPI respondió ' + response.getResponseCode() + ' para publicaciones de LinkedIn.');
    return [];
  }
  const posts = (JSON.parse(response.getContentText()).organic_results || []).map(parseLinkedInPost);
  const kept = posts.filter(v => v.link && isRecent(v.postedAt, CONFIG.MAX_POST_AGE_DAYS) && isReachablePost(v));
  console.log('Publicaciones: ' + posts.length + ' resultados, ' + kept.length + ' de diseño y accesibles desde Colombia');
  return enrichLinkedInPosts_(kept);
}

/**
 * Texto completo de cada publicación (decisión del usuario 2026-10-26: las publicaciones también reciben HV). La página
 * pública del post trae el texto entero en su JSON-LD SocialMediaPosting, sin sesión de LinkedIn. Las que se leen pasan
 * a ser vacantes (carpeta, Detalle_Vacante e IA); las que no abren siguen en el documento "Posts" para el proceso manual.
 */
function enrichLinkedInPosts_(posts) {
  if (!posts.length) return posts;
  let responses = [];
  try {
    responses = UrlFetchApp.fetchAll(posts.map(v => ({ url: v.link, muteHttpExceptions: true, followRedirects: true,
                                                        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'es-CO,es;q=0.9' } })));
  } catch (e) {
    console.warn('No se pudo leer el texto completo de las publicaciones: ' + e.message);
  }
  let full = 0, dropped = 0;
  const kept = posts.filter((v, i) => {
    const r = responses[i];
    const page = r && r.getResponseCode() === 200 ? parseLinkedInPostPage(r.getContentText()) : null;
    if (!page || !page.text) return true;
    v.description = page.text;
    if (page.date) v.postedAt = page.date;
    if (page.author && /^Post LinkedIn$/.test(v.company)) v.company = 'Post ' + page.author;
    v.isPost = false;
    v.fromPost = true;
    v.source = 'Publicación LinkedIn (texto completo)';
    if (!isRecent(v.postedAt, CONFIG.MAX_POST_AGE_DAYS) || !isReachablePost(v)) {
      console.log('Descartada (publicación vieja, cerrada, sin rol de diseño o no accesible desde Colombia): ' + v.link);
      dropped++;
      return false;
    }
    full++;
    return true;
  });
  console.log('Publicaciones con texto completo: ' + full + ' (pasan a la IA), ' + dropped + ' descartadas al leerlas, ' +
              (kept.length - full) + ' sin texto (proceso manual)');
  return kept;
}

/** { text, date (YYYY-MM-DD), author } del JSON-LD SocialMediaPosting de la página pública de un post, o null. */
function parseLinkedInPostPage(html) {
  const re = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(String(html || '')))) {
    let data;
    try { data = JSON.parse(m[1]); } catch (e) { continue; }
    const items = [].concat(data['@graph'] || data);
    const post = items.filter(x => x && /SocialMediaPosting|Article/.test(x['@type'] || ''))[0];
    if (!post) continue;
    const text = String(post.articleBody || post.text || '').trim();
    const author = post.author && (post.author.name || (post.author[0] && post.author[0].name)) || '';
    return { text: text, date: String(post.datePublished || '').slice(0, 10), author: String(author).trim() };
  }
  return null;
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
  return /linkedin\.com\/(posts|feed\/update)\//i.test(post.link || '') && !CONFIG.CLOSED_POST_PATTERN.test(text) &&
    !CONFIG.POST_NOISE_PATTERN.test(text) &&
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
function verifyPostingDates_(vacancies, startedAt) {
  // Se abre la página original de todas las vacantes formales (gratis): da la fecha si Google Jobs no la trajo y
  // permite descartar las que ya no reciben postulaciones (guía 2026-10-22: solo vacantes abiertas y verificadas).
  // Las publicaciones y los avisos cuya página ya se leyó al buscarlos (LinkedIn, elempleo, alertas) no se abren de nuevo.
  // Desde el 27 oct 2026 solo se abren las que no traen fecha (la regla de 21 días la necesita) y nunca las de
  // linkedin.com: tres corridas seguidas se colgaron más de 4 min en la primera tanda de páginas, con LinkedIn en ella,
  // después de las 60 búsquedas públicas a LinkedIn (UrlFetchApp no tiene tiempo límite). Si siguen abiertas lo
  // comprueba la verificación de la IA (verificar-vacante), que abre cada aviso.
  vacancies.filter(v => !v.isPost && !v.fromPost && !v.postedAt && /linkedin\.com/i.test(hostOf_(v.link || '')))
    .forEach(v => { v.dateUnverified = true; });
  const pending = vacancies.filter(v => !v.isPost && !v.fromPost && !v.pageChecked && !v.postedAt &&
                                        !/linkedin\.com/i.test(hostOf_(v.link || '')));
  // Por tandas, mirando el reloj antes de cada una: el 27 oct 2026 (9:46) un solo fetchAll de todas las páginas tardó
  // más de 5 min y Apps Script cortó la corrida sin crear carpetas. Las que no alcanzan a abrirse quedan para la IA.
  let opened = 0;
  if (pending.length) console.log('Verificando las páginas de ' + pending.length + ' vacantes (tandas de ' + CONFIG.VERIFY_BATCH + '): ' +
                                  pending.map(v => hostOf_(v.link)).join(', '));
  for (let i = 0; i < pending.length; i += CONFIG.VERIFY_BATCH) {
    if (startedAt && Date.now() - startedAt > CONFIG.VERIFY_BUDGET_MS) break;
    const batch = pending.slice(i, i + CONFIG.VERIFY_BATCH);
    const t0 = Date.now();
    let responses = [];
    try {
      responses = UrlFetchApp.fetchAll(batch.map(v => ({ url: v.link, muteHttpExceptions: true, followRedirects: true })));
    } catch (e) {
      console.warn('No se pudieron leer las páginas de las vacantes para verificar su fecha: ' + e.message);
    }
    if (Date.now() - t0 > 20000) console.warn('Páginas lentas (' + Math.round((Date.now() - t0) / 1000) + ' s): ' + batch.map(v => hostOf_(v.link)).join(', '));
    batch.forEach((v, j) => {
      const r = responses[j];
      if (r && (r.getResponseCode() === 404 || r.getResponseCode() === 410)) v.deadLink = true;  // La vacante ya no existe
      const html = r && r.getResponseCode() === 200 ? r.getContentText() : '';
      if (isClosedPosting(html)) v.closed = true;
      if (v.postedAt) return;
      const dates = extractJobPostingDates(html);
      if (dates.posted) v.postedAt = dates.posted;
      if (dates.validThrough) v.validThrough = dates.validThrough;
      if (!dates.posted) v.dateUnverified = true;
    });
    opened += batch.length;
  }
  if (opened < pending.length) {
    console.warn('Sin tiempo para abrir las páginas de ' + (pending.length - opened) + ' vacantes: quedan para la verificación de la IA');
    pending.slice(opened).forEach(v => { if (!v.postedAt) v.dateUnverified = true; });
  }
  const today = new Date();
  return vacancies.filter(v => {
    const ok = !v.deadLink && !v.closed && isRecent(v.postedAt, v.maxAgeDays || CONFIG.MAX_POST_AGE_DAYS, today) &&
               !isExpired(v.validThrough, today);
    if (!ok) console.log('Descartada (' + (v.deadLink ? 'enlace ya no existe' : v.closed ? 'ya no recibe postulaciones' :
                        'antigüedad, publicada ' + v.postedAt) + '): ' + v.title + ' @ ' + v.company);
    return ok;
  });
}

/** true si la página de la vacante dice que ya no recibe postulaciones. */
function isClosedPosting(html) {
  return CONFIG.CLOSED_POSTING_PATTERN.test(String(html || ''));
}

/**
 * Fechas del JobPosting (JSON-LD) de la página de una vacante: { posted, validThrough } en YYYY-MM-DD o null.
 * Acepta mes y día de un dígito (elempleo publica "2026-9-7": así entró una vacante de 47 días el 2026-10-24).
 */
function extractJobPostingDates(html) {
  const find = key => {
    const m = String(html || '').match(new RegExp('"' + key + '"\\s*:\\s*"(\\d{4})-(\\d{1,2})-(\\d{1,2})'));
    return m ? m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2) : null;
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
