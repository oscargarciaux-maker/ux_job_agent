---
name: correo-en-frio
description: Prepara correos en frío para empresas sin vacante publicada (investiga la empresa, crea su HV con crear-hv, busca direcciones reales con fuente y escribe un mensaje de máximo 35 palabras según la Guía Maestra de Cover Letters) y deja todo listo para que Apps Script cree un borrador de Gmail por destinatario con la HV en PDF adjunta. Nunca envía nada. Úsala cuando el usuario pida "escríbele a <empresa>", "correo en frío para…", "siguiente lote" o "prepara correos para estas empresas".
---

# Correo en frío

Objetivo: que el candidato abra Gmail, revise cada borrador y lo envíe él mismo. **Nunca se envía nada** (ni correo, ni
mensaje de LinkedIn, ni formulario): solo borradores. Trabajo a pedido y por lotes (decisión del usuario, 24 oct 2026).

## Fuentes (Google Drive; nunca copiar su contenido a este repositorio público)

| Documento | Para qué | Manda en |
|---|---|---|
| "Adaptia Jobs - Guía Maestra de Cover Letters con IA" | **La guía PRINCIPAL de cómo se escriben los correos** (decisión del usuario, 24 oct 2026): anatomía del mensaje, Prompt 1 (contacto en frío con auto-investigación), reglas estrictas y control de calidad | Cómo se escribe el correo. Si otra regla choca con ella, manda ella |
| "Guia busqueda de vacantes y creacion de HV.md", sección 9 | Direcciones (al menos 3 con fuente), un borrador por destinatario, PDF adjunto real, lotes, registro | Todo lo demás del proceso |
| "Empresas Tech en Bogotá" (de su coach) | Lista de empresas por tipo (fábrica de software, agencia, incubadora) y cómo abordar cada tipo | Qué empresas y el tono por tipo |
| `CONTEXTO_CV` | La única fuente de las métricas del correo | Los datos |
| `MASTER_TEMPLATE` | Los enlaces de LinkedIn y Portafolio (encabezado) | Los enlaces |
| Hoja `Vacantes UX - Registro`, pestaña `Correos en frío` | Quién ya recibió correo, qué rebotó, qué está en borrador | No repetir |

## Paso 0. Qué empresas

- **"Escríbele a X"** (o una lista): esas.
- **"Siguiente lote"**: las 3 primeras empresas con Estado `Nueva` de la pestaña `Empresas objetivo` (las deja la skill
  `investigar-empresas`, ya verificadas y con sus correos; en orden: Bogotá, resto de Colombia, exterior). Si no quedan,
  ejecuta primero `investigar-empresas`. Las empresas de "Empresas Tech en Bogotá" también sirven (el candidato ya las
  aprobó); cualquier otra que no venga de esas dos fuentes la aprueba él antes.
- **"Crea los correos"** (modo tandas, decisión del usuario, 24 oct 2026): todas las empresas con Estado `Nueva` de
  `Empresas objetivo` (o las que nombre), en ese orden, **de 3 en 3**. Ver "Modo tandas" más abajo.
- **Antes de empezar, lee el Sheet** `Vacantes UX - Registro` (siempre, aunque la empresa venga de `Empresas objetivo`:
  pudo recibir correo después) y descarta: empresas ya contactadas (pestaña `Correos en frío`, también las que tienen
  solo el borrador preparado), empresas con postulación en curso
  (pestaña `Aplicadas`, carpetas de `Vacantes con IA/CV`) y empresas con vacante abierta de diseño (en ese caso es mejor
  postular a la vacante: avísalo).

## Modo tandas ("crea los correos")

Para cuando hay muchas empresas listas (p. ej. 30 en `Empresas objetivo`). **Regla principal del usuario: la calidad no
baja ni un poco** por hacer muchas.

