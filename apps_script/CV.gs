/**
 * Fase 3: arma el CV a partir de CV_IA.json (redactado por la IA) sobre MASTER_TEMPLATE, exporta el PDF
 * y crea el borrador de Gmail. Se ejecuta solo a las CONFIG.CV_HOUR (después del paso de IA).
 * Contrato CV_IA.json: una clave por marcador de MASTER_TEMPLATE (sin llaves; "" = eliminar ese párrafo)
 * + metadatos _idioma ('es'/'en'), _keywords, _gaps y _correo_cuerpo.
 */

const CV_META_KEYS_ = ['_idioma', '_keywords', '_gaps', '_correo_cuerpo'];

// Rótulos fijos de MASTER_TEMPLATE que se traducen cuando la vacante está en inglés.
const TEMPLATE_LABELS_EN_ = {
  'Herramientas:': 'Tools:',
  'Competencias Blandas:': 'Soft Skills:',
  'Idiomas:': 'Languages:',
  'Abierto a relocalización / Remoto': 'Open to relocation / Remote',
};

/** Para cada carpeta de hoy con CV_IA.json y sin PDF: valida, llena la plantilla, PDF, borrador y registro. */
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
      if (folder.getFilesByType(MimeType.PDF).hasNext()) {
        console.log(label + ' -> ya tiene PDF, se omite');
        continue;
      }
      const detailFile = firstFileByName_(folder, 'Detalle_Vacante');
      const vacancy = parseVacancyDetail(detailFile ? DocumentApp.openById(detailFile.getId()).getBody().getText() : '');

      let cv;
      let check;
      try {
        cv = parseCvJson(readTextFile_(jsonFile));
        check = validateCvJson(cv, contextText, placeholders);
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

      const cvName = 'CV_' + label;
      const copy = template.makeCopy(cvName, folder);
      fillCvDocument_(copy.getId(), cv);
      const pdf = folder.createFile(copy.getAs(MimeType.PDF).setName(cvName + '.pdf'));
      removeFiles_(folder, CONFIG.CV_ERRORS_NAME);

      let draftNote = 'sin correo directo';
      if (vacancy.email && cv._correo_cuerpo) {
        const subject = buildApplicationEmail(vacancy, cv._idioma).subject;
        createApplicationDraft_(vacancy.email, subject, cv._correo_cuerpo, pdf.getBlob());
        draftNote = 'borrador para ' + vacancy.email;
      }
      updateVacancyStatus_(sheet, vacancy.link, 'Pendiente');
      console.log(label + ' -> CV, PDF y ' + draftNote + ' OK');
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
function validateCvJson(cv, contextText, placeholders) {
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
  });
  return { errors: errors.filter((e, i, all) => all.indexOf(e) === i), warnings: warnings };
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
