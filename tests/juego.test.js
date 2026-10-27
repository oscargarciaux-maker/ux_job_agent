// Pruebas del motor de "El juego laboral" (apps_script/juego.html, bloque <script id="motor">).
// Ejecutar: node tests/juego.test.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const html = fs.readFileSync(path.join(__dirname, '..', 'apps_script', 'juego.html'), 'utf8');
const motor = /<script id="motor">([\s\S]*?)<\/script>/.exec(html);
assert.ok(motor, 'juego.html debe tener el bloque <script id="motor">');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(motor[1], ctx, { filename: 'juego.html#motor' });
const J = name => ctx[name];
const plain = x => JSON.parse(JSON.stringify(x));  // arreglos del contexto vm -> arreglos normales
// Las 4 semanas reales al 2026-10-25, anonimizadas (empresas, cargos y correos reemplazados)
const modelo = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'juego_modelo.json'), 'utf8'));

// ---------- Fórmulas (sección 5) ----------
assert.strictEqual(J('golpeRechazo')(0), 8);
assert.strictEqual(J('golpeRechazo')(10), 4, 'con 10 de Resiliencia un rechazo quita 4');
assert.strictEqual(J('golpeRechazo')(1000), 2, 'el golpe nunca baja de 2');
assert.strictEqual(J('xpParaSubir')(1), 100);
assert.strictEqual(J('xpParaSubir')(4), 800);
assert.deepStrictEqual(JSON.parse(JSON.stringify(J('nivelDeXp')(0))), { nivel: 1, resto: 0, necesita: 100 });
assert.strictEqual(J('nivelDeXp')(100).nivel, 2);
assert.strictEqual(J('nivelDeXp')(100 + 283 - 1).nivel, 2);
assert.strictEqual(J('nivelDeXp')(100 + 283).nivel, 3);
assert.deepStrictEqual([0, 2, 3, 6, 9, 15, 30].map(J('multiplicadorRacha')), [1, 1, 1.1, 1.2, 1.3, 1.5, 1.5]);

// ---------- Racha: días hábiles; el fin de semana no suma ni rompe; hoy sin envíos no rompe ----------
const dias = o => Object.fromEntries(o.map(d => [d, true]));
assert.strictEqual(J('racha')(dias(['2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23']), '2026-10-25'), 4, 'domingo: cuenta hasta el viernes');
assert.strictEqual(J('racha')(dias(['2026-10-16', '2026-10-19']), '2026-10-19'), 2, 'viernes + lunes siguen la racha');
assert.strictEqual(J('racha')(dias(['2026-10-19', '2026-10-20']), '2026-10-21'), 2, 'hoy sin envíos todavía no rompe');
assert.strictEqual(J('racha')(dias(['2026-10-19']), '2026-10-21'), 0, 'un día hábil completo sin envíos la reinicia');
assert.strictEqual(J('diasSinEnvio')(dias(['2026-10-23']), '2026-10-25'), 0, 'el fin de semana no cuenta como días sin envíos');
assert.strictEqual(J('diasSinEnvio')(dias(['2026-10-21']), '2026-10-26'), 2);

// ---------- Eventos de las 4 semanas reales ----------
const eventos = J('construirEventos')(modelo);
const cuenta = tipo => eventos.filter(e => e.tipo === tipo).length;
assert.strictEqual(cuenta('hv'), modelo.postulaciones.total, 'una HV por postulación enviada');
assert.strictEqual(cuenta('proceso'), modelo.postulaciones.proceso);
assert.strictEqual(cuenta('rechazo'), modelo.postulaciones.rechazada);
assert.strictEqual(new Set(eventos.map(e => e.id)).size, eventos.length, 'ids únicos');
assert.deepStrictEqual(plain(J('construirEventos')(modelo).map(e => e.id)), plain(eventos.map(e => e.id)),
  'los ids son estables entre visitas');
