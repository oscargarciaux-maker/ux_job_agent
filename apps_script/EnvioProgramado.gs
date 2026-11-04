/**
 * Envío programado de borradores: ÚNICA excepción a la regla de no enviar (HITL), autorizada por el usuario el
 * 2026-11-04 («En esta ocasión haz la programación dado que explícitamente lo pido»: 75 borradores, mañana a las 8).
 *
 * Solo se envían los borradores cuyo id aparece en Vacantes con IA/Correos en frío/ENVIO_PROGRAMADO.json, que escribe
 * una sesión de Claude cuando el usuario lo pide. No existe un camino para "enviar todos los borradores".
 * - Antes de la hora no pasa nada: la primera corrida de cada hora deja un activador de una vez a esa hora exacta.
 *   Cada corrida envía durante 4 minutos como máximo; si faltan, deja otro activador para 8 minutos después.
 * - Un borrador que el usuario borró o ya envió a mano antes de la hora no existe y se salta.
 * - Un seguimiento (borrador dentro de un hilo) se salta si el hilo ya tiene una respuesta de la empresa.
 * - Cada envío queda en Correos en frío (Estado / Notas) y en ENVIO_PROGRAMADO_resultado.txt. Al terminar, el archivo
 *   pasa a llamarse ENVIO_PROGRAMADO_hecho_<fecha>.json y no se vuelve a usar.
 * Formato: {"enviar_desde": "2026-11-05T08:00:00-05:00", "pausa_segundos": 3, "borradores": ["r123…", …]}
 */

const SCHEDULED_SEND_FILE_ = 'ENVIO_PROGRAMADO.json';
const SCHEDULED_SEND_LOG_ = 'ENVIO_PROGRAMADO_resultado.txt';
const SCHEDULED_SEND_STATUS_ = 'Enviado (envío programado)';
const SCHEDULED_SEND_BUDGET_MS_ = 4 * 60 * 1000;  // Deja tiempo al resto de sincronizarAplicadas (límite de 6 min)

/** Valida el archivo de control (puro). Devuelve {startMs, pauseMs, ids} o lanza un error con el motivo. */
function parseScheduledSend(text) {
  let data;
  try {
    data = JSON.parse(String(text || ''));
  } catch (e) {
    throw new Error(SCHEDULED_SEND_FILE_ + ' no es un JSON válido');
  }
  const startMs = Date.parse(String(data.enviar_desde || ''));
  if (!/[zZ]|[+-]\d{2}:?\d{2}$/.test(String(data.enviar_desde || '')) || isNaN(startMs)) {
    throw new Error('enviar_desde debe ser una fecha con zona horaria, p. ej. 2026-11-05T08:00:00-05:00');
  }
  const ids = Array.isArray(data.borradores) ? data.borradores.map(x => String(x || '').trim()).filter(Boolean) : [];
  if (!ids.length) throw new Error('borradores debe ser la lista de ids de los borradores que el usuario aprobó');
  if (ids.some(id => !/^r-?\d+$/.test(id))) throw new Error('borradores solo admite ids de borrador de Gmail (r123…)');
  const pause = Number(data.pausa_segundos);
  return { startMs: startMs, pauseMs: Math.min(Math.max(isNaN(pause) ? 3 : pause, 0), 20) * 1000, ids: ids };
}

/** Ids que faltan por intentar, en el orden del archivo (puro). */
function pendingScheduledIds(ids, doneIds) {
  const done = {};
  (doneIds || []).forEach(id => { done[id] = true; });
  const seen = {};
  return ids.filter(id => {
    if (done[id] || seen[id]) return false;
    seen[id] = true;
    return true;
  });
}

/** true si algún mensaje del hilo no es del usuario (ni enviado ni borrador): la empresa ya respondió (puro). */
function threadHasReply(messages) {
  return (messages || []).some(m => {
    const labels = m.labelIds || [];
    return labels.indexOf('SENT') === -1 && labels.indexOf('DRAFT') === -1;
  });
}

/** Lo corre sincronizarAplicadas al empezar. Nunca lanza: un error se registra y la sincronización sigue. */
function envioProgramado_() {
  try {
    const root = DriveApp.getFolderById(getProp_(PROPS.ROOT_FOLDER_ID));
    const base = root.getFoldersByName(CONFIG.COLD_EMAIL_FOLDER_NAME);
    if (!base.hasNext()) return;
    const folder = base.next();
    const file = firstFileByName_(folder, SCHEDULED_SEND_FILE_);
    if (!file) return;
    const plan = parseScheduledSend(readTextFile_(file));
    const key = 'ENVIO_PROGRAMADO_' + file.getId();
    // Un activador de una vez puede dispararse unos minutos antes de la hora: se acepta desde 15 min antes
    if (Date.now() < plan.startMs - 15 * 60 * 1000) {
      scheduleSendTrigger_(key, plan.startMs);
      return;
    }
    const lock = LockService.getUserLock();
    if (!lock.tryLock(1000)) {
      console.warn('Envío programado: otra ejecución está enviando');
      return;
    }
    try {
      runScheduledSend_(folder, file, plan, key);
    } finally {
      lock.releaseLock();
    }
  } catch (e) {
    console.error('Envío programado -> ERROR: ' + e.message);
  }
}

