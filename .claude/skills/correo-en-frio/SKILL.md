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
- **"Siguiente lote"**: 3 empresas de "Empresas Tech en Bogotá" que no estén en la pestaña `Correos en frío`. Si ya no
  quedan, propón 3 empresas nuevas parecidas (fintech, banca, seguros, fábricas de software o startups de producto en
  Bogotá o remotas para LATAM) y **espera el OK** del candidato: las empresas fuera de la lista las aprueba él.
- Lotes de 3. Sube a 5 o 6 solo si el lote anterior salió sin correcciones. Calidad primero: si el ritmo baja la calidad,
  para y dilo.
- Antes de empezar, descarta: empresas ya contactadas (pestaña `Correos en frío`), empresas con postulación en curso
  (pestaña `Aplicadas`, carpetas de `Vacantes con IA/CV`) y empresas con vacante abierta de diseño (en ese caso es mejor
  postular a la vacante: avísalo).

## Paso 1. Investigar la empresa (web)

- Qué hace, producto, sector, tamaño, ciudad, si tiene equipo de diseño, en qué idioma se comunica, y su tipo según
  "Empresas Tech en Bogotá" (fábrica, agencia, incubadora, startup o empresa de producto).
- **El gancho:** un hecho reciente y concreto (lanzamiento, integración, expansión, reto del sector, programa) con
  **fuente y fecha**. Prohibido inventarlo o adornarlo: si no hay un hecho verificable, usa el producto principal y
  dilo. El gancho no puede servir para otra empresa (control de calidad de la guía).
- Guarda la investigación en un Google Doc `Empresa` en `Vacantes con IA/Correos en frío/<Empresa>/` (créala) con las
  fuentes. Es la entrada de `crear-hv`.

## Paso 2. La HV

Aplica la skill `crear-hv` en **modo B (empresa en frío)** en la misma carpeta y después `revisar-hv`. Una HV por
empresa (no una por correo). Debe quedar un solo Google Doc `HV_...` en la carpeta: Apps Script lo adjunta en PDF.

## Paso 3. Direcciones (al menos 3 por empresa, cada una con fuente)

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

- **Máximo 35 palabras** contando saludo y cierre (los enlaces cuentan como su palabra; la firma no cuenta). Apps Script
  rechaza un cuerpo más largo.
- **Prohibidos los clichés:** "admiro su innovación", "me encanta su cultura", "espero que estés bien", saludos formales
  largos, autobiografía.
- **La métrica** sale de `CONTEXTO_CV` (o de las cifras aclaradas por el usuario: Trezo, cerca de 90 personas = 50
  encuestas y 42 entrevistas; Seguros Bolívar, equipo de 6, lideraba a 5) y responde al reto del gancho. Toda cifra del
  correo, también el "10" de los 10 minutos, debe existir en `CONTEXTO_CV`; si no, escribe "una llamada corta" o
  "diez minutos" en letras.
- **Saludo:** por el nombre si la dirección es de una persona ("Hola Ana,"); si es un buzón general, "Hola," o "Hola,
  equipo de <área>,".
- **Tono por tipo de empresa** ("Empresas Tech en Bogotá"): fábrica de software → sistemas de diseño, documentación y
  handoff sin fricción, metodologías ágiles; agencia → conversión y criterio visual (puede incluir una observación breve
  sobre una página de un cliente); incubadora o aceleradora → ofrecer valor a las startups de su portafolio y pedir que
  lo presenten; startup o empresa de producto (fintech) → resultados de producto y research.
- **Idioma:** el de las comunicaciones de la empresa. En inglés, frases simples (nivel real B2).
- **Enlaces:** `[LinkedIn](<url>)` y `[Portafolio](<url>)` (en inglés `[Portfolio](<url>)`) con las URL exactas del
  encabezado de `MASTER_TEMPLATE`, https y sin espacios. Apps Script los convierte en enlaces clicables.
- **Asunto:** la especialidad y el foco para esa empresa más el nombre de la empresa, sin "Postulación" (ej.
  "Diseñador UX/UI - Pagos y comercios - Bold"). El candidato quita el nombre de la empresa al enviar si quiere.
- Palabras prohibidas también aquí (aprendiz, practicante, voluntario, intern, volunteer, junior).
- **Control de calidad de la guía** antes de guardar: ¿≤35 palabras?, ¿el dato es específico de esta empresa?, ¿hay una
  métrica?, ¿enlaces correctos?

Ejemplo de forma (no de contenido; cada empresa lleva su propio gancho y su propia métrica): "Hola Ana, vi que lanzaron
<hecho verificado>. En <experiencia> logré <métrica de CONTEXTO_CV>. ¿Conversamos diez minutos esta semana? Adjunto mi
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

**Qué hace Apps Script** (`crearBorradoresEnFrio`, cada hora dentro de `sincronizarAplicadas`; el candidato también
puede ejecutarlo a mano): valida `Correos.json` (≤35 palabras, fuente en cada dirección, cifras de `CONTEXTO_CV`,
palabras prohibidas, direcciones ya usadas o rebotadas se omiten), exporta la HV a PDF, crea un borrador por
destinatario con el PDF adjunto, agrega una fila por destinatario a `Correos en frío` (Estado "Borrador preparado, no
enviado", Notas con la fuente) y deja `Borradores.txt`. Si algo falla deja `Correos_ERRORES.txt`: corrige y reemplaza
`Correos.json`; Apps Script vuelve a intentarlo en la hora siguiente y quita `Correos_ERRORES.txt` cuando pasa.

**No escribas en la pestaña `Correos en frío`**: Apps Script agrega las filas al crear los borradores (así no hay filas
de borradores que no existen).

## Resultado para el usuario

```
Lote: <n> empresas — <n> borradores en camino (aparecen en Gmail en máximo una hora)
<Empresa> (<tipo>) — HV: <enlace> — gancho: <hecho> (<fuente, fecha>)
  Correo (<n> palabras): "<cuerpo>"
  Para: <dirección> (<qué es>, fuente <fecha>) × n   <advertencias: ruta de soporte, fuente antigua>
Menos de 3 direcciones: <empresa y por qué>
Revisa antes de enviar: <lo que conviene mirar>
```
