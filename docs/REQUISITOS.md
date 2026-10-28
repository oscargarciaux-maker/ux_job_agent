# Requisitos del agente y dónde se cumplen

Fuente: la guía del usuario "Guia busqueda de vacantes y creacion de HV" (Google Drive, 2026-10-22). La guía tiene datos
personales y vive solo en Drive; aquí va cada regla en términos generales, su estado y dónde se puede comprobar.
Las reglas personales (experiencias, títulos exactos de LinkedIn, enlaces del encabezado) viven en los Google Docs
privados `REGLAS_CV` y `CONTEXTO_CV` y en la plantilla `MASTER_TEMPLATE`.

Estados: ✅ hecho y probado · 🟡 parcial · ⏳ pendiente · ❓ falta una decisión del usuario · 🚫 no automatizable en esta arquitectura

## Búsqueda y filtros (guía §3)

| Regla | Estado | Dónde / cómo se comprueba |
|---|---|---|
| Roles: UX/UI, producto, design systems, research, web/visual, service design; fuera copywriter, SEO, developer, gráfico puro, design engineer | ✅ | `isDesignRole` (`Search.gs`); pruebas en `tests/apps_script.test.js` |
| Nunca staff, principal, head, director, manager | ✅ | `CONFIG.EXCLUDED_TITLE_PATTERN`, `exclusionReason` |
| Junior primero; < 5 años sirve; ≥ 5 años baja prioridad | ✅ | `MIN_JUNIOR`, `requiredYears`, `EXPERIENCE_PENALTY` |
| Ubicación: Colombia o remoto LATAM/mundo/UTC-3 a -6; nunca solo EE. UU., Europa, India | ✅ | `REACHABLE_REMOTE_LOCATION`, `isReachableRemoteJob` |
| Antigüedad ≤ 21 días | ✅ | `MAX_POST_AGE_DAYS`, `isRecent`, `verifyPostingDates_` (`extractJobPostingDates` acepta fechas de un dígito como las de elempleo desde 2026-10-24); la fecha de Jobicy/Remotive es la de la copia: la verifica `verificar-vacante` |
| Descartar inglés avanzado/fluido/bilingüe | ✅ | regla "exige inglés avanzado/fluido" en `EXCLUDED_VACANCY_RULES` (desde 2026-10-24 también "nivel avanzado de inglés" y "excellent English"). Nivel real B2: fluido, nativo o bilingüe siempre descartan; avanzado, alto, excelente o C1/C2 no descartan si el aviso pide B1/B2 explícito (`unless` de la regla; decisión del usuario 2026-10-24) |
| Avisar cuando el aviso está en inglés | ✅ | línea `Idioma` de `Detalle_Vacante` |
| Descartar freelance por proyecto y pasantías no remuneradas | ✅ | `EXCLUDED_VACANCY_RULES` |
| Descartar vacantes exclusivas para personas con discapacidad | ✅ | regla "exclusiva para personas con discapacidad" (no descarta las declaraciones de igualdad) |
| Fintech preferido sin excluir | ✅ | `FINTECH_PATTERN`, `FINTECH_BONUS` |
| Fuentes: LinkedIn > Indeed > Computrabajo > portal; agregadores nunca como fuente final | ✅ | `SOURCE_PRIORITY`, `BLOCKED_SOURCES` (incluye vacantes.com), `pickApplyOption` |
| Indeed y LinkedIn con JobSpy 4 veces al día (plan del usuario 2026-10-27) | ✅ | `.github/workflows/jobspy.yml`, `tools/jobspy_buscar.py`, `searchJobSpy_`. Probado el 27 oct en Actions: Indeed 9 nuevos (sin `location`), LinkedIn 7 con algunos 429; Google Jobs daba 0 desde Actions y se quitó (lo cubre SerpAPI) |
| Vacantes de los portales de empleo de las empresas objetivo (Greenhouse, Lever, Ashby, Workable) | 🟡 | `searchAtsBoards_`, `atsCandidates`, `parseAtsJobs` (pruebas). Falta la primera corrida real |
| Alertas de LinkedIn por correo (sin usar la cuenta) | 🟡 | `searchEmailAlerts_`, `alertLinksFromHtml`; requiere manifiesto con `gmail.readonly` y que el usuario cree las alertas |
| Publicaciones con Brave Search y filtro de ruido ("open to work", cursos) | 🟡 | `searchBravePosts_` (requiere `BRAVE_API_KEY`), `POST_NOISE_PATTERN` |
| Medir vacantes por fuente para comparar antes y después del plan | ✅ | Pestaña `Fuentes` (`logSourceStats_`), con la línea base del 24 al 26 de octubre |
| Mañana condensada: todo listo hacia las 8:30 (2026-10-27) | 🟡 | `CONFIG.PIPELINE_HOURS` 5:00 y repaso 5:45 (re-ejecutar `configurarAgente`); JobSpy 4:17; tareas "CV con IA diario" 6:03 y 7:03 y "Revisión HV diaria" 7:53 y 8:53 |
| SerpAPI una vez al día (100 créditos al mes) | ✅ | `serpApiDue`, propiedad `SERPAPI_LAST_DAY` (`tests/apps_script.test.js`) |
| Posts de LinkedIn "estamos contratando", con HV (decisión del usuario 2026-10-26) | 🟡 | `searchLinkedInPosts_` + `enrichLinkedInPosts_`/`parseLinkedInPostPage`: la página pública del post trae el texto completo (JSON-LD `SocialMediaPosting`) sin sesión; esas pasan a carpeta + `Detalle_Vacante` ("Tipo: PUBLICACIÓN") + IA; las que no abren siguen en `Posts/Posts`. Falta comprobar que LinkedIn responda a las IP de Google |
| Búsqueda con la sesión de LinkedIn del usuario | 🚫 | Retirada el 2026-10-27 (plan del usuario: nunca automatizar su cuenta). Su alcance llega por las alertas de LinkedIn en Gmail (`searchEmailAlerts_`) |
| Búsqueda diaria a las 7 a. m. | ✅ | `PIPELINE_HOUR` = 7 (el activador se mueve al re-ejecutar `configurarAgente`) |
| Meta de 10 diarias, sin rellenar; reporte honesto | ✅ | sobre-reserva: `DAILY_LIMIT`=20 candidatas, HV a las 10 mejores que pasan la verificación (prompt `ia/prompt_cv_diario.md`, paso 4); `MIN_DAILY`, registro de ejecución |

