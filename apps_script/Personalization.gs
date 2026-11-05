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
    subjectNoCompany: 'Postulación: {cargo}',
    body: 'Hola,\n\nLes escribo para postularme a la vacante de {cargo} en {empresa}. ' +
          'Soy Diseñador Industrial con enfoque en UX/UI, sistemas de diseño e investigación con usuarios.\n\n' +
          'Adjunto mi hoja de vida para su consideración. Quedo atento a cualquier información adicional.\n\n' +
          'Saludos cordiales,',
  },
  en: {
    subject: 'Application: {cargo} - {empresa}',
    subjectNoCompany: 'Application: {cargo}',
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
  const years = requiredYears(vacancy);
  if (/\b(senior|sr\.?|lead|l[ií]der|staff|principal|head|manager|gerente|director)\b/.test(title)) {
    return years !== null && years < CONFIG.EXPERIENCE_YEARS_LIMIT ? 'mid' : 'senior';  // "Senior" con < 5 años sí aplica
  }
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

/** Prioridad para elegir las 10 del día: Match Score + fuente (LinkedIn > Indeed > Computrabajo) + fintech. */
function computePriority(vacancy, score) {
  const fintech = CONFIG.FINTECH_PATTERN.test(vacancyText_(vacancy) + ' ' + (vacancy.company || '')) ? CONFIG.FINTECH_BONUS : 0;
  const years = requiredYears(vacancy);
  const tooMuch = years !== null && years >= CONFIG.EXPERIENCE_YEARS_LIMIT ? CONFIG.EXPERIENCE_PENALTY : 0;
  // 7+ años profesionales: candidatura remota, sin desplazar a junior/mid.
  const verySenior = years !== null && years >= CONFIG.VERY_SENIOR_YEARS ? CONFIG.VERY_SENIOR_PENALTY : 0;
  const verify = vacancy.roleToVerify ? CONFIG.ROLE_VERIFY_PENALTY : 0;
  const english = englishFluent(vacancy) ? CONFIG.ENGLISH_FLUENT_PENALTY
                : englishAdvanced(vacancy) ? CONFIG.ENGLISH_ADVANCED_PENALTY : 0;
  // Decisión del usuario 2026-11-02: casi no llegaban vacantes en español (3 de 7 HV) y Himalayas trajo 5 de 6 dudosas
  // y 2 avisos expirados: el español sube y Himalayas baja al elegir las candidatas del día.
  const spanish = isSpanishVacancy(vacancy) ? CONFIG.SPANISH_BONUS : 0;
  const himalayas = CONFIG.LOW_TRUST_SOURCE_PATTERN.test(String(vacancy.link || '')) ? CONFIG.LOW_TRUST_SOURCE_PENALTY : 0;
  return score + (vacancy.sourceBonus || 0) + fintech + spanish - tooMuch - verySenior - verify - english - himalayas;
}

/** Aviso escrito en español: más palabras funcionales en español que en inglés, y al menos 3 (un título suelto no decide). */
function isSpanishVacancy(vacancy) {
  const words = (String(vacancy.title || '') + ' ' + String(vacancy.description || '')).toLowerCase().match(/[a-záéíóúñü]+/g) || [];
  let es = 0, en = 0;
  words.forEach(w => {
    if (ES_WORDS_.indexOf(w) !== -1) es++;
    if (EN_WORDS_.indexOf(w) !== -1) en++;
  });
  return es >= 3 && es > en;
}

/** Pide inglés "fluido", "fluent" o "bilingüe" (2026-10-28: menor prioridad, ya no descarte). */
function englishFluent(vacancy) {
  return CONFIG.ENGLISH_FLUENT_PATTERN.test(vacancyText_(vacancy));
}

/** Nota de inglés para Notas de Hoja 1 y la pestaña "Calidad por fuente": "Inglés fluido", "Inglés avanzado" o "". */
function englishNote(vacancy) {
  return englishFluent(vacancy) ? 'Inglés fluido' : englishAdvanced(vacancy) ? 'Inglés avanzado' : '';
}

/** Pide inglés "avanzado", "alto" o "excelente" sin nativo/C1 ni un B1/B2 explícito: menor prioridad. */
function englishAdvanced(vacancy) {
  const text = vacancyText_(vacancy);
  return CONFIG.ENGLISH_ADVANCED_PATTERN.test(text) && !CONFIG.ENGLISH_ADVANCED_UNLESS.test(text);
}

/**
 * Años mínimos de experiencia que pide la vacante ("3+ years", "Entre 2 y 5 años", "mínimo 4 años de experiencia").
 * Solo cuenta números cerca de "experiencia/experience" (así "15 años en el mercado" de la empresa no cuenta).
 * Devuelve el menor mínimo encontrado o null.
 */
function requiredYears(vacancy) {
  const text = vacancyText_(vacancy);
  const re = /(\d{1,2})\s*\+?\s*(?:(?:-|–|a|to|y|and)\s*\d{1,2}\s*)?(?:años|anos|years|yrs)/gi;
  let m, best = null;
  while ((m = re.exec(text))) {
    const around = text.slice(Math.max(0, m.index - 80), m.index + m[0].length + 80);
    if (!/experienc|experiencia/i.test(around)) continue;
    const n = parseInt(m[1], 10);
    if (n <= 20 && (best === null || n < best)) best = n;
  }
  return best;
}

/** Motivo para descartar la vacante por su texto (CONFIG.EXCLUDED_VACANCY_RULES) o null. */
function exclusionReason(vacancy) {
  const text = vacancyText_(vacancy) + ' ' + (vacancy.company || '');
  const rule = CONFIG.EXCLUDED_VACANCY_RULES.filter(r => r.pattern.test(text) && !(r.unless && r.unless.test(text)))[0];
  if (rule) return rule.reason;
  // Solo para otro país (28 oct 2026: 7 de 14 descartes del día eran de Costa Rica, Brasil, Ecuador o Perú y gastaban
  // verificación de la IA): se decide aquí, sin tokens
  const foreign = foreignOnlyLocation(vacancy);
  if (foreign) return 'solo para ' + foreign + ' (no dice Colombia ni remoto LATAM)';
  // En el título basta con nombrarlo (27 oct 2026: "Diseñador/a de Experiencia de Cliente para personas con Discapacidad")
  if (CONFIG.DISABILITY_TITLE_PATTERN.test(vacancy.title || '')) return 'exclusiva para personas con discapacidad';
  // Hay empresas que publican «UX Designer» pero en la descripción piden explícitamente un Principal/Staff:
  // ejemplo real, GraceMark Solutions, 2026-11-05. No penalizar la sola mención de colaboradores senior.
  if (hiddenPrincipalRole_(vacancy)) return 'cargo principal/staff oculto en la descripción';
  const mismatch = explicitHardMismatch_(vacancy);
  if (mismatch) return mismatch;
  // Cargos de liderazgo muy por encima de junior (Senior sí entra, con la regla de años)
  return CONFIG.EXCLUDED_TITLE_PATTERN.test(vacancy.title || '') ? 'cargo de liderazgo (staff/principal/head/director/manager)' : null;
}

/** Requisitos obligatorios incompatibles y claros: evita gastar verificación de IA.
 * No descartar por simples menciones en la descripción o habilidades deseables.
 */
function explicitHardMismatch_(vacancy) {
  const d = String((vacancy || {}).description || '');
  if (/\b(?:[4-9]|1[0-9])\s*\+?\s*(?:years|yrs|años)\s+of\s+experience\s+(?:working\s+)?as\s+(?:a\s+)?(?:software\s+)?developer\b/i.test(d) ||
      /\b(?:[4-9]|1[0-9])\s*\+?\s*(?:years|yrs|años)\s+(?:de\s+)?experiencia\s+como\s+desarrollador\b/i.test(d))
    return 'exige trayectoria profesional de desarrollador de software';
  if (/\b(?:required|requirements|must\s+have|obligatori[oa])\b[\s\S]{0,160}\bconnected[- ]hardware\b/i.test(d) &&
      /\bshipped\s+connected[- ]product\s+work\b/i.test(d))
    return 'exige productos de hardware conectado lanzados, experiencia no acreditada';
  return null;
}

/** Detecta un cargo Principal/Staff que no aparece en el título del agregador; evita falsos «mid». */
function hiddenPrincipalRole_(vacancy) {
  const description = String((vacancy || {}).description || '');
  return /\b(?:we(?:'re| are) seeking|we(?:'re| are) hiring|looking for|buscamos|seeking)\b[^.\n]{0,95}\b(?:principal|staff)\s+(?:\w+\s+){0,3}(?:designer|dise[nñ]ador)\b/i.test(description) ||
         /\b(?:principal|staff)[- ]level\s+(?:ownership|execution|impact)\b/i.test(description);
}

/**
 * El país de otro lugar si el título o la ubicación de la vacante nombran solo un sitio fuera de Colombia, sin Colombia,
 * LATAM, «anywhere» ni zona horaria de la región. Solo mira el título y el campo de ubicación (la descripción nombra países
 * por muchas razones); sin ubicación no decide nada. Devuelve '' si la vacante puede servir.
 */
function foreignOnlyLocation(vacancy) {
  const check = text => {
    const t = String(text || '');
    if (!t.trim() || CONFIG.OPEN_TO_COLOMBIA_PATTERN.test(t)) return '';
    const m = CONFIG.FOREIGN_LOCATION_PATTERN.exec(t);
    return m ? m[0] : '';
  };
  return check(vacancy.title) || check(vacancy.location);
}

/** Palabras del cargo comparables entre idiomas, sin nivel, modalidad ni conectores. */
function roleTokens_(title) {
  const synonyms = { 'disenador': 'designer', 'disenadora': 'designer', 'diseno': 'design', 'producto': 'product',
                     'investigador': 'researcher', 'investigacion': 'research', 'sistemas': 'system', 'systems': 'system' };
  return String(title || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/experiencia de usuario|user experience/g, 'ux').replace(/\(.*?\)/g, ' ')
    .split(/[^a-z0-9]+/).filter(Boolean).map(w => synonyms[w] || w)
    .filter(w => !/^(junior|jr|senior|sr|semi|ssr|mid|remoto|remote|hibrido|hybrid|latam|de|del|la|el|en|para|y|e|and|the|of|a|or|o|a)$/.test(w))
    .filter((w, i, all) => all.indexOf(w) === i);
}

/** true si dos títulos son el mismo cargo ("Diseñador UX/UI Junior" = "UX/UI Designer"). */
function sameRole(a, b) {
  const x = roleTokens_(a), y = roleTokens_(b);
  if (!x.length || !y.length) return false;
  const common = x.filter(w => y.indexOf(w) !== -1).length;
  return common / (x.length + y.length - common) >= 0.6;
}

/** Cargo a partir del nombre de una HV: "HV_Nombre_Apellido_UI_UX_Designer.pdf" -> "UI UX Designer". */
function hvRoleFromFileName(name) {
  const parts = String(name || '').replace(/\.[a-z]{2,4}$/i, '').split(/[_\s]+/);
  return /^(hv|cv)$/i.test(parts[0]) && parts.length >= 4 ? parts.slice(3).join(' ') : '';
}

/**
 * Empresa oculta (2026-10-24): un aviso "confidential" cuyo texto nombra una empresa del registro con el mismo cargo es
 * la misma vacante (BairesDev entró así dos veces). Solo cuenta si el cargo coincide, para no confundir a la empresa con
 * sus clientes ("clientes como Google…"). existing = claves de getExistingUrls_ ("empresa|cargo" normalizados).
 */
function isHiddenCompanyRepeat(vacancy, existing) {
  const norm = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const company = norm(vacancy.company);
  if (company && !/^(confidential|confidencial|confidencial empresa|empresa confidencial|n d|nd)$/.test(company)) return false;
  const text = ' ' + norm(vacancy.title + ' ' + (vacancy.description || '')) + ' ';
  return Object.keys(existing || {}).some(key => {
    const parts = key.split('|');
    if (parts.length !== 2 || parts[0].length < 4 || /^confiden/.test(parts[0])) return false;
    return text.indexOf(' ' + parts[0] + ' ') !== -1 && sameRole(parts[1], vacancy.title);
  });
}

/** Clave para reconocer la misma vacante publicada con enlaces distintos: empresa|cargo normalizados. */
/**
 * Quita de la selección del día los avisos repetidos dentro de la misma corrida y limita los de una misma empresa
 * (27 oct 2026: Blacksmith Agency ocupó 7 de 20 cupos con el mismo aviso por ciudad y dos "Empresa confidencial" eran el
 * mismo texto con otro cargo). Mismo aviso = misma empresa y mismo cargo sin la ciudad entre paréntesis, o misma
 * empresa y la misma descripción. Se queda el de mayor prioridad. Las "confidenciales" no cuentan como una sola empresa.
 */
function distinctPostings(scored, maxPerCompany) {
  const norm = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const rank = x => (x.priority !== undefined ? x.priority : x.score);
  const seen = {}, perCompany = {};
  return scored.slice().sort((a, b) => rank(b) - rank(a)).filter(x => {
    const v = x.vacancy;
    if (v.isPost) return true;
    const company = norm(v.company);
    const hidden = !company || /confiden/.test(company);
    const desc = norm(v.description);
    // La descripción COMPLETA (28 oct 2026): con solo los primeros 400 caracteres, el texto de presentación que Greenhouse y
    // Ashby ponen al inicio de cada aviso hacía «repetidos» cargos distintos de la misma empresa (Clara, Truelogic)
    const keys = (hidden ? [] : [vacancyBaseKey(v)]).concat(desc.length >= 200 ? [company + '#' + desc] : []);
    // Mismo aviso: se marca para registrarlo como repetido y que no vuelva en las corridas siguientes
    if (keys.some(k => seen[k])) { v.duplicate = true; return false; }
    if (!hidden && (perCompany[company] || 0) >= maxPerCompany) return false;
    keys.forEach(k => { seen[k] = true; });
    if (!hidden) perCompany[company] = (perCompany[company] || 0) + 1;
    return true;
  });
}

/** Empresa y cargo sin la ciudad entre paréntesis ni "remote": el mismo aviso publicado por ciudad da la misma clave. */
function vacancyBaseKey(vacancy) {
  const norm = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  return norm(vacancy.company) + '|' + norm(String(vacancy.title || '').replace(/\([^)]*\)/g, ' ').replace(/\b(remote|remoto|work)\b/gi, ' '));
}

