/**
 * Orquestador del pipeline diario (se ejecuta solo a las 7:00 AM).
 * Funciones para usar desde el editor: ejecutarPipeline, ejecutarPrueba, ejecutarSimulacion, generarCVsDesdeIA (CV.gs).
 */

/** Funciones públicas que expone el agente al Cargador (instalador/Cargador.gs). */
function exports_() {
  return { ejecutarPipeline, ejecutarPrueba, ejecutarSimulacion, configurarAgente, generarCVsDesdeIA, probarCVsDesdeIA,
           sincronizarAplicadas, crearBorradoresEnFrio, doGet, configurarTablero };
}

const SAMPLE_VACANCIES_ = [
  {
    title: 'Diseñador UX/UI Junior',
    company: 'Empresa Demo ES',
    link: 'https://www.linkedin.com/jobs/view/test-es-0001',
    location: 'Bogotá, Colombia',
    description: 'Buscamos diseñador UX/UI junior en Bogotá para apoyar la evolución de nuestro sistema de diseño ' +
                 'y la investigación con usuarios. Envía tu hoja de vida a talento@example.com',
    source: 'Vacante de prueba',
  },
  {
    title: 'Junior UX/UI Designer',
    company: 'Demo Company EN',
    link: 'https://www.linkedin.com/jobs/view/test-en-0002',
    location: 'Medellín, Colombia',
    description: 'We are looking for a junior UX/UI designer in Medellín to join the team working on our design ' +
                 'system and usability testing. Send your CV to jobs@example.com',
    source: 'Vacante de prueba',
  },
];

/** Ejecución real con SerpAPI (la usa el activador diario). */
function ejecutarPipeline() {
  runPipeline_({ useSample: false, dryRun: false });
}

/** Ejecución real sobre Drive/Docs/Sheets/Gmail con 2 vacantes de prueba (borradores a @example.com). */
function ejecutarPrueba() {
  runPipeline_({ useSample: true, dryRun: false });
}

/** Simulación: no toca Google Workspace, solo muestra en el registro lo que haría. */
function ejecutarSimulacion() {
  runPipeline_({ useSample: true, dryRun: true });
}

