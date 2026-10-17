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

function agente_() {
  const get = url => {
    const r = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (r.getResponseCode() !== 200) throw new Error('GitHub respondió ' + r.getResponseCode() + ' para ' + url);
    return r.getContentText();
  };
  const code = JSON.parse(get(AGENTE_URL_ + 'files.json'))
    .filter(name => /\.gs$/.test(name))
    .map(name => get(AGENTE_URL_ + name))
    .join('\n');
  return new Function(code + '\nreturn exports_();')();
}
