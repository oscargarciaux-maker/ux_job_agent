/**
 * Configuración global del agente.
 * Los IDs y claves NO van aquí: se guardan en Propiedades del script
 * (Configuración del proyecto > Propiedades del script).
 */
const CONFIG = {
  DAILY_LIMIT: 10,
  MIN_JUNIOR: 5,             // Al menos 5 de las 10 vacantes diarias serán Junior (si existen)
  // 1 crédito de SerpAPI por búsqueda. La 2.ª prioriza fintech; la 1.ª cubre cualquier sector.
  SEARCH_QUERIES: ['diseñador ux ui junior', 'diseñador ux ui fintech'],
  // Orden de preferencia del enlace de cada vacante (Google Jobs lista todos los sitios donde está publicada).
  // Cualquier otro sitio (portal de la empresa u otro) va después. Más alto = más prioridad al elegir las 10 del día.
  SOURCE_PRIORITY: [
    { name: 'LinkedIn', pattern: /linkedin\.com/i, bonus: 9 },
    { name: 'Indeed', pattern: /indeed\./i, bonus: 6 },
    { name: 'Computrabajo', pattern: /computrabajo\./i, bonus: 3 },
  ],
  // Agregadores que llevan a páginas de pago: nunca se usa su enlace. Si una vacante solo está en ellos, se descarta.
  BLOCKED_SOURCES: /trabajo\.org|jooble\.|jobleads\./i,
  // Sector preferido (no excluyente): suma puntos al elegir las 10 del día.
  FINTECH_PATTERN: /fintech|banc[oa]|bancari|financier|pagos|payments|cr[eé]dito|neobanco|seguros|insurtech|wallet|billetera|nequi|daviplata|nubank|rappipay/i,
  FINTECH_BONUS: 10,
  SEARCH_LOCATION: 'Colombia',
  // Publicaciones de reclutadores en LinkedIn (contratan sin publicar vacante formal). 1 crédito más por día.
  // Solo trae el fragmento visible del post (LinkedIn no permite leer el post completo sin sesión).
  LINKEDIN_POSTS_QUERY: 'site:linkedin.com/posts ("diseñador ux" OR "diseñador ui" OR "ux/ui" OR "ux designer" OR "product designer") ' +
                        '("estamos contratando" OR "buscamos" OR "vacante" OR "hiring" OR "estamos buscando")',
  MAX_POST_AGE_DAYS: 14,
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
