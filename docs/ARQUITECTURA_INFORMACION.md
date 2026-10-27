# Arquitectura de la información — búsqueda de empleo UX/UI

Fotografía del sistema al 2026-10-25, escrita para diseñar encima de ella una experiencia nueva (el usuario quiere un
**tipo de juego**, en lugar del tablero). Aquí está qué datos existen, dónde viven, quién los escribe, cada cuánto cambian
y cómo leerlos. No hay datos personales: los nombres de empresas, correos y HV viven solo en Drive, Sheets y Gmail.

## 1. Actores

| Actor | Qué hace | Cómo entra |
|---|---|---|
| Oscar (usuario) | Revisa vacantes y HV, envía postulaciones y correos, mueve carpetas, colorea su estado | Drive, Gmail, el Sheet y el tablero |
| Coach | Mira el avance; no edita nada | Enlace con clave (sección 6) |
| Apps Script (automático) | Busca vacantes, arma HV, crea borradores, sincroniza el Sheet | Activadores en la cuenta de Google |
| Sesiones de Claude programadas | Verifican vacantes, redactan HV, las revisan y hacen el seguimiento del correo | Tareas programadas con conectores |

Regla fija: **nada se envía solo**. Todo correo queda como borrador y lo envía Oscar.

## 2. Entidades y su ciclo de vida

```
VACANTE
  encontrada (Apps Script 7:00) ─► verificada por la IA ─┬─► DESCARTAR (papelera)
                                                         ├─► DUDOSA (espera sí/no de Oscar)
                                                         └─► LISTA / MENOR_PRIORIDAD ─► HV armada ─► HV revisada
  ─► POR ENVIAR (carpeta en Sin revisar/<fecha>)
  ─► ENVIADA (Oscar mueve la carpeta a CV/<semana>)
  ─► Sin respuesta (amarillo) ─► En proceso: entrevista / prueba (verde) ─► Rechazada (rojo)
                                                               (no hay estado "contratado" todavía)

CORREO EN FRÍO (una fila por dirección)
  empresa investigada ─► HV + Correos.json ─► borrador en Gmail ─► enviado por Oscar
  ─► entregado │ rebotado ─► respondió

EMPRESA OBJETIVO
  investigada (con 3 correos y fuente) ─► elegida para un lote ─► contactada
```

El **color de la carpeta** en `CV/` es la fuente de verdad del estado de una postulación (rojo, verde, amarillo).
Lo pone Oscar o la skill `seguimiento` cuando encuentra evidencia en Gmail.

## 3. Dónde vive cada cosa

### Google Sheet "Vacantes UX - Registro"

| Pestaña | Una fila es | Columnas | La escribe | Frecuencia |
|---|---|---|---|---|
| `Hoja 1` | una vacante encontrada | Fecha, Empresa, Cargo, Link, Match Score, Estado | Apps Script | diario 7:00 y cada 10 min |
| `Aplicadas` | una postulación enviada | Grupo (carpeta), Empresa, Cargo, Estado, Color, Carpeta, Creada, Semana (carpeta) | `sincronizarAplicadas` (lee las carpetas de `CV/`) | cada hora |
| `Por enviar` | una HV lista sin enviar | Fecha, Empresa, Cargo, Verificación, Revisión, Carpeta, HV | `sincronizarAplicadas` | cada hora |
| `Correos en frío` | una dirección contactada | Empresa, Destinatario(s), Fecha y hora envío, Asunto, CV usado, Estado, Respuesta / info, Notas | Apps Script + skill `seguimiento` | cada hora y 18:13 |
| `Seguimiento` | un hallazgo en Gmail | Fecha revisión, Empresa, Cargo, Carpeta, Hecho, Fecha del mensaje, Fuente, Estado anterior, Estado nuevo, Siguiente acción | skill `seguimiento` | diario 18:13 |
| `Empresas objetivo` | una empresa investigada | Fecha, Empresa, Ámbito, Ciudad / país, Tipo, Sector, Por qué encaja (fuente), Web, Página de empleo, Correos (fuente, fecha), Estado, Notas | skill `investigar-empresas` | a pedido |

Valores de `Estado` que aparecen:
- `Hoja 1`: Esperando CV (IA), Pendiente, CV rechazado (validación), Descartada: <motivo>, Dudosa: <motivo>, Manual (publicación).
- `Aplicadas`: Rechazada, En proceso, Aplicada sin respuesta, Aplicada, Preparada sin enviar.
- `Correos en frío`: Borrador preparado no enviado, Enviado sin rebote, Rebotado, Rebotado parcialmente, Respondió.

