/**
 * Correos en frío (skill correo-en-frio, decisiones del usuario 2026-10-24). La IA deja en
 * Vacantes con IA/Correos en frío/<Empresa>/ la HV (Google Doc HV_...) y Correos.json; aquí se crea un borrador de
 * Gmail por destinatario con el PDF de la HV adjunto y una fila en la pestaña "Correos en frío". Nunca se envía nada.
 * Corre dentro del activador horario de sincronizarAplicadas (no hay que reinstalar activadores) y a mano con
 * crearBorradoresEnFrio. Una carpeta con Borradores.txt ya se procesó; con Correos_ERRORES.txt, la IA debe corregir.
 */

function crearBorradoresEnFrio() {
  const root = DriveApp.getFolderById(getProp_(PROPS.ROOT_FOLDER_ID));
  const base = root.getFoldersByName(CONFIG.COLD_EMAIL_FOLDER_NAME);
  if (!base.hasNext()) return;
  const pending = [];
  collectColdEmailFolders_(base.next(), pending, 0);
  if (!pending.length) return;

  const contextDoc = findDocByName_(CONFIG.CONTEXT_DOC_NAME);
  if (!contextDoc) throw new Error('No se encontró el Google Doc ' + CONFIG.CONTEXT_DOC_NAME + ' (necesario para validar).');
  const contextText = DocumentApp.openById(contextDoc.getId()).getBody().getText();
  const ss = SpreadsheetApp.openById(getProp_(PROPS.SHEET_ID));
  const sheet = ss.getSheetByName(CONFIG.COLD_EMAIL_SHEET_NAME) || ss.insertSheet(CONFIG.COLD_EMAIL_SHEET_NAME, ss.getNumSheets());
  if (sheet.getLastRow() === 0) sheet.appendRow(CONFIG.COLD_EMAIL_SHEET_HEADERS);
  const contacted = contactedAddresses(sheet.getLastRow() > 1
    ? sheet.getRange(2, 1, sheet.getLastRow() - 1, CONFIG.COLD_EMAIL_SHEET_HEADERS.length).getValues() : []);

  let drafts = null;  // Destinatario -> id de su borrador, solo si alguna carpeta reemplaza borradores
  pending.forEach(folder => {
    const label = folder.getName();
    try {
      let data;
      let check;
      try {
        data = JSON.parse(readTextFile_(firstFileByName_(folder, CONFIG.COLD_EMAILS_FILE)).replace(/^﻿/, ''));
        check = validateColdEmails(data, contextText, contacted);
      } catch (e) {
        check = { errors: [e.message], warnings: [], recipients: [] };
      }
      const hv = findColdHv_(folder, data && data.hv);
      if (!hv) check.errors.push('No hay una HV (Google Doc que empiece por ' + CONFIG.CV_FILE_PREFIX + ') en la carpeta');
      if (check.errors.length) {
        replaceFile_(folder, CONFIG.COLD_ERRORS_FILE, check.errors.join('\n'));
        console.error(label + ' -> Correos.json rechazado:\n  ' + check.errors.join('\n  '));
        return;
      }
      const pdf = hv.getAs(MimeType.PDF).setName(hv.getName() + '.pdf');
      const done = check.warnings.map(w => 'AVISO: ' + w);
      let made = 0;
      check.recipients.forEach(r => {
        const subject = coldDraftSubject(data.empresa, r.asunto);
        const body = r.cuerpo + '\n\n' + data.firma;
        if (r.reemplaza) {
          // Borrador anterior sin enviar (decisión del usuario 2026-10-25): se reescribe el mismo borrador con la HV
          // nueva; si ya no está (lo envió o lo borró), no se crea otro para no escribirle dos veces.
          drafts = drafts || draftIdsByRecipient_();
          const draftId = drafts[r.para.toLowerCase()];
          if (!draftId) { done.push('AVISO: ' + r.para + ' -> no encontré su borrador anterior; no se crea otro (¿ya lo enviaste o lo borraste?)'); return; }
          const raw = Utilities.base64EncodeWebSafe(buildMimeMessage(r.para, subject, body, pdf));
          Gmail.Users.Drafts.update({ id: draftId, message: { raw: raw } }, 'me', draftId);
          updateColdEmailRow_(sheet, r.para, r.asunto, pdf.getName());
          done.push(r.para + ' -> borrador ' + draftId + ' reescrito con la HV nueva');
        } else {
          const id = createApplicationDraft_(r.para, subject, body, pdf);
          sheet.appendRow([data.empresa, r.para, '—', r.asunto, pdf.getName(), 'Borrador preparado, no enviado', '',
                           [r.fuente, r.fecha_fuente, r.nota].filter(Boolean).join(' | ')]);
          contacted[r.para.toLowerCase()] = 'borrador';
          done.push(r.para + ' -> borrador ' + id);
        }
        made++;
      });
      removeFiles_(folder, CONFIG.COLD_ERRORS_FILE);
      replaceFile_(folder, CONFIG.COLD_DRAFTS_DONE_FILE, done.join('\n'));
      if (made) markTargetCompany_(ss, data.empresa, 'Borradores creados');
      console.log(label + ' -> ' + made + ' borradores con ' + pdf.getName());
    } catch (e) {
      console.error(label + ' -> ERROR: ' + e.message);
    }
  });
}