1. Toma las 3 primeras empresas `Nueva` (Bogotá primero) y cambia su Estado a `En lote`.
2. Haz con cada una los Pasos 1 a 5 completos, sin saltar ninguno: investigación con gancho verificado, HV con
   `crear-hv` (modo B) y **`revisar-hv` con la revisión visual del PDF**, direcciones con fuente y `Correos.json`
   revisado contra el control de calidad de la guía (≤35 palabras sin contar la empresa, gancho específico, métrica de
   `CONTEXTO_CV`, saludo por el nombre, asunto sin la empresa). Si hay una herramienta de subagentes, puedes darle a cada
   empresa de la tanda su propio subagente (contexto limpio = misma calidad para la tercera que para la primera); tú
   revisas cada resultado con esta misma lista antes de aceptarlo.
3. Solo cuando las 3 estén completas y revisadas, informa la tanda en 3 líneas y empieza la siguiente.
4. Empresas con Estado `Sin correo`: no entran (no hay a quién escribir).
5. **Si la sesión se alarga** (muchas tandas seguidas), termina la tanda en curso y para: di cuántas faltan. El estado
   vive en el Sheet (`Nueva` / `En lote` / `Borradores creados`), así que la siguiente sesión sigue donde quedó, con
   contexto limpio. Nunca acortes un paso para terminar más rápido.
6. Una empresa que quedó en `En lote` sin `Correos.json` en su carpeta (sesión cortada) se retoma primero.

## Paso 1. Investigar la empresa (web)

- Qué hace, producto, sector, tamaño, ciudad, si tiene equipo de diseño, en qué idioma se comunica, y su tipo según
  "Empresas Tech en Bogotá" (fábrica, agencia, incubadora, startup o empresa de producto).
- **El gancho:** un hecho reciente y concreto (lanzamiento, integración, expansión, reto del sector, programa) con
  **fuente y fecha**. Prohibido inventarlo o adornarlo: si no hay un hecho verificable, usa el producto principal y
  dilo. El gancho no puede servir para otra empresa (control de calidad de la guía).
- Guarda la investigación en un Google Doc `Empresa` en `Vacantes con IA/Correos en frío/<Empresa>/` (créala) con las
  fuentes. Es la entrada de `crear-hv`.

## Paso 2. La HV

Aplica la skill `crear-hv` en **modo B (empresa en frío)** en la misma carpeta. Una HV por empresa (no una por
correo). Desde 2026-10-25 se deja solo `CV_IA.json` (no el Google Doc): Apps Script arma la HV desde la plantilla en la
misma corrida que crea los borradores y adjunta su PDF. Si ya hay un Google Doc `HV_...` en la carpeta, se usa ese.
Después de la corrida, `revisar-hv` (revisión visual) al menos a una HV por tanda; si hay que corregir una HV cuyos
borradores ya existen, corrige el Doc y reescribe los borradores con `"reemplazar": true`.

## Paso 3. Direcciones (al menos 3 por empresa, cada una con fuente)

Si la empresa viene de `Empresas objetivo`, sus correos ya están verificados en la columna "Correos (fuente, fecha)":
úsalos y vuelve a abrir la fuente solo si tiene más de 3 meses. Si no, búscalos con estas reglas (las mismas de
`investigar-empresas`):

- Solo direcciones **publicadas** (sitio oficial, página de empleo o de contacto, publicaciones de la empresa o de su
  equipo de talento en LinkedIn, portales oficiales de empleo). **Nunca** inventes ni armes direcciones por patrón
  (nombre.apellido@): una dirección sin fuente no se usa.
- Para cada una: la URL de la fuente, la fecha de la fuente y qué es (talento/selección, persona del área de diseño o
  producto, contacto general).
- Prioridad: talento o selección > personas de diseño, producto o talento > contacto general. Soporte, ventas,
  privacidad o radicación **no** son rutas de HV: úsalas solo si son la única vía, con `nota` que lo advierta.