function vacancyKey(vacancy) {
  const norm = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  return norm(vacancy.company) + '|' + norm(vacancy.title);
}

/**
 * Selección diaria: reserva al menos minJunior cupos para vacantes Junior (si existen)
 * y completa el resto con las de mayor prioridad (o score) de cualquier nivel.
 */
function selectDailyVacancies(scored, limit, minJunior) {
  const rank = x => (x.priority !== undefined ? x.priority : x.score);
  const byScore = scored.slice().sort((a, b) => rank(b) - rank(a));
  const picked = byScore.filter(x => x.seniority === 'junior').slice(0, minJunior);
  byScore.forEach(x => { if (picked.length < limit && picked.indexOf(x) === -1) picked.push(x); });
  return picked.sort((a, b) => rank(b) - rank(a)).slice(0, limit);
}

/**
 * Nunca rellenar una cuota con avisos sin fecha verificada ni puestos manifiestamente poco compatibles.
 * minDaily se conserva por compatibilidad con llamadas anteriores, sin forzar cantidad.
 */
function selectWithDateRule(scored, limit, minJunior, minDaily) {
  return selectDailyVacancies(scored.filter(x => !x.vacancy.dateUnverified &&
    (x.priority === undefined || x.priority >= CONFIG.MIN_SEARCH_PRIORITY)), limit, minJunior);
}

