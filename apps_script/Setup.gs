/**
 * Configuración inicial. Ejecutar UNA vez desde el editor: configurarAgente
 * Crea lo que falte (carpeta raíz, hoja de registro, plantilla de CV) e instala los activadores diarios.
 * Es seguro ejecutarla de nuevo: reutiliza lo existente.
 */
function configurarAgente() {
  const report = [];

  if (!getProp_(PROPS.ROOT_FOLDER_ID)) {
    const folders = DriveApp.getFoldersByName(CONFIG.ROOT_FOLDER_NAME);
    const folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(CONFIG.ROOT_FOLDER_NAME);
    setProp_(PROPS.ROOT_FOLDER_ID, folder.getId());
  }
  report.push('Carpeta raíz: ' + DriveApp.getFolderById(getProp_(PROPS.ROOT_FOLDER_ID)).getUrl());

  if (!getProp_(PROPS.SHEET_ID)) {
    const ss = SpreadsheetApp.create(CONFIG.SHEET_TITLE);
    ss.getSheets()[0].appendRow(CONFIG.SHEET_HEADERS);
    ss.getSheets()[0].setFrozenRows(1);
    setProp_(PROPS.SHEET_ID, ss.getId());
  }
  report.push('Hoja de registro: ' + SpreadsheetApp.openById(getProp_(PROPS.SHEET_ID)).getUrl());

  if (!getProp_(PROPS.TEMPLATE_ID)) {
    const doc = DocumentApp.create(CONFIG.TEMPLATE_TITLE);
    const body = doc.getBody();
    body.appendParagraph('[Reemplaza este documento con tu CV real y deja estos marcadores donde quieras que se personalice]');
    body.appendParagraph('{{CARGO}} — {{EMPRESA}}').setHeading(DocumentApp.ParagraphHeading.HEADING2);
    body.appendParagraph('{{RESUMEN}}');
    body.appendParagraph('Enfoque: {{ENFOQUE}}');
    doc.saveAndClose();
    setProp_(PROPS.TEMPLATE_ID, doc.getId());
    report.push('Plantilla de CV CREADA (edítala con tu CV real): ' + doc.getUrl());
  } else {
    report.push('Plantilla de CV: ' + DriveApp.getFileById(getProp_(PROPS.TEMPLATE_ID)).getUrl());
  }

  installTriggers_();
  report.push('Activadores: sincronización GitHub ' + CONFIG.SYNC_HOUR + ':00 y pipeline ' + CONFIG.PIPELINE_HOUR + ':00 (diario)');

  if (!getProp_(PROPS.SERPAPI_API_KEY)) {
    report.push('FALTA: agrega SERPAPI_API_KEY en Configuración del proyecto > Propiedades del script.');
  }

  console.log(report.join('\n'));
}

function installTriggers_() {
  const handlers = ['ejecutarPipeline', 'sincronizarDesdeGitHub'];
  ScriptApp.getProjectTriggers()
    .filter(t => handlers.indexOf(t.getHandlerFunction()) !== -1)
    .forEach(t => ScriptApp.deleteTrigger(t));

  ScriptApp.newTrigger('sincronizarDesdeGitHub').timeBased().everyDays(1).atHour(CONFIG.SYNC_HOUR).create();
  ScriptApp.newTrigger('ejecutarPipeline').timeBased().everyDays(1).atHour(CONFIG.PIPELINE_HOUR).create();
}
