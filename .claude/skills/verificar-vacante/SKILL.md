---
name: verificar-vacante
description: Verifica una vacante de diseño UX/UI antes de recomendarla o de que el candidato se postule — los cinco chequeos (abierta, acepta candidatos desde Colombia, postular es gratis, no aplicada antes, enlace real), que el cargo encaje por sus funciones y no por el título, nivel, ubicación, inglés y contrato — y deja un veredicto (lista / menor prioridad / descartar) con sus razones. Úsala cuando el usuario pegue el enlace de una vacante, pida "verifica/revisa esta vacante", antes de postularse, o al revisar las carpetas de "Vacantes con IA/Sin revisar".
---

# Verificar vacante

Objetivo: que el candidato solo tenga que abrir el aviso y enviar (su pedido del 22 oct: "que solo tengas que ir y
enviarlas"). Solo vacantes reales, abiertas y verificadas. Meta: 10 nuevas verificadas por día; si salen menos, se
reporta sin rellenar.

Criterios tomados del documento del usuario "Cómo filtro tus vacantes" (24 oct 2026) y de su guía de búsqueda.

## Reglas de conducta

- **No enviar nada.** No postular, no conectar ni escribir en LinkedIn, no responder a reclutadores. Solo leer y reportar.
- **No inventar.** No se inventan vacantes ni se completan datos que no se pudieron comprobar: se reportan como
  "sin verificar", nunca como cumplidos.
- **LinkedIn con calma:** pocas consultas, una por vacante. Si aparece un límite o un captcha, parar y decirlo.
- **Las excepciones no son reglas.** Si el usuario decide postular a una vacante fuera de los filtros, se prepara esa,
  pero eso no autoriza otras parecidas.
- Responder en español, corto.

## Entradas

Una de estas:
- Un enlace a la vacante.
- Una carpeta de `Vacantes con IA/Sin revisar/<YYYY-MM-DD>/<Empresa>` con su Google Doc `Detalle_Vacante`
  (trae cargo, empresa, link, fecha, idioma, correo de contacto y la descripción completa; puede traer
  `Rol: VERIFICAR FUNCIONES` y `Aviso empresa: …`).
- **"Verifica las de hoy"** (o de una fecha): todas las carpetas de `Vacantes con IA/Sin revisar/<fecha>/` más cada
  enlace del documento `Posts/Posts` de ese día (publicaciones de LinkedIn, una por una). Ver "Modo lote".

## Herramientas

- **Drive:** buscar carpetas y archivos (`search_files`, `parentId = '<id>'`), leer Docs (`read_file_content`) y crear
  `Verificacion.txt` (`create_file`, `text/plain`, sin convertir).
- **Sheets:** leer `Hoja 1`, `Aplicadas` y `Correos en frío` (`get_values`); escribir solo la celda de Estado
  (`update_values`) o agregar una fila (`append_values`).
- **Web:** navegador con sesión si existe (Claude en Chrome, app de escritorio); si no, lectura de páginas y búsqueda
  web. La red disponible depende del entorno: si un sitio no abre, se reporta "sin verificar", nunca se da por bueno.

## Orden de trabajo

Primero lo barato y sin red (paso 4, repetidas; paso 3 con el texto de `Detalle_Vacante`), después abrir enlaces
(pasos 1, 2 y 6). Si una vacante ya cae por repetida o por no encajar, no hace falta abrir su enlace.

## Paso 1. Abrir el aviso original

- Abre el enlace de **postulación**, no solo el del listado. Si hay navegador con la sesión del usuario (Claude en
  Chrome o el navegador de la app de escritorio), úsalo: LinkedIn muestra más con sesión.
- Fuentes válidas como origen: LinkedIn (empleos y publicaciones "estamos contratando"), Indeed, Computrabajo, portal
  oficial de la empresa, Get on Board, elempleo, Magneto365, Torre, bolsa de empleo de la UNAL y comunidades de diseño
  UX de Colombia y LATAM.
- **Nunca** como origen: trabajo.org, Jooble, JobLeads, BeBee, Upwork, Freelancer, Workana, Fiverr, vacantes.com, ni
  sitios que piden tarjeta para postular. Si la vacante aparece ahí, rastrea la publicación original; si no existe,
  descártala ("solo en agregador, original no encontrado").
- **Tableros que repiten avisos de otros** (no son el original aunque no estén vetados): Jobicy, Remotive, Working
  Nomads, UI/UX Jobs Board, Built In y los tableros de fondos de inversión (General Catalyst, Techstars…). Busca el
  aviso en el portal de empleo de la empresa o su sistema de postulación (Greenhouse, Lever, Ashby, Workable,
  Teamtailor…). Si las copias se contradicen (ubicación, tipo de contrato, salario), repórtalo y decide con el original.
- **Si la página no abre** desde tu entorno (según el acceso a la red del entorno, algunas sesiones no llegan a ciertos portales), intenta una búsqueda
  web del cargo + empresa para encontrar el original y sus datos; lo que no puedas abrir queda "sin verificar" y la
  verificación final se hace en el navegador del usuario (app de escritorio o Claude en Chrome). Nunca lo des por
  cumplido.

## Paso 2. Los cinco chequeos (todos obligatorios)

1. **Sigue abierta y aceptando postulaciones.** La página carga (no 404/410), el botón de postular está activo y no dice
   "No longer accepting applications", "ya no acepta postulaciones", "oferta cerrada/caducada/vencida" ni "proceso
   cerrado". Si trae fecha límite, que no haya pasado. Nadie publicó que el cargo ya se ocupó.
2. **Acepta candidatos desde Colombia.** Ubicación explícita: Colombia (presencial, híbrido o remoto) o remoto LATAM /
   mundial / UTC-3 a UTC-6. Se descarta: solo EE. UU., Norteamérica, Europa, India, un solo país distinto de Colombia
   (p. ej. "solo Uruguay") o presencial fuera de Colombia (p. ej. Sídney, Copenhague, México).
3. **Postular es gratis.** Sin pagos, tarjeta, cursos, exámenes ni "kits" para postular.
4. **No la ha aplicado antes** (ver paso 4).
5. **El enlace abre la vacante real:** mismo cargo y empresa, no otra vacante, un listado genérico ni una página de error.

## Paso 3. ¿El cargo encaja? Por funciones, no por título

Si `Detalle_Vacante` dice `Rol: VERIFICAR FUNCIONES`, el agente la dejó pasar por un título dudoso (CX, contenido,
producto digital…): esta revisión decide.

Regla del usuario (24 oct): si el nombre es distinto (p. ej. CX o gestión de producto) pero la **función principal** es
la de sus roles, entra; si el título suena a diseño pero la función principal es de otro oficio, no entra.

- **Funciones de referencia:** investigación con usuarios, diseño de interfaces y prototipos en Figma, sistemas de
  diseño, pruebas de usabilidad y handoff a desarrollo.
- Ejemplos: "CX designer" cuya función principal es diseñar flujos, pantallas y prototipos → entra aunque coordine con
  otros equipos. "Gestión de producto" cuya función principal es coordinar desarrollo, datos o negocio → no entra
  aunque mencione diseño.
- **Código:** HTML/CSS como "deseable", "conocimientos en" o "básicos" → entra. Se descarta cuando programar es el
  centro del cargo (p. ej. "Design Engineer" que exige React/TypeScript).

| Criterio | Entra | Menor prioridad (entra, marcado) | Se descarta |
|---|---|---|---|
| Rol (por funciones) | UX/UI, diseño de producto, design systems, UX research, diseño digital/web, visual o de servicios; CX o gestión de producto si la función principal es diseño | — | Copywriter/redactor, SEO, desarrollador/programador, diseño gráfico puro; núcleo del cargo = programar |
| Nivel y años | Junior; senior que pide menos de 5 años | Mid de 3 a 5 años (señalar siempre la diferencia con la experiencia real; la HV nunca infla años); 5 o más años | Staff, principal, head, director, VP, manager, gerente |
| Antigüedad | Hasta 21 días | De 22 a 28 días, solo si sigue abierta | Más de 28 días |
| Ubicación | Colombia; remoto LATAM/mundial UTC-3 a -6 | Presencial en Medellín o Cali | Ver chequeo 2 |
| Inglés (nivel real: intermedio) | Sin requisito, o intermedio/B1–B2. Aviso en inglés sin nivel explícito: entra, pero **avisar** | — | Avanzado, fluido, nativo, C1/C2 o bilingüe obligatorio |
| Contrato | Indefinido, término fijo, prestación de servicios, obra labor | — | Freelance o por proyecto; pasantía sin pago; vacante reservada **exclusivamente** para personas con discapacidad (las inclusivas no exclusivas entran normal) |
| Sector | Cualquiera | — (fintech y financiero van primero) | — |
| Salario | Sin piso mínimo: no se descarta por monto. Si la vacante publica salario, **reportarlo** | — | — |

**Pendiente de definir por el usuario:** medio tiempo con contrato fijo. No descartar ni recomendar: reportar con la
etiqueta "medio tiempo (pendiente de definir)" para que decida él.

Una vacante de menor prioridad solo entra si pasa los cinco chequeos.

La fuente de verdad de los filtros automáticos del agente es `apps_script/Config.gs`; esta skill aplica los mismos
criterios leyendo el aviso completo, que es lo que el código no puede juzgar bien (funciones vs. título, sobre todo).

## Paso 4. ¿Está repetida o ya aplicada?

- Compara por **enlace y por empresa + cargo** contra la hoja `Vacantes UX - Registro`, pestaña `Hoja 1` (columnas
  B Empresa, C Cargo, D Link). La misma vacante aparece con enlaces distintos (LinkedIn, Indeed, portal).
- **Lo aplicado se mira en las carpetas semanales** de `Vacantes con IA/CV/` (primera, segunda, tercera semana… y
  todas sus subcarpetas, incluida la confidencial). La pestaña `Aplicadas` es solo un índice de esas carpetas (se
  regenera cada hora); úsala para encontrarlas (columna F trae el enlace a cada carpeta), pero decide mirando la carpeta.
- **Si la empresa ya tiene carpeta** (regla del usuario 2026-10-24): entra a la carpeta y compara con la vacante nueva
  usando su documento `Vacante` o `Detalle_Vacante` (enlace, cargo y funciones) y el nombre de la HV
  (`HV_Nombre_Apellido_<Cargo>`).
  - Mismo enlace, mismo cargo o mismas funciones → **repetida** (ya aplicada o ya preparada).
  - Otro cargo con otras funciones → **vacante nueva**; avisa que ya hay una postulación a esa empresa.
  - La carpeta no tiene información para comparar → dilo y deja que el usuario decida.
- Las carpetas dentro de `Prueba` son HV **preparadas sin enviar**: cuentan como repetidas (no se propone de nuevo la
  misma vacante), pero no como aplicadas.
- Si la empresa está en la pestaña `Correos en frío`, avisa que ya se le escribió (no la descarta).
- Revisa también las otras carpetas de `Sin revisar` (días anteriores) y los `Posts` anteriores: la misma vacante o el
  mismo reclutador pueden volver a aparecer días después con otro enlace.
- Las vacantes que el agente marcó en `Detalle_Vacante` con `Aviso empresa:` ya pasaron por esta comparación
  automática (solo por cargo y enlace); confírmala con las funciones.

## Paso 5. Señales de alerta (posible fraude o vacante falsa)

Además del chequeo 3: piden datos bancarios o documentos antes de una entrevista; contacto solo por WhatsApp o correo
genérico (@gmail, @hotmail) a nombre de una empresa grande; salario muy por encima del mercado sin explicación; empresa
sin rastro (sin web ni LinkedIn); texto con el código `J-18808-Ljbffr` (copia de JobLeads). Con cualquiera de estas,
marcar y explicar.

## Paso 6. ¿Cómo se aplica exactamente?

- Botón de postulación en LinkedIn (Easy Apply o externo), Indeed, Computrabajo o el portal: cuál y el enlace.
- Por correo: la dirección, **de dónde sale** (texto del aviso, página de la empresa) y si está confirmada para esta
  vacante. Nunca adivinar direcciones.
- Requisitos del proceso: formulario, prueba técnica, portafolio, preguntas de filtro, fecha límite.

## Modo lote ("verifica las de hoy")

1. Lista las carpetas de `Sin revisar/<fecha>/` (sin contar `Posts`) y los enlaces del documento `Posts/Posts`.
2. Salta las que ya tienen `Verificacion.txt` con veredicto, salvo que el usuario pida re-verificar.
3. Verifica cada una con los pasos de arriba (en el orden de trabajo indicado).
4. Termina con un resumen corto:

```
Verificación <fecha>: <N> revisadas — ✅ <a> listas · 🟡 <b> menor prioridad · ❌ <c> descartadas · ⏸️ <d> pendientes
Meta diaria: <a + b> de 10 (si no se llega, decirlo; no rellenar)
| Empresa | Cargo | Veredicto | Motivo / qué la baja | Cómo aplicar |
```

Ordena la tabla: primero ✅, luego 🟡, después ⏸️ y al final ❌.

## Resultado

Un veredicto por vacante:
- ✅ **Lista**: pasa los cinco chequeos y encaja.
- 🟡 **Menor prioridad**: pasa los cinco chequeos, pero es mid de 3 a 5 años, pide 5 o más años, tiene de 22 a 28 días
  o es presencial en Medellín/Cali. Decir qué la baja.
- ❌ **Descartar** (o **Cerrada**): falla un chequeo, no encaja o tiene señales de alerta. Decir el motivo.
- ⏸️ **Pendiente de decisión**: medio tiempo con contrato fijo.

Formato del reporte (una línea por punto; "sin verificar" cuando no se pudo):

```
Empresa — Cargo — <enlace original>
Veredicto: ✅ Lista | 🟡 Menor prioridad (motivo) | ❌ Descartar/Cerrada (motivo) | ⏸️ Pendiente de decisión
Chequeos: abierta sí/no · acepta Colombia sí/no · gratis sí/no · no aplicada sí/no · enlace real sí/no
Encaje: función principal · nivel/años · ubicación · inglés · contrato (marca lo que no cumple)
Salario: <si lo publica> | no publicado
Alertas: ninguna / cuáles
Cómo aplicar: botón en <sitio> | correo <dirección> (fuente, confirmada sí/no) · requisitos del proceso
Fecha de publicación: <fecha> (fuente)
```

Registro:
- Si hay acceso de escritura a Drive, guarda el reporte como archivo de texto `Verificacion.txt` en la carpeta de la
  vacante.
- Las que no pasan quedan en el registro (`Vacantes UX - Registro`, `Hoja 1`, columna F Estado) como
  `Descartada: <motivo>` o `Cerrada: <motivo>`, en vez de llegarle al usuario como opción. Con el conector de Google
  Sheets: busca la fila por el enlace (columna D) o por empresa + cargo y actualiza **solo** la celda de Estado de esa
  fila; si la vacante no está en el registro, agrega una fila (Fecha, Empresa, Cargo, Link, Match Score vacío, Estado).
  Nunca reescribas otras filas ni columnas. Sin conector, deja en el reporte la lista de filas a actualizar.
- No borres ni muevas carpetas: el usuario decide qué hacer con ellas.
