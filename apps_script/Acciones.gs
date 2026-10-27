/**
 * Acciones del juego (decisión del usuario 2026-10-27): registrar desde el juego lo que Oscar ya hizo, sin salir a Drive.
 *   enviada   -> la carpeta de Sin revisar pasa a CV/<semana actual> con la fecha de envío; Hoja 1: Aplicada.
 *   descartar -> la carpeta de Sin revisar va a la papelera (recuperable); Hoja 1: Descartada: <motivo>.
 *   rechazada / proceso -> la carpeta de CV/ cambia de color y Seguimiento gana una fila con fuente «Oscar (desde el juego)».
 *   hecho     -> Seguimiento gana una fila que cierra la acción pendiente de esa empresa (queda «Esperar respuesta»).
 * Nunca envía nada (HITL): solo registra lo que Oscar hizo. Exige la clave del enlace (k) y además la clave de escritura
 * (e, propiedad DASHBOARD_WRITE_KEY, la crea configurarTablero): el enlace del coach no la lleva, así que su vista sigue
 * siendo de solo lectura. Solo toca carpetas que estén dentro de Sin revisar o de CV/ (y la de antiguas junto a CV/).
 * Llega por doGet (&accion=...) porque el Cargador solo tiene doGet; así no hay que volver a pegarlo.
 */

const GAME_ACTIONS_ = ['enviada', 'descartar', 'rechazada', 'proceso', 'hecho'];
const GAME_FOLDER_COLORS_ = { rechazada: '#f83a22', proceso: '#16a765' };  // los mismos de la skill seguimiento

/** Responde una acción del juego: la aplica, vuelve a leer Drive y devuelve el JSON del tablero (o { error }). */
function dashboardAction_(p, key) {
  const out = obj => ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
  if (!dashboardKeyOk(p.k, key)) return out({ error: 'clave' });
  if (!dashboardKeyOk(p.e, getProp_(PROPS.DASHBOARD_WRITE_KEY))) return out({ error: 'escritura' });
  if (GAME_ACTIONS_.indexOf(String(p.accion)) === -1) return out({ error: 'accion', detalle: 'Acción desconocida' });
  try {
    console.log('Acción del juego: ' + runGameAction_(p));
  } catch (err) {
    console.error('Acción del juego ' + p.accion + ' -> ERROR: ' + err.message);
    return out({ error: 'accion', detalle: err.message });
  }
  let json = null;
  try {
    json = sincronizarRegistro_();
  } catch (err) {
    console.error('Acción del juego: sincronización -> ERROR: ' + err.message);
  }
  return ContentService.createTextOutput(json || warmDashboardCache_()).setMimeType(ContentService.MimeType.JSON);
}

