/**
 * Configuración global del agente.
 * Los IDs y claves NO van aquí: se guardan en Propiedades del script
 * (Configuración del proyecto > Propiedades del script).
 */
const CONFIG = {
  DAILY_LIMIT: 15,           // Meta del usuario: ~50 postulaciones por semana
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
  BLOCKED_SOURCES: /trabajo\.org|jooble\.|jobleads\.|bebee\.|upwork\.|freelancer\.|workana\.|fiverr\./i,
  // Vacantes que se descartan por su texto (decisiones del usuario 2026-10-19).
  EXCLUDED_VACANCY_RULES: [
    { reason: 'copia de JobLeads', pattern: /J-18808-Ljbffr/ },
    { reason: 'pasantía no remunerada', pattern: /unpaid|no remunerad|sin remuneraci|ad[- ]honorem/i },
    { reason: 'por proyecto / freelance',
      pattern: /modalidad freelance|freelance (role|position|contract|basis|job)|contrato por proyecto|pago por proyecto|por proyecto|project[- ]based|per project|\(freelance\)|- freelance\b/i },
  ],
  // Piden 5 o más años: no se descartan, pero bajan de prioridad. Con menos de 5 años cuenta como mid aunque diga Senior.
  EXPERIENCE_YEARS_LIMIT: 5,
  EXPERIENCE_PENALTY: 30,
  // Fuentes gratuitas (sin créditos de SerpAPI) con API pública. 1 llamada por día cada una.
  EXTRA_SOURCES: {
    remotive: { url: 'https://remotive.com/api/remote-jobs?category=design&limit=100' },
    // Jobicy: solo vacantes remotas abiertas a LATAM (geo=latam)
    jobicy: { url: 'https://jobicy.com/api/v2/remote-jobs?count=100&geo=latam' },
    getonbrd: { url: 'https://www.getonbrd.com/api/v0/search/jobs?per_page=100&expand=%5B%22company%22%5D&query=' ,
                queries: ['ux', 'ui', 'product designer', 'diseñador', 'figma', 'experiencia de usuario', 'diseño de producto'] },
  },
  // Ubicaciones de vacantes remotas a las que se puede aplicar desde Colombia
  REACHABLE_REMOTE_LOCATION: /worldwide|anywhere|latam|latin|am[eé]rica|south america|colombia|global|international/i,
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
  LINKEDIN_POST_LOCATION_PATTERN: /remot|remote|latam|latinoam|am[eé]rica latina|colombia|bogot|medell|anywhere|work from home|home office/i,
  MAX_POST_AGE_DAYS: 14,
  // Apps Script corta a los 6 min: se deja de crear vacantes a los 4 (las que falten se retoman en la próxima corrida)
  TIME_BUDGET_MS: 4 * 60 * 1000,
  // La publicación debe ser de un rol de diseño (evita "remote hiring" de otros oficios, p. ej. video annotation)
  LINKEDIN_POST_ROLE_PATTERN: /ux\s*\/\s*ui|ui\s*\/\s*ux|(ux|ui|product)\s+design|designer\s+(ux|ui)|dise[nñ]ador|design system|figma|ux research/i,
  // Si Google Jobs no trae la fecha, se lee "datePosted" de la página original (gratis, sin SerpAPI). Las que siguen
  // sin fecha solo entran (marcadas "SIN VERIFICAR") si con las verificadas no se llega a MIN_DAILY.
  MIN_DAILY: 5,              // Pueden ser menos de DAILY_LIMIT, pero no menos de 5 (decisión del usuario)
  PIPELINE_HOUR: 8,          // 8:00 AM hora de Bogotá
  ROOT_FOLDER_NAME: 'Vacantes con IA',
  SHEET_TITLE: 'Vacantes UX - Registro',
  TEMPLATE_TITLE: 'Plantilla CV Maestra',
  MANUAL_FOLDER_COLOR: '#fad165',   // Amarillo de Drive: carpetas de publicaciones para proceso manual
  MASTER_TEMPLATE_NAME: 'MASTER_TEMPLATE',   // Si existe en la carpeta raíz, tiene prioridad
  CONTEXT_DOC_NAME: 'CONTEXTO_CV',   // Google Doc privado con los datos reales (validación anti-alucinación)
  CV_JSON_NAME: 'CV_IA.json',        // Lo deja la IA en la carpeta de cada vacante
  CV_ERRORS_NAME: 'CV_IA_ERRORES.txt',
  CV_TEST_FOLDER: 'PRUEBA_IA',       // Carpeta de prueba en la raíz para probarCVsDesdeIA
  CV_EXPORT_PDF: false,      // En pausa: el usuario ajusta a mano el Google Doc del CV y exporta él mismo
  CV_FILE_PREFIX: 'HV_',     // HV_Nombre_Apellido_Cargo (guía Adaptia); el nombre completo lo da _nombre_archivo
  CV_HOUR: 10,               // 10:00 AM: arma CV/PDF/borrador con los CV_IA.json de hoy
  SHEET_HEADERS: ['Fecha', 'Empresa', 'Cargo', 'Link', 'Match Score', 'Estado'],
  // Vacantes ya aplicadas por el usuario (carpetas coloreadas: rojo rechazada, verde en proceso, amarillo sin respuesta)
  APPLIED_FOLDER_NAME: 'CV',
  APPLIED_SHEET_NAME: 'Aplicadas',
  APPLIED_SHEET_HEADERS: ['Grupo (carpeta)', 'Empresa', 'Cargo', 'Estado', 'Color', 'Carpeta', 'Creada'],
};

// Nombres de las Propiedades del script
const PROPS = {
  SERPAPI_API_KEY: 'SERPAPI_API_KEY',
  ROOT_FOLDER_ID: 'GOOGLE_DRIVE_ROOT_FOLDER_ID',
  SHEET_ID: 'GOOGLE_SHEET_ID',
  TEMPLATE_ID: 'GOOGLE_DOCS_MASTER_TEMPLATE_ID',
};

function getProp_(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

function setProp_(key, value) {
  PropertiesService.getScriptProperties().setProperty(key, value);
}