const sinFecha = eventos.filter(e => e.historico && (e.tipo === 'rechazo' || e.tipo === 'proceso')).length;
assert.strictEqual(sinFecha, 20 - modelo.postulaciones.lista.filter(a => a.estadoFecha).length,
  'rechazos y pruebas sin fecha quedan como historia');
const entregadas = modelo.correos.lista.reduce((s, c) => s + (c.entregadas || 0), 0);
assert.strictEqual(eventos.filter(e => e.tipo === 'correo').reduce((s, e) => s + e.n, 0), entregadas);
assert.strictEqual(cuenta('aliado'), new Set(modelo.correos.lista.filter(c => c.clave === 'respondio').map(c => c.empresa.toLowerCase())).size,
  'una empresa que respondió es un solo aliado');

// ---------- Simulación ----------
const { estado, efectos } = J('simular')(eventos, modelo);
// Regla de honestidad: HP del Reclutador = meta − HV reales de la semana, en todas las semanas
modelo.postulaciones.semanas.forEach((w, i) => {
  assert.strictEqual(estado.semanas[i].hv, w.total, 'HV de ' + w.semana);
  assert.strictEqual(estado.semanas[i].reclutadorHp, Math.max(0, 30 - w.total), 'HP del jefe de ' + w.semana + ' = submeta (30) − HV');
});
assert.strictEqual(estado.reclutadorHp, 30 - 29, 'Tercera semana: a 1 HV de ganar con la submeta de 30');
assert.deepStrictEqual([estado.meta, estado.metaLegendaria, estado.faltanLegendaria], [30, 50, 21]);
// Sin `submeta` en el JSON (una foto vieja del navegador) se usa 30; una submeta mayor que la meta no puede pasarla
assert.strictEqual(J('simular')(eventos, Object.assign({}, modelo, { submeta: 30 })).estado.reclutadorHp, 1);
assert.strictEqual(J('simular')(eventos, Object.assign({}, modelo, { submeta: 80 })).estado.meta, 50);
assert.strictEqual(estado.poder, 29);
assert.strictEqual(estado.avalancha, false);
assert.strictEqual(estado.semanaActual, 3);
assert.strictEqual(estado.jefe.nombre, 'Gerente Gracias por Participar', 'Tercera semana: el primer jefe del juego (el que tiene arte)');
assert.strictEqual(estado.numero, 3, 'la semana actual es la Tercera semana, como la nombra el candidato');
assert.deepStrictEqual(plain(estado.semanas.map(w => w.numero)), [0, 1, 2, 3], 'Antiguas es la 0');
assert.deepStrictEqual(['Antiguas', 'Primera semana nueva', 'Segunda semana', 'Tercera semana', 'Cuarta semana', 'Décima semana', 'Semana 12', '24-09-2026', 'Otra']
  .map((n, i) => J('numeroDeSemana')(n, i)), [0, 1, 2, 3, 4, 10, 12, 8, 9]);
