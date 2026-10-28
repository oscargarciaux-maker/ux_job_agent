/**
 * Fases 1b–4 sobre Google Workspace: Sheets, Drive, Docs y Gmail.
 */

// ---------- Google Sheets (deduplicación y registro) ----------

function getRegistrySheet_() {
  return SpreadsheetApp.openById(getProp_(PROPS.SHEET_ID)).getSheets()[0];
}

/** Vacantes ya registradas: por Link (columna D) y por empresa|cargo (B|C), por si vuelve con otro enlace. */
function getExistingUrls_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return {};
  const seen = {};
  sheet.getRange(2, 2, lastRow - 1, 3).getValues().forEach(row => {
    if (row[2]) seen[row[2]] = true;
    seen[vacancyKey({ company: row[0], title: row[1] })] = true;
    // El mismo aviso en otra ciudad (27 oct 2026: Blacksmith Agency lo publicó en 7 ciudades)
    if (!/confiden/i.test(row[0])) seen['base:' + vacancyBaseKey({ company: row[0], title: row[1] })] = true;
  });
  return seen;
}

function appendVacancyRow_(sheet, vacancy, score, status) {
  const today = Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd');
  // Fuente (columna G, 27 oct 2026): la usa la pestaña "Calidad por fuente"
  sheet.appendRow([today, vacancy.company || 'N/D', vacancy.title, vacancy.link, score, status, vacancy.origin || '',
                   englishAdvanced(vacancy) ? 'Inglés avanzado' : '']);
}

// ---------- Google Drive (/Vacantes con IA/Sin revisar/YYYY-MM-DD/[Empresa] o [Empresa]_[detalle del cargo]) ----------

function tz_() {
  return Session.getScriptTimeZone() || 'America/Bogota';
}

function getOrCreateSubfolder_(parent, name) {
  const existing = parent.getFoldersByName(name);
  return existing.hasNext() ? existing.next() : parent.createFolder(name);
}

/**
 * Carpeta de la vacante dentro de la fecha de hoy. `name` viene de vacancyFolderNames (solo la empresa, o empresa +
 * detalle del cargo si ese día hay dos vacantes de la misma empresa). Si ya existe (otra corrida del mismo día),
 * se le agrega el detalle del cargo y, si aún choca, un número.
 */
/** Carpeta del día para las vacantes nuevas: Vacantes con IA/Sin revisar/<YYYY-MM-DD> (la crea si falta). */
function todayVacancyFolder_() {
  const root = DriveApp.getFolderById(getProp_(PROPS.ROOT_FOLDER_ID));
  const today = Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd');
  return getOrCreateSubfolder_(getOrCreateSubfolder_(root, CONFIG.PENDING_FOLDER_NAME), today);
}

function setupVacancyFolder_(vacancy, name) {
  const dateFolder = todayVacancyFolder_();
  const taken = n => dateFolder.getFoldersByName(n).hasNext();
  let finalName = name || vacancyFolderNames([vacancy])[0];
  if (taken(finalName) && finalName.indexOf('_') === -1) {
    finalName = finalName + '_' + shortRoleDetail(vacancy.title, vacancy.company);
  }
  for (let i = 2; taken(finalName); i++) finalName = finalName.replace(/ \d+$/, '') + ' ' + i;
  return dateFolder.createFolder(finalName);
}

// ---------- Lógica pura de nombres de carpeta (probada en tests/apps_script.test.js) ----------

