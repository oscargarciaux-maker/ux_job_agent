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
    formatDate: (d, tz, fmt) => {  // Bogotá (UTC-5), suficiente para las pruebas
      const b = new Date(d.getTime() - 5 * 3600000).toISOString();
      return fmt === 'yyyy-MM-dd' ? b.slice(0, 10) : b.slice(0, 16);
    },
  },
  Session: { getScriptTimeZone: () => 'America/Bogota' },
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
// Todo el texto de apps_script/ (sin carpetas como img/, que guarda imágenes)
const textFiles = () => fs.readdirSync(dir).filter(f => fs.statSync(path.join(dir, f)).isFile());

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
// Página ya leída al buscar (LinkedIn, elempleo, alertas): no se abre de nuevo. Sin tiempo: no se abre ninguna
// (27 oct 2026: la búsqueda tardó más de 4 min y la corrida se cortó a los 6 sin crear carpetas)
let abiertas = 0;
context.UrlFetchApp = { fetchAll: reqs => { abiertas += reqs.length; return reqs.map(() => ({ getResponseCode: () => 200, getContentText: () => '' })); } };
context.verifyPostingDates_([{ link: 'https://l.co/1', postedAt: haceDias(2), pageChecked: true }]);
assert.strictEqual(abiertas, 0);
const sinTiempo = context.verifyPostingDates_([{ link: 'https://x.co/1', postedAt: '' }, { link: 'https://x.co/2', postedAt: haceDias(2) }],
                                             Date.now() - run("CONFIG.VERIFY_BUDGET_MS") - 1000);
assert.strictEqual(abiertas, 0);
assert.ok(sinTiempo.length === 2 && sinTiempo[0].dateUnverified && !sinTiempo[1].dateUnverified);
// Por tandas mirando el reloj (27 oct 2026, 9:46: un solo fetchAll de todas las páginas tardó más de 5 min): si una
// tanda se come el tiempo, las demás no se abren y quedan "sin verificar" para la IA
let tandas = 0;
run('var __desfase = 0; Date.now = (orig => () => orig() + __desfase)(Date.now)');
context.UrlFetchApp = { fetchAll: reqs => { tandas++; run('__desfase += ' + (run('CONFIG.VERIFY_BUDGET_MS') + 1000)); return reqs.map(() => ({ getResponseCode: () => 200, getContentText: () => '' })); } };
const lentas = context.verifyPostingDates_(Array.from({ length: 20 }, (_, i) => ({ link: 'https://x.co/' + i, postedAt: '' })), run('Date.now()'));
run('__desfase = 0');
assert.strictEqual(tandas, 1, 'después de una tanda lenta no se abren más');
assert.ok(lentas.length === 20 && lentas.every(v => v.dateUnverified));
// Solo se abren las páginas sin fecha y nunca las de linkedin.com (27 oct 2026: la primera tanda, con LinkedIn, se colgó 4 min)
let abiertas2 = [];
context.UrlFetchApp = { fetchAll: reqs => { abiertas2 = abiertas2.concat(reqs.map(r => r.url)); return reqs.map(() => ({ getResponseCode: () => 200, getContentText: () => '' })); } };
const mix = context.verifyPostingDates_([{ link: 'https://www.linkedin.com/jobs/view/1', postedAt: '' },
                                        { link: 'https://co.linkedin.com/jobs/view/2', postedAt: haceDias(3) },
                                        { link: 'https://jobs.workable.com/view/3', postedAt: haceDias(3) },
                                        { link: 'https://remote.co/job/4', postedAt: '' }], run('Date.now()'));
assert.deepStrictEqual(abiertas2, ['https://remote.co/job/4']);
assert.ok(mix.length === 4 && mix[0].dateUnverified && !mix[1].dateUnverified && !mix[2].dateUnverified);
assert.ok(context.parseJobSpyJob({ sitio: 'indeed', enlace: 'https://co.indeed.com/viewjob?jk=1' }).pageChecked, 'Indeed responde 401 a Google: no se reabre');
assert.ok(run("CONFIG.SEARCH_BUDGET_MS") < run("CONFIG.VERIFY_BUDGET_MS") && run("CONFIG.TIME_BUDGET_MS") <= 5 * 60 * 1000);
// elempleo (3 min desde Google) ya no se consulta en la corrida: llega en el JSON de GitHub Actions, con su ficha leída
const fuentesSrc = fs.readFileSync(path.join(__dirname, '..', 'apps_script', 'Search.gs'), 'utf8');
assert.ok(!fuentesSrc.includes('[searchElempleo_,'), 'elempleo se busca en GitHub Actions');
const ee = context.parseJobSpyJob({ sitio: 'elempleo', titulo: 'Diseñador UX', empresa: 'X', ubicacion: 'Bogotá, Colombia',
                                    enlace: 'https://www.elempleo.com/co/ofertas-trabajo/x/1', fecha: '2026-10-25' });
assert.ok(ee.source === 'elempleo' && ee.origin === 'elempleo (GitHub Actions)' && ee.pageChecked && ee.sourceBonus === 3);
assert.strictEqual(context.parseJobSpyJob({ sitio: 'indeed', enlace: 'https://co.indeed.com/viewjob?jk=1' }).origin, 'Indeed (JobSpy)');
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
// LinkedIn (buscador público): tarjetas y detalle del aviso
// Calidad por fuente: qué pasó con lo que trajo cada una, según el Estado de Hoja 1
const calidad = context.sourceQualityRows([
  ['2026-10-27', 'A', 'UX', 'l1', 90, 'Pendiente', 'LinkedIn (GitHub Actions)'],
  ['2026-10-27', 'B', 'UX', 'l2', 90, 'Descartada: inglés fluido', 'LinkedIn (GitHub Actions)'],
  ['2026-10-27', 'C', 'UX', 'l3', 90, 'Dudosa: no dice si acepta Colombia', 'elempleo (GitHub Actions)'],
  ['2026-10-27', 'D', 'UX', 'l4', 90, 'Esperando CV (IA)', 'elempleo (GitHub Actions)'],
  ['2026-10-27', 'E', 'UX', 'l5', 90, 'Repetida (mismo aviso)', 'LinkedIn (GitHub Actions)'],
  ['2026-10-27', 'F', 'Post', 'l6', 90, 'Manual (publicación)', 'Publicaciones LinkedIn (SerpAPI)'],
  ['2026-10-20', 'G', 'UX', 'l7', 90, 'Pendiente', ''],
  ['2026-10-01', 'H', 'UX', 'l8', 90, 'Pendiente', 'Get on Board'],
], '2026-10-14');
assert.deepStrictEqual(JSON.parse(JSON.stringify(calidad)), [
  ['LinkedIn (GitHub Actions)', 3, 1, 0, 0, 1, 1, '33%'],
  ['Sin fuente (antes del 27 oct)', 1, 1, 0, 0, 0, 0, '100%'],
  ['elempleo (GitHub Actions)', 2, 0, 1, 1, 0, 0, '0%'],
]);
// Registro: el mismo aviso en otra ciudad ya registrado se reconoce por su clave base
assert.strictEqual(context.vacancyBaseKey({ company: 'Blacksmith Agency', title: 'Design Systems Lead (Remote, Ibague)' }),
                   context.vacancyBaseKey({ company: 'Blacksmith Agency', title: 'Design Systems Lead (Remote, Cartagena)' }));
const dupsMarcados = ['Design Systems Lead (Remote, Ibague)', 'Design Systems Lead (Remote, Cartagena)']
  .map((t, i) => ({ vacancy: { title: t, company: 'Blacksmith Agency', description: '' }, priority: 90 - i }));
