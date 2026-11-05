# Operación temporal del agente UX con ChatGPT

**Esta guía únicamente adapta herramientas de ChatGPT. La lógica operativa PERMANENTE y compartida con Claude está en [POLITICA_OPERATIVA.md](POLITICA_OPERATIVA.md).**

**Actualizado:** 2026-11-05. Este documento coordina temporalmente las tareas mientras el plan de Claude no permite ejecutarlas. No sustituye ni duplica las instrucciones completas; el repositorio y los recursos del Drive laboral siguen siendo la fuente de verdad.

## Fuente de verdad por responsabilidad

| Tarea | Instrucción del repositorio |
|---|---|
| Búsqueda/verificación y CV | [ia/prompt_cv_diario.md](../ia/prompt_cv_diario.md) |
| Revisión de HV sin revisar | [ia/prompt_revision_diaria.md](../ia/prompt_revision_diaria.md) |
| Pedidos del buzón | [ia/prompt_jefe_buzon.md](../ia/prompt_jefe_buzon.md), [.claude/skills/jefe/SKILL.md](../.claude/skills/jefe/SKILL.md) |
| Seguimiento de Gmail/estados | [ia/prompt_seguimiento_diario.md](../ia/prompt_seguimiento_diario.md), [.claude/skills/seguimiento/SKILL.md](../.claude/skills/seguimiento/SKILL.md) |

Además, respetar [docs/MULTIAGENTE.md](MULTIAGENTE.md), las reglas vigentes de `Vacantes con IA/Recursos` y el procedimiento de recuperación [docs/RECUPERACION_IA.md](RECUPERACION_IA.md). En selección prevalece `CRITERIOS_BUSQUEDA`; al redactar, `LECCIONES_HV` prevalece cuando contradiga guías anteriores.

## Ejecución con ahorro de tokens

**Turno de mañana (06:03, hora Bogotá):** usar **una sola ejecución de ChatGPT** para la fase de verificación/CV y después, solo cuando haya trabajo, revisión de HV y pedidos del buzón. Empezar por índices y estados: `Agentes`, `Hoja 1`, `Por enviar` y contenido/nombres de archivos de `Sin revisar` (hoy y dos días anteriores). Leer documentos extensos de `Recursos` una sola vez por corrida y solo para las fases que lo requieran; no imprimir en la respuesta sus datos personales. Nunca abrir un subagente por vacante. No llamar búsquedas pagadas desde la fase de CV. Procesar primero las ofertas más relevantes cuyo anuncio original, fecha y elegibilidad estén verificados. **Máximo 15 HV nuevas por día: es techo, no cuota a cumplir**. No rehacer archivos existentes ni forzar redacción si ninguna oferta sirve.

**Revisión condicional:** si existen HV/CV sin `Revision.txt`, seguir `ia/prompt_revision_diaria.md` sin tocar HV enviadas. Cuando no se pueda comprobar el PDF y el límite de dos páginas, indicar **revisión visual pendiente**, nunca afirmar aprobación final. Si el jefe sigue en trabajo real registrado, no ejecutar revisión duplicada.

**Buzón condicional:** la fila más reciente de cada Id en `Agentes` determina si el pedido sigue pendiente. Si no hay pedidos, no cargar todo el contexto del Cartero. Máximo tres pedidos por corrida. Una solicitud explícita de `crear correos` significa **crear hasta tres borradores** personalizados con destinatarios y fuentes verificados y PDF de la HV, nunca enviarlos. Si existen más de diez borradores por enviar, frenar lotes **autónomos**; un pedido explícito de Oscar permite una tanda de borradores. Si Gmail no ofrece permiso de borradores, entregar el texto preparado y marcar ejecución **parcial**, sin inventar borradores creados.

**Turno de seguimiento (18:13, hora Bogotá):** una ejecución **separada y acotada** de Gmail solo lectura + Drive/Sheets según `ia/prompt_seguimiento_diario.md`. No volver a cargar `CONTEXTO_CV`, guía de HV ni borradores de correos. La búsqueda por fechas debe incluir todas las páginas de Recibidos (incluidas Promociones/Social), Spam, Papelera y Enviados. Si no se pudo cubrir todo, dejar cobertura **parcial**, no agregar la fila final `REVISIÓN` como si fuera completa.

## Límites de permisos y seguridad

- En Gmail de **seguimiento**, únicamente leer. Nunca enviar, responder, reenviar, marcar como leído, archivar, borrar, poner etiquetas ni mover mensajes. Comprobar cuenta laboral antes de empezar.
- En Gmail del **Cartero**, solo crear/editar **borradores** si hay un pedido explícito y permisos compatibles. Nunca enviar ni habilitar envíos programados a partir de esta tarea. No usar LinkedIn personal.
- Los correos no son necesariamente una postulación enviada. El estado de `Correos en frío` solo cambia cuando hay evidencia real.
- Colores: carpeta roja `#f83a22` rechazo, verde `#16a765` avance, amarillo `#ffad46` envío sin respuesta. Solo cambiar con evidencia y si el conector expone modificación de `folderColorRgb`. Si ese permiso o acción no existe, **no fingir el cambio**: registrar el color pendiente en `Seguimiento` y comunicarlo. `Aplicadas` la sincroniza Apps Script, no modificarla manualmente.
- No enviar postulaciones ni correos en nombre de Oscar; no gastar SerpAPI/Apify; no modificar activadores, permisos ni código en ejecuciones programadas; no escribir CV, emails, datos personales ni secretos en el repositorio **público**.
- Los cambios de código del proyecto se realizan por PR y pruebas, fuera de estas tareas autónomas.
- Una tarea programada activa no garantiza acceso a conectores: comprobarlo en cada ejecución, informar fallos con precisión y **no marcar como hecho un trabajo que no ocurrió**.

## Adaptación de herramientas

Las instrucciones para Claude mencionan `Bash`, `curl`, `WebFetch`, `PushNotification` y agentes delegados. ChatGPT **no debe simular** esas herramientas; leer los archivos por el conector GitHub, usar las acciones conectadas que estén disponibles y ejecutar secuencialmente cuando no haya subagentes. No depender de la rama de prueba antigua `claude/funny-gates-0lgwpf` ni de comprobar frases literales que solo servían para detectar el despliegue inicial. Si `main` no está accesible y no hay reglas fiables, registrar el bloqueo.

## Criterio de resultado

Para CV: `Detalle_Vacante` y `Verificacion.txt` válido, `CV_IA.json` solo si corresponde, HV de Google Docs, `Revision.txt`, y Sheet actualizado/consistente. Para correo: borrador en Gmail **comprobado** con PDF; nunca enviado. Para seguimiento: evidencia por empresa y cargo, estados previos/nuevos, enlaces a hilos, pendientes con plazo y fila `REVISIÓN` solo tras cobertura completa. Para oficina: bitácora de trabajo real; el reloj no constituye evidencia de ejecución.

## Al volver Claude

Desactivar las automatizaciones equivalentes de ChatGPT **antes de reactivar las de Claude**, o se duplicarán verificaciones, hojas de vida y borradores. Mantener este documento como protocolo temporal; no añadir cuatro copias de los prompts largos a las tareas programadas.
