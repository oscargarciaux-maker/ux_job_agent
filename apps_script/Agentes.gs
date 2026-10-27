/**
 * Base Antártica (decisión del usuario 2026-10-27): el equipo de agentes y su bitácora. Diseño en docs/MULTIAGENTE.md.
 * Los agentes de IA (jefe, vigía, inspector, escriba, editor, cartero, exploradora, radio, constructor) se hablan por la
 * pestaña "Agentes" del registro: una fila por mensaje, nunca se edita una fila de otro; el estado de un pedido es el de
 * su fila más reciente con ese Id. La oficina (apps_script/oficina.html) lee el campo `agentes` del JSON del tablero,
 * que arma buildAgentsModel desde esa pestaña y desde las que ya existían (Fuentes, Hoja 1, Por enviar, Correos en frío,
 * Seguimiento, Empresas objetivo). El buzón de la oficina deja pedidos para el jefe con la acción `pedido` (Acciones.gs).
 */

const AGENTS_SHEET_NAME_ = 'Agentes';
const AGENTS_HEADERS_ = ['Fecha y hora', 'De', 'Para', 'Tipo', 'Asunto', 'Estado', 'Detalle', 'Enlace', 'Id'];
const AGENT_IDS_ = ['jefe', 'vigia', 'inspector', 'escriba', 'editor', 'cartero', 'exploradora', 'radio', 'constructor',
                    'maquina', 'trineo'];
const AGENT_MESSAGES_MAX_ = 20;      // mensajes que viajan en el JSON (el caché del tablero tiene un límite de tamaño)
const AGENT_WORKING_MINUTES_ = 180;  // una fila «en curso» más vieja que esto ya no cuenta como trabajando

/** La pestaña Agentes; la crea con su encabezado si no existe. */
function agentsSheet_(ss) {
  let sheet = ss.getSheetByName(AGENTS_SHEET_NAME_);
  if (!sheet) {
    sheet = ss.insertSheet(AGENTS_SHEET_NAME_);
    sheet.appendRow(AGENTS_HEADERS_);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/** Pedido del buzón de la oficina para el jefe (acción `pedido`). Devuelve el Id del pedido. */
function addMailboxRequest_(ss, text) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length < 3) throw new Error('Escribe el pedido');
  const now = new Date();
  const id = requestId(Utilities.formatDate(now, tz_(), 'yyyyMMdd-HHmm'), Math.random());
  const row = agentRow(Utilities.formatDate(now, tz_(), 'yyyy-MM-dd HH:mm'), 'oscar', 'jefe', 'pedido',
                       clean.slice(0, 80), 'pendiente', clean.slice(0, 500), '', id);
  const sheet = agentsSheet_(ss);
  // Como texto: si Sheets vuelve fecha la primera columna, el valor mostrado cambia de formato
  sheet.getRange(sheet.getLastRow() + 1, 1, 1, row.length).setNumberFormat('@').setValues([row]);
  return id;
}

// ---------- Lógica pura (probada en tests/apps_script.test.js) ----------

/** Id de un pedido: P-<yyyyMMdd-HHmm>-<2 letras> (las letras evitan choques entre dos pedidos del mismo minuto). */
function requestId(stamp, random) {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const n = Math.floor(Math.abs(Number(random) || 0) * letters.length * letters.length) % (letters.length * letters.length);
  return 'P-' + stamp + '-' + letters[Math.floor(n / letters.length)] + letters[n % letters.length];
}

/** Fila de la pestaña Agentes en el orden de su encabezado; ningún texto se interpreta como fórmula. */
function agentRow(stamp, from, to, type, subject, state, detail, link, id) {
  return [stamp, from, to, type, subject, state, detail, link, id].map(x => safeCell(x == null ? '' : String(x)));
}

/**
 * Fecha y hora de una celda tal como se ve en el Sheet, en "yyyy-MM-dd HH:mm" (o "yyyy-MM-dd" si no trae hora; vacío si
 * no se entiende). Acepta también dd/MM/yyyy, que es como la muestra un Sheet en español si la vuelve fecha.
 */
