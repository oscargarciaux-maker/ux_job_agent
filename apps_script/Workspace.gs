/**
 * Fases 1b–4 sobre Google Workspace: Sheets, Drive, Docs y Gmail.
 */

// ---------- Google Sheets (deduplicación y registro) ----------

function getRegistrySheet_() {
  return SpreadsheetApp.openById(getProp_(PROPS.SHEET_ID)).getSheets()[0];
}

/** URLs ya registradas (columna D: Link). */
function getExistingUrls_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return {};
  const urls = {};
  sheet.getRange(2, 4, lastRow - 1, 1).getValues().forEach(row => { if (row[0]) urls[row[0]] = true; });
  return urls;
}

function appendVacancyRow_(sheet, vacancy, score, status) {
  const today = Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd');
  sheet.appendRow([today, vacancy.company || 'N/D', vacancy.title, vacancy.link, score, status]);
}

// ---------- Google Drive (/Vacantes con IA/YYYY-MM-DD/[Empresa]_[Cargo]) ----------

function tz_() {
  return Session.getScriptTimeZone() || 'America/Bogota';
}

function getOrCreateSubfolder_(parent, name) {
  const existing = parent.getFoldersByName(name);
  return existing.hasNext() ? existing.next() : parent.createFolder(name);
}

function setupVacancyFolder_(vacancy) {
  const root = DriveApp.getFolderById(getProp_(PROPS.ROOT_FOLDER_ID));
  const today = Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd');
  const dateFolder = getOrCreateSubfolder_(root, today);
  const name = ((vacancy.company || 'Empresa') + '_' + (vacancy.title || 'Vacante')).replace(/\//g, '_');
  return dateFolder.createFolder(name);
}

/** Guarda la vacante completa: es la entrada del paso de IA (análisis de keywords según GUIA_CV). */
function createVacancyDetailDoc_(folder, vacancy, item, language) {
  const doc = DocumentApp.create('Detalle_Vacante');
  const body = doc.getBody();
  body.appendParagraph(vacancy.title || 'Vacante').setHeading(DocumentApp.ParagraphHeading.HEADING1);
  [
    'Empresa: ' + (vacancy.company || 'N/D'),
    'Ubicación: ' + (vacancy.location || 'N/D'),
    'Link: ' + (vacancy.link || 'N/D'),
    'Publicada: ' + (vacancy.postedAt || 'N/D'),
    'Nivel: ' + item.seniority,
    'Match Score: ' + item.score,
    'Idioma: ' + language.toUpperCase(),
    'Correo de contacto: ' + (extractContactEmail(vacancy) || 'N/D'),
    'Fuente: ' + (vacancy.source || 'N/D'),
  ].forEach(line => body.appendParagraph(line));
  body.appendParagraph('Descripción completa').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph(vacancy.description || vacancy.snippet || '');
  doc.saveAndClose();
  DriveApp.getFileById(doc.getId()).moveTo(folder);
}

/** Publicaciones (sin texto completo): solo el enlace, para que el usuario haga el proceso a mano. */
function createPostLinkDoc_(folder, vacancy) {
  const doc = DocumentApp.create('Enlace_Publicacion');
  const body = doc.getBody();
  body.appendParagraph('Proceso manual: abre la publicación, revisa la oferta completa y adapta tu CV.');
  body.appendParagraph(vacancy.link).setLinkUrl(vacancy.link);
  doc.saveAndClose();
  DriveApp.getFileById(doc.getId()).moveTo(folder);
}

/** Colorea la carpeta (requiere el servicio avanzado Drive del manifiesto). Si falla, solo avisa. */
function setFolderColor_(folder, color) {
  try {
    if (typeof Drive === 'undefined') throw new Error('falta el servicio Drive en appsscript.json');
    Drive.Files.update({ folderColorRgb: color }, folder.getId());
  } catch (e) {
    console.warn('No se pudo colorear la carpeta ' + folder.getName() + ': ' + e.message);
  }
}

// ---------- Google Docs (clonado de plantilla + reemplazo de placeholders) ----------

/**
 * Plantilla a usar: un Google Doc llamado MASTER_TEMPLATE en cualquier lugar del Drive si existe;
 * si no, la de la propiedad GOOGLE_DOCS_MASTER_TEMPLATE_ID.
 */
function findMasterTemplate_() {
  const matches = DriveApp.getFilesByName(CONFIG.MASTER_TEMPLATE_NAME);
  let other = null;
  while (matches.hasNext()) {
    const file = matches.next();
    if (file.isTrashed()) continue;
    if (file.getMimeType() === MimeType.GOOGLE_DOCS) return { file: file, isDoc: true };
    other = other || file;
  }
  return other ? { file: other, isDoc: false } : null;
}

function getTemplateFile_() {
  const master = findMasterTemplate_();
  if (master && master.isDoc) return master.file;
  if (master) {
    console.warn(CONFIG.MASTER_TEMPLATE_NAME + ' no es un Google Doc (' + master.file.getMimeType() + '). ' +
                 'Ábrelo y usa Archivo > Guardar como documento de Google. Se usa la plantilla de respaldo.');
  }
  return DriveApp.getFileById(getProp_(PROPS.TEMPLATE_ID));
}

/** Marcadores {{...}} presentes en el documento (cuerpo, encabezado y pie). */
function listPlaceholders_(docId) {
  const doc = DocumentApp.openById(docId);
  const text = [doc.getBody(), doc.getHeader(), doc.getFooter()].filter(Boolean).map(s => s.getText()).join('\n');
  return (text.match(/\{\{[A-Z0-9_]+\}\}/g) || []).filter((p, i, all) => all.indexOf(p) === i);
}

// ---------- Gmail (HITL: SOLO borradores vía users.drafts.create) ----------

function encodeHeader_(text) {
  return '=?UTF-8?B?' + Utilities.base64Encode(text, Utilities.Charset.UTF_8) + '?=';
}

function wrapBase64_(b64) {
  return b64.replace(/(.{76})/g, '$1\r\n');
}

function escapeHtml_(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildMimeMessage(to, subject, bodyText, pdfBlob) {
  const mixed = 'mixed_' + Utilities.getUuid();
  const alt = 'alt_' + Utilities.getUuid();
  const html = '<div style="font-family: Arial, Helvetica, sans-serif;">' +
    bodyText.split('\n\n').map(p => '<p>' + escapeHtml_(p).replace(/\n/g, '<br>') + '</p>').join('') +
    '</div>';

  const lines = [
    'To: ' + to,
    'Subject: ' + encodeHeader_(subject),
    'MIME-Version: 1.0',
    'Content-Type: multipart/mixed; boundary="' + mixed + '"',
    '',
    '--' + mixed,
    'Content-Type: multipart/alternative; boundary="' + alt + '"',
    '',
    '--' + alt,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    wrapBase64_(Utilities.base64Encode(bodyText, Utilities.Charset.UTF_8)),
    '--' + alt,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    wrapBase64_(Utilities.base64Encode(html, Utilities.Charset.UTF_8)),
    '--' + alt + '--',
  ];

  if (pdfBlob) {
    const filename = encodeHeader_(pdfBlob.getName());
    lines.push(
      '--' + mixed,
      'Content-Type: application/pdf; name="' + filename + '"',
      'Content-Disposition: attachment; filename="' + filename + '"',
      'Content-Transfer-Encoding: base64',
      '',
      wrapBase64_(Utilities.base64Encode(pdfBlob.getBytes()))
    );
  }
  lines.push('--' + mixed + '--');
  return lines.join('\r\n');
}

/** Crea un borrador. Este proyecto NUNCA envía correos (no existe ninguna llamada de envío). */
function createApplicationDraft_(to, subject, bodyText, pdfBlob) {
  const raw = Utilities.base64EncodeWebSafe(buildMimeMessage(to, subject, bodyText, pdfBlob));
  const draft = Gmail.Users.Drafts.create({ message: { raw: raw } }, 'me');
  return draft.id;
}
