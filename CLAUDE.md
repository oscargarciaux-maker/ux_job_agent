# CLAUDE.md - Agente Autónomo de Búsqueda de Empleo UX/UI

## 🎯 Propósito del Agente
Agente inteligente y modular diseñado para automatizar la búsqueda diaria de 10 vacantes de Diseñador UX/UI Junior (enfocado en sistemas de diseño, decisiones UX y research), filtrado por Match Score, organización en Google Drive, personalización de CVs basada en plantilla y creación de borradores en Gmail con supervisión humana estricta (HITL).

## 🛡️ Reglas Inquebrantables y Guardrails
1. **Human-in-the-Loop (HITL):** NUNCA envíes correos ni postulaciones automáticamente. Todos los correos de contacto deben generarse exclusivamente como **Borradores en Gmail** (`Gmail.Users.Drafts.create` / `users.drafts.create`). Prohibido `GmailApp` y cualquier llamada de envío; `tests/apps_script.test.js` lo verifica.
2. **Anti-Alucinación Estricta:** Prohibido inventar experiencia previa, herramientas o tecnologías no respaldadas por el perfil maestro del usuario (egresado de Diseño Industrial). Ante vacantes con tecnologías ausentes, enfatizar habilidades transferibles y capacidad de aprendizaje.
3. **Regla de Idioma:**
   - Vacante en Español -> CV y correo en Español.
   - Vacante en Inglés -> CV y correo en Inglés (respetando nivel de inglés limitado real).
4. **Eficiencia Extrema de Tokens:** La deduplicación y el filtrado inicial son deterministas contra Google Sheets **antes** de cualquier procesamiento ($0$ tokens en vacantes repetidas o descartadas). Hoy el pipeline no usa ningún LLM; la IA solo debe procesar las vacantes ya seleccionadas.
5. **Secretos:** Nunca escribir claves ni IDs reales en el repositorio (es **público**). Viven en *Propiedades del script* de Apps Script. En octubre 2026 se expuso una `SERPAPI_API_KEY` en el historial de git (`.env`/`.env.example`); se pidió al usuario rotarla.

## 🏗️ Dónde corre y cómo se despliega
- **Runtime:** Google Apps Script, en la cuenta de Google del usuario (proyecto "Agente UX" en script.google.com). No depende de ningún plan de Claude ni de un computador encendido.
- **Fuente de verdad del código:** carpeta `apps_script/` de este repositorio (rama `main`).
- **Despliegue automático:** en cada push a `main`, `.github/workflows/tests.yml` corre las pruebas y, si pasan, hace force-push del commit a la rama `deploy`. El proyecto de Apps Script del usuario solo contiene `instalador/Cargador.gs` (+ manifiesto): en cada ejecución descarga desde `raw.githubusercontent.com/.../deploy/apps_script/` los `.gs` listados en `apps_script/files.json`, los evalúa con `new Function(...)` y llama a lo que devuelve `exports_()` (en `Main.gs`). **Todo push a `main` con pruebas en verde llega a producción en la siguiente ejecución.**
- **Restricciones de ese diseño:** no usar `api.github.com` (límite por IP agotado en servidores de Google) ni la Apps Script API (exige activar la API en un proyecto de Google Cloud). Una función pública nueva debe agregarse a `exports_()` **y** a `Cargador.gs` (este último lo debe re-pegar el usuario). Un archivo `.gs` nuevo debe agregarse a `apps_script/files.json` (la prueba lo exige).
- **El manifiesto no se sincroniza:** si cambias `apps_script/appsscript.json` (scopes, servicios avanzados), el usuario debe re-pegarlo a mano y re-autorizar; avísale.
- **Estado:** instalado y verificado en la cuenta del usuario el 2026-10-17 (`configurarAgente` y `ejecutarPrueba` OK: carpetas, CV/PDF, registro y 2 borradores). Activador diario 8:00 AM activo.
- **Instalación inicial:** ver `INSTALACION.md` (manifiesto + `instalador/Cargador.gs` → `configurarAgente`).

## 🧩 Arquitectura (4 Fases) — `apps_script/`
- `Config.gs`: constantes y nombres de propiedades (`SERPAPI_API_KEY`, `GOOGLE_DRIVE_ROOT_FOLDER_ID`, `GOOGLE_SHEET_ID`, `GOOGLE_DOCS_MASTER_TEMPLATE_ID`).
- **Fase 1 (Búsqueda y Match)** `Search.gs` + `Personalization.gs`: SerpAPI motor `google_jobs` (descripción COMPLETA de la vacante; 1 crédito por cada query de `CONFIG.SEARCH_QUERIES`), filtro de antigüedad ≤14 días, dedup por Link (columna D) en Sheets, nivel (`classifySeniority`: junior/mid/senior) y Match Score (Junior 100 / Mid 80 / Senior 60, promediado con ubicación). Selección: **al menos `MIN_JUNIOR`=5 de 10 Junior** si existen; el resto por score de cualquier nivel (decisión del usuario: priorizar Junior sin excluir Senior).
- **Fase 2 (Google Drive)** `Workspace.gs`: `/Vacantes con IA/YYYY-MM-DD/[Empresa]_[Cargo]` + `Detalle_Vacante` (Google Doc con metadatos y la descripción completa: es la entrada del paso de IA). Estado en Sheets: `Esperando CV (IA)`.
- **Fase 3 (CV & PDF) — EN PAUSA hasta conectar la IA:** la plantilla `MASTER_TEMPLATE` (Google Doc del usuario, buscado por nombre en todo el Drive) tiene marcadores propios (`{{TITULO_SUBTITULO_PROFESIONAL}}`, `{{PERFIL_PERSONALIZADO}}`, `{{CARGO_EXP_n}}`, `{{LOGRO_n_m}}`, `{{HEADER_*}}`, etc.) y debe quedar exactamente como el usuario la diseñó. El contenido debe redactarlo una IA aplicando 100% la guía `GUIA_CV` con datos de `CONTEXTO_CV` (ambos como Google Docs privados en Drive, NUNCA en este repo público: contienen datos personales). Restricción del usuario: no pagar API aparte; usar su plan de Claude.
- **Fase 4 (Gmail)** `Workspace.gs`: `buildMimeMessage`/`createApplicationDraft_` (texto + HTML Sans Serif + PDF adjunto), listos para cuando la Fase 3 genere el PDF; solo si la oferta trae correo directo.
- `Main.gs`: `ejecutarPipeline` (activador 8:00 AM), `ejecutarPrueba` (2 vacantes de ejemplo, acciones reales), `ejecutarSimulacion` (sin tocar Workspace).
- `Setup.gs`: `configurarAgente` crea carpeta/hoja/plantilla faltantes e instala el activador diario de `ejecutarPipeline` (idempotente).

## 🛠️ Comandos
- Pruebas (obligatorias antes de push): `node tests/apps_script.test.js`
- No hay ejecución local de Apps Script; los servicios de Google solo existen en script.google.com.

## 📌 Pendientes conocidos
- **Conectar la IA de la Fase 3** (ver arriba) y reactivar CV/PDF/borrador.
- Soporte interactivo para Cartas de Presentación (*Cover Letter*).
- Historial: la versión Python (OAuth + GitHub Actions) se eliminó en la migración; está en el commit `8957d0d`.
