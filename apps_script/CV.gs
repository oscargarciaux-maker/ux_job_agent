/**
 * Fase 3: arma el CV a partir de CV_IA.json (redactado por la IA) sobre MASTER_TEMPLATE, exporta el PDF (si CV_EXPORT_PDF)
 * y crea el borrador de Gmail. Un activador la corre cada CONFIG.CV_EVERY_MINUTES dentro de la ventana CV_FIRST_HOUR–CV_LAST_HOUR:
 * arma cada HV poco después de que la IA deja su CV_IA.json.
 * Contrato CV_IA.json: una clave por marcador de MASTER_TEMPLATE (sin llaves; "" = eliminar ese párrafo)
 * + metadatos _idioma ('es'/'en'), _keywords, _gaps, _mapa (mapa de evidencia) y _correo_cuerpo.
 */

const CV_META_KEYS_ = ['_idioma', '_keywords', '_gaps', '_correo_cuerpo', '_nombre_archivo', '_mapa'];
const CV_REQUIRED_KEYS_ = ['UBICACION', 'TITULO_SUBTITULO_PROFESIONAL', 'PERFIL_PERSONALIZADO'];

// Rótulos fijos de MASTER_TEMPLATE que se traducen cuando la vacante está en inglés.
// Desde 2026-10-24 las categorías de habilidades y la ubicación son marcadores que la IA escribe en el idioma de la vacante.
const TEMPLATE_LABELS_EN_ = {
  'Idiomas:': 'Languages:',
  'Portafolio': 'Portfolio',  // Texto del enlace del encabezado (prueba de crear-hv, 2026-10-24)
};

/**
 * Para cada carpeta de hoy (y de los CV_CATCHUP_DAYS días anteriores, por si una tanda de la IA falló) con CV_IA.json y sin
 * CV generado: valida, llena la plantilla, PDF (si está activo), borrador y registro.
 */
function generarCVsDesdeIA() {
  const now = new Date();
  const hour = Number(Utilities.formatDate(now, tz_(), 'H'));
  if (!isWithinCvWindow(hour)) return;  // El activador corre cada CV_EVERY_MINUTES todo el día
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) { console.log('Generación HV: otra corrida está procesando las mismas carpetas'); return; }
  try {
  const root = DriveApp.getFolderById(getProp_(PROPS.ROOT_FOLDER_ID));
  const today = Utilities.formatDate(now, tz_(), 'yyyy-MM-dd');
  // Sin revisar/<día> desde 2026-10-22; <hoy> en la raíz por si alguna corrida anterior la dejó allí. Una vez por hora mira
  // CV_RESCUE_DAYS días (2026-11-09: las 12 vacantes del 6 nov quedaron huérfanas al pasar los 2 días de retoma).
  const back = cvScanBack(Number(Utilities.formatDate(now, tz_(), 'm')));
  const pendingIt = root.getFoldersByName(CONFIG.PENDING_FOLDER_NAME);
  const pending = pendingIt.hasNext() ? pendingIt.next() : null;
  const candidates = recentDays(today, back).map(day => pending ? pending.getFoldersByName(day) : null)
    .concat([root.getFoldersByName(today)]);
  const dateFolders = candidates.filter(it => it && it.hasNext()).map(it => it.next());
  // HV a pedido (modo C de crear-hv, 2026-11-09): una HV general o para un perfil, sin vacante ni registro
  const onDemandIt = root.getFoldersByName(CONFIG.ON_DEMAND_FOLDER_NAME);
  const onDemand = onDemandIt.hasNext() ? onDemandIt.next() : null;
  if (!dateFolders.length && !onDemand) {
    console.log('No hay carpeta de vacantes para ' + today + '.');
    return;
  }
  const sheet = dateFolders.length ? getRegistrySheet_() : null;
  dateFolders.forEach(f => buildCvsInFolder_(f, sheet));
  if (onDemand) buildCvsInFolder_(onDemand, null);
  } finally { lock.releaseLock(); }
}

/** Días hacia atrás que revisa esta pasada: CV_RESCUE_DAYS en la primera pasada de cada hora, si no CV_CATCHUP_DAYS. */
function cvScanBack(minute) {
  return Number(minute) < CONFIG.CV_EVERY_MINUTES ? CONFIG.CV_RESCUE_DAYS : CONFIG.CV_CATCHUP_DAYS;
}

/** Hoy y los `back` días anteriores, como 'yyyy-MM-dd', de hoy hacia atrás. */
function recentDays(today, back) {
  const t = Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1, +today.slice(8, 10));
  const out = [];
  for (let i = 0; i <= back; i++) out.push(new Date(t - i * 86400000).toISOString().slice(0, 10));
  return out;
}

/** true si la hora (0–23, Bogotá) está dentro de la ventana en que generarCVsDesdeIA trabaja. */
function isWithinCvWindow(hour) {
  return hour >= CONFIG.CV_FIRST_HOUR && hour <= CONFIG.CV_LAST_HOUR;
}

/** Prueba desde el editor: arma los CV de la carpeta PRUEBA_IA (en la carpeta raíz) sin tocar la hoja de registro. */
function probarCVsDesdeIA() {
  const root = DriveApp.getFolderById(getProp_(PROPS.ROOT_FOLDER_ID));
  const testFolders = root.getFoldersByName(CONFIG.CV_TEST_FOLDER);
  if (!testFolders.hasNext()) throw new Error('No existe la carpeta ' + CONFIG.CV_TEST_FOLDER + ' dentro de ' + root.getName());
  buildCvsInFolder_(testFolders.next(), null);
}