context.distinctPostings(dupsMarcados, 5);
assert.ok(!dupsMarcados[0].vacancy.duplicate && dupsMarcados[1].vacancy.duplicate, 'la copia queda marcada para registrarla');
// Las tarjetas del buscador de LinkedIn se leen en GitHub Actions desde el 27 oct 2026: tests/jobspy_test.py
const liDetail = context.parseLinkedInJobDetail('<div class="show-more-less-html__markup relative">Buscamos <b>UX</b><br>Figma</div>');
assert.ok(/Buscamos UX/.test(liDetail.description) && /Figma/.test(liDetail.description) && !liDetail.closed);
assert.ok(context.parseLinkedInJobDetail('<figure class="closed-job">No longer accepting applications</figure>').closed);
// Mismo aviso por ciudad, misma descripción con otro cargo y tope por empresa (27 oct 2026: Blacksmith ocupó 7 de 20 cupos)
const bsDesc = 'We are hiring a designer to build and maintain our design system. '.repeat(6);
const bs = ['UI Systems Designer (Remote, Cucuta)', 'Design Systems Lead (Remote, Ibague)', 'Design Systems Lead (Remote, Cartagena)',
            'Senior Product Designer, Design Systems (Remote, Barranquilla)', 'Senior Product Designer, Design Systems (Remote, Cali)']
  .map((t, i) => ({ vacancy: { title: t, company: 'Blacksmith Agency', description: i ? '' : bsDesc }, priority: 90 - i }));
const conf = ['Profesional de comunicaciones y experiencia de usuario', 'Especialista en  comunicaciones y experiencia de usuario']
  .map((t, i) => ({ vacancy: { title: t, company: 'Empresa confidencial', description: bsDesc }, priority: 80 - i }));
const otraConf = { vacancy: { title: 'Diseñador UX', company: 'Empresa Confidencial', description: 'Otro texto distinto. '.repeat(15) }, priority: 70 };
const postBs = { vacancy: { title: 'Post', company: 'Blacksmith Agency', isPost: true }, priority: 10 };
const distintas = context.distinctPostings(bs.concat(conf, [otraConf, postBs]), 2);
assert.deepStrictEqual(distintas.map(x => x.vacancy.title),
  ['UI Systems Designer (Remote, Cucuta)', 'Design Systems Lead (Remote, Ibague)',
   'Profesional de comunicaciones y experiencia de usuario', 'Diseñador UX', 'Post']);
assert.strictEqual(context.distinctPostings(bs.slice(1, 3), 5).length, 1, 'mismo cargo en otra ciudad = mismo aviso');
assert.strictEqual(context.exclusionReason({ title: 'Diseñador/a de Experiencia de Cliente para personas con Discapacidad', description: '' }),
                   'exclusiva para personas con discapacidad');
assert.strictEqual(context.exclusionReason({ title: 'Diseñador UX', description: 'Promovemos la inclusión de personas con discapacidad.' }), null);
// elempleo (fecha relativa, tarjetas y ficha) se prueba en tests/jobspy_test.py: se busca en GitHub Actions
// Publicaciones de LinkedIn: la página pública trae el texto completo en su JSON-LD SocialMediaPosting (2026-10-26)
const liPost = context.parseLinkedInPostPage('<script type="application/ld+json">{"@context":"http://schema.org","@type":"SocialMediaPosting",' +
  '"datePublished":"2026-10-15T08:07:24.932Z","author":{"@type":"Person","name":"Ana Gómez"},"articleBody":"HIRING! Remote UI/UX Designer. Escribe a talento@empresa.co"}</script>');
assert.ok(liPost.date === '2026-10-15' && liPost.author === 'Ana Gómez' && /talento@empresa\.co/.test(liPost.text));
assert.strictEqual(context.parseLinkedInPostPage('<html>sin datos</html>'), null);

// Plan de búsqueda (2026-10-27): JobSpy, ATS de empresas objetivo, alertas de LinkedIn por correo, Brave y conteo por fuente
const jsj = context.parseJobSpyJob({ sitio: 'indeed', titulo: 'Diseñador UX/UI', empresa: 'Acme', ubicacion: 'Bogotá, D.C.',
  enlace: 'https://co.indeed.com/viewjob?jk=abc123', fecha: '2026-10-26', descripcion: 'Figma' });
assert.ok(jsj.source === 'Indeed' && jsj.link.includes('jk=abc123') && jsj.postedAt === '2026-10-26' && jsj.description === 'Figma');
let atc = context.atsCandidates('Treinta', 'https://treinta.co', 'https://jobs.lever.co/treinta/123');
assert.ok(atc.length === 1 && atc[0].ats === 'lever' && atc[0].slug === 'treinta');
atc = context.atsCandidates('Widetech Group', 'https://widetech.co', 'https://widetech.co/contactanos');
assert.ok(atc.some(t => t.ats === 'greenhouse' && t.slug === 'widetech') && atc.some(t => t.ats === 'ashby'));
assert.ok(context.atsApiUrl('ashby', 'x').includes('api.ashbyhq.com/posting-api/job-board/x'));
assert.ok(context.atsHasJobsShape('greenhouse', '{"jobs":[]}') && !context.atsHasJobsShape('greenhouse', '{"error":1}') &&
          context.atsHasJobsShape('lever', '[]') && !context.atsHasJobsShape('lever', '<html>'));
const gh = context.parseAtsJobs('greenhouse', JSON.stringify({ jobs: [{ title: 'Product Designer', location: { name: 'Bogotá' },
  absolute_url: 'https://boards.greenhouse.io/x/jobs/1', first_published: '2026-10-20T10:00:00Z', content: '&lt;p&gt;Figma&lt;/p&gt;' }] }), 'X');
assert.ok(gh[0].title === 'Product Designer' && gh[0].postedAt === '2026-10-20' && gh[0].description === 'Figma' && gh[0].company === 'X');
const lv = context.parseAtsJobs('lever', JSON.stringify([{ text: 'UX Designer', categories: { location: 'Remote LATAM' },
  hostedUrl: 'https://jobs.lever.co/x/1', createdAt: Date.UTC(2026, 9, 21), descriptionPlain: 'Research' }]), 'X');
assert.ok(lv[0].location.includes('Remote LATAM') && lv[0].postedAt === '2026-10-21' && lv[0].link.includes('lever.co'));
const ab = context.parseAtsJobs('ashby', JSON.stringify({ jobs: [{ title: 'Designer', location: 'Colombia', isRemote: true,
  jobUrl: 'https://jobs.ashbyhq.com/x/1', publishedAt: '2026-10-22T00:00:00Z', descriptionPlain: 'UI' }] }), 'X');
assert.ok(ab[0].location === 'Colombia Remote' && ab[0].postedAt === '2026-10-22');
const wk = context.parseAtsJobs('workable', JSON.stringify({ jobs: [{ title: 'UI Designer', city: 'Bogotá', country: 'Colombia',
  url: 'https://apply.workable.com/x/j/1', published_on: '2026-10-23' }] }), 'X');
assert.ok(wk[0].location.startsWith('Bogotá Colombia') && wk[0].postedAt === '2026-10-23');
const al = context.alertLinksFromHtml('<a href="https://www.linkedin.com/comm/jobs/view/4480720588/?trackingId=x&amp;refId=y">x</a>' +
  '<a href="https://www.linkedin.com/jobs/view/4480720588">dup</a><a href="https://www.linkedin.com/feed/update/urn%3Ali%3Aactivity%3A7516409382549766144">p</a>');
assert.deepStrictEqual(Array.from(al.jobIds), ['4480720588']);
assert.deepStrictEqual(Array.from(al.activityIds), ['7516409382549766144']);
// Cuerpo de Gmail en base64 web-safe sin relleno (27 oct 2026: "No se pudo descifrar la cadena")
assert.strictEqual(context.normalizeBase64('PGE-Pz8_'), 'PGE+Pz8/');
assert.strictEqual(context.normalizeBase64('aGk'), 'aGk=');
assert.strictEqual(context.normalizeBase64('aG\nk='), 'aGk=');
const ljd = context.parseLinkedInJobDetail('<h1 class="top-card-layout__title topcard__title">UX/UI Designer</h1>' +
  '<a class="topcard__org-name-link topcard__flavor--black-link" href="#"> Softgic </a>' +
  '<span class="topcard__flavor topcard__flavor--bullet"> Bogotá, Colombia </span><span class="posted-time-ago__text"> 6 days ago </span>');
