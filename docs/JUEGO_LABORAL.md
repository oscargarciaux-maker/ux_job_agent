# El juego laboral — Documento de diseño UI retro

## 1. Visión y principios

El juego laboral convierte la búsqueda de empleo real en un combate por turnos retro: Oscar contra El Reclutador. Cada evento real (HV enviada, respuesta, prueba, rechazo) es un golpe con un efecto visible en las stats.

**Fantasía del jugador:** cada semana es una pelea contra un jefe. Ganarla depende de lo que yo hago, no de la suerte.

**Referencias de género (solo inspiración, sin copiar arte, fuentes ni ventanas):** combates por menús de los JRPG de 8 bits y juegos de cartas móviles como Card Crawl. Lo común: un personaje pequeño hace una animación corta y la pantalla la dominan los números.

### Principios UX/UI (en orden de prioridad)

1. **Primero útil, después juego.** Los números reales se leen en menos de 3 segundos al abrir. La metáfora nunca reemplaza al dato: siempre aparece el valor real al lado (HP del Reclutador 32 = faltan 32 HV para la meta).
2. **Se premia lo que controlo.** Enviar HV, hacer seguimiento y mantener la racha pesan más que lo que no controlo (silencio o rechazos).
3. **El rechazo duele, pero no derrota.** No hay Game Over. El HP de Oscar nunca baja de 1 y cada rechazo suma Resiliencia.
4. **Se juega por lotes.** Los datos llegan cada mañana, cada hora y a las 18:13. Al abrir, el juego reproduce lo que pasó desde la última visita, como un replay.
5. **Honestidad.** Cada animación corresponde a un evento real con fecha y empresa. Tocarlo muestra qué pasó.
6. **Solo lectura.** El juego no envía nada ni cambia estados de postulaciones. Es un espejo motivador del Sheet, Drive y Gmail.
7. **Retro, pero accesible.** Estética pixel art de 16 bits con contraste WCAG 2.2 AA, textos grandes, celular primero y respeto por el movimiento reducido.
8. **Corto y repetible.** Una visita típica dura de 30 a 90 segundos: ver el replay, mirar números y saber qué hacer hoy.

**9. Autoría sobre lo genérico (decidido el 25 oct).** Nada debe verse hecho por IA: mundo específico (Neo-Bogotá), reglas visuales estrictas, pixel art limpiado a mano y textos con la voz de Oscar. Detalle en la sección 2, «Cómo evitar que se vea hecho por IA».

## 2. Dirección de arte: neo-retro cyberpunk

La lógica sigue siendo la de un combate retro sencillo, pero todo se ve en alta definición: personajes en pixel art detallado, menús como un HUD de ciencia ficción y textos limpios fáciles de leer. Referencias: VA-11 Hall-A (Cyberpunk Bartender Action) y CrossCode. Decisión del 25 oct, segunda iteración: se descartan las ventanas tipo RPG de 8 bits y la pixel font en los textos.

### Qué tomamos de cada referencia

| Referencia | Qué tomamos | Qué no tomamos |
| --- | --- | --- |
| VA-11 Hall-A | Retratos grandes y detallados que cambian de expresión; ambiente nocturno de neón rosa y violeta; los eventos se cuentan como una conversación | La pantalla dividida tipo escritorio |
| CrossCode | HUD limpio: paneles oscuros con esquinas cortadas, líneas finas, barras segmentadas y números nítidos; sprites con mucho detalle y animación fluida; números de daño claros | La complejidad de sus menús y la vista cenital |

Son inspiración de estilo: el arte, la interfaz y las fuentes del juego son originales.

### Píxel y sprites

- **Dos niveles de arte:** retratos para los momentos importantes y sprites de combate para la arena.
- **Retrato:** 160×200 px nativos, al nivel de la referencia del 25 oct. Se usa en los modales, en Héroe y, recortado a la cara (64×64), en la caja de diálogo. Las expresiones están en la biblia de arte, más abajo.
- **Sprite de combate:** 64×96 px nativos a escala ×2 (128×192 en pantalla). Más detalle que un 8 bits: 3 o 4 tonos por color, contorno selectivo y un borde de luz de neón (cian o magenta según el lado).
- **Animación más fluida:** ataques de 4 a 6 cuadros a 10–12 fps; reposo de 4 cuadros.
- Escalado siempre entero, con `image-rendering: pixelated`.
- **Arena:** fondo en pixel art de ciudad nocturna con neones y lluvia ligera en 2 capas; los personajes pisan una franja de piso con reflejo.
- Paleta de hasta 32 colores por personaje; contornos en morado muy oscuro, no negro puro.
- Los jefes semanales usan el mismo estilo y los mismos tamaños.
- **Producción:** este nivel de detalle no se programa a mano. Opciones: Aseprite a partir de la referencia, un ilustrador de pixel art, o una base generada con IA limpiada a mano (paleta fija, contornos y píxeles sueltos).

### Ficha del sprite de Oscar

Se parte de la foto y de la referencia de estilo. En el retrato caben todos los rasgos; en el sprite de combate de 64×96 se respetan en este orden de prioridad:

| Rasgo | Cómo se traduce a píxeles | Color |
| --- | --- | --- |
| Pelo largo, ondulado y con volumen hasta los hombros | Silueta ancha que enmarca la cara; 2 o 3 píxeles de brillo para insinuar las ondas | Café oscuro #3B2A20, brillo #5A4030 |
| Gafas de montura metálica delgada con lentes tintados azul violeta | Marco de 1 px y lentes de 3×2 px; es el rasgo más distintivo a esta escala | Marco #1A1A2E, lentes #6B6FD6 |
| Sonrisa amplia mostrando los dientes | Línea blanca de 6 px en la boca | #FFFFFF |
| Arete negro en la oreja y punto bajo el labio | 1 píxel cada uno | #111111 |
| Camisa lila de manga larga con tapeta y cuello interior azul marino, botones morados | Torso lila con una franja marina vertical al centro | Lila #B48CE6, sombra #9468C8, marino #1E2A5A |
| Mangas remangadas y brazos cruzados | Pose de reposo (idle) con brazos cruzados y antebrazos en tono piel | Piel #C98E6B, sombra #A8714F |

Las poses y animaciones de Oscar están en la biblia de arte, más abajo.

Nota: los colores del sprite son propios del personaje y no forman parte de los tokens de la interfaz.

### Biblia de arte: ilustraciones y variantes

**Regla de origen (decidida el 25 oct):** la foto de Oscar y la ilustración de referencia son material de partida, nunca arte final. Ninguna de las dos aparece en pantalla. A partir de ellas se crean todas las variantes de Oscar y, con el mismo nivel de detalle, las de cada jefe.

