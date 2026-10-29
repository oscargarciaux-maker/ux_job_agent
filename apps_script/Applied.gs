/**
 * Vacantes a las que el usuario YA aplicó: viven en la carpeta CONFIG.APPLIED_FOLDER_NAME (dentro de la carpeta
 * raíz), organizadas como CV/<fecha o semana>/<Empresa[_Cargo]>. El color de cada carpeta es su estado:
 * rojo = rechazada, verde = en proceso, amarillo = aplicada sin respuesta (sin color = aplicada).
 * sincronizarAplicadas (activador cada hora) y el botón "Actualizar" del juego y del tablero vuelcan todo a la hoja
 * "Aplicadas" del registro, y el pipeline descarta vacantes nuevas de esas empresas para no volver a postular.
 */

/** Recorre la carpeta de aplicadas y reescribe la hoja "Aplicadas" (con el color de cada carpeta). */
function sincronizarAplicadas() {
  // Borradores de correos en frío (2026-10-24): van primero y aparte, así un error aquí no frena la sincronización
  try {
    crearBorradoresEnFrio();
  } catch (e) {
    console.error('Correos en frío -> ERROR: ' + e.message);
  }
  sincronizarRegistro_({ pdf: true });
  // Seguimiento de correos en frío sin respuesta (2026-10-28): un borrador corto en el mismo hilo, una vez al día
  try {
    crearBorradoresDeSeguimiento_();
  } catch (e) {
    console.error('Borradores de seguimiento -> ERROR: ' + e.message);
  }
  try {
    writeSourceQuality_();
  } catch (e) {
    console.warn('No se pudo escribir la pestaña ' + CONFIG.SOURCE_QUALITY_SHEET_NAME + ': ' + e.message);
  }
}

/**
 * Lo que ve el tablero y el juego: pestañas "Aplicadas" y "Por enviar" desde Drive, y la caché del tablero. Lo corre
 * sincronizarAplicadas cada hora y el botón "Actualizar" del juego y del tablero (&sync=1, 2026-10-26: antes el botón solo
 * recalculaba con el Sheet de la última hora y no se veían las carpetas recién movidas). Las carpetas se leen con una sola
 * consulta a Drive (folderChildren_) para que el botón responda en segundos. Si otra sincronización está corriendo, espera
 * hasta un minuto a que termine; si sigue ocupada, se usa lo que ella deje. Devuelve el JSON del tablero (o null).
 * opts.pdf (solo la corrida de cada hora): renueva el PDF de las HV por enviar; el botón no lo hace para responder rápido.
 */
