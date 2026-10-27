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

console.log('OK: todas las pruebas de la oficina pasaron');
