/**
 * Medidor ATS determinista (2026-11-09, pedido de Oscar: «cuando me postulo me debería decir que mi match con la vacante
 * es alto, pero me deja un 40 %, un 50 %»). Sin IA y sin tokens.
 *
 * Por qué el match salía bajo: los ATS y los medidores tipo Jobscan cuentan los términos LITERALES de la vacante que
 * aparecen en la HV (cargo, herramientas, métodos, entregables, sector y habilidades blandas). La IA elegía 10 keywords
 * abstractas («flujos completos», «herramientas de IA»), Apps Script solo exigía 5, y la HV traducía al español términos
 * que la vacante escribe en inglés («Design System» → «sistema de diseño», «dashboards» → «panel»). Resultado: términos
 * que Oscar SÍ tiene según CONTEXTO_CV no aparecían tal como los busca el ATS.
 *
 * Este medidor:
 *  1. saca los términos de la vacante con un léxico bilingüe de UX/UI (ATS_TERMS_) y su cargo;
 *  2. mira si la HV trae la MISMA forma que usa la vacante (literal), otra forma del mismo término (equivalente) o nada;
 *  3. mira si CONTEXTO_CV respalda el término (alguna de sus formas aparece allí);
 *  4. puntúa como un ATS: literales / términos de la vacante, y dice cuáles se pueden subir honestamente (respaldados y
 *     ausentes) y cuáles son brechas reales (no están en CONTEXTO_CV: solo suben si Oscar los agrega allí, si son ciertos).
 * Un término respaldado que la IA decide no usar (p. ej. una herramienta que solo evaluó) se declara en `_gaps` y deja
 * de exigirse. También rechaza herramientas de la HV que CONTEXTO_CV no menciona (anti-alucinación).
 */

