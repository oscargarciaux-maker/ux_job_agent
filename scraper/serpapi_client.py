import os
import serpapi
from dotenv import load_dotenv

load_dotenv()

class LinkedInSerpApiClient:
    def __init__(self):
        self.api_key = os.getenv("SERPAPI_API_KEY")
        if not self.api_key:
            raise ValueError("No se encontró la SERPAPI_API_KEY en las variables de entorno.")

    def search_junior_ux_jobs(self) -> list:
        """
        Ejecuta Google Dorking enfocado en LinkedIn para vacantes y posts de reclutadores
        de Diseñador UX/UI Junior en Colombia (Bogotá/Medellín).
        """
        # Query optimizado para dorking en LinkedIn de las últimas semanas
        query = 'site:linkedin.com/jobs/view OR site:linkedin.com/posts "diseñador ux" OR "ux/ui designer" "junior" "Bogotá" OR "Medellín"'
        
        params = {
            "engine": "google",
            "q": query,
            "tbs": "qdr:w2", # Filtro estricto de las últimas 2 semanas
            "hl": "es",
            "gl": "co"
        }

        client = serpapi.Client(api_key=self.api_key)
        results = client.search(params).as_dict()
        organic_results = results.get("organic_results", [])

        vacancies = []
        for item in organic_results:
            vacancies.append({
                "title": item.get("title"),
                "link": item.get("link"),
                "snippet": item.get("snippet"),
                "source": "LinkedIn via SerpAPI"
            })

        return vacancies

if __name__ == "__main__":
    # Prueba rápida del cliente
    client = LinkedInSerpApiClient()
    jobs = client.search_junior_ux_jobs()
    print(f"Se encontraron {len(jobs)} vacantes preliminares.")
    for j in jobs[:3]:
        print(f"- {j['title']}: {j['link']}")