/**
 * Cargo limpio a partir del título de la vacante o de la primera línea de una publicación: sin "#" de Markdown, sin
 * emoji ni símbolos al inicio o al final y sin la lista de países que algunas publicaciones ponen después de " - "
 * ("🎨 UX/UI & Graphic Designer - Argentina, Perú…" -> "UX/UI & Graphic Designer"). 2026-11-05: el borrador de una
 * publicación salió con el cargo por defecto «Junior» porque el título llegaba vacío.
 */
function cleanVacancyTitle(title) {
  let t = String(title || '').normalize('NFC').replace(/^\s*#+\s*/, '')
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N})]+$/gu, '')
    .replace(/^(we'?re hiring|we are hiring|hiring|estamos contratando|estamos buscando|buscamos|vacante|oportunidad)\b[\s!:.¡-]*/i, '');
  const cut = t.match(/^(.+?)\s+[-–—|]\s+(.*)$/);
  if (cut && (CONFIG.TITLE_LOCATION_TAIL.test(cut[2]) || /,/.test(cut[2]))) t = cut[1];
  return t.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N})]+$/gu, '').replace(/\s+/g, ' ').trim();
}

/** Cargo para el asunto: el título limpio si es un cargo de diseño corto; si no, '' (se usa el cargo neutro). */
function emailRoleTitle(title) {
  const t = cleanVacancyTitle(title);
  if (!t || t.length > CONFIG.EMAIL_ROLE_MAX_LENGTH) return '';
  const cls = roleTitleClass(t);
  return cls === 'design' || cls === 'verify' ? t : '';
}