// [etiqueta, formas (se normalizan sin tildes ni signos), tipo]. Tipos: tool (herramienta), method, deliverable,
// domain (sector), soft (habilidad blanda), role. Cada forma admite plural en su última palabra (s / es).
const ATS_TERMS_ = [
  // Herramientas
  ['Figma', ['figma'], 'tool'], ['FigJam', ['figjam'], 'tool'], ['Miro', ['miro'], 'tool'], ['Notion', ['notion'], 'tool'],
  ['Jira', ['jira'], 'tool'], ['Confluence', ['confluence'], 'tool'], ['Maze', ['maze'], 'tool'],
  ['Hotjar', ['hotjar'], 'tool'], ['Google Analytics', ['google analytics'], 'tool'], ['Amplitude', ['amplitude'], 'tool'],
  ['Mixpanel', ['mixpanel'], 'tool'], ['Framer', ['framer'], 'tool'], ['Webflow', ['webflow'], 'tool'],
  ['Shopify', ['shopify'], 'tool'], ['WordPress', ['wordpress'], 'tool'], ['ProtoPie', ['protopie'], 'tool'],
  ['Sketch', ['sketch'], 'tool'], ['Adobe XD', ['adobe xd'], 'tool'], ['Zeplin', ['zeplin'], 'tool'],
  ['Storybook', ['storybook'], 'tool'],
  ['Adobe Creative Suite', ['adobe creative suite', 'adobe creative cloud', 'adobe cc', 'suite adobe', 'suite de adobe'], 'tool'],
  ['Photoshop', ['photoshop'], 'tool', 'Adobe Creative Suite'], ['Illustrator', ['illustrator'], 'tool', 'Adobe Creative Suite'],
  ['After Effects', ['after effects'], 'tool', 'Adobe Creative Suite'],
  ['HTML', ['html'], 'tool'], ['CSS', ['css'], 'tool'], ['JavaScript', ['javascript'], 'tool'], ['React', ['react'], 'tool'],
  ['Tailwind', ['tailwind'], 'tool'], ['Claude', ['claude'], 'tool'], ['ChatGPT', ['chatgpt'], 'tool'],
  ['Gemini', ['gemini'], 'tool'], ['Salesforce', ['salesforce'], 'tool'],
  // Métodos y prácticas
  ['UX Research', ['ux research', 'user research', 'research', 'investigacion de usuario', 'investigacion ux', 'investigacion'], 'method'],
  ['Entrevistas', ['entrevista', 'interview'], 'method'], ['Encuestas', ['encuesta', 'survey'], 'method'],
  ['Pruebas de usabilidad', ['prueba de usabilidad', 'pruebas de usabilidad', 'test de usabilidad', 'usability testing',
    'usability test', 'usabilidad', 'usability'], 'method'],
  ['Validación con usuarios', ['validacion con usuario', 'validaciones con usuario', 'validacion de usuario',
    'validaciones de usuario', 'user validation', 'validar con usuario', 'validated with user'], 'method'],
  ['A/B testing', ['a b testing', 'ab testing', 'a b test', 'pruebas a b', 'test a b'], 'method'],
  ['Evaluación heurística', ['evaluacion heuristica', 'heuristic evaluation', 'heuristica', 'heuristic'], 'method'],
  ['Accesibilidad', ['accesibilidad', 'accessibility', 'wcag'], 'method'],
  ['Design Thinking', ['design thinking'], 'method'], ['Lean', ['lean ux', 'lean startup'], 'method'],
  ['Card sorting', ['card sorting'], 'method'], ['Benchmarking', ['benchmarking', 'benchmark'], 'method'],
  ['Diseño centrado en el usuario', ['centrado en el usuario', 'centrada en el usuario', 'centrados en el usuario',
    'centradas en el usuario', 'centrado en las persona', 'centrada en las persona', 'user centered', 'user centred',
    'human centered', 'hcd'], 'method'],
  ['Metodologías ágiles', ['agil', 'agile', 'agilidad'], 'method'], ['Scrum', ['scrum'], 'method'],
  ['Kanban', ['kanban'], 'method'],
  ['Diseño de interacción', ['diseno de interaccion', 'interaction design', 'microinteraccion', 'microinteraction'], 'method'],
  ['Diseño visual', ['diseno visual', 'visual design'], 'method'],
  ['Diseño de interfaces', ['diseno ui', 'ui design', 'diseno de interfaces', 'interface design', 'interfaz', 'interface'], 'method'],
  ['Mobile first', ['mobile first'], 'method'], ['Responsive', ['responsive', 'responsivo', 'responsiva'], 'method'],
  ['UX Writing', ['ux writing', 'microcopy'], 'method'], ['Design Ops', ['design ops', 'designops'], 'method'],
  ['Vibecoding', ['vibecoding', 'vibe coding'], 'method'],
  ['IA', ['ia', 'ai', 'inteligencia artificial', 'artificial intelligence', 'ia generativa', 'generative ai', 'genai', 'llm'], 'method'],
  ['Métricas / KPI', ['metrica', 'metric', 'kpi', 'okr', 'indicador'], 'method'],
  ['Analítica', ['analitica', 'analytics', 'data driven'], 'method'],
  ['Conversión / funnel', ['funnel', 'embudo', 'conversion'], 'method'],
  // Entregables
  ['Design System', ['design system', 'sistema de diseno', 'sistemas de diseno'], 'deliverable'],
  ['Design tokens', ['design token', 'token', 'tokens de diseno', 'tokenizacion'], 'deliverable'],
  ['Componentes', ['componente', 'component'], 'deliverable'], ['Variantes', ['variante', 'variant'], 'deliverable'],
  ['Auto layout', ['auto layout', 'autolayout'], 'deliverable'],
  ['Prototipado', ['prototipo', 'prototipado', 'prototipar', 'prototype', 'prototyping'], 'deliverable'],
  ['Wireframes', ['wireframe', 'wireframing'], 'deliverable'], ['Mockups', ['mockup'], 'deliverable'],
  ['Alta fidelidad', ['alta fidelidad', 'high fidelity', 'hi fi'], 'deliverable'],
  ['Flujos de usuario', ['user flow', 'flujo de usuario', 'flujos de usuario', 'flujo', 'task flow'], 'deliverable'],
  ['User journey', ['journey'], 'deliverable'], ['Service blueprint', ['service blueprint', 'blueprint'], 'deliverable'],
  ['Arquitectura de información', ['arquitectura de informacion', 'arquitecturas de informacion',
    'information architecture'], 'deliverable'],
  ['Sitemap', ['sitemap', 'mapa del sitio', 'mapa de sitio'], 'deliverable'],
  ['Arquetipos / personas', ['arquetipo', 'user persona', 'buyer persona', 'proto persona'], 'deliverable'],
  ['Handoff', ['handoff', 'hand off', 'entrega a desarrollo'], 'deliverable'],
  ['Especificaciones', ['especificacion', 'spec', 'specification'], 'deliverable'],
  ['Documentación', ['documentacion', 'documentation'], 'deliverable'],
  ['Dashboards', ['dashboard', 'panel de control', 'tablero de control'], 'deliverable'],
  ['MVP', ['mvp'], 'deliverable'], ['Roadmap', ['roadmap'], 'deliverable'],
  ['Iconografía', ['iconografia', 'iconography', 'icono', 'icon'], 'deliverable'],
  ['Tipografía', ['tipografia', 'typography'], 'deliverable'], ['Ilustración', ['ilustracion', 'illustration'], 'deliverable'],
  ['Animación', ['animacion', 'animation', 'motion design', 'motion graphics'], 'deliverable'],
  ['Branding', ['branding', 'identidad visual', 'brand identity', 'identidad de marca'], 'deliverable'],
  ['Stakeholders', ['stakeholder', 'partes interesadas'], 'method'],
  ['Product Manager / Owner', ['product manager', 'product owner', 'gerente de producto'], 'role'],
  ['QA', ['qa', 'quality assurance'], 'role'],
  ['CRM / ERP', ['crm', 'erp'], 'domain'], ['API', ['api'], 'domain'],
  // Sectores y tipo de producto
  ['SaaS', ['saas'], 'domain'], ['B2B', ['b2b'], 'domain'], ['B2C', ['b2c'], 'domain'],
  ['Fintech / sector financiero', ['fintech', 'sector financiero', 'financiero', 'financiera', 'financial', 'banca',
    'banking', 'bancario', 'bancaria', 'finanzas'], 'domain'],
  ['Seguros', ['aseguradora', 'sector asegurador', 'ramo de seguros', 'compania de seguros', 'companias de seguros',
    'insurance', 'insurtech'], 'domain'],
  ['E-commerce', ['e commerce', 'ecommerce', 'comercio electronico'], 'domain'], ['Marketplace', ['marketplace'], 'domain'],
  ['EdTech', ['edtech', 'e learning', 'elearning', 'plataforma educativa', 'plataformas educativas', 'educativo',
    'educativa', 'educational'], 'domain'],
  ['Salud', ['healthtech', 'salud', 'dispositivos medicos', 'dispositivo medico', 'medical device', 'healthcare'], 'domain'],
  ['Omnicanal', ['omnicanal', 'omnichannel', 'multicanal', 'multichannel'], 'domain'],
  ['Portafolio', ['portafolio', 'portfolio'], 'deliverable'],
  // Habilidades blandas
  ['Liderazgo', ['liderazgo', 'leadership'], 'soft'], ['Comunicación', ['comunicacion', 'communication'], 'soft'],
  ['Trabajo en equipo', ['trabajo en equipo', 'teamwork', 'colaboracion', 'collaboration', 'colaborativo', 'colaborativa',
    'collaborative', 'cross functional', 'multidisciplinario', 'multidisciplinaria', 'interdisciplinario',
    'interdisciplinaria'], 'soft'],
  ['Autonomía', ['autonomia', 'autonomy', 'ownership', 'autogestion'], 'soft'],
  ['Pensamiento crítico', ['pensamiento critico', 'critical thinking'], 'soft'],
  ['Resolución de problemas', ['resolucion de problemas', 'problem solving'], 'soft'],
  ['Pensamiento sistémico', ['pensamiento sistemico', 'systems thinking'], 'soft'],
  ['Facilitación', ['facilitacion', 'facilitation', 'taller', 'workshop'], 'soft'],
  ['Creatividad', ['creatividad', 'creativity', 'creativo', 'creativa'], 'soft'],
  ['Empatía', ['empatia', 'empathy'], 'soft'], ['Adaptabilidad', ['adaptabilidad', 'adaptability'], 'soft'],
];

