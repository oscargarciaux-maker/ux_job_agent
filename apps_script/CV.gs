/**
 * Fase 3: arma el CV a partir de CV_IA.json (redactado por la IA) sobre MASTER_TEMPLATE, exporta el PDF (si CV_EXPORT_PDF)
 * y crea el borrador de Gmail. Se ejecuta solo a las CONFIG.CV_HOUR (después del paso de IA).
 * Contrato CV_IA.json: una clave por marcador de MASTER_TEMPLATE (sin llaves; "" = eliminar ese párrafo)
 * + metadatos _idioma ('es'/'en'), _keywords, _gaps y _correo_cuerpo.
 */

const CV_META_KEYS_ = ['_idioma', '_keywords', '_gaps', '_correo_cuerpo', '_nombre_archivo'];

// Rótulos fijos de MASTER_TEMPLATE que se traducen cuando la vacante está en inglés.
const TEMPLATE_LABELS_EN_ = {
  'Herramientas:': 'Tools:',
  'Competencias Blandas:': 'Soft Skills:',
  'Idiomas:': 'Languages:',
  'Abierto a relocalización / Remoto': 'Open to relocation / Remote',
};

/** Para cada carpeta de hoy con CV_IA.json y sin CV generado: valida, llena la plantilla, PDF (si está activo), borrador y registro. */
function generarCVsDesdeIA() {
  const root = DriveApp.getFolderById(getProp_(PROPS.ROOT_FOLDER_ID));
  const today = Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd');
  const dateFolders = root.getFoldersByName(today);
  if (!dateFolders.hasNext()) {
    console.log('No hay carpeta de vacantes para ' + today + '.');
    return;
  }
  buildCvsInFolder_(dateFolders.next(), getRegistrySheet_());
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
  const contextDoc = findDocByName_(CONFIG.CONTEXT_DOC_NAME);
  if (!contextDoc) throw new Error('No se encontró el Google Doc ' + CONFIG.CONTEXT_DOC_NAME + ' (necesario para validar).');
  const contextText = DocumentApp.openById(contextDoc.getId()).getBody().getText();
  const template = getTemplateFile_();
  const placeholders = listPlaceholders_(template.getId()).map(p => p.slice(2, -2));

  const folders = dateFolder.getFolders();
  while (folders.hasNext()) {
    const folder = folders.next();
    const label = folder.getName();
    try {
      const jsonFile = firstFileByName_(folder, CONFIG.CV_JSON_NAME);
      if (!jsonFile) continue;
      if (hasGeneratedCv_(folder)) {
        console.log(label + ' -> ya tiene CV generado, se omite');
        continue;
      }
      const detailFile = firstFileByName_(folder, 'Detalle_Vacante');
      const vacancy = parseVacancyDetail(detailFile ? DocumentApp.openById(detailFile.getId()).getBody().getText() : '');

      let cv;
      let check;
      try {
        cv = parseCvJson(readTextFile_(jsonFile));
        check = validateCvJson(cv, contextText, placeholders, vacancy);
      } catch (e) {
        check = { errors: [e.message], warnings: [] };
      }
      check.warnings.forEach(w => console.warn(label + ' -> aviso: ' + w));
      if (check.errors.length) {
        replaceFile_(folder, CONFIG.CV_ERRORS_NAME, check.errors.join('\n'));
        updateVacancyStatus_(sheet, vacancy.link, 'CV rechazado (validación)');
        console.error(label + ' -> CV_IA.json rechazado:\n  ' + check.errors.join('\n  '));
        continue;
      }

      const cvName = buildCvFileName(cv, vacancy, label);
      const copy = template.makeCopy(cvName, folder);
      fillCvDocument_(copy.getId(), cv);
      const pdf = CONFIG.CV_EXPORT_PDF ? folder.createFile(copy.getAs(MimeType.PDF).setName(cvName + '.pdf')) : null;
      removeFiles_(folder, CONFIG.CV_ERRORS_NAME);

      let draftNote = 'sin correo directo';
      if (vacancy.email && cv._correo_cuerpo) {
        const subject = buildApplicationEmail(vacancy, cv._idioma).subject;
        createApplicationDraft_(vacancy.email, subject, cv._correo_cuerpo, pdf ? pdf.getBlob() : null);  // Sin PDF: el usuario lo adjunta
        draftNote = 'borrador para ' + vacancy.email;
      }
      updateVacancyStatus_(sheet, vacancy.link, 'Pendiente');
      console.log(label + ' -> ' + cvName + (pdf ? ' (Doc + PDF)' : ' (Google Doc)') + ' y ' + draftNote + ' OK');
    } catch (e) {
      console.error(label + ' -> ERROR: ' + e.message);
    }
  }
  console.log('--- Generación de CVs finalizada ---');
}

