import os
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from dotenv import load_dotenv

load_dotenv()

SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

class GoogleSheetsService:
    def __init__(self):
        self.sheet_id = os.getenv("GOOGLE_SHEET_ID")
        credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "credentials.json")
        
        # Autenticación con Google Cloud
        creds = Credentials.from_service_account_file(credentials_path, scopes=SCOPES)
        self.service = build('sheets', 'v4', credentials=creds)
        self.sheet = self.service.spreadsheets()

    def get_existing_urls(self) -> set:
        """
        Obtiene todas las URLs ya registradas en el Google Sheet para evitar duplicados.
        Asume que las URLs se encuentran en la columna de enlaces (ej. Columna B).
        """
        try:
            # Lee la columna B desde la fila 2 en adelante (ajustable según tu diseño de Sheet)
            result = self.sheet.values().get(
                spreadsheetId=self.sheet_id,
                range="Hoja 1!B2:B1000"
            ).execute()
            rows = result.get('values', [])
            # Aplana la lista de filas en un conjunto (set) para búsqueda rápida O(1)
            return {row[0] for row in rows if row}
        except Exception as e:
            print(f"Advertencia al leer el Sheet (puede estar vacío): {e}")
            return set()

    def filter_new_vacancies(self, vacancies: list) -> list:
        """
        Filtra la lista de vacantes descartando aquellas cuya URL ya exista en el Sheet.
        """
        existing_urls = self.get_existing_urls()
        new_vacancies = [v for v in vacancies if v['link'] not in existing_urls]
        return new_vacancies

    def append_vacancy_row(self, vacancy_data: dict):
        """
        Inserta una nueva fila con la vacante procesada, Match Score y estado Pendiente.
        Formato esperado de vacancy_data: [Fecha, Empresa, Cargo, Link, MatchScore, Estado]
        """
        body = {
            'values': [[
                vacancy_data.get('date'),
                vacancy_data.get('company', 'N/D'),
                vacancy_data.get('title'),
                vacancy_data.get('link'),
                vacancy_data.get('match_score', 0),
                'Pendiente'
            ]]
        }
        
        self.sheet.values().append(
            spreadsheetId=self.sheet_id,
            range="Hoja 1!A:F",
            valueInputOption="USER_ENTERED",
            body=body
        ).execute()

if __name__ == "__main__":
    # Prueba manual básica (requiere credenciales y GOOGLE_SHEET_ID configurados)
    try:
        sheets_manager = GoogleSheetsService()
        urls = sheets_manager.get_existing_urls()
        print(f"Conexión exitosa con Google Sheets. URLs existentes registradas: {len(urls)}")
    except Exception as e:
        print(f"Error en la prueba de Sheets (verifica tus credenciales o IDs): {e}")
