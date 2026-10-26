---
name: revisar-hv
description: Revisa una hoja de vida (HV) ya armada en Google Docs antes de que el candidato la envíe — datos reales contra CONTEXTO_CV, reglas duras, personalización para la vacante, idioma y ortografía, y la revisión visual del PDF (2 páginas, sin huérfanas, enlaces que abren) — corrige en el Doc lo que tiene una sola respuesta correcta, propone lo que es de criterio y deja Revision.txt con el veredicto. Úsala cuando el usuario pida "revisa esta HV / la HV de <empresa> / las HV de hoy", antes de enviar una postulación o un correo en frío, al terminar crear-hv en una conversación, o en la tarea diaria de revisión.
---

# Revisar HV

Objetivo: que el candidato solo tenga que exportar el PDF y enviar. La HV debe poder defenderse palabra por palabra en
una entrevista (GUIA_CV, consejo final) y cumplir la lista de chequeo de su guía (sección A.6: sin palabras prohibidas,
títulos exactos, idioma correcto, nombre correcto, 2 páginas, sin huérfanas, enlaces https que abren, perfil único,
ningún dato fuera de LinkedIn y del contexto). Nunca se envía nada.

## Qué corrige y qué propone (decisión del usuario, 24 oct 2026)

- **Corrige directo en el Google Doc** lo que tiene una sola respuesta correcta (ver la columna "Corrección" de cada
  chequeo): más de 2 páginas, huérfanas, enlaces, palabras prohibidas, ortografía, rótulos en el otro idioma, una cifra o
  un dato que contradice `CONTEXTO_CV`, el nombre de la empresa de la vacante, el nombre del archivo.
- **Propone** (no lo cambia) lo que es de criterio: el perfil, qué logros o experiencias van, los cargos, las
  categorías de habilidades, keywords que faltan. Cada propuesta lleva el texto nuevo listo para pegar.
- Una corrección nunca agrega hechos: solo quita, acorta, reordena palabras o cambia una cifra por la correcta de
  `CONTEXTO_CV`. Si para arreglar algo haría falta escribir algo nuevo, es una propuesta.
- **Nunca** borres ni reemplaces la HV, ni toques una HV que ya está en `Vacantes con IA/CV/` (ya enviada) sin que el
  usuario lo pida en esa conversación. En la tarea diaria solo se revisan las HV de hoy sin `Revision.txt`.

## Fuentes (Google Drive, carpeta `Vacantes con IA/Recursos`, búscalas por nombre; nunca copiar su contenido a este repositorio público)

`LECCIONES_HV` (lo que al usuario no le ha gustado de sus HV: manda sobre todo lo demás), `CONTEXTO_CV` (los datos),
`REGLAS_CV` y `GUIA_CV` (las reglas), `MASTER_TEMPLATE` (el formato y los **enlaces del
encabezado**: son la referencia de cómo deben quedar), la guía "Guia busqueda de vacantes y creacion de HV.md"
(sección 7, títulos de LinkedIn), la skill `crear-hv` (las reglas con que se escribió la HV) y, de la carpeta de la
vacante, `Detalle_Vacante` (o `Empresa` en frío), `Verificacion.txt` y `CV_IA.json` si existen.

Cifras aclaradas por el usuario (mandan sobre `CONTEXTO_CV`): Trezo, cerca de 90 personas en total (50 encuestas y 42
entrevistas; nunca "entrevisté a más de 90"); Seguros Bolívar, equipo de 6 contándolo a él, lideraba a 5.

## Entradas

- Un Google Doc `HV_…` (enlace o nombre) o la carpeta de una vacante.
- **"Revisa las de hoy"** (o la tarea diaria): cada carpeta de `Vacantes con IA/Sin revisar/<hoy>/` (sin `Posts` ni
  `Dudosas`) con un Google Doc `HV_…` o `CV_…` y sin `Revision.txt`. Una carpeta con `CV_IA.json` pero sin HV todavía
  se reporta como "aún sin armar" (Apps Script revisa cada 10 minutos y la arma poco después; la revisa la corrida siguiente).
- Correo en frío: la carpeta `Vacantes con IA/Correos en frío/<Empresa>/`.