// ---------- Lógica pura (probada en tests/apps_script.test.js) ----------

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
 * Valida el contrato y la regla anti-alucinación: toda cifra y toda empresa del CV/correo
 * debe aparecer en CONTEXTO_CV. Devuelve { errors, warnings }.
 */
function validateCvJson(cv, contextText, placeholders, vacancy) {
  const allowJunior = vacancyAllowsJunior(vacancy);
  const errors = [];
  const warnings = [];
  if (cv._idioma !== 'es' && cv._idioma !== 'en') errors.push('_idioma debe ser "es" o "en"');

  placeholders.forEach(p => {
    if (!(p in cv)) errors.push('Falta el marcador ' + p + ' (usa "" para eliminarlo)');
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
  return { errors: errors.filter((e, i, all) => all.indexOf(e) === i), warnings: warnings };
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

/**
 * Nombre del CV: HV_Oscar_Garcia_<Cargo> (guía 2026-10-22). La IA lo propone en _nombre_archivo; si falta o no empieza
 * por HV_, se usa HV_ + cargo de la vacante. Nunca lleva el nombre de la empresa, palabras prohibidas (junior solo si la
 * vacante lo pide)
 * ni sufijos como "(3)" (arruinan el adjunto); si el cargo queda vacío se usa CONFIG.CV_DEFAULT_ROLE.
 */
function buildCvFileName(cv, vacancy, label) {
  const allowJunior = vacancyAllowsJunior(vacancy);
  const clean = t => String(t || '').normalize('NFC').replace(/\(\d+\)/g, ' ')
    .replace(CONFIG.CV_FORBIDDEN_WORDS, w => (allowJunior && /^(junior|jr)$/i.test(w) ? w : ' '))
    .replace(/[\\/:*?"<>|#%]+/g, ' ').trim().replace(/[\s_]+/g, '_').replace(/^_+|_+$/g, '');
  const company = String((vacancy && vacancy.company) || '').trim();
  const withoutCompany = t => company.length >= 3
    ? String(t || '').replace(new RegExp('[\\s_-]*' + escapeRegex_(company).replace(/\s+/g, '[\\s_]+') + '[\\s_-]*', 'gi'), ' ')
    : String(t || '');
  const proposed = clean(withoutCompany(cv._nombre_archivo));
  if (proposed.indexOf(CONFIG.CV_FILE_PREFIX) === 0 && proposed.length > CONFIG.CV_FILE_PREFIX.length) return proposed;
  const role = clean(withoutCompany((vacancy && vacancy.title) || label)) || clean(CONFIG.CV_DEFAULT_ROLE);
  return CONFIG.CV_FILE_PREFIX + role;
}

/** Un párrafo se elimina si todos sus marcadores quedan vacíos (p. ej. una 4.ª experiencia que no aplica). */
function shouldRemoveParagraph(paragraphText, cv) {
  const markers = String(paragraphText).match(/\{\{[A-Z0-9_]+\}\}/g);
  return !!markers && markers.every(m => cv[m.slice(2, -2)] === '');
}

/** Lee los metadatos que createVacancyDetailDoc_ escribe en Detalle_Vacante. */
function parseVacancyDetail(text) {
  const lines = String(text || '').split(/\r?\n/);
  const field = name => {
    const line = lines.find(l => l.indexOf(name + ': ') === 0);
    const value = line ? line.slice(name.length + 2).trim() : '';
    return value && value !== 'N/D' ? value : null;
  };
  return {
    title: (lines[0] || '').trim() || null,
    company: field('Empresa'),
    link: field('Link'),
    email: field('Correo de contacto'),
    language: (field('Idioma') || 'es').toLowerCase(),
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
      // También el párrafo en blanco que lo separa del siguiente, para no dejar huecos en el CV
      const next = p.getNextSibling();
      if (next && next.getType() === DocumentApp.ElementType.PARAGRAPH && !next.asParagraph().getText().trim()) {
        next.removeFromParent();
      }
      try {
        p.removeFromParent();
      } catch (e) {
        p.setText('');  // Docs no permite borrar el último párrafo de una sección o celda
      }
    });
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