function normalizeStamp(text) {
  const t = String(text || '').trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/.exec(t);
  let y, mo, d, h, mi;
  if (m) { y = m[1]; mo = m[2]; d = m[3]; h = m[4]; mi = m[5]; } else {
    m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,?\s+(\d{1,2}):(\d{2}))?/.exec(t);
    if (!m) return '';
    d = m[1]; mo = m[2]; y = m[3]; h = m[4]; mi = m[5];
  }
  const p2 = x => ('0' + x).slice(-2);
  return y + '-' + p2(mo) + '-' + p2(d) + (h != null ? ' ' + p2(h) + ':' + mi : '');
}

/** Minutos entre dos marcas "yyyy-MM-dd HH:mm" (b - a); null si alguna no trae hora. */
function minutesBetween(a, b) {
  const parse = s => { const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/.exec(s || ''); return m ? Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5]) : null; };
  const x = parse(a), y = parse(b);
  return x == null || y == null ? null : Math.round((y - x) / 60000);
}

/**
 * Mensajes de la pestaña Agentes (valores con encabezado) en orden cronológico, normalizados. Solo los de agentes
 * conocidos u Oscar; los textos se recortan para que el JSON quepa en el caché.
 */
function agentMessages(values) {
  const known = AGENT_IDS_.concat(['oscar', 'todos']);
  return dashboardRows(values).map(r => ({
    hora: normalizeStamp(r['Fecha y hora']),
    de: String(r['De'] || '').trim().toLowerCase(), para: String(r['Para'] || '').trim().toLowerCase(),
    tipo: String(r['Tipo'] || '').trim().toLowerCase(), estado: String(r['Estado'] || '').trim().toLowerCase(),
    asunto: String(r['Asunto'] || '').slice(0, 80), detalle: String(r['Detalle'] || '').slice(0, 220),
    enlace: /^https:\/\//.test(String(r['Enlace'] || '')) ? String(r['Enlace']) : '', id: String(r['Id'] || '').trim(),
  })).filter(m => m.hora && known.indexOf(m.de) !== -1)
    .sort((a, b) => a.hora < b.hora ? -1 : a.hora > b.hora ? 1 : 0);
}

/**
 * Pedidos por Id (los que empiezan por P-): cada uno con su primera fila (quién lo pidió y qué) y el estado de su fila
 * más reciente. Abiertos primero (más nuevos arriba), luego los 5 cerrados más recientes.
 */
function agentThreads(messages) {
  const byId = {};
  messages.forEach(m => {
    if (!/^P-/.test(m.id)) return;
    const t = byId[m.id] = byId[m.id] || { id: m.id, asunto: m.asunto, de: m.de, desde: m.hora, agentes: [] };
    t.estado = m.estado || t.estado || 'pendiente';
    t.hora = m.hora;
    t.ultimo = String(m.detalle || m.asunto).slice(0, 160);
    if (m.de !== 'oscar' && m.de !== 'jefe' && t.agentes.indexOf(m.de) === -1) t.agentes.push(m.de);
    if (m.para !== 'oscar' && m.para !== 'jefe' && m.para !== 'todos' && t.agentes.indexOf(m.para) === -1 &&
        AGENT_IDS_.indexOf(m.para) !== -1) t.agentes.push(m.para);
    if (m.tipo === 'pregunta' && m.estado !== 'hecho') t.pregunta = m.detalle || m.asunto;
  });
  const all = Object.keys(byId).map(k => byId[k]).sort((a, b) => a.hora < b.hora ? 1 : -1);
  const closed = s => s === 'hecho' || s === 'cancelado';
  return all.filter(t => !closed(t.estado)).concat(all.filter(t => closed(t.estado)).slice(0, 5));
}

/**
 * Estado del equipo para la oficina. `d`: { registro (filas de Hoja 1 como objetos), fuentes (valores de la pestaña
 * Fuentes), agentes (valores de la pestaña Agentes), porEnviar, correos, seguimiento (valores), acciones, objetivo
 * (filas) } tal como los arma buildDashboardModel. `now` en "yyyy-MM-dd HH:mm" (Bogotá).
 * Cada agente: { id, estado: trabajando|atencion|listo|esperando|libre, resumen, ultima, cifras: [[rótulo, n]] }.
 */
