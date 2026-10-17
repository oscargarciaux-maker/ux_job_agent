/**
 * Reglas deterministas (0 tokens de LLM): idioma, nivel, Match Score, selección diaria y correo.
 * El contenido del CV lo redacta la IA aplicando GUIA_CV con datos de CONTEXTO_CV (pendiente de conectar).
 */

const ES_WORDS_ = ['el', 'la', 'los', 'las', 'de', 'del', 'y', 'en', 'para', 'con', 'por', 'una', 'un',
  'que', 'experiencia', 'diseñador', 'diseño', 'buscamos', 'empresa', 'conocimientos'];
const EN_WORDS_ = ['the', 'and', 'of', 'to', 'for', 'with', 'in', 'a', 'an', 'we', 'you', 'your',
  'experience', 'designer', 'design', 'looking', 'skills', 'team', 'role'];

const EMAIL_TEMPLATES_ = {
  es: {
    subject: 'Postulación: {cargo} - {empresa}',
    body: 'Hola,\n\nLes escribo para postularme a la vacante de {cargo} en {empresa}. ' +
          'Soy Diseñador Industrial con enfoque en UX/UI, sistemas de diseño e investigación con usuarios.\n\n' +
          'Adjunto mi hoja de vida para su consideración. Quedo atento a cualquier información adicional.\n\n' +
          'Saludos cordiales,',
  },
  en: {
    subject: 'Application: {cargo} - {empresa}',
    body: 'Hello,\n\nI am writing to apply for the {cargo} position at {empresa}. ' +
          'I am an Industrial Designer focused on UX/UI, design systems and user research.\n\n' +
          'Please find my CV attached. I look forward to hearing from you.\n\n' +
          'Best regards,',
  },
};

function vacancyText_(vacancy) {
  return [vacancy.title, vacancy.snippet, vacancy.description].filter(Boolean).join(' ');
}

function fill_(template, values) {
  return template.replace('{empresa}', values.empresa).replace('{cargo}', values.cargo);
}

/** Retorna 'en' o 'es' contando palabras funcionales. Empate -> 'es'. */
function detectLanguage(text) {
  const words = (text || '').toLowerCase().match(/[a-záéíóúñü]+/g) || [];
  let es = 0, en = 0;
  words.forEach(w => {
    if (ES_WORDS_.indexOf(w) !== -1) es++;
    if (EN_WORDS_.indexOf(w) !== -1) en++;
  });
  return en > es ? 'en' : 'es';
}

/** Nivel de la vacante según el cargo (y la descripción para señales de junior). */
function classifySeniority(vacancy) {
  const title = (vacancy.title || '').toLowerCase();
  const text = vacancyText_(vacancy).toLowerCase();
  if (/\b(senior|sr\.?|lead|l[ií]der|staff|principal|head|manager|gerente|director)\b/.test(title)) return 'senior';
  if (/\b(junior|jr\.?|trainee|practicante|pasante|intern|internship|aprendiz|entry)\b/.test(title)) return 'junior';
  if (/\b(junior|trainee|practicante|pasante|sin experiencia|reci[eé]n egresado|entry[- ]level)\b|\b[01]\s*(?:-|a)\s*2\s*(años|years)/.test(text)) return 'junior';
  return 'mid';
}

/** Match Score determinista: nivel (Junior 100 / Mid 80 / Senior 60) promediado con ubicación. */
function computeMatchScore(vacancy) {
  const seniority = { junior: 100, mid: 80, senior: 60 }[classifySeniority(vacancy)];
  const text = (vacancyText_(vacancy) + ' ' + (vacancy.location || '')).toLowerCase();
  const location = /(bogot[aá]|medell[ií]n|remoto|remote|teletrabajo|híbrido|hybrid)/.test(text) ? 100 : 60;
  return Math.round((seniority + location) / 2);
}

/**
 * Selección diaria: reserva al menos minJunior cupos para vacantes Junior (si existen)
 * y completa el resto con las de mayor score de cualquier nivel.
 */
function selectDailyVacancies(scored, limit, minJunior) {
  const byScore = scored.slice().sort((a, b) => b.score - a.score);
  const picked = byScore.filter(x => x.seniority === 'junior').slice(0, minJunior);
  byScore.forEach(x => { if (picked.length < limit && picked.indexOf(x) === -1) picked.push(x); });
  return picked.sort((a, b) => b.score - a.score).slice(0, limit);
}

function buildApplicationEmail(vacancy, language) {
  const lang = language === 'en' ? 'en' : 'es';
  const values = {
    cargo: vacancy.title || 'UX/UI Designer Junior',
    empresa: vacancy.company || (lang === 'en' ? 'your company' : 'su empresa'),
  };
  return {
    subject: fill_(EMAIL_TEMPLATES_[lang].subject, values),
    body: fill_(EMAIL_TEMPLATES_[lang].body, values),
  };
}

/** Correo directo del reclutador: campo explícito o primer email en el texto de la oferta. */
function extractContactEmail(vacancy) {
  if (vacancy.contactEmail) return vacancy.contactEmail;
  const match = vacancyText_(vacancy).match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  return match ? match[0] : null;
}
