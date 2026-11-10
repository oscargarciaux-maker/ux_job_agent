# CLAUDE.md — Agente de búsqueda de empleo UX/UI (índice corto)

**REGLA PERMANENTE Y VINCULANTE:** antes de orquestar cualquier tarea lee [docs/POLITICA_OPERATIVA.md](docs/POLITICA_OPERATIVA.md). Prevalece en presupuesto, coordinación, permisos y bitácora, para cualquier proveedor de IA. Nunca un agente por vacante.

Este archivo es un **índice** (2026-11-09: antes tenía 78 KB y se cargaba en cada sesión y subagente). El detalle de cada decisión, con fechas y motivos, está en [docs/HISTORIAL_TECNICO.md](docs/HISTORIAL_TECNICO.md): léelo solo en la sección del módulo que vas a tocar. Decisiones nuevas: en ese archivo y, si son reglas, en [docs/REQUISITOS.md](docs/REQUISITOS.md).

## Propósito
Buscar cada día vacantes reales de Diseñador UX/UI (junior a mid; sistemas de diseño, research, fintech primero) abiertas a Colombia/LATAM, verificarlas, escribir una HV personalizada por vacante, preparar correos en frío y hacer el seguimiento, con supervisión humana estricta. Candidato: Oscar (egresado de Diseño Industrial, inglés B2).

## Reglas inquebrantables
1. **HITL:** nunca enviar correos ni postulaciones. Solo **borradores** de Gmail (`Gmail.Users.Drafts.create`). Prohibido `GmailApp` y cualquier envío (lo verifica `tests/apps_script.test.js`). **Única excepción** (decisión explícita del usuario 2026-11-04): `EnvioProgramado.gs` envía con `Gmail.Users.Drafts.send` solo los borradores listados en `Correos en frío/ENVIO_PROGRAMADO.json`, que una sesión escribe únicamente cuando Oscar pide programar ese envío. Nunca crear ese archivo sin ese pedido. Detalle en el historial.
2. **Anti-alucinación:** solo datos de `CONTEXTO_CV`. Apps Script rechaza cifras, empresas y herramientas que no estén allí. Ante tecnologías ausentes: habilidades transferibles y capacidad de aprendizaje.
3. **Idioma:** vacante en español → HV y correo en español; en inglés → en inglés (nivel real B2). Los términos que la vacante escribe en inglés se copian tal cual también en una HV en español (match ATS, 2026-11-09).
4. **Tokens:** deduplicación y filtros deterministas en Apps Script antes de cualquier IA. La IA solo procesa vacantes ya seleccionadas y lee cada recurso una vez por tanda. Lo que se puede comprobar con código (cifras, ATS, repeticiones, largo) lo comprueba Apps Script, no la IA.
5. **Secretos y privacidad:** el repo es **público**. Claves e IDs en *Propiedades del script*. `GUIA_CV`, `CONTEXTO_CV`, `REGLAS_CV`, `LECCIONES_HV` y la guía de búsqueda viven solo en Drive (`Vacantes con IA/Recursos`); nunca copiar su contenido aquí.
6. **LinkedIn:** nunca usar la sesión de Oscar (retirada 2026-10-27). Su alcance llega por las alertas de su Gmail.

## Dónde corre y cómo se despliega
- **Runtime:** Google Apps Script en la cuenta de Oscar (proyecto «Agente UX»). Fuente de verdad: `apps_script/` en `main`.
- **Despliegue:** push a `main` → `.github/workflows/tests.yml` corre las pruebas → force-push a `deploy`. El proyecto solo tiene `instalador/Cargador.gs`, que descarga de `raw.githubusercontent.com/.../deploy/apps_script/` los `.gs` de `apps_script/files.json`. **Todo push a `main` en verde llega a producción en la siguiente ejecución.**
- **Restricciones:** no usar `api.github.com` ni la Apps Script API. Función pública nueva → `exports_()` (`Main.gs`) **y** `Cargador.gs` (Oscar lo re-pega). Archivo `.gs` nuevo → `files.json` (la prueba lo exige). Cambios en `appsscript.json` → Oscar re-pega el manifiesto y re-autoriza: avísale.
- **Activadores:** búsqueda 5:00 y repaso 5:45 (±15 min), `generarCVsDesdeIA` cada 10 min (5:00–22:59), `sincronizarAplicadas` cada hora. Reinstalar = `configurarAgente`.
- **IA (plan de Claude, sin API aparte):** tareas programadas «CV con IA diario» (`trig_01GsmgCkRgo2hy3HKkDFBHFT`, 6:03 y 7:03), «Revisión HV diaria» (`trig_01JPjYnbZ6BHdeWfLQmmui1G`, solo 7:53 desde 2026-11-10), «Seguimiento diario» (`trig_01Pvgp5hFrcDdE2jTcv78edS`, 18:13) y «Jefe (buzón)» (`trig_01U2586E2ZnGDu48CWUFDnAb`, apagada). Descargan su prompt de `ia/*.md` en `main` al arrancar (sin respaldo a otras ramas desde 2026-11-10): cambiar el archivo basta. Conectores (Drive, Docs, Sheets, Gmail) se agregan desde la UI.

