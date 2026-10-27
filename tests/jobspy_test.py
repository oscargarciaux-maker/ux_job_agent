"""Pruebas de los lectores de elempleo de tools/jobspy_buscar.py (no hacen peticiones ni necesitan JobSpy instalado).

Mismos casos que tenían relativeDateEs, parseElempleoList y parseJobPostingJsonLd cuando elempleo se buscaba desde
Apps Script (hasta el 27 oct 2026).
"""
import datetime
import importlib.util
import pathlib

ruta = pathlib.Path(__file__).resolve().parent.parent / "tools" / "jobspy_buscar.py"
spec = importlib.util.spec_from_file_location("jobspy_buscar", ruta)
j = importlib.util.module_from_spec(spec)
spec.loader.exec_module(j)

hoy = datetime.date(2026, 10, 26)
assert j.fecha_relativa("Hace 4 días", hoy) == "2026-10-22"
assert j.fecha_relativa("Hace 2 semanas", hoy) == "2026-10-12"
assert j.fecha_relativa("Hace 1 mes", hoy) == "2026-09-26"
assert j.fecha_relativa("Hace 3 horas", hoy) == "2026-10-26"
assert j.fecha_relativa("Ayer", hoy) == "2026-10-25"
assert j.fecha_relativa("sin fecha", hoy) is None

tarjetas = j.tarjetas_elempleo(
    '<div class="result-list"><div class="col-md-12 result-item mb-3 bg-white"><div data-url="/co/ofertas-trabajo/disenador-ui-ux-1886783875" '
    'data-ga4-offerdata="{&quot;id&quot;:1886783875,&quot;title&quot;:&quot;Dise&#241;ador ui/ux - hibrido&quot;,&quot;company&quot;:&quot;NOVATEC&quot;,&quot;location&quot;:&quot;Bogot&#225;&quot;}">'
    '<span>Hace 4 d&#237;as</span></div></div><div class="result-item mb-3">sin datos</div>', hoy)
assert len(tarjetas) == 1
t = tarjetas[0]
assert t["titulo"] == "Diseñador ui/ux - hibrido" and t["empresa"] == "NOVATEC" and t["ubicacion"] == "Bogotá, Colombia"
assert t["fecha"] == "2026-10-22" and t["enlace"] == "https://www.elempleo.com/co/ofertas-trabajo/disenador-ui-ux-1886783875"
assert t["sitio"] == "elempleo"

publicado, vence, descripcion = j.ficha_elempleo(
    '<script type="application/ld+json">{"@type":"JobPosting","datePosted":"2026-10-22","validThrough":"2026-12-21",'
    '"description":"<p>Figma &amp; UX</p>"}</script>')
assert (publicado, vence, descripcion) == ("2026-10-22", "2026-12-21", "Figma & UX")
assert j.fecha_jsonld('{"datePosted": "2026-9-7"}', "datePosted") == "2026-09-07"  # elempleo publica mes y día de un dígito
print("OK: pruebas de elempleo (tools/jobspy_buscar.py) pasaron")