#### Estilo de las ilustraciones

- Pixel art de alta definición con sombreado por bloques: 3 o 4 tonos por color, sin degradados suaves ni píxeles sueltos.
- Contorno selectivo de 1 px en morado muy oscuro: más grueso en la silueta exterior y ausente donde la luz toca el borde.
- **Iluminación igual en todos los assets:** luz principal ámbar de la lámpara, desde abajo y al frente; luz de contorno magenta del neón de la ventana, desde atrás; sombras profundas y frías. Sin esta regla los personajes no parecen estar en la misma sala.
- Tono lúgubre: piel y ropa algo desaturadas, ojeras y arrugas de ropa marcadas, algo de mugre y desgaste. Los colores fuertes quedan para el neón, los ojos y los detalles clave.
- Fondo transparente en sprites y retratos; el ambiente lo pone la escena.

#### Variantes de Oscar

| Asset | Tipo | Cuadros | Cuándo se usa | Qué se ve |
| --- | --- | --- | --- | --- |
| Hoja de modelo | Referencia de producción | — | Antes de todo lo demás | Frente, 3/4 y perfil con la paleta fija. Base de todas las variantes |
| Reposo | Sprite | 4, en bucle | Siempre | Brazos cruzados, respira; cada tanto la luz recorre las gafas |
| Ataque | Sprite | 6 | HV enviada | Descruza los brazos y lanza una hoja de vida que vuela hacia el jefe |
| Ráfaga | Sprite | 6 | Varias HV el mismo día | El mismo ataque con tres hojas en abanico |
| Recibe daño | Sprite | 3 | Rechazo o rebote | Retrocede un paso, las gafas se ladean, gesto de dolor y parpadeo magenta |
| Se recompone | Sprite | 3 | Justo después de recibir daño | Se acomoda las gafas y vuelve a cruzar los brazos (+1 Resiliencia) |
| Curación | Sprite | 4 | Poción (10, 20 o 40 HV) | Respira hondo; brillo verde que sube desde los pies |
| Golpe crítico | Sprite | 6 | Prueba o entrevista | Señala al jefe con media sonrisa; destello ámbar |
| Avalancha | Sprite | 4, en bucle | 30 HV en la semana | Aura cian que ondea alrededor del cuerpo |
| Victoria | Sprite | 6 | KO del jefe | Puño arriba, sonrisa amplia |
| Cansado | Sprite | 4, en bucle | HP por debajo de 25 | Hombros caídos y respiración lenta; reemplaza al reposo |
| Retrato neutral | Retrato 160×200 | 1 (+ parpadeo de 2) | Héroe y modales | Sonrisa tranquila, brazos cruzados |
| Retrato alegría | Retrato | 1 | Golpe crítico, aliado | Sonrisa amplia, como la foto |
| Retrato firme | Retrato | 1 | Rechazo | Mandíbula apretada, mirada al frente |
| Retrato sorpresa | Retrato | 1 | Una empresa respondió | Cejas arriba, se baja un poco las gafas |
| Retrato cansado | Retrato | 1 | HP bajo | Ojeras y mirada baja |
| Retrato victoria | Retrato | 1 | Semana ganada, subida de nivel | Se ríe, con la cabeza un poco hacia atrás |

La cara de 64×64 de la caja de diálogo se recorta de cada retrato; no es un asset aparte.

#### Variantes de cada jefe

Cada jefe semanal tiene el mismo juego de estados, para que el motor los use igual:

| Estado | Tipo | Cuadros | Cuándo se usa |
| --- | --- | --- | --- |
| Reposo | Sprite | 4, en bucle | Siempre |
| Recibe daño | Sprite | 3 | Cada HV enviada |
| Ataque propio | Sprite | 6 | Rechazo |
| Aturdido | Sprite | 4, en bucle | Prueba o entrevista, durante 24 horas |
| Burla | Sprite | 4, en bucle | 2 o más días sin envíos |
| KO | Sprite | 6 | 50 HV en la semana |
| Retratos | Retrato 160×200 | 1 cada uno | Neutral, burla, aturdido y derrotado |

Gestos propios de cada jefe:

| Jefe | Reposo | Ataque propio | Aturdido | KO |
| --- | --- | --- | --- | --- |
| Gerente Gracias por Participar | Sonrisa forzada, ajusta la corbata | Lanza un sobre con membrete | Se le cae el maletín | El maletín se abre y vuelan papeles |
| Señor Silencio | Mira el celular sin levantar la vista | Muestra la pantalla: «visto» | El celular se le cae de las manos | Se le apaga el celular y se queda a oscuras |
| Doctora Filtro ATS | Lupa en mano, ojos de escáner | Láser rojo que escanea a Oscar | Chispas y pantalla con error | Se reinicia y muestra una pantalla azul |
| Licenciado Experiencia Requerida | Golpea el diploma enrollado en la mano | Lluvia de requisitos en papel | Se le desenrolla el diploma | Lo entierran sus propios requisitos |
| La Reclutadora Fantasma | Flota y se vuelve transparente a ratos | Desaparece y reaparece detrás de Oscar | Queda visible del todo, confundida | Se desvanece del todo |
| El Comité | Tres cabezas que cuchichean | Levantan paletas con «NO» | Las tres discuten entre ellas | Se derrumba la mesa |

#### Producción

1. Hoja de modelo de Oscar a partir de la foto y la referencia, con la paleta fija. Se aprueba antes de seguir.
2. Retrato neutral y luego las demás expresiones.
3. Sprite de reposo a 64×96, y luego el resto de animaciones.
4. Cada jefe sigue el mismo orden: hoja de modelo, retratos y sprites.
5. Herramientas: se puede partir de una base generada con IA, pero cada asset se limpia a mano en Aseprite (paleta, contorno, luz y píxeles sueltos).
6. Exportación: tira horizontal de cuadros en PNG por animación más un JSON con los tiempos. Nombres como `img/personajes/oscar/sprite_ataque.png` o `img/personajes/sr_silencio/retrato_burla.png`.

#### Método probado el 25 oct (v1 del arte)

Se generaron y aprobaron 9 sprites de Oscar, 6 retratos, 6 sprites del Gerente Gracias por Participar y el proyectil de la hoja de vida. Están en el paquete `arte_juego_laboral_v1.zip` y en el archivo de Figma «El juego laboral — Arte de personajes».