// Palabras de nivel o de relleno que salen del cargo antes de buscarlo en la HV (Oscar no puede atribuirse un nivel)
const ATS_TITLE_NOISE_ = /\b(senior|sr|semi|ssr|semisenior|mid|middle|junior|jr|lead|staff|principal|head|i{1,3}|nivel|level|buscamos|hiring|we re|estamos|contratando|vacante|remote|remoto|hibrido|hybrid|presencial)\b/g;
const ATS_ROLE_WORD_ = /\b(disen\w*|design\w*|ux|ui|research\w*|investigador\w*|product|producto|analista|analyst|experiencia|experience)\b/;

/** Texto normalizado con espacios al borde: ' figma design system ' (usa normText_ de CV.gs). */
function atsNorm_(text) {
  return ' ' + normText_(text) + ' ';
}

/** ¿La forma (ya normalizada) aparece como frase completa, con plural opcional en su última palabra? */
function atsHasForm_(padded, form) {
  const words = normText_(form).split(' ').filter(Boolean);
  if (!words.length) return false;
  const last = words.pop().replace(/(es|s)$/, '');
  const pattern = ' ' + words.map(w => w + ' ').join('') + last + '(?:s|es)? ';
  return new RegExp(pattern).test(padded);
}

/** Formas de un término presentes en el texto. */
function atsFormsIn_(padded, forms) {
  return forms.filter(f => atsHasForm_(padded, f));
}

