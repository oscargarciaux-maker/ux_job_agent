import os
from datetime import datetime
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from dotenv import load_dotenv

load_dotenv()

SCOPES = ['https://www.googleapis.com/auth/drive']

class GoogleDriveService:
    def __init__(self):
        self.root_folder_id = os.getenv("GOOGLE_DRIVE_ROOT_FOLDER_ID")
        credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "credentials.json")
        
        creds = Credentials.from_service_account_file(credentials_path, scopes=SCOPES)
        self.service = build('drive', 'v3', credentials=creds)

    def create_folder(self, folder_name: str, parent_id: str = None) -> str:
        """
        Crea una carpeta en Google Drive y retorna su ID.
        """
        if not parent_id:
            parent_id = self.root_folder_id

        file_metadata = {
            'name': folder_name,
            'mimeType': 'application/vnd.google-apps.folder',
            'parents': [parent_id]
        }
        
        folder = self.service.files().create(body=file_metadata, fields='id').execute()
        return folder.get('id')

    def setup_vacancy_folder(self, company_name: str, job_title: str) -> str:
        """
        Crea la jerarquía diaria para la vacante:
        Carpeta raíz -> Fecha actual (YYYY-MM-DD) -> [Empresa]_[Cargo]
        """
        today_str = datetime.now().strftime("%Y-%m-%d")
        
        # 1. Buscar o crear carpeta del día actual dentro de la raíz
        query = f"name = '{today_str}' and mimeType = 'application/vnd.google-apps.folder' and '{self.root_folder_id}' in parents and trashed = false"
        results = self.service.files().list(q=query, spaces='drive', fields='files(id, name)').execute()
        files = results.get('files', [])

        if files:
            date_folder_id = files[0]['id']
        else:
            date_folder_id = self.create_folder(today_str, self.root_folder_id)

        # 2. Crear la subcarpeta específica para la vacante
        safe_company = company_name.replace("/", "_")
        safe_title = job_title.replace("/", "_")
        vacancy_folder_name = f"{safe_company}_{safe_title}"
        
        vacancy_folder_id = self.create_folder(vacancy_folder_name, date_folder_id)
        return vacancy_folder_id

if __name__ == "__main__":
    # Prueba rápida del servicio de Drive
    try:
        drive_manager = GoogleDriveService()
        print("Conexión con Google Drive establecida correctamente.")
    except Exception as e:
        print(f"Error al conectar con Drive: {e}")
