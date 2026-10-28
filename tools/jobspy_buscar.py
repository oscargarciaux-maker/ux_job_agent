"""Busca vacantes de diseño UX/UI en Indeed Colombia (JobSpy), LinkedIn (buscador público) y elempleo.com.

LinkedIn vino de Apps Script (27 oct 2026): desde Google, 24 de sus 60 búsquedas fallaban por bloqueo (429), 6 de 20
vacantes llegaban sin descripción y una tanda de páginas de LinkedIn colgó tres corridas. Aquí no hay límite de 6
minutos: se va despacio, se espera ante un 429 y de cada aviso se leen la descripción y si sigue recibiendo postulaciones.

elempleo vino de Apps Script (27 oct 2026): desde los servidores de Google tardaba 3 minutos y la corrida se cortaba a los
6 sin crear carpetas. Aquí no hay ese límite. Mismo método que usaba Apps Script: la lista trae los datos en
data-ga4-offerdata y la fecha relativa ("Hace 4 días"); cada aviso, un JSON-LD JobPosting con fecha, vencimiento y descripción.

Google Jobs no va: desde GitHub Actions devolvió "no job data returned" en las 12 búsquedas de las dos primeras
corridas (27 oct 2026), y Apps Script ya lo consulta con SerpAPI.

Lo corre .github/workflows/jobspy.yml 4 veces al día (plan de búsqueda del usuario, 2026-10-27). El resultado se
publica en la rama "datos" como jobspy.json y Apps Script lo lee en cada búsqueda (searchJobSpy_ en apps_script/Fuentes.gs).

Uso: python tools/jobspy_buscar.py <ruta del json>
El archivo acumula los avisos de los últimos DIAS_GUARDADOS días: una corrida que falla no borra lo de las anteriores.
Solo vista pública de cada portal, sin sesión de nadie; pausas entre peticiones y, ante un bloqueo, una sola espera
larga antes de reintentar (LinkedIn) o se deja de insistir en esa corrida (Indeed).
"""
import html
import json
import math
import random
import re
import sys
import time
from datetime import datetime, timedelta, timezone


TERMINOS = ["diseñador ux", "diseñador ui ux", "diseñador ux ui", "ux designer", "ui designer", "ux ui designer",
            "product designer", "diseñador de producto", "ux researcher", "design system",
            "diseñador de servicios", "diseñador de interacción"]  # 2026-10-28: más cargos (decisión del usuario)
DISENO = re.compile(r"\bux\b|\bui\b|dise[ñn]ador|designer|design system|experiencia de usuario|ux research|user research|"
                    r"design research|investigador(\(a\)|a)? (ux|de usuario)|information architect", re.I)
NO_DISENO = re.compile(r"graphic|gr[aá]fico|developer|desarrollador|engineer|ingenier|copywriter|redactor", re.I)
HORAS = 168           # Ventana de cada búsqueda (7 días): lo ya visto lo descarta la deduplicación de Apps Script
DIAS_GUARDADOS = 7
POR_BUSQUEDA = 30


def limpio(valor):
    if valor is None or (isinstance(valor, float) and math.isnan(valor)):
        return ""
    return str(valor).strip()


def buscar(sitio, termino):
    from jobspy import scrape_jobs  # Aquí y no arriba: tests/jobspy_test.py prueba los lectores de elempleo sin instalarlo

    # Con location="Colombia" Indeed buscaba a 50 millas del centro del país y traía 2 avisos (27 oct 2026);
    # country_indeed ya limita la búsqueda a co.indeed.com.
    df = scrape_jobs(site_name=[sitio], search_term=termino, hours_old=HORAS, results_wanted=POR_BUSQUEDA,
                     description_format="markdown", verbose=0, country_indeed="colombia")
    print(f"{sitio} '{termino}': {len(df)} avisos en total")
    filas = []
    for r in df.to_dict("records"):
        titulo = limpio(r.get("title"))
        if not DISENO.search(titulo) or NO_DISENO.search(titulo):
            continue
        fecha = r.get("date_posted")
        filas.append({
            "sitio": sitio, "titulo": titulo, "empresa": limpio(r.get("company")),
            "ubicacion": limpio(r.get("location")), "remoto": bool(r.get("is_remote")),
            "enlace": limpio(r.get("job_url")), "enlace_directo": limpio(r.get("job_url_direct")),
            "fecha": fecha.isoformat()[:10] if hasattr(fecha, "isoformat") else limpio(fecha)[:10],
            "descripcion": limpio(r.get("description"))[:6000], "consulta": termino,
        })
    return filas