assert.strictEqual(J('jefeDeSemana')(4).nombre, 'Gerente Gracias por Participar', 'el Gerente (con arte) se queda también la Cuarta semana');
assert.strictEqual(J('jefeDeSemana')(5).nombre, 'Señor Silencio', 'desde la Quinta rotan los demás');
assert.strictEqual(J('jefeDeSemana')(10).nombre, 'Gerente Gracias por Participar', 'rotan y se repiten');
assert.strictEqual(J('jefeDeSemana')(2).nombre, 'El Comité', 'las semanas anteriores al juego no cambian');
assert.strictEqual(estado.resiliencia, modelo.postulaciones.rechazada, '+1 de Resiliencia por rechazo');
assert.ok(efectos.every(f => f.despues.hp >= 1 && f.despues.hp <= 100), 'el HP de Oscar siempre entre 1 y 100');
assert.ok(estado.hp >= 1 && estado.hp <= 100);
// XP nunca baja
for (let i = 1; i < efectos.length; i++) assert.ok(efectos[i].despues.xp >= efectos[i - 1].despues.xp, 'la XP nunca baja');
// Pociones a 10 y 20 HV en las semanas que llegaron
const pociones = efectos.filter(f => f.tipo === 'pocion').map(f => f.semana + ':' + f.hvSemana);
assert.deepStrictEqual(plain(pociones), ['0:10', '1:10', '1:20', '2:10', '2:20', '3:10', '3:20']);
assert.strictEqual(efectos.filter(f => f.tipo === 'ko' || f.tipo === 'avalancha').length, 0, 'ninguna semana llegó a 30');
assert.strictEqual(efectos.filter(f => f.tipo === 'semanaNueva').length, 3);
assert.ok(estado.logros.primeraHv && estado.logros.primeraPrueba);
assert.ok(!estado.logros.semana30 && !estado.logros.semana50);
// Racha al domingo 25: días hábiles con envíos de la tercera semana
assert.strictEqual(estado.racha, 5, 'domingo 25: lunes 19 a viernes 23 con envíos (el domingo 18 no suma)');
assert.ok(estado.logros.racha5, 'logro Racha de 5 días');
assert.strictEqual(estado.burla, false);

// Carpetas numeradas como las tiene el candidato desde el 2026-10-26 ("0. Antiguas" … "4. Cuarta semana")
assert.deepStrictEqual(['0. Antiguas', '1. Primera semana nueva', '2. Segunda semana', '3. Tercera semana', '4. Cuarta semana']
  .map((n, i) => J('numeroDeSemana')(n, i)), [0, 1, 2, 3, 4]);
// Semana recién creada y todavía vacía (2026-10-26: salía «Semana 5» y una HV que no existía): es la Cuarta, con el
// jefe entero y el Gerente todavía en escena
{
  const m = JSON.parse(JSON.stringify(modelo));
  const nombres = { 'Antiguas': '0. Antiguas', 'Primera semana nueva': '1. Primera semana nueva', 'Segunda semana': '2. Segunda semana', 'Tercera semana': '3. Tercera semana' };
  m.postulaciones.semanas.forEach(w => { w.semana = nombres[w.semana]; });
  m.postulaciones.lista.forEach(a => { a.semana = nombres[a.semana]; });
  m.postulaciones.semanas.push({ semana: '4. Cuarta semana', desde: '2026-10-26', total: 0, rechazada: 0, proceso: 0, sinRespuesta: 0, aplicada: 0 });
  m.hoy = '2026-10-26';
  const r = J('simular')(J('construirEventos')(m), m);
  assert.strictEqual(r.estado.numero, 4);
  assert.strictEqual(r.estado.semanaActual, 4);
  assert.strictEqual(r.estado.reclutadorHp, 30, 'sin envíos todavía: el jefe con todo su HP (la submeta)');
  assert.strictEqual(r.estado.poder, 0);
  assert.strictEqual(r.estado.jefe.nombre, 'Gerente Gracias por Participar');
  assert.strictEqual(r.estado.semanas.length, 5);
  assert.strictEqual(r.efectos.filter(f => f.tipo === 'hv').length, modelo.postulaciones.total, 'ninguna HV de más');
  const nueva = r.efectos.filter(f => f.tipo === 'semanaNueva').pop();
  assert.deepStrictEqual([nueva.numero, nueva.dia, nueva.historico], [4, '2026-10-26', false], 'la semana nueva entra al replay de hoy');
  // Una HV en la Cuarta: el jefe pierde 1 HP
  m.postulaciones.lista.push({ empresa: 'Nueva', cargo: '', clave: 'aplicada', semana: '4. Cuarta semana', creada: '2026-10-26', estadoFecha: '' });
  m.postulaciones.semanas[4].total = 1;
  assert.strictEqual(J('simular')(J('construirEventos')(m), m).estado.reclutadorHp, 29);
}

