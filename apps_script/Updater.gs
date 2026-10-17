/**
 * Sincronización automática GitHub -> Apps Script.
 * Cada día (antes del pipeline) descarga apps_script/ desde la rama "deploy", que GitHub Actions
 * solo actualiza cuando las pruebas pasan. Si el código cambió, reemplaza el de este proyecto.
 * Usa raw.githubusercontent.com (no la API de GitHub, cuyo límite por IP se agota en los servidores de Google).
 * Requiere activar "API de Google Apps Script" en https://script.google.com/home/usersettings
 */
function sincronizarDesdeGitHub() {
  const files = fetchProjectFiles_(CONFIG.GITHUB_DEPLOY_BRANCH);

  const hash = Utilities.base64Encode(Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256, JSON.stringify(files), Utilities.Charset.UTF_8));
  if (hash === getProp_(PROPS.LAST_SYNC_HASH)) {
    console.log('El código ya está al día con GitHub. Nada que hacer.');
    return;
  }

  updateProjectContent_(files);
  setProp_(PROPS.LAST_SYNC_HASH, hash);
  console.log('Código actualizado desde GitHub (' + files.length + ' archivos).');
}

function fetchProjectFiles_(branch) {
  const base = 'https://raw.githubusercontent.com/' + CONFIG.GITHUB_REPO + '/' + branch + '/' + CONFIG.GITHUB_DIR + '/';
  const names = JSON.parse(fetchText_(base + 'files.json'));
  const files = names.map(name => name === 'appsscript.json'
    ? { name: 'appsscript', type: 'JSON', source: fetchText_(base + name) }
    : { name: name.replace(/\.gs$/, ''), type: 'SERVER_JS', source: fetchText_(base + name) });

  if (!files.some(f => f.type === 'JSON') || !files.some(f => f.type === 'SERVER_JS')) {
    throw new Error('Contenido incompleto en GitHub; se cancela la sincronización.');
  }
  return files;
}

function fetchText_(url) {
  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) {
    throw new Error('GitHub respondió ' + response.getResponseCode() + ' para ' + url);
  }
  return response.getContentText();
}

function updateProjectContent_(files) {
  const response = UrlFetchApp.fetch('https://script.googleapis.com/v1/projects/' + ScriptApp.getScriptId() + '/content', {
    method: 'put',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    payload: JSON.stringify({ files: files }),
    muteHttpExceptions: true,
  });
  if (response.getResponseCode() !== 200) {
    throw new Error('Apps Script API respondió ' + response.getResponseCode() + ': ' + response.getContentText().slice(0, 300) +
      '\n¿Activaste la API de Google Apps Script en https://script.google.com/home/usersettings ?');
  }
}