ELEMPLEO = "https://www.elempleo.com"
ELEMPLEO_TERMINOS = ["diseñador ux", "diseñador ui", "product designer", "diseñador de producto", "experiencia de usuario",
                     "diseñador de servicios"]
NAVEGADOR = {"User-Agent": "Mozilla/5.0", "Accept-Language": "es-CO,es;q=0.9"}


def fecha_relativa(texto, hoy):
    """'Hace 3 días', 'Hace 2 semanas', 'Ayer', 'Hoy' → fecha ISO (None si no se entiende). Igual que relativeDateEs."""
    t = texto.lower().replace("í", "i").replace("á", "a")
    if re.search(r"\bhoy\b|hace \d+ (minuto|hora)s?|hace (un|una) (minuto|hora)", t):
        dias = 0
    elif re.search(r"\bayer\b", t):
        dias = 1
    else:
        m = re.search(r"hace (\d+|un|una) (dia|semana|mes)", t)
        if not m:
            return None
        dias = (int(m.group(1)) if m.group(1).isdigit() else 1) * {"dia": 1, "semana": 7, "mes": 30}[m.group(2)]
    return (hoy - timedelta(days=dias)).isoformat()


def fecha_jsonld(pagina, clave):
    m = re.search(r'"' + clave + r'"\s*:\s*"(\d{4})-(\d{1,2})-(\d{1,2})', pagina)
    return f"{m.group(1)}-{int(m.group(2)):02d}-{int(m.group(3)):02d}" if m else ""


def sin_html(texto):
    texto = re.sub(r"<br\s*/?>|</p>|</li>", "\n", texto, flags=re.I)
    texto = html.unescape(re.sub(r"<[^>]+>", " ", texto))
    return re.sub(r"\n\s*\n+", "\n", re.sub(r"[ \t]+", " ", texto)).strip()


def tarjetas_elempleo(pagina, hoy):
    """Avisos de la lista de elempleo (datos de data-ga4-offerdata y fecha relativa), como filas de jobspy.json."""
    filas = []
    for item in pagina.split("result-item mb-3")[1:]:
        datos = re.search(r'data-ga4-offerdata="([^"]+)"', item)
        url = re.search(r'data-url="([^"]+)"', item)
        if not datos or not url:
            continue
        try:
            o = json.loads(html.unescape(datos.group(1)))
        except ValueError:
            continue
        rel = re.search(r"Hace [^<]{1,25}|\bAyer\b|\bHoy\b", item)
        filas.append({
            "sitio": "elempleo", "titulo": o.get("title") or "", "empresa": o.get("company") or "",
            "ubicacion": (o.get("location") or "") + ", Colombia", "remoto": False, "enlace": ELEMPLEO + url.group(1),
            "enlace_directo": "", "fecha": (fecha_relativa(html.unescape(rel.group(0)), hoy) or "") if rel else "",
            "descripcion": "",
        })
    return filas


def ficha_elempleo(pagina):
    """Fecha de publicación, vencimiento y descripción del JSON-LD JobPosting de un aviso."""
    descripcion = ""
    for bloque in re.findall(r"<script[^>]*application/ld\+json[^>]*>([\s\S]*?)</script>", pagina):
        try:
            datos = json.loads(bloque)
        except ValueError:
            continue
        for x in datos if isinstance(datos, list) else [datos]:
            if isinstance(x, dict) and "JobPosting" in str(x.get("@type")) and x.get("description"):
                descripcion = sin_html(x["description"])
    return fecha_jsonld(pagina, "datePosted"), fecha_jsonld(pagina, "validThrough"), descripcion


