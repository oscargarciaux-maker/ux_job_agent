# Política operativa permanente — agente UX/UI

**Vigente desde el 5 de noviembre de 2026. Aplica a Claude, ChatGPT y cualquier proveedor futuro.** No es un plan de contingencia. Esta política manda en **orquestación, permisos, costes y registro**; las skills de cada rol y los documentos privados de Drive siguen mandando sobre sus criterios específicos.

## Fuente de verdad y precedencia
1. Guardrails de seguridad y autorizaciones explícitas del candidato.
2. Esta política para eficiencia, fases, permisos y evidencia de ejecución.
3. La skill/prompt de la tarea y `docs/MULTIAGENTE.md`.
4. Para cargos y requisitos, `Vacantes con IA/Recursos/CRITERIOS_BUSQUEDA`; para CV, `LECCIONES_HV`, y luego `GUIA_CV` / `REGLAS_CV` / `MASTER_TEMPLATE`. Nunca publicar contenido personal de esos documentos en GitHub.

## Arquitectura por responsabilidades (no por empresa)
- **Máquina**: Apps Script; captación, filtros deterministas, deduplicación, registro, conversiones de `CV_IA.json` y borradores; no invocar modelos pagados.
- **Jefe**: coordina, verifica pendientes, recupera tareas interrumpidas y evita doble trabajo. Un solo **inspector por tanda**, un solo **escriba por tanda**, un solo **editor por tanda** y, si existe pedido expreso de correos, un solo **cartero por tanda**. Si el proveedor no tiene subagentes, ejecuta las mismas funciones secuencialmente.
- **Radio**: solo seguimiento de Gmail en cuenta laboral, con cobertura por fecha y bitácora; no redacta HV. En Gmail **solo lectura**.
- El buzón se procesa solo si hay pedidos reales: máximo **3 pedidos** por corrida, por Id desde la fila más reciente en `Agentes`. El reloj **nunca demuestra que un agente trabajó**; la bitácora y los archivos sí.

## Presupuesto de trabajo: priorizar valor, no volumen
1. Al comenzar, leer **índices/estados**, no documentos extensos: últimos eventos de `Agentes`, `Hoja 1`, `Por enviar`, nombres de archivos existentes en las carpetas de hoy y hasta 2 días atrás.
2. No hacer ninguna llamada de modelo para una vacante duplicada, descartada, vencida, sin elegibilidad o con CV ya generado. Verificar anuncio original y criterios antes de redactar; **reutilizar una sola lectura** de cada recurso compartido por tanda.
3. `15 HV/día` es un **máximo**, no una cuota. Si no hay vacantes reales, no redactar para “llenar el objetivo”. **Decisión de Oscar (10 nov 2026):** aunque haya más de 10 HV sin enviar, **no se baja el ritmo** (él envía la tanda); se siguen priorizando las mejores y no se hacen HV de avisos cerrados (columna `Aviso` de `Por enviar`).
4. No abrir un agente nuevo por vacante/empresa; no pegar el prompt completo a todos los agentes; pasar instrucciones de rol + casos pendientes y referencias. No duplicar verificaciones en sesiones de recuperación ni repetir trabajos solo porque un activador se ejecutó otra vez.
5. SerpAPI/Apify: no invocar ni aumentar presupuesto desde la fase de IA; nuevas consultas pagadas y cambios de horarios/código requieren autorización. Preferir fuentes originales, abiertas y aplicables desde Colombia/LATAM.
6. Si un servicio no responde, registrar `bloqueado` o `parcial` con el paso exacto que falta. No inventar archivos, correos, colores, estados ni ejecuciones. Revisar resultados en el sistema de destino antes de declarar `hecho`.

## Calidad y separación de permisos
- `Verificacion.txt` válido precede a `CV_IA.json`; solo una vacante apta recibe CV. `CV_IA.json` cumple el contrato del Apps Script y mapa de evidencia. `Revision.txt` refleja revisión sustantiva y visual; si no se pudo comprobar el PDF, **no marcar `LISTA_PARA_ENVIAR`**.
- **Cartero:** solo con pedido explícito puede crear/actualizar **borradores Gmail**, hasta **3 empresas** por ejecución, con asunto, destinatario y fuente verificados, mensaje personalizado y PDF de HV; nunca enviar. Si hay más de 10 borradores pendientes, detener tandas autónomas, no las solicitudes explícitas. Respetar la excepción de envíos programados individuales en `EnvioProgramado.gs`: estas tareas no la ejecutan ni la amplían.
- **Radio:** Gmail *exclusivamente lectura*; revisar Recibidos (sin excluir Promociones/Social), Spam, Papelera y Enviados con todas las páginas, por fecha de Bogotá y por empresa+cargo; no cambiar estado sin evidencia y no completar la fila final `REVISIÓN` si quedaron fuentes sin consultar.
- **Colores de CV:** rojo `#f83a22` = rechazo explícito; verde `#16a765` = avance real; amarillo `#ffad46` = aplicación demostrada sin respuesta. Acuse de recibo no cambia estado; silencio no es rechazo. Si el proveedor no puede editar `folderColorRgb`, registrar **`COLOR PENDIENTE`** en `Notas`, la **URL completa `https://drive.google.com/drive/folders/<id>` en la columna `Carpeta`**, `Estado nuevo` reconocible (Rechazada / En proceso / Aplicada, sin respuesta) y enlace a evidencia en `Fuente`; sin esos datos el color no se puede automatizar. Apps Script puede resolver la cola de colores pendientes solo si valida ubicación, estado y última evidencia; no alterar carpetas de `Sin revisar`. `Aplicadas` lo actualiza Apps Script.
- No usar la sesión autenticada de LinkedIn, no publicar datos personales/credenciales en GitHub, no enviar postulaciones ni correos sin autorización específica.

