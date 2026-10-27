---
name: investigar-empresas
description: Investiga a fondo (deep research) empresas reales que contratan diseñadores UX/UI —primero en Bogotá, luego en el resto de Colombia y luego en el exterior con trabajo remoto desde LATAM—, comprueba que existen y que de verdad contratan diseño, busca al menos 3 correos publicados con su fuente y las deja en la pestaña "Empresas objetivo" del Sheet, listas para la skill correo-en-frio. Úsala cuando el usuario pida "busca empresas", "investiga empresas que contraten diseñadores", "más empresas para correos en frío", o cuando correo-en-frio no tenga empresas nuevas.
---

# Investigar empresas

Objetivo: una lista de empresas **reales** a las que vale la pena escribirles en frío, con correos **reales** y con
fuente, para que `correo-en-frio` arme el lote de una vez (decisión del usuario, 24 oct 2026). Nada inventado: una
empresa sin evidencia de que existe y contrata diseño, o un correo sin fuente, no entra.

No se envía nada, no se escribe a nadie por LinkedIn ni por formularios: solo se investiga y se registra.

## Qué empresas buscar (especificaciones aprobadas por el usuario, 24 oct 2026)

**Orden de búsqueda:** 1) Bogotá, 2) resto de Colombia, 3) exterior con trabajo remoto abierto a Colombia o LATAM. Se
pasa al siguiente ámbito solo cuando el anterior ya no da empresas nuevas en esta tanda.

**Encajan** si hay evidencia (con fuente) de que contratan diseñadores UX/UI o de producto o tienen equipo de diseño o
producto digital propio:
- una vacante de diseño UX/UI o de producto actual o de los últimos 12 meses (LinkedIn, su página de empleo, Get on
  Board, Computrabajo, elempleo, Magneto, Lever, Ashby, Greenhouse, Workable);
- personas con cargo de diseño UX/UI o producto en la empresa (perfil o publicación en LinkedIn);
- o un producto digital propio (app o plataforma) con equipo de producto visible.

**Prioridad dentro de cada ámbito:** fintech, banca, seguros, pagos y crédito > fábricas de software y empresas de
ampliación de equipos > startups y empresas de producto digital > agencias digitales > incubadoras y aceleradoras
(estas no contratan para sí: sirven para que presenten al candidato a las startups de su portafolio).

**Exterior:** solo si contrata desde Colombia o LATAM (vacantes "LATAM", "Americas", "Colombia", zona horaria UTC-3 a
UTC-6, entidad o pagador en la región). "US only", Europa o India no.

**No entran:**
- Empresas ya contactadas (pestaña `Correos en frío`, también las que tienen solo borrador), con postulación (pestaña
  `Aplicadas`, carpetas de `Vacantes con IA/CV`) o ya listadas en `Empresas objetivo`.
- **Nombre parecido a una fila de `Aplicadas`** (p. ej. "AXA Colpatria" frente a "Colpatria"): no adivines. Abre esa
  carpeta (enlace "Abrir" de la fila o búscala por nombre en Drive) y compara el aviso (`Vacante` o `Detalle_Vacante`) y
  la HV que hay dentro con la empresa candidata. Misma empresa = no entra. El 24 oct así se comprobó que la carpeta
  "Colpatria" era la vacante de AXA Colpatria de elempleo (mismo número de aviso).
- Empresas de reclutamiento o headhunting, plataformas de freelance (Upwork, Workana, Fiverr…) y sitios que cobran por
  postular.
- Empresas sin actividad verificable en los últimos 12 meses (sitio caído, sin publicaciones, cerradas o absorbidas:
  en ese caso, la empresa compradora).

**Tamaño de la búsqueda:** unas **30 empresas** por ejecución (decisión del usuario, 24 oct 2026), salvo que pida otra
cantidad. Se empieza por Bogotá y se amplía a otras ciudades (y luego al exterior) cuando Bogotá ya no da empresas nuevas
o cuando el usuario pida más. Si no se llega a 30, se dice cuántas se encontraron; no se rellena. Es una búsqueda larga:
guarda las filas en `Empresas objetivo` cada 5 o 10 empresas verificadas (no al final), así un corte de la sesión no
pierde trabajo y la siguiente ejecución sigue desde ahí.

## Paso 1. Leer lo que ya existe

Con el conector de Google Sheets, lee una vez `Vacantes UX - Registro`: pestañas `Correos en frío` (empresas y
direcciones usadas o rebotadas), `Aplicadas` y `Empresas objetivo` (si existe). Lee también "Empresas Tech en Bogotá" en
Drive: las empresas de esa lista que aún no tengan correo son candidatas directas (ya las aprobó el candidato), pero igual
se verifican y se les buscan correos.

## Paso 2. Buscar (deep research)

Si la sesión tiene la skill `deep-research` y una herramienta de subagentes, úsala para el barrido amplio (un subagente
por ámbito o por sector); si no, haz las búsquedas web directamente, varias en paralelo. Fuentes útiles:
- **Vacantes:** LinkedIn Jobs ("diseñador UX/UI", "product designer", "UX designer" en Bogotá / Colombia / LATAM remoto),
  Get on Board, Computrabajo, elempleo, Magneto, y las APIs públicas de Lever (`api.lever.co/v0/postings/<empresa>`),
  Ashby y Greenhouse para confirmar.
- **Directorios:** asociados de Colombia Fintech, portafolios de Rockstart, Wayra, Endeavor, iNNpulsa, Invest in Bogotá,
  Platzi/Startupeable, listados de fábricas de software (Fedesoft) y rankings de agencias.