- Fuente de más de 12 meses o persona que puede haber salido de la empresa: úsala solo con `nota` que lo diga.
- **No repitas** direcciones de la pestaña `Correos en frío` (ya usadas, en borrador o rebotadas: Apps Script las omite
  igual). Si encuentras menos de 3, dilo en el resumen; no rellenes.

## Paso 4. El correo (Guía Maestra de Cover Letters, Prompt 1)

Estructura: **[Gancho con dato real investigado] + [Métrica del CV que responde a ese hecho] + [CTA: llamada de 10
minutos] + [Adjuntos: HV, LinkedIn y Portafolio]**.

- **Máximo 35 palabras** contando saludo y cierre (los enlaces cuentan como su palabra; la firma y **el nombre de la
  empresa no cuentan**). Apps Script rechaza un cuerpo más largo.
- **Prohibidos los clichés:** "admiro su innovación", "me encanta su cultura", "espero que estés bien", saludos formales
  largos, autobiografía.
- **La métrica** sale de `CONTEXTO_CV` (o de las cifras aclaradas por el usuario: Trezo, cerca de 90 personas = 50
  encuestas y 42 entrevistas; Seguros Bolívar, equipo de 6, lideraba a 5) y responde al reto del gancho. Toda cifra del
  correo, también el "10" de los 10 minutos, debe existir en `CONTEXTO_CV`; si no, escribe "una llamada corta" o
  "diez minutos" en letras.
- **Personalizado (decisión del usuario, 24 oct 2026):** si la dirección es de una persona y se sabe su nombre
  (`nombre` en `Correos.json`), el correo la saluda directamente ("Hola Ana,"; Apps Script lo exige). Si es un buzón
  general, "Hola," o "Hola, equipo de <área>,".
- **El nombre de la empresa va en el texto, con discreción** (una vez, como parte del gancho: "vi que en Bold lanzaron…"),
  nunca en el asunto. No cuenta en las 35 palabras.
- **Tono por tipo de empresa** ("Empresas Tech en Bogotá"): fábrica de software → sistemas de diseño, documentación y
  handoff sin fricción, metodologías ágiles; agencia → conversión y criterio visual (puede incluir una observación breve
  sobre una página de un cliente); incubadora o aceleradora → ofrecer valor a las startups de su portafolio y pedir que
  lo presenten; startup o empresa de producto (fintech) → resultados de producto y research.
- **Idioma:** el de las comunicaciones de la empresa. En inglés, frases simples (nivel real B2).
- **Enlaces:** `[LinkedIn](<url>)` y `[Portafolio](<url>)` (en inglés `[Portfolio](<url>)`) con las URL exactas del
  encabezado de `MASTER_TEMPLATE`, https y sin espacios. Apps Script los convierte en enlaces clicables.
- **Asunto:** la especialidad y el foco para esa empresa, **sin el nombre de la empresa** y sin "Postulación" (ej.
  "Diseñador UX/UI - Pagos y comercios"). Apps Script rechaza un asunto con el nombre de la empresa. En el borrador
  aparece como "[Bold] Diseñador UX/UI - Pagos y comercios" solo para identificarlo: **el candidato borra "[Bold] " antes
  de enviar** (decisión del usuario, 24 oct 2026).
- Palabras prohibidas también aquí (aprendiz, practicante, voluntario, intern, volunteer, junior).
- **Control de calidad de la guía** antes de guardar: ¿≤35 palabras?, ¿el dato es específico de esta empresa?, ¿hay una
  métrica?, ¿enlaces correctos?

Ejemplo de forma (no de contenido; cada empresa lleva su propio gancho y su propia métrica): "Hola Ana, vi que en
<Empresa> lanzaron <hecho verificado>. En <experiencia> logré <métrica de CONTEXTO_CV>. ¿Conversamos diez minutos esta semana? Adjunto mi
HV, [LinkedIn](...) y [Portafolio](...)."

## Paso 5. Salida: `Correos.json`

