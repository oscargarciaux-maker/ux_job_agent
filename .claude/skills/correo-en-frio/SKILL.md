---
name: correo-en-frio
description: Prepara correos en frío para empresas sin vacante publicada (investiga la empresa, crea su HV con crear-hv, busca direcciones reales con fuente y escribe un mensaje humano de saludo + 2 párrafos con la estructura de Oscar (hito y felicitación; puente, caso con su porqué, aporte e invitación), máximo 3, de hasta 80 palabras según la Guía Maestra de Cover Letters) y deja todo listo para que Apps Script cree un borrador de Gmail por destinatario con la HV en PDF adjunta. Nunca envía nada. Úsala cuando el usuario pida "escríbele a <empresa>", "correo en frío para…", "siguiente lote" o "prepara correos para estas empresas".
---

# Correo en frío

Política permanente: `docs/POLITICA_OPERATIVA.md`. Un **cartero por tanda** de hasta 3 empresas, con lectura única de recursos compartidos; ninguna petición de redactar correos permite enviarlos. Ante fallos de acceso, registrar estado parcial, no simular que el borrador existe.

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
- **"Crea los correos"** (modo tandas): prepara **una tanda de hasta 3 empresas** con Estado `Nueva` (o las que
  nombre) por ejecución. Deja el avance en el Sheet, indica cuántas quedan y retoma la siguiente tanda solo
  en otra ejecución o si Oscar pide expresamente más con presupuesto adicional. Nunca encadenes tandas
  ilimitadas en una sola sesión: el coste de IA se dispara.
- **Tope de borradores (decisión del usuario, 28 oct 2026: producir menos, el cuello de botella es enviar).** Antes de
  un lote nuevo, cuenta en la pestaña `Correos en frío` las direcciones con Estado `Borrador preparado, no enviado`. Si
  son **más de 10**, se pausa toda **producción autónoma** de correos. Si Oscar pide **expresamente**
  «crea los correos», «siguiente lote» o «escríbele a X», puedes preparar **una sola tanda de hasta 3 empresas**,
  indicando primero cuántos borradores esperan. Crear borradores no autoriza enviarlos.
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
   revisado contra el control de calidad de la guía (hasta 3 párrafos de ≤80 palabras, estructura de Oscar del 10 nov, sin contar el saludo ni la empresa, gancho específico, métrica de
   `CONTEXTO_CV`, saludo por el nombre, asunto sin la empresa). Si hay una herramienta de subagentes, puedes darle a cada
   empresa un subagente distinto: eso multiplica la lectura de los mismos documentos y los tokens. Usa **un
   único cartero para las 3 empresas**, leyendo recursos compartidos una vez; prepara y revisa las tres
   individualmente con la misma lista de calidad.
3. Solo cuando las 3 estén completas y revisadas, informa la tanda en 3 líneas, indica el número de empresas
   restantes y **termina la sesión**. La próxima ejecución continúa donde quedó; no inicies otra tanda sin
   nueva orden de Oscar.
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
misma corrida que crea los borradores y adjunta su PDF. Si ya hay un Google Doc `HV_...` (o `CV_...` si la HV va en inglés) en la carpeta, se usa ese.
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

**Estructura de Oscar (10 nov 2026: revisó 26 borradores, los reescribió con «una estructura más fluida» y pidió
«que los borradores ahora sean así de claros»).** Saludo + 2 párrafos (3 solo si la invitación no cabe), separados por
una línea en blanco, y la firma con su título:
1. **Hito, felicitación y lo que le llamó la atención** (~30–40 palabras): «Vi que en <Empresa> <hito real y
   reciente>; felicitaciones por <ese hito>. Me llamó la atención que <detalle concreto del hito>.»
