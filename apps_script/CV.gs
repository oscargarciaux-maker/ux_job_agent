/**
 * Fase 3: CV & PDF a partir del CV_IA.json que deja la IA en cada carpeta de vacante.
 * Contrato: una clave por marcador de MASTER_TEMPLATE (sin llaves; "" = eliminar ese elemento)
 * + metadatos _idioma ('es'/'en'), _keywords, _gaps, _correo_cuerpo.
 */

const CV_JSON_NAME_ = 'CV_IA.json';
const CONTEXT_DOC_NAME_ = 'CONTEXTO_CV';

// Rótulos fijos de MASTER_TEMPLATE que se traducen cuando la vacante está en inglés
const TEMPLATE_LABELS_EN_ = {
  'Herramientas:': 'Tools:',
  'Competencias Blandas:': 'Soft Skills:',
  'Idiomas:': 'Languages:',
  'Abierto a relocalización / Remoto': 'Open to relocation / Remote',
};

/** Activador ~10:00: llena MASTER_TEMPLATE con cada CV_IA.json de hoy, exporta PDF y crea el borrador. */
function generarCVsDesdeIA() {
  console.log('--- Generando CVs desde CV_IA.json ---');
  const root = DriveApp.getFolderById(getProp_(PROPS.ROOT_FOLDER_ID));
  const today = Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd');
  const dateFolders = root.getFoldersByName(today);
  if (!dateFolders.hasNext()) {
    console.log('No hay carpeta de hoy (' + today + ').');
    return;
  }

  const template = getTemplateFile_();
  const placeholders = listPlaceholders_(template.getId()).map(p => p.slice(2, -2));
  const context = readContextText_();
  const sheet = getRegistrySheet_();

  const folders = dateFolders.next().getFolders();
  while (folders.hasNext()) {
    const folder = folders.next();
    const name = folder.getName();
    try {
      if (folder.getFilesByType(MimeType.PDF).hasNext()) continue;   // Ya procesada
      const jsonFiles = folder.getFilesByName(CV_JSON_NAME_);
      if (!jsonFiles.hasNext()) continue;                             // La IA aún no la procesa
      const detail = parseVacancyDetail(readDocText_(folder, 'Detalle_Vacante'));

      const data = parseCvJson(readFileText_(jsonFiles.next()));
      const check = validateCvJson(data, placeholders, context);
      if (!check.ok) {
        console.warn(name + ' -> CV_IA.json RECHAZADO: ' + check.errors.join(' | '));
        setVacancyStatus_(sheet, detail.link, 'CV rechazado (IA): ' + check.errors.join(' | ').slice(0, 300));
        continue;
      }

      const pdf = buildCvPdf_(template, folder, data, detail);
      let status = 'Pendiente';
      if (detail.email) {
        const email = buildApplicationEmail({ title: detail.title, company: detail.company }, data._idioma);
        createApplicationDraft_(detail.email, email.subject, data._correo_cuerpo || email.body, pdf);
        status = 'Pendiente (borrador listo)';
      }
      setVacancyStatus_(sheet, detail.link, status);
      console.log(name + ' -> CV, PDF' + (detail.email ? ' y borrador' : '') + ' OK');
    } catch (e) {
      console.error(name + ' -> ERROR: ' + e.message);
    }
  }
  console.log('--- Generación de CVs finalizada ---');
}

// ---------- Lógica pura (probada en tests/apps_script.test.js) ----------