// ---------- Bitácora por semana (2026-10-26): historia de cada postulación y lo de cada semana ----------
{
  const igual = (a, b) => J('mismaEmpresa')(a, b);
  assert.ok(igual('Kanguro', 'Kanguro Insurance') && igual('PeriferiaIT', 'Periferia IT Group') && igual('EPAM', 'epam'));
  assert.ok(!igual('Empresa 1', 'Empresa 16') && !igual('Banco de Bogotá', 'Banco Popular') && !igual('Sole', 'Solera') && !igual('', ''),
    'ante la duda no se juntan dos empresas');
  // Con los datos reales anonimizados: una empresa que pasó a prueba y luego la rechazaron
  const a46 = modelo.postulaciones.lista.find(a => a.empresa === 'Empresa 46');
  const h46 = plain(J('historiaDePostulacion')(modelo, a46));
  assert.deepStrictEqual(h46.map(p => p.tipo), ['envio', 'seguimiento', 'seguimiento']);
  assert.ok(h46.every((p, i) => !i || (p.dia || '9999') >= (h46[i - 1].dia || '')), 'en orden de fecha');
  assert.strictEqual(h46[2].ahora, 'Rechazada (rojo)');
  // Misma empresa con dos postulaciones: cada hallazgo va a la más reciente enviada antes de él
  const m = { postulaciones: { lista: [
    { empresa: 'Truelogic', cargo: '', clave: 'rechazada', creada: '2026-09-22' },
    { empresa: 'Truelogic', cargo: '', clave: 'sinRespuesta', creada: '2026-10-14' },
    { empresa: 'Truelogic Software', cargo: '', clave: 'preparada', creada: '2026-10-20' }] },
  historial: [{ empresa: 'Truelogic', hecho: 'Rechazo', fechaMensaje: '2026-09-25', ahora: 'Rechazada', siguiente: 'Ninguna' },
    { empresa: 'Truelogic Software', hecho: 'Acuse', fechaMensaje: '2026-10-20', ahora: 'Aplicada, sin respuesta', siguiente: 'Esperar respuesta' },
    { empresa: 'Otra', hecho: 'x', fechaMensaje: '2026-10-21' }] };
  const [vieja, nueva] = m.postulaciones.lista;
  assert.deepStrictEqual(plain(J('historiaDePostulacion')(m, vieja).map(p => p.texto)), ['HV enviada', 'Rechazo']);
  assert.deepStrictEqual(plain(J('historiaDePostulacion')(m, nueva).map(p => p.texto)), ['HV enviada', 'Acuse']);
  // Acción pendiente: la del último hallazgo, salvo esperar o ninguna
  const paso = siguiente => ({ tipo: 'seguimiento', siguiente });
  assert.strictEqual(J('accionPendiente')([paso('Grabar el video'), paso('Esperar respuesta')]), '');
  assert.strictEqual(J('accionPendiente')([paso('Esperar respuesta'), paso('Grabar el video de Spark Hire')]), 'Grabar el video de Spark Hire');
  assert.strictEqual(J('accionPendiente')([{ tipo: 'envio' }]), '');
  // Lo de cada semana: las mismas cifras del tablero y cada correo en frío en una sola semana
  const det = plain(J('semanasDetalle')(modelo, estado));
  assert.deepStrictEqual(det.map(w => w.hv), modelo.postulaciones.semanas.map(w => w.total));
  assert.deepStrictEqual(det.map(w => w.rechazada), modelo.postulaciones.semanas.map(w => w.rechazada));
  assert.deepStrictEqual(det.map(w => w.numero), [0, 1, 2, 3]);
  assert.deepStrictEqual(det.map(w => w.actual), [false, false, false, true]);
  assert.ok(det.every(w => w.postulaciones.every((a, i) => !i || (a.creada || '') <= (w.postulaciones[i - 1].creada || ''))), 'recientes primero');
  const enviados = modelo.correos.lista.filter(c => c.clave && c.clave !== 'borrador' && (c.dia || '') >= modelo.postulaciones.semanas[0].desde).length;
  assert.strictEqual(det.reduce((n, w) => n + w.correos.length, 0), enviados);
}