function cleanFolderText_(text) {
  return String(text || '').replace(/\//g, '-').replace(/[\\:*?"<>|#%_]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Detalle corto del cargo para distinguir dos vacantes de la misma empresa (decisión del usuario 2026-10-22):
 * sin la empresa, el nivel (junior/senior...), la modalidad ni la ubicación; máximo 4 palabras.
 */
function shortRoleDetail(title, company) {
  const strip = part => {
    let t = part.replace(/\(.*?\)|\(.*$/g, ' ');
    if (company && String(company).trim().length >= 3) t = t.replace(new RegExp(escapeRegex_(String(company).trim()), 'gi'), ' ');
    t = t.replace(/\b(junior|jr|semi[- ]?senior|ssr|senior|sr|mid|remoto|remote|h[ií]brido|hybrid|latam)\b\.?/gi, ' ');
    return cleanFolderText_(t).split(' ').filter(Boolean).slice(0, 4).join(' ');
  };
  return String(title || '').split(/\s+[-–|]\s+/).map(strip).filter(Boolean)[0] || 'Vacante';
}

/**
 * Nombres de carpeta del día (uno por vacante): solo el nombre de la empresa; si la misma empresa tiene varias
 * vacantes ese día, "Empresa_<detalle del cargo>" en cada una (y un número si aun así coinciden).
 */
function vacancyFolderNames(vacancies) {
  const company = v => cleanFolderText_(v.company) || 'Empresa';
  const key = v => company(v).toLowerCase();
  const count = {};
  vacancies.forEach(v => { count[key(v)] = (count[key(v)] || 0) + 1; });
  const used = {};
  return vacancies.map(v => {
    let name = count[key(v)] > 1 ? company(v) + '_' + shortRoleDetail(v.title, v.company) : company(v);
    const base = name;
    for (let i = 2; used[name.toLowerCase()]; i++) name = base + ' ' + i;
    used[name.toLowerCase()] = true;
    return name;
  });
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
    'Publicada: ' + (vacancy.postedAt || 'SIN VERIFICAR (revisa la fecha en el enlace antes de postularte)'),
    'Nivel: ' + item.seniority,
    'Match Score: ' + item.score,
    'Idioma: ' + language.toUpperCase(),
    'Correo de contacto: ' + (extractContactEmail(vacancy) || 'N/D'),
    'Fuente: ' + (vacancy.source || 'N/D'),
  ].concat(vacancy.fromPost ? ['Tipo: PUBLICACIÓN de LinkedIn (reclutador o empresa). Postular por el medio que indica el texto: ' +
                                'correo, mensaje directo o el enlace que trae; si el enlace lleva a una vacante formal, verifícala allí'] : [])
   .concat(vacancy.roleToVerify ? ['Rol: VERIFICAR FUNCIONES (el título no es de diseño; entra solo si la función principal es diseño)'] : [])
   .concat(vacancy.companyNote ? ['Aviso empresa: ' + vacancy.companyNote] : [])
   .concat(englishAdvanced(vacancy) ? ['Inglés: pide "avanzado" sin decir fluido, bilingüe ni C1 (tu nivel es B2): menor ' +
                                        'prioridad; lee el aviso completo antes de decidir'] : [])
   .concat(vacancy.officialBoard ? ['Portal oficial: aviso en el portal de empleo de la empresa (sigue publicado); hasta ' +
                                    CONFIG.OFFICIAL_BOARD_MAX_AGE_DAYS + ' días cuenta como vigente, con más de ' +
                                    CONFIG.MAX_POST_AGE_DAYS + ' es de menor prioridad'] : [])
   .forEach(line => body.appendParagraph(line));
  body.appendParagraph('Descripción completa').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph(vacancy.description || vacancy.snippet || '');
  doc.saveAndClose();
  DriveApp.getFileById(doc.getId()).moveTo(folder);
}

/** Publicaciones (sin texto completo): agrega sus enlaces al documento "Posts" del día, para el proceso manual. */
function addPostsToDailyDoc_(posts) {
  const folder = getOrCreateSubfolder_(todayVacancyFolder_(), CONFIG.POSTS_FOLDER_NAME);
  const existing = folder.getFilesByName(CONFIG.POSTS_DOC_NAME);
  let doc;
  if (existing.hasNext()) {
    doc = DocumentApp.openById(existing.next().getId());
  } else {
    doc = DocumentApp.create(CONFIG.POSTS_DOC_NAME);
    DriveApp.getFileById(doc.getId()).moveTo(folder);
    doc.getBody().appendParagraph('Proceso manual: abre cada publicación, revisa la oferta completa y adapta tu CV.');
  }
  const body = doc.getBody();
  posts.forEach(v => {
    const entry = postEntry(v);
    body.appendParagraph(entry.heading).setHeading(DocumentApp.ParagraphHeading.HEADING3);
    body.appendParagraph(entry.link).setLinkUrl(entry.link);
    if (entry.snippet) body.appendParagraph(entry.snippet);
  });
  doc.saveAndClose();
}

/** Lo que va en el documento "Posts" por cada publicación: título con autor y fecha, enlace y fragmento visible. */
function postEntry(vacancy) {
  const author = String(vacancy.company || '').replace(/^Post\s+/, '');
  const snippet = String(vacancy.description || '').split('\n').slice(1).join(' ').trim();
  return {
    heading: [vacancy.title || 'Publicación de LinkedIn', author, vacancy.postedAt].filter(Boolean).join(' · '),
    link: vacancy.link,
    snippet: snippet.slice(0, 400),
  };
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

/** Texto plano del correo: los enlaces "[LinkedIn](https://...)" quedan como "LinkedIn (https://...)". */
function emailPlainText(bodyText) {
  return bodyText.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '$1 ($2)');
}

/** HTML del correo: párrafos, "[texto](url)" como enlace y URLs sueltas clicables. */
function emailHtml(bodyText) {
  const linkify = p => escapeHtml_(p)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|(https?:\/\/[^\s<]+)/g,
             (m, label, url, bare) => {
               if (url) return '<a href="' + url + '">' + label + '</a>';
               // El punto o la coma que cierran la frase no son parte del enlace (2026-10-26: "…lovable.app." quedó roto)
               const tail = (bare.match(/[.,;:!?)]+$/) || [''])[0];
               const link = bare.slice(0, bare.length - tail.length);
               return '<a href="' + link + '">' + link + '</a>' + tail;
             })
    .replace(/\n/g, '<br>');
  return '<div style="font-family: Arial, Helvetica, sans-serif;">' +
    bodyText.split('\n\n').map(p => '<p>' + linkify(p) + '</p>').join('') + '</div>';
}

function buildMimeMessage(to, subject, bodyText, pdfBlob, extraHeaders) {
  const mixed = 'mixed_' + Utilities.getUuid();
  const alt = 'alt_' + Utilities.getUuid();
  const html = emailHtml(bodyText);

  const lines = [
    'To: ' + to,
    'Subject: ' + encodeHeader_(subject),
  ].concat(extraHeaders || [], [  // In-Reply-To/References: el seguimiento va en el mismo hilo (2026-10-28)
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
    wrapBase64_(Utilities.base64Encode(emailPlainText(bodyText), Utilities.Charset.UTF_8)),
    '--' + alt,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    wrapBase64_(Utilities.base64Encode(html, Utilities.Charset.UTF_8)),
    '--' + alt + '--',
  ]);

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
