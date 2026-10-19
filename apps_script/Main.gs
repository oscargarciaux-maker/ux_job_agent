/**
 * Orquestador del pipeline diario (se ejecuta solo a las 8:00 AM).
 * Funciones para usar desde el editor: ejecutarPipeline, ejecutarPrueba, ejecutarSimulacion, generarCVsDesdeIA (CV.gs).
 */

/** Funciones públicas que expone el agente al Cargador (instalador/Cargador.gs). */
function exports_() {
  return { ejecutarPipeline, ejecutarPrueba, ejecutarSimulacion, configurarAgente, generarCVsDesdeIA, probarCVsDesdeIA,
           sincronizarAplicadas };
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
    try {
      sincronizarAplicadas();
      applied = getAppliedCompanies_();
    } catch (e) {
      console.warn('No se pudo leer la carpeta de aplicadas: ' + e.message);
    }
    fresh = raw.filter(v => v.link && !existing[v.link] && !existing[vacancyKey(v)] && !isAppliedCompany(v.company, applied));
  }
  if (!opts.useSample) fresh = verifyPostingDates_(fresh);
  console.log('2. Vacantes nuevas y con <= ' + CONFIG.MAX_POST_AGE_DAYS + ' días: ' + fresh.length +
              ' (sin fecha verificable: ' + fresh.filter(v => v.dateUnverified).length + ')');
  if (!fresh.length) {
    console.log('No hay vacantes nuevas hoy. Pipeline finalizado.');
    return;
  }

  const scored = fresh.map(v => {
    const score = computeMatchScore(v);
    return { vacancy: v, score: score, priority: computePriority(v, score), seniority: classifySeniority(v) };
  });
  const selected = selectWithDateRule(scored, CONFIG.DAILY_LIMIT, CONFIG.MIN_JUNIOR, CONFIG.MIN_DAILY);
  console.log('3. Seleccionadas: ' + selected.length + ' (Junior: ' + selected.filter(x => x.seniority === 'junior').length + ')');

  selected.forEach((item, i) => {
    const v = item.vacancy;
    const language = detectLanguage(vacancyText_(v));
    const label = '(' + (i + 1) + '/' + selected.length + ') ' + v.title + ' @ ' + (v.company || 'N/D') +
                  ' [' + language.toUpperCase() + ', ' + item.seniority + ', score ' + item.score + ', descripción ' +
                  (v.description || '').length + ' caracteres]';

    if (opts.dryRun) {
      console.log(label);
      return;
    }

    try {
      const folder = setupVacancyFolder_(v);
      if (v.isPost) {
        createPostLinkDoc_(folder, v);
        setFolderColor_(folder, CONFIG.MANUAL_FOLDER_COLOR);
        appendVacancyRow_(sheet, v, item.score, 'Manual (publicación)');
        console.log(label + ' -> publicación: carpeta amarilla con el enlace (proceso manual)');
        return;
      }
      createVacancyDetailDoc_(folder, v, item, language);
      // El CV personalizado y el borrador de Gmail los arma generarCVsDesdeIA (CV.gs) desde CV_IA.json.
      appendVacancyRow_(sheet, v, item.score, 'Esperando CV (IA)');
      console.log(label + ' -> carpeta, Detalle_Vacante y registro OK');
    } catch (e) {
      console.error(label + ' -> ERROR: ' + e.message);
    }
  });

  console.log('--- Pipeline Diario Finalizado ---');
}
