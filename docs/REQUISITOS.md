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
| Búsqueda diaria a las 7 a. m. | ❓ | hoy `PIPELINE_HOUR` = 8 |
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
| Cómo se aplica (botón o correo verificado) | 🟡 | `Detalle_Vacante` guarda el enlace y el correo si el aviso lo trae |

## Drive y Sheet (guía §5, §6)

| Regla | Estado | Dónde / cómo se comprueba |
|---|---|---|
| Carpeta por vacante con el texto del aviso y el enlace | ✅ | `setupVacancyFolder_`, `createVacancyDetailDoc_` |
| Vacantes nuevas en `Vacantes con IA/Sin revisar/<fecha>/`, fuera de las semanas; las enviadas las mueve el usuario a `CV/<semana>/<fecha>` (decisión del usuario 2026-10-22) | ✅ | `todayVacancyFolder_`, `CONFIG.PENDING_FOLDER_NAME`; `generarCVsDesdeIA` lee `Sin revisar/<hoy>` |
| La carpeta lleva solo el nombre de la empresa; si ese día la empresa tiene dos vacantes, cada carpeta suma un detalle corto del cargo (decisión del usuario 2026-10-22) | ✅ | `vacancyFolderNames`, `shortRoleDetail` |
| Doc del aviso llamado "Vacante" | ❓ | hoy se llama `Detalle_Vacante` |
| HV en Google Doc + PDF | ❓ | Doc ✅; PDF en pausa (`CV_EXPORT_PDF` = false, decisión del 2026-10-19) |
| Colores: rojo rechazada, verde en proceso, amarillo aplicada sin respuesta | 🟡 | `colorToStatus` lee los colores; las publicaciones de LinkedIn se pintan de amarillo (`MANUAL_FOLDER_COLOR`), que choca con la leyenda |
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
| 3 experiencias por defecto, elegidas según la empresa | ❓ | `REGLAS_CV` define otra prioridad |
| 2 páginas, sin huérfanas, márgenes intactos | 🟡 | la plantilla quita los huecos (`removeGapsBetweenBullets_`); el conteo de páginas y las huérfanas los revisa el usuario |
| Enlaces del encabezado con https | ❓ | están en `MASTER_TEMPLATE` (plantilla del usuario) |

## Correos y permisos (guía §9, §10)

| Regla | Estado | Dónde / cómo se comprueba |
|---|---|---|
| Nunca enviar; solo borradores | ✅ | prueba "El agente no debe poder enviar correos" |
| Correos en frío (35–40 palabras, gancho verificado, un borrador por destinatario, PDF adjunto, lotes de 3) | ⏳ | requiere investigación web por empresa (paso de IA) |
| Resumen diario corto en español | ⏳ | |
