/**
 * Vacantes a las que el usuario YA aplicó: viven en la carpeta CONFIG.APPLIED_FOLDER_NAME (dentro de la carpeta
 * raíz), organizadas como CV/<fecha o semana>/<Empresa[_Cargo]>. El color de cada carpeta es su estado:
 * rojo = rechazada, verde = en proceso, amarillo = aplicada sin respuesta (sin color = aplicada).
 * sincronizarAplicadas (activador cada hora y al inicio del pipeline) vuelca todo a la hoja "Aplicadas" del
 * registro, y el pipeline descarta vacantes nuevas de esas empresas para no volver a postular.
 */

/** Recorre la carpeta de aplicadas y reescribe la hoja "Aplicadas" (con el color de cada carpeta). */
function sincronizarAplicadas() {
  // Borradores de correos en frío (2026-10-24): van primero y aparte, así un error aquí no frena la sincronización
  try {
    crearBorradoresEnFrio();
  } catch (e) {
    console.error('Correos en frío -> ERROR: ' + e.message);
  }
  const root = DriveApp.getFolderById(getProp_(PROPS.ROOT_FOLDER_ID));
  const folders = root.getFoldersByName(CONFIG.APPLIED_FOLDER_NAME);
  if (!folders.hasNext()) {
    console.warn('No existe la carpeta ' + CONFIG.APPLIED_FOLDER_NAME + ' dentro de ' + root.getName());
    return;
  }
  const rows = [];
  collectAppliedFolders_(folders.next().getId(), '', rows);

  const ss = SpreadsheetApp.openById(getProp_(PROPS.SHEET_ID));
  const sheet = ss.getSheetByName(CONFIG.APPLIED_SHEET_NAME) ||
                ss.insertSheet(CONFIG.APPLIED_SHEET_NAME, ss.getNumSheets());  // Al final: la hoja 1 sigue siendo el registro
  sheet.clear();
  const header = CONFIG.APPLIED_SHEET_HEADERS;
  const values = [header].concat(rows.map(r => [r.group, r.company, r.title, r.status, r.color || '',
    '=HYPERLINK("https://drive.google.com/drive/folders/' + r.id + '","Abrir")', r.created]));
  sheet.getRange(1, 1, values.length, header.length).setValues(values);
  sheet.getRange(1, 1, 1, header.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
  if (rows.length) {
    sheet.getRange(2, 4, rows.length, 1).setBackgrounds(rows.map(r => [r.color || null]));
  }
  const count = {};
  rows.forEach(r => { count[r.status] = (count[r.status] || 0) + 1; });
  console.log('Aplicadas sincronizadas: ' + rows.length + ' ' + JSON.stringify(count));
}

/**
 * Las carpetas sin subcarpetas son vacantes; las demás (fechas, semanas) solo agrupan. Las que están dentro de una
 * carpeta "Prueba" son HV preparadas que el usuario aún no envió: estado "Preparada, sin enviar" (siguen contando para
 * no proponer de nuevo la misma vacante).
 */
function collectAppliedFolders_(parentId, groupName, rows, inTest) {
  listChildFolders_(parentId).forEach(f => {
    const test = inTest || /^prueba$/i.test(String(f.name).trim());
    const children = listChildFolders_(f.id);
    if (children.length) {
      collectAppliedFolders_(f.id, f.name, rows, test);
      return;
    }
    const parsed = parseAppliedFolderName(f.name);
    rows.push({ id: f.id, group: groupName, company: parsed.company, title: parsed.title,
                status: test ? 'Preparada, sin enviar' : colorToStatus(f.folderColorRgb), color: f.folderColorRgb,
                created: (f.createdTime || '').slice(0, 10) });
  });
}

function listChildFolders_(parentId) {
  const out = [];
  let pageToken;
  do {
    const res = Drive.Files.list({
      q: "'" + parentId + "' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
      fields: 'nextPageToken, files(id, name, folderColorRgb, createdTime)', pageSize: 1000, pageToken: pageToken,
    });
    (res.files || []).forEach(f => out.push(f));
    pageToken = res.nextPageToken;
  } while (pageToken);
  return out;
}

/** Filas de la hoja "Aplicadas": empresa, cargo, grupo y carpeta (id sacado del enlace "Abrir"). */
function getAppliedRecords_() {
  const sheet = SpreadsheetApp.openById(getProp_(PROPS.SHEET_ID)).getSheetByName(CONFIG.APPLIED_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const n = sheet.getLastRow() - 1;
  const values = sheet.getRange(2, 1, n, 3).getValues();
  const formulas = sheet.getRange(2, 6, n, 1).getFormulas();
  return values.map((r, i) => ({ group: String(r[0] || ''), company: String(r[1] || ''), title: String(r[2] || ''),
                                 folderId: extractFolderId(formulas[i][0]) }))
    .filter(r => r.company)
    .map(r => Object.assign(r, { folderName: r.company + (r.title ? '_' + r.title : '') }));
}

/**
 * ¿La vacante nueva es la misma que una ya guardada en CV/? Compara el cargo de la carpeta, el de sus HV
 * (HV_Nombre_Apellido_<Cargo>) y el texto de su documento de vacante (enlace o cargo). Sin datos para comparar: false.
 */
function isSameAppliedVacancy_(vacancy, record) {
  if (record.title && sameRole(vacancy.title, record.title)) return true;
  if (!record.folderId) return false;
  try {
    const files = DriveApp.getFolderById(record.folderId).getFiles();
    const texts = [];
    let docsRead = 0;
    while (files.hasNext()) {
      const f = files.next();
      const role = hvRoleFromFileName(f.getName());
      if (role && sameRole(vacancy.title, role)) return true;
      if (!role && docsRead < 3 && f.getMimeType() === MimeType.GOOGLE_DOCS) {
        texts.push(DocumentApp.openById(f.getId()).getBody().getText());
        docsRead++;
      }
    }
    return texts.some(t => mentionsVacancy(t, vacancy));
  } catch (e) {
    console.warn('No se pudo revisar la carpeta de ' + record.company + ': ' + e.message);
    return false;
  }
}

/** Empresas de la pestaña "Correos en frío" (columna A): ya contactadas, no se proponen de nuevo. */
function getColdEmailCompanies_() {
  const sheet = SpreadsheetApp.openById(getProp_(PROPS.SHEET_ID)).getSheetByName(CONFIG.COLD_EMAIL_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().map(r => r[0]).filter(Boolean);
}

// ---------- Lógica pura (probada en tests/apps_script.test.js) ----------

/** Estado según el color de la carpeta (por tono, así sirve con cualquier rojo/verde/amarillo de Drive). */
function colorToStatus(hex) {
  const m = String(hex || '').match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return 'Aplicada';
  const [r, g, b] = [m[1], m[2], m[3]].map(x => parseInt(x, 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (d < 0.15) return 'Aplicada';  // Gris = color por defecto de Drive
  let hue = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  hue = (hue * 60 + 360) % 360;
  if (hue < 25 || hue >= 330) return 'Rechazada';
  if (hue < 70) return 'Aplicada, sin respuesta';
  if (hue < 170) return 'En proceso';
  return 'Aplicada';
}

/** Id de carpeta del enlace =HYPERLINK("https://drive.google.com/drive/folders/<id>","Abrir"). */
function extractFolderId(formula) {
  const m = String(formula || '').match(/folders\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : '';
}

/** true si el texto de un documento de vacante es de esta vacante: trae su enlace (sin utm) o su cargo. */
function mentionsVacancy(text, vacancy) {
  const t = String(text || '');
  const link = String(vacancy.link || '').split('?')[0];
  if (link.length > 15 && t.indexOf(link) !== -1) return true;
  return t.split(/\r?\n/).map(l => l.trim()).filter(Boolean).slice(0, 8).some(line => sameRole(line, vacancy.title));
}

/** "Empresa_Cargo" (carpetas del agente) o solo "Empresa" (carpetas hechas a mano). */
function parseAppliedFolderName(name) {
  const text = String(name || '').trim();
  const i = text.indexOf('_');
  return i === -1 ? { company: text, title: '' } : { company: text.slice(0, i).trim(), title: text.slice(i + 1).replace(/_/g, '/').trim() };
}

function companyKey_(name) {
  return String(name || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
}

/** true si la empresa de la vacante ya está entre las aplicadas ("PeriferiaIT" = "Periferia IT Group"). */
function isAppliedCompany(company, appliedCompanies) {
  const key = companyKey_(company);
  if (key.length < 4 || /^confidential|^confidencial/.test(key)) return false;  // "Confidencial" no identifica empresa
  return appliedCompanies.some(c => {
    const other = companyKey_(c);
    return other.length >= 4 && (key.indexOf(other) === 0 || other.indexOf(key) === 0);
  });
}
