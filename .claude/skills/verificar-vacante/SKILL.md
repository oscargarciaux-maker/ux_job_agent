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
  (trae cargo, empresa, link, fecha, idioma, correo de contacto y la descripción completa).

## Paso 1. Abrir el aviso original

- Abre el enlace de **postulación**, no solo el del listado. Si hay navegador con la sesión del usuario (Claude en
  Chrome o el navegador de la app de escritorio), úsalo: LinkedIn muestra más con sesión.
- Fuentes válidas como origen: LinkedIn (empleos y publicaciones "estamos contratando"), Indeed, Computrabajo, portal
  oficial de la empresa, Get on Board, elempleo, Magneto365, Torre, bolsa de empleo de la UNAL y comunidades de diseño
  UX de Colombia y LATAM.
- **Nunca** como origen: trabajo.org, Jooble, JobLeads, BeBee, Upwork, Freelancer, Workana, Fiverr, vacantes.com, ni
  sitios que piden tarjeta para postular. Si la vacante aparece ahí, rastrea la publicación original; si no existe,
  descártala ("solo en agregador, original no encontrado").

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

- Compara por **enlace y por empresa + cargo** contra la hoja `Vacantes UX - Registro` (Hoja 1). La misma vacante
  aparece con enlaces distintos (LinkedIn, Indeed, portal).
- **Lo aplicado se mira en las carpetas semanales** de `Vacantes con IA/CV/` (primera, segunda, tercera semana… y
  todas sus subcarpetas, incluida la confidencial). La pestaña `Aplicadas` no es la fuente de verdad. No cuentan como
  aplicadas las carpetas `Prueba` (preparadas sin enviar) ni `Sin revisar`.
- **La misma empresa con un cargo distinto no es duplicado:** se evalúa como vacante nueva (y se avisa que ya hay una
  postulación a esa empresa).
- Si la empresa está en la pestaña `Correos en frío`, avisar que ya se le escribió.

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
- Las que no pasan quedan en el registro (`Vacantes UX - Registro`, columna Estado) como **Descartada** o **Cerrada**
  con el motivo, en vez de llegarle al usuario como opción. Si la sesión no puede escribir en Sheets (sin conector de
  Google Sheets), deja la lista de filas a actualizar en el reporte para que se hagan después.
- No borres ni muevas carpetas: el usuario decide qué hacer con ellas.