// Correos en frío como misión (2026-10-27): tanda de 3 empresas al día, dudosas al final
{
  const c = (empresa, clave, extra) => Object.assign({ empresa, clave, para: empresa.toLowerCase() + '@x.co', notas: '', dia: '' }, extra || {});
  const lista = [c('Movii', 'borrador'), c('Movii', 'borrador', { para: 'b@movii.co', notas: 'Fuente antigua. Oscar decide si la prueba.' }),
    c('tyba', 'borrador', { notas: 'ADVERTENCIA: ruta de soporte' }), c('Trii', 'borrador'), c('Koombea', 'borrador'), c('Kommy', 'borrador'),
    c('LinkTic', 'enviado', { dia: '2026-10-27' }), c('Ceiba', 'respondio', { dia: '2026-10-23' })];
  const t = plain(J('tandaCorreos')(lista, '2026-10-27'));
  assert.deepStrictEqual(t.grupos.map(g => g.empresa), ['Trii', 'Koombea', 'Kommy', 'Movii', 'tyba'], 'las que tienen destinatarios dudosos van al final');
  assert.deepStrictEqual([t.enviadasHoy, t.faltan, t.correos], [1, 2, 6], 'hoy ya salió LinkTic: faltan 2 de la tanda de 3');
  assert.deepStrictEqual(t.tanda.map(g => g.empresa), ['Trii', 'Koombea']);
  const movii = t.grupos.find(g => g.empresa === 'Movii');
  assert.deepStrictEqual([movii.aviso, movii.filas.map(f => f.aviso)], [true, [false, true]]);
  assert.strictEqual(J('tandaCorreos')(lista, '2026-10-28').faltan, 3, 'otro día, tanda completa');
  assert.strictEqual(J('tandaCorreos')([], '2026-10-27').faltan, 0, 'sin borradores no hay tanda');
  // Con los datos reales anonimizados: ningún borrador cuenta como enviado
  const real = plain(J('tandaCorreos')(modelo.correos.lista, modelo.hoy));
  assert.strictEqual(real.correos, modelo.correos.lista.filter(x => x.clave === 'borrador').length);
}

// Antigüedad de los datos (hora de Bogotá, UTC−5): con más de 15 min el juego lee Drive al abrir (2026-10-26)
assert.strictEqual(J('minutosDesde')('2026-10-26T11:52', Date.parse('2026-10-26T17:20:00Z')), 28);
assert.strictEqual(J('minutosDesde')('2026-10-26T12:15', Date.parse('2026-10-26T17:20:00Z')), 5);
assert.strictEqual(J('minutosDesde')('', Date.now()), Infinity);
assert.strictEqual(J('DATOS_VIEJOS_MIN'), 15);

