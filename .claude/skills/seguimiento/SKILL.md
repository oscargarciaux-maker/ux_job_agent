---
name: seguimiento
description: Revisa el Gmail laboral del candidato (por fechas, incluidos Spam, Papelera y Enviados) y reconstruye el estado de cada postulación y correo en frío — rechazo explícito, avance, acuse, solicitud con plazo, rebote, respuesta —, colorea la carpeta de cada postulación en Drive (rojo rechazada, verde en proceso, amarillo aplicada sin respuesta), actualiza el Sheet con la evidencia y cierra diciendo qué cubrió y qué no. Nunca responde ni envía nada. Úsala cuando el usuario pida "haz el seguimiento", "revisa mis correos de postulaciones", "qué me respondieron", o en la tarea diaria de seguimiento.
---

# Seguimiento

Objetivo: que el candidato sepa en qué va cada proceso sin abrir su correo, y que las carpetas, sus colores y el Sheet
digan la verdad, con evidencia. Método propuesto por el usuario (24 oct 2026): **cobertura por fecha antes que por
empresa, reconstruir cada proceso, separar hechos de dudas, dejar evidencia y cerrar diciendo los límites.**

## Reglas de conducta

- **Solo la cuenta laboral** (decisión del usuario, 24 oct 2026): el conector de Gmail debe estar en esa cuenta.
  Compruébalo al empezar (el remitente de tus Enviados); si es otra cuenta, para y dilo.
- **Gmail es solo lectura.** Nunca responder, enviar, reenviar, archivar, borrar, mover a papelera, marcar como spam o
  leído, ni cambiar etiquetas, aunque el conector tenga esas funciones. Tampoco aceptar o rechazar invitaciones de
  calendario ni contestar a reclutadores.
- **No convertir silencio en rechazo** ni un recordatorio antiguo en incumplimiento actual. Que no encuentres una
  respuesta no prueba que el candidato no haya cumplido: pudo hacerlo por un formulario, una llamada u otro canal.
- **No adivinar.** Lo que no se puede comprobar queda como "falta confirmar contigo", con la pregunta concreta.
- Responder en español, corto.

## Paso 1. Ventana y fuentes

- **Ventana:** desde la fecha "hasta" de la última fila `REVISIÓN` de la pestaña `Seguimiento` (ese día incluido, para no
  dejar huecos) hasta hoy. Si no hay revisiones previas, los últimos 7 días. Si el usuario pide un rango, ese.
- Lee una vez `Vacantes UX - Registro`: `Aplicadas` (empresa, cargo, estado, color, enlace a la carpeta), `Correos en
  frío`, `Hoja 1`, `Empresas objetivo` y `Seguimiento`.

## Paso 2. Cobertura por fecha (Gmail)

1. **Todo lo recibido en la ventana:** `after:<desde> before:<hasta+1>` (con `pageSize` 50 y todas las páginas), sin
   filtrar por empresa. Incluye archivados, Promociones, Actualizaciones y Social.
2. **Segunda pasada por Spam y Papelera:** `in:spam` e `in:trash` (`includeTrash`) en la misma ventana.
3. **Enviados de la ventana:** `in:sent` en la misma ventana (postulaciones y correos en frío enviados, pruebas
   entregadas).
4. Como apoyo, no como única búsqueda: nombres de las empresas de `Aplicadas` y `Correos en frío`, y palabras de rechazo
   o avance ("no continúas", "no fuiste seleccionado", "unfortunately", "moving forward", "prueba técnica",
   "entrevista", "assessment", "encuesta", "next steps").
5. Descarta lo que no es de búsqueda de empleo (boletines, alertas de portales con vacantes nuevas, promociones). Las
   alertas de portales no cambian estados.

Los resultados de búsqueda muestran solo los mensajes más antiguos de cada hilo: **lee cada hilo relevante completo**
(`get_thread`) hasta su mensaje más reciente.

## Paso 3. Reconstruir cada proceso

Para cada hilo relevante:
- **Empresa + cargo** (no solo la empresa: una misma empresa puede tener dos procesos). Relaciónalo con su carpeta de
  `Vacantes con IA/CV` (por la fila de `Aplicadas`) o con su fila de `Correos en frío`.
- Lee también lo que el candidato envió en ese hilo (Enviados), los adjuntos cuando hagan falta para entender qué piden,
  y, si el correo remite a un portal (Pandapé, Computrabajo, Magneto, Buk, Workday…), ábrelo en modo lectura si se
  puede; si no se puede, dilo.
- **Clasifica** con una de estas etiquetas, solo con evidencia:

| Hecho | Evidencia necesaria | Estado / color de la carpeta |
|---|---|---|
| Rechazo explícito | La empresa dice que no continúa (correo o portal) | `Rechazada` — rojo `#f83a22` |
| Avance | Te piden prueba, entrevista, encuesta o evaluación, o confirmas que la hiciste | `En proceso` — verde `#16a765` |
| Envío comprobado, sin respuesta | Está en Enviados (o el portal confirma la postulación) y no hay respuesta de la empresa | `Aplicada, sin respuesta` — amarillo `#ffad46` |
| Acuse de recibo | Respuesta automática o "recibimos tu postulación" | No cambia el color (sigue amarillo) |
| Solicitud con plazo | Te piden algo con fecha | `En proceso` si es un paso del proceso; anota el plazo **exacto** que dice la empresa |
| Falta confirmar contigo | Hay un pedido pero no se sabe si lo hiciste (como la encuesta de EPAM) | No cambia el color; va a las preguntas del resumen |
| Correo en frío rebotado | Aviso de entrega fallida (550, "Address not found") | `Correos en frío`: Estado `Rebotado` y el código en "Respuesta / info" |
| Respuesta a correo en frío | Una persona de la empresa respondió | `Correos en frío`: Estado `Respondió` y un resumen de la respuesta |