## Verificación y deduplicación (guía §4, §8)

| Regla | Estado | Dónde / cómo se comprueba |
|---|---|---|
| El enlace funciona | ✅ | `verifyPostingDates_` descarta 404/410 |
| La vacante sigue recibiendo postulaciones | ✅ | LinkedIn (`parseLinkedInJobDetail`), elempleo (vencimiento del JSON-LD) y alertas al buscarlas; las demás, la IA con `verificar-vacante`. Desde el 27 oct 2026 Apps Script solo abre las páginas sin fecha y nunca las de linkedin.com (`isClosedPosting` sobre esas): tres corridas se colgaron más de 4 min abriendo páginas |
| Dedupe por enlace y por empresa + cargo contra la Hoja 1 | ✅ | `getExistingUrls_`, `vacancyKey`; avisos "confidential" cuyo texto nombra una empresa del registro con el mismo cargo: `isHiddenCompanyRepeat` (2026-10-24) |
| Dedupe contra la pestaña Aplicadas | ✅ | `getAppliedCompanies_`, `isAppliedCompany` |
| Dedupe contra la pestaña Correos en frío | ✅ | `getColdEmailCompanies_` |
| Dedupe contra todas las carpetas de Drive (incluidas confidencial y semanas) | 🟡 | cubre `Vacantes con IA/CV/...` vía `sincronizarAplicadas`; no recorre otras carpetas |
| Verificación humana asistida de cada vacante (abierta, original, encaje, repetida, alertas, cómo aplicar) con veredicto | ✅ | skill `.claude/skills/verificar-vacante` (incluye el documento "Cómo filtro tus vacantes", 2026-10-24) |
| La IA verifica cada vacante antes de escribir su HV; solo ✅/🟡 reciben HV; las que no pasan no se entregan ni quedan en carpetas; las dudosas las decide el usuario (decisión del usuario 2026-10-24) | ✅ | prompt `ia/prompt_cv_diario.md` (paso 3, `Verificacion.txt` con `VEREDICTO:`/`MOTIVO:`); `parseVerdict` y `setAsideVacancy_` en `CV.gs`: DESCARTAR → papelera, DUDOSA → `Sin revisar/<fecha>/Dudosas`, estado en Hoja 1 |
| Cómo se aplica (botón o correo verificado) | 🟡 | `Detalle_Vacante` guarda el enlace y el correo si el aviso lo trae |