/** Estado de la empresa en la pestaña "Empresas objetivo" (skill investigar-empresas), si está allí. */
function markTargetCompany_(ss, company, status) {
  const sheet = ss.getSheetByName(CONFIG.TARGET_COMPANIES_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) return;
  const headers = CONFIG.TARGET_COMPANIES_HEADERS;
  const names = sheet.getRange(2, headers.indexOf('Empresa') + 1, sheet.getLastRow() - 1, 1).getValues();
  names.forEach((row, i) => {
    if (targetCompanyMatches(row[0], company)) sheet.getRange(i + 2, headers.indexOf('Estado') + 1).setValue(status);
  });
}

/** Destinatario (en minúsculas) -> id de su borrador de Gmail; si hay varios, el más reciente. */
function draftIdsByRecipient_() {
  const out = {};
  let pageToken;
  do {
    const page = Gmail.Users.Drafts.list('me', { maxResults: 100, pageToken: pageToken });
    (page.drafts || []).forEach(d => {
      const msg = Gmail.Users.Drafts.get('me', d.id, { format: 'metadata', metadataHeaders: ['To'] }).message;
      const to = ((msg.payload && msg.payload.headers) || []).filter(h => /^to$/i.test(h.name)).map(h => h.value).join(',');
      (to.match(/[^\s<>,;"]+@[^\s<>,;"]+/g) || []).forEach(addr => {
        const key = addr.toLowerCase();
        if (!out[key]) out[key] = d.id;  // drafts.list devuelve primero los más recientes
      });
    });
    pageToken = page.nextPageToken;
  } while (pageToken);
  return out;
}

/** En "Correos en frío", la fila sin enviar de esa dirección: asunto, HV usada y una nota de la actualización. */
function updateColdEmailRow_(sheet, address, subject, pdfName) {
  const last = sheet.getLastRow();
  if (last < 2) return;
  const rows = sheet.getRange(2, 1, last - 1, CONFIG.COLD_EMAIL_SHEET_HEADERS.length).getValues();
  const i = unsentDraftRowIndex(rows, address);
  if (i < 0) return;
  const note = String(rows[i][7] || '');
  const stamp = 'HV y correo actualizados ' + Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd');
  sheet.getRange(i + 2, 4, 1, 2).setValues([[subject, pdfName]]);
  sheet.getRange(i + 2, 8).setValue(note ? note + ' | ' + stamp : stamp);
}

/** Carpetas (hasta 3 niveles: Correos en frío/<grupo>/<Empresa>) con Correos.json y sin Borradores.txt. */
function collectColdEmailFolders_(folder, out, depth) {
  if (firstFileByName_(folder, CONFIG.COLD_EMAILS_FILE)) {
    if (!firstFileByName_(folder, CONFIG.COLD_DRAFTS_DONE_FILE)) out.push(folder);
    return;
  }
  if (depth >= 3) return;
  const it = folder.getFolders();
  while (it.hasNext()) collectColdEmailFolders_(it.next(), out, depth + 1);
}

/** La HV indicada en Correos.json ("hv") o, si no se indica, el primer Google Doc HV_ de la carpeta. */
function findColdHv_(folder, name) {
  const docs = folder.getFilesByType(MimeType.GOOGLE_DOCS);
  while (docs.hasNext()) {
    const doc = docs.next();
    if (name ? doc.getName() === name : doc.getName().indexOf(CONFIG.CV_FILE_PREFIX) === 0) return doc;
  }
  return null;
}

// ---------- Lógica pura (probada en tests/apps_script.test.js) ----------

