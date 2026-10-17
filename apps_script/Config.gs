/**
 * Configuración global del agente.
 * Los IDs y claves NO van aquí: se guardan en Propiedades del script
 * (Configuración del proyecto > Propiedades del script).
 */
const CONFIG = {
  DAILY_LIMIT: 10,
  MIN_JUNIOR: 5,             // Al menos 5 de las 10 vacantes diarias serán Junior (si existen)
  SEARCH_QUERIES: ['diseñador ux ui junior', 'diseñador ux ui'],  // 1 crédito de SerpAPI por búsqueda
  SEARCH_LOCATION: 'Colombia',
  // Publicaciones de reclutadores en LinkedIn (contratan sin publicar vacante formal). 1 crédito más por día.
  // Solo trae el fragmento visible del post (LinkedIn no permite leer el post completo sin sesión).
  LINKEDIN_POSTS_QUERY: 'site:linkedin.com/posts ("diseñador ux" OR "diseñador ui" OR "ux/ui" OR "ux designer" OR "product designer") ' +
                        '("estamos contratando" OR "buscamos" OR "vacante" OR "hiring" OR "estamos buscando")',
  MAX_POST_AGE_DAYS: 14,
  PIPELINE_HOUR: 8,          // 8:00 AM hora de Bogotá
  ROOT_FOLDER_NAME: 'Vacantes con IA',
  SHEET_TITLE: 'Vacantes UX - Registro',
  TEMPLATE_TITLE: 'Plantilla CV Maestra',
  MANUAL_FOLDER_COLOR: '#fad165',   // Amarillo de Drive: carpetas de publicaciones para proceso manual
  MASTER_TEMPLATE_NAME: 'MASTER_TEMPLATE',   // Si existe en la carpeta raíz, tiene prioridad
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