// Daño de rechazo con Avalancha: a la mitad
{
  const m = { meta: 50, hoy: '2026-10-25', postulaciones: { semanas: [{ semana: 'S1', desde: '2026-10-19', total: 31 }], lista: [] }, correos: { lista: [] } };
  for (let i = 0; i < 31; i++) m.postulaciones.lista.push({ empresa: 'E' + i, cargo: 'C', clave: i === 30 ? 'rechazada' : 'aplicada', semana: 'S1', creada: '2026-10-20', estadoFecha: i === 30 ? '2026-10-21' : '' });
  const r = J('simular')(J('construirEventos')(m), m);
  const rech = r.efectos.find(f => f.tipo === 'rechazo');
  assert.strictEqual(rech.golpe, 4, 'con Avalancha el golpe de 8 baja a 4');
  assert.ok(r.efectos.some(f => f.tipo === 'avalancha'));
  const hvTrasAvalancha = r.efectos.filter(f => f.tipo === 'hv').pop();
  assert.ok(hvTrasAvalancha.delta.xp >= 20, 'XP doble con Avalancha');
}
// KO a las 30 (semana ganada), semana legendaria a las 50, y el HP del jefe no baja de 0
{
  const m = { meta: 50, submeta: 30, hoy: '2026-10-25', postulaciones: { semanas: [{ semana: 'S1', desde: '2026-10-19', total: 52 }], lista: [] }, correos: { lista: [] } };
  for (let i = 0; i < 52; i++) m.postulaciones.lista.push({ empresa: 'E' + i, cargo: 'C', clave: 'aplicada', semana: 'S1', creada: '2026-10-20' });
  const r = J('simular')(J('construirEventos')(m), m);
  assert.deepStrictEqual(plain(r.efectos.filter(f => f.tipo === 'ko' || f.tipo === 'legendaria').map(f => f.tipo + ':' + f.hvSemana)), ['ko:30', 'legendaria:50']);
  assert.strictEqual(r.estado.reclutadorHp, 0);
  assert.strictEqual(r.estado.ko, true);
  assert.strictEqual(r.estado.faltanLegendaria, 0);
  assert.strictEqual(r.estado.semanas[0].legendaria, true);
  assert.strictEqual(r.estado.semanasGanadas, 1);
  assert.ok(r.estado.logros.semana50);
  const r31 = J('simular')(J('construirEventos')(Object.assign({}, m, { postulaciones: { semanas: m.postulaciones.semanas, lista: m.postulaciones.lista.slice(0, 31) } })), m);
  assert.deepStrictEqual([r31.estado.ko, r31.estado.reclutadorHp, r31.estado.faltanLegendaria, r31.estado.semanas[0].legendaria], [true, 0, 19, false]);
}
// Ritmo de la semana (2026-10-27): HV por día hábil para llegar a 30 y proyección con el ritmo de los días anteriores
{
  const ritmo = (...a) => plain(J('ritmoSemana')(...a));
  // Cuarta semana: empezó el lunes 26; hoy martes 27 con 1 HV → faltan 29 en 4 días hábiles (mar a vie)
  assert.deepStrictEqual(ritmo(1, 30, '2026-10-26', '2026-10-27'), { faltan: 29, quedan: 4, porDia: 8, proyeccion: 5 });
  // El primer día no hay ritmo anterior: sin proyección
  assert.deepStrictEqual(ritmo(0, 30, '2026-10-26', '2026-10-26'), { faltan: 30, quedan: 5, porDia: 6, proyeccion: null });
  // Semana que empieza en domingo (la Tercera): el domingo no cuenta
  assert.strictEqual(ritmo(0, 30, '2026-10-18', '2026-10-18').quedan, 5);
  // Fin de semana: quedan 0 días hábiles → lo que falta, de una
  assert.deepStrictEqual(ritmo(29, 30, '2026-10-18', '2026-10-24'), { faltan: 1, quedan: 0, porDia: 1, proyeccion: 29 });
  // Meta cumplida y fechas raras
  assert.strictEqual(ritmo(31, 30, '2026-10-26', '2026-10-28').porDia, 0);
  assert.strictEqual(J('ritmoSemana')(1, 30, '', '2026-10-27'), null);
  assert.strictEqual(J('ritmoSemana')(1, 30, '2026-10-26', '2026-11-20'), null, 'la semana ya terminó');
}
// El HP de Oscar nunca baja de 1 (muchos rechazos y rebotes)
{
  const m = { meta: 50, hoy: '2026-10-25', postulaciones: { semanas: [{ semana: 'S1', desde: '2026-10-19', total: 5 }], lista: [] },
    correos: { lista: [{ empresa: 'X', clave: 'enviado', dia: '2026-10-23', entregadas: 0, rebotadas: 60 }] } };
  for (let i = 0; i < 5; i++) m.postulaciones.lista.push({ empresa: 'E' + i, cargo: 'C', clave: 'rechazada', semana: 'S1', creada: '2026-10-19', estadoFecha: '2026-10-22' });
  const r = J('simular')(J('construirEventos')(m), m);
  assert.strictEqual(Math.min(...r.efectos.map(f => f.despues.hp)), 1);
  assert.strictEqual(r.estado.hp, 1, 'el rechazo duele pero no derrota');
  assert.strictEqual(r.estado.resiliencia, 5);
  assert.strictEqual(r.efectos.find(f => f.tipo === 'rebote').delta.hp, -65, 'golpes 8+7+7+6+6 dejan 66; el rebote solo puede quitar 65');
}

