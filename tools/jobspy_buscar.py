"""Busca vacantes de diseño UX/UI en Indeed Colombia, Google Jobs y LinkedIn con JobSpy (python-jobspy).

Lo corre .github/workflows/jobspy.yml 4 veces al día (plan de búsqueda del usuario, 2026-10-27). El resultado se
publica en la rama "datos" como jobspy.json y Apps Script lo lee en cada búsqueda (searchJobSpy_ en apps_script/Fuentes.gs).

Uso: python tools/jobspy_buscar.py <ruta del json>
El archivo acumula los avisos de los últimos DIAS_GUARDADOS días: una corrida que falla no borra lo de las anteriores.
Solo vista pública de cada portal, sin sesión de nadie; pausas entre búsquedas y nada de reintentos ante un bloqueo.
"""
import json
import math
import random
import re
import sys
import time
from datetime import datetime, timedelta, timezone

from jobspy import scrape_jobs

TERMINOS = ["diseñador ux", "diseñador ui ux", "diseñador ux ui", "ux designer", "ui designer", "ux ui designer",
            "product designer", "diseñador de producto", "ux researcher", "design system"]
DISENO = re.compile(r"\bux\b|\bui\b|dise[ñn]ador|designer|design system|experiencia de usuario|ux research", re.I)
NO_DISENO = re.compile(r"graphic|gr[aá]fico|developer|desarrollador|engineer|ingenier|copywriter|redactor", re.I)
HORAS = 72            # Ventana de cada búsqueda: lo ya visto lo descarta la deduplicación de Apps Script
DIAS_GUARDADOS = 7
POR_BUSQUEDA = 30


def limpio(valor):
    if valor is None or (isinstance(valor, float) and math.isnan(valor)):
        return ""
    return str(valor).strip()


def buscar(sitio, termino, remoto):
    extra = {}
    if sitio == "google":
        extra["google_search_term"] = f"{termino} empleos en Colombia{' remoto' if remoto else ''} desde hace 3 días"
    if sitio == "linkedin":
        extra["linkedin_fetch_description"] = True
    df = scrape_jobs(site_name=[sitio], search_term=termino, location="Colombia", country_indeed="colombia",
                     is_remote=remoto, hours_old=HORAS, results_wanted=POR_BUSQUEDA, description_format="markdown",
                     verbose=0, **extra)
    filas = []
    for r in df.to_dict("records"):
        titulo = limpio(r.get("title"))
        if not DISENO.search(titulo) or NO_DISENO.search(titulo):
            continue
        fecha = r.get("date_posted")
        filas.append({
            "sitio": sitio, "titulo": titulo, "empresa": limpio(r.get("company")),
            "ubicacion": limpio(r.get("location")), "remoto": bool(r.get("is_remote")) if r.get("is_remote") is not None else remoto,
            "enlace": limpio(r.get("job_url")), "enlace_directo": limpio(r.get("job_url_direct")),
            "fecha": fecha.isoformat()[:10] if hasattr(fecha, "isoformat") else limpio(fecha)[:10],
            "descripcion": limpio(r.get("description"))[:6000], "consulta": termino,
        })
    return filas


def main(ruta):
    ahora = datetime.now(timezone.utc)
    try:
        previo = json.load(open(ruta, encoding="utf-8")).get("vacantes", [])
    except (OSError, ValueError):
        previo = []
    limite = (ahora - timedelta(days=DIAS_GUARDADOS)).date().isoformat()
    por_enlace = {v["enlace"]: v for v in previo if v.get("enlace") and (v.get("visto") or "") >= limite}

    resumen = {}
    # LinkedIn solo con los 5 términos principales: su descripción cuesta una petición por aviso
    plan = [("indeed", t, r) for t in TERMINOS for r in (False, True)] + \
           [("google", t, False) for t in TERMINOS[:6]] + \
           [("linkedin", t, False) for t in TERMINOS[:5]]
    bloqueados = set()
    for sitio, termino, remoto in plan:
        if sitio in bloqueados:
            continue
        try:
            filas = buscar(sitio, termino, remoto)
        except Exception as e:  # noqa: BLE001 — un portal que falla no detiene a los demás
            print(f"{sitio} '{termino}' falló: {e}")
            if re.search(r"429|blocked|captcha", str(e), re.I):
                bloqueados.add(sitio)  # No insistir en esta corrida
            continue
        nuevos = 0
        for f in filas:
            if f["enlace"] and f["enlace"] not in por_enlace:
                f["visto"] = ahora.date().isoformat()
                por_enlace[f["enlace"]] = f
                nuevos += 1
        resumen[sitio] = resumen.get(sitio, 0) + nuevos
        print(f"{sitio} '{termino}'{' remoto' if remoto else ''}: {len(filas)} de diseño, {nuevos} nuevos")
        time.sleep(random.uniform(5, 12))

    vacantes = sorted(por_enlace.values(), key=lambda v: v.get("fecha") or "", reverse=True)
    json.dump({"generado": ahora.isoformat(timespec="minutes"), "nuevos_por_sitio": resumen, "vacantes": vacantes},
              open(ruta, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"Total guardado: {len(vacantes)} avisos; nuevos en esta corrida: {resumen}")


if __name__ == "__main__":
    main(sys.argv[1])