/** Cargo de la vacante sin nivel, ciudad ni signos, para buscarlo en el título y los cargos de la HV. */
function atsRoleTitle(title) {
  const clean = String(title || '').replace(/\([^)]*\)/g, ' ').split(/\s[-–—|]\s|[|•]/)[0]
    .replace(/\b(\w+)\/(a|as|os|o)\b/gi, '$1');  // "Diseñador/a" → "Diseñador"
  // 2026-11-12: los códigos internos del aviso («K1126», «REQ-2041») no son parte del cargo
  const words = normText_(clean).replace(ATS_TITLE_NOISE_, ' ').replace(/\b\w*\d\w*\b/g, ' ').replace(/\s+/g, ' ').trim();
  return ATS_ROLE_WORD_.test(' ' + words + ' ') && words.split(' ').length <= 8 ? words : '';
}

/** Texto de la HV tal como lo leería un ATS: los valores de los marcadores + el texto fijo de la plantilla. */
function atsCvText(cv) {
  // Desde 2026-11-10 el encabezado muestra las direcciones visibles (linkedin.com/in/… y …-portfolio.lovable.app)
  const fixed = cv && cv._idioma === 'en' ? 'linkedin portfolio WhatsApp Languages' : 'linkedin portfolio WhatsApp Idiomas';
  const values = Object.keys(cv || {}).filter(k => k.charAt(0) !== '_' && typeof cv[k] === 'string').map(k => cv[k]);
  return values.concat([fixed]).join(' \n ');
}

/**
 * Cobertura ATS de la HV frente a la vacante. Devuelve null si no hay texto de vacante (correo en frío sin aviso).
 * { score, total, literal[], equivalent[], fixable[], gaps[], declared[], title:{text, covered} }
 */