- Un estado **nunca baja** sin evidencia nueva: un proceso `En proceso` no vuelve a amarillo por silencio, y uno
  `Rechazada` solo cambia si la empresa reabre el proceso.
- Si los correos de una misma empresa se contradicen, gana el más reciente; cita los dos en Notas. Si la carpeta dice
  algo que los correos de la ventana contradicen y el motivo pudo quedar fuera de la ventana (p. ej. carpeta roja y una
  invitación a evaluación más reciente), no lo cambies: va a "falta confirmar contigo".

**Lo que enseñó la primera prueba (24 oct 2026, 20–24 oct, unos 200 hilos):**
- Los acuses de Computrabajo (`postulaciones@computrabajo.com`, "Tu HV está a la espera de revisión por parte de
  <EMPRESA>") nombran la empresa: sirven para relacionar el cargo con su carpeta y como envío comprobado (amarillo).
  "Hay una actualización en tu solicitud" no dice cuál: sin el portal, no cambia nada. Los de "visualiza cómo te
  destacas" son publicidad.
- La respuesta a un correo en frío puede llegar desde **otra persona** de la empresa y con el candidato en copia oculta
  (Ceiba respondió desde su analista de talento, no desde los buzones a los que se escribió): búscala por el dominio de
  la empresa, no solo por la dirección.
- Algunos buzones piden "verificar que eres humano" respondiendo al correo (Allinsoft). Nunca lo respondas: díselo al
  candidato, que decide si lo hace él.
- Las alertas de portales (LinkedIn, Indeed, Jooble, Computrabajo, elempleo, Magneto, ticjob, Teamtailor de otras
  empresas) son la mayor parte del correo y no cambian nada; los recordatorios de "completa tu postulación" (BruntWork,
  Pandapé) no prueban un envío.
- Los avisos de mensajes de LinkedIn ("Dulce acaba de enviarte un mensaje") no traen el texto: van a "Sin acceso".

## Paso 4. Actualizar (solo después de comprobar cómo está registrado)

Antes de cambiar algo, mira cómo está hoy (color de la carpeta, fila del Sheet). Después de cambiarlo, vuelve a leerlo
para confirmar que quedó.

1. **Color de la carpeta** de la postulación: Drive `update_file` con `folderColorRgb` (los valores de la tabla; Drive
   los ajusta a su paleta). La pestaña `Aplicadas` se actualiza sola cada hora (`sincronizarAplicadas` lee los colores);
   no la edites a mano.
2. **Postulación enviada que no tiene carpeta** (decisión del usuario, 24 oct 2026: se crea). Crea la carpeta
   `<Empresa>_<Cargo corto>` (o solo `<Empresa>`) dentro de la carpeta semanal **más reciente** de `Vacantes con IA/CV`
   (hoy "Tercera semana"; no crees carpetas semanales nuevas: las organiza el candidato). Dentro, un Google Doc `Vacante`
   con lo que se sepa: cargo, empresa, enlace del aviso si aparece, fecha de envío, a quién se envió, enlace al correo
   enviado y la HV que se adjuntó (nombre del archivo). Ponle el color según su estado. Si la empresa ya tiene carpeta
   con otro cargo, crea la nueva igual (es otro proceso).
3. **`Correos en frío`:** cambia solo las celdas Estado y "Respuesta / info" de la fila de esa dirección (o agrega en
   "Respuesta / info" la fecha y el resumen). No borres filas.
4. **Pestaña `Seguimiento`** (créala si no existe, con estos encabezados en este orden: `Fecha revisión`, `Empresa`,
   `Cargo`, `Carpeta`, `Hecho`, `Fecha del mensaje`, `Fuente`, `Estado anterior`, `Estado nuevo`, `Siguiente acción`,
   `Quién`, `Plazo`, `Notas`). Una fila por hallazgo:
   - `Fuente`: el enlace al hilo de Gmail (`viewUrl`) o al portal.
   - `Siguiente acción` y `Quién` (`candidato` o `empresa`): p. ej. "Enviar la prueba — candidato" o "Esperar respuesta
     — empresa".
   - `Plazo`: solo si la empresa lo dice (copia su fecha); si no, vacío.
   - Al final de cada revisión, una fila `REVISIÓN` en `Empresa`, con la cobertura en `Hecho` ("Cuenta laboral,
     <desde>–<hasta>, recibidos + Spam + Papelera + Enviados") y en `Notas` lo que quedó sin acceso. Es la marca desde
     donde empieza la siguiente.

## Paso 5. Cerrar con los límites

```
Seguimiento <desde> – <hasta> (cuenta laboral; recibidos, Spam, Papelera y Enviados)
Cambios: <n>
- <Empresa> — <Cargo>: <estado anterior> → <estado nuevo> (<hecho>, <fecha del mensaje>)
Pendientes tuyos: <empresa: acción y plazo de la empresa>
Falta confirmar contigo:
- <Empresa>: <pregunta concreta> (p. ej. "¿Completaste la encuesta de EPAM?")
Carpetas nuevas: <empresa — cargo, carpeta semanal>
Correos en frío: <rebotes y respuestas>
Sin acceso / no cubierto: <portales que no abrieron, días fuera de la ventana>
```

"No encontré nada más" significa "no encontré nada más en estas fuentes y fechas", no "no existe nada más": dilo así.
