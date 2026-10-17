/**
 * Configuración global del agente.
 * Los IDs y claves NO van aquí: se guardan en Propiedades del script
 * (Configuración del proyecto > Propiedades del script).
 */
const CONFIG = {
  DAILY_LIMIT: 10,
  PIPELINE_HOUR: 8,          // 8:00 AM hora de Bogotá
  SYNC_HOUR: 7,              // Sincronización con GitHub antes del pipeline
  ROOT_FOLDER_NAME: 'Vacantes con IA',
  SHEET_TITLE: 'Vacantes UX - Registro',
  TEMPLATE_TITLE: 'Plantilla CV Maestra',
  SHEET_HEADERS: ['Fecha', 'Empresa', 'Cargo', 'Link', 'Match Score', 'Estado'],
  GITHUB_REPO: 'oscargarciaux-maker/ux_job_agent',
  // Rama que GitHub Actions actualiza solo cuando las pruebas pasan (ver .github/workflows/tests.yml)
  GITHUB_DEPLOY_BRANCH: 'deploy',
  GITHUB_DIR: 'apps_script',
};

// Nombres de las Propiedades del script
const PROPS = {
  SERPAPI_API_KEY: 'SERPAPI_API_KEY',
  ROOT_FOLDER_ID: 'GOOGLE_DRIVE_ROOT_FOLDER_ID',
  SHEET_ID: 'GOOGLE_SHEET_ID',
  TEMPLATE_ID: 'GOOGLE_DOCS_MASTER_TEMPLATE_ID',
  LAST_SYNC_HASH: 'LAST_SYNC_HASH',
};

function getProp_(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

function setProp_(key, value) {
  PropertiesService.getScriptProperties().setProperty(key, value);
}
