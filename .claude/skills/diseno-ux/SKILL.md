---
name: diseno-ux
description: Estándares de UX/UI del usuario (diseñador UX/UI) para todo lo visual del proyecto — el tablero para el coach (apps_script/dashboard.html), páginas, artefactos y diseños en Figma —: para quién y para qué decisión es la pantalla, celular primero, jerarquía, accesibilidad WCAG 2.2 AA, áreas táctiles, estados vacío/carga/error, gráficas honestas, tokens en vez de valores sueltos, y una lista de chequeo con capturas a 390 y 1280 px antes de entregar. Úsala siempre que crees o cambies una interfaz, cuando el usuario pida "mejora el diseño", "hazlo más usable", "rediseña", "revisa la UX", o antes de pasarle una pantalla para revisar.
---

# Diseño UX/UI

El usuario es diseñador UX/UI: va a juzgar cada pantalla con criterio profesional. Esta skill es la base estándar (decisión
del usuario 2026-10-25); él la ajusta con sus propias reglas. Si algo de aquí choca con lo que él diga en la conversación
o con su sistema de diseño en Figma, manda lo de él.

## 1. Antes de diseñar: para quién y para qué

Escribe en una línea, antes de tocar nada:
- **Quién la usa y dónde** (p. ej. "el coach, en el celular, entre otras cosas").
- **La decisión o pregunta que debe resolver en ≤ 10 s** (p. ej. "¿va a buen ritmo?, ¿dónde se atasca?, ¿qué sigue?").
- **Qué NO necesita ver** (lo que se puede ir a una pestaña secundaria o quitarse).

Cada bloque de la pantalla tiene que responder a esa pregunta; si no, sobra o va más abajo.

## 2. Principios (base estándar)

**Jerarquía y contenido**
- Lo más importante arriba y más grande: una cifra principal por pantalla, con su contexto (meta, comparación, lo que falta).
  Una cifra sin contexto no ayuda a decidir.
- Lo accionable (qué sigue, con plazo) antes que lo descriptivo (gráficas e historial).
- Textos en español claro y sin jerga interna (nada de "MENOR_PRIORIDAD" ni "Rebotado parcialmente": tradúcelos).
- Números con formato local: `22,5 %`, `1.234`, fechas como "25 oct".

**Celular primero**
- Diseña a 390 px y luego amplía; nada de desborde horizontal (salvo una tira que se desliza a propósito, con pista visual).
- Navegación principal al alcance del pulgar: barra inferior fija con máximo 5 destinos en celular; pestañas arriba en escritorio.
- Área táctil mínima de 44 × 44 px (WCAG 2.5.8 pide 24; usamos 44); filas enteras tocables cuando llevan a un detalle.
- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` en toda página HTML (sin ella el
  celular la muestra como escritorio: pasó con el tablero en GitHub Pages el 2026-10-25).

**Accesibilidad (WCAG 2.2 AA)**
- Contraste ≥ 4,5:1 en texto normal y ≥ 3:1 en texto grande, íconos y bordes de controles, en modo claro y oscuro.
- El color nunca va solo: estado = color + texto (+ ícono o punto). Rojo/verde siempre con etiqueta.
- Foco visible con teclado, orden lógico, `aria-live` donde cambian datos, `role="tablist"` en pestañas, textos alternativos.
- Respeta `prefers-reduced-motion` y `prefers-color-scheme`.

**Estados (todos diseñados, no solo el "feliz")**
- Carga: esqueleto con la forma del contenido, no un spinner en blanco; si hay datos anteriores, muéstralos mientras llegan
  los nuevos y di "Actualizando…".
- Vacío: qué significa y qué hacer ("Todavía no hay correos en frío enviados").
- Error/sin conexión: qué pasó en lenguaje humano y si los datos mostrados son viejos.
- Privado/sin permiso: mensaje claro, sin exponer nada.

**Gráficas** (aplica también la skill `dataviz`)
- Elige por la pregunta: progreso → barra con meta; comparación → barras; embudo → barras de un mismo total.
- Eje y escala honestos (barras desde cero; la meta visible), etiquetas directas en vez de leyendas lejanas.
- Resalta lo actual (semana en curso) y atenúa lo histórico.

**Sistema**
- Nada de valores sueltos: colores, espacios, radios y tipografía salen de tokens (variables CSS en código; variables y
  estilos en Figma). Escala de espacio 4/8/12/16/24/32; radios 8/12/16/completo.
- Componentes antes que piezas sueltas: insignia de estado, métrica, acción pendiente, pestaña. Si algo se repite, es un componente.
- Modo oscuro desde los mismos tokens, no como segunda paleta a mano.

**Rendimiento percibido**
- La primera pintura útil en < 1 s en el celular: datos en caché o los últimos vistos (`localStorage`, con try/catch) y
  esqueleto; lo pesado después.

## 3. Figma

El usuario autorizó el conector de Figma (2026-10-25). Su propuesta del tablero vive en su Figma, en el archivo
"Tablero búsqueda UX — rediseño" (equipo "UI Design 15"; si necesitas el enlace, pídeselo: no se guarda en este repo
público). Ese archivo tiene:
- Variables `Tablero / Color` (modos Claro y Oscuro) y `Tablero / Medidas` (espacios, radios, `size/touch-min` = 44).
- Estilos de texto `Tablero/*` (Display, Title, Heading, Body, Label, Caption, Overline, Metric) en Inter, y la sombra
  `Tablero/Elevación 1`.
- Componentes: Insignia de estado, Métrica, Acción pendiente (urgencia Hoy/Esta semana/Sin fecha), Pestaña inferior.
- Pantallas: Celular · Resumen (390), Escritorio · Resumen (1280), Celular · Modo oscuro, y la nota "Decisiones de diseño".

Flujo acordado: el diseño se discute y aprueba en Figma; luego se implementa en `apps_script/dashboard.html` llevando los
tokens de Figma a variables CSS con los mismos nombres. Antes de escribir en Figma carga las skills `figma-use` y
`figma-generate-design`; para pasar de Figma a código, `figma-design-to-code`. No uses las bibliotecas de otros proyectos
del usuario (marketplace de artesanos, clases): son otra marca. Los íconos de "Material Design Icons (Community)" sí sirven.

## 4. Lista de chequeo antes de entregar (obligatoria)

1. Capturas con Playwright a **390 × 844** (con `isMobile`) y **1280 × 800**, en claro y en oscuro; míralas tú antes de mandarlas.
2. `document.documentElement.scrollWidth - innerWidth === 0` en 390 px (sin desborde).
3. Ningún control tocable mide menos de 44 px de alto.
4. Cada estado probado: cargando, vacío, error/sin conexión y privado (con datos simulados si hace falta).
5. Contraste revisado en los colores nuevos; ningún estado depende solo del color.
6. Navegación completa con teclado (Tab/Shift+Tab/flechas en pestañas) y foco visible.
7. Textos: sin jerga interna, números y fechas en formato local, sin texto cortado.
8. La pregunta de la sección 1 se responde en ≤ 10 s mirando solo la primera pantalla del celular.

Al entregar, manda las capturas (celular primero) y di en una línea qué decisión de diseño tomaste y por qué; deja
explícito lo que es de criterio del usuario para que él decida.