## Mapa del código (`apps_script/`)
| Archivo | Qué hace |
|---|---|
| `Config.gs` | Constantes, nombres de propiedades, fuentes, límites (`DAILY_LIMIT`, `CV_*`, `ATS_*`). |
| `Search.gs`, `Fuentes.gs`, `Personalization.gs` | Fase 1: fuentes (SerpAPI 1×/día, Remotive, Get on Board, Jobicy, Himalayas, JobSpy de Actions, ATS de empresas, alertas de Gmail, Apify), filtros, dedupe, nivel, Match Score y prioridad. |
| `Workspace.gs`, `Main.gs` | Fase 2: carpeta `Sin revisar/<fecha>/<Empresa>` + `Detalle_Vacante`, fila en `Hoja 1`; presupuestos de tiempo de la corrida. |
| `CV.gs` | Fase 3: valida `CV_IA.json` (contrato, anti-alucinación, personalización, ATS, huellas), llena `MASTER_TEMPLATE`, aparta descartadas/dudosas, borrador si hay correo. Mira hoy + 2 días cada 10 min y 7 días una vez por hora; también `HV a pedido/`. |
| `Ats.gs` | Medidor ATS determinista: términos literales de la vacante vs. HV vs. `CONTEXTO_CV`, `ATS.txt` en cada carpeta, herramientas no respaldadas. |
| `ColdEmail.gs` | Correos en frío desde `Correos.json` (+ HV desde `CV_IA.json`), seguimiento a los 8–30 días. Solo borradores. |
| `Applied.gs` | `sincronizarAplicadas`: `Aplicadas`, `Por enviar`, `Dudosas`, **`Tanda IA`** (memoria compartida de los agentes: cola de trabajo con ids y términos ATS), PDF de HV, colores, calidad por fuente. |
| `Dashboard.gs`, `Acciones.gs`, `Agentes.gs` | API del tablero, juego y oficina (`doGet`, clave `&k=`/`&e=`), acciones con confirmación, modelo de agentes. |
| `EnvioProgramado.gs` | La única excepción de envío (ver regla 1). |
| `Setup.gs` | `configurarAgente`: carpetas, hoja, plantilla y activadores (idempotente). |
| `dashboard.html`, `juego.html`, `oficina.html` | Tablero del coach, juego laboral y oficina de agentes (GitHub Pages desde `deploy`). |

Otros: `tools/jobspy_buscar.py` + `.github/workflows/jobspy.yml` (Indeed, LinkedIn público y elempleo en Actions → rama `datos`).

## Paso de IA: un solo creador por papel
- **Equipo** (`.claude/agents/`, diseño en `docs/MULTIAGENTE.md`): `jefe` (skill) coordina; `inspector` (`verificar-vacante`), `escriba` (`crear-hv`, **único creador de HV en 3 modos: vacante, empresa en frío, HV general/a pedido**), `editor` (`revisar-hv`), `cartero` (`correo-en-frio`), `exploradora` (`investigar-empresas`), `radio` (`seguimiento`), `vigia`, `constructor` (código, siempre por PR). Uno por papel y por tanda.
- **Contrato `CV_IA.json`** (igual para cualquier proveedor y modo): una clave por marcador de `MASTER_TEMPLATE` (`""` borra ese párrafo) + `_idioma`, `_keywords` (términos literales de la vacante), `_gaps`, `_mapa` (`{keyword, cita textual de CONTEXTO_CV, donde}`), `_nombre_archivo` (`HV_Oscar_Garcia_<Cargo>` en español, `CV_…` en inglés), `_correo_cuerpo`.
- **Archivos por carpeta:** `Detalle_Vacante` (o `Encargo` en `HV a pedido/`) → `Verificacion.txt` (`VEREDICTO: LISTA|MENOR_PRIORIDAD|DUDOSA|DESCARTAR`) → `CV_IA.json` → HV (Doc `HV_…`/`CV_…`) + `ATS.txt` → `Revision.txt`. Errores de validación en `CV_IA_ERRORES.txt`.
- **Memoria compartida** (`docs/MULTIAGENTE.md` §3b): el jefe lee la pestaña `Tanda IA` en vez de recorrer Drive; un agente por papel, nunca dos en paralelo; el jefe pasa URLs, no pega skills; lo calculable lo calcula Apps Script.
- **Prioridad de reglas de HV:** `LECCIONES_HV` > `REGLAS_CV` > `GUIA_CV`, salvo la excepción ATS de la regla 3.

## Drive (`Vacantes con IA/`)
`CV/<semana>/` (lo enviado, con color: rojo rechazo, verde en proceso, amarillo sin respuesta) · `Sin revisar/<fecha>/` (+ `Dudosas`, `Posts`) · `Correos en frío/` · `HV a pedido/` · `Recursos/` (docs privados, se buscan por nombre: no renombrar) · Sheet `Vacantes UX - Registro` (pestañas `Hoja 1`, `Aplicadas`, `Por enviar`, `Dudosas`, `Tanda IA`, `Correos en frío`, `Seguimiento`, `Empresas objetivo`, `Fuentes`, `Calidad por fuente`, `Agentes`).

## Documentos
`docs/POLITICA_OPERATIVA.md` (manda) · `docs/MULTIAGENTE.md` (equipo y bitácora) · `docs/REQUISITOS.md` (cada regla y dónde se comprueba) · `docs/HISTORIAL_TECNICO.md` (todas las decisiones) · `docs/ARQUITECTURA_INFORMACION.md` (entidades y JSON del tablero) · `docs/JUEGO_LABORAL.md` · `docs/RECUPERACION_IA.md` · `INSTALACION.md`.

## Comandos (obligatorios antes de push)
```bash
node tests/apps_script.test.js && node tests/juego.test.js && node tests/oficina.test.js && python3 tests/jobspy_test.py
```
No hay ejecución local de Apps Script: los servicios de Google solo existen en script.google.com.