// ---------- Replay ----------
const primera = J('colaReplay')(efectos, null);
assert.strictEqual(primera.primeraVisita, true);
assert.strictEqual(primera.items.length, 0, 'la primera visita no reproduce la historia');
// Último visto: el viernes 23 a primera hora → quedan los eventos del 23 y 24
const corte = efectos.findIndex(f => f.dia === '2026-10-22' && !f.historico);
const visto = { id: efectos[corte].id, dia: efectos[corte].dia };
const cola = J('colaReplay')(efectos, visto);
assert.ok(cola.items.length > 0);
assert.ok(cola.items.every(it => !it.historico), 'la historia sin fecha no se reproduce');
const hvItems = cola.items.filter(it => it.tipo === 'hv');
assert.strictEqual(new Set(hvItems.map(it => it.dia)).size, hvItems.length, 'las HV del mismo día se agrupan en una ráfaga');
assert.ok(cola.items.filter(it => it.tamano === 'mediano' || it.tamano === 'grande').length <= 5, 'máximo 5 modales');
const modales = cola.items.filter(it => it.tamano === 'mediano' || it.tamano === 'grande');
if (modales.some(it => J('BUENAS')[it.tipo])) assert.ok(J('BUENAS')[modales[modales.length - 1].tipo], 'cierra con una buena noticia');
// Visto el último efecto: nada nuevo
assert.strictEqual(J('colaReplay')(efectos, J('ultimoVistoDe')(efectos)).items.length, 0, 'un evento ya visto no se repite');
// Un rechazo que llega tarde (fecha anterior a la última visita) también se reproduce (2026-10-25, Experian)
{
  const marca = J('ultimoVistoDe')(efectos);
  assert.ok(marca.vistos.length > 0 && marca.vistos.every(h => typeof h === 'string'));
  const m2 = JSON.parse(JSON.stringify(modelo));
  const tarde = m2.postulaciones.lista.find(a => (a.clave === 'aplicada' || a.clave === 'sinRespuesta') && a.creada && a.creada.slice(0, 10) < '2026-10-21');
  tarde.clave = 'rechazada'; tarde.estadoFecha = '2026-10-21';
  const efectos2 = J('simular')(J('construirEventos')(m2), m2).efectos;
  const cola2 = J('colaReplay')(efectos2, marca);
  assert.deepStrictEqual(plain(cola2.items.filter(it => it.tipo === 'rechazo').map(it => it.empresa)), [tarde.empresa], 'el rechazo tardío entra al replay');
  assert.ok(cola2.items.every(it => it.tipo === 'rechazo' || it.tipo === 'nivel' || it.tipo === 'logro'), 'lo ya visto no se repite: ' + plain(cola2.items.map(it => it.tipo)));
  // Formato anterior { id, dia }: sigue funcionando
  assert.strictEqual(J('colaReplay')(efectos, { id: marca.id, dia: marca.dia }).items.length, 0);
}
// Saltar todo deja las mismas stats que verlo completo
assert.deepStrictEqual(J('estadoAlTerminar')({ estado }, cola, true), J('estadoAlTerminar')({ estado }, cola, false));
{
  // Cola con más de 5 modales: el resto va al resumen
  const muchos = [];
  for (let i = 0; i < 8; i++) muchos.push({ id: 'p' + i, tipo: 'proceso', tamano: 'grande', dia: '2026-10-2' + i, delta: { hp: 20, xp: 50 }, despues: {}, n: 1, empresa: 'E' + i });
  muchos.push({ id: 'r', tipo: 'rechazo', tamano: 'mediano', dia: '2026-10-29', delta: { hp: -8 }, despues: {}, n: 1, empresa: 'X' });
  const c = J('colaReplay')([{ id: 'v', dia: '2026-10-19', delta: {}, despues: {}, n: 1 }].concat(muchos), { id: 'v', dia: '2026-10-19' });
  assert.strictEqual(c.items.length, 5);
  assert.strictEqual(c.resumen, 4);
  assert.strictEqual(c.items[c.items.length - 1].tipo, 'proceso', 'la buena noticia va al final');
}

