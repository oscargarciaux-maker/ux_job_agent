/**
 * Configuración global del agente.
 * Los IDs y claves NO van aquí: se guardan en Propiedades del script
 * (Configuración del proyecto > Propiedades del script).
 */
const CONFIG = {
  // Candidatas por día (sobre-reserva, decisión del usuario 2026-10-24): la IA las verifica y escribe HV solo a las 10
  // mejores que pasan; las demás que pasan quedan de reserva. Meta del usuario: ~50 postulaciones por semana.
  DAILY_LIMIT: 20,
  MIN_JUNIOR: 5,             // Al menos 5 de las 10 vacantes diarias serán Junior (si existen)
  // Rotación diaria (decisiones del usuario 2026-10-19). Cada día: 1 búsqueda de SEARCH_QUERY_POOL en Colombia y 1 de
  // REMOTE_QUERY_POOL (remoto para LATAM, sin limitar a Colombia), 1 crédito de SerpAPI cada una.
  // Solo español en Colombia: "product designer", "product designer junior" y "diseñador ux banca seguros" dieron
  // 0 resultados. El sector fintech lo prioriza FINTECH_BONUS, no la búsqueda.
  SEARCH_QUERY_POOL: [
    'diseñador ux ui junior', 'diseñador ux ui fintech', 'diseñador ux ui', 'diseñador ux',
    'diseñador ui', 'diseñador de experiencia de usuario', 'diseñador de interfaces', 'diseñador de producto digital',
  ],
  REMOTE_QUERY_POOL: [
    'remote ux designer latam', 'remote ui ux designer latin america',
    'remote product designer latam', 'ux ui designer remote colombia',
  ],
  // Orden de preferencia del enlace de cada vacante (Google Jobs lista todos los sitios donde está publicada).
  // Cualquier otro sitio (portal de la empresa u otro) va después. Más alto = más prioridad al elegir las 10 del día.
  SOURCE_PRIORITY: [
    { name: 'LinkedIn', pattern: /linkedin\.com/i, bonus: 9 },
    { name: 'Indeed', pattern: /indeed\./i, bonus: 6 },
    { name: 'Computrabajo', pattern: /computrabajo\./i, bonus: 3 },
  ],
  // Agregadores que llevan a páginas de pago: nunca se usa su enlace. Si una vacante solo está en ellos, se descarta.
  // También plataformas de trabajo por proyecto (decisión del usuario 2026-10-19: no quiere vacantes por proyecto).
  // vacantes.com: no permite aplicar fácil (guía 2026-10-22)
  BLOCKED_SOURCES: /trabajo\.org|jooble\.|jobleads\.|bebee\.|upwork\.|freelancer\.|workana\.|fiverr\.|vacantes\.com/i,
  // Vacantes que se descartan por su texto (decisiones del usuario 2026-10-19).
  EXCLUDED_VACANCY_RULES: [
    { reason: 'copia de JobLeads', pattern: /J-18808-Ljbffr/ },
    { reason: 'pasantía no remunerada', pattern: /unpaid|no remunerad|sin remuneraci|ad[- ]honorem/i },
    { reason: 'por proyecto / freelance',
      pattern: /modalidad freelance|freelance (role|position|contract|basis|job)|(contrato|contrataci[oó]n|pago|vinculaci[oó]n|modalidad) por proyecto|project[- ]based (contract|role|position|work)|paid per project|per project basis|\(freelance\)|- freelance\b/i },
    // Guía de búsqueda (2026-10-22): el inglés del usuario es B2 (intermedio alto, 2026-10-24); no le aplican vacantes exclusivas para
    // personas con discapacidad (no se descartan las que solo invitan a postularse en su declaración de igualdad).
    // Inglés B2 (2026-10-24): fluido, nativo o bilingüe siempre descarta; avanzado, alto, excelente o C1/C2 no
    // descartan si el aviso pide B1/B2 de forma explícita ("inglés avanzado (B2)", "B2 o C1").
    { reason: 'exige inglés avanzado/fluido',
      pattern: /\b(ingl[eé]s|english)\s*[:\-–(]?\s*(nivel\s+|level\s+)?(fluid[oa]|nativo|fluent|native)\b|\bnivel\s+(de\s+)?ingl[eé]s\s*[:\-]?\s*(fluido|nativo)\b|\bnivel\s+(fluido|nativo)\s+(de|en)\s+(ingl[eé]s|english)\b|\bingl[eé]s\s+(a\s+)?nivel\s+(fluido|nativo)\b|\b(fluent|native)\s+(level\s+(of\s+)?)?(in\s+)?english\b|\benglish\s+fluency\b|\bfluency\s+in\s+english\b|\bbiling[uü]e\b|\bbilingual\b/i },
    { reason: 'exige inglés avanzado/fluido',
      unless: /(ingl[eé]s|english)[^.\n]{0,60}\bB[12]\b|\bB[12]\b[^.\n]{0,60}(ingl[eé]s|english)/i,
      pattern: /\b(ingl[eé]s|english)\s*[:\-–(]?\s*(nivel\s+|level\s+)?(avanzado|fluid[oa]|nativo|excelente|c1|c2|advanced|fluent|native|proficient|excellent)\b|(ingl[eé]s|english)[^.\n]{0,40}\bc[12]\b|\bc[12]\b[^.\n]{0,40}(ingl[eé]s|english)|\bnivel\s+(de\s+)?ingl[eé]s\s*[:\-]?\s*(avanzado|fluido|nativo|alto|c1|c2)\b|\bnivel\s+(avanzado|alto|fluido|nativo)\s+(de|en)\s+(ingl[eé]s|english)\b|\b(excellent|excelente)\s+(command\s+of\s+|level\s+of\s+)?(english|ingl[eé]s)\b|\bingl[eé]s\s+(a\s+)?nivel\s+(avanzado|fluido|nativo|alto)\b|\b(advanced|fluent|native|proficient)\s+(level\s+(of\s+)?)?(in\s+)?english\b|\benglish\s+(fluency|proficiency)\b|\b(fluency|proficiency)\s+in\s+english\b|\bbiling[uü]e\b|\bbilingual\b/i },
    { reason: 'exclusiva para personas con discapacidad',
      pattern: /(exclusiv[oa]|dirigid[oa]|solo|[uú]nicamente)\s+(para|a)\s+personas\s+con\s+discapacidad|vacante\s+(para|de)\s+personas\s+con\s+discapacidad|certificado\s+de\s+discapacidad|exclusively\s+for\s+(people|persons|candidates)\s+with\s+disabilit/i },
  ],
  // Texto de la página original que indica que la vacante ya no recibe postulaciones (se lee gratis con UrlFetchApp)
  CLOSED_POSTING_PATTERN: /no longer accepting applications|this job (is no longer available|has expired)|job (has been )?closed|ya no (acepta|recibe) (solicitudes|postulaciones|aplicaciones)|(oferta|vacante) (cerrada|caducada|finalizada|vencida)|esta oferta (ha caducado|ya no est[aá] disponible)|proceso (de selecci[oó]n )?cerrado/i,
  EXCLUDED_TITLE_PATTERN: /\b(staff|principal|head|director|directora|vp|manager|gerente)\b/i,
  // Piden 5 o más años: no se descartan, pero bajan de prioridad. Con menos de 5 años cuenta como mid aunque diga Senior.
  EXPERIENCE_YEARS_LIMIT: 5,
  EXPERIENCE_PENALTY: 30,
  // Título dudoso (CX, contenido, producto digital…): entra con menor prioridad y "Rol: VERIFICAR FUNCIONES" (2026-10-24)
  ROLE_VERIFY_PENALTY: 15,
  // Fuentes gratuitas (sin créditos de SerpAPI) con API pública. 1 llamada por día cada una.
  EXTRA_SOURCES: {
    remotive: { url: 'https://remotive.com/api/remote-jobs?category=design&limit=100' },
    // Jobicy: solo vacantes remotas abiertas a LATAM (geo=latam)
    jobicy: { url: 'https://jobicy.com/api/v2/remote-jobs?count=100&geo=latam' },
    getonbrd: { url: 'https://www.getonbrd.com/api/v0/search/jobs?per_page=100&expand=%5B%22company%22%5D&query=' ,
                queries: ['ux', 'ui', 'product designer', 'diseñador', 'figma', 'experiencia de usuario', 'diseño de producto'] },
    // LinkedIn: buscador público de empleos (sin sesión, 0 créditos), solo avisos de la última semana (f_TPR=r604800).
    // 2026-10-26: los días anteriores solo llegaban publicaciones; esta fuente trae vacantes formales y recientes de
    // Colombia y remotas para LATAM, con fecha real y descripción completa (endpoint jobPosting/<id>).
    linkedin: {
      searchUrl: 'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search',
      detailUrl: 'https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/',
      // 2026-10-26: con 10 términos y 21 días salieron ~25 avisos de diseño en Colombia (con 6 términos y 7 días, muy pocos)
      queries: ['diseñador ux', 'diseñador ui ux', 'diseñador ux ui', 'ux designer', 'ui designer', 'ux ui designer',
                'product designer', 'diseñador de producto', 'ux researcher', 'design system'],
      // Colombia (todas las modalidades) y remotas abiertas a Colombia; 'Latin America' traía sobre todo avisos de Brasil
      // y Argentina que solo aceptan residentes de esos países
      searches: [{ location: 'Colombia' }, { location: 'Colombia', f_WT: '2' }],
      pages: 3,         // 10 avisos por página
      batch: 8,         // peticiones a la vez: de a muchas LinkedIn responde 429
      pauseMs: 1500,    // pausa entre tandas
      maxDetails: 40,   // descripciones completas que se piden por corrida
      bonus: 9,         // mismo bono de fuente que LinkedIn en SOURCE_PRIORITY
    },
    // Plan de búsqueda del usuario (2026-10-27): ver apps_script/Fuentes.gs
    jobspy: {   // JSON que deja .github/workflows/jobspy.yml (tools/jobspy_buscar.py) 4 veces al día
      url: 'https://raw.githubusercontent.com/oscargarciaux-maker/ux_job_agent/datos/jobspy.json',
    },
    ats: { maxDetectPerRun: 15, recheckDays: 14, batch: 30 },   // Greenhouse, Lever, Ashby, Workable
    alertas: {   // Correos de LinkedIn en el Gmail del usuario (solo lectura; scope gmail.readonly)
      query: 'from:(jobalerts-noreply@linkedin.com OR jobs-listings@linkedin.com OR notifications-noreply@linkedin.com) newer_than:3d',
      maxMessages: 40, maxJobs: 60, maxPosts: 30,
    },
    brave: {     // Solo si existe la propiedad BRAVE_API_KEY (plan gratuito de Brave Search API)
      url: 'https://api.search.brave.com/res/v1/web/search',
      phrases: ['estamos contratando', 'estamos buscando', 'hiring', 'buscamos'],
      roles: ['diseñador ux', 'diseñador ui', 'ux designer', 'ui ux designer', 'product designer', 'diseñador de producto'],
      queriesPerRun: 8, pauseMs: 1100,
    },
    // elempleo.com (2026-10-26): desde el 27 oct 2026 se busca en GitHub Actions (tools/jobspy_buscar.py: desde Google
    // tardaba 3 min) y llega en jobspy.json. Indeed responde 401 a Google y Computrabajo casi solo trae diseño gráfico.
    elempleo: { bonus: 3 },
  },
  // Ubicaciones de vacantes remotas a las que se puede aplicar desde Colombia
  REACHABLE_REMOTE_LOCATION: /worldwide|anywhere|latam|latin|(?<!north )am[eé]ricas?\b|south america|colombia|global|international|(utc|gmt)\s*[-−]\s*0?[3-6]\b/i,
  // Sector preferido (no excluyente): suma puntos al elegir las 10 del día.
  FINTECH_PATTERN: /fintech|banc[oa]|bancari|financier|pagos|payments|cr[eé]dito|neobanco|seguros|insurtech|wallet|billetera|nequi|daviplata|nubank|rappipay/i,
  FINTECH_BONUS: 10,
  SEARCH_LOCATION: 'Colombia',
  // Publicaciones de reclutadores en LinkedIn (contratan sin publicar vacante formal). 1 crédito más por día.
  // Solo trae el fragmento visible del post (LinkedIn no permite leer el post completo sin sesión).
  // El rol rota a diario (LINKEDIN_POST_ROLE_POOL); solo se aceptan publicaciones accesibles desde Colombia
  // (Colombia, LATAM o remoto: LINKEDIN_POST_LOCATION_PATTERN).
  LINKEDIN_POST_ROLE_POOL: [
    '"diseñador ux" OR "diseñador ui" OR "ux/ui"',
    '"product designer" OR "diseñador de producto"',
    '"ux designer" OR "ui designer" OR "ux/ui designer"',
    '"junior ux" OR "ux junior" OR "junior product designer"',
    '"ux researcher" OR "investigador ux" OR "design system"',
  ],
  LINKEDIN_POST_HIRING_TERMS: '("hiring" OR "contratando" OR "buscamos" OR "vacante" OR "estamos buscando")',
  LINKEDIN_POST_LOCATION_TERMS: '("remoto" OR "remote" OR "LATAM" OR "Colombia")',
  // Publicación que ya no contrata (2026-10-26: un post de "hiring" terminaba en "we got the people we wanted")
  // Publicaciones que no son vacantes (plan 2026-10-27): gente buscando empleo, cursos, webinars
  POST_NOISE_PATTERN: /#?open ?to ?work|busco (empleo|trabajo|oportunidad)|estoy buscando (empleo|trabajo|oportunidad|nuevos retos)|i'?m (currently )?looking for (a )?(new )?(role|job|position|opportunit)|webinar|inscr[ií]bete|bootcamp|masterclass/i,
  CLOSED_POST_PATTERN: /caducad|expirad|expired|cerrad|closed|ya no|we (got|found|have found) (the|our)|position (has been |is )?filled|no longer (hiring|accepting)|ya (contratamos|encontramos|cubrimos)|vacante (ocupada|cubierta)/i,
  LINKEDIN_POST_LOCATION_PATTERN: /remot|remote|latam|latinoam|am[eé]rica latina|colombia|bogot|medell|anywhere|work from home|home office/i,
  MAX_POST_AGE_DAYS: 21,  // Decisión del usuario 2026-10-19 (antes 14)
  // Apps Script corta a los 6 min, contados desde el inicio de la corrida. El 27 oct 2026 la búsqueda tardó más de 4
  // (elempleo solo, 3) y se cortó antes de crear carpetas: desde entonces cada fase mira el reloj de toda la corrida.
  // A los SEARCH_BUDGET_MS no se consultan más fuentes, la verificación de páginas solo corre si queda tiempo y las
  // carpetas se dejan de crear a los TIME_BUDGET_MS (las que falten se retoman en la próxima corrida).
  SEARCH_BUDGET_MS: 150 * 1000,
  VERIFY_BUDGET_MS: 200 * 1000,
  TIME_BUDGET_MS: 5 * 60 * 1000,
  // La publicación debe ser de un rol de diseño (evita "remote hiring" de otros oficios, p. ej. video annotation)
  LINKEDIN_POST_ROLE_PATTERN: /ux\s*\/\s*ui|ui\s*\/\s*ux|(ux|ui|product)\s+design|designer\s+(ux|ui)|dise[nñ]ador|design system|figma|ux research/i,
  // Si Google Jobs no trae la fecha, se lee "datePosted" de la página original (gratis, sin SerpAPI). Las que siguen
  // sin fecha solo entran (marcadas "SIN VERIFICAR") si con las verificadas no se llega a MIN_DAILY.
  MIN_DAILY: 5,              // Pueden ser menos de DAILY_LIMIT, pero no menos de 5 (decisión del usuario)
  PIPELINE_HOURS: [[7, 0], [12, 30]],   // 7:00 y 12:30 (segunda tanda, decisión del usuario 2026-10-27), ±15 min
  ROOT_FOLDER_NAME: 'Vacantes con IA',
  SHEET_TITLE: 'Vacantes UX - Registro',
  TEMPLATE_TITLE: 'Plantilla CV Maestra',
  // Publicaciones de LinkedIn (decisión del usuario 2026-10-24): sin color (amarillo = "aplicada" en su leyenda) y
  // todas en una sola carpeta del día con un documento de enlaces: Sin revisar/<fecha>/Posts/Posts
  POSTS_FOLDER_NAME: 'Posts',
  POSTS_DOC_NAME: 'Posts',
  MASTER_TEMPLATE_NAME: 'MASTER_TEMPLATE',   // Si existe en la carpeta raíz, tiene prioridad
  CONTEXT_DOC_NAME: 'CONTEXTO_CV',   // Google Doc privado con los datos reales (validación anti-alucinación)
  CV_JSON_NAME: 'CV_IA.json',        // Lo deja la IA en la carpeta de cada vacante
  CV_ERRORS_NAME: 'CV_IA_ERRORES.txt',
  // Verificación de la IA antes de la HV (decisión del usuario 2026-10-24): Verificacion.txt con "VEREDICTO: ..." y
  // "MOTIVO: ...". En cada pasada de generarCVsDesdeIA, DESCARTAR -> carpeta a la papelera; DUDOSA -> Sin revisar/<fecha>/Dudosas (él decide)
  VERIFICATION_FILE_NAME: 'Verificacion.txt',
  DOUBTFUL_FOLDER_NAME: 'Dudosas',
  // Vacantes nuevas del agente, aún sin revisar ni enviar (decisión del usuario 2026-10-22): Vacantes con IA/Sin revisar/
  // <YYYY-MM-DD>/<Empresa>. Fuera de CV/<semana>: allá solo van, movidas por el usuario, las que ya envió.
  PENDING_FOLDER_NAME: 'Sin revisar',
  CV_TEST_FOLDER: 'PRUEBA_IA',       // Carpeta de prueba en la raíz para probarCVsDesdeIA
  CV_EXPORT_PDF: false,      // En pausa: el usuario ajusta a mano el Google Doc del CV y exporta él mismo
  CV_FILE_PREFIX: 'HV_',     // HV_Nombre_Apellido_Cargo (guía Adaptia), en español; el nombre completo lo da _nombre_archivo
  CV_FILE_PREFIX_EN: 'CV_',  // en inglés la hoja de vida es CV (decisión del usuario 2026-10-26): CV_Nombre_Apellido_Cargo
  // Arma CV/PDF/borrador con los CV_IA.json de hoy cada CV_EVERY_MINUTES, entre CV_FIRST_HOUR y CV_LAST_HOUR (decisión
  // del usuario 2026-10-25: compactar la mañana; antes una sola vez a las 10:00–11:00). Las corridas sin trabajo son cortas.
  CV_EVERY_MINUTES: 10,
  CV_FIRST_HOUR: 7,
  CV_LAST_HOUR: 22,          // Hasta las 22:59: también arma las dudosas que el usuario apruebe en la tarde
  SHEET_HEADERS: ['Fecha', 'Empresa', 'Cargo', 'Link', 'Match Score', 'Estado'],
  // Vacantes ya aplicadas por el usuario (carpetas coloreadas: rojo rechazada, verde en proceso, amarillo sin respuesta)
  APPLIED_FOLDER_NAME: 'CV',
  APPLIED_SHEET_NAME: 'Aplicadas',
  // HV preparadas sin enviar (Sin revisar/<fecha>/<vacante> con HV), las escribe sincronizarAplicadas (2026-10-25)
  PENDING_CV_SHEET_NAME: 'Por enviar',
  PENDING_CV_SHEET_HEADERS: ['Fecha', 'Empresa', 'Cargo', 'Verificación', 'Revisión', 'Carpeta', 'HV'],
  APPLIED_OLD_FOLDER_PATTERN: /^antigu[ao]s?$/i,   // Carpeta de postulaciones antiguas junto a CV/ (2026-10-25)
  COLD_EMAIL_SHEET_NAME: 'Correos en frío',   // Empresas ya contactadas (columna A): no se proponen de nuevo
  COLD_EMAIL_SHEET_HEADERS: ['Empresa', 'Destinatario(s)', 'Fecha y hora envío', 'Asunto', 'CV usado', 'Estado',
                             'Respuesta / info', 'Notas'],
  // Skill correo-en-frio (2026-10-24): Vacantes con IA/Correos en frío/<Empresa>/ con la HV y Correos.json
  COLD_EMAIL_FOLDER_NAME: 'Correos en frío',
  COLD_EMAILS_FILE: 'Correos.json',
  COLD_DRAFTS_DONE_FILE: 'Borradores.txt',   // Ya se crearon sus borradores: no se repiten
  COLD_ERRORS_FILE: 'Correos_ERRORES.txt',
  CV_KEYWORDS_CHECKED: 5,                    // keywords principales que la HV debe probar fuera de las habilidades (personalizationErrors)
  COLD_EMAIL_MAX_WORDS: 35,                  // Guía Maestra de Cover Letters (la guía principal de correos del usuario)
  // Skill investigar-empresas (2026-10-24): empresas que contratan diseñadores UX/UI, con correos verificados
  TARGET_COMPANIES_SHEET_NAME: 'Empresas objetivo',
  SOURCES_SHEET_NAME: 'Fuentes',   // Conteo por fuente en cada búsqueda (plan 2026-10-27: comparar antes y después)
  SOURCES_HEADERS: ['Fecha', 'Hora', 'Corrida', 'Fuente', 'Traídas', 'Nuevas', 'Carpetas creadas'],
  TARGET_COMPANIES_HEADERS: ['Fecha', 'Empresa', 'Ámbito', 'Ciudad / país', 'Tipo', 'Sector', 'Por qué encaja (fuente)',
                             'Web', 'Página de empleo', 'Correos (fuente, fecha)', 'Estado', 'Notas'],
  // Palabras que nunca van en una HV ni en su nombre de archivo (guía 2026-10-22). Ojo: "internacional" no cuenta.
  CV_FORBIDDEN_WORDS: /\b(aprendiz\w*|voluntari\w*|practicante\w*|junior|jr|interns?|internships?|volunteer\w*|din'?t)\b/gi,
  CV_DEFAULT_ROLE: 'Product Designer',  // Cargo del nombre de archivo si la vacante no deja uno usable
  // 'Semana (carpeta)' (2026-10-25): la carpeta de primer nivel de CV/, la semana tal como la organiza el usuario
  APPLIED_SHEET_HEADERS: ['Grupo (carpeta)', 'Empresa', 'Cargo', 'Estado', 'Color', 'Carpeta', 'Creada', 'Semana (carpeta)'],
  FOLLOWUP_SHEET_NAME: 'Seguimiento',        // Skill seguimiento: una fila por hallazgo en el Gmail laboral
  // Tablero web para el coach (2026-10-25, Dashboard.gs): la interfaz se descarga de la rama deploy, como el código
  DASHBOARD_HTML_URL: 'https://raw.githubusercontent.com/oscargarciaux-maker/ux_job_agent/deploy/apps_script/dashboard.html',
  DASHBOARD_WEEKLY_GOAL: 50,                 // Meta del usuario: ~50 postulaciones por semana
  // Caché de los datos del tablero (el Cargador la lee con este mismo nombre antes de descargar el agente)
  DASHBOARD_CACHE_KEY: 'dashboard_json',
  DASHBOARD_CACHE_SECONDS: 3900,
  DASHBOARD_CACHE_MAX_CHARS: 95000,
};

// Nombres de las Propiedades del script
const PROPS = {
  SERPAPI_API_KEY: 'SERPAPI_API_KEY',
  ROOT_FOLDER_ID: 'GOOGLE_DRIVE_ROOT_FOLDER_ID',
  SHEET_ID: 'GOOGLE_SHEET_ID',
  TEMPLATE_ID: 'GOOGLE_DOCS_MASTER_TEMPLATE_ID',
  DASHBOARD_KEY: 'DASHBOARD_KEY',   // Clave del enlace del tablero web (la crea configurarTablero)
};

function getProp_(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

function setProp_(key, value) {
  PropertiesService.getScriptProperties().setProperty(key, value);
}
