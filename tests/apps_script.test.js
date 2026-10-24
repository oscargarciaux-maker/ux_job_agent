// Pruebas de la lógica pura de apps_script/ en Node (sin servicios de Google).
// Ejecutar: node tests/apps_script.test.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const dir = path.join(__dirname, '..', 'apps_script');
const context = {
  console,
  Utilities: {
    Charset: { UTF_8: 'utf8' },
    getUuid: () => 'uuid',
    base64Encode: (data) => Buffer.from(typeof data === 'string' ? data : Buffer.from(data)).toString('base64'),
  },
};
vm.createContext(context);
for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.gs')).sort()) {
  vm.runInContext(fs.readFileSync(path.join(dir, file), 'utf8'), context, { filename: file });
}
JSON.parse(fs.readFileSync(path.join(dir, 'appsscript.json'), 'utf8'));

// files.json debe listar exactamente los archivos que se despliegan (si no, la sincronización los omite)
const listed = JSON.parse(fs.readFileSync(path.join(dir, 'files.json'), 'utf8')).sort();
const actual = fs.readdirSync(dir).filter(f => f.endsWith('.gs') || f === 'appsscript.json').sort();
assert.deepStrictEqual(listed, actual, 'apps_script/files.json no coincide con los archivos de apps_script/');
const run = (expr) => vm.runInContext(expr, context);

const es = run('SAMPLE_VACANCIES_[0]');
const en = run('SAMPLE_VACANCIES_[1]');

// Regla de idioma
assert.strictEqual(context.detectLanguage(context.vacancyText_(es)), 'es');
assert.strictEqual(context.detectLanguage(context.vacancyText_(en)), 'en');

// Nivel y Match Score
assert.strictEqual(context.classifySeniority(es), 'junior');
assert.strictEqual(context.classifySeniority({ title: 'Senior Product Designer' }), 'senior');
assert.strictEqual(context.classifySeniority({ title: 'Diseñador UX/UI', description: 'Experiencia de 1 a 2 años' }), 'junior');
assert.strictEqual(context.classifySeniority({ title: 'Diseñador UX/UI', description: '3 años de experiencia' }), 'mid');
assert.strictEqual(context.computeMatchScore(es), 100);
assert.strictEqual(context.computeMatchScore({ title: 'Senior Product Designer', location: 'Lima' }), 60);

// Selección diaria: al menos 5 Junior si existen, el resto por score
const pool = [];
for (let i = 0; i < 8; i++) pool.push({ id: 'j' + i, seniority: 'junior', score: 70 - i });
for (let i = 0; i < 8; i++) pool.push({ id: 's' + i, seniority: 'senior', score: 90 - i });
const picked = context.selectDailyVacancies(pool, 10, 5);
assert.strictEqual(picked.length, 10);
assert.strictEqual(picked.filter(x => x.seniority === 'junior').length, 5);
assert.strictEqual(context.selectDailyVacancies(pool.filter(x => x.seniority === 'senior'), 10, 5).length, 8);

// Google Jobs: descripción completa, link de LinkedIn preferido, antigüedad
const job = context.parseGoogleJob({
  title: 'Diseñador UX/UI Junior', company_name: 'Acme', location: 'Bogotá', description: 'Descripción completa...',
  via: 'LinkedIn', detected_extensions: { posted_at: 'hace 3 días' }, share_link: 'https://g.co/x',
  apply_options: [{ title: 'Acme', link: 'https://acme.com/jobs/1' }, { title: 'LinkedIn', link: 'https://www.linkedin.com/jobs/view/9' }],
});
assert.strictEqual(job.link, 'https://www.linkedin.com/jobs/view/9');
assert.strictEqual(job.description, 'Descripción completa...');
assert.strictEqual(job.source, 'LinkedIn');
// Prioridad de fuente: Indeed > Computrabajo > portal; agregadores de pago nunca se eligen
const links = o => context.parseGoogleJob({ title: 'X', apply_options: o.map(l => ({ link: l })) });
assert.strictEqual(links(['https://co.computrabajo.com/1', 'https://co.indeed.com/2', 'https://acme.com/3']).link, 'https://co.indeed.com/2');
assert.strictEqual(links(['https://co.jooble.org/jdp/1', 'https://acme.com/careers/3']).link, 'https://acme.com/careers/3');
assert.strictEqual(links(['https://acme.com/careers/3']).source, 'acme.com');
assert.strictEqual(links(['https://co.jooble.org/jdp/1', 'https://co.trabajo.org/2', 'https://www.jobleads.com/3']).link, '');
// Prioridad del día: LinkedIn y fintech suben; misma vacante con otro enlace se reconoce
const plain = { title: 'Diseñador UX/UI', company: 'Acme', description: 'Bogotá' };
const fin = { title: 'Diseñador UX/UI', company: 'Nequi', description: 'Fintech en Bogotá', sourceBonus: 9 };
assert.ok(context.computePriority(fin, 80) > context.computePriority(plain, 80));
assert.strictEqual(context.computePriority(plain, 80), 80);
assert.strictEqual(context.vacancyKey({ company: 'Lite Thinking', title: 'Diseñador UX/UI Junior' }),
  context.vacancyKey({ company: 'lite thinking', title: 'Disenador UX UI junior' }));
