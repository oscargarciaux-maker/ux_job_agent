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

  const master = findMasterTemplate_();
  if (master && master.isDoc) {
    const placeholders = listPlaceholders_(master.file.getId());
    report.push('Plantilla de CV: ' + CONFIG.MASTER_TEMPLATE_NAME + ' (Google Doc OK) ' + master.file.getUrl());
    report.push('Marcadores encontrados (' + placeholders.length + '): ' + placeholders.join(', '));
  } else if (master) {
    report.push('AVISO: ' + CONFIG.MASTER_TEMPLATE_NAME + ' NO es un Google Doc. Ábrelo y usa Archivo > Guardar como documento de Google, ' +
                'luego ejecuta configurarAgente otra vez. ' + master.file.getUrl());
  } else if (!getProp_(PROPS.TEMPLATE_ID)) {
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
  report.push('Activadores: búsqueda diaria a las ' + CONFIG.PIPELINE_HOURS.map(([h, m]) => h + ':' + ('0' + m).slice(-2)).join(' y ') +
              ' (±15 min), CVs desde IA cada ' +
              CONFIG.CV_EVERY_MINUTES + ' min de ' + CONFIG.CV_FIRST_HOUR + ':00 a ' + CONFIG.CV_LAST_HOUR + ':59; hoja Aplicadas cada hora');
  if (!findDocByName_(CONFIG.CONTEXT_DOC_NAME)) {
    report.push('FALTA: el Google Doc ' + CONFIG.CONTEXT_DOC_NAME + ' (sin él se rechazan todos los CV_IA.json).');
  }

  if (!getProp_(PROPS.SERPAPI_API_KEY)) {
    report.push('FALTA: agrega SERPAPI_API_KEY en Configuración del proyecto > Propiedades del script.');
  }

  console.log(report.join('\n'));
}

function installTriggers_() {
  const handlers = ['ejecutarPipeline', 'generarCVsDesdeIA', 'sincronizarAplicadas'];
  ScriptApp.getProjectTriggers()
    .filter(t => handlers.indexOf(t.getHandlerFunction()) !== -1)
    .forEach(t => ScriptApp.deleteTrigger(t));

  CONFIG.PIPELINE_HOURS.forEach(([h, m]) =>
    ScriptApp.newTrigger('ejecutarPipeline').timeBased().everyDays(1).atHour(h).nearMinute(m).create());
  ScriptApp.newTrigger('generarCVsDesdeIA').timeBased().everyMinutes(CONFIG.CV_EVERY_MINUTES).create();  // Ventana en CV.gs
  ScriptApp.newTrigger('sincronizarAplicadas').timeBased().everyHours(1).create();  // Refleja los cambios de color
}
