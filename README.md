[implementation_plan.md](https://github.com/user-attachments/files/33605766/implementation_plan.md)

# Plan Director Técnico: Agente Autónomo de Búsqueda de Empleo y Personalización de CVs (UX/UI Junior)

Plan director técnico integral y arquitectura de software para implementar con Claude Code, Model Context Protocol (MCP), Python y Google Workspace APIs un agente determinista y semántico de búsqueda de empleo diario, scoring, deduplicación en Google Sheets, organización en Google Drive, generación de CVs a la medida en Google Docs/PDF y creación de borradores en Gmail con supervisión humana estricta, portabilidad absoluta mediante repositorio de GitHub (`ux_job_agent`) y guardrails anti-alucinación.

## User Review & Critical Decisions

> [!IMPORTANT]
> Decisiones de diseño y operativas confirmadas para la implementación:

- **Confirmed Decision 1 (Portabilidad Total y Repositorio GitHub `ux_job_agent`)**: Todo el código fuente del agente residirá en un repositorio Git versionado con portabilidad agnóstica para cualquier LLM (Claude Code, Grok, etc.). Incluye:
  1. `CLAUDE.md` en la raíz con el contexto del perfil, normas de ejecución, comandos y estándares de codificación.
  2. `.gitignore` estricto de nivel industrial para garantizar que nunca se filtren `credentials.json`, tokens OAuth (`token.json`), llaves de servicio ni variables `.env`.
  3. Flujo paso a paso de comandos de inicialización y sincronización con GitHub (`git init`, `git remote add origin`, `git push -u origin main`).
- **Confirmed Decision 2 (Entorno de la Aplicación)**: Se construirá un **Interactive Agent Studio** completo en la web app que contiene el visor del Blueprint / README.md técnico detallado con descarga directa, el configurador interactivo de credenciales de Google Cloud, el visualizador de arquitectura MCP, simuladores funcionales para cada una de las 4 fases (Dorking + Match Score, Drive Tree, CV Template Replacer con Guardrail Validator y Gmail Draft Preview) y exportador de código del repositorio.
- **Confirmed Decision 3 (Motor de Búsqueda)**: Priorización de **SerpAPI con Google Dorking especializado sobre LinkedIn** (para ofertas publicadas y posts orgánicos de reclutadores en las últimas 2 semanas), neutralizando captchas y bloqueos antibot, con fallback determinista.
- **Confirmed Decision 4 (Orquestación LLM)**: Arquitectura centrada en **Claude Code CLI asistido por Model Context Protocol (MCP)** y scripts modulares en Python con soporte de **Prompt Caching** (Anthropic API / Claude 3.5 Sonnet) para reutilizar perfil maestro y guías de redacción con costo de tokens mínimo.
- **Confirmed Decision 5 (Supervisión Humana Obligatoria - HITL)**: Cero envíos automáticos. Los correos quedan exclusivamente como `Borradores` en Gmail y las postulaciones quedan en estado `Pendiente` en Google Sheets para aprobación y confirmación explícita del usuario.
- **Confirmed Decision 6 (Guardrails de Veracidad Absoluta)**: Prohibición total de inventar cargos, herramientas o métricas no presentes en el perfil maestro del diseñador. Si una vacante requiere competencias ausentes, el agente enfatiza habilidades transferibles de diseño industrial y capacidad de aprendizaje rápido, sin falsear hechos.

---

## 1. Overview & Core Concept

- **Qué es**: Un sistema agéntico integral y modular concebido para vivir en un repositorio de GitHub (`ux_job_agent`) que automatiza la búsqueda, filtrado, scoring, catalogación, generación de currículums en PDF y redacción de borradores de correo para un Diseñador UX/UI Junior recién egresado en Colombia (Bogotá/Medellín).
- **Público Objetivo**: Diseñador UX/UI Junior (con background en Diseño Industrial, fuerte enfoque en sistemas de diseño, decisiones UX y UX Research), con español nativo e inglés limitado.
- **Valor Principal**: Transforma un proceso manual agotador de 3 a 4 horas diarias en una rutina autónoma matutina (8:00 AM) de 0 tokens desperdiciados en vacantes repetidas, generando 10 ofertas de alto match, CVs personalizados en Google Docs/PDF fieles a la realidad y borradores de contacto listos para revisión y envío manual, con portabilidad inmediata a cualquier entorno de desarrollo vía GitHub y Claude Code.

---

## 2. User Experience & Visual Design

### A. Key User Flows en el Interactive Agent Studio
1. **Blueprint & Technical README Explorer**:
   - Navegación lateral estructurada por capítulos: Introducción & Anatomía, Configuración de GitHub & Seguridad de Secretos, Configuración Google Cloud & OAuth/Service Account, Estructura del Repositorio (4 fases), Prompts & Caching, y Protocolo de Pruebas.
   - Búsqueda en tiempo real por palabra clave, visualizador con sintaxis resaltada y botón de descarga directa de `README.md`, `CLAUDE.md`, `.gitignore`, `.env.example` y `requirements.txt`.
2. **GitHub Portability & CLI Setup Panel**:
   - Guía interactiva de versionamiento (`git init`, ramas, remotos, `.gitignore` validation check).
   - Generador y visor interactivo de `CLAUDE.md` con las directivas del agente para Claude Code.
3. **Google Cloud & Credentials Wizard**:
   - Asistente paso a paso visual e interactivo para crear el proyecto en GCP, habilitar las 4 APIs (Drive, Docs, Sheets, Gmail) 100% gratis, configurar la pantalla de consentimiento OAuth y descargar `credentials.json`.
   - Generador interactivo de URLs/IDs de Drive, Sheet y Docs para el asistente CLI de Claude Code.
4. **Architecture & MCP Visualizer**:
   - Diagrama interactivo de componentes conectando: Cerebro (Claude Code / MCP Server), Manos (SerpAPI, Drive API, Docs API, Sheets API, Gmail API, PDF Exporter) y Memoria (Perfil Maestro, Guía de CV, Variantes).
5. **4-Phase Interactive Simulator & Workbench**:
   - *Fase 1 (Búsqueda & Match)*: Generador de queries Dorking en tiempo real para LinkedIn, calculadora interactiva de Match Score (Junior 100/Mid 70/Senior 30 + Ubicación/Idioma) y simulación de deduplicación contra Google Sheets.
   - *Fase 2 (Organización Drive)*: Árbol interactivo que replica `/Vacantes con IA/YYYY-MM-DD/[Empresa]_[Cargo]` y visualización de `Detalle_Vacante.gdoc`.
   - *Fase 3 (CV & Guardrails)*: Reemplazador dinámico de placeholders `{{RESUMEN}}`, `{{LOGROS_UX}}`, `{{SISTEMA_DISENO}}` con regla estricta de idioma (ES/EN) y validador de guardrail anti-alucinación que detecta discrepancias de habilidades no autorizadas.
   - *Fase 4 (Gmail Draft & Cover Letter)*: Previsualizador del borrador de correo con tipografía estándar de Gmail, adjunto PDF y generador interactivo de Carta de Presentación (*Cover Letter*) seleccionable para las vacantes del día.
6. **Codebase & Git Exporter**:
   - Módulo para inspeccionar y descargar el árbol de código completo del repositorio (`ux_job_agent/`), listo para clonar o importar.

### B. Visual Identity & Theme
- **Dirección Estética**: Consola moderna de ingeniería y diseño de producto, tipografía nítida y minimalismo sofisticado (Clean Slate/Industrial Studio).
- **Tipografía**: `Plus Jakarta Sans` para titulares y navegación, `Public Sans` para cuerpo de texto y explicaciones técnicas, y `JetBrains Mono` con `tabular-nums` para comandos CLI, Git, JSON, tablas y variables de entorno.
- **Paleta de Color**:
  - Lienzo: `#0F172A` (Slate oscuro) / `#F8FAFC` (Slate ultra claro) en modo claro/oscuro.
  - Superficies: `#1E293B` con bordes ultrafinos `border-slate-800` (modo oscuro) o bordes `border-slate-200` (modo claro).
  - Acentos funcionales: Azul Índigo (`#3B82F6` / `#2563EB`) para acciones primarias, Esmeralda (`#10B981`) para éxitos deterministas, Violeta Git (`#8B5CF6`) para control de versiones y portabilidad, Ámbar (`#F59E0B`) para confirmaciones de supervisión humana y Carmesí (`#EF4444`) para bloqueos de guardrail.
- **Sin Elementos Artificiales ("Zero-Slop")**: Sin gradientes violetas genéricos, sin badges en píldora apiladas, sin métricas inventadas y sin controles decorativos inoperantes.

---

## 3. Key Product Decisions & Trade-Offs

- **Portabilidad Absoluta en GitHub (`ux_job_agent`) y Archivo `CLAUDE.md`**:
  - *Decisión*: Centralizar el comportamiento del agente en un archivo `CLAUDE.md` estructurado en la raíz del repositorio y aislar las credenciales mediante un `.gitignore` estricto.
  - *Por qué*: Permite que cualquier desarrollador clone el repositorio en segundos y lance `claude` en terminal; Claude Code lee de forma nativa `CLAUDE.md` y adquiere inmediatamente todo el contexto del perfil, las reglas de guardrails, los comandos de testing y los esquemas de Google Workspace sin configuraciones redundantes.
- **Pipeline Híbrido en Dos Pasos (Determinista + Semántico)**:
  - *Decisión*: Ejecutar toda la fase de recolección de URLs, verificación de duplicados en Google Sheets, filtrado por fecha y scoring de reglas fijas en Python puro sin llamar a ningún LLM.
  - *Por qué*: Reduce el consumo de tokens a cero para vacantes ya vistas o descartadas por antigüedad/ubicación. El LLM solo se invoca para las 10 mejores ofertas seleccionadas.
- **SerpAPI + Google Dorking sobre LinkedIn**:
  - *Decisión*: En lugar de scraping directo de páginas de LinkedIn (que bloquea IPs y genera captchas agresivos), se utiliza SerpAPI para indexar posts orgánicos de reclutadores (`site:linkedin.com/posts "diseñador UX" OR "UX/UI" "Bogotá"`) y ofertas de empleo recientes de las últimas 2 semanas.
- **Prompt Caching para Eficiencia Máxima**:
  - *Decisión*: Estructurar los prompts de Claude Code / Anthropic API con bloques de contexto estáticos (Perfil Maestro, Guía de Redacción de CV, Criterios de Sistemas de Diseño) marcados con cache headers para procesar las 10 ofertas con una reducción del 90% en latencia y costo de tokens.

---

## 4. Technical Architecture & Data Strategy

### A. Diagrama de Arquitectura del Repositorio y del Agente

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        REPOSITORIO GITHUB: ux_job_agent                                │
│                                                                                        │
│   ├── CLAUDE.md            ◄─── Cerebro Operativo (Reglas de diseño, prompts y MCP)   │
│   ├── .gitignore           ◄─── Blindaje de seguridad (credentials.json, tokens, .env)│
│   ├── README.md            ◄─── Guía de instalación y arquitectura técnica             │
│   └── requirements.txt     ◄─── Dependencias (google-api-python-client, serpapi, etc.)│
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   CEREBRO DEL AGENTE                                   │
│            Claude Code CLI / Anthropic Claude 3.5 Sonnet (LLM Engine + MCP)            │
│       ┌────────────────────────────────────────────────────────────────────────┐       │
│       │                       Prompt Caching Layer                             │       │
│       │  [Perfil Maestro] · [Guía CV UX] · [Guardrails Anti-Alucinación]       │       │
│       └────────────────────────────────────────────────────────────────────────┘       │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
                   ┌───────────────────────┴───────────────────────┐
                   ▼                                               ▼
┌──────────────────────────────────────┐       ┌─────────────────────────────────────────┐
│     FASE 1: PIPELINE DETERMINISTA     │       │            MANOS (TOOLS / MCP)          │
│          (Python Script / 0 Tokens)  │       │                                         │
│ 1. SerpAPI (Dorking LinkedIn)        │       │ • Google Drive API (Crear carpetas)     │
│ 2. Deduplicación contra Sheet        │◄──────┤ • Google Sheets API (Lectura / Registro)│
│ 3. Match Scoring (Junior/Mid/Loc)    │       │ • Google Docs API (Reemplazo batch)     │
│ 4. Top 10 Vacantes Diarias (8:00 AM) │       │ • Drive Export (Docs -> PDF)            │
└──────────────────┬───────────────────┘       │ • Gmail API (Crear Drafts - NO Enviar)  │
                   │                           └─────────────────────────────────────────┘
                   ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                            EJECUCIÓN MODULAR EN LA NUBE                                │
│                                                                                        │
│  [FASE 2: Google Drive]    ──► /Vacantes con IA/YYYY-MM-DD/[Empresa]_[Cargo]/          │
│                                └── Detalle_Vacante.gdoc                                │
│                                                                                        │
│  [FASE 3: CV & PDF]        ──► Master Template Doc Cloned                              │
│                                ├── Reemplazo de {{PLACEHOLDERS}} (Sistemas UX/Diseño)  │
│                                ├── CV_[Nombre]_[Empresa].gdoc                          │
│                                └── CV_[Nombre]_[Empresa].pdf                           │
│                                                                                        │
│  [FASE 4: Gmail & Cover]   ──► Borrador en Gmail (Draft) con PDF adjunto               │
│                                └── Espera interactiva para Cover Letter opcional       │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### B. Especificación de Seguridad de Secretos (`.gitignore`)
El archivo `.gitignore` estricto en la raíz del repositorio bloqueará explícitamente:
```gitignore
# Google Workspace Credentials & Tokens
credentials.json
token.json
token.pickle
service_account.json
*.pem

# Environment Secrets
.env
.env.local
.env.*.local

# Python Environments & Caches
__pycache__/
*.py[cod]
*$py.class
.venv/
env/
venv/
.pytest_cache/

# Local Output & Temp Artifacts
output/
tmp/
*.pdf
*.log
```

### C. Flujo de Inicialización y Comandos Git
```bash
# 1. Inicializar repositorio local
cd ux_job_agent
git init
git branch -M main

# 2. Configurar archivos y verificar .gitignore
git add .gitignore README.md CLAUDE.md requirements.txt .env.example
git commit -m "feat: initial commit - agent architecture, claude context and safe gitignore"

# 3. Vincular al repositorio remoto en GitHub
git remote add origin https://github.com/TU_USUARIO/ux_job_agent.git

# 4. Empujar el código a la rama principal
git add .
git commit -m "feat: complete 4-phase autonomous ux job agent pipeline"
git push -u origin main
```

### D. Estructura de Directorios del Repositorio de Código (`ux_job_agent`)

```
ux_job_agent/
├── CLAUDE.md                   # Instrucciones operativas y guías para Claude Code
├── README.md                   # Blueprint completo y manual de instalación
├── .gitignore                  # Blindaje estricto de secretos y credenciales
├── .env.example                # Plantilla de variables de entorno (claves y IDs)
├── requirements.txt            # Dependencias Python (google-api-python-client, serpapi, etc.)
├── credentials.json.example    # Ejemplo de estructura de credenciales Google Cloud
├── config/
│   ├── settings.py             # Configuración general y constantes de scoring
│   ├── master_profile.json     # Perfil maestro del diseñador (experiencia real y habilidades)
│   └── cv_writing_guide.md     # Guía metodológica para redacción de CVs optimizados
├── scraper/
│   ├── __init__.py
│   ├── dorking_queries.py      # Generador de dorks para LinkedIn (empleos y posts de reclutadores)
│   └── serpapi_client.py       # Cliente de búsqueda con filtro de tiempo (< 2 semanas)
├── workspace/
│   ├── __init__.py
│   ├── auth.py                 # Gestor de autenticación OAuth 2.0 y Service Account
│   ├── sheets_service.py       # Deduplicación y actualización de estado (menú desplegable)
│   ├── drive_service.py        # Creación jerárquica de carpetas y exportación a PDF
│   ├── docs_service.py         # Duplicación de plantilla y reemplazo por lotes
│   └── gmail_service.py        # Creación estricta de borradores (Drafts) con adjunto PDF
├── llm_engine/
│   ├── __init__.py
│   ├── prompts.py              # Prompts con soporte para Prompt Caching
│   ├── guardrails.py           # Validador de veracidad estricta y habilidades permitidas
│   └── cv_tailorer.py          # Lógica semántica de adaptación según idioma y vacante
└── scheduler/
    ├── daily_job.py            # Orquestador del flujo diario (8:00 AM)
    └── cli_assistant.py        # Asistente interactivo de configuración inicial
```

---

## 5. Protocolo de Pruebas y Validación Paso a Paso

1. **Test Portabilidad y Git Security**:
   - Ejecutar `git status` y verificar que archivos sensibles (`credentials.json`, `token.json`, `.env`) sean ignorados por Git.
   - Validar que `CLAUDE.md` sea reconocido al abrir la sesión en Claude Code.
2. **Test Fase 1 (Búsqueda y Deduplicación)**:
   - Simular ejecución con 15 URLs de prueba (5 ya existentes en el Sheet).
   - Verificar que las 5 duplicadas sean descartadas antes de llamar al LLM (0 llamadas API a Claude).
   - Validar que las 10 restantes reciban el scoring correcto según seniority (Junior 100 pts) y ubicación (Bogotá/Medellín 100 pts).
3. **Test Fase 2 (Carpetas en Drive)**:
   - Validar la creación de `/Vacantes con IA/YYYY-MM-DD/[Empresa]_[Cargo]` y la persistencia de `Detalle_Vacante.gdoc` con los metadatos completos.
4. **Test Fase 3 (CV y Guardrails Anti-Alucinación)**:
   - Probar con vacante en Español y vacante en Inglés para corroborar la regla estricta de idioma.
   - Ejecutar prueba de estrés de guardrail inyectando un requerimiento falso (ej. "Experiencia de 5 años en Kotlin"): el agente debe negarse a adjudicar dicha experiencia y adaptar la redacción a habilidades reales de prototipado o capacidad de aprendizaje.
   - Validar la exportación del Google Doc a archivo PDF en la misma carpeta.
5. **Test Fase 4 (Gmail Draft & Human-in-the-Loop)**:
   - Comprobar que el endpoint invocado sea estrictamente `users.drafts.create` y NUNCA `users.messages.send`.
   - Verificar que el PDF generado en la Fase 3 esté adjunto al borrador.
   - Validar el estado interactivo para redactar la Carta de Presentación a solicitud del usuario.
