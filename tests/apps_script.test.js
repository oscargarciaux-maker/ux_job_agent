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
assert.ok(context.isRecent('hace 3 días', 14) && context.isRecent('2 weeks ago', 14) && context.isRecent('', 14));
assert.ok(!context.isRecent('hace 3 semanas', 14) && !context.isRecent('hace 1 mes', 14));

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

// Fase 3: contrato CV_IA.json y anti-alucinación
const contexto = 'Diseñador Industrial. Practicante en Estudio Alfa (2023): rediseño que redujo 30% el tiempo de tarea, 1.200 usuarios.';
const marcadores = ['PERFIL_PERSONALIZADO', 'EMPRESA_EXP_1', 'LOGRO_1_1', 'LOGRO_1_3'];
const cv = { PERFIL_PERSONALIZADO: 'Diseñador industrial enfocado en UX', EMPRESA_EXP_1: 'Estudio Alfa',
  LOGRO_1_1: 'Reduje 30% el tiempo de tarea para 1,200 usuarios (2023)', LOGRO_1_3: '', _idioma: 'es',
  _keywords: ['Figma'], _gaps: [], _correo_cuerpo: 'Hola, adjunto mi CV.' };
assert.ok(context.validateCvJson(cv, marcadores, contexto).ok);
assert.strictEqual(context.parseCvJson('```json\n{"a": "$5"}\n```').a, '$5');
const malo = Object.assign({}, cv, { EMPRESA_EXP_1: 'Google', LOGRO_1_1: 'Aumenté 45% la conversión', _idioma: 'fr' });
delete malo.LOGRO_1_3;
const errores = context.validateCvJson(malo, marcadores, contexto).errors.join(' | ');
assert.ok(/LOGRO_1_3/.test(errores) && /45/.test(errores) && /Google/.test(errores) && /_idioma/.test(errores), errores);
assert.ok(!context.validateCvJson(Object.assign({}, cv, { _correo_cuerpo: 'Tengo 5 años de experiencia' }), marcadores, contexto).ok);
assert.ok(context.isBlankAfterRemoval(' — | ') && !context.isBlankAfterRemoval('Herramientas: Figma'));
const detalle = context.parseVacancyDetail('Diseñador UX Junior\nEmpresa: Acme\nLink: https://x.co/1\nCorreo de contacto: N/D');
assert.deepStrictEqual(Object.assign({}, detalle), { title: 'Diseñador UX Junior', company: 'Acme', link: 'https://x.co/1', email: '' });

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
for (const fn of ['ejecutarPipeline', 'ejecutarPrueba', 'ejecutarSimulacion', 'configurarAgente', 'generarCVsDesdeIA']) {
  assert.strictEqual(typeof api[fn], 'function', 'El cargador debe exponer ' + fn);
  assert.strictEqual(typeof loaderCtx[fn], 'function', 'Cargador.gs debe definir ' + fn + ' (activadores/editor)');
}

console.log('OK: todas las pruebas de apps_script pasaron');