const byPriority = context.selectDailyVacancies([{ seniority: 'mid', score: 80, priority: 99 }, { seniority: 'mid', score: 90, priority: 90 }], 1, 0);
assert.strictEqual(byPriority[0].priority, 99);
assert.ok(context.isRecent('hace 3 días', 14) && context.isRecent('2 weeks ago', 14) && context.isRecent('', 14));
assert.ok(!context.isRecent('hace 3 semanas', 14) && !context.isRecent('hace 1 mes', 14));
// Fecha leída del JobPosting (JSON-LD) de la página original
const hoy = new Date(2026, 9, 18);
const fechas = context.extractJobPostingDates('<script type="application/ld+json">{"@type":"JobPosting","datePosted": "2026-08-24T10:00:00.000Z","validThrough":"2026-12-01T00:00"}</script>');
assert.strictEqual(fechas.posted, '2026-08-24');
assert.strictEqual(fechas.validThrough, '2026-12-01');
assert.strictEqual(context.extractJobPostingDates('<html>sin datos</html>').posted, null);
assert.strictEqual(context.extractJobPostingDates('{"datePosted": "2026-9-7","validThrough":"2026-11-06"}').posted, '2026-09-07');  // elempleo
assert.ok(!context.isRecent('2026-08-24', 14, hoy) && context.isRecent('2026-10-10', 14, hoy));
assert.ok(context.isExpired('2026-10-17', hoy) && !context.isExpired('2026-10-18', hoy) && !context.isExpired(null, hoy));
// Verificación por la página original: vieja, vencida, enlace muerto (404) o sin fecha
const haceDias = n => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const paginas = {
  'https://a.co/vieja': [200, '"datePosted":"' + haceDias(60) + '"'], 'https://a.co/nueva': [200, '"datePosted": "' + haceDias(3) + '"'],
  'https://a.co/muerta': [404, ''], 'https://a.co/sinfecha': [200, '<html></html>'],
};
context.UrlFetchApp = { fetchAll: reqs => reqs.map(r => ({ getResponseCode: () => paginas[r.url][0], getContentText: () => paginas[r.url][1] })) };
const vigentes = context.verifyPostingDates_(Object.keys(paginas).map(link => ({ title: link, link: link, postedAt: '' })));
assert.deepStrictEqual(vigentes.map(v => v.link), ['https://a.co/nueva', 'https://a.co/sinfecha']);
assert.ok(vigentes[1].dateUnverified && !vigentes[0].dateUnverified);
// Rotación diaria de búsquedas y publicaciones de LinkedIn
const qpool = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const d0 = context.pickDailyItems(qpool, 2, new Date(2026, 9, 19));
const d1 = context.pickDailyItems(qpool, 2, new Date(2026, 9, 20));
assert.strictEqual(d0.length, 2);
assert.notDeepStrictEqual(d0, d1);
assert.deepStrictEqual(context.pickDailyItems(qpool, 2, new Date(2026, 9, 19, 23)), d0);
const semana = new Set();
for (let i = 0; i < 4; i++) context.pickDailyItems(qpool, 2, new Date(2026, 9, 19 + i)).forEach(q => semana.add(q));
assert.strictEqual(semana.size, 8, 'en 4 días se usan las 8 búsquedas');
assert.strictEqual(context.linkedInPostDate('https://www.linkedin.com/posts/x_y-activity-7516573783793659905-2WJX'), '2026-10-15');
assert.strictEqual(context.linkedInPostDate('https://www.linkedin.com/posts/sin-id'), '');
const POST_LINK = 'https://www.linkedin.com/posts/ana_hiring-activity-7380000000000000000-abcd';
assert.ok(context.isReachablePost({ link: POST_LINK, description: 'Hiring UI Designer - LATAM remote' }));
assert.ok(context.isReachablePost({ link: POST_LINK, description: 'Buscamos diseñador UX en Bogotá' }));
assert.ok(!context.isReachablePost({ link: POST_LINK, description: "We're hiring at Tata Elxsi, Bangalore. Looking for UX designers" }));
assert.ok(!context.isReachablePost({ link: POST_LINK, description: 'Dhanraj G - hiring #remotejobs #videoannotation' }));
assert.ok(!context.isReachablePost({ link: POST_LINK, description: 'Hiring #remotejobs video annotation, UI tool experience, remote' }));
assert.ok(context.isReachablePost({ link: POST_LINK, description: 'We are hiring a Product Designer, remote LATAM' }));
// Páginas de listados de LinkedIn y ofertas caducadas no son publicaciones
assert.ok(!context.isReachablePost({ link: 'https://co.linkedin.com/jobs/dise%C3%B1ador-ux-ui-empleos', description: 'Vacantes de diseñador ux ui remoto en Colombia' }));
assert.ok(!context.isReachablePost({ link: POST_LINK, description: 'Oferta Caducada - Diseñador UX remoto Colombia' }));
assert.ok(/^site:linkedin\.com\/posts \("product designer"/.test(context.buildLinkedInPostsQuery('"product designer"')));
assert.strictEqual(links(['https://bebee.com/co/jobs/1']).link, '');
assert.ok(context.isReachableRemoteJob({ location: 'Anywhere', description: 'Remote role, LATAM time zones' }));
assert.ok(!context.isReachableRemoteJob({ location: 'Anywhere', description: 'Remote, US only. Must reside in the US.' }));
assert.ok(!context.isReachableRemoteJob({ location: 'Berlin', description: 'Hybrid role in our Berlin office' }));
// Exclusiones y años de experiencia (decisiones del usuario 2026-10-19)
assert.strictEqual(context.exclusionReason({ title: 'UI Intern', description: 'Compensation: Unpaid Internship' }), 'pasantía no remunerada');
assert.strictEqual(context.exclusionReason({ title: 'Diseñador Web', description: 'modalidad freelance por proyecto' }), 'por proyecto / freelance');
assert.strictEqual(context.exclusionReason({ title: 'UX', description: 'blah #J-18808-Ljbffr' }), 'copia de JobLeads');
assert.strictEqual(context.exclusionReason({ title: 'UI/UX Designer', description: '12-month contract, 100% remote' }), null);
assert.strictEqual(context.exclusionReason({ title: 'UX Designer', description: 'Experiencia freelance o en agencia es un plus' }), null);
assert.strictEqual(context.exclusionReason({ title: 'UX Designer', description: 'Contrato indefinido. Trabajarás por proyectos con el equipo de producto' }), null);
assert.strictEqual(context.exclusionReason({ title: 'UI Designer', description: 'Contratación por proyecto, 3 meses' }), 'por proyecto / freelance');
assert.strictEqual(context.exclusionReason({ title: 'Diseñador Web UI/UX — Remoto (Freelance)', description: '' }), 'por proyecto / freelance');
assert.strictEqual(links(['https://www.upwork.com/freelance-jobs/apply/x']).link, '');
assert.strictEqual(context.requiredYears({ description: '6+ years of UI/UX or web design experience' }), 6);
assert.strictEqual(context.requiredYears({ description: 'Experiencia: Entre 2 y 5 años en UX/UI Design' }), 2);
assert.strictEqual(context.requiredYears({ description: 'En BairesDev llevamos 15 años liderando proyectos' }), null);
assert.strictEqual(context.classifySeniority({ title: 'Senior UX Designer', description: '3+ years of experience' }), 'mid');
assert.strictEqual(context.classifySeniority({ title: 'Senior UX Designer', description: '7 years of experience' }), 'senior');
assert.ok(context.computePriority({ title: 'UX', description: '6+ years of experience' }, 90) <
          context.computePriority({ title: 'UX', description: '3 years of experience' }, 80));
assert.strictEqual(context.parseGoogleJob({ title: 'X', extensions: ['30–80 an hour', 'hace 3 días'] }).postedAt, 'hace 3 días');
assert.strictEqual(context.parseGoogleJob({ title: 'X', extensions: ['30–80 an hour'] }).postedAt, '');
// Fuentes gratuitas: Remotive, Get on Board y Jobicy
const jcy = context.parseJobicyJob({ url: 'https://jobicy.com/jobs/1-ux', jobTitle: 'UX/UI Designer', companyName: 'Acme',
  jobGeo: 'LATAM', pubDate: '2026-10-15 10:00:00', jobDescription: '<p>Figma</p>' });
assert.ok(jcy.postedAt === '2026-10-15' && jcy.description === 'Figma' && /LATAM/.test(jcy.location));
const rem = context.parseRemotiveJob({ url: 'https://remotive.com/remote-jobs/design/ux-1', title: 'Product Designer', company_name: 'Acme',
  publication_date: '2026-10-15T10:00:00', candidate_required_location: 'LATAM', description: '<p>Hola &amp; <b>chao</b></p>' });
assert.strictEqual(rem.postedAt, '2026-10-15');
assert.strictEqual(rem.description, 'Hola & chao');
const gob = context.parseGetOnBoardJob({ id: 'ux-designer-acme', attributes: { title: 'UX Designer', remote: true, countries: ['Colombia'],
  published_at: 1792000000, description: '<p>Diseño</p>', company: { data: { attributes: { name: 'Acme' } } } },
  links: { public_url: 'https://www.getonbrd.com/jobs/design-ux/ux-designer-acme' } });
assert.strictEqual(gob.company, 'Acme');
assert.ok(/Remote LATAM Colombia/.test(gob.location) && /^\d{4}-\d{2}-\d{2}$/.test(gob.postedAt));
assert.ok(context.isDesignRole({ title: 'Diseñador UX/UI' }) && !context.isDesignRole({ title: 'Graphic Designer' }));
assert.ok(!context.isDesignRole({ title: 'Senior SEO & UX Copywriter' }) && !context.isDesignRole({ title: 'UX Writer' }));
assert.ok(context.isDesignRole({ title: 'Diseñador Digital' }) && context.isDesignRole({ title: 'Visual Designer' }));
assert.ok(!context.isDesignRole({ title: 'Administrador/a de Infraestructura Linux' }) && !context.isDesignRole({ title: 'Outsystems Front-end / UI Developer' }));
assert.ok(context.isDesignRole({ title: 'UI/UX Designer (Mobile Native)' }) && context.isDesignRole({ title: 'Diseñador(a) UX/UI' }));
assert.strictEqual(context.exclusionReason({ title: 'Staff Product Designer (Contract)', description: '' }), 'cargo de liderazgo (staff/principal/head/director/manager)');
assert.strictEqual(context.exclusionReason({ title: 'Senior UX Designer', description: '' }), null);
const loc = run('CONFIG.REACHABLE_REMOTE_LOCATION');
assert.ok(loc.test('Americas') && loc.test('UTC-5') && loc.test('GMT -3') && !loc.test('North America') && !loc.test('USA') && !loc.test('UTC+8'));
// Vacantes ya aplicadas: estado por color de carpeta, nombre de carpeta y empresa ya aplicada
assert.strictEqual(context.colorToStatus('#f83a22'), 'Rechazada');
assert.strictEqual(context.colorToStatus('#d06b64'), 'Rechazada');
assert.strictEqual(context.colorToStatus('#16a765'), 'En proceso');
assert.strictEqual(context.colorToStatus('#7bd148'), 'En proceso');
assert.strictEqual(context.colorToStatus('#fad165'), 'Aplicada, sin respuesta');
assert.strictEqual(context.colorToStatus('#ffad46'), 'Aplicada, sin respuesta');
assert.strictEqual(context.colorToStatus('#8f8f8f'), 'Aplicada');
assert.strictEqual(context.colorToStatus(undefined), 'Aplicada');
assert.deepStrictEqual(JSON.parse(JSON.stringify(context.parseAppliedFolderName('Publicis Groupe_Diseñador(a) UX_UI'))),
  { company: 'Publicis Groupe', title: 'Diseñador(a) UX/UI' });
assert.strictEqual(context.parseAppliedFolderName('Dropi').company, 'Dropi');
assert.ok(context.isAppliedCompany('Periferia IT Group', ['PeriferiaIT', 'Dropi']));
assert.ok(context.isAppliedCompany('Lite Thinking company', ['Lite Thinking']));
assert.ok(!context.isAppliedCompany('Nequi', ['PeriferiaIT', 'Dropi']));
assert.ok(!context.isAppliedCompany('CONFIDENTIAL', ['Confidential']));
// Fecha sin verificar: solo completa hasta MIN_DAILY (5)
const conFecha = n => Array.from({ length: n }, (_, i) => ({ vacancy: { title: 'v' + i }, seniority: 'mid', score: 80 }));
const sinFecha = n => Array.from({ length: n }, (_, i) => ({ vacancy: { title: 'u' + i, dateUnverified: true }, seniority: 'junior', score: 100 }));
assert.strictEqual(context.selectWithDateRule(conFecha(7).concat(sinFecha(4)), 10, 5, 5).length, 7);
const relleno = context.selectWithDateRule(conFecha(2).concat(sinFecha(6)), 10, 5, 5);
assert.strictEqual(relleno.length, 5);
assert.strictEqual(relleno.filter(x => x.vacancy.dateUnverified).length, 3);
assert.strictEqual(context.selectWithDateRule(sinFecha(2), 10, 5, 5).length, 2);
// Las publicaciones no cuentan para el mínimo de 5: no desplazan a las formales sin fecha verificada
const posts = n => Array.from({ length: n }, (_, i) => ({ vacancy: { title: 'p' + i, isPost: true }, seniority: 'mid', score: 80 }));
assert.strictEqual(context.selectWithDateRule(posts(8).concat(conFecha(1), sinFecha(6)), 15, 5, 5).filter(x => x.vacancy.dateUnverified).length, 4);
// Nombre del archivo del CV (guía Adaptia: HV_Nombre_Apellido_Cargo)
assert.strictEqual(context.buildCvFileName({ _nombre_archivo: 'HV_Ana_Pérez_Diseñador(a) UX/UI' }, {}, 'x'), 'HV_Ana_Pérez_Diseñador(a)_UX_UI');
assert.strictEqual(context.buildCvFileName({}, { title: 'UX Designer' }, 'x'), 'HV_UX_Designer');
assert.strictEqual(context.buildCvFileName({ _nombre_archivo: 'CV_malo' }, null, 'Acme_UX'), 'HV_Acme_UX');

// Publicaciones de LinkedIn
const post = context.parseLinkedInPost({ title: 'Ana Gómez en LinkedIn: Buscamos diseñador UX/UI junior | LinkedIn',
  snippet: 'Envía tu HV a ana@example.com', link: 'https://www.linkedin.com/posts/ana_1' });
assert.strictEqual(post.company, 'Post Ana Gómez');
assert.strictEqual(post.isPost, true);
assert.ok(!job.isPost);
assert.strictEqual(post.title, 'Buscamos diseñador UX/UI junior');
assert.strictEqual(context.extractContactEmail(post), 'ana@example.com');
assert.strictEqual(context.classifySeniority(post), 'junior');

// Correo de contacto y asunto
assert.strictEqual(context.extractContactEmail(es), 'talento@example.com');
assert.strictEqual(context.extractContactEmail({ snippet: 'sin correo' }), null);
assert.strictEqual(context.buildApplicationEmail(en, 'en').subject, 'Application: Junior UX/UI Designer - Demo Company EN');

// MIME del borrador: texto + HTML Sans Serif + PDF adjunto
const pdf = { getName: () => 'CV_Demo_EN.pdf', getBytes: () => [37, 80, 68, 70] };
const mime = context.buildMimeMessage('jobs@example.com', 'Asunto ñ', 'Hola\n\nChao', pdf);
assert.ok(mime.includes('multipart/mixed') && mime.includes('text/plain') && mime.includes('text/html'));
assert.ok(mime.includes('application/pdf') && mime.includes('JVBERg=='));
const htmlPart = mime.split('text/html; charset="UTF-8"')[1].split('\r\n\r\n')[1].split('\r\n--')[0];
assert.ok(Buffer.from(htmlPart.replace(/\r\n/g, ''), 'base64').toString().includes('sans-serif'));

// Fase 3: CV_IA.json (contrato + anti-alucinación)
const contexto = 'Diseñador Industrial. Practicante en Estudio Forma (2023), rediseño que redujo errores 30%. Figma.';
const marcadores = ['PERFIL_PERSONALIZADO', 'EMPRESA_EXP_1', 'LOGRO_1_1', 'LOGRO_1_2'];
const cvOk = context.parseCvJson('\uFEFF' + JSON.stringify({
  _idioma: 'es', _keywords: ['Figma'], _gaps: [], _correo_cuerpo: 'Hola, adjunto mi CV.',
  PERFIL_PERSONALIZADO: 'Diseñador Industrial con foco en UX y costos en $ (literal).',
  EMPRESA_EXP_1: 'Estudio Forma', LOGRO_1_1: 'Reduje errores en un 30% (2023).', LOGRO_1_2: '',
}));
assert.strictEqual(context.validateCvJson(cvOk, contexto, marcadores).errors.length, 0);
const malo = Object.assign({}, cvOk, { _idioma: 'fr', EMPRESA_EXP_1: 'Google', LOGRO_1_1: 'Aumenté ventas 45%' });
delete malo.LOGRO_1_2;
const erroresMalo = context.validateCvJson(malo, contexto, marcadores).errors.join('\n');
assert.ok(/_idioma/.test(erroresMalo) && /LOGRO_1_2/.test(erroresMalo) && /Google/.test(erroresMalo) && /"45"/.test(erroresMalo));
assert.ok(!/"30"/.test(erroresMalo));
assert.throws(() => context.parseCvJson('no es json'), /no es JSON válido/);
assert.throws(() => context.parseCvJson('[]'), /objeto/);
assert.strictEqual(context.shouldRemoveParagraph('{{LOGRO_1_2}}', cvOk), true);
assert.strictEqual(context.shouldRemoveParagraph('{{EMPRESA_EXP_1}} | {{LOGRO_1_2}}', cvOk), false);
assert.strictEqual(context.shouldRemoveParagraph('Idiomas: Español', cvOk), false);
// La HV nunca nombra a la empresa de la vacante (2026-10-24)
const target = { company: 'PadSplit', title: 'Senior Product Designer' };
assert.strictEqual(context.targetCompanyErrors({ PERFIL_PERSONALIZADO: 'Ready to help PadSplit grow.' }, target).length, 1);
assert.strictEqual(context.targetCompanyErrors({ PERFIL_PERSONALIZADO: 'Ready to help a housing marketplace grow.', _correo_cuerpo: 'Hi PadSplit team' }, target).length, 0);
assert.strictEqual(context.targetCompanyErrors({ EMPRESA_EXP_1: 'Seguros Bolívar S.A.', LOGRO_1_1: 'At Seguros Bolívar S.A. I led…' },
  { company: 'Seguros Bolívar S.A.' }).length, 0);  // vacante en una empresa donde ya trabajó
assert.strictEqual(context.targetCompanyErrors({ PERFIL_PERSONALIZADO: 'Confidential work' }, { company: 'CONFIDENTIAL' }).length, 0);

// Plantilla nueva (2026-10-24): un marcador vacío no borra una línea con texto fijo
assert.strictEqual(context.shouldRemoveParagraph('(+57) 300 | correo | {{UBICACION}} | LinkedIn', { UBICACION: '' }), false);
assert.strictEqual(context.shouldRemoveParagraph('{{CATEGORIA_SKILL_5}}: {{DETALLE_SKILL_5}}', { CATEGORIA_SKILL_5: '', DETALLE_SKILL_5: '' }), true);
assert.strictEqual(context.shouldRemoveParagraph('{{DESC_EXP_4}}', { DESC_EXP_4: '' }), true);
assert.ok(context.validateCvJson(Object.assign({}, cvOk, { UBICACION: '' }), contexto, marcadores.concat(['UBICACION'])).errors
  .some(e => /UBICACION no puede ir vacío/.test(e)));
assert.strictEqual(context.escapeRegex_('{{A_1}}'), '\\{\\{A_1\\}\\}');
const detalle = context.parseVacancyDetail(['Diseñador UX/UI Junior', 'Empresa: Acme', 'Link: https://x.co/1',
  'Idioma: EN', 'Correo de contacto: N/D', 'Descripción completa'].join('\n'));
assert.deepStrictEqual(JSON.parse(JSON.stringify(detalle)),
  { title: 'Diseñador UX/UI Junior', company: 'Acme', link: 'https://x.co/1', email: null, language: 'en' });

// Verificación antes de la HV (2026-10-24): veredicto de Verificacion.txt
const verdict = t => JSON.parse(JSON.stringify(context.parseVerdict(t)));
assert.deepStrictEqual(verdict('VEREDICTO: DESCARTAR\nMOTIVO: exige inglés fluido'), { verdict: 'DESCARTAR', reason: 'exige inglés fluido' });
assert.deepStrictEqual(verdict('Empresa — Cargo\nVeredicto: ❌ Cerrada (ya no recibe postulaciones)'),
  { verdict: 'DESCARTAR', reason: 'ya no recibe postulaciones' });
assert.strictEqual(verdict('veredicto: dudosa\nmotivo: medio tiempo').verdict, 'DUDOSA');
assert.strictEqual(verdict('Veredicto: ⏸️ Pendiente de decisión').verdict, 'DUDOSA');
assert.strictEqual(verdict('VEREDICTO: MENOR_PRIORIDAD').verdict, 'MENOR_PRIORIDAD');
assert.strictEqual(verdict('Veredicto: 🟡 Menor prioridad (pide 4+ años)').verdict, 'MENOR_PRIORIDAD');
assert.deepStrictEqual(verdict('**VEREDICTO:** DUDOSA\n**MOTIVO:** no dice si acepta Colombia'),
  { verdict: 'DUDOSA', reason: 'no dice si acepta Colombia' });
assert.strictEqual(verdict('- VEREDICTO: LISTA').verdict, 'LISTA');
assert.strictEqual(verdict('').verdict, null);
assert.strictEqual(verdict('Sin veredicto, solo notas: descartar luego').verdict, null);

// Guía de búsqueda y HV (2026-10-22): filtros nuevos, avisos cerrados y reglas de la HV
const ex = d => context.exclusionReason({ title: 'UX Designer', description: d });
assert.strictEqual(ex('Inglés intermedio y Figma avanzado'), null);
assert.strictEqual(ex('English: B2'), null);
assert.strictEqual(ex('Requisito: inglés avanzado (C1)'), 'exige inglés avanzado/fluido');
assert.strictEqual(ex('Fluent English required'), 'exige inglés avanzado/fluido');
assert.strictEqual(ex('Bilingual (Spanish/English)'), 'exige inglés avanzado/fluido');
// Prueba de la skill (2026-10-24): BairesDev y Hireloom entraron con estas frases
assert.strictEqual(ex('Requisitos: Nivel avanzado de inglés'), 'exige inglés avanzado/fluido');
assert.strictEqual(ex('English: Excellent oral and written skills'), 'exige inglés avanzado/fluido');
assert.strictEqual(ex('Excellent English communication'), 'exige inglés avanzado/fluido');
assert.strictEqual(ex('Nivel alto de inglés'), 'exige inglés avanzado/fluido');
assert.strictEqual(ex('Excelente manejo de Figma; inglés intermedio'), null);
// Inglés B2 (decisión del usuario 2026-10-24): un B1/B2 explícito pasa aunque lo llamen avanzado; fluido/nativo/bilingüe no
assert.strictEqual(ex('Requisitos: inglés avanzado (B2)'), null);
assert.strictEqual(ex('Advanced English (B2 level or higher)'), null);
assert.strictEqual(ex('Nivel de inglés: B2 o C1'), null);
assert.strictEqual(ex('Inglés C1'), 'exige inglés avanzado/fluido');
assert.strictEqual(ex('English level: C1 or above'), 'exige inglés avanzado/fluido');
assert.strictEqual(ex('Inglés fluido (B2)'), 'exige inglés avanzado/fluido');
assert.strictEqual(ex('Bilingüe español-inglés, mínimo B2'), 'exige inglés avanzado/fluido');
assert.strictEqual(ex('Upper intermediate English'), null);
const hidden = { 'bairesdev|disenador ui ux trabajo remoto': true, 'google|ux designer': true, 'https://x.co/1': true };
assert.ok(context.isHiddenCompanyRepeat({ company: 'confidential', title: 'Diseñador Ui/Ux Trabajo Remoto (Barranquilla)',
  description: 'En BairesDev® llevamos 15 años con clientes como Google' }, hidden));
assert.ok(!context.isHiddenCompanyRepeat({ company: 'confidential', title: 'Diseñador de Interfaz de Usuario Senior',
  description: 'En BairesDev® llevamos 15 años con clientes como Google' }, hidden));  // otro cargo
assert.ok(!context.isHiddenCompanyRepeat({ company: 'Acme', title: 'UX Designer', description: 'Trabajamos con Google' }, hidden));

assert.strictEqual(ex('We encourage people with disabilities to apply'), null);
assert.strictEqual(ex('Vacante exclusiva para personas con discapacidad'), 'exclusiva para personas con discapacidad');
assert.ok(vm.runInContext("CONFIG.BLOCKED_SOURCES.test('https://www.vacantes.com/oferta/1')", context));
assert.ok(context.isClosedPosting('<span>No longer accepting applications</span>'));
assert.ok(context.isClosedPosting('Esta oferta ha caducado'));
assert.ok(!context.isClosedPosting('Apply now'));
assert.strictEqual(context.forbiddenCvWords('Aprendiz Universitario (Voluntariado), experiencia internacional').join(','), 'aprendiz,voluntariado');
assert.strictEqual(context.forbiddenCvWords('Product Designer UX/UI (Fintech)').length, 0);
assert.strictEqual(context.buildCvFileName({ _nombre_archivo: 'HV_Oscar_Garcia_Diseñador UX/UI Junior (3)' }, { company: 'Acme Bank' }, ''),
  'HV_Oscar_Garcia_Diseñador_UX_UI');
assert.strictEqual(context.buildCvFileName({ _nombre_archivo: 'HV_Oscar_Garcia_Product_Designer_Acme_Bank' }, { company: 'Acme Bank' }, ''),
  'HV_Oscar_Garcia_Product_Designer');
assert.strictEqual(context.buildCvFileName({}, { company: 'Acme', title: 'Acme (2)' }, ''), 'HV_Product_Designer');
assert.strictEqual(context.buildCvFileName({ _nombre_archivo: 'HV_Oscar_Garcia_Diseñador UX/UI Junior' }, { company: 'Acme', title: 'Diseñador UX/UI Junior' }, ''),
  'HV_Oscar_Garcia_Diseñador_UX_UI_Junior');
assert.strictEqual(context.forbiddenCvWords('UX Designer Junior', true).length, 0);
assert.strictEqual(context.forbiddenCvWords('Aprendiz junior', true).join(','), 'aprendiz');
// Cargos: adaptados con lógica, no todos iguales ni todos copiando el de la vacante
const vacPD = { title: 'Product Designer' };
assert.strictEqual(context.cargoErrors({ CARGO_EXP_1: 'Product Designer', CARGO_EXP_2: 'UX/UI Design Lead', CARGO_EXP_3: '' }, vacPD).length, 0);
assert.ok(/mismo cargo/.test(context.cargoErrors({ CARGO_EXP_1: 'UX Designer', CARGO_EXP_2: 'ux  designer' }, vacPD).join()));
assert.ok(/copian el cargo/.test(context.cargoErrors({ CARGO_EXP_1: 'Product Designer', CARGO_EXP_2: 'Product designer ' , CARGO_EXP_3: 'x' }, vacPD).join()));
const cvJunior = Object.assign({}, cvOk, { PERFIL_PERSONALIZADO: 'Diseñador junior enfocado en research' });
assert.strictEqual(context.validateCvJson(cvJunior, contexto, marcadores, { title: 'UX Designer Junior' }).errors.length, 0);
assert.ok(context.validateCvJson(cvJunior, contexto, marcadores, { title: 'UX Designer' }).errors.length > 0);
const cvGuia = Object.assign({}, cvOk, { CARGO_EXP_1: 'Aprendiz Universitario', PERFIL_PERSONALIZADO: 'Enfoque: diseño' });
const erroresGuia = context.validateCvJson(cvGuia, contexto, marcadores).errors.join('\n');
assert.ok(/CARGO_EXP_1: palabra prohibida/.test(erroresGuia) && /sin dos puntos/.test(erroresGuia), erroresGuia);

// Carpetas: solo la empresa; con el detalle del cargo si ese día hay dos vacantes de la misma empresa
assert.strictEqual(context.shortRoleDetail('Product Designer Senior - Remoto LATAM', 'Acme'), 'Product Designer');
assert.strictEqual(context.shortRoleDetail('Acme | UX/UI Designer Junior (Bogotá)', 'Acme'), 'UX-UI Designer');
assert.strictEqual(context.shortRoleDetail('Acme', 'Acme'), 'Vacante');
assert.strictEqual(context.shortRoleDetail('UX/UI Designer Junior (Bogotá)', 'Acme'), 'UX-UI Designer');
assert.strictEqual(context.vacancyFolderNames([
  { company: 'Acme', title: 'Product Designer' }, { company: 'Globex', title: 'UX Designer' },
  { company: 'acme', title: 'Product Owner' }, { company: 'Acme', title: 'Product Designer Sr' },
]).join(' | '), 'Acme_Product Designer | Globex | acme_Product Owner | Acme_Product Designer 2');

// Publicaciones: un solo documento "Posts" del día con título, autor, fecha, enlace y fragmento
const entry = context.postEntry(context.parseLinkedInPost({ title: 'Ana Gómez en LinkedIn: Buscamos diseñador UX/UI | LinkedIn',
  snippet: 'Envía tu HV a ana@example.com', link: 'https://www.linkedin.com/posts/ana_1', date: '2026-10-20' }));
assert.strictEqual(entry.heading, 'Buscamos diseñador UX/UI · Ana Gómez · 2026-10-20');
assert.strictEqual(entry.link, 'https://www.linkedin.com/posts/ana_1');
assert.strictEqual(entry.snippet, 'Envía tu HV a ana@example.com');

// Cargo por funciones, no por título (2026-10-24): títulos dudosos entran marcados para revisar
assert.strictEqual(context.roleTitleClass('Diseñador UX/UI Junior'), 'design');
assert.strictEqual(context.roleTitleClass('Product & Content UX/UI Designer'), 'verify');
assert.strictEqual(context.roleTitleClass('CX Designer'), 'verify');
assert.strictEqual(context.roleTitleClass('Analista de Producto Digital'), 'verify');
assert.strictEqual(context.roleTitleClass('SEO Copywriter'), 'excluded');
assert.strictEqual(context.roleTitleClass('Design Engineer (React/TypeScript)'), 'excluded');
assert.strictEqual(context.roleTitleClass('Linux Administrator'), 'other');
const pv = { title: 'CX Designer', description: '' };
assert.ok(vm.runInContext('acceptRoleTitle_', context)(pv) && pv.roleToVerify === true);
assert.ok(context.computePriority({ title: 'CX Designer', roleToVerify: true }, 80) < context.computePriority({ title: 'CX Designer' }, 80));
// Misma empresa: solo es repetida si es el mismo cargo
assert.ok(context.sameRole('Diseñador UX/UI Junior', 'UX/UI Designer'));
assert.ok(context.sameRole('Product Designer (Remoto)', 'product designer senior'));
assert.ok(!context.sameRole('Product Designer', 'Product Owner'));
assert.ok(!context.sameRole('UX Researcher', 'UI Designer'));
assert.strictEqual(context.hvRoleFromFileName('HV_Nombre_Apellido_UI_UX_Designer.pdf'), 'UI UX Designer');
assert.strictEqual(context.hvRoleFromFileName('Vacante'), '');
assert.strictEqual(context.extractFolderId('=HYPERLINK("https://drive.google.com/drive/folders/1AbC-d_9","Abrir")'), '1AbC-d_9');
assert.ok(context.mentionsVacancy('Product Designer\nEmpresa: Acme', { title: 'Diseñador de producto', link: '' }));
assert.ok(context.mentionsVacancy('Ver https://co.linkedin.com/jobs/view/123?utm=x', { title: 'Otro', link: 'https://co.linkedin.com/jobs/view/123?utm_source=g' }));
assert.ok(context.mentionsVacancy('https://co.computrabajo.com/oferta-1?fgoa=true\n\n  \n\nGestor de Producto y UX/UI\nCali', { title: 'Gestor de producto y UX/UI - Cali', link: '' }));
assert.ok(context.sameRole('Gestor de Producto y UX/UI', context.hvRoleFromFileName('HV_Oscar_Garcia_Gestor_Producto_UX_UI.pdf')));
assert.ok(!context.mentionsVacancy('UX Researcher\nEmpresa: Acme', { title: 'UI Designer', link: 'https://a.co/1' }));

// HITL: ninguna llamada de envío de correo en el código
const allCode = fs.readdirSync(dir).map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
assert.ok(!/\.send\(|Messages\.send|sendEmail|GmailApp/.test(allCode), 'El agente no debe poder enviar correos');

// Cargador: descarga los .gs listados (aquí desde disco) y expone las funciones públicas
const loaderCtx = {
  UrlFetchApp: {
    fetch: (url) => {
      const name = url.split('/apps_script/')[1];
      return { getResponseCode: () => 200, getContentText: () => fs.readFileSync(path.join(dir, name), 'utf8') };
    },
  },
};
vm.createContext(loaderCtx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'instalador', 'Cargador.gs'), 'utf8'), loaderCtx);
const api = vm.runInContext('agente_()', loaderCtx);
for (const fn of ['ejecutarPipeline', 'ejecutarPrueba', 'ejecutarSimulacion', 'configurarAgente', 'generarCVsDesdeIA', 'probarCVsDesdeIA']) {
  assert.strictEqual(typeof api[fn], 'function', 'El cargador debe exponer ' + fn);
  assert.strictEqual(typeof loaderCtx[fn], 'function', 'Cargador.gs debe definir ' + fn + ' (activadores/editor)');
}

console.log('OK: todas las pruebas de apps_script pasaron');