/** JSON de la IA, tolerando un bloque ```json ... ``` alrededor. */
function parseCvJson(text) {
  const clean = (text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return JSON.parse(clean);
}

/** Metadatos de Detalle_Vacante (líneas "Clave: valor" que escribe createVacancyDetailDoc_). */
function parseVacancyDetail(text) {
  const lines = (text || '').split('\n');
  const field = label => {
    const line = lines.filter(l => l.indexOf(label + ': ') === 0)[0];
    const value = line ? line.slice(label.length + 2).trim() : '';
    return value === 'N/D' ? '' : value;
  };
  return {
    title: (lines[0] || '').trim(),
    company: field('Empresa'),
    link: field('Link'),
    email: field('Correo de contacto'),
  };
}

/** Cifras de un texto normalizadas (sin separadores de miles/decimales) para comparar con CONTEXTO_CV. */
function extractNumbers(text) {
  return ((text || '').match(/\d+(?:[.,]\d+)*/g) || []).map(n => n.replace(/[.,]/g, ''));
}

function normalize_(text) {
  return (text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Valida el contrato y la regla anti-alucinación:
 * - todos los marcadores de la plantilla presentes y como texto; _idioma 'es' o 'en';
 * - toda cifra (números, %, $) y todo valor de un marcador de EMPRESA debe aparecer en CONTEXTO_CV.
 */
function validateCvJson(data, placeholders, contextText) {
  const errors = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, errors: ['no es un objeto JSON'] };
  if (data._idioma !== 'es' && data._idioma !== 'en') errors.push('_idioma debe ser "es" o "en"');

  const missing = placeholders.filter(p => typeof data[p] !== 'string');
  if (missing.length) errors.push('faltan marcadores o no son texto: ' + missing.join(', '));

  const contextNumbers = {};
  extractNumbers(contextText).forEach(n => { contextNumbers[n] = true; });
  const context = normalize_(contextText);
  const texts = Object.keys(data).filter(k => k.charAt(0) !== '_' && typeof data[k] === 'string').map(k => data[k]);
  if (typeof data._correo_cuerpo === 'string') texts.push(data._correo_cuerpo);

  const invented = extractNumbers(texts.join('\n')).filter(n => !contextNumbers[n]);
  if (invented.length) {
    errors.push('cifras que no están en CONTEXTO_CV: ' + invented.filter((n, i, all) => all.indexOf(n) === i).join(', '));
  }
  Object.keys(data)
    .filter(k => /EMPRESA/.test(k) && typeof data[k] === 'string' && data[k].trim())
    .filter(k => context.indexOf(normalize_(data[k])) === -1)
    .forEach(k => errors.push('empresa que no está en CONTEXTO_CV: ' + k + ' = "' + data[k] + '"'));

  return { ok: errors.length === 0, errors: errors };
}

/** Texto que queda en un párrafo tras vaciar marcadores: si solo hay separadores, el párrafo se elimina. */
function isBlankAfterRemoval(text) {
  return !(text || '').replace(/[\s\-–—|•·,;:/()]+/g, '');
}

// ---------- Google Drive / Docs ----------

function readFileText_(file) {
  if (file.getMimeType() === MimeType.GOOGLE_DOCS) return DocumentApp.openById(file.getId()).getBody().getText();
  return file.getBlob().getDataAsString('UTF-8');
}

function readDocText_(folder, name) {
  const files = folder.getFilesByName(name);
  if (!files.hasNext()) throw new Error('falta ' + name + ' en la carpeta');
  return readFileText_(files.next());
}

/** CONTEXTO_CV: Google Doc privado del usuario (buscado por nombre en todo el Drive). */
function readContextText_() {
  const files = DriveApp.getFilesByName(CONTEXT_DOC_NAME_);
  while (files.hasNext()) {
    const file = files.next();
    if (!file.isTrashed() && file.getMimeType() === MimeType.GOOGLE_DOCS) {
      const doc = DocumentApp.openById(file.getId());
      return [doc.getBody(), doc.getHeader(), doc.getFooter()].filter(Boolean).map(s => s.getText()).join('\n');
    }
  }
  throw new Error('No se encontró el Google Doc ' + CONTEXT_DOC_NAME_ + ' (necesario para validar el CV de la IA).');
}

/** Copia MASTER_TEMPLATE en la carpeta, la llena y devuelve el PDF (también guardado en la carpeta). */
function buildCvPdf_(template, folder, data, detail) {
  const base = ('CV_' + (detail.company || 'Empresa')).replace(/[\/\\]/g, '_');
  const copy = template.makeCopy(base, folder);
  const doc = DocumentApp.openById(copy.getId());
  const sections = [doc.getBody(), doc.getHeader(), doc.getFooter()].filter(Boolean);

  const emptyParagraphs = [];
  Object.keys(data).filter(k => k.charAt(0) !== '_' && typeof data[k] === 'string').forEach(key => {
    sections.forEach(section => {
      replaceLiteral_(section, '{{' + key + '}}', data[key].trim(), data[key].trim() ? null : emptyParagraphs);
    });
  });
  // Elementos cuyo contenido era solo marcadores vacíos (p. ej. una 4.ª experiencia o un 3.er logro)
  emptyParagraphs.forEach(p => {
    if (!isBlankAfterRemoval(p.getText())) return;
    try { p.removeFromParent(); } catch (e) { p.setText(''); }   // El último párrafo de una sección no se puede borrar
  });
  if (data._idioma === 'en') {
    Object.keys(TEMPLATE_LABELS_EN_).forEach(label => {
      sections.forEach(section => replaceLiteral_(section, label, TEMPLATE_LABELS_EN_[label], null));
    });
  }
  doc.saveAndClose();

  const pdf = copy.getAs(MimeType.PDF).setName(base + '.pdf');
  folder.createFile(pdf);
  return pdf;
}

function escapeRegex_(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Reemplazo LITERAL (replaceText usa regex y trata "$" de forma especial): busca, borra e inserta,
 * conservando el formato del texto original. Si collect es un arreglo, guarda los párrafos tocados.
 */
function replaceLiteral_(section, search, replacement, collect) {
  const pattern = escapeRegex_(search);
  let found = section.findText(pattern);
  while (found) {
    const text = found.getElement().asText();
    const start = found.getStartOffset();
    const attrs = text.getAttributes(start);
    Object.keys(attrs).forEach(k => { if (attrs[k] === null) delete attrs[k]; });
    text.deleteText(start, found.getEndOffsetInclusive());
    if (replacement) {
      text.insertText(start, replacement);
      text.setAttributes(start, start + replacement.length - 1, attrs);
    }
    if (collect) {
      let parent = found.getElement().getParent();
      while (parent && parent.getType() !== DocumentApp.ElementType.PARAGRAPH &&
             parent.getType() !== DocumentApp.ElementType.LIST_ITEM) parent = parent.getParent();
      if (parent && collect.indexOf(parent) === -1) collect.push(parent);
    }
    found = section.findText(pattern);
  }
}

// ---------- Google Sheets ----------

/** Cambia la columna Estado de la fila cuyo Link (columna D) coincide. */
function setVacancyStatus_(sheet, link, status) {
  if (!link) return;
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