function buildAgentsModel(d, now) {
  const today = now.slice(0, 10);
  const team = {};
  AGENT_IDS_.forEach(id => { team[id] = { id: id, estado: 'libre', resumen: '', ultima: '', cifras: [] }; });
  const set = (id, fields) => Object.assign(team[id], fields);
  const latest = list => list.filter(Boolean).sort().pop() || '';

  // Trineo (GitHub Actions) y máquina de hielo (Apps Script): la pestaña Fuentes, una fila por fuente y corrida
  const runs = dashboardRows(d.fuentes || []).map(r => ({ dia: normalizeStamp(r['Fecha']).slice(0, 10), hora: String(r['Hora'] || '').slice(0, 5),
    fuente: r['Fuente'], traidas: Number(r['Traídas']) || 0, nuevas: Number(r['Nuevas']) || 0, carpetas: Number(r['Carpetas creadas']) || 0 }));
  const todayRuns = runs.filter(r => r.dia === today);
  const lastRun = latest(todayRuns.map(r => today + ' ' + r.hora));
  const sled = todayRuns.filter(r => /github|jobspy/i.test(r.fuente));
  const sum = (list, k) => list.reduce((s, r) => s + r[k], 0);
  if (sled.length) {
    set('trineo', { estado: 'listo', ultima: lastRun, resumen: 'Trajo ' + sum(sled, 'traidas') + ' avisos de Indeed, LinkedIn y elempleo',
      cifras: [['avisos', sum(sled, 'traidas')], ['nuevos', sum(sled, 'nuevas')]] });
  } else set('trineo', { estado: 'esperando', resumen: 'Sale a las 4:17 y a las 21:17' });
  const registry = d.registro || [];
  const todayRegistry = registry.filter(r => normalizeStamp(r['Fecha']).slice(0, 10) === today);
  if (todayRuns.length) {
    set('maquina', { estado: 'listo', ultima: lastRun,
      resumen: 'Buscó en ' + todayRuns.length + ' fuentes y creó ' + sum(todayRuns, 'carpetas') + ' carpetas',
      cifras: [['nuevas', sum(todayRuns, 'nuevas')], ['carpetas', sum(todayRuns, 'carpetas')]] });
  } else set('maquina', { estado: 'esperando', resumen: 'Busca a las 5:00 y repasa a las 5:45' });

  // Inspector: lo que Apps Script ya apartó hoy según su Verificacion.txt
  const statusToday = re => todayRegistry.filter(r => re.test(String(r['Estado'] || ''))).length;
  const doubtful = statusToday(/^dudosa/i), discarded = statusToday(/^descartada/i);
  const pending = d.porEnviar || [];
  const todayPending = pending.filter(p => normalizeStamp(p.fecha).slice(0, 10) === today);
  const verified = doubtful + discarded + todayPending.length;
  if (verified) {
    set('inspector', { estado: doubtful ? 'atencion' : 'listo', ultima: today,
      resumen: doubtful ? doubtful + (doubtful === 1 ? ' dudosa espera' : ' dudosas esperan') + ' tu decisión' : 'Verificó las vacantes de hoy',
      cifras: [['pasaron', todayPending.length], ['dudosas', doubtful], ['descartadas', discarded]] });
  } else set('inspector', { estado: 'esperando', resumen: 'Verifica a las 6:03 y a las 7:03' });

  // Escriba: HV armadas hoy (Por enviar) y las que esperan su CV_IA.json o fueron rechazadas por la validación
  const waiting = statusToday(/esperando cv/i), rejected = statusToday(/cv rechazado/i);
  if (todayPending.length || waiting || rejected) {
    set('escriba', { estado: rejected ? 'atencion' : 'listo', ultima: today,
      resumen: todayPending.length + (todayPending.length === 1 ? ' HV nueva hoy' : ' HV nuevas hoy') + (waiting ? ' · ' + waiting + ' en cola' : ''),
      cifras: [['HV hoy', todayPending.length], ['en cola', waiting], ['rechazadas', rejected]] });
  } else set('escriba', { estado: 'esperando', resumen: 'Escribe a las 6:03 y a las 7:03' });

  // Editor: todo lo que está por enviar, según su Revision.txt
  const ready = pending.filter(p => /lista/i.test(p.revision)).length;
  const toReview = pending.filter(p => /^revisar/i.test(p.revision)).length;
  const unreviewed = pending.length - ready - toReview;
  if (pending.length) {
    set('editor', { estado: toReview ? 'atencion' : 'listo', ultima: latest(pending.map(p => normalizeStamp(p.fecha))),
      resumen: ready + ' listas para enviar' + (toReview ? ' · ' + toReview + ' para que decidas' : ''),
      cifras: [['listas', ready], ['revisar', toReview], ['sin revisión', unreviewed]] });
  } else set('editor', { estado: 'esperando', resumen: 'Revisa a las 7:53 y a las 8:53' });

  // Cartero: borradores de correos en frío esperando a que Oscar los envíe
  const cold = d.correos || [];
  const drafts = cold.filter(c => c.clave === 'borrador').length;
  const lastCold = latest(cold.map(c => normalizeStamp(c.fecha)));
  set('cartero', { estado: drafts ? 'atencion' : 'libre', ultima: lastCold,
    resumen: drafts ? drafts + (drafts === 1 ? ' borrador listo para que lo envíes' : ' borradores listos para que los envíes') : 'Sin borradores pendientes',
    cifras: [['borradores', drafts], ['respondieron', cold.filter(c => c.clave === 'respondio').length]] });

  // Exploradora: empresas en la lista para correos en frío
  const targets = d.objetivo || [];
  set('exploradora', { estado: 'libre', ultima: latest(targets.map(t => normalizeStamp(t['Fecha']))),
    resumen: targets.length ? targets.length + ' empresas en la lista' : 'Lista para investigar empresas',
    cifras: [['empresas', targets.length]] });

  // Radio: la última revisión del Gmail (fila REVISIÓN de Seguimiento) y las acciones que quedaron para Oscar
  const followup = dashboardRows(d.seguimiento || []);
  const lastReview = latest(followup.filter(r => /^revisi[oó]n$/i.test(r['Empresa'] || '')).map(r => normalizeStamp(r['Fecha revisión'])));
  const actions = (d.acciones || []).length;
  set('radio', { estado: actions ? 'atencion' : lastReview.slice(0, 10) === today ? 'listo' : 'esperando', ultima: lastReview,
    resumen: actions ? actions + (actions === 1 ? ' acción pendiente para ti' : ' acciones pendientes para ti') : 'Escucha el Gmail a las 18:13',
    cifras: [['acciones', actions]] });

  // La bitácora manda sobre lo calculado: lo más reciente de cada agente (de las últimas 24 h)
  const messages = agentMessages(d.agentes || []);
  const threads = agentThreads(messages);
  const open = threads.filter(t => t.estado !== 'hecho' && t.estado !== 'cancelado');
  set('jefe', { estado: open.some(t => t.pregunta || t.estado === 'bloqueado') ? 'atencion' : open.length ? 'trabajando' : 'libre',
    resumen: open.length ? open.length + (open.length === 1 ? ' pedido abierto' : ' pedidos abiertos') : 'Sin pedidos: déjame uno en el buzón',
    cifras: [['abiertos', open.length]] });
  ['vigia', 'constructor'].forEach(id => set(id, { resumen: 'A pedido del jefe' }));
  AGENT_IDS_.forEach(id => {
    const mine = messages.filter(m => m.de === id);
    const last = mine[mine.length - 1];
    if (!last) return;
    const age = minutesBetween(last.hora, now);
    if (age == null || age > 24 * 60) return;
    if (id === 'jefe') { set(id, { ultima: last.hora }); return; }  // su estado sale de los pedidos abiertos
    const fields = { ultima: last.hora, resumen: last.asunto || team[id].resumen };
    if (last.estado === 'en curso' && age <= AGENT_WORKING_MINUTES_) fields.estado = 'trabajando';
    else if (last.estado === 'bloqueado' || last.tipo === 'pregunta') fields.estado = 'atencion';
    else if (last.estado === 'hecho' && team[id].estado !== 'atencion') fields.estado = 'listo';
    set(id, fields);
  });

  return {
    ahora: now,
    equipo: AGENT_IDS_.map(id => team[id]),
    mensajes: messages.slice(-AGENT_MESSAGES_MAX_).reverse(),
    pedidos: threads.slice(0, 10),
  };
}