/**
 * Asunto y cuerpo del correo de postulación. Sin cargo usable va el neutro (CONFIG.EMAIL_DEFAULT_ROLE, nunca «Junior»:
 * solo se dice si la vacante lo dice) y la empresa se omite si es la etiqueta de carpeta de una publicación
 * ("Post <autor>"): el correo va a esa misma persona.
 */
function buildApplicationEmail(vacancy, language) {
  const lang = language === 'en' ? 'en' : 'es';
  const company = String(vacancy.company || '').trim();
  const hasCompany = !!company && !/^post\b/i.test(company);
  const values = {
    cargo: emailRoleTitle(vacancy.title) || CONFIG.EMAIL_DEFAULT_ROLE[lang],
    empresa: hasCompany ? company : (lang === 'en' ? 'your team' : 'su equipo'),
  };
  const tpl = EMAIL_TEMPLATES_[lang];
  return {
    subject: fill_(hasCompany ? tpl.subject : tpl.subjectNoCompany, values),
    body: fill_(tpl.body, values),
  };
}

/** Correo directo del reclutador: campo explícito o primer email en el texto de la oferta. */
function extractContactEmail(vacancy) {
  if (vacancy.contactEmail) return vacancy.contactEmail;
  const match = vacancyText_(vacancy).match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  return match ? match[0] : null;
}
