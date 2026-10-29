# Base Antártica: el equipo de agentes

Decisión del usuario (27 oct 2026). Oscar le pide algo a un **jefe**. El jefe reparte el trabajo entre agentes especializados, revisa lo que entregan y le responde. Todo corre con el plan de Claude de Oscar: sin API pagada, sin servidor propio.

Lo que ya existía se reutiliza sin cambios:
- Las skills de `.claude/skills/`.
- Los archivos-contrato de cada vacante (`Detalle_Vacante`, `Verificacion.txt`, `CV_IA.json`, `Revision.txt`, `Correos.json`).
- Apps Script, GitHub Actions y las tareas programadas.

Lo nuevo:
1. Los agentes, con su propio archivo en `.claude/agents/`.
2. El jefe y su método (skill `jefe`).
3. La pestaña **`Agentes`** del registro, por donde se hablan.
4. La **oficina de pingüinos** (`apps_script/oficina.html`), donde Oscar los ve trabajar y les deja pedidos.

## 1. Quién es quién

| Id | Pingüino | Qué hace | Skill | Recibe | Entrega |
|---|---|---|---|---|---|
| `jefe` | Emperador | Entiende el pedido, lo divide, delega, revisa y responde | `jefe` | Un pedido de Oscar | El resultado del pedido y su resumen |
| `vigia` | Vigía | Trae una vacante puntual (enlace o búsqueda) al formato del agente | — (este documento, §4) | Enlace o criterio | `Sin revisar/<hoy>/<Empresa>/Detalle_Vacante` |
| `inspector` | Inspector | Verifica que la vacante sirva | `verificar-vacante` | Carpeta con `Detalle_Vacante` | `Verificacion.txt` (VEREDICTO/MOTIVO) |
| `escriba` | Escriba | Escribe la HV para esa vacante o empresa | `crear-hv` | Carpeta verificada LISTA/MENOR_PRIORIDAD | `CV_IA.json`, que Apps Script arma, o la HV directa en una conversación |
| `editor` | Editor | Revisa la HV antes de enviarla | `revisar-hv` | Carpeta con HV | `Revision.txt` (LISTA_PARA_ENVIAR/REVISAR) |
| `cartero` | Cartero | Prepara correos en frío y de postulación | `correo-en-frio` | Empresa | `Correos en frío/<Empresa>/` con HV y `Correos.json`; Apps Script crea los borradores |
| `exploradora` | Exploradora | Investiga empresas que contratan diseño | `investigar-empresas` | Criterio (ciudad, sector) | Filas en `Empresas objetivo` |
| `radio` | Radio | Lee el Gmail laboral y reconstruye estados | `seguimiento` | Ventana de fechas | Colores de carpetas, `Seguimiento`, estados de `Correos en frío` |
| `constructor` | Constructor | Crea o cambia skills, agentes y código | `skill-creator` / código | Especificación aprobada por Oscar | Rama + PR con pruebas en verde |
| `maquina` | Máquina de hielo | Apps Script: busca a las 5:00, arma HV cada 10 min, sincroniza cada hora | — | Horario | Carpetas, HV, borradores, pestañas |
| `trineo` | Trineo | GitHub Actions: Indeed, LinkedIn y elempleo a las 4:17 y 21:17 | — | Horario | `jobspy.json` |

La máquina y el trineo no son IA: corren solos con su horario y la oficina los muestra para que se vea el día completo.

## 2. Qué puede hacer el jefe (acordado con Oscar el 27 oct 2026)

- **Sin preguntar:**
  - verificar vacantes;
  - crear y revisar HV;
  - investigar empresas;
  - preparar borradores de correo (siempre borradores);
  - traer una vacante puntual;
  - escribir en la pestaña `Agentes`.
- **Pregunta antes:**
  - crear una skill o un agente nuevos;
  - cambiar código, horarios o tareas programadas;
  - hacer cualquier cosa que gaste créditos de SerpAPI.
- **Nunca, ni él ni ningún agente:**
  - enviar correos o postulaciones;
  - fusionar PRs;
  - usar la sesión de LinkedIn de Oscar;
  - borrar archivos que no haya creado él;
  - escribir datos personales en el repositorio (es público).

## 3. Cómo se hablan: la pestaña `Agentes`

Es una bitácora en la que solo se agregan filas; nadie edita la fila de otro.

| Columna | Qué va |
|---|---|
| Fecha y hora | `yyyy-MM-dd HH:mm`, hora de Bogotá |
| De | Id del agente, o `oscar` |
| Para | Id del agente, `oscar` o `todos` |
| Tipo | `pedido` · `encargo` · `avance` · `resultado` · `pregunta` · `aviso` |
| Asunto | Máximo 80 caracteres: «HV para Nubank — Product Designer» |
| Estado | `pendiente` · `en curso` · `hecho` · `bloqueado` · `cancelado` |
| Detalle | Máximo 300 caracteres: qué se hizo, qué falta, por qué se bloqueó |
| Enlace | Carpeta, HV, PR o hilo |
| Id | Id del pedido: `P-<yyyyMMdd>-<HHmm>-<2 letras>`. Todas las filas de un pedido comparten el mismo Id |