### Google Drive, carpeta "Vacantes con IA"

```
Vacantes con IA/
├── Sin revisar/<AAAA-MM-DD>/      lo nuevo de cada mañana
│   ├── <Empresa>/                 Detalle_Vacante, Verificacion.txt, CV_IA.json, HV_… (Doc), Revision.txt
│   ├── Dudosas/                   vacantes que esperan el sí/no de Oscar
│   └── Posts/                     publicaciones de LinkedIn del día (se procesan a mano)
├── CV/<semana>/<Empresa[_Cargo]>/ lo enviado; el color de la carpeta = estado
├── Antiguas/                      postulaciones viejas (cuentan como una semana más)
├── Correos en frío/<grupo>/<Empresa>/   HV, Correos.json, Borradores.txt, Revision.txt
└── Recursos/                      GUIA_CV, CONTEXTO_CV, REGLAS_CV, MASTER_TEMPLATE, CRITERIOS_BUSQUEDA… (privados)
```

### Gmail
Borradores de postulación y de correos en frío (nunca se envían solos), y respuestas de empresas, que lee `seguimiento`.

## 4. Ritmo del día (hora de Bogotá)

| Hora | Qué pasa | Resultado visible |
|---|---|---|
| 6:45–7:15 | `ejecutarPipeline` busca y filtra | hasta 20 carpetas nuevas en `Sin revisar/<hoy>` |
| 7:33 | IA "CV con IA diario" | `Verificacion.txt` y `CV_IA.json` en las 10 mejores |
| cada 10 min (7–23 h) | `generarCVsDesdeIA` | HV armadas; descartadas a la papelera, dudosas apartadas |
| 8:53 (11:53 respaldo) | IA "Revisión HV diaria" | `Revision.txt`: LISTA_PARA_ENVIAR o REVISAR |
| cada hora | `sincronizarAplicadas` + correos en frío | pestañas `Aplicadas` y `Por enviar` al día; caché del tablero renovada |
| a pedido | botón «Actualizar» del juego o del tablero (`&sync=1`) | lo mismo que la sincronización de cada hora, sin los correos en frío |
| 18:13 | IA "Seguimiento diario" | colores de carpetas, `Correos en frío` y `Seguimiento` actualizados |

Meta del usuario: **50 postulaciones por semana**. La semana es la carpeta de `CV/` (`Primera semana nueva`, `Segunda
semana`…), no la semana del calendario.

## 5. Contrato de datos listo para usar (`buildDashboardModel`)

Un solo JSON con todo lo calculado (`apps_script/Dashboard.gs`, con pruebas). Cualquier interfaz nueva, incluido el
juego, puede partir de aquí:

```js
{
  generado: "2026-10-25T11:05", hoy: "2026-10-25", meta: 50, submeta: 30,   // submeta: la que gana la semana (2026-10-27)
  postulaciones: {
    total, rechazada, proceso, sinRespuesta, aplicada, preparadas, tasaRespuesta,   // tasa en %
    semanas: [{ semana, desde, total, rechazada, proceso, sinRespuesta, aplicada }], // en orden; incluye las carpetas
             // de semana de CV/ todavía vacías (total 0, desde = día en que se creó la carpeta)
    lista:   [{ empresa, cargo, estado, clave, semana, creada, carpeta, estadoFecha }] // clave: rechazada|proceso|preparada|sinRespuesta|aplicada
             // creada: día de creación de la carpeta en hora de Bogotá (≈ fecha de envío); estadoFecha: día del cambio a
             // proceso/rechazada según Seguimiento, vacío si no hay hallazgo
  },
  correos: { enviados, entregados, rebotados, borradores, empresasContactadas, empresasRespondieron,
             lista: [{ empresa, para, fecha, asunto, hv, estado, respuesta, notas,
                       clave, dia, entregadas, rebotadas }] },  // clave: enviado|respondio|borrador; cada dirección cuenta en su primera fila
  vacantes: { ultimos14, porDia: [{ dia, n }] },                                     // 14 días
  porEnviar: [{ fecha, empresa, cargo, verificacion, revision, carpeta, hv, vacante }],   // vacante: enlace de Hoja 1 (2026-10-27)
  seguimiento: [{ fecha, empresa, cargo, hecho, fechaMensaje, antes, ahora, siguiente }], // últimos 40, recientes primero
  historial:   [ …mismos campos ],                                                      // completo, en orden cronológico (para el juego)
  objetivo: { total, porEstado: { <estado>: n } }
}
```