## Paso 1. Leer

1. La HV con `read_doc` (texto, estilos de párrafo y enlaces: `textRun.textStyle.link.url`).
2. `Detalle_Vacante` completo: cargo, empresa, ubicación, idioma, descripción. Saca las 10 keywords en ranking (o usa
   `_keywords` y `_mapa` de `CV_IA.json`). Si la carpeta no tiene `CV_IA.json`, la HV no pasó por `crear-hv`: haz tú el
   mapa de evidencia (skill `crear-hv`, Paso 2) para poder puntuarla.
3. `CONTEXTO_CV` completo, `REGLAS_CV` y los enlaces del encabezado de `MASTER_TEMPLATE`.
4. Las HV de los últimos 7 días (para comparar perfiles, logros y cargos), no solo las de hoy.

## Paso 2. Chequeos

| # | Chequeo | Falla si… | Corrección |
|---|---|---|---|
| 1 | **Datos reales** | una cifra, empresa, fecha, herramienta, título o resultado no está en `CONTEXTO_CV` (o en las cifras aclaradas); un verbo exagera lo que dice el contexto ("lideré" cuando fue parte del equipo) | Corrige: cambia la cifra o la fecha por la de `CONTEXTO_CV`, quita la herramienta o el adjetivo que no se sostiene. Si no queda frase, propón otra |
| 2 | **Empresa de la vacante** | su nombre aparece en la HV (salvo que sea un empleador anterior): se lee como si ya trabajara allí | Corrige: cámbialo por el tipo de producto o equipo ("a two-sided housing marketplace") |
| 3 | **Palabras prohibidas** | aprendiz (también "Servicio Nacional de Aprendizaje"), voluntario/voluntariado, practicante, intern, volunteer, el semillero DIN'T; "junior" si el cargo de la vacante no lo dice | Corrige: "SENA"; el título de LinkedIn correcto; quita la palabra |
| 4 | **Sin restos de plantilla** | queda un `{{…}}`, una viñeta vacía, un rótulo sin contenido o dos líneas en blanco seguidas | Corrige: borra el párrafo vacío o el blanco sobrante |
| 5 | **Idioma** | algo en el otro idioma (títulos de sección, `Idiomas:`/`Languages:`, `Portafolio`/`Portfolio`, meses, "Presente"/"Present", ubicación) o la HV no está en el idioma de la vacante | Corrige los rótulos y palabras sueltas. Si toda la HV está en el idioma equivocado, propón rehacerla con `crear-hv` |
| 6 | **Ortografía y gramática** | errores de tildes, concordancia, mayúsculas, puntuación; en inglés, frases que un hablante B2 no podría defender; `IDIOMAS` debe decir inglés **B2** (`Inglés (B2, intermedio alto)` / `English (B2, Upper Intermediate)`), nunca solo "intermedio" | Corrige |
| 7 | **Encabezado** | el título profesional no se adapta al cargo o le atribuye un nivel sin respaldo; `UBICACION` no sigue la regla (Bogotá → nada; otra ciudad de Colombia → relocalización; remoto o exterior → Remoto); un enlace no es `https://`, tiene espacios o no coincide con el de `MASTER_TEMPLATE` | Corrige la ubicación y los enlaces (texto y URL). Si el error viene de `MASTER_TEMPLATE` (el 24 oct su WhatsApp era `http://`), corrígelo también en la plantilla y dilo en el resumen: si no, sale en todas las HV. El título, propuesta salvo un nivel inflado (corrige quitándolo) |
| 8 | **Perfil** | tiene dos puntos ("X: Y"), pasa de 5 líneas, abre con una fórmula fija, es igual o casi igual (misma primera frase o mismo cierre) al de otra HV de hoy, o no responde a lo que la vacante más pide | Dos puntos y largo: corrige (coma o punto; acorta). Lo demás: propón un perfil nuevo |
| 9 | **Experiencias y cargos** | dos experiencias con el mismo cargo; más de una copia el cargo de la vacante; un cargo infla el nivel del título de LinkedIn; una experiencia con menos de 3 logros mientras hay una cuarta experiencia; el orden no sigue la relevancia para la vacante | Propón (cargo y logros son de criterio). Nivel inflado: corrige al título de LinkedIn |
| 10 | **Logros** | sin cifra cuando `CONTEXTO_CV` tiene una para eso; más de 35 palabras; no usan ninguna keyword de la vacante; suenan conversacionales o explicativos en vez de estratégicos (no siguen "verbo de impacto + qué + cómo + resultado" de `crear-hv` › Redacción: "porque…", "para no…", "hallé que…", "usé…"); una descripción es una frase nominal sin verbo | Largo y tono: corrige reescribiendo con la fórmula, sin agregar hechos. Lo demás: propón |
| 10b | **Espacio** | la página 2 tiene más de un cuarto en blanco (26 oct 2026: "demasiado resumida") | Propón qué agregar desde el mapa (4.º logro o 4.ª experiencia) |
| 11 | **Personalización y keywords** | de las 10 keywords de la vacante faltan las principales (que sí respalda `CONTEXTO_CV`); las habilidades son la lista de `CONTEXTO_CV` copiada o no siguen el orden de lo que pide la vacante | Propón dónde y cómo meter cada keyword que falta |
| 12 | **Nombre del archivo** | no es `HV_Oscar_Garcia_<Cargo>` (español) o `CV_Oscar_Garcia_<Cargo>` (inglés, desde 2026-10-26) con el cargo de la vacante (o el deducido, en frío), lleva el nombre de la empresa, una palabra prohibida o sufijos como `(3)`, `_3`, `copia`, fechas | Corrige: renombra con Drive `update_file` (el nombre sí se puede cambiar) |
| 12b | **Listas** | en Educación, Formación complementaria y Habilidades cada elemento no es una viñeta propia (p. ej. varias certificaciones en una sola línea separadas por "\|" o "·", o habilidades como párrafos sin viñeta); los títulos de sección sí van sin viñeta (2026-10-26, el usuario lo vio en varias HV ya revisadas) | Corrige: un elemento por línea, con viñeta (`createParagraphBullets`) |
| 13 | **Visual (PDF)** | ver Paso 3 | Corrige |