**Reglas:**
- El estado de un pedido es el de su **fila más reciente** con ese Id (`agentThreads` en `apps_script/Agentes.gs`).
- Cada agente escribe **una fila al empezar** (`en curso`) y **una al terminar** (`hecho` o `bloqueado`), con el Id del pedido que lo originó.
  - Las tareas programadas usan el Id `DIARIO-<yyyyMMdd>`.
- Si a la escritura en la pestaña le falla algo, el agente sigue con su trabajo. La bitácora nunca detiene un trabajo.
- Un `pregunta` es para Oscar: la oficina lo muestra con un «!» y el jefe lo repite en su resumen.

## 4. El método del jefe (skill `jefe`)

1. **Leer el pedido** (del chat o del buzón: filas `pedido` con estado `pendiente`) y anotarlo con su Id.
2. **Plan corto:** qué agentes, en qué orden y qué recibe cada uno. Ejemplo: enlace → vigía → inspector → si es LISTA → escriba → editor → cartero si la vacante trae correo.
3. **Delegar:**
   - En una sesión con el repositorio (la app de Claude abierta en `ux_job_agent`), con la herramienta Agent y el `subagent_type` del agente (`.claude/agents/<id>.md`).
   - Donde no esté el repositorio (tareas programadas), con un agente general que recibe como instrucciones el archivo del agente, descargado de `raw.githubusercontent.com/.../main/.claude/agents/<id>.md`.
   - Los trabajos independientes van en paralelo, por ejemplo verificar tres vacantes. Los que dependen uno del otro van en orden.
4. **Revisar contra el contrato:**
   - ¿Existe el archivo que tocaba?
   - ¿El veredicto tiene sus dos primeras líneas?
   - ¿La HV tiene 2 páginas o menos?

   Un encargo que falla se repite una vez con el error concreto. Si vuelve a fallar, se registra `bloqueado` y una `pregunta` para Oscar.
5. **Si ningún agente sirve:** el jefe propone a Oscar un agente o una skill nuevos (qué haría, qué recibe y qué entrega). Solo con su sí, el constructor lo crea en una rama y abre un PR.
6. **Cerrar:** una fila `resultado` `hecho` con el Id del pedido y un resumen corto para Oscar: qué se hizo, enlaces y qué decide él.

### Traer una vacante puntual (vigía)

1. Abre el enlace (WebFetch).
2. Crea la carpeta `Vacantes con IA/Sin revisar/<hoy>/<Empresa>`. Si ese día ya existe una carpeta de esa empresa, usa `<Empresa>_<detalle corto del cargo>`.
3. Dentro, crea un Google Doc `Detalle_Vacante` con el mismo formato que escribe Apps Script (`createVacancyDetailDoc_`):
   - Primera línea: el cargo.
   - Después estas líneas: `Empresa:`, `Ubicación:`, `Link:`, `Publicada:`, `Nivel:`, `Match Score:`, `Idioma: ES|EN`, `Correo de contacto:`, `Fuente: Pedido de Oscar`.
   - Al final, «Descripción completa» y el texto del aviso.
4. No escribe en `Hoja 1`: el registro es de Apps Script, y `generarCVsDesdeIA` arma la HV aunque la vacante no tenga fila.

## 5. El buzón y las tareas programadas

- **Desde el chat:** Oscar abre la app de Claude en el repositorio y escribe «/jefe …» o simplemente lo que necesita. El jefe responde en esa misma conversación.
- **Desde la oficina, con el buzón:** Oscar escribe el pedido y la página lo guarda en `Agentes` como `pedido` `pendiente`.
  - Lo hace con la acción `pedido` de `Acciones.gs`, con la misma clave de escritura (`&e=`) que el juego.
  - Lo toma la próxima vez que el jefe trabaje: cuando Oscar abre una conversación con él, o en la tarea programada «Jefe (buzón)».
  - Esa tarea se creó **apagada**. Para encenderla, Oscar le agrega los conectores (Drive, Docs, Sheets y Gmail) desde la app y la activa.
  - Su prompt está en `ia/prompt_jefe_buzon.md`.
- **Las tareas diarias** («CV con IA diario», «Revisión HV diaria», «Seguimiento diario») escriben su fila de inicio y de fin en `Agentes`. Así la oficina muestra al inspector, al escriba, al editor y a la radio trabajando de verdad.
- **Inspectores en paralelo (29 oct 2026, decisión de Oscar):** hasta ese día cada tarea diaria era una sola IA que hacía los papeles en orden. Ese día la tanda vio 5 de 23 vacantes. Desde entonces, en «CV con IA diario», si hay más de 4 vacantes por verificar, la sesión hace de jefe:
  - las reparte en grupos de hasta 4;
  - lanza un subagente inspector por grupo, todos a la vez, con el texto de `.claude/agents/inspector.md` y de la skill;
  - comprueba que cada carpeta quede con su `Verificacion.txt`.

  El escriba sigue siendo uno solo, porque escribe como máximo 4 HV por tanda.
