/**
 * Sincronización automática GitHub -> Apps Script.
 * Cada día (antes del pipeline) descarga la carpeta apps_script/ de la rama main y,
 * si hay un commit nuevo con las pruebas de GitHub Actions en verde, reemplaza el código de este proyecto.
 * Requiere activar "API de Google Apps Script" en https://script.google.com/home/usersettings
 */
function sincronizarDesdeGitHub() {
  const api = 'https://api.github.com/repos/' + CONFIG.GITHUB_REPO;

  // Último commit de la rama (GitHub Actions corre las pruebas sobre el commit más reciente de cada push)
  const sha = githubJson_(api + '/commits/' + CONFIG.GITHUB_BRANCH).sha;
  if (sha === getProp_(PROPS.LAST_SYNC_SHA)) {
    console.log('Código ya sincronizado con ' + sha.slice(0, 7) + '. Nada que hacer.');
    return;
  }

  // Solo desplegar commits cuyas verificaciones (pruebas) pasaron
  const checks = githubJson_(api + '/commits/' + sha + '/check-runs').check_runs || [];
  const failed = checks.filter(c => c.status !== 'completed' || c.conclusion !== 'success');
  if (!checks.length || failed.length) {
    console.warn('Commit ' + sha.slice(0, 7) + ' sin pruebas en verde todavía; no se sincroniza.');
    return;
  }

  const entries = githubJson_(api + '/contents/' + CONFIG.GITHUB_DIR + '?ref=' + sha);
  const files = entries
    .filter(e => e.type === 'file' && (/\.gs$/.test(e.name) || e.name === 'appsscript.json'))
    .map(e => {
      const source = UrlFetchApp.fetch(e.download_url).getContentText();
      return e.name === 'appsscript.json'
        ? { name: 'appsscript', type: 'JSON', source: source }
        : { name: e.name.replace(/\.gs$/, ''), type: 'SERVER_JS', source: source };
    });

  if (!files.some(f => f.type === 'JSON') || !files.some(f => f.type === 'SERVER_JS')) {
    throw new Error('Contenido incompleto en GitHub; se cancela la sincronización.');
  }

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

  setProp_(PROPS.LAST_SYNC_SHA, sha);
  console.log('Código actualizado desde GitHub (commit ' + sha.slice(0, 7) + ', ' + files.length + ' archivos).');
}

function githubJson_(url) {
  const response = UrlFetchApp.fetch(url, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'ux-job-agent-apps-script' },
    muteHttpExceptions: true,
  });
  if (response.getResponseCode() !== 200) {
    throw new Error('GitHub respondió ' + response.getResponseCode() + ' para ' + url);
  }
  return JSON.parse(response.getContentText());
}