2. **Puente de motivación + caso con su porqué + aporte e invitación** (~50–75 palabras):
   - una frase que conecta el hito con lo que lo mueve: «Ese tipo de <proceso/reto> es lo que me motiva.», «Para mí
     estos pasos son fundamentales y el usuario siempre va primero.»;
   - «Lo viví en <empresa real de CONTEXTO_CV>, donde…»: el **contexto del problema**, la **decisión** que tomó y **el
     porqué con el dato del usuario** («reorienté la atención hacia WhatsApp y web en vez de una app, dado que el 30%
     de los usuarios no quería descargar más apps»), y el **resultado medible**;
   - «Me gustaría aportar <ese criterio / esta visión> a sus <productos/proyectos>. ¿Conversamos? Adjunto HV, LinkedIn
     y Portafolio.» (va en el mismo párrafo o, si no cabe, en un tercero corto).
3. **Firma:** «Oscar Garcia» y debajo «Diseñador UX/UI | Product Designer» (en inglés «UX/UI Designer | Product
   Designer»).

Ejemplo modelo (estructura, no copiar el contenido):

> Hola,
>
> Vi que en Pragma cumplen 30 años transformando bancos y entidades de crédito; felicitaciones por esas tres décadas. Me
> llamó la atención que modernicen sin cambios bruscos para el cliente.
>
> Esa modernización que pone la experiencia del cliente primero es lo que me motiva. Lo viví en Seguros Bolívar, donde
> reorienté la atención de siniestros hacia WhatsApp y web en lugar de una app, dado que el 30% de los usuarios no quería
> descargar más apps. Con ese cambio, el 93% de las indemnizaciones se resolvió por canales digitales. Me gustaría aportar
> esa visión a sus proyectos. ¿Conversamos? Adjunto HV, LinkedIn y Portafolio.
>
> Oscar Garcia
> Diseñador UX/UI | Product Designer

Antes de guardar, revisa cada cifra contra `CONTEXTO_CV` (las llamadas bajaron de **3.1M** a 1.9M; 3.2M es la retención
en WhatsApp) y la ortografía (tenían, mí, WhatsApp).

**Redacción (3 nov 2026, el candidato revisó los borradores: «no suena profesional ni estratégico», «suena forzado»,
«no me gusta que redactes con :»):**
- **Sin dos puntos.** Nada de "Me interesa la IA en producto: …" ni "Me interesa trabajar con startups: …". Apps Script
  lo rechaza.
- **Nada de fórmulas** como "Me interesa X", "Me interesa porque así trabajo" o "Me interesa su producto". El interés se
  nota en el puente y en lo que quiere aportar, no se anuncia.
- **El logro es una decisión del candidato en primera persona** (propuse, impulsé, prioricé, reorienté) con su resultado
  medible, como en la HV. Nunca "llevamos", "logramos", "así trabajo" ni el logro suelto sin decir qué decidió.
- **El logro responde al mismo tema del hito.** Si el hito es una mentoría para emprendedores, el logro es de una startup
  temprana (Meevent pre-semilla); si es pagos, Central Xpress o Seguros Bolívar; si es IA, el flujo con IA de Meevent o
  Central Xpress (sin atribuirle el 83%). Si ningún logro conecta de verdad, cambia el hito.
- **La felicitación es concreta** (sobre el hito, no "por su trabajo") y el párrafo 1 no exagera lo que la fuente dice.
- Antes de guardar, léelo en voz alta: si una frase no la diría una persona en un correo real, reescríbela.

- El saludo suelto ("Hola Ana,") y la firma no cuentan; los enlaces cuentan como su palabra y **el nombre de la empresa
  no cuenta**. Apps Script rechaza más de 3 párrafos o un párrafo de más de 80 palabras (`emailShapeErrors`).
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
  nunca en el asunto. No cuenta en las palabras.
- **Tono por tipo de empresa** ("Empresas Tech en Bogotá"): fábrica de software → sistemas de diseño, documentación y
  handoff sin fricción, metodologías ágiles; agencia → conversión y criterio visual (puede incluir una observación breve
  sobre una página de un cliente); incubadora o aceleradora → ofrecer valor a las startups de su portafolio y pedir que
  lo presenten; startup o empresa de producto (fintech) → resultados de producto y research.
