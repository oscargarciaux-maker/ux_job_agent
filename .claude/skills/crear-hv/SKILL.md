---
name: crear-hv
description: Crea la hoja de vida (HV) personalizada del candidato para una vacante o para una empresa a la que se le escribirá en frío, siguiendo GUIA_CV con los datos reales de CONTEXTO_CV sobre la plantilla MASTER_TEMPLATE, sin inventar nada y en máximo 2 páginas. Úsala cuando el usuario pida "crea/haz/adapta la HV (hoja de vida, CV) para esta vacante / esta empresa", para un correo en frío, o cuando la tarea diaria deba escribir el CV_IA.json de las vacantes verificadas.
---

# Crear HV

Objetivo: una hoja de vida hecha **para esa vacante o esa empresa**, que el candidato pueda defender palabra por
palabra en una entrevista, lista para enviar después de su revisión. Nunca se envía nada: la HV queda en Drive.

## Fuentes (Google Drive, carpeta `Vacantes con IA/Recursos`, búscalas por nombre; nunca copiar su contenido a este repositorio público)

| Documento | Para qué | Manda en |
|---|---|---|
| `GUIA_CV` | El método (Adaptia Jobs): Paso 2 (análisis), Paso 2.1 (gaps), Paso 3 con sus 8 reglas, Exportación | El método. Es la guía principal |
| `CONTEXTO_CV` | La **única** fuente de datos del candidato: experiencias, logros, cifras, proyectos, educación, herramientas | Los datos. Lo que no está aquí no existe |
| `REGLAS_CV` | Decisiones personales: qué experiencias van, perfil, cargos, ubicación, nombre del archivo | Las decisiones personales, sobre `GUIA_CV` |
| `MASTER_TEMPLATE` | La plantilla con marcadores `{{...}}` que se llena (Google Doc) | El formato. No se cambia al usar la skill |
| `PLANTILLA_HV.pdf` | Ejemplo de HV terminada: cómo se ve una buena HV (estructura, tono, extensión) | Solo como referencia visual |
| `LECCIONES_HV` | Lo que al usuario no le ha gustado de sus HV y la regla que sale de cada cosa (él agrega líneas) | Sobre todo lo demás: es su feedback directo |

Las reglas de esta skill son decisiones del usuario (24 oct 2026) y mandan sobre las anteriores si chocan.
Cifras aclaradas por el usuario que deben respetarse aunque `CONTEXTO_CV` las diga distinto: Trezo, cerca de 90 personas
en total (50 encuestas y 42 entrevistas; nunca "entrevisté a más de 90"); Seguros Bolívar, equipo de 6 contándolo a él,
lideraba a 5.

## Dos modos

**A. Vacante.** Hay un aviso: una carpeta `Vacantes con IA/Sin revisar/<fecha>/<Empresa>` con su `Detalle_Vacante`,
o un enlace.
- Si viene solo un enlace, primero aplica la skill `verificar-vacante`. Si no pasa (DESCARTAR), no hagas la HV y di por
  qué. Si pasa, crea la carpeta `Sin revisar/<hoy>/<Empresa>` con un Google Doc `Detalle_Vacante` (cargo, empresa,
  enlace, fecha, idioma, correo de contacto y la descripción **completa**) y su `Verificacion.txt`.
- Si la carpeta tiene `Verificacion.txt` con DUDOSA o DESCARTAR, no hagas la HV salvo que el usuario lo pida.

**B. Empresa en frío.** No hay vacante: el usuario quiere escribirle a una empresa.
- Investiga la empresa en su web y LinkedIn: qué producto tiene, sector, tamaño, país y ciudad, cómo diseña, si tiene
  equipo de diseño. Escribe esa investigación en un Google Doc `Empresa` dentro de su carpeta (es el equivalente al
  `Detalle_Vacante`) con las fuentes.
