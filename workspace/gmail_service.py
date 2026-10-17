import os
import base64
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from dotenv import load_dotenv

load_dotenv()

SCOPES = ['https://www.googleapis.com/auth/gmail.compose']

class GmailDraftService:
    def __init__(self):
        credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "credentials.json")
        creds = Credentials.from_service_account_file(credentials_path, scopes=SCOPES)
        # Se requiere delegación de usuario para cuentas de Workspace o cuenta personal asociada
        self.service = build('gmail', 'v1', credentials=creds)

    def create_application_draft(self, recipient_email: str, subject: str, body_text: str, pdf_bytes: bytes, pdf_filename: str) -> dict:
        """
        Crea un Borrador de correo en Gmail con el CV en PDF adjunto.
        ESTRICTO HITL: NUNCA envía el correo directamente.
        """
        # Crear estructura MIME multipart
        message = MIMEMultipart()
        message['to'] = recipient_email
        message['subject'] = subject

        # Agregar cuerpo en texto plano / Sans Serif por defecto
        msg_text = MIMEText(body_text, 'plain', 'utf-8')
        message.attach(msg_text)

        # Adjuntar el archivo PDF si se proporciona
        if pdf_bytes:
            part = MIMEApplication(pdf_bytes, Name=pdf_filename)
            part['Content-Disposition'] = f'attachment; filename="{pdf_filename}"'
            message.attach(part)

        # Codificar el mensaje en Base64 URL-safe para la API de Gmail
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
        draft_body = {'message': {'raw': raw_message}}

        # Guardar únicamente como borrador
        draft = self.service.users().drafts().create(
            userId='me',
            body=draft_body
        ).execute()

        print(f"Borrador creado exitosamente en Gmail (ID de borrador creado).")
        return draft

if __name__ == "__main__":
    try:
        gmail_manager = GmailDraftService()
        print("Módulo de Gmail Draft Service inicializado correctamente.")
    except Exception as e:
        print(f"Error al inicializar Gmail Draft Service: {e}")
