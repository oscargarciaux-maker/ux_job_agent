# CLAUDE.md - Agente Autónomo de Búsqueda de Empleo UX/UI

## 🎯 Propósito del Agente
Agente inteligente y modular diseñado para automatizar la búsqueda diaria de 10 vacantes de Diseñador UX/UI Junior (enfocado en sistemas de diseño, decisiones UX y research), filtrado por Match Score, organización en Google Drive, personalización de CVs basada en plantilla y creación de borradores en Gmail con supervisión humana estricta (HITL).

## 🛡️ Reglas Inquebrantables y Guardrails
1. **Human-in-the-Loop (HITL):** NUNCA envíes correos ni postulaciones automáticamente. Todos los correos de contacto deben generarse exclusivamente como **Borradores en Gmail** (`Gmail.Users.Drafts.create` / `users.drafts.create`). Prohibido `GmailApp` y cualquier llamada de envío; `tests/apps_script.test.js` lo verifica.
2. **Anti-Alucinación Estricta:** Prohibido inventar experiencia previa, herramientas o tecnologías no respaldadas por el perfil maestro del usuario (egresado de Diseño Industrial). Ante vacantes con tecnologías ausentes, enfatizar habilidades transferibles y capacidad de aprendizaje.
3. **Regla de Idioma:**
   - Vacante en Español -> CV y correo en Español.
   - Vacante en Inglés -> CV y correo en Inglés (respetando nivel de inglés limitado real).
4. **Eficiencia Extrema de Tokens:** La deduplicación y el filtrado inicial son deterministas contra Google Sheets **antes** de cualquier procesamiento ($0$ tokens en vacantes repetidas o descartadas). Hoy el pipeline no usa ningún LLM.
5. **Secretos:** Nunca escribir claves ni IDs reales en el repositorio (es **público**). Viven en *Propiedades del script* de Apps Script. En octubre 2026 se expuso una `SERPAPI_API_KEY` en el historial de git (`.env`/`.env.example`); se pidió al usuario rotarla.

## 🏗️ Dónde corre y cómo se despliega
- **Runtime:** Google Apps Script, en la cuenta de Google del usuario (proyecto "Agente UX" en script.google.com). No depende de ningún plan de Claude ni de un computador encendido.
- **Fuente de verdad del código:** carpeta `apps_script/` de este repositorio (rama `main`).
- **Despliegue automático:** `Updater.gs › sincronizarDesdeGitHub` corre a diario a las 7:00 AM; si el último commit de `main` tiene sus check-runs en verde (workflow `.github/workflows/tests.yml`), reemplaza el código del proyecto vía Apps Script API (`projects.updateContent`). **Todo lo que se haga merge/push a `main` llega a producción al día siguiente**, así que las pruebas deben pasar antes de hacer push.
- **Si cambias `oauthScopes` en `appsscript.json`:** el usuario debe ejecutar manualmente cualquier función una vez para re-autorizar; avísale.
- **Instalación inicial:** ver `INSTALACION.md` (manifiesto + `instalador/Instalador.gs` → `instalar` → `configurarAgente`).

## 🧩 Arquitectura (4 Fases) — `apps_script/`
- `Config.gs`: constantes y nombres de propiedades (`SERPAPI_API_KEY`, `GOOGLE_DRIVE_ROOT_FOLDER_ID`, `GOOGLE_SHEET_ID`, `GOOGLE_DOCS_MASTER_TEMPLATE_ID`).
- **Fase 1 (Búsqueda y Match)** `Search.gs` + `Personalization.gs`: SerpAPI (Google Dorking en LinkedIn, `tbs=qdr:w2`), parseo de empresa/cargo del título, Match Score determinista (Junior 100 / Mid 70 / Senior 30, promediado con ubicación Bogotá/Medellín/remoto 100, otra 50). Dedup por Link (columna D) en Sheets; top 10 por score.
- **Fase 2 (Google Drive)** `Workspace.gs`: `/Vacantes con IA/YYYY-MM-DD/[Empresa]_[Cargo]` + `Detalle_Vacante` (Google Doc).
- **Fase 3 (CV & PDF)** `Workspace.gs` + `Personalization.gs`: copia de la plantilla maestra, reemplazo de `{{EMPRESA}}`, `{{CARGO}}`, `{{RESUMEN}}`, `{{ENFOQUE}}` en cuerpo/encabezado/pie, exportación a PDF en la carpeta. Idioma detectado por conteo de palabras funcionales.
- **Fase 4 (Gmail)** `Workspace.gs`: borrador MIME (texto + HTML Sans Serif + PDF adjunto) solo si la oferta trae correo directo.
- `Main.gs`: `ejecutarPipeline` (activador 8:00 AM), `ejecutarPrueba` (2 vacantes de ejemplo, acciones reales), `ejecutarSimulacion` (sin tocar Workspace).
- `Setup.gs`: `configurarAgente` crea carpeta/hoja/plantilla faltantes e instala activadores (idempotente).

## 🛠️ Comandos
- Pruebas (obligatorias antes de push): `node tests/apps_script.test.js`
- No hay ejecución local de Apps Script; los servicios de Google solo existen en script.google.com.

## 📌 Pendientes conocidos
- Perfil maestro real (`master_profile`) y guía de redacción: los textos de `RESUMEN`/correo son genéricos y solo usan datos de este archivo.
- Soporte interactivo para Cartas de Presentación (*Cover Letter*).
- Uso de LLM (Claude API con prompt caching) para personalización semántica, respetando las reglas 1–4.
- Historial: la versión Python (OAuth + GitHub Actions) se eliminó en la migración; está en el commit `8957d0d`.
