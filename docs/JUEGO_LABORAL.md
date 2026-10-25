# El juego laboral — Documento de diseño UI retro

Documento de diseño del usuario (25 oct 2026). Base para construir `apps_script/juego.html`; contrato de datos en `docs/ARQUITECTURA_INFORMACION.md`.

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

## 2. Dirección de arte retro

Estilo pixel art detallado de 16 bits: sombreado por bloques (cel shading), contornos oscuros y colores saturados sobre fondos oscuros. La imagen de referencia de estilo del 25 oct (retrato de Oscar con camisa lila y brazos cruzados) fija el nivel de calidad. Todo el arte es original. Decisión del 25 oct: se descarta el estilo 8 bits mínimo del primer boceto.

### Píxel y sprites

- **Dos niveles de arte, como en los RPG clásicos:** retratos detallados para los momentos importantes y sprites de combate más pequeños para la arena.
- **Retrato:** 128×160 px, al nivel de la referencia. Se usa en los modales grandes, en la ficha de Héroe y, recortado a la cara (48×48), en la caja de diálogo. Tres expresiones mínimas: sonrisa (base), alegría (golpe crítico) y gesto firme (rechazo).
- **Sprite de combate:** 64×80 px a escala ×2 en celular (128×160 en pantalla), así cabe uno a cada lado en 390 px. Mismo estilo, simplificado: contorno de 1 px y 3 tonos por color.
- Escalado siempre entero, con `image-rendering: pixelated`.
- Animaciones de 2 a 4 cuadros a 6–8 fps.
- Paleta de hasta 24 colores por personaje; contornos en morado muy oscuro en lugar de negro puro, como en la referencia.
- Fondo de la arena oscuro y con matiz morado para que la camisa lila resalte.
- Los jefes semanales usan el mismo estilo y los mismos tamaños.
- **Producción:** este nivel de detalle no se programa a mano. Opciones: dibujarlo en Aseprite a partir de la referencia, encargarlo a un ilustrador de pixel art, o generar una base con IA y limpiarla a mano (paleta fija, contornos y píxeles sueltos). La referencia ya sirve como base del retrato de Oscar.

### Ficha del sprite de Oscar

Se parte de la foto y de la referencia de estilo. En el retrato caben todos los rasgos; en el sprite de combate de 64×80 se respetan en este orden de prioridad:

| Rasgo | Cómo se traduce a píxeles | Color |
| --- | --- | --- |
| Pelo largo, ondulado y con volumen hasta los hombros | Silueta ancha que enmarca la cara; 2 o 3 píxeles de brillo para insinuar las ondas | Café oscuro #3B2A20, brillo #5A4030 |
| Gafas de montura metálica delgada con lentes tintados azul violeta | Marco de 1 px y lentes de 3×2 px; es el rasgo más distintivo a esta escala | Marco #1A1A2E, lentes #6B6FD6 |
| Sonrisa amplia mostrando los dientes | Línea blanca de 6 px en la boca | #FFFFFF |
| Arete negro en la oreja y punto bajo el labio | 1 píxel cada uno | #111111 |
| Camisa lila de manga larga con tapeta y cuello interior azul marino, botones morados | Torso lila con una franja marina vertical al centro | Lila #B48CE6, sombra #9468C8, marino #1E2A5A |
| Mangas remangadas y brazos cruzados | Pose de reposo (idle) con brazos cruzados y antebrazos en tono piel | Piel #C98E6B, sombra #A8714F |

Poses: brazos cruzados en reposo; en ataque descruza un brazo y lanza la hoja de vida; en victoria levanta el puño y sonríe más; al ser golpeado, las gafas brillan y retrocede un paso.

Nota: los colores del sprite son propios del personaje y no forman parte de los tokens de la interfaz.

### Paleta (tokens)

| Token | Hex | Uso | Contraste sobre la ventana |
| --- | --- | --- | --- |
| `--fondo` | #0E1030 | Cielo de la arena y fondo general | — |
| `--ventana` | #1B1F5E | Fondo de ventanas y tarjetas | — |
| `--borde` | #F2F2F2 | Borde de ventanas | Alto |
| `--texto` | #FFFFFF | Números y textos principales | Alrededor de 15:1 |
| `--texto-2` | #A9AED6 | Etiquetas y texto secundario | Validar ≥ 4,5:1 |
| `--hp` | #3FD16B | HP de Oscar, procesos activos | Validar ≥ 3:1 |
| `--dano` | #FF5A5A | Daño, rechazos, HP del Reclutador | Validar ≥ 3:1 |
| `--oro` | #FFC93C | Logros, XP, golpes críticos | Validar ≥ 3:1 |
| `--poder` | #4FD6FF | Barra de poder especial | Validar ≥ 3:1 |

