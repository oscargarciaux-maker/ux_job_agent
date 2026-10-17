/**
 * INSTALADOR (solo la primera vez).
 * 1. Pega este archivo en Código.gs de un proyecto nuevo de Apps Script.
 * 2. Pega apps_script/appsscript.json en el manifiesto del proyecto.
 * 3. Ejecuta la función "instalar". Descarga todo el agente desde GitHub y reemplaza este archivo.
 */
function instalar() {
  const repo = 'oscargarciaux-maker/ux_job_agent';
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'ux-job-agent-installer' };
  const entries = JSON.parse(UrlFetchApp.fetch(
    'https://api.github.com/repos/' + repo + '/contents/apps_script?ref=main', { headers: headers }).getContentText());

  const files = entries
    .filter(e => e.type === 'file' && (/\.gs$/.test(e.name) || e.name === 'appsscript.json'))
    .map(e => {
      const source = UrlFetchApp.fetch(e.download_url).getContentText();
      return e.name === 'appsscript.json'
        ? { name: 'appsscript', type: 'JSON', source: source }
        : { name: e.name.replace(/\.gs$/, ''), type: 'SERVER_JS', source: source };
    });

  const response = UrlFetchApp.fetch('https://script.googleapis.com/v1/projects/' + ScriptApp.getScriptId() + '/content', {
    method: 'put',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    payload: JSON.stringify({ files: files }),
    muteHttpExceptions: true,
  });
  if (response.getResponseCode() !== 200) {
    throw new Error('Error ' + response.getResponseCode() + ': ' + response.getContentText().slice(0, 300) +
      '\n¿Activaste la API de Google Apps Script en https://script.google.com/home/usersettings ?');
  }
  console.log('Agente instalado (' + files.length + ' archivos). Recarga la página del editor.');
}