/** Un activador de una sola vez a la hora pedida (sobre sincronizarAplicadas, que ya existe en el Cargador). */
function scheduleSendTrigger_(key, startMs) {
  if (getProp_(key + '_ACTIVADOR')) return;
  const trigger = ScriptApp.newTrigger('sincronizarAplicadas').timeBased().at(new Date(startMs)).create();
  setProp_(key + '_ACTIVADOR', trigger.getUniqueId());
  console.log('Envío programado: activador listo para ' + Utilities.formatDate(new Date(startMs), tz_(), 'yyyy-MM-dd HH:mm'));
}

function runScheduledSend_(folder, file, plan, key) {
  const t0 = Date.now();
  const done = JSON.parse(getProp_(key) || '[]');
  const pending = pendingScheduledIds(plan.ids, done);
  const ss = SpreadsheetApp.openById(getProp_(PROPS.SHEET_ID));
  const sheet = ss.getSheetByName(CONFIG.COLD_EMAIL_SHEET_NAME);
  const log = [];
  let sent = 0;
  for (let i = 0; i < pending.length; i++) {
    if (Date.now() - t0 > SCHEDULED_SEND_BUDGET_MS_) break;  // El resto sale en la corrida de la próxima hora
    const id = pending[i];
    let line;
    try {
      line = sendScheduledDraft_(id, sheet);
      if (/^enviado/.test(line)) sent++;
    } catch (e) {
      line = 'error: ' + e.message;
    }
    done.push(id);
    setProp_(key, JSON.stringify(done));  // Antes de seguir: si la corrida se corta, nunca se reenvía
    log.push(Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd HH:mm:ss') + ' ' + id + ' -> ' + line);
    if (plan.pauseMs && i < pending.length - 1) Utilities.sleep(plan.pauseMs);
  }
  if (log.length) {
    const previous = readOptionalText_(folder, SCHEDULED_SEND_LOG_);
    removeFiles_(folder, SCHEDULED_SEND_LOG_);
    folder.createFile(SCHEDULED_SEND_LOG_, (previous ? previous + '\n' : '') + log.join('\n'), MimeType.PLAIN_TEXT);
  }
  console.log('Envío programado: ' + sent + ' enviados en esta corrida, ' + (pending.length - log.length) + ' pendientes');
  deleteSendTrigger_(key);
  if (pendingScheduledIds(plan.ids, done).length === 0) {
    file.setName('ENVIO_PROGRAMADO_hecho_' + Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd') + '.json');
  } else {
    scheduleSendTrigger_(key, Date.now() + 8 * 60 * 1000);  // Se acabó el tiempo de esta corrida: sigue en 8 minutos
  }
}

/** Borra el activador de una vez que dejó el envío programado (ya se usó). */
function deleteSendTrigger_(key) {
  const triggerId = getProp_(key + '_ACTIVADOR');
  if (!triggerId) return;
  ScriptApp.getProjectTriggers().filter(t => t.getUniqueId() === triggerId).forEach(t => ScriptApp.deleteTrigger(t));
  PropertiesService.getScriptProperties().deleteProperty(key + '_ACTIVADOR');
}

/** Envía un borrador aprobado y lo anota. Devuelve la línea del registro. */
function sendScheduledDraft_(id, sheet) {
  let draft;
  try {
    draft = Gmail.Users.Drafts.get('me', id, { format: 'metadata', metadataHeaders: ['To'] });
  } catch (e) {
    return 'omitido: el borrador ya no existe (lo borraste o ya lo enviaste)';
  }
  const msg = draft.message || {};
  const to = ((msg.payload && msg.payload.headers) || []).filter(h => /^to$/i.test(h.name)).map(h => h.value).join(',');
  const addresses = (to.match(/[^\s<>,;"]+@[^\s<>,;"]+/g) || []).map(a => a.toLowerCase());
  if (msg.threadId && msg.threadId !== msg.id) {
    const thread = Gmail.Users.Threads.get('me', msg.threadId, { format: 'minimal' });
    if (threadHasReply(thread.messages)) return 'omitido: el hilo ya tiene una respuesta de ' + addresses.join(', ');
  }
  Gmail.Users.Drafts.send({ id: id }, 'me');
  markScheduledSent_(sheet, addresses);
  return 'enviado a ' + addresses.join(', ');
}

/** Correos en frío: la fila en borrador de esa dirección pasa a enviada; un seguimiento en borrador, a enviado. */
function markScheduledSent_(sheet, addresses) {
  if (!sheet || sheet.getLastRow() < 2) return;
  const headers = CONFIG.COLD_EMAIL_SHEET_HEADERS;
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();
  const today = Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd');
  const stamp = Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd HH:mm');
  addresses.forEach(address => {
    const i = unsentDraftRowIndex(rows, address);
    if (i >= 0) {
      sheet.getRange(i + 2, 3).setNumberFormat('@').setValue(stamp);
      sheet.getRange(i + 2, 6).setValue(SCHEDULED_SEND_STATUS_);
      rows[i][5] = SCHEDULED_SEND_STATUS_;
      return;
    }
    for (let j = rows.length - 1; j >= 0; j--) {
      const addrs = (String(rows[j][1] || '').match(/[^\s;,()]+@[^\s;,()]+/g) || []).map(a => a.toLowerCase());
      if (addrs.indexOf(address) === -1) continue;
      const note = followupNoteSent(rows[j][7], today);
      if (note !== String(rows[j][7] || '')) {
        sheet.getRange(j + 2, 8).setValue(note);
        rows[j][7] = note;
        return;
      }
    }
  });
}