- **Cargo:** dedúcelo de lo que hace la empresa y del perfil más fuerte del candidato (ej.: fintech con app propia →
  "Product Designer UX/UI"; agencia → "Diseñador UX/UI"). Si el usuario dice el cargo, usa ese.
- **Carpeta:** `Vacantes con IA/Correos en frío/<Empresa>/` (créala si no existe).
- Las keywords salen de la empresa (producto, sector, lo que publica), no de un aviso.
- Los correos (direcciones, mensaje y borradores) los prepara la skill `correo-en-frio`.

## Paso 1. Leer

Lee completos `LECCIONES_HV`, `GUIA_CV`, `REGLAS_CV`, `CONTEXTO_CV`, los marcadores de `MASTER_TEMPLATE` y el
`Detalle_Vacante` (o la investigación de la empresa). Si hay `Verificacion.txt`, léelo: dice qué baja la vacante (años,
inglés…). Lee también las HV de los últimos 7 días (los `CV_IA.json` de `Sin revisar/<fecha>/` y las HV `HV_…` de esas
carpetas): la nueva no puede repetir su perfil ni más de 2 de sus logros con el mismo texto.

`CONTEXTO_CV` es largo **a propósito** (decisión del usuario, 25 oct 2026): cuenta funciones y situaciones, no solo
cifras, para que la HV se ajuste a cualquier vacante aunque el usuario no use las mismas palabras. Léelo entero cada vez;
no te quedes con los 5 o 6 logros con cifras más visibles.

## Paso 2. Análisis (GUIA_CV Paso 2 y 2.1)

- Las 10 keywords en ranking, hard skills, soft skills, requisitos de experiencia y qué es lo que más valora el rol.
- El match: qué tiene el candidato, qué no, qué puede mejorar.
- Cada gap se responde con habilidades transferibles reales y capacidad de aprendizaje. Nunca afirmes dominar algo que
  `CONTEXTO_CV` no respalde.

### Mapa de evidencia (obligatorio antes de redactar; 25 oct 2026)

El 25 oct 2026 el usuario fue a enviar 7 HV y "no me convencieron": repetían los mismos 6 logros y el perfil no hablaba de
la vacante. Este mapa es el que obliga a personalizar. Por cada una de las 10 keywords, en orden:

| Keyword de la vacante | Cita de `CONTEXTO_CV` (textual) | Dónde va en la HV |
|---|---|---|
| internal tools | "diseñé una vista de administración restringida con *guidelines* gráficos" | `LOGRO_2_1` |
| A/B testing | (no hay) | `GAP` |