1. **Varias poses en una sola imagen.** Así la IA mantiene igual al personaje entre poses. Se usa siempre la misma descripción del personaje, palabra por palabra, y el mismo modelo (gpt-image-2.5-sunburst en Figma).
2. **Conversión a pixel art real** con `pixelizar.py`: recorta cada pose, quita el fondo, reduce a una grilla real de píxeles, aplica una paleta compartida de 40 colores (con blanco, lente violeta, magenta, ámbar, verde y cian reservados) y agrega el contorno exterior de 1 px.
3. **Una paleta por personaje para todas sus poses,** procesando todas las láminas juntas. Si no, la camisa cambia de tono entre estados.
4. **Los efectos van aparte,** como la hoja de vida o el sobre del jefe; el código los anima volando.

**Decisiones técnicas que salen de esto:**

- Sprites de 128 px de alto nativo, mostrados a 1 px CSS por píxel en el celular (escala entera con pantallas de densidad 2 o 3) y ×2 en escritorio.
- Las láminas miran hacia un lado fijo; el juego espeja con CSS (`scaleX(-1)`) para que Oscar mire a la izquierda y el jefe a la derecha.
- En la v1 hay una pose clave por estado y el movimiento lo pone el código: parpadeo de golpe, retroceso, número flotante y vuelo del proyectil. Las animaciones cuadro a cuadro quedan para la v2.
- La cara de la caja de diálogo se recorta del sprite de reposo mientras no exista el retrato del jefe.

**Criterios para aprobar un asset:** solo usa colores de la paleta fija; respeta la luz ámbar desde abajo y el contorno magenta desde atrás; Oscar se reconoce solo por la silueta (pelo y gafas); el sprite se lee bien a tamaño real en el celular.

### Paleta (tokens)

| Token | Hex | Uso | Contraste sobre `--panel` |
| --- | --- | --- | --- |
| `--fondo` | #050409 | Fondo general, casi negro con matiz violeta | — |
| `--panel` | #0C0A16 | Paneles del HUD | — |
| `--linea` | #262040 | Bordes, retículas y separadores | Decorativo |
| `--texto` | #D6D1E8 | Textos y números principales | Alrededor de 13:1 |
| `--texto-2` | #8A84AE | Etiquetas y texto secundario | Validar ≥ 4,5:1 |
| `--meta` | #5D5885 | Texto de ambiente (hora, clima, número de caso); nunca información necesaria | Decorativo |
| `--cian` | #4FC9C4 | Color principal del HUD, foco, barra de Poder | Validar ≥ 3:1 |
| `--magenta` | #E0457B | Jefe, daño, rechazos, letrero de neón | Validar ≥ 3:1 |
| `--verde` | #5FD39A | HP de Oscar, procesos activos | Validar ≥ 3:1 |
| `--ambar` | #E8A548 | XP, logros, críticos, luz de la lámpara | Validar ≥ 3:1 |
| `--lila` | #A88AD6 | Identidad de Oscar (placa y retrato) | Validar ≥ 3:1 |

Segunda iteración (25 oct): neones menos saturados y fondos más oscuros para un tono lúgubre y misterioso.

El neón va solo en líneas, números y estados, nunca en fondos grandes. Máximo dos neones protagonistas por pantalla, además del texto. El color nunca carga solo el significado: cada estado lleva además un ícono o una palabra.

### Ambiente: Neo-Bogotá de noche

La arena es una sala de entrevistas de noche en una Bogotá cyberpunk: el combate es literalmente una entrevista de trabajo. El ambiente se construye con pocas fuentes de luz y muchos detalles pequeños, como en VA-11 Hall-A.

- **Escena:** muro oscuro, ventana con persianas a medio cerrar, lluvia sobre el vidrio, edificios con ventanas encendidas y un letrero de neón «SE BUSCA» que parpadea de vez en cuando.
- **Escritorio** en primer plano con lámpara de luz ámbar, taza de café con vapor y papeles (las hojas de vida).
- **Luz:** solo dos fuentes, el neón magenta de afuera y la lámpara ámbar; todo lo demás queda en sombra.
- **Texturas:** nada de colores planos. Muro con manchas de humedad y chorreos; vidrio sucio con gotas irregulares y empañado abajo; paneles con mugre, rayones finos, una luz lateral magenta y bordes que se desvanecen; barras con degradado vertical; neblina baja y viñeta fuerte; grano de película encima de todo. La mugre va siempre debajo del texto para no bajar el contraste. Todo se apaga con el interruptor de efectos.
- **Texto de ambiente** en `--meta`: «NEO-BOGOTÁ · 23:41 · LLUVIA 92 %», número de caso, «REMITENTE VERIFICADO · GMAIL». Da mundo sin competir con los datos.
- **Voz de los jefes:** la caja de diálogo habla como el jefe, en primera persona y con humor seco («…Tres hojas de vida más sobre mi escritorio. Las leeré. Algún día.»).
- **Detalles locales** que hacen único el mundo: lluvia bogotana, letreros en español, buses rojos de fondo, ladrillo en los edificios, Monserrate iluminado a lo lejos.

### Cómo evitar que se vea hecho por IA

- **Especificidad sobre lo genérico.** El cyberpunk genérico (morado, neón por todas partes, ciudad sin nombre) es lo que delata a la IA. Neo-Bogotá, tus datos reales y tus jefes con nombre propio son autoría.
- **Reglas propias y consistentes:** paleta cerrada, una sola dirección de luz, grilla de 4 px y esquinas cortadas siempre de 8 px. La inconsistencia es lo que más delata a una imagen generada.
- **Pixel art limpiado a mano.** Si una base sale de IA, se repinta en Aseprite: paleta fija, contornos de 1 px, sin píxeles sueltos ni degradados suaves.
- **Microcopy escrito por ti,** con tu humor y tu forma de hablar.
- **Pocos cuadros de animación pero expresivos,** pensados para cada personaje (el Sr. Silencio mira el celular; la Doctora Filtro ATS escanea).
- **Evitar los tics de IA:** brillos en todo, degradados violeta de fondo, íconos genéricos de librería y textos de relleno.

### Tipografía

- **Títulos, etiquetas y botones:** Chakra Petch SemiBold (Google Fonts), en mayúsculas con 0,08 em de espaciado y mínimo 14 px. Tiene aire sci-fi y se lee bien.
- **Texto de lectura (diálogos, detalles, listas):** Chakra Petch Regular de 16 a 18 px, interlineado 1,4, con mayúsculas y minúsculas normales.
- **Números (HP, contadores, porcentajes):** Share Tech Mono (Google Fonts), de ancho fijo para que las cifras no salten al contar; de 28 a 40 px en el panel.
- **Pixel font solo como acento** en etiquetas muy cortas (LV, KO, ×2): Silkscreen, mínimo 16 px.
- Por qué: Press Start 2P y VT323 cansan al leer frases. CrossCode y VA-11 Hall-A usan fuentes limpias para leer y dejan el pixel art a los personajes.