function buildCvsInFolder_(dateFolder, sheet) {
  console.log('--- Generando CVs desde CV_IA.json en ' + dateFolder.getName() + ' ---');
  // CONTEXTO_CV y la plantilla se leen solo si hay un CV_IA.json por armar: la mayoría de pasadas (cada 10 min) no tienen.
  let shared = null;
  const getShared = () => {
    if (shared) return shared;
    const contextDoc = findDocByName_(CONFIG.CONTEXT_DOC_NAME);
    if (!contextDoc) throw new Error('No se encontró el Google Doc ' + CONFIG.CONTEXT_DOC_NAME + ' (necesario para validar).');
    const template = getTemplateFile_();
    shared = {
      contextText: DocumentApp.openById(contextDoc.getId()).getBody().getText(),
      template: template,
      placeholders: listPlaceholders_(template.getId()).map(p => p.slice(2, -2)),
      history: cvHistory_(),
    };
    return shared;
  };

  // Se copian antes del ciclo: las carpetas descartadas o dudosas se mueven mientras se recorren. También se revisan
  // las de Dudosas: si el usuario cambió el veredicto a LISTA vuelven al día; a DESCARTAR, van a la papelera.
  const folders = [];
  const it = dateFolder.getFolders();
  while (it.hasNext()) {
    const folder = it.next();
    if (folder.getName() === CONFIG.DOUBTFUL_FOLDER_NAME) {
      const doubtful = folder.getFolders();
      while (doubtful.hasNext()) folders.push({ folder: doubtful.next(), inDoubtful: true });
    } else if (folder.getName() !== CONFIG.POSTS_FOLDER_NAME) {
      folders.push({ folder: folder, inDoubtful: false });
    }
  }
  folders.forEach(entry => {
    const folder = entry.folder;
    const label = folder.getName();
    try {
      const verdict = parseVerdict(readOptionalText_(folder, CONFIG.VERIFICATION_FILE_NAME));
      if (entry.inDoubtful) {
        if (verdict.verdict === 'DUDOSA') return;  // Sigue esperando la decisión del usuario
        if (verdict.verdict === 'LISTA' || verdict.verdict === 'MENOR_PRIORIDAD') {
          folder.moveTo(dateFolder);
          console.log(label + ' -> aprobada por el usuario, vuelve a ' + dateFolder.getName());
        }
      }
      if ((verdict.verdict === 'DESCARTAR' || verdict.verdict === 'DUDOSA') && !hasGeneratedCv_(folder)) {
        setAsideVacancy_(folder, verdict, dateFolder, sheet);
        return;
      }
      const jsonFile = firstFileByName_(folder, CONFIG.CV_JSON_NAME);
      if (!jsonFile) return;
      // 2026-11-12 (Oscar): si la postulación trae correo, el borrador sale solo. El correo viene del aviso
      // (Detalle_Vacante) o de la línea CORREO: que el inspector deja en Verificacion.txt al leer el aviso completo.
      const verifiedEmail = verdictEmail(readOptionalText_(folder, CONFIG.VERIFICATION_FILE_NAME));
      if (hasGeneratedCv_(folder)) {
        // Recuperar el estado en Sheets tras un fallo previo al actualizar la fila.
        const detail = firstFileByName_(folder, 'Detalle_Vacante');
        const priorVacancy = parseVacancyDetail(detail ? DocumentApp.openById(detail.getId()).getBody().getText() : '');
        updateVacancyStatus_(sheet, priorVacancy.link, 'Pendiente');
        priorVacancy.email = priorVacancy.email || verifiedEmail;
        if (priorVacancy.email) lateApplicationDraft_(folder, jsonFile, priorVacancy, label);
        console.log(label + ' -> ya tiene CV generado; estado sincronizado, no se duplica');
        return;
      }
      const detailFile = firstFileByName_(folder, 'Detalle_Vacante') || firstFileByName_(folder, CONFIG.ON_DEMAND_DETAIL_NAME);
      const vacancy = parseVacancyDetail(detailFile ? DocumentApp.openById(detailFile.getId()).getBody().getText() : '');
      vacancy.email = vacancy.email || verifiedEmail;
      const { contextText, template, placeholders, history } = getShared();

      let cv;
      let check;
      try {
        cv = parseCvJson(readTextFile_(jsonFile));
        check = validateCvJson(cv, contextText, placeholders, vacancy, history.forLabel(label));
      } catch (e) {
        check = { errors: [e.message], warnings: [] };
      }
      check.warnings.forEach(w => console.warn(label + ' -> aviso: ' + w));
      if (check.ats !== undefined) {
        replaceFile_(folder, CONFIG.ATS_REPORT_NAME, atsReport(check.ats, label));
        if (check.ats) console.log(label + ' -> match ATS ' + check.ats.score + '% (posible ' + check.ats.potential + '%)');
      }
      if (check.errors.length) {
        replaceFile_(folder, CONFIG.CV_ERRORS_NAME, check.errors.join('\n'));
        updateVacancyStatus_(sheet, vacancy.link, 'CV rechazado (validación)');
        console.error(label + ' -> CV_IA.json rechazado:\n  ' + check.errors.join('\n  '));
        return;
      }

      const cvName = buildCvFileName(cv, vacancy, label);
      // No llamar HV_/CV_ a un documento hasta completar su contenido: evita aceptar copias incompletas.
      const copy = template.makeCopy('EN_PROCESO_' + cvName, folder);
      let pdf = null;
      try {
        fillCvDocument_(copy.getId(), cv);
        if (CONFIG.CV_EXPORT_PDF) pdf = folder.createFile(copy.getAs(MimeType.PDF).setName(cvName + '.pdf'));
        copy.setName(cvName);  // Marca de documento realmente terminado.
      } catch (buildError) {
        if (pdf) pdf.setTrashed(true);  // No dejar un PDF aislado que impida reintentar.
        copy.setTrashed(true);  // Solo nuestra copia temporal, nunca un CV del usuario.
        throw buildError;
      }
      removeFiles_(folder, CONFIG.CV_ERRORS_NAME);
      updateVacancyStatus_(sheet, vacancy.link, 'Pendiente');
      history.remember(label, cv);

      let draftNote = 'sin correo directo';
      if (vacancy.email && cv._correo_cuerpo) {
        // Un fallo de Gmail no deshace la HV ni la deja bloqueada como «Esperando CV».
        // Si create() creó el borrador pero la respuesta se perdió, NO reintentar a ciegas
        // para evitar duplicarlo; dejar un aviso que Oscar pueda comprobar.
        try {
          const subject = buildApplicationEmail(vacancy, cv._idioma).subject;
          const attachment = pdf ? pdf.getBlob() : copy.getAs(MimeType.PDF).setName(cvName + '.pdf');
          createApplicationDraft_(vacancy.email, subject, cv._correo_cuerpo, attachment);
          removeFiles_(folder, CONFIG.CV_DRAFT_ERRORS_NAME);
          replaceFile_(folder, CONFIG.CV_DRAFT_DONE_NAME,
            applicationDraftNote(vacancy.email, Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd')));
          draftNote = 'borrador para ' + vacancy.email;
        } catch (mailError) {
          replaceFile_(folder, CONFIG.CV_DRAFT_ERRORS_NAME,
            'HV creada. No se confirmó borrador para ' + vacancy.email + ': ' + mailError.message +
            '\\nRevisar Gmail antes de reintentar; una respuesta de API perdida puede haber creado el borrador.');
          draftNote = 'borrador sin confirmar (revisar archivo de errores)';
          console.warn(label + ' -> Gmail: ' + mailError.message);
        }
      }
      console.log(label + ' -> ' + cvName + (pdf ? ' (Doc + PDF)' : ' (Google Doc)') + ' y ' + draftNote + ' OK');
    } catch (e) {
      console.error(label + ' -> ERROR: ' + e.message);
    }
  });
  console.log('--- Generación de CVs finalizada ---');
}

/**
 * Borrador de una HV ya armada cuyo correo apareció después (2026-11-12): el inspector lo anotó en Verificacion.txt,
 * Oscar lo escribió en Detalle_Vacante o la HV se armó antes de que hubiera _correo_cuerpo. Una sola vez por carpeta
 * (CV_DRAFT_DONE_NAME) y nunca si ya hay un borrador, un programado o un enviado a esa dirección.
 */
function lateApplicationDraft_(folder, jsonFile, vacancy, label) {
  if (firstFileByName_(folder, CONFIG.CV_DRAFT_DONE_NAME)) return;
  // Un error de Gmail espera a Oscar; el aviso de «falta _correo_cuerpo» se resuelve solo cuando la IA lo agrega.
  const pendingError = firstFileByName_(folder, CONFIG.CV_DRAFT_ERRORS_NAME);
  if (pendingError && !/^Falta _correo_cuerpo/.test(readTextFile_(pendingError))) return;
  const today = Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd');
  let cv;
  try { cv = parseCvJson(readTextFile_(jsonFile)); } catch (e) { return; }
  if (!String(cv._correo_cuerpo || '').trim()) {
    if (pendingError) return;
    replaceFile_(folder, CONFIG.CV_DRAFT_ERRORS_NAME, 'Falta _correo_cuerpo en CV_IA.json para el borrador a ' + vacancy.email +
      '. Agrégalo (estructura de Oscar) y borra este archivo; la HV no se rehace.');
    console.warn(label + ' -> hay correo (' + vacancy.email + ') pero falta _correo_cuerpo');
    return;
  }
  const found = Gmail.Users.Messages.list('me', { q: '(in:drafts OR in:sent OR in:scheduled) to:' + vacancy.email, maxResults: 1 });
  if (found.messages && found.messages.length) {
    replaceFile_(folder, CONFIG.CV_DRAFT_DONE_NAME, applicationDraftNote(vacancy.email, today) + ' (ya había un correo a esa dirección)');
    return;
  }
  const pdf = firstPdfCv_(folder);
  if (!pdf) return;  // sincronizarAplicadas exporta el PDF; el borrador sale en la siguiente pasada
  if (pendingError) pendingError.setTrashed(true);
  try {
    createApplicationDraft_(vacancy.email, buildApplicationEmail(vacancy, cv._idioma).subject, cv._correo_cuerpo, pdf.getBlob());
    replaceFile_(folder, CONFIG.CV_DRAFT_DONE_NAME, applicationDraftNote(vacancy.email, today));
    console.log(label + ' -> borrador de postulación para ' + vacancy.email + ' (HV ya armada)');
  } catch (mailError) {
    replaceFile_(folder, CONFIG.CV_DRAFT_ERRORS_NAME, 'No se confirmó el borrador para ' + vacancy.email + ': ' + mailError.message +
      '\nRevisar Gmail antes de reintentar; una respuesta de API perdida puede haber creado el borrador.');
  }
}

/** PDF de la HV de la carpeta (HV_… o CV_…, no CV_IA), o null. */
function firstPdfCv_(folder) {
  const it = folder.getFilesByType(MimeType.PDF);
  while (it.hasNext()) {
    const f = it.next();
    if (/^(HV|CV)_/.test(f.getName()) && f.getName().indexOf(CONFIG.CV_JSON_NAME) !== 0) return f;
  }
  return null;
}

/** Saca del día una vacante que no pasó la verificación: DESCARTAR -> papelera (recuperable); DUDOSA -> Dudosas. */
function setAsideVacancy_(folder, verdict, dateFolder, sheet) {
  const detailFile = firstFileByName_(folder, 'Detalle_Vacante');
  const vacancy = parseVacancyDetail(detailFile ? DocumentApp.openById(detailFile.getId()).getBody().getText() : '');
  const reason = verdict.reason || 'sin motivo';
  if (verdict.verdict === 'DESCARTAR') {
    updateVacancyStatus_(sheet, vacancy.link, 'Descartada: ' + reason);
    folder.setTrashed(true);
    console.log(folder.getName() + ' -> descartada (' + reason + '), carpeta a la papelera');
  } else {
    updateVacancyStatus_(sheet, vacancy.link, 'Dudosa: ' + reason);
    folder.moveTo(getOrCreateSubfolder_(dateFolder, CONFIG.DOUBTFUL_FOLDER_NAME));
    console.log(folder.getName() + ' -> dudosa (' + reason + '), movida a ' + CONFIG.DOUBTFUL_FOLDER_NAME);
  }
}

// ---------- Lógica pura (probada en tests/apps_script.test.js) ----------

/**
 * Veredicto de Verificacion.txt: líneas "VEREDICTO: LISTA|MENOR_PRIORIDAD|DUDOSA|DESCARTAR" y "MOTIVO: ...".
 * Acepta tildes, minúsculas y los sinónimos de la skill (Cerrada = DESCARTAR, Pendiente de decisión = DUDOSA).
 */
function parseVerdict(text) {
  const raw = String(text || '');
  const line = raw.match(/^[\s*#>-]*VEREDICTO\s*:[ \t*]*(.+)$/im);
  const reasonLine = raw.match(/^[\s*#>-]*MOTIVO\s*:[ \t*]*(.+)$/im);
  if (!line) return { verdict: null, reason: reasonLine ? reasonLine[1].trim().slice(0, 200) : '' };
  // Sin línea MOTIVO, el formato de la skill lo trae entre paréntesis: "Veredicto: ❌ Descartar (motivo)"
  const inline = line[1].match(/\(([^)]+)\)/);
  const reason = (reasonLine ? reasonLine[1] : inline ? inline[1] : '').trim().slice(0, 200);
  const v = line[1].normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  let verdict = null;
  if (/DESCART|CERRAD/.test(v)) verdict = 'DESCARTAR';
  else if (/DUDOS|PENDIENTE/.test(v)) verdict = 'DUDOSA';
  else if (/MENOR/.test(v)) verdict = 'MENOR_PRIORIDAD';
  else if (/LISTA/.test(v)) verdict = 'LISTA';
  return { verdict: verdict, reason: reason };
}

/**
 * Correo para postular que el inspector leyó en el aviso completo (2026-11-12): línea «CORREO: dirección» de
 * Verificacion.txt. Devuelve la dirección en minúsculas o null.
 */
function verdictEmail(text) {
  const line = String(text || '').match(/^[\s*#>-]*CORREO\s*:[ \t*]*<?([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/im);
  return line ? line[1].toLowerCase() : null;
}

/** Contenido de Borrador_postulacion.txt: marca que esa carpeta ya tiene su borrador. */
function applicationDraftNote(email, today) {
  return 'Borrador de postulación creado para ' + email + ' el ' + today + ' (solo borrador; Oscar lo revisa y lo envía).';
}

function parseCvJson(text) {
  let cv;
  try {
    cv = JSON.parse(String(text || '').replace(/^﻿/, ''));
  } catch (e) {
    throw new Error(CONFIG.CV_JSON_NAME + ' no es JSON válido: ' + e.message);
  }
  if (!cv || typeof cv !== 'object' || Array.isArray(cv)) throw new Error(CONFIG.CV_JSON_NAME + ' debe ser un objeto JSON');
  return cv;
}

/** Números del texto normalizados (sin separadores de miles/decimales): "1.500" -> "1500", "30%" -> "30". */
function extractNumbers_(text) {
  return (String(text || '').match(/\d+(?:[.,]\d+)*/g) || []).map(n => n.replace(/[.,]/g, ''));
}

/**
 * Valida el contrato y la regla anti-alucinación: toda cifra, empresa y herramienta del CV/correo debe aparecer en
 * CONTEXTO_CV; mide el match ATS contra la vacante (Ats.gs) y, con `history` ({hash, recent}), que no repita el perfil ni
 * más de CONFIG.CV_MAX_SHARED_LOGROS logros de otra HV reciente. Devuelve { errors, warnings, ats }.
 */
function validateCvJson(cv, contextText, placeholders, vacancy, history) {
  const allowJunior = vacancyAllowsJunior(vacancy);
  const errors = [];
  const warnings = [];
  if (cv._idioma !== 'es' && cv._idioma !== 'en') errors.push('_idioma debe ser "es" o "en"');

  placeholders.forEach(p => {
    if (!(p in cv)) errors.push('Falta el marcador ' + p + ' (usa "" para eliminarlo)');
  });
  // Marcadores que nunca pueden ir vacíos (2026-10-24): la ubicación va dentro de la línea de contacto
  CV_REQUIRED_KEYS_.forEach(key => {
    if (placeholders.indexOf(key) !== -1 && typeof cv[key] === 'string' && !cv[key].trim()) errors.push(key + ' no puede ir vacío');
  });
  Object.keys(cv).forEach(key => {
    if (CV_META_KEYS_.indexOf(key) !== -1) return;
    if (typeof cv[key] !== 'string') errors.push(key + ' debe ser texto');
    else if (placeholders.indexOf(key) === -1) warnings.push(key + ' no existe en la plantilla; se ignora');
  });

  const knownNumbers = {};
  extractNumbers_(contextText).forEach(n => { knownNumbers[n] = true; });
  const contextLower = String(contextText || '').toLowerCase();
  const textKeys = Object.keys(cv).filter(k => CV_META_KEYS_.indexOf(k) === -1 || k === '_correo_cuerpo');
  textKeys.forEach(key => {
    const value = cv[key];
    if (typeof value !== 'string' || !value) return;
    if (/\{\{|\}\}/.test(value)) errors.push(key + ' contiene llaves {{ }}');
    extractNumbers_(value).forEach(n => {
      if (!knownNumbers[n]) errors.push(key + ': la cifra "' + n + '" no está en ' + CONFIG.CONTEXT_DOC_NAME);
    });
    if (/EMPRESA|COMPANY/.test(key) && contextLower.indexOf(value.trim().toLowerCase()) === -1) {
      errors.push(key + ': la empresa "' + value.trim() + '" no está en ' + CONFIG.CONTEXT_DOC_NAME);
    }
    const forbidden = forbiddenCvWords(value, allowJunior);
    if (forbidden.length) errors.push(key + ': palabra prohibida en la HV (' + forbidden.join(', ') + ')');
  });
  // Guía 2026-10-22: el perfil es un párrafo en prosa, sin construcciones "X: Y"
  if (/:/.test(String(cv.PERFIL_PERSONALIZADO || ''))) errors.push('PERFIL_PERSONALIZADO: va en prosa, sin dos puntos');
  cargoErrors(cv, vacancy).forEach(e => errors.push(e));
  targetCompanyErrors(cv, vacancy).forEach(e => errors.push(e));
  personalizationErrors(cv, contextText).forEach(e => errors.push(e));
  // Anti-alucinación de herramientas y match ATS (2026-11-09: el match de las HV salía en 40–50 %)
  const tools = atsToolIssues(cv, contextText);
  tools.errors.forEach(e => errors.push(e));
  tools.warnings.forEach(w => warnings.push(w));
  const ats = atsCoverage(vacancy, cv, contextText);
  atsErrors(ats).forEach(e => errors.push(e));
  if (history && history.hash) repetitionErrors(cvFingerprint(cv, history.hash), history.recent || []).forEach(e => errors.push(e));
  // Guía Maestra de Cover Letters: el correo de postulación tiene la misma forma que los correos en frío (2026-11-03)
  emailShapeErrors(cv._correo_cuerpo).forEach(e => warnings.push('_correo_cuerpo ' + e));
  // 2026-11-12 (Oscar): «si en la postulación aparece correo, genéralo automáticamente»
  if (vacancy && vacancy.email && !String(cv._correo_cuerpo || '').trim()) {
    errors.push('_correo_cuerpo: la postulación trae correo (' + vacancy.email + ') y falta el mensaje para el borrador');
  }
  return { errors: errors.filter((e, i, all) => all.indexOf(e) === i), warnings: warnings, ats: ats };
}

/**
 * Huella de una HV para no repetirla (LECCIONES_HV, 25 oct 2026: «ninguna HV puede compartir el perfil ni más de 2
 * logros con el mismo texto con otra HV de los últimos 7 días»). Desde 2026-11-09 la comprueba Apps Script: la IA ya no
 * lee las HV anteriores (era la lectura más cara de la mañana). hash(texto normalizado) -> cadena corta.
 */
function cvFingerprint(cv, hash) {
  const perfil = normText_(String(cv.PERFIL_PERSONALIZADO || '').split(/(?<=[.!?])\s/)[0]);
  const logros = Object.keys(cv).filter(k => /^LOGRO_\d+_\d+$/.test(k) && normText_(cv[k])).map(k => hash(normText_(cv[k])));
  return { p: perfil ? hash(perfil) : '', l: logros };
}

/** Errores si la huella repite el perfil o más de CONFIG.CV_MAX_SHARED_LOGROS logros de una HV de `recent` ({n, d, p, l}). */
function repetitionErrors(fp, recent) {
  const errors = [];
  recent.forEach(r => {
    if (fp.p && fp.p === r.p) errors.push('PERFIL_PERSONALIZADO: abre con la misma frase que la HV de ' + r.n + ' (' + r.d + '); escríbelo para esta vacante');
    const shared = fp.l.filter(h => (r.l || []).indexOf(h) !== -1).length;
    if (shared > CONFIG.CV_MAX_SHARED_LOGROS) {
      errors.push('Repite ' + shared + ' logros con el mismo texto de la HV de ' + r.n + ' (' + r.d + '); máximo ' +
        CONFIG.CV_MAX_SHARED_LOGROS + ': elige o redacta otros desde el mapa de evidencia');
    }
  });
  return errors;
}

/** Huellas guardadas de los últimos CV_HISTORY_DAYS días, sin las de la misma carpeta y hasta CV_HISTORY_MAX. */
function pruneCvHistory(entries, today, label) {
  const limit = new Date(Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1, +today.slice(8, 10)) -
    CONFIG.CV_HISTORY_DAYS * 86400000).toISOString().slice(0, 10);
  return (entries || []).filter(e => e && e.d >= limit && e.n !== label).slice(-CONFIG.CV_HISTORY_MAX);
}

/** Texto sin mayúsculas, tildes ni signos (palabras separadas por un espacio). */
function normText_(text) {
  return String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

const KEYWORD_STOPWORDS_ = ['and', 'the', 'for', 'with', 'from', 'para', 'con', 'del', 'los', 'las', 'una', 'por', 'que', 'sus'];

/**
 * Una keyword está en el texto si aparece la frase completa o, si no, cada palabra: las de 3 o más letras por su raíz
 * ("prototyping" cuenta con "prototypes", "tools" con "tool", "diseño" con "diseñé") y las siglas ("UX", "A/B") como
 * palabra exacta.
 */
function keywordCovered(keyword, text) {
  // Siglas partidas por signos se juntan ("A/B" → "ab", "UX/UI" → "uxui") en la keyword y en el texto. Solo con / & -
  // entre ellas (2026-11-09: antes «UX e IA» o «UX de» quedaban «uxeia»/«uxde» y la keyword UX no se encontraba)
  const join = x => normText_(String(x || '').replace(/\b[A-Za-z0-9]{1,2}(?:\s*[\/&-]\s*[A-Za-z0-9]{1,2})+\b/g,
    m => m.replace(/[\s\/&-]+/g, '')));
  const k = join(keyword);
  if (!k) return true;
  // 2026-11-11: el cargo que llega de atsRoleTitle ya viene normalizado («analista ux cx ui») y la HV escribe
  // «Analista UX/CX/UI»; se compara también con las siglas separadas para no pedir un cargo que ya está.
  const split = ' ' + normText_(String(text || '').replace(/[\/&-]/g, ' ')) + ' ';
  if (split.indexOf(' ' + normText_(String(keyword || '').replace(/[\/&-]/g, ' ')) + ' ') !== -1) return true;
  const t = ' ' + join(text) + ' ';
  if (t.indexOf(' ' + k + ' ') !== -1) return true;
  const stems = {};
  t.trim().split(' ').forEach(w => { stems[keywordStem_(w)] = true; });
  return k.split(' ').filter(w => KEYWORD_STOPWORDS_.indexOf(w) === -1)
    .every(w => w.length < 3 ? t.indexOf(' ' + w + ' ') !== -1 : !!stems[keywordStem_(w)]);
}

/** Raíz corta de una palabra en inglés o español: "testing"/"tests" → "test", "diseño"/"diseñé" → "disen". */
function keywordStem_(word) {
  let w = String(word).replace(/(ings|ing|ers|er|ed|es|s|ciones|cion|ales|al)$/, '');
  if (w.length < 3) w = String(word);
  if (w.length > 4) w = w.replace(/[aeiou]$/, '');
  return w.slice(0, 6);
}

/**
 * Personalización comprobable (2026-10-25: el usuario fue a enviar varias HV y "no me convencieron": repetían los mismos
 * logros y el perfil no hablaba de la vacante). Para las CV_KEYWORDS_CHECKED primeras keywords de la vacante, la IA deja
 * en `_mapa` dónde cuenta el candidato esa función en CONTEXTO_CV (cita textual, aunque use otras palabras) y en qué parte
 * de la HV va; las que no son brecha (donde = "GAP") tienen que aparecer en el perfil, un cargo, una descripción o un logro,
 * no solo en las habilidades.
 */
function personalizationErrors(cv, contextText) {
  const keywords = Array.isArray(cv._keywords) ? cv._keywords.filter(k => typeof k === 'string' && k.trim()) : [];
  if (!keywords.length) return ['_keywords: faltan las keywords de la vacante, en ranking'];
  const top = keywords.slice(0, CONFIG.CV_KEYWORDS_CHECKED);
  const mapa = Array.isArray(cv._mapa) ? cv._mapa.filter(m => m && typeof m === 'object') : null;
  if (!mapa || !mapa.length) return ['_mapa: falta el mapa de evidencia (por keyword: cita de CONTEXTO_CV y dónde va en la HV)'];
  const context = normText_(contextText).replace(/ /g, '');
  const body = Object.keys(cv).filter(k => /^(PERFIL_PERSONALIZADO|CARGO_EXP_\d+|DESC_EXP_\d+|LOGRO_\d+_\d+)$/.test(k))
    .map(k => String(cv[k] || '')).join(' \n ');
  const errors = [];
  top.forEach(keyword => {
    const entry = mapa.filter(m => normText_(m.keyword) === normText_(keyword))[0];
    if (!entry) { errors.push('_mapa: falta la keyword "' + keyword + '"'); return; }
    if (/^gap$/i.test(String(entry.donde || '').trim())) return;
    const cita = normText_(entry.cita).replace(/ /g, '');
    if (cita.length < 12 || context.indexOf(cita) === -1) {
      errors.push('_mapa: la cita de "' + keyword + '" no está textual en ' + CONFIG.CONTEXT_DOC_NAME + ' (copia la frase tal cual)');
    }
    if (!keywordCovered(keyword, body)) {
      errors.push('Keyword "' + keyword + '" no aparece en el perfil, los cargos, las descripciones ni los logros (solo en habilidades no basta)');
    }
  });
  return errors;
}

/**
 * La HV nunca nombra a la empresa de la vacante (2026-10-24: "helping PadSplit grow" se leía como si ya trabajara
 * allí). Solo el correo de postulación puede nombrarla. No aplica si esa empresa es una experiencia real del candidato.
 */
function targetCompanyErrors(cv, vacancy) {
  const company = String((vacancy && vacancy.company) || '').trim();
  if (company.length < 3 || /^confiden/i.test(company)) return [];
  const pattern = new RegExp('(^|[^\\p{L}\\p{N}])' + escapeRegex_(company) + '($|[^\\p{L}\\p{N}])', 'u');
  const keys = Object.keys(cv).filter(k => CV_META_KEYS_.indexOf(k) === -1 && typeof cv[k] === 'string');
  if (keys.some(k => /^EMPRESA_EXP_/.test(k) && pattern.test(cv[k]))) return [];
  return keys.filter(k => pattern.test(cv[k]))
    .map(k => k + ': nombra a ' + company + ' (la empresa de la vacante); la HV no puede sugerir que ya trabajas allí');
}

/** La vacante pide explícitamente Junior en su cargo: entonces "junior" sí puede ir en la HV y en el archivo. */
function vacancyAllowsJunior(vacancy) {
  return /\b(junior|jr)\b/i.test(String((vacancy && vacancy.title) || ''));
}

/**
 * Palabras prohibidas en la HV (aprendiz, voluntario, practicante, junior, intern, volunteer, DIN'T), sin repetir.
 * Con allowJunior (la vacante dice Junior) "junior"/"jr" sí se permiten.
 */
function forbiddenCvWords(text, allowJunior) {
  return (String(text || '').match(CONFIG.CV_FORBIDDEN_WORDS) || []).map(w => w.toLowerCase())
    .filter(w => !(allowJunior && /^(junior|jr)$/.test(w)))
    .filter((w, i, all) => all.indexOf(w) === i);
}

/**
 * Cargos de la HV (decisión del usuario 2026-10-22): se adaptan a la vacante partiendo del título de LinkedIn, pero no
 * todos iguales. Error si dos experiencias llevan el mismo cargo o si más de una copia literalmente el cargo de la vacante.
 */
function cargoErrors(cv, vacancy) {
  const norm = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const cargos = Object.keys(cv).filter(k => /^CARGO_EXP_\d+$/.test(k) && norm(cv[k])).map(k => ({ key: k, value: norm(cv[k]) }));
  const errors = [];
  cargos.forEach((c, i) => {
    const twin = cargos.slice(0, i).filter(o => o.value === c.value)[0];
    if (twin) errors.push(c.key + ': mismo cargo que ' + twin.key + ' (adapta cada cargo con lógica, no los repitas)');
  });
  const target = norm(vacancy && vacancy.title);
  const copies = target ? cargos.filter(c => c.value === target) : [];
  if (copies.length > 1) {
    errors.push(copies.map(c => c.key).join(', ') + ': copian el cargo de la vacante; solo uno puede llevarlo tal cual');
  }
  return errors;
}

/** Prefijo del archivo según el idioma: HV_ en español, CV_ en inglés (decisión del usuario 2026-10-26). */
function cvFilePrefix(cv) {
  return cv && cv._idioma === 'en' ? CONFIG.CV_FILE_PREFIX_EN : CONFIG.CV_FILE_PREFIX;
}

/**
 * Nombre del CV: HV_Oscar_Garcia_<Cargo> en español y CV_Oscar_Garcia_<Cargo> en inglés (guía 2026-10-22; prefijo por
 * idioma desde 2026-10-26). La IA lo propone en _nombre_archivo; si trae el prefijo del otro idioma se cambia, y si no
 * trae ninguno se usa el prefijo + cargo de la vacante. Nunca lleva el nombre de la empresa, palabras prohibidas (junior
 * solo si la vacante lo pide)
 * ni sufijos como "(3)" (arruinan el adjunto); si el cargo queda vacío se usa CONFIG.CV_DEFAULT_ROLE.
 */
function buildCvFileName(cv, vacancy, label) {
  const allowJunior = vacancyAllowsJunior(vacancy);
  const prefix = cvFilePrefix(cv);
  const clean = t => String(t || '').normalize('NFC').replace(/\(\d+\)/g, ' ')
    .replace(CONFIG.CV_FORBIDDEN_WORDS, w => (allowJunior && /^(junior|jr)$/i.test(w) ? w : ' '))
    .replace(/[\\/:*?"<>|#%]+/g, ' ').trim().replace(/[\s_]+/g, '_').replace(/^_+|_+$/g, '');
  const company = String((vacancy && vacancy.company) || '').trim();
  const withoutCompany = t => company.length >= 3
    ? String(t || '').replace(new RegExp('[\\s_-]*' + escapeRegex_(company).replace(/\s+/g, '[\\s_]+') + '[\\s_-]*', 'gi'), ' ')
    : String(t || '');
  const proposed = clean(withoutCompany(cv._nombre_archivo)).replace(/^(HV|CV)_(?!IA)/, prefix);
  if (proposed.indexOf(prefix) === 0 && proposed.length > prefix.length) return proposed;
  const role = clean(withoutCompany(cleanVacancyTitle(vacancy && vacancy.title) || label)) || clean(CONFIG.CV_DEFAULT_ROLE);
  return prefix + role;
}

/** Un párrafo se elimina si todos sus marcadores quedan vacíos (p. ej. una 4.ª experiencia que no aplica). */
function shouldRemoveParagraph(paragraphText, cv) {
  const text = String(paragraphText);
  const markers = text.match(/\{\{[A-Z0-9_]+\}\}/g);
  // Solo si fuera de los marcadores no queda texto real ("{{CARGO}} | {{EMPRESA}}", "{{CATEGORIA}}: {{DETALLE}}"):
  // un marcador vacío nunca borra una línea con contenido fijo, como la de contacto con {{UBICACION}}
  const rest = text.replace(/\{\{[A-Z0-9_]+\}\}/g, '');
  return !!markers && markers.every(m => cv[m.slice(2, -2)] === '') && !/[\p{L}\p{N}]/u.test(rest);
}

/**
 * Lee los metadatos que createVacancyDetailDoc_ escribe en Detalle_Vacante. El título es la primera línea con texto que
 * no es un campo: DocumentApp.create deja un párrafo vacío antes del encabezado, y con lines[0] el título salía vacío
 * (2026-11-05: el borrador de «Post <autor>» tomó el cargo por defecto). Un "# " de Markdown al inicio se quita.
 */
function parseVacancyDetail(text) {
  const lines = String(text || '').split(/\r?\n/);
  const field = name => {
    const line = lines.find(l => l.indexOf(name + ': ') === 0);
    const value = line ? line.slice(name.length + 2).trim() : '';
    return value && value !== 'N/D' ? value : null;
  };
  const isField = l => /^(Empresa|Ubicación|Link|Publicada|Nivel|Match Score|Idioma|Correo de contacto|Fuente|Tipo|Rol|Aviso empresa|Inglés|Portal oficial): /.test(l);
  const heading = lines.map(l => l.trim()).filter(l => l && !isField(l))[0] || '';
  const title = heading.replace(/^#+\s*/, '').trim();
  // La descripción (para el medidor ATS): lo que sigue a "Descripción completa"; en un Encargo sin ese título, todo
  const start = lines.findIndex(l => /^#*\s*Descripci[oó]n completa\s*$/i.test(l.trim()));
  const description = (start === -1 ? lines.filter(l => !isField(l)) : lines.slice(start + 1)).join('\n').trim();
  return {
    title: title && title !== 'Descripción completa' ? title : null,
    company: field('Empresa'),
    link: field('Link'),
    email: field('Correo de contacto'),
    language: (field('Idioma') || 'es').toLowerCase(),
    description: description,
  };
}

function escapeRegex_(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------- Google Docs / Drive / Sheets ----------

/** Llena la copia de la plantilla: elimina párrafos vacíos, reemplaza marcadores y traduce rótulos. */
function fillCvDocument_(docId, cv) {
  const doc = DocumentApp.openById(docId);
  const sections = [doc.getBody(), doc.getHeader(), doc.getFooter()].filter(Boolean);
  sections.forEach(section => {
    section.getParagraphs().forEach(p => {
      if (!shouldRemoveParagraph(p.getText(), cv)) return;
      try {
        p.removeFromParent();
      } catch (e) {
        p.setText('');  // Docs no permite borrar el último párrafo de una sección o celda
      }
    });
    // Los separadores en blanco que quedan juntos se reducen a uno (antes se borraba el siguiente al párrafo eliminado y,
    // al quitar la cuarta experiencia, desaparecía también el espacio antes de Educación)
    collapseBlankParagraphs_(section);
    removeGapsBetweenBullets_(section);
    Object.keys(cv).forEach(key => {
      if (CV_META_KEYS_.indexOf(key) === -1 && typeof cv[key] === 'string') {
        replaceLiteral_(section, '{{' + key + '}}', cv[key]);
      }
    });
    if (cv._idioma === 'en') {
      Object.keys(TEMPLATE_LABELS_EN_).forEach(es => replaceLiteral_(section, es, TEMPLATE_LABELS_EN_[es]));
    }
  });
  doc.saveAndClose();
}

/** Viñetas seguidas: borra los párrafos en blanco entre dos viñetas (los separadores entre secciones se quedan). */
function collapseBlankParagraphs_(section) {
  const isBlank = el => el && el.getType() === DocumentApp.ElementType.PARAGRAPH && !el.asParagraph().getText().trim();
  for (let i = section.getNumChildren() - 2; i > 0; i--) {
    if (isBlank(section.getChild(i)) && isBlank(section.getChild(i - 1))) section.getChild(i).removeFromParent();
  }
}

function removeGapsBetweenBullets_(section) {
  const isBullet = el => el && el.getType() === DocumentApp.ElementType.LIST_ITEM;
  for (let i = section.getNumChildren() - 2; i > 0; i--) {
    const el = section.getChild(i);
    if (el.getType() === DocumentApp.ElementType.PARAGRAPH && !el.asParagraph().getText().trim() &&
        isBullet(section.getChild(i - 1)) && isBullet(section.getChild(i + 1))) {
      el.removeFromParent();
    }
  }
}

/** Reemplazo literal (sin regex en el reemplazo, así "$" y "\" del texto de la IA se conservan tal cual). */
function replaceLiteral_(section, search, replacement) {
  if (replacement.indexOf(search) !== -1) throw new Error('El reemplazo de ' + search + ' lo contiene a sí mismo');
  const pattern = escapeRegex_(search);
  let found = section.findText(pattern);
  while (found) {
    const text = found.getElement().asText();
    const start = found.getStartOffset();
    const end = found.getEndOffsetInclusive();
    if (replacement) text.insertText(end + 1, replacement);  // insertar antes de borrar conserva el formato
    text.deleteText(start, end);
    found = section.findText(pattern);
  }
}

/** Huellas de las HV recientes (propiedad CV_HISTORY_PROP): `forLabel(carpeta)` para validar, `remember` al armar. */
function cvHistory_() {
  const props = PropertiesService.getScriptProperties();
  const today = Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd');
  const hash = t => Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, t, Utilities.Charset.UTF_8)).slice(0, 8);
  let entries = [];
  try { entries = JSON.parse(props.getProperty(CONFIG.CV_HISTORY_PROP) || '[]'); } catch (e) { entries = []; }
  return {
    forLabel: label => ({ hash: hash, recent: pruneCvHistory(entries, today, label) }),
    remember: (label, cv) => {
      try {
        const fp = cvFingerprint(cv, hash);
        entries = pruneCvHistory(entries, today, label).concat([{ d: today, n: String(label).slice(0, 40), p: fp.p, l: fp.l }]);
        props.setProperty(CONFIG.CV_HISTORY_PROP, JSON.stringify(entries));
      } catch (e) { console.warn('Huellas de HV: ' + e.message); }  // Nunca frena una HV
    },
  };
}

function findDocByName_(name) {
  const files = DriveApp.getFilesByName(name);
  while (files.hasNext()) {
    const file = files.next();
    if (!file.isTrashed() && file.getMimeType() === MimeType.GOOGLE_DOCS) return file;
  }
  return null;
}

/** Texto de un archivo plano o de un Google Doc (el conector de Drive puede guardar el JSON como Doc). */
function readTextFile_(file) {
  if (file.getMimeType() === MimeType.GOOGLE_DOCS) return DocumentApp.openById(file.getId()).getBody().getText();
  return file.getBlob().getDataAsString('UTF-8');
}

/** Ya hay CV en la carpeta: PDF (corridas anteriores) o Google Doc que empiece por CV_ o HV_ (lo deja intacto). */
function hasGeneratedCv_(folder) {
  if (folder.getFilesByType(MimeType.PDF).hasNext()) return true;
  const docs = folder.getFilesByType(MimeType.GOOGLE_DOCS);
  while (docs.hasNext()) {
    const name = docs.next().getName();
    if (name === CONFIG.CV_JSON_NAME) continue;  // El conector de Drive puede guardar CV_IA.json como Doc
    if (name.indexOf('CV_') === 0 || name.indexOf(CONFIG.CV_FILE_PREFIX) === 0) return true;
  }
  return false;
}

/** Texto de un archivo de la carpeta, o '' si no existe. */
function readOptionalText_(folder, name) {
  const file = firstFileByName_(folder, name);
  return file ? readTextFile_(file) : '';
}

function firstFileByName_(folder, name) {
  const files = folder.getFilesByName(name);
  return files.hasNext() ? files.next() : null;
}

function removeFiles_(folder, name) {
  const files = folder.getFilesByName(name);
  while (files.hasNext()) files.next().setTrashed(true);
}

function replaceFile_(folder, name, content) {
  removeFiles_(folder, name);
  folder.createFile(name, content, MimeType.PLAIN_TEXT);
}

/** Cambia el Estado (columna F) de la fila cuyo Link (columna D) coincide. */
function updateVacancyStatus_(sheet, link, status) {
  if (!sheet || !link) return;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  const links = sheet.getRange(2, 4, lastRow - 1, 1).getValues();
  for (let i = links.length - 1; i >= 0; i--) {
    if (links[i][0] === link) {
      sheet.getRange(i + 2, 6).setValue(status);
      return;
    }
  }
}
