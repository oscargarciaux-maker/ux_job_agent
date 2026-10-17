import os
import sys
from dotenv import load_dotenv

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from workspace.auth import build_service

load_dotenv()

class GoogleSheetsService:
    def __init__(self):
        self.sheet_id = os.getenv("GOOGLE_SHEET_ID")
        # Autenticación OAuth 2.0 compartida (workspace/auth.py)
        self.service = build_service('sheets', 'v4')
        self.sheet = self.service.spreadsheets()

    def get_existing_urls(self) -> set:
        """
        Obtiene todas las URLs ya registradas en el Google Sheet para evitar duplicados.
        Las URLs están en la columna D (formato de append_vacancy_row: Fecha, Empresa, Cargo, Link, ...).
        """
        try:
            # Lee la columna D (Link) desde la fila 2 en adelante
            result = self.sheet.values().get(
                spreadsheetId=self.sheet_id,
                range="Hoja 1!D2:D"
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
