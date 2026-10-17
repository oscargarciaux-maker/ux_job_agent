import os
import io
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from dotenv import load_dotenv

load_dotenv()

SCOPES = [
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/drive'
]

class GoogleDocsService:
    def __init__(self):
        self.master_template_id = os.getenv("GOOGLE_DOCS_MASTER_TEMPLATE_ID")
        credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "credentials.json")
        
        creds = Credentials.from_service_account_file(credentials_path, scopes=SCOPES)
        self.drive_service = build('drive', 'v3', credentials=creds)
        self.docs_service = build('docs', 'v1', credentials=creds)

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
            body=body
        ).execute()
        
        return copied_file.get('id')

    def replace_placeholders(self, doc_id: str, replacements: dict):
        """
        Reemplaza de forma quirúrgica las etiquetas (ej. {{EMPRESA}}, {{RESUMEN}})
        en el documento clonado usando la API de Google Docs.
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

        body = {'requests': requests}
        self.docs_service.documents().batchUpdate(
            documentId=doc_id,
            body=body
        ).execute()

    def export_doc_to_pdf(self, doc_id: str, target_folder_id: str, pdf_filename: str) -> str:
        """
        Exporta el Google Doc personalizado directamente a formato PDF
        y lo guarda en la carpeta de la vacante.
        """
        # Solicitar exportación a PDF
        request = self.drive_service.files().export_media(
            fileId=doc_id,
            mimeType='application/pdf'
        )
        
        # Descargar el contenido binario
        fh = io.BytesIO()
        downloader = MediaIoBaseDownload(fh, request)
        done = False
        while not done:
            status, done = downloader.next_chunk()

        fh.seek(0)

        # Crear los metadatos para guardar el PDF en la carpeta destino
        file_metadata = {
            'name': pdf_filename,
            'mimeType': 'application/pdf',
            'parents': [target_folder_id]
        }
        
        from googleapiclient.http import MediaIoBaseUpload
        media = MediaIoBaseUpload(fh, mimetype='application/pdf', resumable=True)
        
        pdf_file = self.drive_service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id'
        ).execute()

        return pdf_file.get('id')

if __name__ == "__main__":
    try:
        docs_manager = GoogleDocsService()
        print("Módulo de Google Docs y exportación a PDF inicializado correctamente.")
    except Exception as e:
        print(f"Error al inicializar Google Docs Service: {e}")
