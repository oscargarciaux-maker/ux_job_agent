cat << 'EOF' > CLAUDE.md
# CLAUDE.md - Agente Autónomo de Búsqueda de Empleo UX/UI

## 🎯 Propósito del Agente
Agente inteligente y modular diseñado para automatizar la búsqueda diaria de 10 vacantes de Diseñador UX/UI Junior (enfocado en sistemas de diseño, decisiones UX y research), filtrado por Match Score, organización en Google Drive, personalización de CVs basada en plantilla y creación de borradores en Gmail con supervisión humana estricta (HITL).

## 🛡️ Reglas Inquebrantables y Guardrails
1. **Human-in-the-Loop (HITL):** NUNCA envíes correos ni postulaciones automáticamente. Todos los correos de contacto deben generarse exclusivamente como **Borradores en Gmail** (`users.drafts.create`).
2. **Anti-Alucinación Estricta:** Prohibido inventar experiencia previa, herramientas o tecnologías no respaldadas por el perfil maestro del usuario (egresado de Diseño Industrial). Ante vacantes con tecnologías ausentes, enfatizar habilidades transferibles y capacidad de aprendizaje.
3. **Regla de Idioma:** 
   - Vacante en Español -> CV y correo en Español.
   - Vacante en Inglés -> CV y correo en Inglés (respetando nivel de inglés limitado real).
4. **Eficiencia Extrema de Tokens:** La deduplicación y el filtrado inicial se realizan mediante scripts deterministas en Python contra Google Sheets **antes** de invocar al LLM ($0$ tokens gastados en vacantes repetidas o descartadas).

## 🏗️ Arquitectura Modular (4 Fases)
- **Fase 1 (Búsqueda y Match):** Ingesta diaria a las 8:00 AM mediante SerpAPI (Google Dorking en LinkedIn para ofertas y posts orgánicos de reclutadores de < 2 semanas), cálculo de Match Score y verificación de duplicados en Google Sheets.
- **Fase 2 (Google Drive):** Creación jerárquica de carpetas (`/Vacantes con IA/YYYY-MM-DD/[Empresa]_[Cargo]`) y almacenamiento del archivo `Detalle_Vacante.gdoc`.
- **Fase 3 (Personalización de CV & PDF):** Duplicación de la Master Template de Google Docs, reemplazo quirúrgico de `{{PLACEHOLDERS}}` según la guía de redacción y exportación automática a PDF.
- **Fase 4 (Gmail & Cartas de Presentación):** Creación del borrador de correo en Gmail (con tipografía Sans Serif predeterminada y PDF adjunto) cuando exista correo directo, y soporte interactivo para redactar Cartas de Presentación (*Cover Letter*).

## 🛠️ Comandos y Estructura del Proyecto
- Dependencias: `pip install -r requirements.txt`
- Ejecución del pipeline: `python scheduler/daily_job.py`
- Seguridad de Secretos: Los archivos `credentials.json`, `token.json` y carpetas `.env` están strictly bloqueados por `.gitignore` y nunca deben subirse a GitHub.
EOF