/**
 * Misma empresa entre la fila de "Empresas objetivo" y el "empresa" de Correos.json, que suele ser más corto:
 * "ADL Digital Lab (Aval Digital Labs)" = "ADL Digital Lab", "Widetech Group" = "Widetech" (sin paréntesis, sin
 * tildes ni signos, y uno empieza por el otro).
 */
function targetCompanyMatches(rowName, company) {
  const key = s => companyKey_(String(s || '').replace(/\(.*?\)/g, ' '));
  const a = key(rowName);
  const b = key(company);
  if (a.length < 3 || b.length < 3) return false;
  return a === b || a.indexOf(b) === 0 || b.indexOf(a) === 0;
}

/**
 * Direcciones ya usadas en la pestaña "Correos en frío" (columna B, varias separadas por ";", con "(BCC)"):
 * { correo: 'rebotado' | 'usado' | 'borrador' }. Un correo que rebotó nunca se vuelve a usar; uno ya usado tampoco se
 * repite. 'borrador' = solo tiene un borrador sin enviar: Correos.json con "reemplazar": true puede reescribirlo.
 */
function contactedAddresses(rows) {
  const out = {};
  const rank = { borrador: 1, usado: 2, rebotado: 3 };
  rows.forEach(row => {
    const status = String(row[5] || '');
    const bounced = /rebot/i.test(status + ' ' + String(row[6])) && !/sin rebote/i.test(status);
    const info = String(row[6] || '');
    const unsent = /^\s*borrador preparado/i.test(status);
    (String(row[1] || '').match(/[^\s;,()]+@[^\s;,()]+/g) || []).forEach(addr => {
      const key = addr.toLowerCase();
      // En un "rebotado parcialmente", solo rebotaron las direcciones que nombra la columna de respuesta
      const thisBounced = bounced && (!/parcial/i.test(status) || info.toLowerCase().indexOf(key.split('@')[0] + '@') !== -1);
      const value = thisBounced ? 'rebotado' : (unsent ? 'borrador' : 'usado');
      if (!out[key] || rank[value] > rank[out[key]]) out[key] = value;
    });
  });
  return out;
}

/** Índice (0 = primera fila de datos) de la fila con un borrador sin enviar para esa dirección, o -1. */
function unsentDraftRowIndex(rows, address) {
  const key = String(address || '').toLowerCase();
  for (let i = rows.length - 1; i >= 0; i--) {
    const addrs = (String(rows[i][1] || '').match(/[^\s;,()]+@[^\s;,()]+/g) || []).map(a => a.toLowerCase());
    if (addrs.indexOf(key) !== -1 && /^\s*borrador preparado/i.test(String(rows[i][5] || ''))) return i;
  }
  return -1;
}

/**
 * Palabras de un mensaje como las cuenta la guía de cover letters: sin URLs; "[LinkedIn](url)" cuenta como 1. El
 * nombre de la empresa (que se menciona con discreción en el texto) no cuenta (decisión del usuario 2026-10-24).
 */
function countEmailWords(text, company) {
  let t = String(text || '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/https?:\/\/\S+/g, ' ');
  if (String(company || '').trim()) t = t.replace(companyPattern_(company, 'giu'), ' ');
  return t.split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w)).length;
}

/** El nombre de la empresa como palabra completa, sin importar mayúsculas. */
function companyPattern_(company, flags) {
  return new RegExp('(^|[^\\p{L}\\p{N}])' + escapeRegex_(String(company).trim()) + '(?=$|[^\\p{L}\\p{N}])', flags || 'iu');
}

/** Asunto del borrador: "[Empresa] asunto" para identificarlo; el usuario quita el prefijo al enviar. */
function coldDraftSubject(company, subject) {
  return '[' + String(company).trim() + '] ' + String(subject).trim();
}

/**
 * Valida Correos.json: { empresa, idioma, firma, hv?, correos: [{ para, nombre?, asunto, cuerpo, fuente, fecha_fuente?,
 * nota? }] }. Reglas: cuerpo de máximo CONFIG.COLD_EMAIL_MAX_WORDS palabras (Guía Maestra de Cover Letters), cada
 * dirección con su fuente, cifras que existan en CONTEXTO_CV, sin palabras prohibidas, y nunca una dirección que ya
 * rebotó o ya se usó (esas se omiten con aviso). Con "reemplazar": true, una dirección que solo tiene un borrador sin
 * enviar sale con reemplaza: true (se reescribe ese borrador). Devuelve { errors, warnings, recipients }.
 */
