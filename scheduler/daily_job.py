import os
import sys
from datetime import datetime
from dotenv import load_dotenv

# Añadir la raíz del proyecto al path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from scraper.serpapi_client import LinkedInSerpApiClient
from workspace.sheets_service import GoogleSheetsService
from workspace.drive_service import GoogleDriveService
from workspace.docs_service import GoogleDocsService
from workspace.gmail_service import GmailDraftService

load_dotenv()

def run_daily_pipeline():
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] --- Iniciando Pipeline Diario de Vacantes ---")

    # 1. Búsqueda con SerpAPI
    print("\n1. Buscando vacantes en LinkedIn...")
    try:
        scraper = LinkedInSerpApiClient()
        raw_vacancies = scraper.search_junior_ux_jobs()
        print(f"   Vacantes encontradas preliminarmente: {len(raw_vacancies)}")
    except Exception as e:
        print(f"   Error al buscar vacantes con SerpAPI: {e}")
        return

    # 2. Deduplicación contra Google Sheets
    print("\n2. Filtrando vacantes duplicadas en Google Sheets...")
    try:
        sheets_service = GoogleSheetsService()
        new_vacancies = sheets_service.filter_new_vacancies(raw_vacancies)
        print(f"   Vacantes nuevas para procesar: {len(new_vacancies)}")
    except Exception as e:
        print(f"   Error al conectar con Google Sheets: {e}")
        return

    if not new_vacancies:
        print("   No hay vacantes nuevas el día de hoy. Pipeline finalizado.")
        return

    # Inicializar servicios de Google Workspace
    drive_service = GoogleDriveService()
    docs_service = GoogleDocsService()
    gmail_service = GmailDraftService()

    # Processar cada vacante nueva
    for idx, vacancy in enumerate(new_vacancies[:10], start=1):  # Límite diario de 10 vacantes
        title = vacancy.get('title', 'Vacante UX/UI')
        company = vacancy.get('company', 'Empresa')
        link = vacancy.get('link')

        print(f"\n--- Procesando ({idx}/{len(new_vacancies[:10])}): {title} ---")

        # 3. Crear carpetas en Google Drive
        try:
            folder_id = drive_service.setup_vacancy_folder(company, title)
            print(f"   Carpeta creada en Drive para: {company}")
        except Exception as e:
            print(f"   Error al crear carpeta en Drive: {e}")
            continue

        # 4. Personalizar CV en Google Docs y exportar PDF
        try:
            doc_title = f"CV_Personalizado_{company}"
            doc_id = docs_service.clone_template_for_vacancy(folder_id, doc_title)
            
            # Reemplazar Placeholders básicos
            replacements = {
                "EMPRESA": company,
                "CARGO": title,
                "PERFIL_PERSONALIZADO": "Diseñador UX/UI Junior enfocado en sistemas de diseño y research."
            }
            docs_service.replace_placeholders(doc_id, replacements)
            
            pdf_filename = f"CV_UXUI_Junior_{company}.pdf"
            pdf_id = docs_service.export_doc_to_pdf(doc_id, folder_id, pdf_filename)
            print(f"   CV personalizado y PDF generado correctamente.")
        except Exception as e:
            print(f"   Error al generar CV en Google Docs: {e}")
            continue

        # 5. Registrar en Google Sheets
        try:
            vacancy_data = {
                'date': datetime.now().strftime("%Y-%m-%d"),
                'company': company,
                'title': title,
                'link': link,
                'match_score': 85  # Score base de ejemplo
            }
            sheets_service.append_vacancy_row(vacancy_data)
            print(f"   Registrado en Google Sheets con estado 'Pendiente'.")
        except Exception as e:
            print(f"   Error al registrar en Google Sheets: {e}")

        # 6. Borrador en Gmail (si hay correo directo de reclutador)
        # Nota: La creación del borrador final depende de si existe correo directo en la oferta.
        print("   Preparado para revisión y creación de borrador.")

    print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] --- Pipeline Diario Finalizado Con Éxito ---")

if __name__ == "__main__":
    run_daily_pipeline()
