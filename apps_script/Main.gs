/**
 * Orquestador del pipeline diario (se ejecuta solo a las 8:00 AM).
 * Funciones para usar desde el editor: ejecutarPipeline, ejecutarPrueba, ejecutarSimulacion.
 */

/** Funciones públicas que expone el agente al Cargador (instalador/Cargador.gs). */
function exports_() {
  return { ejecutarPipeline, ejecutarPrueba, ejecutarSimulacion, configurarAgente };
}

const SAMPLE_VACANCIES_ = [
  {
    title: 'Diseñador UX/UI Junior',
    company: 'Empresa Demo ES',
    link: 'https://www.linkedin.com/jobs/view/test-es-0001',
    snippet: 'Buscamos diseñador UX/UI junior en Bogotá para apoyar la evolución de nuestro sistema de diseño ' +
             'y la investigación con usuarios. Envía tu hoja de vida a talento@example.com',
    source: 'Vacante de prueba',
  },
  {
    title: 'Junior UX/UI Designer',
    company: 'Demo Company EN',
    link: 'https://www.linkedin.com/jobs/view/test-en-0002',
    snippet: 'We are looking for a junior UX/UI designer in Medellín to join the team working on our design ' +
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

  const raw = opts.useSample ? SAMPLE_VACANCIES_ : searchJuniorUxJobs_();
  console.log('1. Vacantes encontradas preliminarmente: ' + raw.length);

  // Deduplicación determinista ANTES de cualquier procesamiento
  let sheet = null;
  let fresh = raw;
  if (!opts.dryRun) {
    sheet = getRegistrySheet_();
    const existing = getExistingUrls_(sheet);
    fresh = raw.filter(v => v.link && !existing[v.link]);
  }
  console.log('2. Vacantes nuevas: ' + fresh.length);
  if (!fresh.length) {
    console.log('No hay vacantes nuevas hoy. Pipeline finalizado.');
    return;
  }

  const ranked = fresh
    .map(v => ({ vacancy: v, score: computeMatchScore(v) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, CONFIG.DAILY_LIMIT);

  ranked.forEach((item, i) => {
    const v = item.vacancy;
    const language = detectLanguage(vacancyText_(v));
    const contact = extractContactEmail(v);
    const label = '(' + (i + 1) + '/' + ranked.length + ') ' + v.title + ' @ ' + (v.company || 'N/D') +
                  ' [' + language.toUpperCase() + ', score ' + item.score + ']';

    if (opts.dryRun) {
      const email = buildApplicationEmail(v, language);
      console.log(label + '\n   CV: ' + JSON.stringify(buildCvReplacements(v, language)) +
                  '\n   Borrador: ' + (contact ? contact + ' | ' + email.subject : 'sin correo directo'));
      return;
    }

    try {
      const folder = setupVacancyFolder_(v);
      createVacancyDetailDoc_(folder, v, item.score, language);
      const pdf = createTailoredCv_(v, folder, language);
      appendVacancyRow_(sheet, v, item.score);
      let draftInfo = 'sin correo directo, no se crea borrador';
      if (contact) {
        const email = buildApplicationEmail(v, language);
        draftInfo = 'borrador creado (' + createApplicationDraft_(contact, email.subject, email.body, pdf) + ')';
      }
      console.log(label + ' -> carpeta, CV/PDF, registro OK; ' + draftInfo);
    } catch (e) {
      console.error(label + ' -> ERROR: ' + e.message);
    }
  });

  console.log('--- Pipeline Diario Finalizado ---');
}