El color nunca carga solo el significado: cada estado lleva además un ícono o una palabra (por ejemplo, −3 en rojo con ícono de golpe).

### Tipografía

- **Títulos, etiquetas y números grandes:** Press Start 2P (Google Fonts), mínimo 12 px y solo en mayúsculas cortas.
- **Textos de diálogo y detalle:** VT323 (Google Fonts), mínimo 20 px porque es una fuente pequeña.
- Números con separador local (1.234; 22,5 %).

### Ventanas

- Esquinas rectas o de 2 px, borde doble de 2 px y sombra dura de 4 px hacia abajo (sin desenfoque).
- Cursor de selección con triángulo ▶ que parpadea; indicador ▼ para pasar al siguiente texto del diálogo.

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

- **Cargando:** muestra al instante la última foto guardada en el navegador y un «▶ ACTUALIZANDO…» pequeño en la barra de estado. Nunca una pantalla vacía.
- **Sin conexión o error:** última foto guardada con el aviso «Datos del 25 oct, 11:05».
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

Todas las animaciones son cortas (menos de 1,5 s), se mueven por pasos como en los juegos retro (`steps()` en CSS, nunca curvas suaves) y nunca tapan los números del panel.

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

Seguridad: ningún destello se repite más de 3 veces por segundo (criterio WCAG 2.3.1).

## 9. Pantallas Misiones, Bitácora y Héroe

Las tres pantallas usan las mismas ventanas y tarjetas del Home, sin animaciones de combate. En la v1 son listas claras: lo jugable vive en la Arena y en los modales.

### Misiones: ¿qué hago hoy?

1. **Munición lista** (`porEnviar`): una tarjeta por HV con empresa, cargo, revisión (LISTA o REVISAR, con ícono) y días que lleva lista. Orden: la más antigua primero. Con más de 3 días se marca «¡Se enfría!» en oro. Botón «Abrir carpeta» (Drive, solo lectura).
2. **Seguimientos** (`seguimiento` con `siguiente` no vacío): las 10 acciones más recientes con empresa, acción y fecha.
3. **Radar** (`vacantes`): «118 vacantes encontradas en 14 días» con una barra pequeña por día.

Estado vacío: «Sin misiones por hoy. La próxima búsqueda llega a las 7:00.»

### Bitácora: ¿qué ha pasado?

- Lista en orden cronológico inverso que une postulaciones, correos en frío y hallazgos de seguimiento.
- Filtros en chips: Todo, En proceso, Rechazadas, Sin respuesta y Correos; selector de semana.
- Cada fila: ícono del evento, empresa, cargo, fecha y el efecto que tuvo en el juego (por ejemplo, «+20 HP»).
- Tocar una fila abre el modal mediano con el detalle, sin animación.
- Sin búsqueda de texto en la v1.

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

- Oscar: el retrato de referencia en los modales y en Héroe; en la arena, el mismo retrato recortado de la cintura hacia arriba a 128 px de ancho.
- Jefe: una silueta pixel genérica de empresario con maletín, con el nombre y la frase del jefe de la semana.
- Las imágenes se reemplazan después sin tocar el código: mismas rutas y mismos tamaños.

**Terminado cuando:**

- Abre en el celular en menos de 2 segundos usando la caché.
- Los números del panel coinciden con los del tablero actual.
- Las pruebas del motor pasan con las 4 semanas reales.
- Saltar todo el replay deja exactamente las mismas stats que verlo completo.

### Pila técnica propuesta

- Un solo archivo `apps_script/juego.html` con HTML, CSS y JavaScript sin framework ni paso de compilación, igual que el tablero actual.
- Interfaz en DOM y CSS (no canvas) para que los números sean texto accesible; sprites en hojas PNG con `image-rendering: pixelated`.
- Fuentes Press Start 2P y VT323 desde Google Fonts.
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
