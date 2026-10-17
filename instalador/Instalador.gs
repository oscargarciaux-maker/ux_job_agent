/**
 * INSTALADOR (solo la primera vez).
 * 1. Pega este archivo en Código.gs de un proyecto nuevo de Apps Script.
 * 2. Pega apps_script/appsscript.json en el manifiesto del proyecto.
 * 3. Ejecuta la función "instalar". Descarga todo el agente desde GitHub y reemplaza este archivo.
 */
function instalar() {
  const base = 'https://raw.githubusercontent.com/oscargarciaux-maker/ux_job_agent/deploy/apps_script/';
  const get = url => {
    const r = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (r.getResponseCode() !== 200) throw new Error('GitHub respondió ' + r.getResponseCode() + ' para ' + url);
    return r.getContentText();
  };

  const files = JSON.parse(get(base + 'files.json')).map(name => name === 'appsscript.json'
    ? { name: 'appsscript', type: 'JSON', source: get(base + name) }
    : { name: name.replace(/\.gs$/, ''), type: 'SERVER_JS', source: get(base + name) });

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