## Drive y Sheet (guía §5, §6)

| Regla | Estado | Dónde / cómo se comprueba |
|---|---|---|
| Carpeta por vacante con el texto del aviso y el enlace | ✅ | `setupVacancyFolder_`, `createVacancyDetailDoc_` |
| Vacantes nuevas en `Vacantes con IA/Sin revisar/<fecha>/`, fuera de las semanas; las enviadas las mueve el usuario a `CV/<semana>/<fecha>` (decisión del usuario 2026-10-22) | ✅ | `todayVacancyFolder_`, `CONFIG.PENDING_FOLDER_NAME`; `generarCVsDesdeIA` lee `Sin revisar/<hoy>` |
| La carpeta lleva solo el nombre de la empresa; si ese día la empresa tiene dos vacantes, cada carpeta suma un detalle corto del cargo (decisión del usuario 2026-10-22) | ✅ | `vacancyFolderNames`, `shortRoleDetail` |
| Doc del aviso llamado "Vacante" | ❓ | hoy se llama `Detalle_Vacante` |
| HV en Google Doc + PDF | ✅ | Doc automático; el PDF lo exporta el usuario tras ajustar el Doc (`CV_EXPORT_PDF` = false, decisión del usuario confirmada el 2026-10-24) |
| Colores: rojo rechazada, verde en proceso, amarillo aplicada sin respuesta | ✅ | `colorToStatus` lee los colores; el agente ya no pinta carpetas |
| Publicaciones de LinkedIn sin texto completo: un documento "Posts" del día con sus enlaces (2026-10-24; desde 2026-10-26 solo las que no se pudieron leer) | ✅ | `addPostsToDailyDoc_`, `postEntry` |
| Hoja 1, Aplicadas, Correos en frío | 🟡 | Hoja 1 y Aplicadas ✅; Correos en frío solo se lee |
| Actualizar estados y colores con los correos de respuesta | ✅ | skill `seguimiento` (conector de Gmail en solo lectura, cuenta laboral; tarea "Seguimiento diario"); colores con `folderColorRgb`, evidencia en la pestaña `Seguimiento`. Apps Script no lee Gmail |

## Hoja de vida (guía §7)