## Paso 2b. Puntaje de personalización (25 oct 2026)

El 25 oct 2026 la revisión marcó "lista" 6 HV que el usuario no quiso enviar: solo se había mirado la forma. Puntúa de 0
a 2 cada punto, con la razón en una línea:

| Punto | 2 | 1 | 0 |
|---|---|---|---|
| A. Primera frase del perfil | Nombra la keyword #1 o el problema principal de la vacante con la prueba real más fuerte | Habla del rol en general | Fórmula genérica o igual a otra HV |
| B. Keywords en la experiencia | Las 6 primeras (que no son brecha) están en cargos, descripciones o logros | 4 o 5 | 3 o menos, o solo en habilidades |
| C. Experiencias elegidas | Las que más pruebas dan según el mapa, en ese orden | Falta una que prueba una keyword clave | Las mismas de siempre sin importar la vacante |
| D. Logros | Elegidos y redactados para esta vacante | La mitad repetidos de otras HV | Iguales a los de otra HV |
| E. Cargos y título | Adaptados con criterio, sin inflar | Uno solo adaptado | Iguales en todas las HV |
| F. Habilidades | Categorías y orden según la vacante | Categorías genéricas con algún ajuste | La lista de `CONTEXTO_CV` o la de otra HV |

**Menos de 9 de 12, o un 0 en A, B o D → `REVISAR`**, aunque la forma esté perfecta. Las propuestas para subir el puntaje
salen del mapa de evidencia: qué cita de `CONTEXTO_CV` usar, en qué marcador y con qué texto (listo para pegar). Si el
usuario pidió que se rehaga, rehazla con `crear-hv` (la anterior se renombra `ANTERIOR - …`, nunca se borra).

## Paso 3. Revisión visual del PDF

Exporta el Doc a PDF (Drive `download_file_content` con `application/pdf`) y míralo como imagen: con la skill
`google-workspace`, `render_export.py`; si no, `pdftoppm -png -r 80` sobre el PDF guardado en un directorio vacío.

