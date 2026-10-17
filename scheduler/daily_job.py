import os
import re
import sys
import json
import argparse
from datetime import datetime
from dotenv import load_dotenv

# Añadir la raíz del proyecto al path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from workspace.docs_service import detect_language, build_cv_replacements
from workspace.gmail_service import build_application_email

load_dotenv()

DAILY_LIMIT = 10
SAMPLE_VACANCIES_PATH = os.path.join(os.path.dirname(__file__), 'sample_vacancies.json')
EMAIL_REGEX = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")


def log(message: str):
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {message}")


def extract_contact_email(vacancy: dict):
    """Correo directo del reclutador: campo explícito o primer email presente en el texto de la oferta."""
    if vacancy.get('contact_email'):
        return vacancy['contact_email']
    match = EMAIL_REGEX.search(f"{vacancy.get('snippet', '')} {vacancy.get('description', '')}")
    return match.group(0) if match else None


def load_vacancies(use_sample: bool) -> list:
    if use_sample:
        with open(SAMPLE_VACANCIES_PATH, encoding='utf-8') as f:
            return json.load(f)
    from scraper.serpapi_client import LinkedInSerpApiClient
    return LinkedInSerpApiClient().search_junior_ux_jobs()


def run_daily_pipeline(use_sample: bool = False, dry_run: bool = False):
    log("--- Iniciando Pipeline Diario de Vacantes ---")
    if dry_run:
        log("Modo DRY-RUN: no se realizan llamadas a Google Workspace.")

    # Fase 1a: Búsqueda (SerpAPI) o lectura de vacantes de prueba
    print("\n1. Obteniendo vacantes" + (" de prueba (sample_vacancies.json)..." if use_sample else " en LinkedIn (SerpAPI)..."))
    try:
        raw_vacancies = load_vacancies(use_sample)
        print(f"   Vacantes encontradas preliminarmente: {len(raw_vacancies)}")
    except Exception as e:
        print(f"   Error al obtener vacantes: {e}")
        return False

    # Fase 1b: Deduplicación determinista contra Google Sheets (antes de cualquier LLM)
    sheets_service = drive_service = docs_service = gmail_service = None
    if dry_run:
        new_vacancies = raw_vacancies
        print("\n2. [DRY-RUN] Deduplicación en Google Sheets omitida.")
    else:
        print("\n2. Filtrando vacantes duplicadas en Google Sheets...")
        try:
            from workspace.sheets_service import GoogleSheetsService
            sheets_service = GoogleSheetsService()
            new_vacancies = sheets_service.filter_new_vacancies(raw_vacancies)
            print(f"   Vacantes nuevas para procesar: {len(new_vacancies)}")
        except Exception as e:
            print(f"   Error al conectar con Google Sheets: {e}")
            return False

    if not new_vacancies:
        print("   No hay vacantes nuevas el día de hoy. Pipeline finalizado.")
        return True

    if not dry_run:
        try:
            from workspace.drive_service import GoogleDriveService
            from workspace.docs_service import GoogleDocsService
            from workspace.gmail_service import GmailDraftService
            drive_service = GoogleDriveService()
            docs_service = GoogleDocsService()
            gmail_service = GmailDraftService()
        except Exception as e:
            print(f"   Error al inicializar servicios de Google Workspace: {e}")
            return False

    batch = new_vacancies[:DAILY_LIMIT]
    for idx, vacancy in enumerate(batch, start=1):
        title = vacancy.get('title') or 'Vacante UX/UI'
        company = vacancy.get('company') or 'Empresa'
        link = vacancy.get('link')
        language = detect_language(f"{title} {vacancy.get('snippet', '')} {vacancy.get('description', '')}")
        contact_email = extract_contact_email(vacancy)

        print(f"\n--- Procesando ({idx}/{len(batch)}): {title} @ {company} [{language.upper()}] ---")

        if dry_run:
            replacements = build_cv_replacements(vacancy, language)
            subject, _ = build_application_email(vacancy, language)
            print(f"   [DRY-RUN] Carpeta Drive: /{datetime.now().strftime('%Y-%m-%d')}/{company}_{title}")
            print(f"   [DRY-RUN] Placeholders CV: {json.dumps(replacements, ensure_ascii=False)}")
            if contact_email:
                print(f"   [DRY-RUN] Borrador Gmail -> {contact_email} | Asunto: {subject}")
            else:
                print("   [DRY-RUN] Sin correo directo: no se crearía borrador.")
            continue

        # Fase 2: Carpeta en Google Drive
        try:
            folder_id = drive_service.setup_vacancy_folder(company, title)
            print(f"   Carpeta creada en Drive para: {company}")
        except Exception as e:
            print(f"   Error al crear carpeta en Drive: {e}")
            continue

        # Fase 3: CV personalizado (clonado + batchUpdate) y exportación a PDF
        try:
            cv = docs_service.create_tailored_cv(vacancy, folder_id)
            pdf_filename = f"CV_UXUI_Junior_{company}_{language.upper()}.pdf"
            _, pdf_bytes = docs_service.export_doc_to_pdf(cv['doc_id'], folder_id, pdf_filename)
            print(f"   CV personalizado ({language.upper()}) y PDF generado correctamente.")
        except Exception as e:
            print(f"   Error al generar CV en Google Docs: {e}")
            continue

        # Registro en Google Sheets
        try:
            sheets_service.append_vacancy_row({
                'date': datetime.now().strftime("%Y-%m-%d"),
                'company': company,
                'title': title,
                'link': link,
                'match_score': vacancy.get('match_score', 0),
            })
            print("   Registrado en Google Sheets con estado 'Pendiente'.")
        except Exception as e:
            print(f"   Error al registrar en Google Sheets: {e}")

        # Fase 4: Borrador en Gmail (HITL) solo si existe correo directo
        if not contact_email:
            print("   Sin correo directo en la oferta: no se crea borrador.")
            continue
        try:
            subject, body = build_application_email(vacancy, language)
            gmail_service.create_application_draft(contact_email, subject, body, pdf_bytes, pdf_filename)
        except Exception as e:
            print(f"   Error al crear borrador en Gmail: {e}")

    print()
    log("--- Pipeline Diario Finalizado ---")
    return True


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Pipeline diario del agente de búsqueda UX/UI.")
    parser.add_argument("--test", action="store_true", help="Usar scheduler/sample_vacancies.json en lugar de SerpAPI.")
    parser.add_argument("--dry-run", action="store_true", help="No llamar a Google Workspace; solo mostrar lo que se haría.")
    args = parser.parse_args()
    ok = run_daily_pipeline(use_sample=args.test, dry_run=args.dry_run)
    sys.exit(0 if ok else 1)
