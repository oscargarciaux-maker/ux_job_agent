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
| Antigüedad ≤ 21 días | ✅ | `MAX_POST_AGE_DAYS`, `isRecent`, `verifyPostingDates_` |
| Descartar inglés avanzado/fluido/bilingüe | ✅ | regla "exige inglés avanzado/fluido" en `EXCLUDED_VACANCY_RULES` |
| Avisar cuando el aviso está en inglés | ✅ | línea `Idioma` de `Detalle_Vacante` |
| Descartar freelance por proyecto y pasantías no remuneradas | ✅ | `EXCLUDED_VACANCY_RULES` |
| Descartar vacantes exclusivas para personas con discapacidad | ✅ | regla "exclusiva para personas con discapacidad" (no descarta las declaraciones de igualdad) |
| Fintech preferido sin excluir | ✅ | `FINTECH_PATTERN`, `FINTECH_BONUS` |
| Fuentes: LinkedIn > Indeed > Computrabajo > portal; agregadores nunca como fuente final | ✅ | `SOURCE_PRIORITY`, `BLOCKED_SOURCES` (incluye vacantes.com), `pickApplyOption` |
| Posts de LinkedIn "estamos contratando" | 🟡 | `searchLinkedInPosts_` (solo el fragmento público; sin sesión de LinkedIn) |
| Búsqueda con la sesión de LinkedIn del usuario | 🚫 | Apps Script no puede usar su sesión; Google Jobs ya trae los avisos de LinkedIn |
| Búsqueda diaria a las 7 a. m. | ✅ | `PIPELINE_HOUR` = 7 (el activador se mueve al re-ejecutar `configurarAgente`) |
| Meta de 10 diarias, sin rellenar; reporte honesto | ✅ | `DAILY_LIMIT`, `MIN_DAILY`, registro de ejecución |

## Verificación y deduplicación (guía §4, §8)

| Regla | Estado | Dónde / cómo se comprueba |
|---|---|---|
| El enlace funciona | ✅ | `verifyPostingDates_` descarta 404/410 |
| La vacante sigue recibiendo postulaciones | ✅ | `isClosedPosting` lee la página original (`CLOSED_POSTING_PATTERN`) |
| Dedupe por enlace y por empresa + cargo contra la Hoja 1 | ✅ | `getExistingUrls_`, `vacancyKey` |
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
| Publicaciones de LinkedIn sin carpeta propia ni color: un documento "Posts" del día con todos los enlaces (decisión del usuario 2026-10-24) | ✅ | `addPostsToDailyDoc_`, `postEntry` |
| Hoja 1, Aplicadas, Correos en frío | 🟡 | Hoja 1 y Aplicadas ✅; Correos en frío solo se lee |
| Actualizar estados y colores con los correos de respuesta | ⏳ | requiere leer Gmail (nuevo permiso `gmail.readonly` en el manifiesto) |

## Hoja de vida (guía §7)

| Regla | Estado | Dónde / cómo se comprueba |
|---|---|---|
| Nada inventado: cifras y empresas solo de `CONTEXTO_CV` | ✅ | `validateCvJson` |
| Palabras prohibidas (aprendiz, voluntario, practicante, intern, volunteer) y sin el semillero; "junior" solo si el cargo de la vacante lo dice (decisión del usuario 2026-10-22) | ✅ | `CONFIG.CV_FORBIDDEN_WORDS`, `forbiddenCvWords`, `vacancyAllowsJunior` en `validateCvJson` y `buildCvFileName` |
| Perfil propio de cada vacante, en prosa, sin "X: Y" | ✅ | `validateCvJson` rechaza dos puntos en el perfil; el prompt pide un perfil escrito para cada vacante |
| Archivo `HV_<Nombre>_<Cargo>`, sin empresa ni sufijos "(3)" | ✅ | `buildCvFileName` |
| Idioma de la HV = idioma de la vacante | ✅ | `_idioma`, `TEMPLATE_LABELS_EN_` |
| Cargos: título de LinkedIn ajustado con criterio a la vacante, nunca repetidos ni todos copiando el de la vacante (decisión del usuario 2026-10-22) | ✅ | prompt `ia/prompt_cv_diario.md`; `cargoErrors` en `validateCvJson` |
| 3 experiencias por defecto, elegidas según la empresa; Creditop solo si la vacante pide research y es de las mejores opciones (decisión del usuario 2026-10-24) | ✅ | prompt `ia/prompt_cv_diario.md` (manda sobre `REGLAS_CV`) |
| 2 páginas, sin huérfanas, márgenes intactos | 🟡 | la plantilla quita los huecos (`removeGapsBetweenBullets_`); el conteo de páginas y las huérfanas los revisa el usuario |
| Enlaces del encabezado con https | ❓ | están en `MASTER_TEMPLATE` (plantilla del usuario) |

## Correos y permisos (guía §9, §10)

| Regla | Estado | Dónde / cómo se comprueba |
|---|---|---|
| Nunca enviar; solo borradores | ✅ | prueba "El agente no debe poder enviar correos" |
| Correos en frío (35–40 palabras, gancho verificado, un borrador por destinatario, PDF adjunto, lotes de 3) | ⏳ | requiere investigación web por empresa (paso de IA) |
| Resumen diario corto en español | ⏳ | |

## Documento "Cómo filtro tus vacantes" (2026-10-24): reglas que el código aún no aplica

| Regla | Estado | Dónde / cómo se comprueba |
|---|---|---|
| El cargo se juzga por funciones, no por título (CX o gestión de producto entran si la función principal es diseño) | ✅ | `roleTitleClass`: títulos dudosos entran con `ROLE_VERIFY_PENALTY` y `Rol: VERIFICAR FUNCIONES` en `Detalle_Vacante`; la IA no escribe HV si la función principal no es diseño; `verificar-vacante` decide |
| La misma empresa con un cargo distinto no es duplicado; si la empresa ya tiene carpeta, se compara con lo que hay dentro | ✅ | `isSameAppliedVacancy_` (cargo de la carpeta, nombre de la HV, enlace/cargo del doc de vacante), `sameRole`; con otro cargo entra con `Aviso empresa:`; correos en frío solo avisan |
| Lo aplicado se mira en las carpetas semanales de `CV/`; `Prueba` = preparada sin enviar | ✅ | `sincronizarAplicadas` reconstruye `Aplicadas` desde `CV/`; lo que está en `Prueba` queda como "Preparada, sin enviar" (sigue contando para no repetir) |
| Sitios que piden tarjeta para postular, nunca como origen | 🟡 | `verificar-vacante` |
| Fuentes nuevas: Magneto365, Torre, portales fintech, bolsa UNAL, comunidades de diseño | ⏳ | hoy: SerpAPI (Google Jobs, que incluye varios portales), Remotive, Get on Board, Jobicy |
| Salario publicado se reporta (sin piso mínimo) | 🟡 | `verificar-vacante` |
| Descartadas/cerradas quedan en el registro con su motivo | ✅ | `setAsideVacancy_` (10:00) escribe `Descartada:`/`Dudosa:` en Estado; fuera de ese flujo, `verificar-vacante` con el conector de Google Sheets (solo la celda Estado) |
| Medio tiempo con contrato fijo | ❓ | pendiente de definir por el usuario; mientras tanto la vacante queda 🔶 Dudosa |