| Regla | Estado | Dónde / cómo se comprueba |
|---|---|---|
| Nada inventado: cifras y empresas solo de `CONTEXTO_CV` | ✅ | `validateCvJson` |
| Palabras prohibidas (aprendiz, voluntario, practicante, intern, volunteer) y sin el semillero; "junior" solo si el cargo de la vacante lo dice (decisión del usuario 2026-10-22) | ✅ | `CONFIG.CV_FORBIDDEN_WORDS`, `forbiddenCvWords`, `vacancyAllowsJunior` en `validateCvJson` y `buildCvFileName` |
| Personalización comprobable: mapa de evidencia (`_mapa`: por keyword, cita textual de `CONTEXTO_CV` y dónde va en la HV) y las 5 keywords principales en perfil, cargos, descripciones o logros, no solo en habilidades; lecciones del usuario en el Doc `LECCIONES_HV` (2026-10-25: "fui a enviar unas y no me convencieron") | ✅ | `personalizationErrors`/`keywordCovered` en `validateCvJson`; skills `crear-hv` (mapa) y `revisar-hv` (puntaje); prompt |
| Fuentes con vacantes formales recientes: elempleo (lista + JSON-LD de cada aviso, desde 2026-10-26; desde el 27 oct en GitHub Actions, `tools/jobspy_buscar.py`, `tests/jobspy_test.py`), LinkedIn (buscador público, última semana, Colombia y remoto en Colombia, descripción completa y descarte de avisos cerrados) además de Google Jobs, Remotive, Get on Board y Jobicy; la verificación lee la fecha real (`datePosted`) y no confía en "Cargo abierto" (2026-10-26: Qentaz era de 2022) | ✅ | `searchLinkedInJobs_` (`Search.gs`, pruebas de los parsers); skill `verificar-vacante` paso 2. Corrida del 27 oct: LinkedIn 58 avisos (17 de 60 búsquedas con 429), 34 de diseño |
| Tono de `GUIA_CV` ("profesional, estratégico y orientado a resultados"): cada logro = verbo de impacto + qué + cómo + resultado, abre con la cifra si la hay, sin explicaciones conversacionales; descripciones con verbo; 2 páginas es el tope, no la meta (si sobra más de un cuarto de la página 2, se usa) (2026-10-26, HV de Qentaz) | 🟡 | Skills `crear-hv` (Redacción) y `revisar-hv` (filas 10 y 10b); `LECCIONES_HV`. No hay chequeo en código: es de criterio |
| La HV nunca nombra a la empresa de la vacante (se leería como si ya trabajara allí; decisión del usuario 2026-10-24) | ✅ | `targetCompanyErrors` en `validateCvJson`; skill `crear-hv` y prompt |
| Perfil propio de cada vacante, en prosa, sin "X: Y" | ✅ | `validateCvJson` rechaza dos puntos en el perfil; el prompt pide un perfil escrito para cada vacante |
| Archivo `HV_<Nombre>_<Cargo>`, sin empresa ni sufijos "(3)" | ✅ | `buildCvFileName` |
| Idioma de la HV = idioma de la vacante | ✅ | `_idioma`, `TEMPLATE_LABELS_EN_` |
| Nivel de inglés en la HV: B2 (intermedio alto), no "intermedio" (decisión del usuario 2026-10-24) | ✅ | `CONTEXTO_CV` y `CRITERIOS_BUSQUEDA` actualizados; skills `crear-hv` y `revisar-hv`, prompt `ia/prompt_cv_diario.md` |
| Cargos: título de LinkedIn ajustado con criterio a la vacante, nunca repetidos ni todos copiando el de la vacante (decisión del usuario 2026-10-22) | ✅ | prompt `ia/prompt_cv_diario.md`; `cargoErrors` en `validateCvJson` |
| Experiencias base Seguros Bolívar, Meevent y Central Xpress, ampliadas; Trezo o Creditop solo si aportan mucho (Creditop solo con research explícito); máximo 4 (decisión del usuario 2026-10-24) | ✅ | skill `crear-hv`, prompt `ia/prompt_cv_diario.md`, `REGLAS_CV` actualizado |
| Cada experiencia con 1–2 líneas de descripción y 3 logros (hasta 4); los logros pesan más que una cuarta experiencia | ✅ | `MASTER_TEMPLATE` (`DESC_EXP_n`, `LOGRO_n_4`); skill `crear-hv` |
| Ubicación según la vacante: Bogotá sin nota; otra ciudad "(Abierto a relocalización)"; remota o exterior "(Remoto)" | ✅ | `{{UBICACION}}` en `MASTER_TEMPLATE`, no puede ir vacía (`CV_REQUIRED_KEYS_`); skill `crear-hv` |
| Categorías de habilidades según la vacante | ✅ | `CATEGORIA_SKILL_1..5` en `MASTER_TEMPLATE` |
| HV para correo en frío (sin vacante): cargo deducido de la empresa, carpeta `Correos en frío/<Empresa>` | ✅ | skill `crear-hv` (modo B) |
| HV pedida en una conversación se arma de inmediato | ✅ | skill `crear-hv` (copia `MASTER_TEMPLATE` y la llena con los conectores de Drive y Docs) |
| 2 páginas, sin huérfanas, márgenes intactos | ✅ | la plantilla quita los huecos (`removeGapsBetweenBullets_`); la skill `revisar-hv` mira el PDF y corrige páginas, huérfanas y cargos sueltos (tarea diaria "Revisión HV diaria" después de las 10 y a pedido; decisión del usuario 2026-10-24) |
| Lista de chequeo de la HV antes de entregar (guía A.6): datos reales, palabras prohibidas, títulos, idioma, nombre, perfil único, enlaces; corrige lo objetivo y propone lo de criterio (decisión del usuario 2026-10-24) | ✅ | skill `.claude/skills/revisar-hv`, prompt `ia/prompt_revision_diaria.md`; deja `Revision.txt` (`VEREDICTO: LISTA_PARA_ENVIAR\|REVISAR`) |
| Enlaces del encabezado con https | ✅ | están en `MASTER_TEMPLATE` (su WhatsApp era `http://`; corregido el 2026-10-24); `revisar-hv` comprueba en cada HV que sean `https://`, sin espacios e iguales a los de la plantilla |