- **Equipo de diseño:** LinkedIn (personas con cargo de diseño en la empresa), publicaciones de "estamos contratando",
  página de "trabaja con nosotros" o "careers".
- **Exterior:** tableros con filtro LATAM (Get on Board, Remotive, Working Nomads, Jobicy) para encontrar la empresa y
  luego su página de empleo propia.

Pocas consultas a LinkedIn y con calma; si aparece un límite o un captcha, para y dilo.

**Lo que funcionó y lo que no (primera búsqueda, 24 oct 2026):**
- Abrir directamente el sitio de cada empresa y sus páginas habituales (`/contacto`, `/contactanos`, `/trabaja-con-nosotros`,
  `/careers`, `/empleo`, `/politica-de-privacidad`, `/terminos-y-condiciones`) y buscar correos en el texto encontró los
  buzones de talento (ADL Digital Lab, Widetech, IAS). Si WebFetch no resuelve un dominio, `curl -sL` desde la terminal sí
  suele funcionar.
- En elempleo, cada aviso trae su JSON-LD `JobPosting` (empresa, `datePosted`, `validThrough`, descripción): sirve como
  evidencia con fecha. Los listados por ciudad (`/co/ofertas-empleo/bogota/trabajo-disenador-ux-ui`) dan las empresas que
  contratan diseño ahora.
- Los bancos y fintechs grandes (Nu, Lulo, Davivienda, Banco de Bogotá) y algunas fábricas (Sophos, Gorilla Logic) no
  publican correos de talento: contratan por su portal y por LinkedIn. Regístralas con Estado `Sin correo` y su página
  de empleo; su ruta es su portal de empleo (si usa Greenhouse, Lever, Ashby o Workable, Apps Script lo consulta a diario
  desde "Empresas objetivo") y las alertas de LinkedIn del usuario. Nunca uses la sesión de LinkedIn del usuario
  (decisión del usuario, 27 oct 2026: su cuenta no se automatiza). Lo que solo se ve con sesión no lo des por revisado.
- Hunter.io y servicios parecidos no se usan (el usuario no los va a pagar y el plan gratuito no alcanza para 30
  empresas).
- Los buscadores web resumen y no muestran los correos de las páginas; DuckDuckGo y Bing por `curl` no sirven (bloqueo o
  resultados genéricos). Usa la búsqueda para encontrar empresas y el sitio de la empresa para los correos.

## Paso 3. Verificar cada empresa

Para cada candidata, abre su sitio y comprueba: que existe y está activa, dónde opera (sede o equipo en Bogotá, en
Colombia o contratación LATAM), su sector y tipo, y la evidencia de que contrata diseño (enlace y fecha). Anota también
su página de empleo y el idioma en que se comunica.

## Paso 4. Correos (al menos 3 por empresa, cada uno con fuente)

- Solo direcciones **publicadas**: sitio oficial (contacto, empleo, aviso de privacidad para candidatos), publicaciones
  de la empresa o de su equipo de talento en LinkedIn, portales oficiales de empleo, perfiles públicos de la empresa
  (GitHub, directorios oficiales). **Nunca** inventes ni armes correos por patrón (nombre.apellido@): sin fuente no entra.
- El dominio debe ser el de la empresa (un Gmail solo si la propia empresa lo publica como canal de HV, con nota).
- Para cada correo: qué es (talento o selección; persona de diseño, producto o talento con su nombre y cargo; contacto
  general), la URL de la fuente y su fecha.
- Prioridad: talento o selección > personas de diseño, producto o talento > contacto general. Soporte, ventas,
  privacidad o radicación no son rutas de HV: anótalos solo si son la única vía, marcados como tales.
- Fuente de más de 12 meses o persona que puede haber salido de la empresa: anótalo en el mismo correo ("fuente
  antigua").
- No repitas correos de `Correos en frío` (usados, en borrador o rebotados).
- Si no llegas a 3, deja los que haya y dilo en Notas. Una empresa sin ningún correo con fuente queda con Estado
  `Sin correo` (sirve para postular por su página de empleo).

## Paso 5. Registrar en `Empresas objetivo`

Si la pestaña no existe, créala (conector de Sheets) con estos encabezados, en este orden: `Fecha`, `Empresa`, `Ámbito`,
`Ciudad / país`, `Tipo`, `Sector`, `Por qué encaja (fuente)`, `Web`, `Página de empleo`, `Correos (fuente, fecha)`,
`Estado`, `Notas`. Agrega una fila por empresa (`append_values`; no modifiques filas existentes):
- `Ámbito`: `Bogotá`, `Colombia` o `Exterior`. `Tipo`: fábrica de software, startup/producto, fintech, agencia,
  incubadora, corporativo.
- `Por qué encaja (fuente)`: la evidencia en una frase con su enlace y fecha.
- `Correos (fuente, fecha)`: uno por línea, `correo — qué es — fuente — fecha`.
- `Estado`: `Nueva` (lista para `correo-en-frio`) o `Sin correo`. Después, `correo-en-frio` y Apps Script la pasan a
  `En lote` y `Borradores creados`.

Ordena las filas nuevas por ámbito (Bogotá primero) y por prioridad de sector.

## Resultado para el usuario

```
Empresas nuevas: <n> (Bogotá <n>, Colombia <n>, exterior <n>) — sin correo: <n>
- <Empresa> (<ámbito>, <tipo>, <sector>): <evidencia de que contrata diseño, fecha> — <n> correos (<tipos>)
Descartadas en la verificación: <empresa: motivo>
Límites de esta búsqueda: <qué fuentes no abrieron, ámbitos no cubiertos>
Cuando digas "crea los correos", los preparo en tandas de 3 (skill correo-en-frio, modo tandas).
```
