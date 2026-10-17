/**
 * Motor de personalización determinista (0 tokens de LLM).
 * Anti-alucinación: solo usa datos de la vacante y del perfil maestro (CLAUDE.md).
 */

const ES_WORDS_ = ['el', 'la', 'los', 'las', 'de', 'del', 'y', 'en', 'para', 'con', 'por', 'una', 'un',
  'que', 'experiencia', 'diseñador', 'diseño', 'buscamos', 'empresa', 'conocimientos'];
const EN_WORDS_ = ['the', 'and', 'of', 'to', 'for', 'with', 'in', 'a', 'an', 'we', 'you', 'your',
  'experience', 'designer', 'design', 'looking', 'skills', 'team', 'role'];

// Áreas de enfoque respaldadas por el perfil. No se agregan habilidades fuera de esta lista.
const FOCUS_AREAS_ = [
  { keywords: ['design system', 'sistema de diseño', 'sistemas de diseño', 'componentes', 'components', 'ui kit'],
    es: 'Sistemas de diseño', en: 'Design systems' },
  { keywords: ['ux', 'experiencia de usuario', 'user experience', 'usabilidad', 'usability', 'flujos', 'flows'],
    es: 'Toma de decisiones UX', en: 'UX decision-making' },
  { keywords: ['research', 'investigación', 'entrevistas', 'interviews', 'testing', 'pruebas con usuarios'],
    es: 'UX Research', en: 'UX Research' },
];

const SUMMARY_ = {
  es: 'Diseñador Industrial con enfoque en UX/UI, interesado en aportar a {empresa} como {cargo}. ' +
      'Mi formación en diseño industrial me da bases sólidas en metodología centrada en el usuario, ' +
      'prototipado e iteración, que aplico a sistemas de diseño, decisiones UX e investigación con usuarios. ' +
      'Aprendo rápido nuevas herramientas y procesos.',
  en: 'Industrial Designer focused on UX/UI, interested in joining {empresa} as {cargo}. ' +
      'My industrial design background gives me a user-centered methodology, prototyping and iteration ' +
      'skills, which I apply to design systems, UX decisions and user research. ' +
      'I learn new tools and processes quickly.',
};

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

/** Match Score determinista: seniority (Junior 100 / Mid 70 / Senior 30) + ubicación. */
function computeMatchScore(vacancy) {
  const text = vacancyText_(vacancy).toLowerCase();
  let seniority = 70;
  if (/\b(senior|sr\.?|lead|líder|head|manager)\b/.test(text)) seniority = 30;
  else if (/\b(junior|jr\.?|trainee|practicante|pasante|intern|entry)\b/.test(text)) seniority = 100;
  const location = /(bogot[aá]|medell[ií]n|remoto|remote)/.test(text) ? 100 : 50;
  return Math.round((seniority + location) / 2);
}

function buildCvReplacements(vacancy, language) {
  const empresa = vacancy.company || (language === 'en' ? 'the company' : 'la empresa');
  const cargo = vacancy.title || 'UX/UI Designer Junior';
  const haystack = vacancyText_(vacancy).toLowerCase();
  const matched = FOCUS_AREAS_.filter(a => a.keywords.some(k => haystack.indexOf(k) !== -1));
  const focus = (matched.length ? matched : FOCUS_AREAS_).map(a => a[language]);
  return {
    EMPRESA: empresa,
    CARGO: cargo,
    RESUMEN: fill_(SUMMARY_[language], { empresa: empresa, cargo: cargo }),
    ENFOQUE: focus.join(' · '),
  };
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