## Correos y permisos (guía §9, §10)

| Regla | Estado | Dónde / cómo se comprueba |
|---|---|---|
| Nunca enviar; solo borradores | ✅ | prueba "El agente no debe poder enviar correos" |
| Correos en frío (gancho verificado, un borrador por destinatario, PDF adjunto, lotes de 3, al menos 3 direcciones con fuente) | ✅ | skill `.claude/skills/correo-en-frio` (a pedido, por lotes) + `crearBorradoresEnFrio` (`ColdEmail.gs`, cada hora dentro de `sincronizarAplicadas`): valida `Correos.json`, omite direcciones ya usadas o rebotadas, crea los borradores con la HV en PDF y agrega las filas a `Correos en frío` |
| Correos personalizados: saludo por el nombre si la dirección es de una persona; el nombre de la empresa va con discreción en el texto (no cuenta en las 35 palabras) y nunca en el asunto que se envía (el borrador lo muestra como prefijo "[Empresa] " que el usuario borra) (decisión del usuario 2026-10-24) | ✅ | `validateColdEmails` (saludo, asunto), `countEmailWords(text, company)`, `coldDraftSubject` |
| Búsqueda de unas 30 empresas por ejecución (Bogotá primero) y correos en tandas de 3 con su HV cuando el usuario diga "crea los correos", sin bajar la calidad (decisión del usuario 2026-10-24) | ✅ | skills `investigar-empresas` (tamaño, guardado cada 5–10 empresas) y `correo-en-frio` (modo tandas: estado en `Empresas objetivo`, retoma en otra sesión); `targetCompanyMatches` para marcar la fila aunque el nombre del correo sea más corto |
| Bancos y fintechs grandes sin correo publicado | 🟡 | Su portal de empleo (ATS diario desde `Empresas objetivo`: `searchAtsBoards_`) y las alertas de LinkedIn del usuario; nunca su sesión (2026-10-27) |
| Investigación de empresas reales que contratan diseñadores UX/UI (Bogotá, luego Colombia, luego exterior remoto LATAM) con al menos 3 correos publicados con fuente (decisión del usuario 2026-10-24) | ✅ | skill `.claude/skills/investigar-empresas` → pestaña `Empresas objetivo` (`TARGET_COMPANIES_HEADERS`); `correo-en-frio` toma de ahí el lote y Apps Script marca `Borradores creados` (`markTargetCompany_`) |
| Correos de máximo 35 palabras según la Guía Maestra de Cover Letters (la guía principal de correos; manda sobre los 35–40 de la guía de búsqueda; decisión del usuario 2026-10-24) | ✅ | `COLD_EMAIL_MAX_WORDS`, `countEmailWords`: error en `Correos.json`, aviso en `_correo_cuerpo` de las vacantes; skills `correo-en-frio` y `crear-hv`, prompt diario |
| Resumen diario corto en español | ⏳ | |