En `Vacantes con IA/Correos en frío/<Empresa>/`, con `create_file` (`application/json`, sin convertir). Si ya existe y
aún no hay `Borradores.txt`, mándalo a la papelera (`trash_file`) y créalo de nuevo (`update_file` no cambia el
contenido). Si ya hay `Borradores.txt`, esos borradores ya existen: para agregar destinatarios, crea la carpeta
`<Empresa>_2` con la misma HV copiada y un `Correos.json` nuevo.

```json
{
  "empresa": "Bold",
  "idioma": "es",
  "firma": "Oscar Garcia\nProduct Designer | UX/UI",
  "hv": "HV_Oscar_Garcia_Product_Designer",
  "correos": [
    { "para": "talento@empresa.co", "nombre": "", "asunto": "...", "cuerpo": "...",
      "fuente": "https://...", "fecha_fuente": "2026-09", "nota": "buzón de talento" }
  ]
}
```

- Un objeto por destinatario (un borrador por destinatario, para que nadie vea a los demás). El cuerpo puede variar
  solo en el saludo.
- `hv` es el nombre exacto del Google Doc de la HV en la carpeta (si se omite, Apps Script usa el primer `HV_...`).
- **Rehacer borradores que aún no se enviaron** (2026-10-25): agrega `"reemplazar": true`. Las direcciones cuya fila en
  `Correos en frío` dice "Borrador preparado, no enviado" no se omiten: Apps Script reescribe **ese mismo borrador**
  (asunto, cuerpo y la HV nueva adjunta) y actualiza asunto, HV y Notas de su fila; no crea otro. Si el borrador ya no
  está en Gmail (se envió o se borró), no hace nada con esa dirección y lo anota en `Borradores.txt`. Una dirección ya
  enviada o rebotada nunca se reescribe. En la carpeta deja un solo Doc `HV_...` (renombra la HV vieja a
  `ANTERIOR - HV_...`; no la borres).

**Qué hace Apps Script** (`crearBorradoresEnFrio`, cada hora dentro de `sincronizarAplicadas`; el candidato también
puede ejecutarlo a mano): valida `Correos.json` (≤35 palabras, fuente en cada dirección, cifras de `CONTEXTO_CV`,
palabras prohibidas, asunto sin la empresa, saludo por el nombre; direcciones ya usadas o rebotadas se omiten), exporta
la HV a PDF, crea un borrador por destinatario con el PDF adjunto y el asunto "[Empresa] …", agrega una fila por
destinatario a `Correos en frío` (Estado "Borrador preparado, no enviado", Notas con la fuente), marca la empresa como
"Borradores creados" en `Empresas objetivo` y deja `Borradores.txt`. Si algo falla deja `Correos_ERRORES.txt`: corrige y reemplaza
`Correos.json`; Apps Script vuelve a intentarlo en la hora siguiente y quita `Correos_ERRORES.txt` cuando pasa.

**No escribas en la pestaña `Correos en frío`**: Apps Script agrega las filas al crear los borradores (así no hay filas
de borradores que no existen). En `Empresas objetivo` solo cambia la celda Estado de la empresa a `En lote` al dejar su
`Correos.json` (Apps Script la pasa a `Borradores creados`).

## Resultado para el usuario

En modo tandas, después de cada tanda: `Tanda <n>: <Empresa> (<n> correos), … — faltan <n> empresas`. Al final, el
resumen completo de abajo con todas las tandas.


```
Lote: <n> empresas — <n> borradores en camino (aparecen en Gmail en máximo una hora)
<Empresa> (<tipo>) — HV: <enlace> — gancho: <hecho> (<fuente, fecha>)
  Correo (<n> palabras): "<cuerpo>"
  Para: <dirección> (<qué es>, fuente <fecha>) × n   <advertencias: ruta de soporte, fuente antigua>
Menos de 3 direcciones: <empresa y por qué>
Revisa antes de enviar: <lo que conviene mirar>
```