- **Idioma:** el de las comunicaciones de la empresa. En inglés, frases simples (nivel real B2).
- **Enlaces:** `[LinkedIn](<url>)` y `[Portafolio](<url>)` (en inglés `[Portfolio](<url>)`) con las URL exactas del
  encabezado de `MASTER_TEMPLATE`, https y sin espacios. Apps Script los convierte en enlaces clicables.
- **Asunto:** la especialidad y el foco para esa empresa, **sin el nombre de la empresa** y sin "Postulación" (ej.
  "Diseñador UX/UI - Pagos y comercios"). Apps Script rechaza un asunto con el nombre de la empresa. En el borrador
  queda tal cual en el borrador, sin prefijos (desde el 3 nov 2026 ya no lleva "[BORRAR ANTES DE ENVIAR: Empresa] ":
  el candidato temía que se enviaran así). El borrador se encuentra por la empresa que nombra el cuerpo.
- Palabras prohibidas también aquí (aprendiz, practicante, voluntario, intern, volunteer, junior).
- **Control de calidad de la guía** antes de guardar: ¿2 párrafos (3 solo si no cabe), el segundo con puente, caso con su porqué y aporte (≤80 palabras)?, ¿suena como lo diría una persona?, ¿el dato es específico de esta empresa?, ¿hay una
  métrica?, ¿enlaces correctos?

Ejemplos de forma aprobados en la revisión del 3 nov (no copies el contenido; cada empresa lleva su propio hito y su logro):

"Hola René,

Vi que en HubBOG tienen la Mentoría IA LATIA para emprendedores. Me gustó que acompañen a las startups a usar la IA en su
producto desde temprano; felicitaciones por la iniciativa.

Conozco esa etapa. En Meevent, una startup pre-semilla, impulsé un sistema de diseño que bajó 83% las reuniones de
corrección visual. Me gustaría aportar eso a sus emprendedores. ¿Conversamos? Adjunto HV, [LinkedIn](...) y [Portafolio](...)."

"Hola,

Vi que en Bold basta el RUT para empezar a cobrar. Lo viví en Central Xpress, donde un emprendedor pudo vender como
persona natural; felicitaciones por hacerlo tan simple.

En ese proyecto prioricé Shopify sobre plataformas costosas y bajé 51.6% los costos del primer año. Me gustaría aportar
ese criterio a sus comercios. ¿Conversamos esta semana? Adjunto HV, [LinkedIn](...) y [Portafolio](...)."

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
- `hv` es el nombre exacto del Google Doc de la HV en la carpeta (si se omite, Apps Script usa el primer `HV_...` o `CV_...`).
- **Rehacer borradores que aún no se enviaron** (2026-10-25): agrega `"reemplazar": true`. Las direcciones cuya fila en
  `Correos en frío` dice "Borrador preparado, no enviado" no se omiten: Apps Script reescribe **ese mismo borrador**
  (asunto, cuerpo y la HV nueva adjunta) y actualiza asunto, HV y Notas de su fila; no crea otro. Si el borrador ya no
  está en Gmail (se envió o se borró), no hace nada con esa dirección y lo anota en `Borradores.txt`. Una dirección ya
  enviada o rebotada nunca se reescribe. En la carpeta deja un solo Doc `HV_...` (renombra la HV vieja a
  `ANTERIOR - HV_...`; no la borres).

**Qué hace Apps Script** (`crearBorradoresEnFrio`, cada hora dentro de `sincronizarAplicadas`; el candidato también
puede ejecutarlo a mano): valida `Correos.json` (hasta 3 párrafos de ≤80 palabras, fuente en cada dirección, cifras de `CONTEXTO_CV`,
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