function runGameAction_(p) {
  const action = String(p.accion);
  const today = Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd');
  const root = DriveApp.getFolderById(getProp_(PROPS.ROOT_FOLDER_ID));
  const topFolder = name => {
    const it = root.getFoldersByName(name);
    if (!it.hasNext()) throw new Error('No existe la carpeta ' + name);
    return it.next();
  };
  const ss = SpreadsheetApp.openById(getProp_(PROPS.SHEET_ID));

  if (action === 'enviada' || action === 'descartar') {
    const folder = folderInside_(p.id, [topFolder(CONFIG.PENDING_FOLDER_NAME).getId()], 3);
    const detail = firstFileByName_(folder, 'Detalle_Vacante');
    const vacancy = parseVacancyDetail(detail ? DocumentApp.openById(detail.getId()).getBody().getText() : '');
    const registry = ss.getSheets()[0];
    if (action === 'enviada') {
      const cv = topFolder(CONFIG.APPLIED_FOLDER_NAME);
      const weeks = listChildFolders_(cv.getId()).filter(f => !CONFIG.APPLIED_OLD_FOLDER_PATTERN.test(String(f.name).replace(/^\d+\.\s*/, '').trim()));
      const week = pickCurrentWeek(weeks);
      if (!week) throw new Error('No hay una carpeta de semana en ' + CONFIG.APPLIED_FOLDER_NAME);
      folder.setDescription(sentDescription(today));
      folder.moveTo(DriveApp.getFolderById(week.id));
      updateVacancyStatus_(registry, vacancy.link, 'Aplicada (' + today + ', desde el juego)');
      return folder.getName() + ' -> enviada, movida a ' + week.name;
    }
    const reason = safeCell(String(p.motivo || 'sin motivo').slice(0, 120));
    updateVacancyStatus_(registry, vacancy.link, 'Descartada: ' + reason + ' (Oscar, desde el juego)');
    folder.setTrashed(true);
    return folder.getName() + ' -> descartada (' + reason + '), a la papelera';
  }

  const followup = ss.getSheetByName(CONFIG.FOLLOWUP_SHEET_NAME);
  if (!followup) throw new Error('No existe la pestaña ' + CONFIG.FOLLOWUP_SHEET_NAME);
  const header = followup.getRange(1, 1, 1, followup.getLastColumn()).getValues()[0].map(String);
  const record = { 'Fecha revisión': today, 'Fecha del mensaje': today, 'Fuente': 'Oscar (desde el juego)',
    'Empresa': String(p.empresa || ''), 'Cargo': String(p.cargo || ''), 'Estado anterior': String(p.estado || '—') };

  if (action === 'rechazada' || action === 'proceso') {
    const cv = topFolder(CONFIG.APPLIED_FOLDER_NAME);
    const old = listChildFolders_(root.getId()).filter(f => CONFIG.APPLIED_OLD_FOLDER_PATTERN.test(String(f.name).trim()));
    const folder = folderInside_(p.id, [cv.getId()].concat(old.map(f => f.id)), 3);
    Drive.Files.update({ folderColorRgb: GAME_FOLDER_COLORS_[action] }, folder.getId());
    const parsed = parseAppliedFolderName(folder.getName());
    const parent = folder.getParents();
    Object.assign(record, {
      'Empresa': parsed.company, 'Cargo': parsed.title,
      'Carpeta': (parent.hasNext() ? parent.next().getName() + '/' : '') + folder.getName(),
      'Hecho': action === 'rechazada' ? 'Oscar registró el rechazo desde el juego' : 'Oscar registró una prueba o entrevista desde el juego',
      'Estado nuevo': action === 'rechazada' ? 'Rechazada (rojo)' : 'En proceso (verde)',
      'Siguiente acción': action === 'rechazada' ? 'Ninguna' : 'Preparar la prueba o entrevista',
      'Quién': action === 'rechazada' ? '—' : 'candidato',
    });
  } else {
    if (!record['Empresa']) throw new Error('Falta la empresa');
    Object.assign(record, {
      'Carpeta': String(p.carpeta || ''),
      'Hecho': 'Oscar marcó como hecho: ' + String(p.que || 'la acción pendiente'),
      'Estado nuevo': record['Estado anterior'], 'Siguiente acción': 'Esperar respuesta', 'Quién': 'empresa',
    });
  }
  followup.appendRow(followupRow(header, record));
  return record['Empresa'] + ' -> ' + action;
}

/** La carpeta `id` si está dentro (hasta `depth` niveles) de alguna de `ancestorIds`; si no, error. */
function folderInside_(id, ancestorIds, depth) {
  if (!/^[\w-]{10,}$/.test(String(id || ''))) throw new Error('Carpeta no válida');
  const folder = DriveApp.getFolderById(id);
  let level = [folder];
  for (let d = 0; d < depth; d++) {
    const next = [];
    level.forEach(f => { const it = f.getParents(); while (it.hasNext()) next.push(it.next()); });
    if (next.some(f => ancestorIds.indexOf(f.getId()) !== -1)) return folder;
    level = next;
  }
  throw new Error('Esa carpeta no está donde el juego puede cambiarla');
}

// ---------- Lógica pura (probada en tests/apps_script.test.js) ----------

/** Descripción que deja «Ya la envié» en la carpeta: el día de envío real (la carpeta pudo crearse días antes). */
function sentDescription(day) {
  return 'Enviada el ' + day + ' (registrado desde el juego)';
}

/** Día de envío guardado en la descripción de la carpeta, o vacío. */
function sentDayFromDescription(description) {
  const m = /Enviada el (\d{4}-\d{2}-\d{2})/.exec(String(description || ''));
  return m ? m[1] : '';
}

/**
 * Semana actual de CV/: la de número más alto en el nombre ("4. Cuarta semana" > "3. Tercera semana"); si ninguna
 * empieza con número, la creada más tarde.
 */
function pickCurrentWeek(folders) {
  const num = f => { const m = /^\s*(\d{1,3})\b/.exec(String(f.name || '')); return m ? Number(m[1]) : -1; };
  const numbered = folders.filter(f => num(f) >= 0);
  const pool = numbered.length ? numbered : folders;
  return pool.slice().sort((a, b) => numbered.length ? num(b) - num(a) : String(b.createdTime || '').localeCompare(String(a.createdTime || '')))[0] || null;
}

/** Fila para Seguimiento en el orden de su encabezado (columnas que no vienen quedan vacías). */
function followupRow(header, record) {
  return header.map(h => safeCell(record[h] == null ? '' : String(record[h])));
}

/** Un texto escrito en el Sheet nunca se interpreta como fórmula. */
function safeCell(text) {
  const t = String(text == null ? '' : text);
  return /^[=+\-@]/.test(t) ? "'" + t : t;
}