- **2 páginas o menos.** Para recortar, en este orden: un cuarto logro de la experiencia menos relevante, palabras de
  los logros más largos (adjetivos como "end-to-end", "centralized"), la cuarta experiencia (sus párrafos completos).
  Nunca la ubicación ni el perfil, ni los márgenes ni el tamaño de letra.
- **Título profesional en una línea.** Si se parte, quita el término menos importante para la vacante.
- **Sin huérfanas:** ningún perfil, descripción, logro ni línea de habilidades termina con una línea de 1 a 3 palabras.
  Acorta la frase sin cambiar los hechos hasta que la última línea tenga más palabras o desaparezca. En una lista
  (habilidades, herramientas), quita el elemento menos relevante para la vacante (el 24 oct, "Adobe Creative Suite" en
  una HV de producto). Para no adivinar, mide antes de editar: Liberation Sans tiene las mismas medidas que Arial
  (`PIL.ImageFont.truetype(".../LiberationSans-Regular.ttf")`, `getlength` a 11 pt; las etiquetas en negrita con
  `LiberationSans-Bold.ttf`); el ancho útil es 468 pt en párrafos y 432 pt en viñetas (márgenes de 72 pt, sangría
  de 36 pt). Si al reordenar la frase la segunda línea sigue corta, es que el texto pasa apenas de un renglón: hay que
  quitar, no reordenar.
- **Ningún cargo, título de sección o descripción solo al final de una página.** Aplica `keepWithNext`
  (`updateParagraphStyle`) a títulos, cargos y descripciones si no lo tienen.
- **Sin huecos:** ningún espacio grande entre viñetas o antes de un título de sección.
- **Enlaces:** cada enlace del encabezado aparece clicable en el PDF.

Cada corrección con `update_doc` (`replaceAllText` con `matchCase`, o `deleteContentRange` del índice más alto al más
bajo, siempre con `requiredRevisionId`). Después de corregir, vuelve a exportar y a mirar; máximo 3 vueltas. Si sigue
fallando, déjalo como propuesta y dilo.

## Paso 4. Salida

**`Revision.txt`** en la carpeta de la vacante (`create_file`, `text/plain`, `disableConversionToGoogleType` true; si
ya hay uno, `trash_file` y crea el nuevo: `update_file` no cambia el contenido). Primeras líneas exactas:

```
VEREDICTO: LISTA_PARA_ENVIAR | REVISAR
PAGINAS: <n>
PERSONALIZACION: <puntaje>/12 (A <n> · B <n> · C <n> · D <n> · E <n> · F <n>)
CORREGIDO: <n.º de correcciones>
PROPUESTAS: <n.º de propuestas>
```

- `LISTA_PARA_ENVIAR`: todo pasa (con o sin correcciones); las propuestas que queden son mejoras opcionales.
- `REVISAR`: personalización por debajo de 9/12 (o un 0 en A, B o D), o falta algo que el candidato debe decidir antes de enviar: un dato que no se pudo comprobar, un perfil
  repetido, cargos repetidos, keywords principales sin cubrir, la HV en el idioma equivocado o algo que no se pudo
  arreglar en 3 vueltas.

Después: la lista de correcciones (`antes → después`, una por línea), la lista de propuestas (qué, por qué y el texto
nuevo listo para pegar) y las keywords cubiertas y faltantes.

No cambies `CV_IA.json` (es el registro de lo que escribió la IA; la HV corregida es el Doc) ni el Sheet. El PDF lo
exporta el candidato.

## Resultado para el usuario

```
Revisadas: <n> — listas para enviar: <n> — revisar: <n> — aún sin armar: <n>
REVISAR (primero):
- <Empresa> — <Cargo> (enlace a la HV): <lo que debe decidir, en una frase> → <propuesta corta>
Listas:
- <Empresa> — <Cargo> (enlace): <puntaje>/12, <n> páginas, <n> correcciones (<las 2 o 3 más importantes>)
```

Si el usuario dice qué no le gustó de una HV, agrégalo como una línea nueva arriba en `LECCIONES_HV` (fecha | sus
palabras | la regla) y aplícalo desde esa misma HV.

Si el usuario acepta una propuesta en la conversación, aplícala en el Doc, vuelve a hacer el Paso 3 y reemplaza su
`Revision.txt`.