assert.ok(ljd.title === 'UX/UI Designer' && ljd.company === 'Softgic' && ljd.location === 'Bogotá, Colombia' && ljd.postedAgo === '6 days ago');
const bq = context.buildBraveQueries(['hiring', 'buscamos'], ['ux designer'], 1, new Date('2026-10-27T12:00:00Z'));
assert.ok(bq.length === 1 && /^site:linkedin\.com\/posts "(hiring|buscamos)" "ux designer"$/.test(bq[0]));
assert.ok(!context.isReachablePost({ link: 'https://www.linkedin.com/posts/x-activity-1', description: '#OpenToWork Diseñador UX/UI remoto busco empleo' }));
const sr = context.sourceStatsRows({ date: '2026-10-27', time: '07:05', run: 'Búsqueda 07 h' }, { elempleo: 3, LinkedIn: 9 }, { LinkedIn: 4 }, { LinkedIn: 2 });
assert.deepStrictEqual(JSON.parse(JSON.stringify(sr)), [['2026-10-27', '07:05', 'Búsqueda 07 h', 'LinkedIn', 9, 4, 2],
                                                        ['2026-10-27', '07:05', 'Búsqueda 07 h', 'elempleo', 3, 0, 0]]);
assert.deepStrictEqual(JSON.parse(JSON.stringify(context.countByOrigin([{ origin: 'a' }, { origin: 'a' }, {}]))), { a: 2, 'Sin fuente': 1 });
assert.ok(!context.isReachablePost({ link: 'https://www.linkedin.com/posts/x-activity-1', description: 'Hiring remote UI/UX Designer, Figma. Thank you for the response, we got the people we wanted' }));
assert.ok(context.isReachablePost({ link: 'https://www.linkedin.com/posts/x-activity-1', description: 'Hiring remote UI/UX Designer, Figma' }));
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
assert.strictEqual(context.buildCvFileName({ _nombre_archivo: 'malo' }, null, 'Acme_UX'), 'HV_Acme_UX');
// HV en español, CV en inglés (2026-10-26): el prefijo del otro idioma se corrige
assert.strictEqual(context.buildCvFileName({ _idioma: 'en', _nombre_archivo: 'HV_Oscar_Garcia_UX_Designer' }, {}, 'x'), 'CV_Oscar_Garcia_UX_Designer');
assert.strictEqual(context.buildCvFileName({ _idioma: 'es', _nombre_archivo: 'CV_Oscar_Garcia_Diseñador_UX' }, {}, 'x'), 'HV_Oscar_Garcia_Diseñador_UX');
assert.strictEqual(context.buildCvFileName({ _idioma: 'en' }, { title: 'UX Designer' }, 'x'), 'CV_UX_Designer');

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
  _mapa: [{ keyword: 'Figma', cita: 'rediseño que redujo errores 30%. Figma', donde: 'PERFIL_PERSONALIZADO' }],
  PERFIL_PERSONALIZADO: 'Diseñador Industrial con foco en UX, Figma y costos en $ (literal).',
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

// Aplicadas (2026-10-25): cada vacante lleva la carpeta de semana de primer nivel, aunque esté dentro de una fecha
context.Drive = { Files: { list: ({ q }) => {
  const tree = {
    cv: [{ id: 'w1', name: 'Primera semana nueva' }, { id: 'w2', name: 'Tercera semana' }, { id: 'w4', name: '4. Cuarta semana' }],
    w1: [{ id: 'd1', name: '30-09' }], d1: [{ id: 'v1', name: 'Clara', createdTime: '2026-10-01T10:00:00Z' }],
    w2: [{ id: 'v2', name: 'Sole_UX UI Designer', createdTime: '2026-10-22T10:00:00Z', description: 'Enviada el 2026-10-27 (registrado desde el juego)' }, { id: 'p', name: 'Prueba' }],
    p: [{ id: 'v3', name: 'Ursus_UX Designer III', createdTime: '2026-10-23T10:00:00Z' }],
  };
  return { files: tree[/'([^']+)' in parents/.exec(q)[1]] || [] };
} } };
const appliedRows = [];
context.collectAppliedFolders_('cv', '', appliedRows, false, '');
assert.deepStrictEqual(JSON.parse(JSON.stringify(appliedRows.map(r => [r.group, r.week, r.company, r.status]))), [
  ['30-09', 'Primera semana nueva', 'Clara', 'Aplicada'],
  ['Tercera semana', 'Tercera semana', 'Sole', 'Aplicada'],
  ['Prueba', 'Tercera semana', 'Ursus', 'Preparada, sin enviar'],
], 'una semana recién creada y vacía no es una HV enviada (2026-10-26)');
// Todas las carpetas en una sola consulta (paginada), con la misma respuesta que la lectura carpeta por carpeta (2026-10-26)
{
  const all = [{ id: 'w1', name: 'S1', parents: ['cv'] }, { id: 'v1', name: 'Clara', parents: ['w1'] }, { id: 'w2', name: 'S2', parents: ['cv'] }];
  let calls = 0;
  context.Drive = { Files: { list: ({ q, pageToken }) => {
    calls++;
    assert.ok(!/in parents/.test(q), 'una sola consulta para todas las carpetas');
    return pageToken ? { files: all.slice(2) } : { files: all.slice(0, 2), nextPageToken: 't2' };
  } } };
  const kids = context.folderChildren_();
  const ids = id => JSON.parse(JSON.stringify(kids(id).map(f => f.id)));
  assert.deepStrictEqual(ids('cv'), ['w1', 'w2']);
  assert.deepStrictEqual(ids('w1'), ['v1']);
  assert.deepStrictEqual(ids('nada'), []);
  assert.strictEqual(calls, 2);
  const rows2 = [];
  context.collectAppliedFolders_('cv', '', rows2, false, '', kids);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(rows2.map(r => r.week + ':' + r.company))), ['S1:Clara'], 'S2 está vacía: es una semana, no una vacante');
  context.Drive = { Files: { list: () => { throw new Error('cuota'); } } };
  assert.strictEqual(context.folderChildren_(), context.listChildFolders_, 'si falla, vuelve a leer carpeta por carpeta');
}
assert.strictEqual(appliedRows[1].created, '2026-10-27', '«Ya la envié» guarda el día de envío real en la descripción de la carpeta');
assert.strictEqual(appliedRows[0].created, '2026-10-01');
assert.strictEqual(run("CONFIG.APPLIED_SHEET_HEADERS[7]"), 'Semana (carpeta)');
// Carpeta de postulaciones antiguas junto a CV/ (2026-10-25)
assert.ok(['Antigua', 'antiguas', 'Antiguo', ' ANTIGUA '].every(n => run('CONFIG.APPLIED_OLD_FOLDER_PATTERN').test(n.trim())));
assert.ok(!['Antigua semana', 'CV', 'Primera semana'].some(n => run('CONFIG.APPLIED_OLD_FOLDER_PATTERN').test(n)));
delete context.Drive;

// Por enviar (2026-10-25): HV de Sin revisar con su verificación y su revisión
const pcr = (...a) => JSON.parse(JSON.stringify(context.pendingCvRecord(...a)));
assert.deepStrictEqual(pcr('2026-10-24', 'PadSplit_Senior Product Designer', ['HV_Oscar_Garcia_Senior_Product_Designer'],
  'VEREDICTO: MENOR_PRIORIDAD\nMOTIVO: senior', 'VEREDICTO: LISTA_PARA_ENVIAR\nPAGINAS: 2'),
  { fecha: '2026-10-24', empresa: 'PadSplit', cargo: 'Senior Product Designer', hv: 'HV_Oscar_Garcia_Senior_Product_Designer',
    verificacion: 'Menor prioridad', revision: 'Lista para enviar' });
