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

function appendVacancyRow_(sheet, vacancy, score) {
  const today = Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd');
  sheet.appendRow([today, vacancy.company || 'N/D', vacancy.title, vacancy.link, score, 'Pendiente']);
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

function createVacancyDetailDoc_(folder, vacancy, score, language) {
  const doc = DocumentApp.create('Detalle_Vacante');
  const body = doc.getBody();
  body.appendParagraph(vacancy.title || 'Vacante').setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph('Empresa: ' + (vacancy.company || 'N/D'));
  body.appendParagraph('Link: ' + (vacancy.link || 'N/D'));
  body.appendParagraph('Match Score: ' + score);
  body.appendParagraph('Idioma: ' + language.toUpperCase());
  body.appendParagraph('Fuente: ' + (vacancy.source || 'N/D'));
  body.appendParagraph(vacancy.snippet || '');
  doc.saveAndClose();
  DriveApp.getFileById(doc.getId()).moveTo(folder);
}

// ---------- Google Docs (clonado de plantilla + reemplazo de placeholders) ----------

function createTailoredCv_(vacancy, folder, language) {
  const replacements = buildCvReplacements(vacancy, language);
  const copy = DriveApp.getFileById(getProp_(PROPS.TEMPLATE_ID))
    .makeCopy('CV_' + (vacancy.company || 'Empresa') + '_' + language.toUpperCase(), folder);

  const doc = DocumentApp.openById(copy.getId());
  const sections = [doc.getBody(), doc.getHeader(), doc.getFooter()].filter(Boolean);
  Object.keys(replacements).forEach(key => {
    sections.forEach(section => section.replaceText('\\{\\{' + key + '\\}\\}', replacements[key]));
  });
  doc.saveAndClose();

  const pdfName = 'CV_UXUI_Junior_' + (vacancy.company || 'Empresa') + '_' + language.toUpperCase() + '.pdf';
  const pdfBlob = copy.getAs('application/pdf').setName(pdfName);
  folder.createFile(pdfBlob);
  return pdfBlob;
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