def buscar_elempleo(hoy):
    import requests
    avisos = {}
    for termino in ELEMPLEO_TERMINOS:
        try:
            r = requests.get(ELEMPLEO + "/co/ofertas-empleo/", params={"trabajo": termino}, headers=NAVEGADOR, timeout=30)
        except requests.RequestException as e:
            print(f"elempleo '{termino}' falló: {e}")
            continue
        if r.status_code != 200:
            print(f"elempleo '{termino}': HTTP {r.status_code}")
            continue
        for f in tarjetas_elempleo(r.text, hoy):
            f["consulta"] = termino
            avisos.setdefault(f["enlace"], f)
        time.sleep(random.uniform(2, 5))
    limite = (hoy - timedelta(days=21)).isoformat()
    vigentes = []
    for a in avisos.values():
        if not DISENO.search(a["titulo"]) or NO_DISENO.search(a["titulo"]) or (a["fecha"] and a["fecha"] < limite):
            continue
        try:
            r = requests.get(a["enlace"], headers=NAVEGADOR, timeout=30)
        except requests.RequestException:
            continue
        if r.status_code != 200:
            continue
        publicado, vence, descripcion = ficha_elempleo(r.text)
        a["fecha"] = publicado or a["fecha"]
        a["descripcion"] = descripcion[:6000]
        if (vence and vence < hoy.isoformat()) or (a["fecha"] and a["fecha"] < limite):
            continue
        vigentes.append(a)
        time.sleep(random.uniform(1, 3))
    print(f"elempleo: {len(avisos)} avisos, {len(vigentes)} de diseño, recientes y vigentes")
    return vigentes


LINKEDIN_BUSQUEDA = "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search"
LINKEDIN_AVISO = "https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/"
LINKEDIN_TERMINOS = ["diseñador ux", "diseñador ui ux", "diseñador ux ui", "ux designer", "ui designer", "ux ui designer",
                     "product designer", "diseñador de producto", "ux researcher", "design system",
                     "diseñador ux junior", "junior product designer",
                     "service designer", "diseñador de servicios", "user researcher"]
# Colombia (todas las modalidades) y remotas en Colombia; "Latin America" traía sobre todo avisos de Brasil y Argentina
LINKEDIN_BUSQUEDAS = [{"location": "Colombia"}, {"location": "Colombia", "f_WT": "2"}]
LINKEDIN_PAGINAS = 3
LINKEDIN_MAX_AVISOS = 60
CERRADO = re.compile(r"No longer accepting applications|Ya no se aceptan solicitudes|closed-job", re.I)


def texto_html(fragmento):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", fragmento or ""))).strip()


def tarjetas_linkedin(pagina):
    """Avisos de una página del buscador público de LinkedIn (igual que parseLinkedInJobCards de Apps Script)."""
    filas = []
    for tarjeta in re.split(r"<li[\s>]", pagina):
        aviso = re.search(r"urn:li:jobPosting:(\d+)", tarjeta)
        if not aviso:
            continue
        campo = lambda patron: texto_html((re.search(patron, tarjeta) or [None, ""])[1])
        fecha = re.search(r'datetime="(\d{4}-\d{2}-\d{2})"', tarjeta)
        filas.append({
            "sitio": "linkedin", "titulo": campo(r"base-search-card__title[^>]*>([\s\S]*?)</h3>"),
            "empresa": campo(r"base-search-card__subtitle[^>]*>([\s\S]*?)</h4>"),
            "ubicacion": campo(r"job-search-card__location[^>]*>([\s\S]*?)</span>"), "remoto": False,
            "enlace": "https://www.linkedin.com/jobs/view/" + aviso.group(1), "enlace_directo": "",
            "fecha": fecha.group(1) if fecha else "", "descripcion": "", "id": aviso.group(1),
        })
    return filas


def ficha_linkedin(pagina):
    """Descripción completa de un aviso y si ya no recibe postulaciones."""
    marca = re.search(r"show-more-less-html__markup[^>]*>([\s\S]*?)</div>", pagina)
    return sin_html(marca.group(1)) if marca else "", bool(CERRADO.search(pagina))


def pedir(requests, url, params=None):
    """GET con espera ante un 429 (una sola vez, 60-90 s). Devuelve el texto o None."""
    for intento in range(2):
        try:
            r = requests.get(url, params=params, headers=NAVEGADOR, timeout=30)
        except requests.RequestException:
            return None
        if r.status_code == 200:
            return r.text
        if r.status_code != 429 or intento:
            return None
        time.sleep(random.uniform(60, 90))
    return None


