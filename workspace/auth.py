import os
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from dotenv import load_dotenv

load_dotenv()

# Scopes únicos para todo el agente. Si se modifican, borrar token.json para re-autorizar.
# gmail.compose permite crear borradores; el agente NUNCA invoca users.messages.send (HITL).
SCOPES = [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/gmail.compose',
]

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
CREDENTIALS_PATH = os.getenv("GOOGLE_OAUTH_CREDENTIALS", os.path.join(PROJECT_ROOT, "credentials.json"))
TOKEN_PATH = os.getenv("GOOGLE_OAUTH_TOKEN", os.path.join(PROJECT_ROOT, "token.json"))

_cached_creds = None


def get_credentials() -> Credentials:
    """
    Retorna credenciales OAuth 2.0 de usuario válidas.
    - Reutiliza token.json si existe y lo refresca si expiró.
    - Si no existe, abre el flujo de consentimiento en el navegador usando credentials.json
      (cliente OAuth tipo "Aplicación de escritorio") y guarda el nuevo token.json.
    """
    global _cached_creds
    if _cached_creds and _cached_creds.valid:
        return _cached_creds

    creds = None
    if os.path.exists(TOKEN_PATH):
        creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists(CREDENTIALS_PATH):
                raise FileNotFoundError(
                    f"No se encontró {CREDENTIALS_PATH}. Descarga el cliente OAuth (Aplicación de escritorio) "
                    "desde Google Cloud Console y guárdalo como credentials.json en la raíz del proyecto."
                )
            flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_PATH, SCOPES)
            creds = flow.run_local_server(port=0)

        with open(TOKEN_PATH, 'w') as token_file:
            token_file.write(creds.to_json())

    _cached_creds = creds
    return creds


def build_service(name: str, version: str):
    """Construye un cliente de Google API autenticado (drive/v3, docs/v1, sheets/v4, gmail/v1)."""
    return build(name, version, credentials=get_credentials(), cache_discovery=False)


if __name__ == "__main__":
    # Ejecutar una vez de forma interactiva para generar token.json
    get_credentials()
    print(f"Autenticación OAuth completada. Token guardado en: {TOKEN_PATH}")