// Ritmo de niveles con los datos reales (para revisar la curva antes de fijarla)
const porSemana = modelo.postulaciones.semanas.map((w, i) => {
  const ult = efectos.filter(f => f.semana === i).pop();
  return w.semana + ': nivel ' + (ult ? ult.despues.nivel : '?') + ', XP ' + (ult ? ult.despues.xp : '?') + ', HP ' + (ult ? ult.despues.hp : '?');
});
console.log('Ritmo real → ' + porSemana.join(' | '));
// ---------- Poses: la foto de cada efecto trae lo que necesita el sprite (Avalancha) ----------
{
  const m = { meta: 50, hoy: '2026-10-25', postulaciones: { semanas: [{ semana: 'S1', desde: '2026-10-19', total: 31 }], lista: [] }, correos: { lista: [] } };
  for (let i = 0; i < 31; i++) m.postulaciones.lista.push({ empresa: 'E' + i, cargo: 'C', clave: 'aplicada', semana: 'S1', creada: '2026-10-20' });
  const r = J('simular')(J('construirEventos')(m), m);
  assert.strictEqual(r.efectos.find(f => f.tipo === 'hv').despues.avalancha, false);
  assert.strictEqual(r.efectos.find(f => f.tipo === 'avalancha').despues.avalancha, true, 'desde las 30 HV Oscar queda con aura');
}
assert.ok(efectos.every(f => typeof f.despues.avalancha === 'boolean'));

// ---------- Arte: cada PNG que nombra el juego existe (y nada de la foto ni la ilustración de referencia) ----------
{
  const bloque = /<script id="arte">([\s\S]*?)<\/script>/.exec(html);
  assert.ok(bloque, 'juego.html debe tener el bloque <script id="arte">');
  const actx = {}; vm.createContext(actx); vm.runInContext(bloque[1], actx);
  const ARTE = plain(actx.ARTE);
  const raiz = path.join(__dirname, '..', 'apps_script', ARTE.raiz);
  const existe = rel => assert.ok(fs.existsSync(path.join(raiz, rel)), 'falta ' + ARTE.raiz + rel);
  ARTE.oscar.sprites.forEach(s => existe('oscar/sprite_' + s + '.png'));
  ARTE.oscar.retratos.forEach(s => existe('oscar/retrato_' + s + '.png'));
  existe(ARTE.hoja);
  J('JEFES').forEach(j => assert.ok(ARTE.jefes[j.nombre], 'el jefe ' + j.nombre + ' necesita su id de carpeta en ARTE.jefes'));
  // Un jefe con carpeta debe traer todas sus poses; el Gerente ya la tiene
  assert.ok(fs.existsSync(path.join(raiz, 'gerente')));
  Object.values(ARTE.jefes).forEach(j => { if (fs.existsSync(path.join(raiz, j.id))) ARTE.posesJefe.forEach(s => existe(j.id + '/sprite_' + s + '.png')); });
  assert.ok(!/oscar\.png|Press Start 2P|VT323/.test(html), 'sin la foto ni las fuentes anteriores');
}

console.log('OK: todas las pruebas del motor del juego pasaron');