function validateColdEmails(data, contextText, contacted) {
  const errors = [];
  const warnings = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { errors: ['Correos.json debe ser un objeto JSON'], warnings, recipients: [] };
  if (!String(data.empresa || '').trim()) errors.push('Falta "empresa"');
  if (!String(data.firma || '').trim()) errors.push('Falta "firma" (nombre del candidato)');
  if (data.idioma !== 'es' && data.idioma !== 'en') errors.push('"idioma" debe ser "es" o "en"');
  if (!Array.isArray(data.correos) || !data.correos.length) errors.push('"correos" debe ser una lista con al menos un destinatario');

  const knownNumbers = {};
  extractNumbers_(contextText).forEach(n => { knownNumbers[n] = true; });
  const recipients = [];
  const seen = {};
  (Array.isArray(data.correos) ? data.correos : []).forEach((c, i) => {
    const who = 'correos[' + i + ']' + (c && c.para ? ' (' + c.para + ')' : '');
    const para = String((c && c.para) || '').trim();
    if (!/^[^\s@<>]+@[^\s@<>]+\.[a-z]{2,}$/i.test(para)) { errors.push(who + ': "para" no es un correo válido'); return; }
    const key = para.toLowerCase();
    if (seen[key]) { warnings.push(para + ' está repetido en Correos.json; se usa una vez'); return; }
    seen[key] = true;
    if (contacted && contacted[key] === 'rebotado') { warnings.push(para + ' ya rebotó antes: se omite'); return; }
    const replaces = data.reemplazar === true && contacted && contacted[key] === 'borrador';
    if (contacted && contacted[key] && !replaces) { warnings.push(para + ' ya está en "Correos en frío": se omite para no escribir dos veces'); return; }
    ['asunto', 'cuerpo', 'fuente'].forEach(f => {
      if (!String((c && c[f]) || '').trim()) errors.push(who + ': falta "' + f + '"' + (f === 'fuente' ? ' (de dónde sale la dirección)' : ''));
    });
    const body = String(c.cuerpo || '');
    const company = String(data.empresa || '').trim();
    const words = countEmailWords(body, company);
    if (words > CONFIG.COLD_EMAIL_MAX_WORDS) errors.push(who + ': el cuerpo tiene ' + words + ' palabras (máximo ' + CONFIG.COLD_EMAIL_MAX_WORDS + ', Guía Maestra de Cover Letters)');
    const plain = body.replace(/\([^)]*https?:\/\/[^)]*\)/g, ' ').replace(/https?:\/\/\S+/g, ' ').replace(/\S+@\S+/g, ' ');
    extractNumbers_(plain + ' ' + String(c.asunto || '')).forEach(n => {
      if (!knownNumbers[n]) errors.push(who + ': la cifra ' + n + ' no está en ' + CONFIG.CONTEXT_DOC_NAME);
    });
    const forbidden = forbiddenCvWords(body + ' ' + String(c.asunto || ''), false);
    if (forbidden.length) errors.push(who + ': palabras prohibidas: ' + forbidden.join(', '));
    if (/^\s*postulaci[oó]n\b/i.test(String(c.asunto || ''))) warnings.push(who + ': el asunto empieza por "Postulación" (la guía pide nombrar la especialidad)');
    // Decisiones del usuario (2026-10-24): el asunto que se envía no lleva el nombre de la empresa (Apps Script le pone
    // "[Empresa] " solo en el borrador); si la dirección es de una persona, se la saluda por su nombre.
    if (company && companyPattern_(company).test(String(c.asunto || ''))) errors.push(who + ': el asunto no puede llevar el nombre de la empresa (el borrador lo muestra como prefijo [' + company + '] que se quita al enviar)');
    const firstName = String(c.nombre || '').trim().split(/\s+/)[0];
    if (firstName && !new RegExp('^[^\\n]{0,40}' + escapeRegex_(firstName), 'iu').test(body.trim())) errors.push(who + ': el saludo debe ir a ' + firstName + ' (la dirección es de esa persona)');
    if (company && !companyPattern_(company).test(body)) warnings.push(who + ': el cuerpo no menciona a ' + company);
    recipients.push({ para: para, nombre: String(c.nombre || '').trim(), asunto: String(c.asunto || '').trim(), cuerpo: body.trim(), fuente: String(c.fuente || '').trim(),
                      fecha_fuente: String(c.fecha_fuente || '').trim(), nota: String(c.nota || '').trim(), reemplaza: replaces });
  });
  if (!errors.length && !recipients.length) warnings.push('Todos los destinatarios ya estaban usados o rebotados: no se crea ningún borrador');
  return { errors, warnings, recipients: errors.length ? [] : recipients };
}