1. **Busca la función, no la palabra.** La vacante dice "stakeholder management" y el usuario cuenta "teniendo contacto
   directo con los cargos superiores y responsabilizándome de los deadlines"; dice "internal tools" y él cuenta "una vista
   de administración restringida para el personal de ventas". Recorre todo `CONTEXTO_CV`, incluidos los proyectos que no
   van como experiencia (Sanny, Kommo, DIN'T, Autónomo, Alcaldía): sirven para el perfil y las habilidades.
2. **La cita va textual** (cópiala tal cual de `CONTEXTO_CV`, sin el formato): es la prueba de que la función es real.
   Apps Script rechaza la HV si la cita de una de las 5 primeras keywords no aparece en `CONTEXTO_CV`.
3. **Redacta con la palabra de la vacante, sin cambiar el hecho:** "Designed a restricted internal admin view…". Si no
   hay ninguna función equivalente, es `GAP` y se responde en `_gaps`; nunca se inventa.
4. **Dónde va:** la keyword #1 abre el perfil; cada una de las 6 primeras va en un cargo, una descripción o un logro
   (`CARGO_EXP_n`, `DESC_EXP_n`, `LOGRO_n_m`), **no solo en habilidades**. Apps Script lo comprueba para las 5 primeras.
5. **Elige las experiencias y los logros desde el mapa,** no desde la HV anterior: si una keyword solo la prueba Central
   Xpress, Central Xpress va. Un logro sin cifra que prueba una keyword vale más que una cifra repetida que no la prueba.

El mapa se guarda en `CV_IA.json` como `_mapa`: una lista de `{"keyword": …, "cita": …, "donde": …}`, una entrada por
keyword y en el mismo orden de `_keywords` (`donde` = la clave del marcador, `HABILIDADES` o `GAP`).

## Paso 3. Redacción (GUIA_CV Paso 3 + estas reglas), todo para esta vacante o empresa

**Personalización completa (lo más importante para el usuario, 24 oct 2026).** Fijo en todas las HV solo queda lo que
no puede cambiar: nombre, contacto y enlaces, y los **hechos** de `CONTEXTO_CV` (empresas, fechas, cifras, estudios,
certificados). Todo lo demás se escribe para esta vacante: título, ubicación, perfil, qué experiencias van y en qué
orden, cargos, descripciones, **qué logros se eligen y cómo se redactan** (con las keywords de la vacante), las 5
categorías de habilidades **y el contenido de cada una** (ordenado según lo que pide la vacante; nunca la lista de
`CONTEXTO_CV` copiada tal cual) y el idioma. Antes de entregar, compara con la última HV hecha: si un perfil, una
descripción o una categoría de habilidades sale igual, reescríbela.

**Experiencias** (máximo 4, en orden de relevancia para la vacante, no por fecha):
- Base: **Seguros Bolívar** (siempre), **Meevent** y **Central Xpress**, ampliadas con lo mejor de `CONTEXTO_CV`.
- **Trezo** o **Creditop** solo si aportan bastante a esta vacante. Creditop, solo si la vacante pide research de forma
  explícita. Sanny, Kommo, DIN'T, Autónomo, Alcaldía y otros no van como experiencia: sirven para el perfil y las
  habilidades.
- Cada experiencia: `DESC_EXP_n` con 1 o 2 líneas de contexto (qué era el producto o el reto) y **3 logros** (hasta 4).
- **Los logros pesan más que el número de experiencias:** si para que cada experiencia tenga 3 o 4 logros hay que quitar
  la cuarta experiencia, se quita (todos sus marcadores en `""`).
- Logros cuantificados (%, $, tiempo, personas) solo con cifras de `CONTEXTO_CV`, redactados con las keywords de la
  vacante, de máximo 35 palabras cada uno.
- **2 páginas es el tope, no la meta** (26 oct 2026, Qentaz quedó "demasiado resumida" con media página 2 en blanco): si
  a la página 2 le sobra más de un cuarto, úsalo con lo que más prueba la vacante (un 4.º logro en las experiencias
  clave o una 4.ª experiencia relevante).

**Redacción** (`GUIA_CV`, regla 6: "tono profesional, estratégico y orientado a resultados"; 26 oct 2026, el usuario
dijo que los logros de Qentaz sonaban "muy conversacionales"):
- **Logro = verbo de impacto en pasado + qué (con la keyword) + cómo (método o herramienta) + resultado medible o efecto
  en el negocio.** Si hay cifra, el logro abre con ella: "Reduje en 66% el tiempo de creación por pantalla (de 3 horas
  a 1) con un sistema de diseño tokenizado en tres niveles en Figma, bajo criterios WCAG 2.1."
- Verbos: reduje, incrementé, logré, eliminé, garanticé, optimicé, reorienté, redefiní, estructuré, prioricé, lideré
  (en inglés: cut, reduced, increased, achieved, eliminated, led, redesigned, streamlined). Nunca "usé", "ayudé",
  "participé", "hice", "me encargué".
- **Sin explicaciones de conversación:** nada de "porque el paciente pide consejo…", "para no pedir los mismos datos
  varias veces", "hallé que…", "al descubrir que…, llevé…". El porqué se convierte en el resultado: "Diseñé un modelo de
  venta conversacional (e-commerce, asesoría por WhatsApp y pago con Bold) que formalizó los ingresos digitales y
  conservó la cercanía consultiva que exigen los pacientes."