def buscar_linkedin(hoy):
    import requests
    avisos, fallidas, seguidas = {}, 0, 0
    for termino in LINKEDIN_TERMINOS:
        for filtro in LINKEDIN_BUSQUEDAS:
            for pagina in range(LINKEDIN_PAGINAS):
                if seguidas >= 4:  # LinkedIn sigue bloqueando: no insistir en esta corrida
                    break
                params = dict(filtro, keywords=termino, f_TPR=f"r{21 * 86400}", start=str(pagina * 10))
                texto = pedir(requests, LINKEDIN_BUSQUEDA, params)
                time.sleep(random.uniform(3, 6))
                if texto is None:
                    fallidas += 1
                    seguidas += 1
                    continue
                seguidas = 0
                filas = tarjetas_linkedin(texto)
                for f in filas:
                    f["consulta"] = termino
                    avisos.setdefault(f["enlace"], f)
                if len(filas) < 10:
                    break  # No hay más páginas para esta búsqueda
    limite = (hoy - timedelta(days=21)).isoformat()
    candidatos = [a for a in avisos.values()
                  if DISENO.search(a["titulo"]) and not NO_DISENO.search(a["titulo"]) and (a["fecha"] or "9") >= limite
                  and re.search(r"colombia|bogot|medell|cali|barranquilla|remot", a["ubicacion"], re.I)]
    vigentes = []
    for a in candidatos[:LINKEDIN_MAX_AVISOS]:
        texto = pedir(requests, LINKEDIN_AVISO + a.pop("id"))
        time.sleep(random.uniform(2, 4))
        if texto is not None:
            a["descripcion"], cerrado = ficha_linkedin(texto)
            if cerrado:
                continue
        vigentes.append(a)  # Sin ficha queda sin descripción: la IA la verifica
    print(f"LinkedIn: {len(avisos)} avisos ({fallidas} búsquedas fallaron), {len(candidatos)} de diseño en Colombia, "
          f"{len(vigentes)} abiertos, {sum(1 for v in vigentes if v['descripcion'])} con descripción")
    return vigentes


def main(ruta):
    ahora = datetime.now(timezone.utc)
    try:
        previo = json.load(open(ruta, encoding="utf-8")).get("vacantes", [])
    except (OSError, ValueError):
        previo = []
    limite = (ahora - timedelta(days=DIAS_GUARDADOS)).date().isoformat()
    por_enlace = {v["enlace"]: v for v in previo if v.get("enlace") and (v.get("visto") or "") >= limite}

    resumen = {}

    def guardar(sitio, filas):
        nuevos = 0
        for f in filas:
            if f["enlace"] and f["enlace"] not in por_enlace:
                f["visto"] = ahora.date().isoformat()
                por_enlace[f["enlace"]] = f
                nuevos += 1
        resumen[sitio] = resumen.get(sitio, 0) + nuevos
        return nuevos

    # Indeed con JobSpy; si responde con bloqueo, no se insiste en esta corrida
    for termino in TERMINOS:
        try:
            filas = buscar("indeed", termino)
        except Exception as e:  # noqa: BLE001 — un portal que falla no detiene a los demás
            print(f"indeed '{termino}' falló: {e}")
            if re.search(r"429|blocked|captcha", str(e), re.I):
                break
            continue
        print(f"indeed '{termino}': {len(filas)} de diseño, {guardar('indeed', filas)} nuevos")
        time.sleep(random.uniform(5, 12))

    for sitio, buscador in (("linkedin", buscar_linkedin), ("elempleo", buscar_elempleo)):
        try:
            guardar(sitio, buscador(ahora.date()))
        except Exception as e:  # noqa: BLE001 — si un portal falla, se guarda lo de los demás
            print(f"{sitio} falló: {e}")

    vacantes = sorted(por_enlace.values(), key=lambda v: v.get("fecha") or "", reverse=True)
    json.dump({"generado": ahora.isoformat(timespec="minutes"), "nuevos_por_sitio": resumen, "vacantes": vacantes},
              open(ruta, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"Total guardado: {len(vacantes)} avisos; nuevos en esta corrida: {resumen}")


if __name__ == "__main__":
    main(sys.argv[1])
