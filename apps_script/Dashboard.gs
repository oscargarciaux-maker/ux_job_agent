/**
 * Tablero web para el coach (decisión del usuario 2026-10-25): una app web de Apps Script que lee el Sheet en vivo y se
 * abre con un enlace que lleva una clave (?k=...). Muestra todo, correos incluidos, así que sin la clave no muestra nada.
 * La interfaz es apps_script/dashboard.html (rama deploy); aquí solo se leen las pestañas y se calculan las cifras.
 * Instalación: re-pegar el Cargador (doGet y configurarTablero), Implementar > Nueva implementación > App web
 * (Ejecutar como: yo; Quién tiene acceso: cualquier usuario) y correr configurarTablero para obtener el enlace.
 */

/** Punto de entrada de la app web. */
function doGet(e) {
  const key = getProp_(PROPS.DASHBOARD_KEY);
  const given = String((e && e.parameter && e.parameter.k) || '');
  if (!dashboardKeyOk(given, key)) {
    return HtmlService.createHtmlOutput(dashboardLockedHtml())
      .setTitle('Búsqueda UX').addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
  const model = buildDashboardModel(readDashboardTabs_(), new Date(), tz_());
  model.recargar = ScriptApp.getService().getUrl() + '?k=' + encodeURIComponent(given);
  const html = fetchDashboardHtml_().replace('/*__DATA__*/null', safeJsonForScript(model));
  return HtmlService.createHtmlOutput(html)
    .setTitle('Búsqueda UX · Oscar Garcia')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

/** Crea la clave del tablero si no existe y escribe en el registro el enlace para compartir (después de implementar). */
function configurarTablero() {
  let key = getProp_(PROPS.DASHBOARD_KEY);
  if (!key) {
    key = Utilities.getUuid().replace(/-/g, '');
    setProp_(PROPS.DASHBOARD_KEY, key);
  }
  const url = ScriptApp.getService().getUrl();
  console.log(url
    ? 'Enlace del tablero (compártelo solo con quien quieras): ' + url + '?k=' + key
    : 'Aún no hay implementación de app web: Implementar > Nueva implementación > App web y vuelve a correr configurarTablero. Clave: ' + key);
}

function readDashboardTabs_() {
  const ss = SpreadsheetApp.openById(getProp_(PROPS.SHEET_ID));
  const tab = (name, linkCols) => {
    const sheet = ss.getSheetByName(name);
    if (!sheet || sheet.getLastRow() < 1) return { values: [], links: [] };
    const range = sheet.getDataRange();
    const values = range.getDisplayValues();
    const rich = linkCols ? range.getRichTextValues() : null;
    const links = rich ? rich.map(row => row.map(cell => (cell && cell.getLinkUrl()) || '')) : [];
    return { values: values, links: links };
  };
  return {
    registro: ss.getSheets()[0].getDataRange().getDisplayValues(),
    aplicadas: tab(CONFIG.APPLIED_SHEET_NAME, true),
    porEnviar: tab(CONFIG.PENDING_CV_SHEET_NAME, true),
    correos: tab(CONFIG.COLD_EMAIL_SHEET_NAME).values,
    seguimiento: tab(CONFIG.FOLLOWUP_SHEET_NAME).values,
    objetivo: tab(CONFIG.TARGET_COMPANIES_SHEET_NAME).values,
  };
}

function fetchDashboardHtml_() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('dashboard_html');
  if (cached) return cached;
  const response = UrlFetchApp.fetch(CONFIG.DASHBOARD_HTML_URL, { muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) throw new Error('No se pudo descargar el tablero (' + response.getResponseCode() + ')');
  const html = response.getContentText();
  if (html.length < 90000) cache.put('dashboard_html', html, 600);
  return html;
}

// ---------- Lógica pura (probada en tests/apps_script.test.js) ----------

/** La clave del enlace coincide con la guardada (sin clave guardada, nadie entra). */
function dashboardKeyOk(given, stored) {
  return !!stored && String(given || '') === String(stored);
}

/** JSON que se puede poner dentro de <script> sin cerrarlo ni romper el HTML. */
function safeJsonForScript(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

function dashboardLockedHtml() {
  return '<!doctype html><meta charset="utf-8"><body style="font-family:system-ui,sans-serif;max-width:32rem;margin:15vh auto;' +
    'padding:0 1rem;color:#1f2937;line-height:1.5"><h1 style="font-size:1.25rem">Este tablero es privado</h1>' +
    '<p>Ábrelo con el enlace completo que te compartieron (incluye una clave al final).</p></body>';
}

/** Estado de una postulación (columna Estado de "Aplicadas") en una de cinco claves. */
function applicationStatusKey(status) {
  const s = String(status || '').toLowerCase();
  if (/rechaz/.test(s)) return 'rechazada';
  if (/proceso|entrevista|prueba t/.test(s)) return 'proceso';
  if (/preparada|sin enviar/.test(s)) return 'preparada';
  if (/sin respuesta/.test(s)) return 'sinRespuesta';
  return 'aplicada';
}

/** Semana tal como la organiza el usuario; las carpetas sueltas por fecha cuentan como "Primera semana" (2026-10-25). */
function dashboardWeekName(week) {
  const w = String(week || '').trim();
  if (!w) return 'Sin semana';
  return /^\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}$/.test(w) ? 'Primera semana' : w;
}

/** Filas con encabezado -> objetos por nombre de columna (con el enlace de cada celda en _links, si lo hay). */
function dashboardRows(values, links) {
  if (!values || values.length < 2) return [];
  const headers = values[0].map(h => String(h).trim());
  return values.slice(1).filter(row => row.some(c => String(c).trim())).map((row, i) => {
    const obj = { _links: {} };
    headers.forEach((h, j) => {
      obj[h] = String(row[j] == null ? '' : row[j]).trim();
      const link = links && links[i + 1] && links[i + 1][j];
      if (link) obj._links[h] = link;
    });
    return obj;
  });
}

/**
 * Todo lo que muestra el tablero, calculado desde las pestañas. tabs: { registro, aplicadas: {values, links},
 * porEnviar: {values, links}, correos, seguimiento, objetivo } (valores tal como se ven en el Sheet).
 */
function buildDashboardModel(tabs, now, timeZone) {
  const fmt = d => Utilities.formatDate(d, timeZone || 'America/Bogota', 'yyyy-MM-dd');
  const today = fmt(now);
  const daysAgo = n => fmt(new Date(now.getTime() - n * 86400000));

  // Postulaciones (pestaña Aplicadas): las preparadas sin enviar no cuentan como enviadas
  const applications = dashboardRows(tabs.aplicadas && tabs.aplicadas.values, tabs.aplicadas && tabs.aplicadas.links)
    .map(r => ({
      empresa: r['Empresa'], cargo: r['Cargo'], estado: r['Estado'] || 'Aplicada', clave: applicationStatusKey(r['Estado']),
      semana: dashboardWeekName(r['Semana (carpeta)'] || r['Grupo (carpeta)']), creada: r['Creada'],
      carpeta: r._links['Carpeta'] || '',
    }));
  const sent = applications.filter(a => a.clave !== 'preparada');
  const count = (list, key) => list.filter(a => a.clave === key).length;
  const weekMap = {};
  sent.forEach(a => {
    const w = weekMap[a.semana] = weekMap[a.semana] || { semana: a.semana, desde: a.creada || '9999', total: 0,
      rechazada: 0, proceso: 0, sinRespuesta: 0, aplicada: 0 };
    w.total++;
    w[a.clave]++;
    if (a.creada && a.creada < w.desde) w.desde = a.creada;
  });
  const weeks = Object.keys(weekMap).map(k => weekMap[k]).sort((a, b) => a.desde < b.desde ? -1 : a.desde > b.desde ? 1 : 0);
  const responded = count(sent, 'proceso') + count(sent, 'rechazada');

  // Correos en frío: misma regla de rebotes que la skill seguimiento y contactedAddresses
  const coldValues = tabs.correos || [];
  const addressState = contactedAddresses(coldValues.slice(1));
  const states = Object.keys(addressState).map(k => addressState[k]);
  const coldRows = dashboardRows(coldValues).map(r => ({
    empresa: r['Empresa'], para: r['Destinatario(s)'], fecha: r['Fecha y hora envío'], asunto: r['Asunto'],
    hv: r['CV usado'], estado: r['Estado'], respuesta: r['Respuesta / info'], notas: r['Notas'],
  }));
  const repliedCompanies = {};
  coldRows.filter(r => /respondi/i.test(r.estado)).forEach(r => { repliedCompanies[r.empresa] = true; });
  const sentCompanies = {};
  coldRows.filter(r => !/^\s*borrador/i.test(r.estado) && r.estado).forEach(r => { sentCompanies[r.empresa] = true; });

  // Vacantes nuevas (Hoja 1) de los últimos 14 días
  const registry = dashboardRows(tabs.registro);
  const since = daysAgo(13);
  const recent = registry.filter(r => r['Fecha'] >= since);
  const perDay = {};
  for (let i = 13; i >= 0; i--) perDay[daysAgo(i)] = 0;
  recent.forEach(r => { if (r['Fecha'] in perDay) perDay[r['Fecha']]++; });

  const pending = dashboardRows(tabs.porEnviar && tabs.porEnviar.values, tabs.porEnviar && tabs.porEnviar.links)
    .map(r => ({ fecha: r['Fecha'], empresa: r['Empresa'], cargo: r['Cargo'], verificacion: r['Verificación'],
                 revision: r['Revisión'], carpeta: r._links['Carpeta'] || '', hv: r._links['HV'] || '' }));
  const followup = dashboardRows(tabs.seguimiento).map(r => ({
    fecha: r['Fecha revisión'], empresa: r['Empresa'], cargo: r['Cargo'], hecho: r['Hecho'], fechaMensaje: r['Fecha del mensaje'],
    antes: r['Estado anterior'], ahora: r['Estado nuevo'], siguiente: r['Siguiente acción'],
  })).filter(r => r.empresa && !/^revisi[oó]n$/i.test(r.empresa)).reverse();
  const targets = dashboardRows(tabs.objetivo);
  const targetStatus = {};
  targets.forEach(r => { const s = r['Estado'] || 'Sin estado'; targetStatus[s] = (targetStatus[s] || 0) + 1; });

  return {
    generado: Utilities.formatDate(now, timeZone || 'America/Bogota', "yyyy-MM-dd'T'HH:mm"),
    hoy: today,
    meta: CONFIG.DASHBOARD_WEEKLY_GOAL,
    postulaciones: {
      total: sent.length, rechazada: count(sent, 'rechazada'), proceso: count(sent, 'proceso'),
      sinRespuesta: count(sent, 'sinRespuesta'), aplicada: count(sent, 'aplicada'), preparadas: count(applications, 'preparada'),
      tasaRespuesta: sent.length ? Math.round(1000 * responded / sent.length) / 10 : 0,
      semanas: weeks, lista: applications,
    },
    correos: {
      enviados: states.filter(s => s !== 'borrador').length,
      entregados: states.filter(s => s === 'usado').length,
      rebotados: states.filter(s => s === 'rebotado').length,
      borradores: states.filter(s => s === 'borrador').length,
      empresasContactadas: Object.keys(sentCompanies).length,
      empresasRespondieron: Object.keys(repliedCompanies).length,
      lista: coldRows,
    },
    vacantes: { ultimos14: recent.length, porDia: Object.keys(perDay).map(d => ({ dia: d, n: perDay[d] })) },
    porEnviar: pending,
    seguimiento: followup.slice(0, 40),
    objetivo: { total: targets.length, porEstado: targetStatus },
  };
}
