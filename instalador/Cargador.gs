/**
 * CARGADOR DEL AGENTE UX — único archivo del proyecto de Apps Script.
 * En cada ejecución descarga desde GitHub (rama "deploy", solo código con pruebas en verde)
 * la última versión del agente y la ejecuta. No hace falta copiar nada cuando el código cambie.
 */
const AGENTE_URL_ = 'https://raw.githubusercontent.com/oscargarciaux-maker/ux_job_agent/deploy/apps_script/';

function ejecutarPipeline() { agente_().ejecutarPipeline(); }
function ejecutarPrueba() { agente_().ejecutarPrueba(); }
function ejecutarSimulacion() { agente_().ejecutarSimulacion(); }
function configurarAgente() { agente_().configurarAgente(); }
function generarCVsDesdeIA() { agente_().generarCVsDesdeIA(); }
function probarCVsDesdeIA() { agente_().probarCVsDesdeIA(); }
function sincronizarAplicadas() { agente_().sincronizarAplicadas(); }
function crearBorradoresEnFrio() { agente_().crearBorradoresEnFrio(); }
function configurarTablero() { agente_().configurarTablero(); }
// Tablero web para el coach: Implementar > Nueva implementación > App web (ejecutar como tú, acceso: cualquier usuario).
// Los datos ya calculados salen de la caché sin descargar el agente (carga rápida); "Actualizar" pide &fresco=1.
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.formato === 'json' && !p.fresco) {
    const key = PropertiesService.getScriptProperties().getProperty('DASHBOARD_KEY');
    const cached = CacheService.getScriptCache().get('dashboard_json');
    if (key && p.k === key && cached) {
      return ContentService.createTextOutput(cached).setMimeType(ContentService.MimeType.JSON);
    }
  }
  return agente_().doGet(e);
}

function agente_() {
  const text = (r, url) => {
    if (r.getResponseCode() !== 200) throw new Error('GitHub respondió ' + r.getResponseCode() + ' para ' + url);
    return r.getContentText();
  };
  const filesUrl = AGENTE_URL_ + 'files.json';
  const urls = JSON.parse(text(UrlFetchApp.fetch(filesUrl, { muteHttpExceptions: true }), filesUrl))
    .filter(name => /\.gs$/.test(name))
    .map(name => AGENTE_URL_ + name);
  // Todos los archivos a la vez (antes uno por uno: varios segundos más en cada ejecución)
  const code = UrlFetchApp.fetchAll(urls.map(url => ({ url: url, muteHttpExceptions: true })))
    .map((r, i) => text(r, urls[i]))
    .join('\n');
  return new Function(code + '\nreturn exports_();')();
}