function sincronizarRegistro_(opts) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(60000)) {
    console.warn('Otra sincronización sigue corriendo: se usa lo que ella deje');
    return null;
  }
  // Tiempo de cada paso en el registro de ejecuciones (2026-10-26: el botón Actualizar se sentía lento)
  const t0 = Date.now(), times = [];
  const lap = name => times.push(name + ' ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
  try {
    const root = DriveApp.getFolderById(getProp_(PROPS.ROOT_FOLDER_ID));
    const folders = root.getFoldersByName(CONFIG.APPLIED_FOLDER_NAME);
    if (!folders.hasNext()) {
      console.warn('No existe la carpeta ' + CONFIG.APPLIED_FOLDER_NAME + ' dentro de ' + root.getName());
      return null;
    }
    const children = folderChildren_();
    lap('carpetas');
    const rows = [];
    collectAppliedFolders_(folders.next().getId(), '', rows, false, '', children);
    // Postulaciones antiguas (2026-10-25): una carpeta "Antigua" (o "Antiguas") junto a CV/ cuenta como una semana más
    children(root.getId()).filter(f => CONFIG.APPLIED_OLD_FOLDER_PATTERN.test(String(f.name).trim()))
      .forEach(f => collectAppliedFolders_(f.id, f.name, rows, false, f.name, children));

    const ss = SpreadsheetApp.openById(getProp_(PROPS.SHEET_ID));
    const sheet = ss.getSheetByName(CONFIG.APPLIED_SHEET_NAME) ||
                  ss.insertSheet(CONFIG.APPLIED_SHEET_NAME, ss.getNumSheets());  // Al final: la hoja 1 sigue siendo el registro
    try {
      recordColorChanges_(ss, previousAppliedStatuses_(sheet), rows);
    } catch (e) {
      console.error('Cambios de color -> ERROR: ' + e.message);
    }
    sheet.clear();
    const header = CONFIG.APPLIED_SHEET_HEADERS;
    const values = [header].concat(rows.map(r => [r.group, r.company, r.title, r.status, r.color || '',
      '=HYPERLINK("https://drive.google.com/drive/folders/' + r.id + '","Abrir")', r.created, r.week]));
    sheet.getRange(1, 1, values.length, header.length).setValues(values);
    sheet.getRange(1, 1, 1, header.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    if (rows.length) {
      sheet.getRange(2, 4, rows.length, 1).setBackgrounds(rows.map(r => [r.color || null]));
    }
    const count = {};
    rows.forEach(r => { count[r.status] = (count[r.status] || 0) + 1; });
    console.log('Aplicadas sincronizadas: ' + rows.length + ' ' + JSON.stringify(count));
    lap('Aplicadas');
    try {
      writePendingCvs_(ss, root, children, !!(opts && opts.pdf));
    } catch (e) {
      console.error('Por enviar -> ERROR: ' + e.message);
    }
    lap('Por enviar');
    try {
      const json = warmDashboardCache_(children);
      lap('tablero');
      return json;
    } catch (e) {
      console.error('Tablero -> ERROR: ' + e.message);
      return null;
    }
  } finally {
    lock.releaseLock();
    console.log('Sincronización: ' + times.join(' · '));
  }
}

/**
 * Subcarpetas de cualquier carpeta, leídas de una vez: una sola consulta (paginada) trae todas las carpetas de Drive con su
 * carpeta madre. Antes era una consulta por carpeta (unas 110 para CV/). Si la consulta falla, se vuelve a la de siempre.
 */
function folderChildren_() {
  try {
    const byParent = {};
    let pageToken;
    do {
      const res = Drive.Files.list({
        q: "mimeType = 'application/vnd.google-apps.folder' and trashed = false",
        fields: 'nextPageToken, files(id, name, folderColorRgb, createdTime, description, parents)', pageSize: 1000, pageToken: pageToken,
      });
      (res.files || []).forEach(f => (f.parents || []).forEach(p => { (byParent[p] = byParent[p] || []).push(f); }));
      pageToken = res.nextPageToken;
    } while (pageToken);
    return parentId => (byParent[parentId] || []).slice();
  } catch (e) {
    console.warn('Carpetas de una vez -> ' + e.message + '; se leen una por una');
    return listChildFolders_;
  }
}

/**
 * HV preparadas que el usuario aún no envía (2026-10-25): cada Sin revisar/<fecha>/<vacante> con una HV (Google Doc o
 * PDF HV_/CV_) va a la hoja "Por enviar" con su verificación y su revisión. Al enviarla, el usuario mueve la carpeta a
 * CV/<semana> y sale de esta lista en la siguiente sincronización.
 * Paquete de envío (2026-10-28): con exportPdf, el PDF de cada HV se crea o se renueva si el Doc cambió después (Oscar
 * retoca el Doc; el PDF es lo que sube al portal), como máximo CONFIG.PENDING_PDF_PER_RUN por corrida. La columna Mensaje
 * trae el _correo_cuerpo de CV_IA.json para copiarlo; se reutiliza el de la corrida anterior para no releer cada JSON.
 */
function writePendingCvs_(ss, root, children, exportPdf) {
  children = children || listChildFolders_;
  const sheet = ss.getSheetByName(CONFIG.PENDING_CV_SHEET_NAME) || ss.insertSheet(CONFIG.PENDING_CV_SHEET_NAME, ss.getNumSheets());
  const header = CONFIG.PENDING_CV_SHEET_HEADERS;
  const previous = previousPendingMessages_(sheet, header);
  const rows = [];
  const doubtful = [];
  const recent = recentDays(Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd'), CONFIG.CV_CATCHUP_DAYS);
  const drafts = { pending: 0, map: null };  // borradores sin enviar por destinatario: se leen solo si hace falta
  let exported = 0;
  const pending = root.getFoldersByName(CONFIG.PENDING_FOLDER_NAME);
  if (pending.hasNext()) {
    children(pending.next().getId()).forEach(day => {
      children(day.id).forEach(f => {
        if (f.name === CONFIG.DOUBTFUL_FOLDER_NAME && recent.indexOf(day.name) !== -1) {
          children(f.id).forEach(d => {
            try {
              const file = listChildFiles_(d.id).find(x => x.name === CONFIG.VERIFICATION_FILE_NAME);
              const record = doubtfulRecord(day.name, d.name, file ? readTextFile_(DriveApp.getFileById(file.id)) : '');
              if (record) doubtful.push(Object.assign(record, { id: d.id }));
            } catch (e) {
              console.warn('Dudosa ' + d.name + ' -> ' + e.message);
            }
          });
        }
        if (f.name === CONFIG.POSTS_FOLDER_NAME || f.name === CONFIG.DOUBTFUL_FOLDER_NAME) return;
        const files = listChildFiles_(f.id);
        const cv = pendingCvFiles(files);
        const hv = cv.doc || cv.pdf;
        if (!hv) return;
        const text = name => {
          const file = files.find(x => x.name === name);
          return file ? readTextFile_(DriveApp.getFileById(file.id)) : '';
        };
        const record = pendingCvRecord(day.name, f.name, files.filter(isCvFile_).map(x => x.name),
                                       text(CONFIG.VERIFICATION_FILE_NAME), text('Revision.txt'));
        if (!record) return;
        let pdf = cv.pdf;
        if (exportPdf && cv.stale && exported < CONFIG.PENDING_PDF_PER_RUN) {
          try {
            pdf = refreshPendingPdf_(f.id, cv);
            exported++;
          } catch (e) {
            console.warn(f.name + ' -> no se pudo exportar el PDF: ' + e.message);
          }
        }
        if (exportPdf && pdf && drafts.pending < CONFIG.DRAFT_PDF_PER_RUN) {
          try {
            if (attachPdfToVacancyDraft_(f.id, pdf, drafts)) drafts.pending++;
          } catch (e) {
            console.warn(f.name + ' -> no se pudo adjuntar el PDF al borrador: ' + e.message);
          }
        }
        let message = previous[f.id];
        if (message === undefined) {
          try {
            message = pendingMessage(text(CONFIG.CV_JSON_NAME));
          } catch (e) {
            message = '';
          }
        }
        rows.push(Object.assign(record, { id: f.id, hvId: hv.id, hv: hv.name, pdfId: pdf ? pdf.id : '', mensaje: message }));
      });
    });
  }
  rows.sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
  sheet.clear();
  const values = [header].concat(rows.map(r => [r.fecha, r.empresa, r.cargo, r.verificacion, r.revision,
    '=HYPERLINK("https://drive.google.com/drive/folders/' + r.id + '","Abrir")',
    '=HYPERLINK("https://drive.google.com/open?id=' + r.hvId + '","' + r.hv.replace(/"/g, "'") + '")',
    r.pdfId ? '=HYPERLINK("https://drive.google.com/open?id=' + r.pdfId + '","PDF")' : '',
    r.mensaje]));
  sheet.getRange(1, 1, values.length, header.length).setValues(values);
  sheet.getRange(1, 1, 1, header.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
  console.log('Por enviar: ' + rows.length + ' HV en ' + CONFIG.PENDING_FOLDER_NAME + (exported ? ' (' + exported + ' PDF nuevos)' : ''));
  writeDoubtfulSheet_(ss, doubtful);
}

/** Reescribe la pestaña "Dudosas": las que esperan el sí o no de Oscar (la oficina las muestra con botones). */
function writeDoubtfulSheet_(ss, rows) {
  const header = CONFIG.DOUBTFUL_SHEET_HEADERS;
  const sheet = ss.getSheetByName(CONFIG.DOUBTFUL_SHEET_NAME) || ss.insertSheet(CONFIG.DOUBTFUL_SHEET_NAME, ss.getNumSheets());
  rows.sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
  sheet.clear();
  const values = [header].concat(rows.map(r => [r.fecha, r.empresa, r.cargo, r.motivo, r.vacante,
    '=HYPERLINK("https://drive.google.com/drive/folders/' + r.id + '","Abrir")']));
  sheet.getRange(1, 1, values.length, header.length).setValues(values);
  sheet.getRange(1, 1, 1, header.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
  if (rows.length) console.log('Dudosas por decidir: ' + rows.map(r => r.empresa).join(', '));
}

/**
 * Pone el PDF de la HV en el borrador sin enviar de la vacante (2026-10-29: el borrador se crea al armar la HV, antes de
 * que exista el PDF, y quedaba sin adjunto). La propiedad DRAFT_PDF_<carpeta> guarda el PDF ya puesto (o «sin-correo»)
 * para no volver a abrir Detalle_Vacante ni el borrador cada hora. Conserva el asunto, el destinatario, el hilo y el texto
 * que Oscar haya editado. true si actualizó un borrador.
 */
function attachPdfToVacancyDraft_(folderId, pdf, drafts) {
  const props = PropertiesService.getScriptProperties();
  const key = 'DRAFT_PDF_' + folderId;
  const done = props.getProperty(key);
  if (done === pdf.id || done === 'sin-correo') return false;
  const folder = DriveApp.getFolderById(folderId);
  const detail = firstFileByName_(folder, 'Detalle_Vacante');
  const vacancy = parseVacancyDetail(detail ? DocumentApp.openById(detail.getId()).getBody().getText() : '');
  if (!vacancy.email) {
    props.setProperty(key, 'sin-correo');
    return false;
  }
  if (!drafts.map) drafts.map = draftIdsByRecipient_();
  const draftId = drafts.map[vacancy.email.toLowerCase()];
  if (!draftId) {  // sin borrador (ya enviado o borrado): no se vuelve a intentar con este PDF
    props.setProperty(key, pdf.id);
    return false;
  }
  const message = Gmail.Users.Drafts.get('me', draftId, { format: 'full' }).message;
  const header = name => (((message.payload && message.payload.headers) || []).find(h => h.name.toLowerCase() === name) || {}).value || '';
  const part = draftTextPart(message.payload);
  if (!part) return false;
  const text = part.html ? htmlToPlainText(gmailBodyText_(part.data)) : gmailBodyText_(part.data);
  const extra = ['in-reply-to', 'references'].map(h => header(h) ? (h === 'in-reply-to' ? 'In-Reply-To: ' : 'References: ') + header(h) : '').filter(Boolean);
  const blob = DriveApp.getFileById(pdf.id).getBlob().setName(pdf.name.replace(/\.pdf$/i, '') + '.pdf');
  const raw = Utilities.base64EncodeWebSafe(buildMimeMessage(header('to'), header('subject'), text.trim(), blob, extra));
  Gmail.Users.Drafts.update({ id: draftId, message: { raw: raw, threadId: message.threadId } }, 'me', draftId);
  props.setProperty(key, pdf.id);
  console.log(folder.getName() + ' -> PDF adjunto al borrador para ' + vacancy.email);
  return true;
}

/** La parte de texto de un mensaje de Gmail: { data, html }, prefiriendo text/plain; null si no hay. */
function draftTextPart(payload) {
  const all = [];
  const walk = p => {
    if (!p) return;
    if (/^text\/(plain|html)/i.test(p.mimeType || '') && p.body && p.body.data && !(p.filename)) all.push(p);
    (p.parts || []).forEach(walk);
  };
  walk(payload);
  const plain = all.find(p => /^text\/plain/i.test(p.mimeType));
  const html = all.find(p => /^text\/html/i.test(p.mimeType));
  return plain ? { data: plain.body.data, html: false } : html ? { data: html.body.data, html: true } : null;
}

/** Texto de un HTML de correo: los párrafos y saltos se vuelven líneas y los enlaces quedan como su dirección. */
function htmlToPlainText(html) {
  return String(html || '')
    .replace(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (m, href, txt) => {
      const t = txt.replace(/<[^>]+>/g, '').trim();
      return t === href || !t ? href : t + ' ' + href;
    })
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div)>/gi, '\n\n').replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** Fila de "Dudosas" para una carpeta de Sin revisar/<fecha>/Dudosas; null si su veredicto ya no es DUDOSA. */
function doubtfulRecord(dayName, folderName, verificationText) {
  const verdict = parseVerdict(verificationText);
  if (verdict.verdict !== 'DUDOSA') return null;
  const parsed = parseAppliedFolderName(folderName);
  const link = (String(verificationText || '').match(/https?:\/\/[^\s)\]>"']+/) || [''])[0].replace(/[.,;]+$/, '');
  return { fecha: dayName, empresa: parsed.company, cargo: parsed.title, motivo: verdict.reason, vacante: link };
}

/** Nuevo Verificacion.txt de una dudosa que Oscar decidió: el veredicto arriba y el reporte anterior debajo. */
function doubtfulDecisionText(approved, previousText, today) {
  return (approved ? 'VEREDICTO: LISTA\nMOTIVO: aprobada por el candidato (' : 'VEREDICTO: DESCARTAR\nMOTIVO: descartada por el candidato (') +
    today + ', desde la oficina)\n\n--- Reporte anterior (DUDOSA) ---\n' + String(previousText || '').trim() + '\n';
}

/** Mensaje de la corrida anterior por id de carpeta (sale de la fórmula de la columna Carpeta). */
function previousPendingMessages_(sheet, header) {
  const out = {};
  const col = header.indexOf('Mensaje');
  if (col < 0 || sheet.getLastRow() < 2 || sheet.getLastColumn() < col + 1) return out;
  const n = sheet.getLastRow() - 1;
  const folders = sheet.getRange(2, header.indexOf('Carpeta') + 1, n, 1).getFormulas();
  const messages = sheet.getRange(2, col + 1, n, 1).getValues();
  folders.forEach((row, i) => {
    const id = (String(row[0]).match(/folders\/([\w-]+)/) || [])[1];
    if (id) out[id] = String(messages[i][0] || '');
  });
  return out;
}

/** Crea o renueva el PDF de la HV: el anterior va a la papelera (el Sheet se reescribe con el enlace nuevo). */
function refreshPendingPdf_(folderId, cv) {
  const blob = DriveApp.getFileById(cv.doc.id).getAs(MimeType.PDF).setName(cv.doc.name + '.pdf');
  const file = DriveApp.getFolderById(folderId).createFile(blob);
  if (cv.pdf) DriveApp.getFileById(cv.pdf.id).setTrashed(true);
  return { id: file.getId(), name: file.getName() };
}

/**
 * La HV de una carpeta: el Google Doc manda (Oscar lo retoca) y el PDF es su copia para enviar. stale = hay Doc y el PDF
 * falta o es anterior a la última edición del Doc (modifiedTime en ISO, comparable como texto).
 */
function pendingCvFiles(files) {
  const cvs = files.filter(isCvFile_);
  const doc = cvs.find(f => f.mimeType === 'application/vnd.google-apps.document') || null;
  const pdf = cvs.find(f => f.mimeType === 'application/pdf') || null;
  return { doc: doc, pdf: pdf, stale: !!doc && (!pdf || String(pdf.modifiedTime || '') < String(doc.modifiedTime || '')) };
}

/** Texto para copiar al postular: _correo_cuerpo de CV_IA.json ('' si no hay JSON o no lo trae). */
function pendingMessage(jsonText) {
  if (!String(jsonText || '').trim()) return '';
  const body = parseCvJson(jsonText)._correo_cuerpo;
  return typeof body === 'string' ? body.trim() : '';
}

/** Una HV generada: Google Doc o PDF cuyo nombre empieza por HV_ o CV_ (no CV_IA.json ni CV_IA_ERRORES.txt). */
function isCvFile_(file) {
  const okType = file.mimeType === 'application/vnd.google-apps.document' || file.mimeType === 'application/pdf';
  return okType && /^(HV|CV)_/.test(file.name) && file.name.indexOf('CV_IA') !== 0;
}

/** Fila de "Por enviar" para una carpeta de Sin revisar; null si la carpeta no tiene HV. */
function pendingCvRecord(dayName, folderName, cvNames, verificationText, revisionText) {
  if (!cvNames.length) return null;
  const parsed = parseAppliedFolderName(folderName);
  const verdict = parseVerdict(verificationText).verdict;
  const review = (String(revisionText || '').match(/VEREDICTO\s*:\s*(LISTA_PARA_ENVIAR|REVISAR)/i) || [])[1] || '';
  return {
    fecha: dayName, empresa: parsed.company, cargo: parsed.title, hv: cvNames[0],
    verificacion: verdict ? verdict.replace('_', ' ').toLowerCase().replace(/^./, c => c.toUpperCase()) : 'Sin verificación',
    revision: !review ? 'Sin revisión' : /^LISTA/i.test(review) ? 'Lista para enviar' : 'Revisar',
  };
}

function listChildFiles_(parentId) {
  const out = [];
  let pageToken;
  do {
    const res = Drive.Files.list({
      q: "'" + parentId + "' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false",
      fields: 'nextPageToken, files(id, name, mimeType, modifiedTime)', pageSize: 1000, pageToken: pageToken,
    });
    (res.files || []).forEach(f => out.push(f));
    pageToken = res.nextPageToken;
  } while (pageToken);
  return out;
}

/**
 * Las carpetas sin subcarpetas son vacantes; las demás (fechas, semanas) solo agrupan. Las que están dentro de una
 * carpeta "Prueba" son HV preparadas que el usuario aún no envió: estado "Preparada, sin enviar" (siguen contando para
 * no proponer de nuevo la misma vacante). weekName es la carpeta de primer nivel (la semana del usuario: "Primera
 * semana nueva", "Segunda semana"...), aunque la vacante esté dentro de una subcarpeta por fecha (2026-10-25).
 * Las carpetas de primer nivel de CV/ siempre son semanas: una vacía es una semana que empieza, no una vacante (2026-10-26:
 * "4. Cuarta semana" recién creada salía como una HV enviada en una quinta semana sin nombre).
 */
function collectAppliedFolders_(parentId, groupName, rows, inTest, weekName, children) {
  children = children || listChildFolders_;
  const topLevel = !groupName && !weekName;
  children(parentId).forEach(f => {
    const test = inTest || /^prueba$/i.test(String(f.name).trim());
    const sub = children(f.id);
    if (sub.length) {
      collectAppliedFolders_(f.id, f.name, rows, test, weekName || f.name, children);
      return;
    }
    if (topLevel) return;
    const parsed = parseAppliedFolderName(f.name);
    rows.push({ id: f.id, group: groupName, company: parsed.company, title: parsed.title,
                status: test ? 'Preparada, sin enviar' : colorToStatus(f.folderColorRgb), color: f.folderColorRgb,
                // Fecha de envío: la que deja «Ya la envié» del juego (2026-10-27); si no, la creación de la carpeta
                created: sentDayFromDescription(f.description) || localDay(f.createdTime, tz_()), week: weekName || groupName });
  });
}

/** Estado de cada carpeta en la hoja "Aplicadas" antes de reescribirla: { idCarpeta: estado }. */
function previousAppliedStatuses_(sheet) {
  const out = {};
  if (sheet.getLastRow() < 2) return out;
  const n = sheet.getLastRow() - 1;
  const status = sheet.getRange(2, 4, n, 1).getDisplayValues();
  sheet.getRange(2, 6, n, 1).getFormulas().forEach((f, i) => {
    const id = extractFolderId(f[0]);
    if (id) out[id] = String(status[i][0] || '');
  });
  return out;
}

/**
 * Rechazos y pruebas que Oscar marcó pintando la carpeta en Drive (2026-10-28: Bancolombia se volvió roja y el juego no
 * mostró el rechazo, porque sin fila en Seguimiento no tenía fecha y quedaba como historia). Una fila con la fecha de hoy.
 */
function recordColorChanges_(ss, previous, rows) {
  const sheet = ss.getSheetByName(CONFIG.FOLLOWUP_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 1) return;
  const values = sheet.getDataRange().getDisplayValues();
  const today = Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd');
  const records = colorChangeFollowups(previous, rows, values, today);
  const header = values[0].map(String);
  records.forEach(r => sheet.appendRow(followupRow(header, r)));
  if (records.length) console.log('Seguimiento: ' + records.map(r => r['Empresa'] + ' ' + r['Estado nuevo']).join(', '));
}

/**
 * Filas para Seguimiento por cada carpeta que ya estaba en "Aplicadas" y pasó a rechazada o en proceso sin que Seguimiento
 * lo diga (ni el juego ni la skill seguimiento lo anotaron). Las carpetas nuevas no cuentan: una carpeta de antiguas recién
 * reconocida llenaría el juego de rechazos viejos con la fecha de hoy. `followupValues`: la pestaña con su encabezado.
 */
function colorChangeFollowups(previous, rows, followupValues, today) {
  const followups = dashboardRows(followupValues);
  return rows.filter(r => {
    const key = applicationStatusKey(r.status);
    if (key !== 'rechazada' && key !== 'proceso') return false;
    if (!(r.id in previous) || applicationStatusKey(previous[r.id]) === key) return false;
    return !followups.some(f => sameCompany_(f['Empresa'], r.company) &&
      (!f['Cargo'] || !r.title || sameCompany_(f['Cargo'], r.title)) && applicationStatusKey(f['Estado nuevo']) === key);
  }).map(r => {
    const rejected = applicationStatusKey(r.status) === 'rechazada';
    return {
      'Fecha revisión': today, 'Empresa': r.company, 'Cargo': r.title, 'Carpeta': (r.group ? r.group + '/' : '') +
        r.company + (r.title ? '_' + r.title : ''),
      'Hecho': 'La carpeta pasó a ' + (rejected ? 'rojo' : 'verde') + ' en Drive', 'Fuente': 'Color de la carpeta (sincronización)',
      'Estado anterior': previous[r.id] || '—', 'Estado nuevo': rejected ? 'Rechazada (rojo)' : 'En proceso (verde)',
      'Siguiente acción': rejected ? 'Ninguna' : 'Preparar la prueba o entrevista', 'Quién': rejected ? '—' : 'candidato',
    };
  });
}

/**
 * Carpetas de semana (primer nivel de CV/ y la carpeta de antiguas junto a CV/), con su día de creación: así el tablero y
 * el juego muestran la semana nueva aunque todavía no tenga envíos (2026-10-26).
 */
function listWeekFolders_(children) {
  children = children || listChildFolders_;
  const root = DriveApp.getFolderById(getProp_(PROPS.ROOT_FOLDER_ID));
  const cv = root.getFoldersByName(CONFIG.APPLIED_FOLDER_NAME);
  const weeks = cv.hasNext() ? children(cv.next().getId()) : [];
  const old = children(root.getId()).filter(f => CONFIG.APPLIED_OLD_FOLDER_PATTERN.test(String(f.name).trim()));
  return weeks.concat(old).map(f => ({ nombre: f.name, creada: localDay(f.createdTime, tz_()) }));
}

/**
 * Día (yyyy-MM-dd) de una fecha RFC 3339 de Drive en la zona del script (2026-10-25): antes se cortaba la fecha UTC y
 * una carpeta creada de noche en Bogotá caía al día siguiente (importa para la racha del juego).
 */
function localDay(iso, timeZone) {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? String(iso).slice(0, 10) : Utilities.formatDate(d, timeZone || 'America/Bogota', 'yyyy-MM-dd');
}

function listChildFolders_(parentId) {
  const out = [];
  let pageToken;
  do {
    const res = Drive.Files.list({
      q: "'" + parentId + "' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
      fields: 'nextPageToken, files(id, name, folderColorRgb, createdTime, description)', pageSize: 1000, pageToken: pageToken,
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