function atsCoverage(vacancy, cv, contextText) {
  const vacancyText = String((vacancy && (vacancy.description || vacancy.text)) || '');
  if (normText_(vacancyText).split(' ').length < 25) return null;
  const vac = atsNorm_(((vacancy && vacancy.title) || '') + ' \n ' + vacancyText);
  const hv = atsNorm_(atsCvText(cv));
  const ctx = atsNorm_(contextText);
  const declared = atsNorm_([].concat(cv && cv._gaps || []).map(String).join(' \n '));
  const out = { literal: [], equivalent: [], fixable: [], gaps: [], declared: [], title: null };
  ATS_TERMS_.forEach(t => {
    const label = t[0];
    const forms = t[1];
    const used = atsFormsIn_(vac, forms);
    if (!used.length) return;
    if (atsFormsIn_(hv, used).length) { out.literal.push(label); return; }
    const supported = atsFormsIn_(ctx, forms).length > 0 || (t[3] && atsFormsIn_(ctx, ATS_TERMS_.filter(o => o[0] === t[3])[0][1]).length > 0);
    const item = { label: label, use: used[0], supported: supported };
    if (atsFormsIn_(declared, forms).length) { out.declared.push(item); return; }
    if (atsFormsIn_(hv, forms).length) out.equivalent.push(item);
    else if (supported) out.fixable.push(item);
    else out.gaps.push(item);
  });
  const role = atsRoleTitle(vacancy && vacancy.title);
  if (role) {
    const where = [cv.TITULO_SUBTITULO_PROFESIONAL].concat(Object.keys(cv).filter(k => /^CARGO_EXP_\d+$/.test(k)).map(k => cv[k]))
      .filter(Boolean).join(' \n ');
    out.title = { text: role, covered: keywordCovered(role, where) };
  }
  const titleHit = out.title ? (out.title.covered ? 1 : 0) : 0;
  const total = out.literal.length + out.equivalent.length + out.fixable.length + out.gaps.length + out.declared.length +
    (out.title ? 1 : 0);
  out.total = total;
  out.score = total ? Math.round(100 * (out.literal.length + titleHit) / total) : 100;
  // Lo máximo honesto: lo que ya está + lo que CONTEXTO_CV respalda (los equivalentes respaldados también suben)
  const reachable = out.literal.length + titleHit + out.fixable.length + out.equivalent.filter(e => e.supported).length +
    (out.title && !out.title.covered ? 1 : 0);
  out.potential = total ? Math.round(100 * reachable / total) : 100;
  return out;
}

/**
 * Errores ATS que la IA puede corregir sin inventar: el cargo de la vacante fuera del título y los cargos, y términos
 * respaldados por CONTEXTO_CV que la HV no escribe como los escribe la vacante. Se toleran CONFIG.ATS_MAX_FIXABLE.
 */
function atsErrors(ats) {
  if (!ats) return [];
  const errors = [];
  if (ats.title && !ats.title.covered) {
    errors.push('ATS: el cargo de la vacante («' + ats.title.text + '») no está en TITULO_SUBTITULO_PROFESIONAL ni en los ' +
      'cargos; escríbelo tal cual en el título profesional (sin nivel que no tengas)');
  }
  const pending = ats.fixable.concat(ats.equivalent.filter(e => e.supported));
  if (pending.length > CONFIG.ATS_MAX_FIXABLE) {
    errors.push('ATS ' + ats.score + '% (posible ' + ats.potential + '%): escribe con la palabra exacta de la vacante ' +
      pending.map(p => '«' + p.use + '»').join(', ') + ' (CONTEXTO_CV lo respalda). Si alguno no es experiencia real, ' +
      'decláralo en _gaps con su nombre y la razón');
  }
  return errors;
}

/**
 * Herramientas que la HV nombra y CONTEXTO_CV no (anti-alucinación). Las que dependen de otra que sí está (Photoshop
 * dentro de Adobe Creative Suite) son aviso, no error.
 */