assert.strictEqual(pcr('2026-10-23', 'Ursus_UX Designer III', ['HV_x'], '', 'VEREDICTO: REVISAR').verificacion, 'Sin verificación');
assert.strictEqual(pcr('2026-10-23', 'Ursus_UX Designer III', ['HV_x'], '', 'VEREDICTO: REVISAR').revision, 'Revisar');
assert.strictEqual(context.pendingCvRecord('2026-10-23', 'Mercor', [], '', ''), null);
assert.ok(context.isCvFile_({ name: 'HV_Oscar', mimeType: 'application/vnd.google-apps.document' }));
assert.ok(context.isCvFile_({ name: 'CV_Oscar.pdf', mimeType: 'application/pdf' }));
assert.ok(!context.isCvFile_({ name: 'CV_IA.json', mimeType: 'application/vnd.google-apps.document' }));
assert.ok(!context.isCvFile_({ name: 'HV_notas.txt', mimeType: 'text/plain' }));

// Mañana compacta (2026-10-25): generarCVsDesdeIA corre cada 10 min, solo trabaja dentro de su ventana
assert.ok(!context.isWithinCvWindow(4) && context.isWithinCvWindow(5) && context.isWithinCvWindow(22) &&
  !context.isWithinCvWindow(23));
const setupCode = fs.readFileSync(path.join(dir, 'Setup.gs'), 'utf8');
assert.ok(/'generarCVsDesdeIA'\)\.timeBased\(\)\.everyMinutes\(CONFIG\.CV_EVERY_MINUTES\)/.test(setupCode));
// Mañana condensada (2026-10-27): búsqueda 5:00 y repaso 5:45, cada una con nearMinute (±15 min) y sin cruzarse
assert.ok(/PIPELINE_HOURS\.forEach\([\s\S]*atHour\(h\)\.nearMinute\(m\)/.test(setupCode));
assert.deepStrictEqual(JSON.parse(JSON.stringify(run('CONFIG.PIPELINE_HOURS'))), [[5, 0], [5, 45]]);
// SerpAPI una sola vez al día (100 créditos al mes): el repaso y las corridas a mano no gastan créditos
assert.ok(context.serpApiDue(null, '2026-10-28') && context.serpApiDue('2026-10-27', '2026-10-28'));
assert.ok(!context.serpApiDue('2026-10-28', '2026-10-28'));
const searchCode = fs.readFileSync(path.join(dir, 'Search.gs'), 'utf8');
assert.ok(/serpDue && CONFIG\.LINKEDIN_POST_ROLE_POOL/.test(searchCode) && /queries = !serpDue \? \[\]/.test(searchCode));
assert.ok(!/CV_HOUR\b/.test(textFiles().map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n')));

// Guía de búsqueda y HV (2026-10-22): filtros nuevos, avisos cerrados y reglas de la HV
const ex = d => context.exclusionReason({ title: 'UX Designer', description: d });
assert.strictEqual(ex('Inglés intermedio y Figma avanzado'), null);
assert.strictEqual(ex('English: B2'), null);
assert.strictEqual(ex('Requisito: inglés avanzado (C1)'), 'exige inglés C1/C2');
assert.strictEqual(ex('Fluent English required'), 'exige inglés fluido, nativo o bilingüe');
assert.strictEqual(ex('Bilingual (Spanish/English)'), 'exige inglés fluido, nativo o bilingüe');
// Desde 2026-10-27 (decisión del usuario) "avanzado/alto/excelente" sin nivel no descarta: baja de prioridad
const enAdv = d => ({ ex: ex(d), adv: context.englishAdvanced({ title: 'UX Designer', description: d }) });
['Requisitos: Nivel avanzado de inglés', 'English: Excellent oral and written skills', 'Excellent English communication',
 'Nivel alto de inglés', 'Advanced English required'].forEach(d => {
  const r = enAdv(d);
  assert.ok(r.ex === null && r.adv, d);
});
assert.ok(!enAdv('Excelente manejo de Figma; inglés intermedio').adv && enAdv('Excelente manejo de Figma; inglés intermedio').ex === null);
const pr = v => context.computePriority(v, 90);
assert.strictEqual(pr({ title: 'UX', description: 'Nivel alto de inglés' }), pr({ title: 'UX', description: 'Figma' }) - 15);
// Inglés B2 (decisión del usuario 2026-10-24): un B1/B2 explícito pasa aunque lo llamen avanzado; fluido/nativo/bilingüe no
assert.ok(enAdv('Requisitos: inglés avanzado (B2)').ex === null && !enAdv('Requisitos: inglés avanzado (B2)').adv);
assert.strictEqual(ex('Advanced English (B2 level or higher)'), null);
assert.strictEqual(ex('Nivel de inglés: B2 o C1'), null);
assert.strictEqual(ex('Inglés C1'), 'exige inglés C1/C2');
assert.strictEqual(ex('English level: C1 or above'), 'exige inglés C1/C2');
assert.strictEqual(ex('Inglés fluido (B2)'), 'exige inglés fluido, nativo o bilingüe');
assert.strictEqual(ex('Bilingüe español-inglés, mínimo B2'), 'exige inglés fluido, nativo o bilingüe');
assert.strictEqual(ex('Upper intermediate English'), null);
const enSum = context.englishAdvancedSummary([['2026-10-27', 'A', 'UX', 'l', 90, 'Pendiente', 'X', 'Inglés avanzado'],
  ['2026-10-27', 'B', 'UX', 'l', 90, 'Descartada: no acepta B2', 'X', 'Inglés avanzado'], ['2026-10-27', 'C', 'UX', 'l', 90, 'Pendiente', 'X', '']], '2026-10-14');
assert.ok(enSum.total === 2 && enSum.hv === 1 && enSum.out === 1);
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
const cvJunior = Object.assign({}, cvOk, { PERFIL_PERSONALIZADO: 'Diseñador junior enfocado en research con Figma' });
assert.strictEqual(context.validateCvJson(cvJunior, contexto, marcadores, { title: 'UX Designer Junior' }).errors.length, 0);
assert.ok(context.validateCvJson(cvJunior, contexto, marcadores, { title: 'UX Designer' }).errors.length > 0);
const cvGuia = Object.assign({}, cvOk, { CARGO_EXP_1: 'Aprendiz Universitario', PERFIL_PERSONALIZADO: 'Enfoque: diseño' });
const erroresGuia = context.validateCvJson(cvGuia, contexto, marcadores).errors.join('\n');
assert.ok(/CARGO_EXP_1: palabra prohibida/.test(erroresGuia) && /sin dos puntos/.test(erroresGuia), erroresGuia);

// Personalización comprobable (2026-10-25): mapa de evidencia y keywords principales fuera de las habilidades
{
  const ctx = 'Realicé investigación UX con el personal de ventas para identificar barreras de adopción y diseñé una vista de administración restringida. Orquesté el desarrollo integral mediante código asistido (*Vibecoding*).';
  assert.strictEqual(context.keywordCovered('Prototyping', 'Built interactive prototypes in Figma'), true, 'raíz de la palabra');
  assert.strictEqual(context.keywordCovered('Internal tools', 'Designed an internal admin tool'), true);
  assert.strictEqual(context.keywordCovered('A/B testing', 'Ran usability testing'), false);
  assert.strictEqual(context.keywordCovered('UX', 'Lux design'), false, 'las siglas piden la palabra exacta');
  assert.strictEqual(context.keywordCovered('A/B testing', 'Ran A/B tests'), true);
  assert.strictEqual(context.keywordCovered('UX/UI Design', 'UX/UI designer for web'), true);
  assert.strictEqual(context.keywordCovered('Diseño conversacional', 'Diseñé flujos conversacionales con IA'), true);
  assert.strictEqual(context.keywordCovered('Design systems', 'Built a tokenized design system'), true);
  assert.strictEqual(context.keywordCovered('Internal tools', 'Ran stakeholder interviews'), false, 'internal no es interviews');
  const base = { _keywords: ['Internal tools', 'Vibecoding', 'A/B testing'],
    _mapa: [
      { keyword: 'Internal tools', cita: 'diseñé una vista de administración restringida', donde: 'LOGRO_1_1' },
      { keyword: 'Vibecoding', cita: 'Orquesté el desarrollo integral mediante código asistido (Vibecoding)', donde: 'LOGRO_1_2' },
      { keyword: 'A/B testing', cita: '', donde: 'GAP' },
    ],
    PERFIL_PERSONALIZADO: 'Designer who builds internal tools with research.', LOGRO_1_1: 'Designed a restricted internal admin view.',
    LOGRO_1_2: 'Built the store through AI-assisted vibecoding with Claude and Gemini.', DETALLE_SKILL_1: 'A/B testing' };
  assert.deepStrictEqual(Array.from(context.personalizationErrors(base, ctx)), [], 'GAP exento; cita con otros signos sí cuenta');
  const soloSkills = Object.assign({}, base, { LOGRO_1_2: 'Built the store with Claude.', DETALLE_SKILL_1: 'Vibecoding' });
  assert.ok(/Vibecoding" no aparece/.test(context.personalizationErrors(soloSkills, ctx).join()), 'solo en habilidades no basta');
  const inventada = Object.assign({}, base, { _mapa: [base._mapa[0], { keyword: 'Vibecoding', cita: 'Lideré un equipo de vibecoding de 10 personas', donde: 'LOGRO_1_2' }, base._mapa[2]] });
  assert.ok(/cita de "Vibecoding" no está textual/.test(context.personalizationErrors(inventada, ctx).join()));
  assert.ok(/falta el mapa/.test(context.personalizationErrors(Object.assign({}, base, { _mapa: [] }), ctx).join()));
  assert.ok(/falta la keyword "A\/B testing"/.test(context.personalizationErrors(Object.assign({}, base, { _mapa: base._mapa.slice(0, 2) }), ctx).join()));
}

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

// Correos en frío (skill correo-en-frio, 2026-10-24): Guía Maestra de Cover Letters = máximo 35 palabras
assert.strictEqual(run('countEmailWords')('Hola Ana, vi que lanzaron pagos QR. Adjunto mi HV, [LinkedIn](https://linkedin.com/in/x) y https://x.app'), 12);
const coldRows = [
  ['Ludus', 'contacto@ludussf.com; info@ludussf.com; talent@ludussf.com (BCC)', '', '', '', 'Rebotado parcialmente', 'Rebotes 20-oct: info@ y talent@ (550)', ''],
  ['Dazzle', 'vlad@blue-storm.co.uk', '', '', '', 'Rebotado', 'Rebote 22-oct', ''],
  ['Movii', 'jobs@movii.com.co', '—', '', '', 'Borrador preparado, no enviado', '', ''],
];
const contacted = run('contactedAddresses')(coldRows);
assert.deepStrictEqual(JSON.parse(JSON.stringify(contacted)), { 'contacto@ludussf.com': 'usado', 'info@ludussf.com': 'rebotado', 'talent@ludussf.com': 'rebotado',
  'vlad@blue-storm.co.uk': 'rebotado', 'jobs@movii.com.co': 'borrador' });
const coldCtx = 'Logré que el 93% de los casos se resolvieran por canales digitales. Reduje en un 83% las reuniones.';
const mail = (over) => Object.assign({ para: 'talento@empresa.co', asunto: 'Diseñador UX/UI - Pagos digitales',
  cuerpo: 'Hola, vi que Empresa lanzó pagos con QR para comercios. Llevé al 93% la resolución digital de reclamos en una aseguradora. ¿Conversamos 10 minutos? Adjunto HV, [LinkedIn](https://linkedin.com/in/x) y [Portafolio](https://x.app).',
  fuente: 'https://empresa.co/trabaja-con-nosotros', fecha_fuente: '2026-09' }, over);
const coldData = (correos) => ({ empresa: 'Empresa', idioma: 'es', firma: 'Oscar Garcia', correos: correos });
let cold = run('validateColdEmails')(coldData([mail({})]), coldCtx + ' 10', contacted);
assert.deepStrictEqual(Array.from(cold.errors), []);
assert.strictEqual(cold.recipients.length, 1);
cold = run('validateColdEmails')(coldData([mail({})]), coldCtx, contacted);
assert.ok(cold.errors.some(e => /cifra 10/.test(e)), 'el "10 minutos" debe estar respaldado por CONTEXTO_CV');
cold = run('validateColdEmails')(coldData([mail({ cuerpo: Array(36).fill('palabra').join(' ') })]), coldCtx, contacted);
assert.ok(cold.errors.some(e => /36 palabras/.test(e)));
cold = run('validateColdEmails')(coldData([mail({ fuente: '' })]), coldCtx + ' 10', contacted);
assert.ok(cold.errors.some(e => /fuente/.test(e)));
cold = run('validateColdEmails')(coldData([mail({ para: 'info@ludussf.com' }), mail({ para: 'jobs@movii.com.co' }), mail({})]), coldCtx + ' 10', contacted);
assert.deepStrictEqual(Array.from(cold.errors), []);
assert.deepStrictEqual(Array.from(cold.recipients.map(r => r.para)), ['talento@empresa.co']);
assert.strictEqual(cold.warnings.length, 2);
// Reemplazar borradores sin enviar (2026-10-25): solo con "reemplazar": true y solo si la dirección no se envió
cold = run('validateColdEmails')(Object.assign(coldData([mail({ para: 'jobs@movii.com.co' }), mail({ para: 'info@ludussf.com' })]), { reemplazar: true }), coldCtx + ' 10', contacted);
assert.deepStrictEqual(Array.from(cold.recipients.map(r => r.para + ':' + r.reemplaza)), ['jobs@movii.com.co:true']);
assert.strictEqual(cold.warnings.length, 1);
const sentAndDraft = run('contactedAddresses')([['A', 'x@a.co', '', '', '', 'Borrador preparado, no enviado', '', ''], ['A', 'x@a.co', '2026-10-21', '', '', 'Enviado, sin rebote', 'Sin respuesta', '']]);
assert.strictEqual(sentAndDraft['x@a.co'], 'usado', 'una dirección ya enviada nunca se reescribe');
assert.strictEqual(run('contactedAddresses')([['A', 'y@a.co', '', '', '', 'Enviado, sin rebote (verif. 11:07)', '', '']])['y@a.co'], 'usado');
assert.strictEqual(run('unsentDraftRowIndex')(coldRows, 'JOBS@movii.com.co'), 2);
assert.strictEqual(run('unsentDraftRowIndex')(coldRows, 'vlad@blue-storm.co.uk'), -1);
// HV en frío armada por Apps Script desde CV_IA.json (2026-10-25): la "vacante" es solo la empresa; la HV no la nombra
const coldVacancy = run('coldCvVacancy')(' Movii ');
assert.strictEqual(coldVacancy.company, 'Movii');
assert.strictEqual(coldVacancy.title, null);
assert.strictEqual(context.targetCompanyErrors({ PERFIL_PERSONALIZADO: 'Quiero aportar a Movii.' }, coldVacancy).length, 1);
assert.strictEqual(context.buildCvFileName({ _nombre_archivo: 'HV_Oscar_Garcia_Diseñador_UX_UI' }, coldVacancy, ''), 'HV_Oscar_Garcia_Diseñador_UX_UI');
assert.strictEqual(context.buildCvFileName({ _nombre_archivo: 'HV_Oscar_Garcia_Movii' }, coldVacancy, '').indexOf('Movii'), -1);
assert.strictEqual(run('coldCvVacancy')('').company, null);
cold = run('validateColdEmails')(coldData([mail({ cuerpo: 'Soy practicante de diseño. ¿Conversamos?' })]), coldCtx, contacted);
assert.ok(cold.errors.some(e => /prohibidas/.test(e)));
assert.ok(run('validateColdEmails')({ empresa: 'X', idioma: 'fr', correos: [] }, '', {}).errors.length >= 3);
// Decisiones del usuario (2026-10-24): el nombre de la empresa no cuenta en las 35 palabras, el asunto que se envía no
// lo lleva (el borrador lo muestra como prefijo) y si la dirección es de una persona se la saluda por su nombre
assert.strictEqual(run('countEmailWords')('Hola Ana, en Banco de Bogotá vi su app.', 'Banco de Bogotá'), 6);
assert.strictEqual(run('coldDraftSubject')('Bold', 'Diseñador UX/UI - Pagos'), '[Bold] Diseñador UX/UI - Pagos');
cold = run('validateColdEmails')(coldData([mail({ asunto: 'Diseñador UX/UI - Empresa' })]), coldCtx + ' 10', contacted);
assert.ok(cold.errors.some(e => /asunto no puede llevar/.test(e)));
cold = run('validateColdEmails')(coldData([mail({ nombre: 'Ana Pérez' })]), coldCtx + ' 10', contacted);
assert.ok(cold.errors.some(e => /saludo debe ir a Ana/.test(e)));
cold = run('validateColdEmails')(coldData([mail({ nombre: 'Ana Pérez', cuerpo: mail({}).cuerpo.replace('Hola,', 'Hola Ana,') })]), coldCtx + ' 10', contacted);
assert.deepStrictEqual(Array.from(cold.errors), []);
cold = run('validateColdEmails')(coldData([mail({ cuerpo: 'Hola, vi que lanzaron pagos con QR. ¿Conversamos?' })]), coldCtx, contacted);
assert.ok(cold.warnings.some(w => /no menciona a Empresa/.test(w)));
assert.strictEqual(run('emailPlainText')('Ver [LinkedIn](https://l.in/x).'), 'Ver LinkedIn (https://l.in/x).');
assert.ok(run('emailHtml')('Ver [LinkedIn](https://l.in/x) y https://p.app').includes('<a href="https://l.in/x">LinkedIn</a> y <a href="https://p.app">https://p.app</a>'));
// El punto final de la frase no entra en el enlace (2026-10-26: borrador de TK Designs con "…lovable.app." roto)
assert.ok(run('emailHtml')('Portfolio: https://p.app. Gracias').includes('<a href="https://p.app">https://p.app</a>. Gracias'));

// Empresas objetivo: nombres reales de la pestaña frente al "empresa" corto de Correos.json (2026-10-24)
const tcm = run('targetCompanyMatches');
assert.ok(tcm('ADL Digital Lab (Aval Digital Labs)', 'ADL Digital Lab'));
assert.ok(tcm('Widetech Group', 'Widetech'));
assert.ok(tcm('AMD Agencia Digital', 'AMD'));
assert.ok(tcm('IAS Software', 'IAS Software'));
assert.ok(tcm('SUBE Agencia Digital', 'Sube agencia digital'));
assert.ok(!tcm('Treinta', 'Tangelo'));
assert.ok(!tcm('Panda Creativos', 'AMD'));
assert.ok(!tcm('', 'X'));
// Los encabezados que usa markTargetCompany_ existen en la pestaña
assert.ok(run("CONFIG.TARGET_COMPANIES_HEADERS.indexOf('Empresa') === 1 && CONFIG.TARGET_COMPANIES_HEADERS.indexOf('Estado') === 10"));

// Tablero web para el coach (2026-10-25): lógica pura de Dashboard.gs
context.Utilities.formatDate = (d, tz, fmt) => {
  const b = new Date(d.getTime() - 5 * 3600000).toISOString();  // Bogotá (UTC-5)
  return fmt === 'yyyy-MM-dd' ? b.slice(0, 10) : b.slice(0, 16);
};
assert.strictEqual(run('dashboardKeyOk')('abc', 'abc'), true);
assert.strictEqual(run('dashboardKeyOk')('abc', ''), false, 'sin clave guardada nadie entra');
assert.strictEqual(run('dashboardKeyOk')('', null), false);
assert.strictEqual(run('dashboardShareUrl')('https://script.google.com/macros/s/X/exec', 'k1'),
  'https://script.google.com/macros/s/X/exec?k=k1');
assert.strictEqual(run('dashboardShareUrl')('https://script.google.com/macros/s/X/dev', 'k1'), null,
  'el enlace de prueba /dev no se comparte');
assert.strictEqual(run('dashboardShareUrl')('', 'k1'), null);
assert.strictEqual(run('deploymentIdFromUrl')('https://script.google.com/macros/s/AKfy-cbx_1/exec'), 'AKfy-cbx_1');
assert.strictEqual(run('deploymentIdFromUrl')('https://script.google.com/macros/u/1/s/AKfy-cbx_1/exec'), 'AKfy-cbx_1');
assert.strictEqual(run('deploymentIdFromUrl')('https://script.google.com/macros/s/AKfy-cbx_1/dev'), '', 'el de prueba no sirve');
assert.strictEqual(run('deploymentIdFromUrl')(null), '');
// Enlaces de GitHub Pages que imprime configurarTablero (2026-10-27): la clave de escritura solo en el del usuario
assert.strictEqual(run('pagesLink')('juego', 'ID', 'k1', 'w1'), 'https://oscargarciaux-maker.github.io/ux_job_agent/apps_script/juego.html#api=ID&k=k1&e=w1');
assert.strictEqual(run('pagesLink')('dashboard', 'ID', 'k1', ''), 'https://oscargarciaux-maker.github.io/ux_job_agent/apps_script/dashboard.html#api=ID&k=k1');
assert.strictEqual(run('dashboardKeyOk')('x', 'abc'), false);
const unsafe = run('safeJsonForScript')({ a: '</script><script>alert(1)</script>&' });
assert.ok(!/<|>|&/.test(unsafe));
assert.strictEqual(JSON.parse(unsafe).a, '</script><script>alert(1)</script>&');
assert.deepStrictEqual(['Rechazada', 'En proceso', 'Aplicada, sin respuesta', 'Aplicada', 'Preparada, sin enviar', '']
  .map(x => run('applicationStatusKey')(x)), ['rechazada', 'proceso', 'sinRespuesta', 'aplicada', 'preparada', 'aplicada']);
assert.strictEqual(run('dashboardWeekName')('24-09-2026'), 'Primera semana');
assert.strictEqual(run('dashboardWeekName')('Tercera semana'), 'Tercera semana');
const dashModel = run('buildDashboardModel')({
  registro: [['Fecha', 'Empresa', 'Cargo', 'Link', 'Match Score', 'Estado'], ['2026-10-25', 'A', 'UX', 'l1', '100', 'Pendiente'],
             ['2026-10-01', 'B', 'UX', 'l2', '90', 'Pendiente']],
  aplicadas: { values: [['Grupo (carpeta)', 'Empresa', 'Cargo', 'Estado', 'Color', 'Carpeta', 'Creada', 'Semana (carpeta)'],
                        ['24-09-2026', 'Belcorp', '', 'Rechazada', '#f83a22', 'Abrir', '2026-09-24', '24-09-2026'],
                        ['x', 'Kanguro', 'UX', 'En proceso', '#16a765', 'Abrir', '2026-10-23', 'Tercera semana'],
                        ['x', 'Ursus', 'UX', 'Preparada, sin enviar', '', 'Abrir', '2026-10-23', 'Tercera semana'],
                        ['x', 'Mind', 'UX', 'Aplicada, sin respuesta', '', 'Abrir', '2026-10-22', 'Tercera semana']],
               links: [[], [, , , , , 'https://drive.google.com/a']] },
  porEnviar: { values: [['Fecha', 'Empresa', 'Cargo', 'Verificación', 'Revisión', 'Carpeta', 'HV']], links: [] },
  correos: [['Empresa', 'Destinatario(s)', 'Fecha y hora envío', 'Asunto', 'CV usado', 'Estado', 'Respuesta / info', 'Notas'],
            ['Ludus', 'a@l.co; b@l.co', '2026-10-20', 's', 'hv', 'Rebotado parcialmente', 'Rebote: b@l.co (550)', ''],
            ['Ceiba', 'c@c.co', '2026-10-20', 's', 'hv', 'Respondió', 'No activa', ''],
            ['Movii', 'd@m.co', '—', 's', 'hv', 'Borrador preparado, no enviado', '', '']],
  seguimiento: [['Fecha revisión', 'Empresa', 'Cargo', 'Carpeta', 'Hecho', 'Fecha del mensaje', 'Fuente', 'Estado anterior', 'Estado nuevo', 'Siguiente acción'],
                ['2026-10-25', 'Kanguro', 'UX', '', 'Prueba técnica', '2026-10-24', '', 'Aplicada', 'En proceso', 'Entregar prueba'],
                ['2026-10-25', 'REVISIÓN', '', '', 'Cobertura', '', '', '', '', '']],
  objetivo: [['Fecha', 'Empresa', 'Estado'], ['2026-10-24', 'X', 'En lote'], ['2026-10-24', 'Y', 'En lote']],
}, new Date('2026-10-25T15:00:00Z'), 'America/Bogota');
assert.strictEqual(dashModel.postulaciones.total, 3, 'las preparadas sin enviar no cuentan como enviadas');
assert.strictEqual(dashModel.postulaciones.preparadas, 1);
assert.strictEqual(dashModel.postulaciones.tasaRespuesta, 66.7);
assert.deepStrictEqual(Array.from(dashModel.postulaciones.semanas.map(w => w.semana + ':' + w.total)), ['Primera semana:1', 'Tercera semana:2']);
assert.strictEqual(dashModel.postulaciones.lista[0].carpeta, 'https://drive.google.com/a');
// Semanas de CV/ sin envíos todavía (2026-10-26): aparecen al final con 0 HV, así el juego sabe que empezó la Cuarta
{
  const conCarpetas = run('buildDashboardModel')({
    semanasCarpetas: [{ nombre: '3. Tercera semana', creada: '2026-10-20' }, { nombre: '4. Cuarta semana', creada: '2026-10-26' }],
    registro: [['Fecha']],
    aplicadas: { values: [['Grupo (carpeta)', 'Empresa', 'Cargo', 'Estado', 'Color', 'Carpeta', 'Creada', 'Semana (carpeta)'],
                          ['x', 'Sole', '', 'Aplicada', '', 'Abrir', '2026-10-18', '3. Tercera semana']], links: [] },
    porEnviar: { values: [], links: [] }, correos: [], seguimiento: [], objetivo: [],
  }, new Date('2026-10-26T15:00:00Z'), 'America/Bogota');
  assert.deepStrictEqual(Array.from(conCarpetas.postulaciones.semanas.map(w => w.semana + ':' + w.total + ':' + w.desde)),
    ['3. Tercera semana:1:2026-10-18', '4. Cuarta semana:0:2026-10-26']);
  assert.strictEqual(conCarpetas.postulaciones.total, 1);
}
assert.deepStrictEqual([dashModel.correos.enviados, dashModel.correos.entregados, dashModel.correos.rebotados, dashModel.correos.borradores],
  [3, 2, 1, 1], 'rebote parcial: solo la dirección que nombra la respuesta');
assert.strictEqual(dashModel.correos.empresasRespondieron, 1);
assert.strictEqual(dashModel.correos.empresasContactadas, 2);
assert.strictEqual(dashModel.vacantes.ultimos14, 1);
assert.strictEqual(dashModel.vacantes.porDia.length, 14);
assert.strictEqual(dashModel.seguimiento.length, 1, 'la fila REVISIÓN no es un movimiento');
assert.strictEqual(dashModel.objetivo.porEstado['En lote'], 2);
// Campos para el juego (2026-10-25)
assert.strictEqual(run('localDay')('2026-10-21T03:30:00.000Z', 'America/Bogota'), '2026-10-20', 'una carpeta creada de noche en Bogotá es de ese día');
assert.strictEqual(run('localDay')('', 'America/Bogota'), '');
{
  const byCompany = Object.fromEntries(dashModel.postulaciones.lista.map(a => [a.empresa, a.estadoFecha]));
  assert.strictEqual(byCompany.Kanguro, '2026-10-24', 'fecha del cambio de estado: la del mensaje en Seguimiento');
  assert.strictEqual(byCompany.Belcorp, '', 'un rechazo sin hallazgo en Seguimiento queda sin fecha');
  assert.strictEqual(byCompany.Mind, '');
  assert.strictEqual(dashModel.historial.length, 1);
  assert.strictEqual(dashModel.historial[0].empresa, 'Kanguro');
  const cold = Object.fromEntries(dashModel.correos.lista.map(c => [c.empresa, c]));
  assert.deepStrictEqual([cold.Ludus.entregadas, cold.Ludus.rebotadas, cold.Ludus.clave, cold.Ludus.dia], [1, 1, 'enviado', '2026-10-20']);
  assert.deepStrictEqual([cold.Ceiba.clave, cold.Movii.clave, cold.Movii.entregadas, cold.Movii.dia], ['respondio', 'borrador', 0, '']);
}
assert.strictEqual(dashModel.meta, 50);
assert.strictEqual(dashModel.submeta, 30, 'submeta semanal (2026-10-27): con 30 se gana la semana');
// Acciones del juego (2026-10-27): fecha de envío real, semana actual, filas de Seguimiento sin fórmulas y enlace de la vacante
assert.strictEqual(run('sentDayFromDescription')(run('sentDescription')('2026-10-27')), '2026-10-27');
assert.strictEqual(run('sentDayFromDescription')('Notas del usuario'), '');
assert.strictEqual(run('sentDayFromDescription')(undefined), '');
assert.strictEqual(run('pickCurrentWeek')([{ name: '0. Antiguas' }, { name: '4. Cuarta semana' }, { name: '3. Tercera semana' }]).name, '4. Cuarta semana');
assert.strictEqual(run('pickCurrentWeek')([{ name: 'Segunda semana', createdTime: '2026-10-08T00:00:00Z' }, { name: 'Tercera semana', createdTime: '2026-10-20T00:00:00Z' }]).name,
  'Tercera semana', 'sin números: la creada más tarde');
assert.strictEqual(run('pickCurrentWeek')([]), null);
assert.deepStrictEqual(Array.from(run('followupRow')(['Fecha revisión', 'Empresa', 'Hecho', 'Plazo'], { 'Empresa': 'Pavago', 'Hecho': '=IMPORTXML(1)', 'Otra': 'x', 'Fecha revisión': '2026-10-27' })),
  ['2026-10-27', 'Pavago', "'=IMPORTXML(1)", ''], 'en el orden del encabezado y sin fórmulas');
assert.strictEqual(run('safeCell')('+57 300'), "'+57 300");
// «Ya los envié» de los correos en frío (2026-10-27): solo borradores de esa empresa y las direcciones marcadas
{
  const v = [['Empresa', 'Destinatario(s)', 'Fecha y hora envío', 'Asunto', 'CV usado', 'Estado'],
    ['Movii', 'jobs@movii.com.co', '—', 's', 'hv', 'Borrador preparado, no enviado'],
    ['LinkTic', 'a@linktic.com', '2026-10-20 12:59', 's', 'hv', 'Enviado, sin rebote'],
    ['Movii', 'seleccion@moviired.co', '—', 's', 'hv', 'Borrador preparado, no enviado'],
    ['MOVII ', 'alejandra@movii.com.co', '—', 's', 'hv', 'Borrador preparado, no enviado'],
    ['Movii', 'viejo@movii.com.co', '2026-10-21', 's', 'hv', 'Enviado, sin rebote']];
  const marca = (e, p) => JSON.parse(JSON.stringify(run('coldRowsToMark')(v, e, p)));
  assert.deepStrictEqual(marca('Movii', []), [1, 3, 4], 'sin lista: todos los borradores de la empresa');
  assert.deepStrictEqual(marca('Movii', ['jobs@movii.com.co', ' SELECCION@moviired.co ']), [1, 3], 'solo las direcciones marcadas');
  assert.deepStrictEqual(marca('LinkTic', []), [], 'lo ya enviado no se toca');
  assert.deepStrictEqual(marca('', []), []);
  // El estado nuevo cuenta como enviado (no como borrador) para el juego y para no repetir direcciones
  const est = JSON.parse(JSON.stringify(run('contactedAddresses')([['X', 'z@x.co', '2026-10-27 10:00', '', '', run('COLD_SENT_STATUS_'), '']])));
  assert.deepStrictEqual(est, { 'z@x.co': 'usado' });
}
assert.strictEqual(run('safeCell')('Rechazada (rojo)'), 'Rechazada (rojo)');
{
  const reg = [{ 'Empresa': 'PadSplit', 'Cargo': 'Senior Product Designer', 'Link': 'https://jobicy.com/1' },
    { 'Empresa': 'Seguros Bolívar', 'Cargo': 'Diseñador UX', 'Link': 'https://magneto/1' },
    { 'Empresa': 'Seguros Bolívar', 'Cargo': 'Otro cargo', 'Link': 'https://magneto/2' },
    { 'Empresa': 'Post LinkedIn', 'Cargo': "Ursus, Inc.'s Post", 'Link': 'https://linkedin/posts/1' },
    { 'Empresa': 'Rara', 'Cargo': '', 'Link': 'javascript:alert(1)' }];
  const link = (empresa, cargo) => run('vacancyLinkFor')({ empresa, cargo }, reg);
  assert.strictEqual(link('PadSplit', 'Senior Product Designer'), 'https://jobicy.com/1');
  assert.strictEqual(link('Seguros Bolívar', 'Diseñador UX'), 'https://magneto/1', 'con varias filas, la del mismo cargo');
  assert.strictEqual(link('Ursus', 'UX Designer III'), '', 'sin fila de esa empresa no hay enlace');
  assert.strictEqual(link('Rara', ''), '', 'solo enlaces https');
  const conPorEnviar = run('buildDashboardModel')({
    registro: [['Fecha', 'Empresa', 'Cargo', 'Link', 'Match Score', 'Estado'], ['2026-10-24', 'PadSplit', 'Senior Product Designer', 'https://jobicy.com/1', '90', 'Pendiente']],
    aplicadas: { values: [], links: [] },
    porEnviar: { values: [['Fecha', 'Empresa', 'Cargo', 'Verificación', 'Revisión', 'Carpeta', 'HV'], ['2026-10-24', 'PadSplit', 'Senior Product Designer', 'Menor prioridad', 'Lista para enviar', 'Abrir', 'HV_x']],
      links: [[], [, , , , , 'https://drive.google.com/drive/folders/abc', 'https://drive.google.com/open?id=def']] },
    correos: [], seguimiento: [], objetivo: [],
  }, new Date('2026-10-27T15:00:00Z'), 'America/Bogota');
  assert.strictEqual(conPorEnviar.porEnviar[0].vacante, 'https://jobicy.com/1');
  assert.strictEqual(conPorEnviar.porEnviar[0].carpeta, 'https://drive.google.com/drive/folders/abc');
}
// Acciones pendientes: por empresa manda la fila más reciente; esperar respuesta no es una acción (2026-10-25)
{
  const f = (empresa, siguiente) => ({ empresa, siguiente });
  const acc = Array.from(run('pendingFollowups')([f('Experian', 'Esperar respuesta'), f('Pavago', 'Grabar el video'), f('Ceiba', 'Revisar vacantes'),
    f('Somewhere', 'Hacer la prueba'), f('EXPERIAN', 'Ninguna'), f('Pavago', 'Esperar respuesta'), f('Ceiba', 'Esperar respuesta'), f('Allinsoft', '')]));
  assert.deepStrictEqual(acc.map(r => r.empresa), ['Somewhere'], 'Pavago y Ceiba ya hechas; Experian rechazada');
  assert.deepStrictEqual(Array.from(dashModel.acciones.map(r => r.siguiente)), ['Entregar prueba']);
  // Empresa que ya no está en CV/, Por enviar ni Correos en frío: su acción deja de salir (2026-10-26, BruntWork)
  const vivas = ['Kanguro', 'Dazzle: Commercial & Office Cleaning | London', 'Ceiba', 'Sole'];
  assert.deepStrictEqual(['Kanguro Insurance', 'Dazzle (Blue Storm)', 'CEIBA', 'Sole', 'BruntWork', '', 'Trazo']
    .map(c => run('companyStillListed')(c, vivas)), [true, true, true, true, false, false, false],
    'ante la duda (nombres que empiezan igual) la acción sigue saliendo: es el lado seguro');
}
assert.ok(fs.readFileSync(path.join(dir, 'dashboard.html'), 'utf8').includes('/*__DATA__*/null'), 'dashboard.html necesita el marcador de datos');
{
  const dashHtml = fs.readFileSync(path.join(dir, 'dashboard.html'), 'utf8');
  assert.ok(/formato=json/.test(dashHtml) && /credentials: 'omit'/.test(dashHtml),
    'servida aparte, la página pide los datos sin cookies (varias cuentas de Google abiertas)');
  assert.ok(fs.existsSync(path.join(__dirname, '..', '.nojekyll')), 'GitHub Pages sirve la rama deploy sin Jekyll');
}

// HITL: ninguna llamada de envío de correo en el código
const allCode = textFiles().map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
assert.ok(!/\.send\(|Messages\.send|sendEmail|GmailApp/.test(allCode), 'El agente no debe poder enviar correos');

// Cargador: descarga los .gs listados (aquí desde disco) y expone las funciones públicas
const fromDisk = (url) => {
  const name = url.split('/apps_script/')[1];
  return { getResponseCode: () => 200, getContentText: () => fs.readFileSync(path.join(dir, name), 'utf8') };
};
const loaderCtx = {
  UrlFetchApp: { fetch: fromDisk, fetchAll: (reqs) => reqs.map(r => fromDisk(r.url)) },
};
vm.createContext(loaderCtx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'instalador', 'Cargador.gs'), 'utf8'), loaderCtx);
const api = vm.runInContext('agente_()', loaderCtx);
for (const fn of ['ejecutarPipeline', 'ejecutarPrueba', 'ejecutarSimulacion', 'configurarAgente', 'generarCVsDesdeIA', 'probarCVsDesdeIA',
                  'sincronizarAplicadas', 'crearBorradoresEnFrio', 'doGet', 'configurarTablero']) {
  assert.strictEqual(typeof api[fn], 'function', 'El cargador debe exponer ' + fn);
  assert.strictEqual(typeof loaderCtx[fn], 'function', 'Cargador.gs debe definir ' + fn + ' (activadores/editor)');
}
// El Cargador lee la caché del tablero con el mismo nombre que la escribe Dashboard.gs
assert.ok(fs.readFileSync(path.join(__dirname, '..', 'instalador', 'Cargador.gs'), 'utf8')
  .includes("get('" + run('CONFIG').DASHBOARD_CACHE_KEY + "')"), 'Cargador y Config deben usar la misma clave de caché');

console.log('OK: todas las pruebas de apps_script pasaron');