### HUD sci-fi (reemplaza las ventanas tipo RPG)

- **Paneles:** fondo `--panel` al 92 %, borde de 1 px en `--linea`, esquinas cortadas a 45° de 8 px y corchetes de esquina de 12 px en `--cian`.
- **Encabezado de panel:** índice y etiqueta tipo sistema (por ejemplo, «01 · HV ESTA SEMANA») con una línea fina hasta el borde.
- **Barras:** segmentadas, de 6 a 8 px de alto, con marcas cada 10 % y el valor numérico siempre al lado.
- **Botones:** esquina cortada, borde `--cian` y fondo cian al 12 %; foco visible con anillo de 2 px separado 2 px.
- **Placas de personaje:** retrato pequeño, nombre, nivel y barras, como la ficha de un escáner.
- **Texturas:** líneas de escaneo al 4 % y una retícula muy suave detrás de la arena, nunca sobre el texto; se apagan con el interruptor de efectos.
- **Brillo de neón:** solo en números clave y bordes activos, con un resplandor corto; sin desenfoques grandes que ensucien la lectura.
- **Modal tipo transmisión entrante:** barra superior «▶ TRANSMISIÓN · EmpresaX», retrato a la izquierda y texto a la derecha que se escribe letra por letra (tocar lo completa).

### Sonido

Opcional y apagado por defecto. Bips chiptune cortos para golpe, curación, crítico y victoria, con un interruptor en la barra superior.

## 3. Mapa de pantallas y nav bar

Propuesta: cuatro pestañas fijas abajo y modales que aparecen encima de cualquier pantalla. Cuatro es el límite cómodo para el pulgar con etiquetas legibles en pixel font.

| Pestaña | Pregunta que responde | Contenido principal | Datos que usa |
| --- | --- | --- | --- |
| Arena (Home) | ¿Cómo voy esta semana? | Combate, stats clave y replay de eventos nuevos | `postulaciones`, `semanas`, `porEnviar` |
| Misiones | ¿Qué hago hoy? | HV listas para enviar y siguientes acciones de seguimiento | `porEnviar`, `seguimiento.siguiente` |
| Bitácora | ¿Qué ha pasado? | Historial de combates: cada postulación y correo como una entrada con su estado | `postulaciones.lista`, `correos.lista`, `seguimiento` |
| Héroe | ¿Cuánto he crecido? | Nivel, stats acumuladas, semanas ganadas y logros | Todo el modelo más el progreso guardado en el navegador |

### Reglas de la nav bar

- Altura de 64 px, con cada pestaña de al menos 48×48 px tocables.
- Ícono pixel de 16×16 a escala ×2 más etiqueta siempre visible (nunca solo ícono).
- Pestaña activa: ícono en `--oro`, etiqueta en blanco y barra superior de 3 px. Inactivas en `--texto-2`.
- Insignia con número en Misiones cuando hay HV listas o acciones pendientes.
- Al cambiar de pestaña, transición de corte tipo pantalla de RPG (persiana de 150 ms); con movimiento reducido, cambio inmediato.

### Capa de modales (sobre cualquier pestaña)

- Eventos de combate (sección 7).
- Subida de nivel y logro desbloqueado.
- Detalle de una stat al tocarla.

## 4. Pantalla 1: Home (Arena)

El Home se parte en dos: la arena arriba (45 %) cuenta la historia y el panel de abajo (cerca del 40 %) muestra los números reales. En 3 segundos se sabe cómo va la semana y qué hacer hoy.

&#91;embedded content: Wireframe del Home · valores de ejemplo con datos al 25 oct\]

La arena es la recompensa emocional; el panel es la herramienta. Por eso el panel nunca se tapa con animaciones.

### Zonas

| Zona | Altura | Contenido | Al tocar |
| --- | --- | --- | --- |
| Barra de estado | 48 px | Semana del juego (la carpeta de `CV/`), día, racha y botón de ajustes | Racha: explica cómo se cuenta |
| Arena | 45 % | Reclutador a la izquierda y Oscar a la derecha, cada uno con placa de nombre y barra de HP; caja de diálogo abajo | Personaje: qué significa su HP. Diálogo: siguiente evento |
| Panel de stats | Cerca del 40 % | Fila héroe, tarjetas 2×2 y fila de munición | Tarjeta: modal de detalle con la lista real |
| Nav bar | 64 px | Arena, Misiones, Bitácora, Héroe | Cambia de pestaña |

### Stats a plena vista

1. **HV esta semana contra la meta (fila héroe).** Es lo que más depende de Oscar. Barra de 10 bloques, cada uno vale 5 HV.
2. **Total enviadas.** Da perspectiva de todo el esfuerzo acumulado.
3. **En proceso.** En verde, con ícono de espada.
4. **Rechazadas.** En rojo, con ícono de escudo roto. Se muestra con neutralidad, sin dramatizar.
5. **Tasa de respuesta (agregada).** Indica si las HV funcionan, no solo cuántas salen. Es la métrica que un coach mira primero.
6. **Munición: HV listas para enviar (agregada).** Es la acción más directa del día y lleva a Misiones.

Quedan fuera del Home para no saturar: correos en frío y vacantes encontradas. Viven en Bitácora y Héroe.

### Estados de la pantalla

- **Cargando:** muestra al instante la última foto guardada en el navegador y el aviso «Actualizando…». Nunca una pantalla vacía.
- **Hora de los datos y botón Actualizar (26 oct):** sobre el panel de números (y arriba en Misiones) va «Datos de hoy, 11:52» con un botón «Actualizar» que lee Drive en ese momento (ver sección 11). Mientras lee dice «Leyendo Drive…»; durante el replay el botón espera. Lo nuevo que traiga se reproduce en la arena, aunque se haya tocado desde Misiones.
- **Sin conexión o error:** última foto guardada con el aviso «Sin conexión. Datos del 25 oct, 11:05» o «No se pudo leer Drive», en magenta.
- **Semana recién creada (26 oct):** una carpeta de semana nueva y vacía en `CV/` ya es la semana actual, con su jefe con 50/50 HP; antes salía como una HV enviada en una «Semana 5» sin nombre.
- **Hay eventos nuevos:** la caja de diálogo dice «¡Pasaron 5 cosas desde tu última visita!» y arranca el replay (sección 7), con botón Saltar.
- **Semana nueva:** entra un Reclutador nuevo con HP 50/50 y el cartel «SEMANA 5».
- **Meta cumplida:** el Reclutador queda KO en el suelo hasta que empiece la siguiente semana.
- **Dos o más días sin envíos:** el Reclutador hace una animación de burla y el diálogo recuerda con amabilidad cuántas HV hay listas.

### Diálogos de ejemplo

