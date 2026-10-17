import os
import io
import re
import sys
from googleapiclient.http import MediaIoBaseDownload, MediaIoBaseUpload
from dotenv import load_dotenv

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from workspace.auth import build_service

load_dotenv()

# Palabras funcionales para detección determinista de idioma (0 tokens de LLM)
_ES_WORDS = {"el", "la", "los", "las", "de", "del", "y", "en", "para", "con", "por", "una", "un",
             "que", "experiencia", "diseñador", "diseño", "buscamos", "empresa", "conocimientos"}
_EN_WORDS = {"the", "and", "of", "to", "for", "with", "in", "a", "an", "we", "you", "your",
             "experience", "designer", "design", "looking", "skills", "team", "role"}

# Áreas de enfoque respaldadas por el perfil maestro (CLAUDE.md). No se agregan habilidades fuera de esta lista.
_FOCUS_AREAS = {
    "design_systems": {
        "keywords": ["design system", "sistema de diseño", "sistemas de diseño", "componentes", "components", "ui kit"],
        "es": "Sistemas de diseño",
        "en": "Design systems",
    },
    "ux_decisions": {
        "keywords": ["ux", "experiencia de usuario", "user experience", "usabilidad", "usability", "flujos", "flows"],
        "es": "Toma de decisiones UX",
        "en": "UX decision-making",
    },
    "research": {
        "keywords": ["research", "investigación", "entrevistas", "interviews", "testing", "pruebas con usuarios"],
        "es": "UX Research",
        "en": "UX Research",
    },
}

# Textos base fieles al perfil: egresado de Diseño Industrial con enfoque UX/UI Junior.
_SUMMARY = {
    "es": ("Diseñador Industrial con enfoque en UX/UI, interesado en aportar a {empresa} como {cargo}. "
           "Mi formación en diseño industrial me da bases sólidas en metodología centrada en el usuario, "
           "prototipado e iteración, que aplico a sistemas de diseño, decisiones UX e investigación con usuarios. "
           "Aprendo rápido nuevas herramientas y procesos."),
    "en": ("Industrial Designer focused on UX/UI, interested in joining {empresa} as {cargo}. "
           "My industrial design background gives me a user-centered methodology, prototyping and iteration "
           "skills, which I apply to design systems, UX decisions and user research. "
           "I learn new tools and processes quickly."),
}


def detect_language(text: str) -> str:
    """Retorna 'en' o 'es' contando palabras funcionales. Empate -> 'es'."""
    words = re.findall(r"[a-záéíóúñü]+", (text or "").lower())
    es_score = sum(1 for w in words if w in _ES_WORDS)
    en_score = sum(1 for w in words if w in _EN_WORDS)
    return "en" if en_score > es_score else "es"


def build_cv_replacements(vacancy: dict, language: str) -> dict:
    """
    Motor de personalización determinista: arma los valores de los {{PLACEHOLDERS}}
    usando solo datos de la vacante y del perfil maestro (sin inventar experiencia).
    """
    company = vacancy.get("company") or ("the company" if language == "en" else "la empresa")
    title = vacancy.get("title") or "UX/UI Designer Junior"
    haystack = f"{vacancy.get('title', '')} {vacancy.get('snippet', '')} {vacancy.get('description', '')}".lower()

    matched = [area[language] for area in _FOCUS_AREAS.values()
               if any(k in haystack for k in area["keywords"])]
    # Si la vacante no menciona ninguna, se listan todas las áreas reales del perfil
    focus = matched or [area[language] for area in _FOCUS_AREAS.values()]

    return {
        "EMPRESA": company,
        "CARGO": title,
        "RESUMEN": _SUMMARY[language].format(empresa=company, cargo=title),
        "ENFOQUE": " · ".join(focus),
    }


class GoogleDocsService:
    def __init__(self):
        self.master_template_id = os.getenv("GOOGLE_DOCS_MASTER_TEMPLATE_ID")
        if not self.master_template_id:
            raise ValueError("No se encontró GOOGLE_DOCS_MASTER_TEMPLATE_ID en las variables de entorno.")
        self.drive_service = build_service('drive', 'v3')
        self.docs_service = build_service('docs', 'v1')

    def clone_template_for_vacancy(self, target_folder_id: str, new_file_title: str) -> str:
        """
        Duplica la plantilla maestra de CV dentro de la carpeta específica de la vacante
        y retorna el ID del nuevo documento Google Doc.
        """
        body = {
            'name': new_file_title,
            'parents': [target_folder_id]
        }

        copied_file = self.drive_service.files().copy(
            fileId=self.master_template_id,
            body=body,
            fields='id'
        ).execute()

        return copied_file.get('id')

    def replace_placeholders(self, doc_id: str, replacements: dict):
        """
        Reemplaza de forma quirúrgica las etiquetas (ej. {{EMPRESA}}, {{RESUMEN}})
        en el documento clonado con un único batchUpdate.
        """
        requests = []
        for key, value in replacements.items():
            placeholder = f"{{{{{key}}}}}"
            requests.append({
                'replaceAllText': {
                    'containsText': {
                        'text': placeholder,
                        'matchCase': True
                    },
                    'replaceText': str(value)
                }
            })

        if not requests:
            return

        self.docs_service.documents().batchUpdate(
            documentId=doc_id,
            body={'requests': requests}
        ).execute()

    def create_tailored_cv(self, vacancy: dict, target_folder_id: str) -> dict:
        """
        Flujo completo de la Fase 3: detecta idioma, clona la plantilla y reemplaza placeholders.
        Retorna {'doc_id', 'language', 'replacements'}.
        """
        language = detect_language(f"{vacancy.get('title', '')} {vacancy.get('snippet', '')} {vacancy.get('description', '')}")
        replacements = build_cv_replacements(vacancy, language)
        doc_title = f"CV_{vacancy.get('company', 'Empresa')}_{language.upper()}"
        doc_id = self.clone_template_for_vacancy(target_folder_id, doc_title)
        self.replace_placeholders(doc_id, replacements)
        return {'doc_id': doc_id, 'language': language, 'replacements': replacements}

    def export_doc_to_pdf(self, doc_id: str, target_folder_id: str, pdf_filename: str) -> tuple:
        """
        Exporta el Google Doc personalizado a PDF, lo guarda en la carpeta de la vacante
        y retorna (pdf_file_id, pdf_bytes) para poder adjuntarlo al borrador de Gmail.
        """
        request = self.drive_service.files().export_media(
            fileId=doc_id,
            mimeType='application/pdf'
        )

        fh = io.BytesIO()
        downloader = MediaIoBaseDownload(fh, request)
        done = False
        while not done:
            _, done = downloader.next_chunk()

        pdf_bytes = fh.getvalue()

        file_metadata = {
            'name': pdf_filename,
            'mimeType': 'application/pdf',
            'parents': [target_folder_id]
        }
        media = MediaIoBaseUpload(io.BytesIO(pdf_bytes), mimetype='application/pdf', resumable=True)

        pdf_file = self.drive_service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id'
        ).execute()

        return pdf_file.get('id'), pdf_bytes

if __name__ == "__main__":
    try:
        docs_manager = GoogleDocsService()
        print("Módulo de Google Docs y exportación a PDF inicializado correctamente.")
    except Exception as e:
        print(f"Error al inicializar Google Docs Service: {e}")