## Documento "Cómo filtro tus vacantes" (2026-10-24): reglas que el código aún no aplica

| Regla | Estado | Dónde / cómo se comprueba |
|---|---|---|
| El cargo se juzga por funciones, no por título (CX o gestión de producto entran si la función principal es diseño) | ✅ | `roleTitleClass`: títulos dudosos entran con `ROLE_VERIFY_PENALTY` y `Rol: VERIFICAR FUNCIONES` en `Detalle_Vacante`; la IA no escribe HV si la función principal no es diseño; `verificar-vacante` decide |
| La misma empresa con un cargo distinto no es duplicado; si la empresa ya tiene carpeta, se compara con lo que hay dentro | ✅ | `isSameAppliedVacancy_` (cargo de la carpeta, nombre de la HV, enlace/cargo del doc de vacante), `sameRole`; con otro cargo entra con `Aviso empresa:`; correos en frío solo avisan |
| Lo aplicado se mira en las carpetas semanales de `CV/`; lo preparado sin enviar vive en `Sin revisar/<fecha>` (pestaña `Por enviar`, desde 2026-10-25; antes `Prueba`) | ✅ | `sincronizarAplicadas` reconstruye `Aplicadas` desde `CV/`; lo que está en `Prueba` queda como "Preparada, sin enviar" (sigue contando para no repetir) |
| Sitios que piden tarjeta para postular, nunca como origen | 🟡 | `verificar-vacante` |
| Fuentes nuevas: Magneto365, Torre, portales fintech, bolsa UNAL, comunidades de diseño | ⏳ | hoy: SerpAPI (Google Jobs, que incluye varios portales), Remotive, Get on Board, Jobicy |
| Salario publicado se reporta (sin piso mínimo) | 🟡 | `verificar-vacante` |
| Descartadas/cerradas quedan en el registro con su motivo | ✅ | `setAsideVacancy_` (cada pasada de `generarCVsDesdeIA`, cada 10 min) escribe `Descartada:`/`Dudosa:` en Estado; fuera de ese flujo, `verificar-vacante` con el conector de Google Sheets (solo la celda Estado) |
| Medio tiempo con contrato fijo | ❓ | pendiente de definir por el usuario; mientras tanto la vacante queda 🔶 Dudosa |
| La búsqueda nunca deja la corrida sin tiempo para crear carpetas (límite de 6 min de Apps Script; el 27 oct se cortó a los 6 sin crear ninguna) | ✅ | `SEARCH_BUDGET_MS`, `VERIFY_BUDGET_MS`, `TIME_BUDGET_MS` contados desde el inicio (`runPipeline_`), fuentes de la más rápida a la más lenta, `pageChecked`; pruebas en `tests/apps_script.test.js` |
| Un solo aviso por vacante y máximo 2 por empresa en la selección del día (mismo aviso por ciudad o misma descripción con otro cargo = repetido) | ✅ | `distinctPostings`, `MAX_PER_COMPANY` (`Personalization.gs`, `Main.gs`); prueba con los avisos de Blacksmith Agency y Empresa confidencial del 27 oct 2026 |
| Exclusiva para personas con discapacidad también por el título | ✅ | `DISABILITY_TITLE_PATTERN` en `exclusionReason` |
| El mismo aviso en otra ciudad no vuelve en días siguientes | ✅ | `vacancyBaseKey` en `getExistingUrls_` y en la deduplicación de `runPipeline_`; las copias quedan en Hoja 1 como `Repetida (mismo aviso)` |
| LinkedIn se busca en GitHub Actions con descripción y aviso cerrado | ✅ | `buscar_linkedin`, `tarjetas_linkedin`, `ficha_linkedin` (`tools/jobspy_buscar.py`, `tests/jobspy_test.py`) |
| Avisos en el portal oficial de la empresa hasta 60 días (sigue publicado = abierto) | ✅ | `OFFICIAL_BOARD_MAX_AGE_DAYS`, `maxAgeDays` en `verifyPostingDates_`; `verificar-vacante` y `ia/prompt_cv_diario.md` los dejan de menor prioridad pasados 21 días (decisión del usuario 2026-10-27) |
| Calidad por fuente (con HV, dudosas, descartadas) | ✅ | Pestaña `Calidad por fuente`, `sourceQualityRows` (pruebas), columna `Fuente` de Hoja 1 |
| Inglés "avanzado/alto/excelente" sin fluido, bilingüe ni C1: menor prioridad, no descarte (decisión del usuario 2026-10-27) | ✅ | `englishAdvanced`, `ENGLISH_ADVANCED_PATTERN`, `ENGLISH_ADVANCED_PENALTY` en `computePriority`; nota «Inglés:» en `Detalle_Vacante`; columna `Notas` de Hoja 1 y resumen en `Calidad por fuente`; `verificar-vacante` y `ia/prompt_cv_diario.md` |
| Equipo de agentes con un jefe que reparte el trabajo (plan de Claude, sin API) | 🟡 | `docs/MULTIAGENTE.md`, `.claude/agents/`, skill `jefe`; probado con pruebas de contrato (`tests/oficina.test.js`), falta el primer pedido real |
| Bitácora de agentes en la pestaña `Agentes` y estado de cada agente | ✅ | `Agentes.gs` (`buildAgentsModel`, `agentThreads`, `normalizeStamp`; `tests/apps_script.test.js`) |
| Oficina de pingüinos: quién trabaja, qué necesita de Oscar, buzón para el jefe | 🟡 | `apps_script/oficina.html` (`tests/oficina.test.js`, capturas 390/1280 claro y oscuro); el buzón exige la clave de escritura y la tarea «Jefe (buzón)» está apagada hasta que Oscar le ponga conectores |
| Paquete de envío: PDF renovado cada hora si el Doc cambió y el mensaje para copiar (decisión del usuario 2026-10-28) | ✅ | `writePendingCvs_`, `pendingCvFiles`, `pendingMessage`, columnas `PDF` y `Mensaje` de `Por enviar`; `docPdfExportUrl` en el tablero (pruebas) |
| Tanda de hoy en la oficina: postulaciones, correos y seguimientos con tiempo estimado | ✅ | `tandaDeHoy`, `resumenTanda` (`tests/oficina.test.js`), capturas 390/1280 claro y oscuro |
| Seguimiento a los 8–30 días sin respuesta: borrador en el mismo hilo, uno por empresa, nunca se envía | 🟡 | `followupCandidates`, `followupBody` (pruebas), `crearBorradoresDeSeguimiento_` en `sincronizarAplicadas`; falta verlo en la cuenta del usuario |
| Producir menos: máximo 4 HV por tanda (2 con 10 o más sin enviar) y sin lotes de correos con más de 10 borradores | ✅ | `ia/prompt_cv_diario.md`, skill `correo-en-frio`, agente `cartero`, skill `jefe`; `DAILY_LIMIT`=14; aviso en el cartero (`buildAgentsModel`, pruebas) |
| Vista 3D con pingüinos estilo peluche, rutinas de trabajo con duración real y base ambientada | ✅ | `PUESTOS_TRABAJO_3D`, `conTrabajo`, `segundosDeEscena` (`tests/oficina.test.js`); revisado con capturas |
