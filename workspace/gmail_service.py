import os
import sys
import base64
import html
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from dotenv import load_dotenv

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from workspace.auth import build_service

load_dotenv()

_EMAIL_TEMPLATES = {
    "es": {
        "subject": "Postulación: {cargo} - {empresa}",
        "body": ("Hola,\n\n"
                 "Les escribo para postularme a la vacante de {cargo} en {empresa}. "
                 "Soy Diseñador Industrial con enfoque en UX/UI, sistemas de diseño e investigación con usuarios.\n\n"
                 "Adjunto mi hoja de vida para su consideración. Quedo atento a cualquier información adicional.\n\n"
                 "Saludos cordiales,"),
    },
    "en": {
        "subject": "Application: {cargo} - {empresa}",
        "body": ("Hello,\n\n"
                 "I am writing to apply for the {cargo} position at {empresa}. "
                 "I am an Industrial Designer focused on UX/UI, design systems and user research.\n\n"
                 "Please find my CV attached. I look forward to hearing from you.\n\n"
                 "Best regards,"),
    },
}


def build_application_email(vacancy: dict, language: str) -> tuple:
    """Retorna (subject, body_text) en el idioma de la vacante."""
    template = _EMAIL_TEMPLATES["en" if language == "en" else "es"]
    values = {
        "cargo": vacancy.get("title") or "UX/UI Designer Junior",
        "empresa": vacancy.get("company") or ("your company" if language == "en" else "su empresa"),
    }
    return template["subject"].format(**values), template["body"].format(**values)


class GmailDraftService:
    """
    Servicio de Gmail restringido a borradores (HITL).
    Solo expone users.drafts.create; no existe ningún método de envío en este módulo.
    """

    def __init__(self):
        self.service = build_service('gmail', 'v1')

    @staticmethod
    def _to_html(body_text: str) -> str:
        paragraphs = "".join(
            f"<p>{html.escape(p).replace(chr(10), '<br>')}</p>" for p in body_text.split("\n\n")
        )
        return f'<div style="font-family: Arial, Helvetica, sans-serif;">{paragraphs}</div>'

    def create_application_draft(self, recipient_email: str, subject: str, body_text: str,
                                 pdf_bytes: bytes = None, pdf_filename: str = None) -> dict:
        """
        Crea un Borrador de correo en Gmail con el CV en PDF adjunto.
        ESTRICTO HITL: NUNCA envía el correo directamente.
        """
        message = MIMEMultipart('mixed')
        message['to'] = recipient_email
        message['subject'] = subject

        # Cuerpo alternativo: texto plano + HTML con tipografía Sans Serif
        alternative = MIMEMultipart('alternative')
        alternative.attach(MIMEText(body_text, 'plain', 'utf-8'))
        alternative.attach(MIMEText(self._to_html(body_text), 'html', 'utf-8'))
        message.attach(alternative)

        if pdf_bytes:
            filename = pdf_filename or "CV.pdf"
            part = MIMEApplication(pdf_bytes, _subtype='pdf', Name=filename)
            part['Content-Disposition'] = f'attachment; filename="{filename}"'
            message.attach(part)

        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')

        # Guardar únicamente como borrador (users.drafts.create)
        draft = self.service.users().drafts().create(
            userId='me',
            body={'message': {'raw': raw_message}}
        ).execute()

        print(f"   Borrador creado en Gmail (ID: {draft.get('id')}). Pendiente de revisión manual.")
        return draft

if __name__ == "__main__":
    try:
        gmail_manager = GmailDraftService()
        print("Módulo de Gmail Draft Service inicializado correctamente.")
    except Exception as e:
        print(f"Error al inicializar Gmail Draft Service: {e}")