Valores al 2026-10-25, como referencia de escala: 89 postulaciones en 4 semanas (13, 23, 24 y 29), 20 respondieron
(22,5 %), 7 en proceso, 33 correos en frío (28 entregados, 5 rebotes), 118 vacantes encontradas en 14 días, 7 por enviar.

## 6. Cómo se sirve (ya funciona)

- **Datos:** la app web de Apps Script con `?formato=json&k=<clave>` devuelve el JSON de la sección 5. El `doGet` del
  Cargador lo saca de una caché de ~1 h (unos 1,1 s); `&fresco=1` lo recalcula (unos 3,6 s) y `&fresco=1&sync=1`
  (2026-10-26) primero vuelve a leer Drive (`sincronizarRegistro_`: pestañas `Aplicadas` y `Por enviar`), para que el
  botón «Actualizar» muestre las carpetas movidas en ese momento. El juego lo pide solo si la caché tiene más de 15 min.
- **Página:** `apps_script/dashboard.html` servida por **GitHub Pages** desde la rama `deploy`. La lee el `fetch` sin
  cookies, así que funciona con varias cuentas de Google abiertas. Enlace:
  `https://oscargarciaux-maker.github.io/ux_job_agent/apps_script/<página>.html#api=<id de la implementación>&k=<clave>`.
- **Experiencia nueva:** puede ser otro `.html` en `apps_script/` (llega a Pages con cada push a `main` con las pruebas
  en verde) que reutilice el mismo endpoint. No hace falta tocar Apps Script para leer los datos.
- **Recordar cosas del jugador** (logros vistos, nivel, preferencias): `localStorage` del navegador por ahora, o una
  pestaña nueva del Sheet si debe compartirse entre dispositivos (requiere un `doPost` o escribir desde Apps Script).

## 7. Señales disponibles para mecánicas de juego

| Señal (evento) | Fuente | ¿Con fecha? | Disponible hoy |
|---|---|---|---|
| Vacantes nuevas encontradas | `Hoja 1` (Fecha) | día | sí (`vacantes.porDia`) |
| HV lista para enviar | `Por enviar` (Revisión) | día | sí |
| Postulación enviada | `Aplicadas` (Creada, Semana) | día | sí (por semana); por día falta exponerlo |
| Respuesta, entrevista o prueba | `Aplicadas` (Estado) + `Seguimiento` (Fecha del mensaje) | día | sí |
| Rechazo | `Aplicadas` (Estado = Rechazada) | día del hallazgo | sí |
| Correo en frío enviado, entregado o rebotado | `Correos en frío` | fecha y hora | sí |
| Empresa respondió a un correo en frío | `Correos en frío` (Estado) | día | sí |
| Acción pendiente con plazo | `Seguimiento` (Siguiente acción) | texto libre | sí, sin plazo estructurado |
| Racha de días con envíos | `Aplicadas` (Creada) | día | sí (la calcula el motor del juego) |
| Meta semanal (50) | `Config.gs` | — | sí (`meta`) |

Desde el 2026-10-27 el juego también **registra** lo que Oscar hizo (`apps_script/Acciones.gs`: «Ya la envié», «Descartar»,
«Ya lo hice», «Me rechazaron», «Tengo prueba o entrevista»), solo con la clave de escritura de su enlace. Lo demás es de
**lectura**: el juego puede premiar lo que pasa en Drive, Gmail y el Sheet, pero no debe enviar nada ni
cambiar el estado de una postulación (regla de supervisión humana). Si una mecánica necesita que Oscar marque algo
("hice la prueba"), hay que agregar escritura explícita y avisarlo.

## 8. Restricciones que el diseño debe respetar

- Repositorio **público**: sin nombres de personas, correos, IDs, la clave ni el id de la implementación.
- El coach ve todo, incluidos empresas y correos (decisión del usuario), solo con el enlace con clave.
- Celular primero, WCAG 2.2 AA, movimiento reducido respetado (skill `diseno-ux`).
- Nada de librerías desde CDNs no permitidos en Apps Script; en GitHub Pages sí se pueden cargar.
- Cambios en `Cargador.gs` o en el manifiesto obligan a Oscar a re-pegarlos.

## 9. Lo que ya se probó en diseño (para no repetirlo)

En el Figma del usuario, archivo "Tablero búsqueda UX — rediseño":
- **v1:** tablero de métricas con tokens claro/oscuro y componentes. Correcto pero plano.
- **v2 · Bento:** estilo Mobbin con una mascota carpeta ("Folio") y un panel negro al final. **Rechazado** (2026-10-25).
- Dirección nueva del usuario: **El juego laboral** (`docs/JUEGO_LABORAL.md`), construido en `apps_script/juego.html` (v1, 2026-10-25).