- «¡Enviaste 3 HV! El Reclutador pierde 3 HP.»
- «NuevaEmpresa te invitó a una prueba. ¡El Reclutador queda aturdido!»
- «OtraEmpresa dijo gracias por participar. Recibes 8 de daño, pero ganas +1 de Resiliencia.»

## 5. Sistema de stats

Hay dos capas: las métricas reales, que nunca se maquillan, y las stats del juego, que traducen esas métricas en emoción. Regla de honestidad: el HP del Reclutador siempre es exactamente las HV que faltan para la meta de la semana.

### Stats de Oscar

| Stat | Rango | Sube con | Baja con | Dónde se ve |
| --- | --- | --- | --- | --- |
| HP (ánimo) | 1 a 100 | Cada 10 HV en la semana +15; respuesta, prueba o entrevista +20; semana nueva +20 | Rechazo −8 (reducido por Resiliencia); correo rebotado −3 | Placa en la arena |
| Nivel y XP | Nivel 1 en adelante | Toda acción real (tabla de la sección 6) | Nunca baja | Placa en la arena y Héroe |
| Poder | 0 a 30 | Cada HV enviada en la semana +1 | Se vacía al empezar la semana | Barra cian bajo el HP |
| Resiliencia | 0 en adelante | +1 por cada rechazo | Nunca baja | Héroe |
| Racha | Días seguidos | Cada día con al menos 1 envío | Un día sin envíos la reinicia (los fines de semana no cuentan) | Barra de estado |

### Submeta de 30 y semana legendaria (decidido el 27 oct)

Con la meta de 50 el jefe sobrevivió las cuatro primeras semanas (13, 23, 24 y 29 HV) aunque el ritmo subía: una meta que nunca se cumple desmotiva. Desde el 27 oct:

- **Submeta de la semana: 30** (`submeta` en el JSON, `DASHBOARD_WEEKLY_SUBGOAL`). El HP del jefe es exactamente 30 menos las HV reales de la semana; con 30 queda KO y la semana se gana.
- **Meta grande: 50** (`meta`). Al llegar a 50 la semana es **legendaria** (efecto `legendaria`, modal grande, +150 XP); entre 30 y 50 el panel y el jefe dicen cuántas faltan.
- **Ritmo** (`ritmoSemana`, con pruebas): bajo «HV esta semana», cuántas HV por día hábil faltan para ganar la semana y con cuántas cerrarías al ritmo de los días anteriores. La semana dura 7 días desde que se creó su carpeta y solo cuentan los días hábiles.
- La regla de honestidad no cambia: cada punto de HP es una HV real que falta.

### Stats del Reclutador (jefe semanal)

| Stat | Valor | Comportamiento |
| --- | --- | --- |
| HP | Meta (50) menos las HV enviadas esa semana | Llega a 0 = KO y semana ganada |
| Aturdido | Sí o no | Se activa con una prueba o entrevista y dura 24 horas de animación |
| Ataques | Rechazo y correo rebotado | Son los únicos eventos que le hacen daño a Oscar |

### Jefes semanales (decidido: uno distinto cada semana)

Cada semana de `CV/` trae un jefe nuevo. Todos usan las mismas reglas (HP = meta menos HV de la semana); cambian solo el sprite, el nombre, la frase de entrada y el nombre de su ataque. Así hay variedad sin complicar el sistema. Rotan en orden y se repiten cuando se acaba la lista.

| # | Jefe | Aspecto | Frase de entrada | Su ataque de rechazo |
| --- | --- | --- | --- | --- |
| 1 | Gerente Gracias por Participar | Traje, corbata, maletín y sonrisa forzada | «Valoramos mucho tu interés…» | Carta de agradecimiento |
| 2 | Señor Silencio | Traje gris, sin boca, mira el celular | «…» | Visto y no respondido |
| 3 | Doctora Filtro ATS | Robot de oficina con gafete y lupa | «Palabras clave insuficientes.» | Escaneo rojo |
| 4 | Licenciado Experiencia Requerida | Corbata larga y diploma enrollado | «Junior, con 5 años de experiencia.» | Lluvia de requisitos |
| 5 | La Reclutadora Fantasma | Semitransparente, con portapapeles | «Te escribimos pronto.» | Desaparece (ghosting) |
| 6 | El Comité | Tres cabezas detrás de una mesa | «Lo vamos a discutir internamente.» | Votación en contra |

Al derrotar a un jefe (50 HV) queda guardado en la ficha de Héroe como trofeo de esa semana. Los jefes de las semanas pasadas aparecen en Héroe como vencidos o sobrevivientes, según si se llegó a la meta.

### Poder especial: Avalancha (30 HV en la semana)

Al llegar a 30 HV, la barra de Poder se llena y se activa Avalancha hasta el fin de la semana. Para no romper la regla de honestidad, el poder no quita HP extra al Reclutador. En cambio:

- Todas las acciones dan XP ×2.
- Escudo: el daño de los rechazos baja a la mitad.
- Oscar tiene un aura cian visible en la arena.

### Fórmulas

Daño de un rechazo, con rendimientos decrecientes por Resiliencia (con 10 de Resiliencia, un rechazo quita 4 en vez de 8):

```latex
\text{Golpe} = \max\left(2,\ \text{round}\left(8 \cdot \frac{10}{10 + \text{Resiliencia}}\right)\right)
```

XP necesaria para pasar del nivel n al siguiente:

```latex
XP(n) = 100 \cdot n^{1{,}5}
```

Multiplicador de racha: +10 % por cada 3 días seguidos, con tope de ×1,5.

Con el ritmo actual (unas 22 HV por semana), Oscar sube un nivel cada 1 o 2 semanas al principio y cada 3 o 4 más adelante. Hay que validarlo con una simulación antes de fijar los números.

## 6. Eventos reales y su efecto en el juego

Cada fila es una regla del motor del juego. Lo que Oscar controla da XP y avanza la pelea; lo que no controla puede doler, pero siempre deja algo (XP o Resiliencia).