- `DESC_EXP_n` es una promesa de valor con verbo en primera persona ("Lideré a cinco personas en el rediseño
  omnicanal…", "Redefiní la experiencia de compra de…"), no una frase nominal suelta ("E-commerce de dispositivos…").
- `PLANTILLA_HV.pdf` (en `Recursos`) es la referencia de este tono.

**Cargos (`CARGO_EXP_n`):** parten del título de LinkedIn de cada experiencia (tabla "Experiencias y títulos" de la
sección 7 de "Guia busqueda de vacantes y creacion de HV.md" en Drive) y se ajustan con criterio. Solo la experiencia más
relevante puede llevar el cargo de la vacante o uno muy cercano; las demás conservan su título o una variante con otra
keyword que de verdad corresponda a lo que se hizo. Nunca dos experiencias con el mismo cargo. Sin inflar el nivel
(Senior, Lead, Manager) más allá del título de LinkedIn.

**Encabezado:**
- `TITULO_SUBTITULO_PROFESIONAL`: adaptado al cargo de la vacante (ej. "Product Designer | Diseñador UX/UI | Fintech |
  SaaS"), sin un nivel que `CONTEXTO_CV` no respalde.
- `UBICACION` según la ubicación de la vacante (o de la empresa, en frío):
  - Bogotá → `Bogotá, Colombia`
  - otra ciudad de Colombia → `Bogotá, Colombia (Abierto a relocalización)`
  - remota o fuera del país → `Bogotá, Colombia (Remoto)`
  - en inglés: `Bogotá, Colombia (Open to relocation)` / `Bogotá, Colombia (Remote)`.

**Perfil (`PERFIL_PERSONALIZADO`):** escrito para esta vacante y su empresa. La primera frase responde a lo que la vacante
más necesita con la evidencia real más fuerte; deja claro cómo ayuda a la empresa a escalar; máximo 5 líneas
(≈ 70 palabras); en prosa, **sin dos puntos**. **Nunca nombres a la empresa de la vacante** en la HV (perfil,
descripciones, logros): "helping PadSplit grow" se lee como si ya trabajaras allí (error grave, 24 oct 2026). Di cómo
ayudas a escalar a ese *tipo* de producto o equipo ("a two-sided housing marketplace", "un equipo de producto fintech").
Solo el correo de postulación puede nombrar a la empresa. Prohibido abrir con una fórmula fija ("Diseñador UX/UI con formación
en Diseño Industrial y Sistemas…") o repetir la apertura de otra HV del mismo día.

**Secciones (`HEADER_*`):** en el idioma de la vacante (Resumen Profesional / Experiencia Profesional / Educación /
Formación Complementaria / Habilidades y Herramientas; en inglés Professional Summary / Professional Experience /
Education / Additional Training / Skills & Tools).

**Habilidades:** 5 categorías (`CATEGORIA_SKILL_1..5` + `DETALLE_SKILL_1..5`) elegidas **según la vacante**, más
Idiomas. Ejemplo de la plantilla: Diseño Estratégico & UX, Entregables, Herramientas, Tecnología & IA, Competencias
Blandas; cámbialas, ordénalas o deja una en `""` si la vacante pide otra cosa. Solo lo que respalde `CONTEXTO_CV`.
`IDIOMAS` dice el nivel real de inglés: **B2** (decisión del usuario, 24 oct 2026): `Español (nativo), Inglés (B2, intermedio alto).` / `Spanish (Native), English (B2, Upper Intermediate).`

**Educación y formación (`EDU_n`, `CERT_n`):** de `CONTEXTO_CV`, las más relevantes primero.

**Idioma:** el de la vacante (`_idioma` = `es` o `en`). En inglés, frases simples y honestas (el inglés real es B2, intermedio alto).

**Extensión:** nunca más de 2 páginas (Arial 11, márgenes de la plantilla). Para recortar: primero la cuarta experiencia,
luego un cuarto logro, luego palabras de los logros; nunca la ubicación ni el perfil.

## Reglas duras (Apps Script rechaza el CV si se incumplen)

- Toda cifra (números, %, $, años) debe aparecer en `CONTEXTO_CV`. Cada `EMPRESA_EXP_n`, escrita igual que en `CONTEXTO_CV`.
- No inventes empresas, herramientas, tecnologías ni resultados.
- Nunca en la HV ni en el nombre: aprendiz, voluntario/voluntariado, practicante, intern, volunteer, ni el semillero
  DIN'T. Ojo: "Servicio Nacional de **Aprendiz**aje" también cuenta; escribe solo "SENA". "Junior" solo si el cargo de la vacante lo dice (entonces sí en el título y en el nombre del archivo).
- Perfil sin dos puntos. Dos experiencias nunca con el mismo cargo, ni más de una copiando el cargo de la vacante.
- `_mapa` con una entrada por keyword; las 5 primeras que no son `GAP` llevan una cita textual de `CONTEXTO_CV` y
  aparecen en el perfil, un cargo, una descripción o un logro (`personalizationErrors`).
- Fechas con mes y año en todas las experiencias y estudios, iguales a `CONTEXTO_CV` (Central Xpress solo tiene el año).
- El nombre de la empresa de la vacante no aparece en ninguna parte de la HV (`targetCompanyErrors`), salvo que sea una
  empresa donde el candidato ya trabajó.
- `UBICACION`, `TITULO_SUBTITULO_PROFESIONAL` y `PERFIL_PERSONALIZADO` nunca vacíos.
- Nombre del archivo: `HV_Oscar_Garcia_<Cargo>` en español y `CV_Oscar_Garcia_<Cargo>` en inglés (decisión del usuario
  2026-10-26: HV es la palabra en español, CV en inglés), con el cargo tal como lo pide la vacante, palabras separadas por `_`, **sin el nombre de la empresa ni sufijos** como `(3)`, `_3`, `copia` o fechas.

## Paso 4. Salida

### En la tarea diaria (automático)
Escribe `CV_IA.json` en la carpeta de la vacante (`create_file`, `application/json`, sin convertir): una clave por cada
marcador de `MASTER_TEMPLATE` (sin llaves; `""` = se borra ese párrafo) más `_idioma`, `_keywords`, `_gaps`, `_mapa`,
`_nombre_archivo` y `_correo_cuerpo` (si `Detalle_Vacante` trae correo: el mensaje de postulación según el Prompt 2 de la
"Guía Maestra de Cover Letters" —la guía principal de correos—: [reto crítico de la vacante] + [métrica de `CONTEXTO_CV`]
+ [CTA de reunión] + [adjuntos: HV, LinkedIn, Portafolio], **máximo 35 palabras**, sin clichés ni saludos largos; si no,
`""`).
Apps Script lo valida y arma la HV en su siguiente pasada (cada 10 minutos, de 7:00 a 22:59).

### Modo B (empresa en frío): solo `CV_IA.json` (desde 2026-10-25)
No armes el Google Doc a mano (gasta muchos tokens por HV). Escribe `CV_IA.json` en `Correos en frío/<…>/<Empresa>/`
con el mismo contrato que en la tarea diaria (`_nombre_archivo` = `HV_Oscar_Garcia_<Cargo>`, o `CV_…` si la HV va en inglés; `_correo_cuerpo` = `""`).
Antes de subirlo, revisa tú las reglas duras y estima el largo: perfil de 3 a 5 líneas y ningún logro, perfil ni línea de
habilidades que termine con una línea de 1 a 3 palabras. Cuando la carpeta tiene también `Correos.json` (skill
`correo-en-frio`), Apps Script valida el `CV_IA.json` con las mismas reglas que las vacantes, copia `MASTER_TEMPLATE`,
la llena, exporta el PDF y crea los borradores en su corrida horaria; si el JSON no pasa, deja los errores en
`Correos_ERRORES.txt`. Después de esa corrida aplica `revisar-hv` (revisión visual) al menos a una HV por tanda y a las
que tu estimación marcó en riesgo.

### En una conversación (inmediato)
Cuando el usuario la pide en el chat, arma la HV en ese momento (con los conectores de Google Drive y Google Docs; lee
antes la skill `google-workspace` si está disponible):
1. Escribe el mismo `CV_IA.json` en la carpeta (queda como registro de lo que se escribió). Drive `update_file` solo
   cambia el nombre o la carpeta, **no el contenido**: si ya hay un `CV_IA.json` de un intento anterior, mándalo a la
   papelera (`trash_file`) y crea el nuevo. Si en la carpeta ya existe una HV (`HV_…`), crea la nueva igual y pregunta al
   usuario si la anterior va a la papelera; nunca borres una HV sin que lo diga.
2. Revisa tú mismo las reglas duras (aquí no pasa por la validación de Apps Script): cada cifra contra `CONTEXTO_CV`,
   empresas, palabras prohibidas, perfil sin dos puntos, cargos.
3. Copia `MASTER_TEMPLATE` a la carpeta con el nombre del archivo (Drive `copy_file`).
4. Lee la copia (`read_doc`) y borra, del índice más alto al más bajo y con `requiredRevisionId`, cada párrafo cuyos
   marcadores vayan todos en `""` y no tenga otro texto (más el párrafo en blanco que lo sigue), y los párrafos en blanco
   entre viñetas.
5. Reemplaza cada marcador con su texto (`replaceAllText`, `matchCase`). En inglés, cambia también `Idiomas:` por
   `Languages:` y el texto del enlace `Portafolio` por `Portfolio` (el enlace se conserva).
6. Verifica: lee el documento y confirma que no queda ningún `{{` y que el texto es el esperado. Exporta a PDF
   (`download_file_content` con `application/pdf`; con la skill `google-workspace`, `render_export.py` lo convierte en
   imágenes) y **mira las páginas**:
   - **2 páginas o menos.** Si pasa de 2, recorta (ver Extensión) y vuelve a verificar.
   - **El título profesional cabe en una línea.**
   - **Sin palabras huérfanas:** ningún logro, descripción o perfil termina con una línea de 1 a 3 palabras. Acorta la
     frase (quita adjetivos como "end-to-end", "centralized", "generative") hasta que la última línea tenga más palabras
     o desaparezca.
   - Ningún cargo queda solo al final de una página (la plantilla tiene "mantener con el siguiente"; si una HV antigua no
     lo tiene, aplícalo con `updateParagraphStyle` `keepWithNext` a títulos, cargos y descripciones).
7. Modo vacante: en `Vacantes UX - Registro` (`Hoja 1`), pon `Pendiente` en la celda Estado de esa vacante (busca la fila
   por el enlace); si no está, agrega la fila. Modo frío: no toques el registro (lo hará la skill `correo-en-frio`).
8. Aplica la skill `revisar-hv` a la HV terminada (deja su `Revision.txt`).
9. El PDF lo exporta el usuario después de revisar el Google Doc. No crees borradores de correo desde aquí.

## Resultado para el usuario

```
HV lista: <nombre del archivo> (enlace al Google Doc) — <idioma> — <páginas> páginas
Para: <Empresa> — <Cargo> (<modo vacante | frío>)
Perfil (primera frase): ...
Experiencias: <empresa · cargo usado · n.º de logros> × 3 o 4
Mapa: <keyword → dónde va> de las 10 (las GAP, aparte)
Lo distinto frente a las HV de la semana: <perfil y logros que solo tiene esta>
Gaps y cómo se responden: ...
Revisa antes de enviar: <lo que conviene mirar a mano, p. ej. un logro largo o una keyword sin cubrir>
```