function runPipeline_(opts) {
  console.log('--- Iniciando Pipeline Diario de Vacantes ---' + (opts.dryRun ? ' [SIMULACIÓN]' : ''));

  const raw = opts.useSample ? SAMPLE_VACANCIES_ : searchUxJobs_();
  console.log('1. Vacantes encontradas preliminarmente: ' + raw.length);

  // Deduplicación determinista ANTES de cualquier procesamiento
  let sheet = null;
  let fresh = raw;
  if (!opts.dryRun) {
    sheet = getRegistrySheet_();
    const existing = getExistingUrls_(sheet);
    let applied = [];
    let cold = [];
    try {
      applied = getAppliedRecords_();  // La hoja la mantiene al día el activador horario de sincronizarAplicadas
    } catch (e) {
      console.warn('No se pudo leer la hoja ' + CONFIG.APPLIED_SHEET_NAME + ': ' + e.message);
    }
    try {
      cold = getColdEmailCompanies_();
    } catch (e) {
      console.warn('No se pudo leer la hoja ' + CONFIG.COLD_EMAIL_SHEET_NAME + ': ' + e.message);
    }
    const known = raw.filter(v => existing[v.link] || existing[vacancyKey(v)] || isHiddenCompanyRepeat(v, existing));
    // Empresa con carpeta en CV/ (decisión del usuario 2026-10-24): se abre la carpeta y solo es repetida si es el
    // mismo cargo (o la misma vacante); con otro cargo entra, con una nota para que el usuario lo tenga en cuenta.
    const appliedHits = [];
    raw.filter(v => !known.includes(v)).forEach(v => {
      const sameCompany = applied.filter(r => isAppliedCompany(v.company, [r.company]));
      if (sameCompany.length) {
        const match = sameCompany.filter(r => isSameAppliedVacancy_(v, r))[0];
        if (match) {
          appliedHits.push(v);
          return;
        }
        v.companyNote = 'Ya hay carpeta de esta empresa en CV (' + sameCompany.map(r => r.group + '/' + r.folderName).join(', ') +
                        ') con otro cargo: revísala antes de postular.';
      }
      if (isAppliedCompany(v.company, cold)) v.companyNote = (v.companyNote ? v.companyNote + ' ' : '') + 'Ya le escribiste en frío a esta empresa.';
    });
    fresh = raw.filter(v => v.link && !known.includes(v) && !appliedHits.includes(v));
    console.log('   Ya registradas: ' + known.length + '; ya aplicadas (mismo cargo en CV/): ' + appliedHits.length +
                (appliedHits.length ? ' (' + appliedHits.map(v => v.company + ' - ' + v.title).join(', ') + ')' : '') +
                '; de empresas con carpeta pero otro cargo: ' + raw.filter(v => v.companyNote).length);
  }
  if (!opts.useSample) fresh = verifyPostingDates_(fresh);
  const stats = { found: countByOrigin(raw), fresh: countByOrigin(fresh), created: {} };
  const logStats = () => {
    if (opts.dryRun || opts.useSample) return;
    try { logSourceStats_(stats.found, stats.fresh, stats.created); } catch (e) { console.warn('No se pudo escribir la pestaña Fuentes: ' + e.message); }
  };
  console.log('2. Vacantes nuevas y con <= ' + CONFIG.MAX_POST_AGE_DAYS + ' días: ' + fresh.length +
              ' (sin fecha verificable: ' + fresh.filter(v => v.dateUnverified).length + ')');
  if (!fresh.length) {
    console.log('No hay vacantes nuevas hoy. Pipeline finalizado.');
    logStats();
    return;
  }

  const scored = fresh.map(v => {
    const score = computeMatchScore(v);
    return { vacancy: v, score: score, priority: computePriority(v, score), seniority: classifySeniority(v) };
  });
  const selected = selectWithDateRule(scored, CONFIG.DAILY_LIMIT, CONFIG.MIN_JUNIOR, CONFIG.MIN_DAILY);
  console.log('3. Seleccionadas: ' + selected.length + ' (Junior: ' + selected.filter(x => x.seniority === 'junior').length + ')');

  // Primero las vacantes formales (pasan a la IA), luego las publicaciones (proceso manual)
  selected.sort((a, b) => (a.vacancy.isPost ? 1 : 0) - (b.vacancy.isPost ? 1 : 0));
  const startedAt = Date.now();
  const folderNames = vacancyFolderNames(selected.map(x => x.vacancy));
  const posts = [];
  selected.some((item, i) => {
    if (Date.now() - startedAt > CONFIG.TIME_BUDGET_MS) {
      console.warn('Se acaba el tiempo de Apps Script: quedan ' + (selected.length - i) +
                   ' vacantes sin crear; no se registraron, así que la próxima corrida las retoma.');
      return true;
    }
    const v = item.vacancy;
    const language = detectLanguage(vacancyText_(v));
    const label = '(' + (i + 1) + '/' + selected.length + ') ' + v.title + ' @ ' + (v.company || 'N/D') +
                  ' [' + language.toUpperCase() + ', ' + item.seniority + ', score ' + item.score + ', descripción ' +
                  (v.description || '').length + ' caracteres]';

    if (opts.dryRun) {
      console.log(label);
      return false;
    }

    if (v.isPost) {  // Van todas juntas al documento "Posts" del día (abajo), sin carpeta propia ni color
      posts.push(item);
      return false;
    }
    try {
      const folder = setupVacancyFolder_(v, folderNames[i]);
      createVacancyDetailDoc_(folder, v, item, language);
      // El CV personalizado y el borrador de Gmail los arma generarCVsDesdeIA (CV.gs) desde CV_IA.json.
      appendVacancyRow_(sheet, v, item.score, 'Esperando CV (IA)');
      stats.created[v.origin || 'Sin fuente'] = (stats.created[v.origin || 'Sin fuente'] || 0) + 1;
      console.log(label + ' -> carpeta, Detalle_Vacante y registro OK');
    } catch (e) {
      console.error(label + ' -> ERROR: ' + e.message);
    }
    return false;
  });

  if (posts.length && !opts.dryRun) {
    // Publicaciones de LinkedIn (decisión del usuario 2026-10-24): una sola carpeta "Posts" del día, sin color, con un
    // documento "Posts" que reúne todos los enlaces. Se registran en Sheets solo si el documento se escribió.
    try {
      addPostsToDailyDoc_(posts.map(x => x.vacancy));
      posts.forEach(x => appendVacancyRow_(sheet, x.vacancy, x.score, 'Manual (publicación)'));
      posts.forEach(x => { const o = x.vacancy.origin || 'Sin fuente'; stats.created[o] = (stats.created[o] || 0) + 1; });
      console.log('Publicaciones: ' + posts.length + ' enlaces en ' + CONFIG.PENDING_FOLDER_NAME + '/<hoy>/' +
                  CONFIG.POSTS_FOLDER_NAME + '/' + CONFIG.POSTS_DOC_NAME + ' (proceso manual)');
    } catch (e) {
      console.error('Publicaciones -> ERROR: ' + e.message);
    }
  }

  logStats();
  console.log('--- Pipeline Diario Finalizado ---');
}