| Evento real | Fuente | Acción en el juego | Efecto en stats | Presentación |
| --- | --- | --- | --- | --- |
| HV enviada | `Aplicadas` (Creada) | Ataque básico: Oscar lanza una hoja de vida | Reclutador −1 HP, +10 XP, Poder +1 | Agrupado en el diálogo («¡Enviaste 3 HV!») |
| 10 HV en la semana (y 20, 40) | Cálculo semanal | Poción | Oscar +15 HP | Modal pequeño |
| 30 HV en la semana | Cálculo semanal | Se activa Avalancha | XP ×2 y escudo hasta fin de semana | Modal grande |
| 50 HV en la semana | Cálculo semanal | KO del Reclutador | +100 XP, semana ganada | Modal grande |
| Respuesta, prueba o entrevista | `Aplicadas` (En proceso) y `Seguimiento` | Golpe crítico; Reclutador aturdido | Oscar +20 HP, +50 XP | Modal grande |
| Rechazo | `Aplicadas` (Rechazada) | Ataque «Gracias por participar» | Oscar pierde HP según la fórmula, +1 Resiliencia, +5 XP | Modal mediano |
| Correo en frío entregado | `Correos en frío` | Hechizo lanzado | +5 XP | Agrupado en el diálogo |
| Correo en frío rebotado | `Correos en frío` | Hechizo fallido | Oscar −3 HP | Agrupado en el diálogo |
| Empresa respondió un correo en frío | `Correos en frío` (Respondió) | Un aliado se une | Oscar +10 HP, +30 XP | Modal grande |
| HV lista para enviar | `Por enviar` | Munición cargada | Munición +1 | Fila de munición e insignia en Misiones |
| Vacantes nuevas | `Hoja 1` | Enemigos en el radar | Ninguno | Contador en Misiones |
| Siguiente acción de seguimiento | `Seguimiento` | Misión nueva | Ninguno | Insignia en Misiones |
| Racha de 3, 6 o 9 días | Cálculo diario | Combo | Multiplicador de XP | Aviso breve en la barra de estado |
| Oferta de trabajo (a futuro) | No existe todavía | Victoria final | Pantalla de créditos | Pantalla completa |

El silencio de una empresa no castiga: una postulación sin respuesta no resta nada.

## 7. Modales de evento

Los modales son el momento de juego: cada uno cuenta un evento real con animación, dato y efecto. Hay tres tamaños según la importancia, y todos salen de una cola de replay al abrir la app.

### Anatomía (de arriba abajo)

1. **Título de acción** en pixel font: «¡GOLPE CRÍTICO!», «¡TE ATACAN!», «¡SEMANA GANADA!».
2. **Escena animada** con los dos sprites (de 1 a 1,5 segundos).
3. **Dato real:** empresa, cargo y fecha («EmpresaX · Diseñador UX · 24 oct»).
4. **Efecto en stats:** los números suben o bajan en vivo («+20 HP» en verde, «+50 XP» en oro).
5. **Siguiente paso opcional y de solo lectura:** «Ver correo» o «Ver carpeta», que abren Gmail o Drive.
6. **Botón «CONTINUAR ▶»** de ancho completo y al menos 48 px de alto.

### Tamaños

| Tamaño | Cuándo | Forma |
| --- | --- | --- |
| Pequeño | Poción, combo de racha | Banda en la parte baja de la arena; se cierra sola en 3 s |
| Mediano | Rechazo | Ventana sobre la arena; el panel de stats sigue visible |
| Grande | Prueba o entrevista, aliado, Avalancha, KO, subida de nivel | Pantalla casi completa con fondo oscurecido |

### Reglas de la cola de replay

- Orden cronológico por fecha del evento real.
- Los eventos iguales del mismo día se agrupan: 5 HV enviadas son un solo ataque en ráfaga, no 5 modales.
- Máximo 5 modales grandes o medianos por visita; el resto queda en un resumen final («y 4 eventos más, ver en Bitácora»).
- Botón «Saltar todo» siempre visible: aplica los efectos sin animación.
- Si en el mismo lote hay una buena y una mala noticia, la buena va al final para cerrar la visita en alto.
- Un evento ya visto no se repite (se guarda el último evento visto en el navegador).

### Copy de ejemplo

- **Prueba recibida:** «¡GOLPE CRÍTICO! EmpresaX te envió una prueba. El Reclutador queda aturdido.» Efecto: +20 HP, +50 XP. Paso: Ver correo.
- **Rechazo:** «¡TE ATACAN! EmpresaY dijo gracias por participar.» Efecto: −7 HP, +1 Resiliencia. Cierre: «Cada rechazo te hace más duro.»
- **10 HV:** «¡Encontraste una poción! 10 HV esta semana.» Efecto: +15 HP.
- **Avalancha:** «¡AVALANCHA! 30 HV esta semana. XP doble y escudo hasta el domingo.»
- **KO:** «¡SEMANA GANADA! 50 HV enviadas. El Reclutador cae.» Efecto: +100 XP.

Tono: celebrar sin exagerar y nombrar el rechazo con calma, sin burla hacia Oscar ni hacia la empresa.

## 8. Catálogo de animaciones

Todas las animaciones son cortas (menos de 1,5 s) y nunca tapan los números del panel. Los personajes se animan por cuadros (`steps()` en CSS); la interfaz usa transiciones cortas y suaves de 150 a 250 ms.

| Animación | Se dispara con | Duración | Cómo se ve | Con movimiento reducido |
| --- | --- | --- | --- | --- |
| Respiración (idle) | Siempre | Ciclo de 1 s, 2 cuadros | Ambos personajes suben y bajan 1 píxel | Sprite quieto |
| Ataque básico | HV enviada | 600 ms | Oscar avanza 16 px y lanza una hoja; el Reclutador parpadea en blanco 2 veces y flota un «−1» | El número aparece sin moverse |
| Ráfaga | Varias HV el mismo día | 900 ms | Varias hojas en abanico y un solo número total («−5») | El número aparece sin moverse |
| Golpe crítico y aturdido | Prueba o entrevista | 1,2 s | Texto «¡CRÍTICO!» en oro, sacudida de 4 px y estrellas girando sobre el Reclutador durante 24 h | Sin sacudida; estrellas fijas |
| Recibir rechazo | Rechazo | 1 s | El Reclutador lanza un sobre; Oscar retrocede, parpadea en rojo y flota el daño; luego sube «+1 Resiliencia» | Solo los números |
| Poción | 10, 20 o 40 HV | 800 ms | Brillo verde que sube por Oscar y la barra de HP se llena contando | La barra cambia sin brillo |
| Avalancha | 30 HV | 1,5 s | Aura cian de 2 cuadros alrededor de Oscar y la barra de Poder destella al llenarse | Aura fija sin destello |
| KO | 50 HV | 1,5 s | El Reclutador cae, el maletín se abre y vuelan papeles; cartel «¡SEMANA GANADA!» | Reclutador caído, sin papeles |
| Burla | 2 días sin envíos | Ciclo de 2 s | El Reclutador se ríe y mira su reloj | Sprite quieto |
| Subida de nivel | Nueva XP alcanza el umbral | 1,2 s | Cartel «NV 8» que baja desde arriba con fanfarria corta | Cartel sin movimiento |
| Barra con rastro | Cualquier pérdida de HP | 400 ms | La parte perdida queda en blanco y luego baja hasta el nuevo valor | Cambio inmediato |
| Conteo de números | Cualquier stat que cambia | 300 a 600 ms | El número cuenta hasta el nuevo valor | Valor final inmediato |
| Cambio de pestaña | Tocar la nav bar | 150 ms | Persiana horizontal de RPG | Cambio inmediato |