function atsToolIssues(cv, contextText) {
  const hv = atsNorm_(atsCvText(cv));
  const ctx = atsNorm_(contextText);
  const issues = { errors: [], warnings: [] };
  ATS_TERMS_.filter(t => t[2] === 'tool').forEach(t => {
    if (!atsFormsIn_(hv, t[1]).length || atsFormsIn_(ctx, t[1]).length) return;
    const parent = t[3] && ATS_TERMS_.filter(o => o[0] === t[3])[0];
    if (parent && atsFormsIn_(ctx, parent[1]).length) {
      issues.warnings.push('ATS: ' + t[0] + ' no está en ' + CONFIG.CONTEXT_DOC_NAME + ' (solo ' + parent[0] + '); confírmalo con Oscar');
    } else {
      issues.errors.push('La herramienta ' + t[0] + ' no está en ' + CONFIG.CONTEXT_DOC_NAME + ': no se puede afirmar en la HV');
    }
  });
  return issues;
}

/** Texto de ATS.txt: lo lee Oscar, el editor (revisar-hv) y la oficina; corto y en lenguaje sencillo. */
function atsReport(ats, label) {
  if (!ats) return 'MATCH ATS: sin aviso para comparar (' + (label || 'HV') + ')';
  const list = items => items.map(i => (typeof i === 'string' ? i : i.label + ' («' + i.use + '»)')).join(', ') || '—';
  return [
    'MATCH ATS: ' + ats.score + '%',
    'POSIBLE CON TU EXPERIENCIA REAL: ' + ats.potential + '%',
    'Cargo de la vacante: ' + (ats.title ? ats.title.text + (ats.title.covered ? ' (en la HV)' : ' (FALTA en la HV)') : '—'),
    'En la HV tal como lo pide la vacante (' + ats.literal.length + '): ' + list(ats.literal),
    'Con otra palabra (cámbiala por la de la vacante): ' + list(ats.equivalent),
    'Respaldado en CONTEXTO_CV y ausente en la HV: ' + list(ats.fixable),
    'Declarado como brecha en _gaps: ' + list(ats.declared),
    'No está en CONTEXTO_CV (brecha real; si lo tienes, agrégalo a CONTEXTO_CV): ' + list(ats.gaps),
    '',
    'Cómo se calcula: términos de la vacante (léxico UX/UI bilingüe de Ats.gs) + su cargo; cuenta solo la palabra exacta,',
    'como un ATS. Es una estimación: cada portal usa su propio algoritmo.',
  ].join('\n');
}

/**
 * Términos ATS de una vacante cruzados con CONTEXTO_CV, ANTES de escribir la HV (para la «Tanda IA»): el escriba los usa
 * como lista de chequeo en vez de deducirlos. [{label, use, supported}] en el orden del léxico; el cargo va primero.
 */
function atsVacancyTerms(vacancy, contextText) {
  const vacancyText = String((vacancy && (vacancy.description || vacancy.text)) || '');
  const vac = atsNorm_(((vacancy && vacancy.title) || '') + ' \n ' + vacancyText);
  const ctx = atsNorm_(contextText);
  const out = [];
  const role = atsRoleTitle(vacancy && vacancy.title);
  if (role) out.push({ label: 'Cargo', use: role, supported: true });
  ATS_TERMS_.forEach(t => {
    const used = atsFormsIn_(vac, t[1]);
    if (!used.length) return;
    const parent = t[3] && ATS_TERMS_.filter(o => o[0] === t[3])[0];
    const supported = atsFormsIn_(ctx, t[1]).length > 0 || !!(parent && atsFormsIn_(ctx, parent[1]).length);
    out.push({ label: t[0], use: used[0], supported: supported });
  });
  return out;
}

/** «cargo: product designer · ✓ design system · ✓ figma · ✗ jira» (corto, para una celda). */
function atsTermsLine(terms) {
  return terms.map(t => (t.label === 'Cargo' ? 'cargo: ' : (t.supported ? '✓ ' : '✗ ')) + t.use).join(' · ');
}
