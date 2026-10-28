// Pruebas de la oficina de agentes (apps_script/oficina.html, bloque <script id="motor-oficina">).
// Ejecutar: node tests/oficina.test.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const dir = path.join(__dirname, '..', 'apps_script');
const html = fs.readFileSync(path.join(dir, 'oficina.html'), 'utf8');
const motor = /<script id="motor-oficina">([\s\S]*?)<\/script>/.exec(html);
assert.ok(motor, 'oficina.html debe tener el bloque <script id="motor-oficina">');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(motor[1], ctx, { filename: 'oficina.html#motor-oficina' });
const F = name => ctx[name];
const J = x => JSON.parse(JSON.stringify(x));

// El equipo de la oficina es el mismo que calcula Apps Script (Agentes.gs) y el de los agentes de .claude/agents
const agentesGs = fs.readFileSync(path.join(dir, 'Agentes.gs'), 'utf8');
const idsGs = JSON.parse(/const AGENT_IDS_ = (\[[\s\S]*?\]);/.exec(agentesGs)[1].replace(/'/g, '"'));
assert.deepStrictEqual(Object.keys(F('EQUIPO')).sort(), idsGs.slice().sort(), 'oficina y Agentes.gs con los mismos agentes');
const archivos = fs.readdirSync(path.join(__dirname, '..', '.claude', 'agents')).map(f => f.replace(/\.md$/, '')).sort();
assert.deepStrictEqual(J(F('ORDEN')).slice().sort(), archivos, 'cada pingüino especialista tiene su archivo en .claude/agents');
archivos.forEach(id => {
  const md = fs.readFileSync(path.join(__dirname, '..', '.claude', 'agents', id + '.md'), 'utf8');
  assert.ok(new RegExp('^---\\nname: ' + id + '\\ndescription: .+\\n---', 's').test(md), id + '.md con su encabezado name/description');
  assert.ok(/Nunca envías correos ni postulaciones/.test(md), id + '.md repite la regla de no enviar (HITL)');
});
assert.ok(fs.existsSync(path.join(__dirname, '..', '.claude', 'skills', 'jefe', 'SKILL.md')), 'existe la skill jefe');

// Horas
assert.strictEqual(F('sello')(Date.UTC(2026, 9, 28, 11, 5)), '2026-10-28 06:05', 'Bogotá es UTC-5');
assert.strictEqual(F('hace')('2026-10-28 06:00', '2026-10-28 06:30'), 'hace 30 min');
assert.strictEqual(F('hace')('2026-10-28 06:29', '2026-10-28 06:30'), 'ahora');
assert.strictEqual(F('hace')('2026-10-28 03:00', '2026-10-28 06:30'), 'hace 3 h');
assert.strictEqual(F('hace')('2026-10-27 18:13', '2026-10-28 06:30'), 'ayer 18:13');
assert.strictEqual(F('hace')('2026-10-25 18:13', '2026-10-28 06:30'), '25 oct 18:13');
assert.strictEqual(F('hace')('2026-10-28', '2026-10-28 06:30'), 'hoy');
assert.strictEqual(F('hace')('', '2026-10-28 06:30'), '');

// Ritmo del día (mañana condensada: búsqueda 5:00, HV 6:03 y 7:03, revisión 7:53)
assert.strictEqual(F('turnoActual')('escriba', '06:20').que, 'Escribe la primera tanda de HV');
assert.strictEqual(F('turnoActual')('escriba', '09:00'), null);
assert.deepStrictEqual(J(F('proximoTurno')('radio', '10:00')), { cuando: 'Hoy 18:13', que: 'Escucha tu Gmail laboral' });
assert.strictEqual(F('proximoTurno')('inspector', '20:00').cuando, 'Mañana 6:03');
assert.strictEqual(F('proximoTurno')('constructor', '10:00'), null, 'el constructor trabaja a pedido');
assert.ok(F('faseDelDia')('06:20').ahora);
assert.strictEqual(F('faseDelDia')('12:00').texto, 'Próximo: Radio a las 18:13');
assert.strictEqual(F('faseDelDia')('23:00').texto, 'Próximo: Trineo a las 4:17', 'después del último turno, el primero de mañana');

// Estado visible: el del servidor, o «trabajando por horario» si le toca y aún no reporta en este turno
const ev = (a, ahora) => J(F('estadoVisible')(a, ahora));
assert.deepStrictEqual(ev({ id: 'escriba', estado: 'esperando', resumen: 'x', ultima: '2026-10-27' }, '2026-10-28 06:20'),
  { estado: 'trabajando', resumen: 'Escribe la primera tanda de HV', porHorario: true });
assert.strictEqual(ev({ id: 'escriba', estado: 'listo', resumen: '5 HV', ultima: '2026-10-28 06:15' }, '2026-10-28 06:20').estado, 'listo',
  'ya reportó en este turno');
assert.strictEqual(ev({ id: 'editor', estado: 'atencion', resumen: '1 para decidir', ultima: '' }, '2026-10-28 08:00').estado, 'atencion',
  'lo que necesita a Oscar no se tapa con el horario');
assert.strictEqual(ev({ id: 'radio', estado: 'raro' }, '2026-10-28 12:00').estado, 'libre', 'un estado desconocido no rompe la página');

// Te necesitan: agentes en atención y preguntas abiertas de los pedidos
const tn = J(F('teNecesitan')({ equipo: [{ id: 'editor', estado: 'atencion', resumen: '2 para decidir' }, { id: 'vigia', estado: 'listo' },
  { id: 'malo', estado: 'atencion', resumen: 'x' }],
  pedidos: [{ id: 'P-1', asunto: 'HV Acme', estado: 'bloqueado', pregunta: '¿La envío en inglés?' }, { id: 'P-2', asunto: 'Y', estado: 'hecho', pregunta: 'vieja' }] }));
assert.deepStrictEqual(tn.map(x => x.id), ['editor', 'jefe']);
assert.ok(/La envío en inglés/.test(tn[1].texto));
assert.deepStrictEqual(J(F('teNecesitan')(null)), []);

// Buzón
assert.strictEqual(F('textoParaClaude')('jefe', ' Hazme la HV '), '/jefe Hazme la HV');
assert.strictEqual(F('textoParaClaude')('cartero', 'escríbele a Acme'), '/jefe Encárgaselo a cartero (cartero): escríbele a Acme');
assert.strictEqual(F('textoParaClaude')('jefe', '   '), '');
assert.deepStrictEqual(J(F('leerParametros')('#api=AKfy-1&k=abc%20d&e=w&demo')), { api: 'AKfy-1', k: 'abc d', e: 'w', demo: true });
assert.deepStrictEqual(J(F('leerParametros')('')), {});

// La demostración trae a todo el equipo, con horas relativas a «ahora»
const demo = J(F('modeloDemo')('2026-10-28 14:00'));
assert.strictEqual(demo.agentes.equipo.length, idsGs.length);
assert.strictEqual(demo.agentes.mensajes[0].hora, '2026-10-28 13:59');
assert.ok(demo.agentes.mensajes.every(m => !/@/.test(m.detalle)), 'la demostración no trae correos ni datos reales');


// Vista 3D: cada uno tiene su puesto; el guion sale de los mensajes de las últimas 24 h, del más viejo al más nuevo
Object.keys(F('EQUIPO')).concat(['oscar']).forEach(id => assert.ok(F('ESTACIONES_3D')[id], 'puesto 3D para ' + id));
const msgs3d = [
  { hora: '2026-10-28 06:44', de: 'escriba', para: 'jefe', tipo: 'avance', asunto: 'HV para Acme' },
  { hora: '2026-10-28 06:40', de: 'jefe', para: 'escriba', tipo: 'encargo', asunto: 'Escribe la HV' },
  { hora: '2026-10-28 06:30', de: 'maquina', para: 'todos', tipo: 'aviso', asunto: '14 carpetas' },
  { hora: '2026-10-28 06:20', de: 'radio', para: 'oscar', tipo: 'pregunta', asunto: '¿Respondiste a X?' },
  { hora: '2026-10-28 06:10', de: 'oscar', para: 'jefe', tipo: 'pedido', asunto: 'HV y correo' },
  { hora: '2026-10-28 06:05', de: 'jefe', para: 'jefe', tipo: 'aviso', asunto: 'consigo mismo' },
  { hora: '2026-10-28 06:00', de: 'jefe', para: 'desconocido', tipo: 'aviso', asunto: 'x' },
  { hora: '2026-10-26 06:00', de: 'vigia', para: 'jefe', tipo: 'resultado', asunto: 'viejo' },
];
const guion = J(F('guionInteracciones')(msgs3d, '2026-10-28 07:00', 8));
assert.deepStrictEqual(guion.map(p => p.de + '>' + p.para), ['oscar>jefe', 'radio>oscar', 'maquina>null', 'jefe>escriba', 'escriba>jefe'],
  'cronológico, sin mensajes viejos, a sí mismo ni a puestos que no existen');
assert.strictEqual(guion[0].respuesta, '¡Lo reparto!');
assert.strictEqual(guion[1].respuesta, '', 'a Oscar no le responde un pingüino');
assert.strictEqual(J(F('guionInteracciones')(msgs3d, '2026-10-28 07:00', 2)).length, 2, 'solo los más recientes');
assert.deepStrictEqual(J(F('guionInteracciones')(null, '2026-10-28 07:00')), []);
assert.strictEqual(F('quienCamina')(guion[3]), 'jefe', 'el que encarga camina hasta el otro');
assert.strictEqual(F('quienCamina')(guion[2]), null, 'un aviso para todos se dice desde el puesto');
assert.strictEqual(F('quienCamina')({ de: 'maquina', para: 'inspector' }), null, 'las máquinas no caminan: mandan un cubo de hielo');
assert.strictEqual(F('quienCamina')(guion[1]), null, 'un mensaje para Oscar se dice desde el puesto');
// El visitante se para al lado del otro, del lado por donde llega (no delante: lo taparía desde la cámara)
assert.deepStrictEqual(J(F('puntoDeVisita')('editor', 'jefe', 1.25)), [1.25, -5.8, 1]);
assert.deepStrictEqual(J(F('puntoDeVisita')('oscar', 'jefe', 1.25)), [-1.25, -5.8, -1]);
// Three.js fijo en una versión y cargado solo al abrir la vista 3D
assert.ok(/var VERSION_THREE = '\d+\.\d+\.\d+';/.test(html), 'versión exacta de Three.js');
assert.ok(!/<script[^>]+src="https:\/\/cdn\.jsdelivr/.test(html), 'Three.js no se carga al abrir la página, solo con la vista 3D');

// Seguridad y estándares de la página
const ui = html.slice(html.indexOf('</script>', motor.index) + 9);
const usos = ui.match(/\.innerHTML\s*=\s*[^;]+;/g) || [];
assert.ok(usos.length > 0 && usos.every(u => /pinguinoSvg\(/.test(u)), 'innerHTML solo para los pingüinos (SVG fijo); los datos van con textContent');
assert.ok(/<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">/.test(html));
assert.ok(/prefers-reduced-motion: reduce/.test(html) && /prefers-color-scheme: dark/.test(html));
assert.ok(/credentials: 'omit'/.test(html), 'los datos se piden sin cookies (varias cuentas de Google)');
assert.ok(!/script\.google\.com\/macros\/s\/[\w-]{20,}/.test(html), 'el id de la implementación nunca va en el repositorio');
// PWA: manifiesto, service worker limitado a la oficina e íconos
const manifiesto = JSON.parse(fs.readFileSync(path.join(dir, 'oficina.webmanifest'), 'utf8'));
assert.strictEqual(manifiesto.start_url, 'oficina.html');
manifiesto.icons.forEach(i => assert.ok(fs.existsSync(path.join(dir, i.src)), 'falta el ícono ' + i.src));
assert.ok(fs.existsSync(path.join(dir, 'img', 'oficina', 'icono-180.png')));
const sw = fs.readFileSync(path.join(dir, 'oficina-sw.js'), 'utf8');
assert.ok(/url\.origin !== self\.location\.origin/.test(sw), 'el service worker no toca los datos de script.google.com');
assert.ok(/scope: '\.\/oficina\.html'/.test(html), 'el service worker solo controla la oficina (no el juego ni el tablero)');

// Tanda de hoy (2026-10-28): lo que Oscar envía hoy, con el PDF, el mensaje y los borradores a mano
{
  const pe = (empresa, fecha, revision, verificacion, extra) => Object.assign({ empresa, fecha, revision, verificacion, cargo: 'UX',
    carpeta: 'https://drive.google.com/drive/folders/1' + empresa.replace(/\W/g, '') + 'xxxxxxxxxx', hv: 'https://drive.google.com/open?id=1abcdefghijk' }, extra || {});
  const d = {
    hoy: '2026-10-28', cuenta: 'oscar@laboral.example',
    porEnviar: [
      pe('Vieja Revisar', '2026-10-20', 'Revisar', 'Lista'),
      pe('Nueva Lista', '2026-10-27', 'Lista para enviar', 'Lista', { mensaje: 'Hola', pdfDescarga: 'https://docs.google.com/document/d/x/export?format=pdf', pdf: 'https://drive.google.com/open?id=p' }),
      pe('Vieja Lista', '2026-10-22', 'Lista para enviar', 'Menor prioridad'),
      pe('Otra Lista', '2026-10-21', 'Lista para enviar', 'Lista'),
      pe('Sin revisión', '2026-10-26', 'Sin revisión', 'Lista'),
      pe('Sexta', '2026-10-26', 'Sin revisión', 'Menor prioridad'),
    ],
    postulaciones: { lista: [{ empresa: 'X', clave: 'aplicada', creada: '2026-10-28' }, { empresa: 'Y', clave: 'aplicada', creada: '2026-10-27' },
                             { empresa: 'Z', clave: 'preparada', creada: '2026-10-28' }] },
    correos: { borradores: 12, tope: 10, lista: [
      { empresa: 'Hoy SA', clave: 'enviado', dia: '2026-10-28', para: 'a@hoy.co' },
      { empresa: 'Riesgo', clave: 'borrador', para: 'soporte@r.co', notas: 'ADVERTENCIA: ruta de soporte' },
      { empresa: 'Buena', clave: 'borrador', para: 'talento@b.co', notas: '' },
      { empresa: 'Buena', clave: 'borrador', para: 'hola@b.co', notas: '' },
      { empresa: 'Tercera', clave: 'borrador', para: 't@t.co' },
      { empresa: 'Cuarta', clave: 'borrador', para: 'c@c.co' },
      { empresa: 'Krill', clave: 'enviado', dia: '2026-10-18', para: 'k@k.co', seguimiento: { estado: 'borrador', dia: '2026-10-28' } },
      { empresa: 'Krill', clave: 'enviado', dia: '2026-10-18', para: 'k2@k.co', seguimiento: { estado: 'borrador', dia: '2026-10-28' } },
      { empresa: 'Hecho', clave: 'enviado', dia: '2026-10-10', para: 'h@h.co', seguimiento: { estado: 'enviado', dia: '2026-10-20' } },
    ] },
  };
  const t = J(F('tandaDeHoy')(d));
  assert.strictEqual(t.enviadasHoy, 1, 'solo cuentan las enviadas hoy (las preparadas no)');
  assert.strictEqual(t.postulaciones.length, 4, 'tanda de 5 menos la que ya envió hoy');
  assert.deepStrictEqual(t.postulaciones.map(p => p.empresa), ['Otra Lista', 'Nueva Lista', 'Vieja Lista', 'Vieja Revisar'],
    'primero las que el editor dejó listas y verificadas como lista, y entre iguales la más vieja');
  const nl = t.postulaciones.find(p => p.empresa === 'Nueva Lista');
  assert.strictEqual(nl.pdf, 'https://docs.google.com/document/d/x/export?format=pdf', 'el PDF al día desde el Doc manda');
  assert.strictEqual(nl.mensaje, 'Hola');
  assert.ok(nl.id && nl.lista);
  assert.strictEqual(t.porEnviar, 6);
  assert.deepStrictEqual(t.correos.map(g => g.empresa), ['Buena', 'Tercera'], 'tanda de 3 menos la de hoy; las de riesgo al final');
  assert.strictEqual(t.correos[0].filas.length, 2);
  assert.strictEqual(t.empresasConBorrador, 4);
  assert.strictEqual(t.correosHoy, 1);
  assert.deepStrictEqual(t.seguimientos.map(s => s.empresa), ['Krill'], 'un seguimiento por empresa y solo los borradores');
  assert.strictEqual(t.sobreTope, true);
  assert.strictEqual(t.minutos, Math.round(4 * 3 + 2 * 1.5 + 1));
  assert.strictEqual(t.hechas, 2);
  assert.strictEqual(t.meta, 2 + 4 + 2);
  assert.strictEqual(F('resumenTanda')(t), '4 postulaciones, 2 empresas con correos y 1 seguimiento · unos 20 min');
  const vacia = J(F('tandaDeHoy')({ hoy: '2026-10-28' }));
  assert.strictEqual(F('resumenTanda')(vacia), 'Nada por enviar hoy. Mañana a las 5:00 llega más.');
  assert.strictEqual(vacia.sobreTope, false);
  assert.strictEqual(F('resumenTanda')(J(F('tandaDeHoy')({ hoy: '2026-10-28', postulaciones: { lista: [{ clave: 'aplicada', creada: '2026-10-28' }] } }))),
    '¡Tanda de hoy completa! Mañana a las 5:00 llega más.');
  assert.strictEqual(F('enlaceGmail')('oscar@laboral.example', 'in:drafts "Buena"'), 'https://mail.google.com/mail/u/oscar@laboral.example/#search/in%3Adrafts%20%22Buena%22');
  assert.strictEqual(F('enlaceGmail')('<x>', 'a'), 'https://mail.google.com/mail/u/x/#search/a', 'la cuenta no inyecta nada en el enlace');
  assert.strictEqual(F('idCarpeta')('https://drive.google.com/drive/folders/1AbCdEfGhIjK'), '1AbCdEfGhIjK');
  // La demostración trae una tanda para ver la tarjeta sin datos reales
  const demo = J(F('tandaDeHoy')(F('modeloDemo')('2026-10-28 09:00')));
  assert.ok(demo.postulaciones.length >= 2 && demo.correos.length >= 1 && demo.seguimientos.length === 1 && demo.sobreTope);
}

// Rutinas y tiempos reales (2026-10-28): cada especialista tiene un puesto de trabajo y el guion intercala su trabajo
{
  const PT = F('PUESTOS_TRABAJO_3D'), EST = F('ESTACIONES_3D');
  ['jefe'].concat(J(F('ORDEN'))).forEach(id => {
    const q = PT[id];
    assert.ok(q && q.que, 'puesto de trabajo para ' + id);
    assert.ok(Math.hypot(q.x, q.z) < 13, id + ': dentro de la base');
    Object.keys(EST).forEach(otro => assert.ok(Math.hypot(q.x - EST[otro][0], q.z - EST[otro][1]) > 1.2, id + ': su puesto no pisa el de ' + otro));
  });
  assert.strictEqual(F('segundosDeEscena')(0), 4);
  assert.strictEqual(F('segundosDeEscena')(30), 16, '30 min reales = 16 s');
  assert.strictEqual(F('segundosDeEscena')(600), 20, 'con tope');
  assert.strictEqual(F('duracionTexto')(30), '30 min');
  assert.strictEqual(F('duracionTexto')(95), '1 h 35 min');
  assert.strictEqual(F('duracionTexto')(120), '2 h');
  const pasos = J(F('guionInteracciones')([
    { hora: '2026-10-28 06:50', de: 'escriba', para: 'jefe', tipo: 'resultado', asunto: 'HV lista', id: 'P-1' },
    { hora: '2026-10-28 06:30', de: 'escriba', para: 'jefe', tipo: 'avance', asunto: 'Voy', id: 'P-2' },
    { hora: '2026-10-28 06:20', de: 'jefe', para: 'escriba', tipo: 'encargo', asunto: 'Escribe la HV', id: 'P-1' },
    { hora: '2026-10-28 06:15', de: 'jefe', para: 'radio', tipo: 'encargo', asunto: 'Seguimiento', id: 'P-3' },
    { hora: '2026-10-28 06:10', de: 'oscar', para: 'jefe', tipo: 'pedido', asunto: 'HV', id: 'P-1' },
  ], '2026-10-28 07:00', 8));
  assert.strictEqual(pasos[0].id, 'P-1', 'el guion lleva el Id del pedido');
  const g = J(F('conTrabajo')(pasos, '2026-10-28 07:00'));
  assert.deepStrictEqual(g.map(p => p.de + ':' + p.tipo), ['oscar:pedido', 'jefe:trabajo', 'jefe:encargo', 'radio:trabajo', 'jefe:encargo',
    'escriba:trabajo', 'escriba:avance', 'escriba:resultado']);
  const tJefe = g[1], tRadio = g[3], tEscriba = g[5];
  assert.strictEqual(tJefe.minutos, 10, 'el jefe tardó 10 min: hasta su siguiente mensaje del mismo pedido (el encargo de otro pedido no cuenta)');
  assert.strictEqual(tEscriba.minutos, 30, 'el escriba: del encargo a su resultado del mismo pedido (no el avance de otro)');
  assert.strictEqual(tEscriba.segundos, 16);
  assert.ok(/⏱ 30 min · Busca en tus documentos/.test(tEscriba.globo));
  assert.strictEqual(tRadio.enCurso, true, 'la radio aún no responde: sigue trabajando');
  assert.ok(/lleva 45 min/.test(tRadio.globo));
  assert.strictEqual(tEscriba.para, null);
  assert.strictEqual(F('quienCamina')(tEscriba), null, 'el trabajo no es una visita');
  assert.strictEqual(J(F('conTrabajo')(pasos, '2026-10-28 23:00')).filter(p => p.de === 'radio' && p.tipo === 'trabajo').length, 0,
    'sin respuesta en más de 3 h ya no se dibuja como trabajo en curso');
  assert.deepStrictEqual(J(F('conTrabajo')([], '2026-10-28 07:00')), []);
}

console.log('OK: todas las pruebas de la oficina pasaron');