- **Dudosas con sí o no (29 oct 2026):**
  - La corrida de cada hora lista las dudosas de los últimos días en la pestaña `Dudosas`, y la oficina las pone de primeras en «Tu tanda de hoy» con los botones «Sí, hazle HV» y «No».
  - Al terminar la tanda, si quedan dudosas, la sesión le manda a Oscar una notificación (`PushNotification`); la revisión hace lo mismo con las HV listas.
  - La acción `dudosa` de `Acciones.gs` reescribe el `Verificacion.txt`. Con «sí», la vacante vuelve a su día y la siguiente tanda le escribe la HV; con «no», se va a la papelera.

## 6. La oficina (`apps_script/oficina.html`)

- Va **separada del juego**, con estética antártica: hielo, iglús, aurora y pingüinos redondos de oficina.
- Se sirve por GitHub Pages con el mismo enlace del juego, cambiando el nombre del archivo: `…/apps_script/oficina.html#api=<id>&k=<clave>[&e=<clave de escritura>]`.
- Se puede instalar en el celular («Agregar a la pantalla de inicio») gracias a `manifest` y service worker.
- **Lee el mismo JSON del tablero** (`buildDashboardModel` → campo `agentes`, calculado por `buildAgentsModel` en `Agentes.gs`):
  - el estado de cada agente, sacado de las pestañas que ya existen (`Fuentes`, `Hoja 1`, `Por enviar`, `Correos en frío`, `Seguimiento`, `Empresas objetivo`) y de la pestaña `Agentes`;
  - los últimos mensajes;
  - los pedidos abiertos.
- **Sin WebSockets:** pide datos al abrir y cada 2 minutos. «Actualizar» pide datos frescos. Entre una y otra, el reloj anima a quien tiene turno según el ritmo del día (`RITMO` en la página).
- Toda la lógica de la página está en `<script id="motor-oficina">`, con pruebas en `tests/oficina.test.js`. Los datos se pintan solo con `textContent`.
- `#demo` muestra datos de ejemplo inventados, para ver la oficina sin la clave.
- **Pantallas (decisión de Oscar, 28 oct 2026):** la oficina es «qué hago hoy», el juego es la motivación y el tablero es para el coach. La página privada de claude.ai se retiró el 28 oct 2026.
- **Tu tanda de hoy** (28 oct 2026), primera tarjeta de la oficina (`tandaDeHoy`, `resumenTanda`):
  - hasta 5 postulaciones de `Por enviar`, menos las que ya envió hoy (primero las que el editor dejó listas; entre iguales, la más vieja). Cada una con «Postular» (la vacante), «PDF» (descarga al día desde el Doc), «HV», «Copiar mensaje» (`_correo_cuerpo`) y «Ya la envié»;
  - hasta 3 empresas con borradores de correo en frío, con «Gmail» y «Ya los envié» (elige las direcciones);
  - los borradores de seguimiento, con «Gmail» y «Ya lo envié» (acción `seguimiento`);
  - los minutos estimados («3 postulaciones y 2 empresas con correos · unos 15 min»), el avance del día y un aviso si hay más de 10 borradores de correos en frío sin enviar.
  - Las acciones usan las mismas del juego (`Acciones.gs`), con confirmación y la clave de escritura.
- **Producir menos (28 oct 2026):** el cuello de botella es que Oscar envíe, no que el equipo escriba.
  - El escriba escribe máximo 4 HV por tanda (6 a 8 al día), y 2 si quedan 10 o más HV sin enviar de días anteriores.
  - Con más de 10 borradores de correos en frío sin enviar, el cartero no prepara lotes nuevos.
- **Vista 3D, estilo peluche (28 oct 2026, pedido de Oscar: «tipo Miniso»):** sombreado de caricatura en 3 tonos, contorno suave, colores pastel, cuerpo de huevo, ojos grandes con brillo y mejillas rosadas. La vista plana usa el mismo estilo.
- **Rutinas con tiempo real:** cada especialista tiene un puesto de trabajo además de su escritorio (`PUESTOS_TRABAJO_3D`):
  - el tablero de pedidos del jefe, la torre del vigía, el archivo del inspector, el estante del escriba, el corcho del editor, el buzón del cartero, el mapa de la exploradora, la antena de la radio y el banco del constructor;
  - mientras trabaja de verdad, va y viene entre los dos;
  - en el guion, después de cada encargo viene el trabajo de quien lo recibe (`conTrabajo`), con los minutos reales hasta su siguiente mensaje del mismo pedido, comprimidos (1 min = 0,4 s, entre 4 y 20 s). El globo dice cuánto tardó, con una barrita de avance.
- **Ambientación:** plaza con letrero, caminos con faroles (brillan de noche), agujero de pesca, muñeco de nieve, montículos y cristales en la orilla, cinta de la máquina con cubos de hielo y huellas del trineo.

## 7. Próximas fases (con visto bueno de Oscar)

1. El buzón encendido como tarea programada, y su horario.
2. Conversación en vivo: el jefe responde en la oficina, en un hilo por pedido.
3. Más agentes cuando hagan falta. Siempre por el paso 5 del método. El primero será el **entrenador de entrevistas**, cuando Oscar comparta sus documentos de apoyo (decisión del 28 oct 2026).