### Efectos del HUD

| Efecto | Se dispara con | Duración | Cómo se ve | Con movimiento reducido |
| --- | --- | --- | --- | --- |
| Escritura de texto | Diálogos y modales | 25 ms por letra | El texto aparece letra por letra; tocar lo completa | Texto completo de inmediato |
| Interferencia (glitch) | Recibir un rechazo | 150 ms | El panel del jefe se desplaza 2 px con separación de color | Sin efecto |
| Barrido de escáner | Llega un jefe nuevo | 600 ms | Una línea cian recorre al jefe y aparece su ficha | Ficha sin barrido |
| Pulso de número | Cualquier número que cambia | 300 ms | El número brilla y vuelve a su tono | Sin brillo |
| Arranque del HUD | Abrir la app | 400 ms | Los paneles se encienden en orden de arriba abajo | Todo visible de inmediato |

Seguridad: ningún destello se repite más de 3 veces por segundo (criterio WCAG 2.3.1).

## 9. Pantallas Misiones, Bitácora y Héroe

Las tres pantallas usan las mismas ventanas y tarjetas del Home, sin animaciones de combate. En la v1 son listas claras: lo jugable vive en la Arena y en los modales.

### Caja de diálogo compacta (26 oct)

El usuario pidió que el mensaje del jefe ocupe menos: cara de 48 px recortada del sprite sin escalar, nombre corto del jefe en una línea (el completo va en `title`), voz a 16 px en el celular (18 desde 760 px), menos relleno y botones del replay de 44 px en una sola fila.

### Misiones: ¿qué hago hoy?

1. **Munición lista** (`porEnviar`): una tarjeta por HV con empresa, cargo, revisión (LISTA o REVISAR, con ícono) y días que lleva lista. Orden: la más antigua primero. Con más de 3 días se marca «¡Se enfría!» en oro. Botón «Abrir carpeta» (Drive, solo lectura).
2. **Seguimientos** (`seguimiento` con `siguiente` no vacío): las 10 acciones más recientes con empresa, acción y fecha.
3. **Radar** (`vacantes`): «118 vacantes encontradas en 14 días» con una barra pequeña por día.

Estado vacío: «Sin misiones por hoy. La próxima búsqueda llega a las 7:00.»

### Bitácora: ¿qué ha pasado? (por semana desde el 26 oct)

Decisión del usuario: poder cambiar de semana, ver a cuáles lo rechazaron y qué hizo en cada vacante, y ver el histórico.

- **Abre en la semana actual.** Arriba: ◀ selector ▶ para pasar entre «Histórico (todas)» y cada semana de `CV/`. Héroe (cada barra de «HV por semana») y la tarjeta «Total» de la Arena llevan directo a una semana o al histórico.
- **Resumen de la semana:** HV contra la meta con su barra, el jefe y cómo terminó (★ vencido, «Sobrevivió con N HP» o «En curso: faltan N HV»).
- **Histórico:** una fila por semana (HV, en proceso, rechazadas, jefe y resultado); tocarla abre esa semana.
- **Filtros con su cifra:** Todas, En proceso, Rechazadas, Sin respuesta y Correos (los correos en frío enviados entre el inicio de esa semana y el de la siguiente).
- **Una fila por postulación**, no por evento: ícono y palabra del estado (con su fecha), cargo, día de envío y, en ámbar, la acción pendiente si la hay.
- **Ficha de la vacante** al tocar la fila: estado, línea de tiempo (envío y cada hallazgo de `Seguimiento` con su estado y siguiente acción), lo pendiente, el efecto total en el juego, «Ver de nuevo en la arena» y «Ver carpeta».
- Motor (funciones puras con pruebas): `mismaEmpresa` (un nombre es el otro más palabras completas; «Empresa 1» no es «Empresa 16»), `historiaDePostulacion` (si la empresa tiene varias postulaciones, cada hallazgo va a la más reciente enviada antes de él o a la del mismo cargo), `accionPendiente` y `semanasDetalle`.
- Sin búsqueda de texto.

### Héroe: ¿cuánto he crecido?

- Retrato grande de Oscar, nivel y barra de XP.
- Stats: HP, Resiliencia, Poder, Racha y semanas ganadas.
- Gráfica de barras de HV por semana con la línea de meta en 50.
- Correos en frío: enviados, entregados, rebotados y respondieron.
- Seis logros en la v1: Primera HV, Primera prueba, 10 correos entregados, Semana de 30, Semana de 50 y Racha de 5 días. Los bloqueados se ven en gris con su requisito.

### Primera visita

Presentación de 3 pasos con la regla central: «Tus HV le quitan vida al jefe; las respuestas te curan; los rechazos te hacen más fuerte.»

## 10. Accesibilidad y movimiento reducido

Objetivo: WCAG 2.2 AA completo, sin perder el sabor retro.

- [ ] Contraste de texto de al menos 4,5:1 y de barras e íconos de al menos 3:1 sobre `--ventana` (validar cada token de la paleta).
- [ ] Objetivos táctiles de al menos 48×48 px; nada importante depende de un gesto.
- [ ] Todo número del panel es texto real, no imagen, para que lo lean los lectores de pantalla.
- [ ] Cada sprite tiene texto alternativo con su estado («Reclutador, aturdido, 32 de 50 HP»).
- [ ] Los modales usan `role="dialog"`, atrapan el foco, se cierran con Escape y devuelven el foco al elemento que los abrió.
- [ ] Los eventos del replay se anuncian en una región `aria-live="polite"`.
- [ ] Con `prefers-reduced-motion`, se aplican las versiones de la columna «Con movimiento reducido» de la sección 8; también hay un interruptor manual en ajustes.
- [ ] El color nunca es la única señal: cada estado lleva ícono o palabra.
- [ ] La pixel font no baja de 12 px y el texto de diálogo no baja de 20 px; la interfaz soporta zoom al 200 % sin cortar contenido.
- [ ] El sonido arranca apagado y nunca suena sin una acción del usuario.

## 11. Datos y contrato técnico

El juego lee el mismo JSON de `buildDashboardModel` (`?formato=json&k=<clave>`) y calcula todas las stats con una función pura a partir del historial completo de eventos. Así, Oscar y el coach ven exactamente el mismo estado en cualquier dispositivo.

### Decisión clave

Las stats del juego (HP, XP, nivel, Resiliencia, Poder) no se guardan: se recalculan cada vez, recorriendo los eventos en orden. En el navegador solo se guarda:

- El último evento visto, para saber qué reproducir en el replay.
- Preferencias: sonido y movimiento reducido manual.
- La última foto del JSON, para mostrar algo al instante y funcionar sin conexión.

### Lo que falta en el JSON

| Dato | Para qué | Dónde existe hoy |
| --- | --- | --- |
| Fecha de creación de cada postulación en `postulaciones.lista` | Ataques por día, racha y orden del replay | Columna `Creada` de `Aplicadas` (`creada` ya está en la lista; confirmar que sea fecha completa) |
| Fecha del cambio de estado (respuesta o rechazo) | Ubicar golpes críticos y ataques en el tiempo | `Seguimiento` (Fecha del mensaje) |
| Identificador estable por evento | Saber qué eventos ya se vieron | Se puede derivar de empresa, cargo, estado y fecha |
| Envíos por día | Racha | Calculable desde `Creada` |

### Frescura de los datos (decidido el 26 oct)

- `sincronizarAplicadas` lee Drive cada hora y deja las pestañas `Aplicadas` y `Por enviar` y la caché del JSON. Al abrir, el juego pide la caché (rápida).
- Si esos datos tienen más de 15 minutos (`DATOS_VIEJOS_MIN`, `minutosDesde` en el motor, con pruebas), el juego pide además `&fresco=1&sync=1`: Apps Script vuelve a leer Drive (`sincronizarRegistro_`, una sola consulta para todas las carpetas), reescribe las dos pestañas y devuelve el JSON. El replay de lo que ya había no espera esa lectura (tarda varios segundos): arranca de inmediato y lo nuevo que traiga Drive se reproduce al terminar (`pendiente`, `aplicarPendiente`; también tras la introducción). Mientras tanto la fila dice «Leyendo Drive…» y luego «Drive leído: lo nuevo va al final».
- `sincronizarRegistro_` deja en el registro de ejecuciones el tiempo de cada paso («Sincronización: carpetas … · Aplicadas … · Por enviar … · tablero …»).
- El botón «Actualizar» hace lo mismo a pedido. El tablero del coach usa la misma petición en su botón.
- Las carpetas de primer nivel de `CV/` son siempre semanas: una vacía no es una postulación, y el JSON trae todas las semanas aunque no tengan envíos (`semanasCarpetas` → `postulaciones.semanas` con `total: 0`).

### Restricciones heredadas de la arquitectura

- Repositorio público: el código no incluye nombres, correos, la clave ni el id de la implementación. Los nombres de empresas solo aparecen en tiempo de ejecución, desde el JSON.
- Solo lectura: el juego no escribe en Sheets, Drive ni Gmail.
- Publicación en GitHub Pages como `apps_script/juego.html`, con el enlace `#api=…&k=…` igual al del tablero.

## 12. Decisiones abiertas

Para no frenar la v1, cada decisión tiene un valor por defecto que se puede cambiar después.

- [x] **Enemigo:** decidido el 25 oct, un jefe distinto cada semana (sección 5). En la v1 cambian solo nombre y frase; el arte de cada jefe llega en la v2.
- [x] **Estilo de Oscar:** decidido el 25 oct, pixel art detallado de la referencia (sección 2).
- [x] **Daño del rechazo:** 8 HP base en la v1; se ajusta después de jugar unas semanas.
- [x] **Vista del coach:** la misma vista, sin replay automático.
- [x] **Sonido:** fuera de la v1.
- [x] **Imagen de Oscar en un repositorio público:** el retrato quedaría visible en GitHub. Alternativa: cargarlo en tiempo de ejecución desde un enlace privado. Oscar decide.
- [x] **Final del juego:** qué pasa al llegar una oferta. Queda para la v2.

## 13. Instrucciones para Claude Code

Esta sección se pega tal cual en Claude Code junto con el documento completo. Lista para construir la v1 desde el 25 oct.

### Alcance de la v1 (primera versión jugable)

**Entra:**

- Home completo con datos reales, estados de carga, error y sin conexión (sección 4).
- Motor de reglas completo (secciones 5 y 6) con pruebas.
- Replay con la cola de modales (sección 7).
- Animaciones básicas: respiración, ataque básico y ráfaga, número flotante, barra con rastro, parpadeo de golpe, conteo de números, aturdido con estrellas y cartel de subida de nivel. Todas con su versión de movimiento reducido.
- Misiones, Bitácora y Héroe como en la sección 9.
- Lista de accesibilidad de la sección 10.

**Queda para la v2:** arte propio de cada jefe, expresiones del retrato, sonido, animaciones especiales (KO con papeles, aura de Avalancha, burla), galería de jefes vencidos y final del juego.

**Arte provisional en la v1:**

- Mientras el arte no esté listo, cada personaje se muestra como una silueta oscura con su contorno de neón (cian para Oscar y magenta para el jefe), en el tamaño final. Nunca se usa la foto ni la ilustración de referencia.
- Las siluetas se reemplazan después sin tocar el código: mismas rutas, mismos tamaños y mismo número de cuadros que la biblia de arte.

**Terminado cuando:**

- Abre en el celular en menos de 2 segundos usando la caché.
- Los números del panel coinciden con los del tablero actual.
- Las pruebas del motor pasan con las 4 semanas reales.
- Saltar todo el replay deja exactamente las mismas stats que verlo completo.

### Pila técnica propuesta

- Un solo archivo `apps_script/juego.html` con HTML, CSS y JavaScript sin framework ni paso de compilación, igual que el tablero actual.
- Interfaz en DOM y CSS (no canvas) para que los números sean texto accesible; sprites en hojas PNG con `image-rendering: pixelated`.
- Fuentes Chakra Petch, Share Tech Mono y Silkscreen desde Google Fonts.
- El motor de reglas (eventos a stats) va como funciones puras separadas de la interfaz, con pruebas.

### Orden de construcción

1. Tokens de la paleta, tipografía, ventanas y el Home estático con datos de ejemplo.
2. Conexión al JSON real y estados de carga, error y sin conexión.
3. Motor de reglas de las secciones 5 y 6, con pruebas sobre las 4 semanas reales.
4. Cola de replay y modales de la sección 7.
5. Animaciones de la sección 8, cada una con su versión de movimiento reducido.
6. Pestañas Misiones, Bitácora y Héroe.
7. Revisión de accesibilidad con la lista de la sección 10.

### Reglas que Claude Code no puede romper

- Nunca enviar correos ni cambiar estados de postulaciones.
- Nunca poner datos personales, la clave ni el id de la implementación en el repositorio.
- El HP del Reclutador siempre es igual a la meta menos las HV reales de la semana.