## Registro real y métricas
- En `Agentes`, registrar inicio/resultado/bloqueo con fecha local, responsable e Id estable; no reportar actividad por horario. Evitar registrar el mismo resultado dos veces.
- **Al final de cada jornada**, Apps Script agrega un resumen diario único de resultados observables (sin LLM ni búsquedas pagadas): cantidad de vacantes registradas, descartadas, aún esperando CV, y HV visibles en `Por enviar`; además registrar cuántas están listas para enviar si hay revisión. El resumen mide archivos/estados reales, **no tokens exactos**: no afirmar que se midieron tokens si el proveedor no expone uso.
- Los agentes añaden en su fila de cierre: verificados, descartados, `CV_IA.json` válidos, HV finalizadas, revisiones, borradores confirmados, pendientes y bloqueos. Conciso (Detalle ≤300 caracteres). Un trabajo `parcial` no debe figurar como `hecho`.
- Revisar rendimiento por fuente en `Calidad por fuente`: preferir ratio de vacantes útiles, HV listas y postulaciones reales, no solo el número bruto de anuncios. Si la producción aumenta sin resultados, priorizar depuración y envío de lo ya preparado.

## Evolución y migración de IA
- Claude y ChatGPT consumen **las mismas reglas de este repositorio** y las skills de rol. Las diferencias se limitan al modo de acceso a herramientas, **no a decisiones de negocio ni seguridad**.
- Los cambios permanentes de comportamiento se documentan aquí, en la skill/prompt del rol afectado y, cuando corresponde, en código y pruebas. Una guía temporal por proveedor nunca sustituye esta política.
- **Una sola plataforma ejecutora por fase y horario.** Antes de devolver el control a Claude, pausar la automatización equivalente de ChatGPT y verificar que no haya una corrida en curso. No correr simultáneamente dos jefes sobre las mismas carpetas.

## Calidad de búsqueda antes de crear carpetas (5 nov 2026)

- Meta: oportunidades **reales y pertinentes**, no completar una cuota diaria de anuncios. El mínimo artificial de cinco candidatos sin fecha se desactivó. El límite de 15 CV continúa siendo máximo, no obligación.
- Rechazar en el prefiltro títulos sin funciones de UX/UI o diseño digital aunque provengan de una consulta de Google Jobs; no descartar funciones cercanas como Service Design o Research si están respaldadas.
- Conservar vacantes de 5+ años con menor prioridad, pero penalizar especialmente 7+; reconocer requisitos inequívocos de 4+ años como **desarrollador** o experiencia obligatoria de **hardware conectado lanzado**. No aplicar estas reglas a habilidades meramente deseables.
- Si Himalayas proporciona enlace de postulación **primario**, escogerlo antes de su `guid` y comprobar fecha en ese sitio. Si no aporta enlace original, no considerar verificada la fecha de la copia para generar carpetas/HV. Otras fuentes agregadas reciben penalización hasta demostrar vigencia en un portal original.
- Usar la misma cantidad de consultas por corrida, con rotación adicional de junior, UX/UI, sistemas de diseño y sectores financiero/fintech; evaluar rendimiento por **HV útiles, enlaces originales, entrevistas y postulaciones**, no número bruto de hallazgos.
- La precisión puede aumentar aunque una jornada tenga menos de cinco candidatas; **eso es preferible a generar CV para anuncios cerrados o imposibles**. La captación de más oportunidades requiere ampliar fuentes oficiales y medirlas, no bajar los filtros indiscriminadamente.


## Publicaciones de reclutadores en Apify — política permanente (5 nov 2026)
- **No se elimina Apify.** El actor de publicaciones sigue activo como fuente de oportunidades que no salen en bolsas de empleo: cinco búsquedas por día y **USD 0,25 máximo por corrida**, sin nuevas llamadas de pago para alcanzar la meta.
- Meta operativa de **10 oportunidades verificables/día**, sumando avisos formales y posts de texto completo. La meta no garantiza diez vacantes abiertas ni equivale a crear diez HV; si no hay suficientes, registrar el déficit y mejorar fuentes, nunca inventar oportunidades.
- Tres búsquedas base todos los días y dos rotativas, con consultas booleanas de LinkedIn compatibles con el actor (sin tildes, no más de dos grupos). El rol debe estar expresamente en el cuerpo del post; «Figma», «UX» como hashtag u opiniones no bastan.
- Cuando dos fuentes detecten el mismo post, conservar la **versión con texto completo** de Apify si existía un enlace o fragmento manual. Deduplicar mediante el ID de actividad, también entre URL /posts/ y /feed/update/. Los posts completos pasan a inspector/CV; los que solo tienen enlace quedan para revisión manual y **no cuentan como oportunidad ya verificada**.
- Medir por etiqueta de búsqueda las publicaciones recuperadas, candidatas y descartes, CV realmente acabados y postulaciones. Ajustar las consultas rotativas según el resultado de varios días, sin prometer cuota fija ni enviar correos automáticamente.
