---
name: verificar-vacante
description: Verifica una vacante de diseño UX/UI antes de que el candidato se postule — que siga abierta, que el enlace sea el aviso original, que encaje con sus filtros (rol, nivel, años, ubicación, inglés, contrato), que no esté repetida y cómo se aplica exactamente — y deja un veredicto (lista / de estirón / descartar) con sus razones. Úsala cuando el usuario pegue el enlace de una vacante, pida "verifica/revisa esta vacante", antes de postularse, o al revisar las carpetas de "Vacantes con IA/Sin revisar".
---

# Verificar vacante

Objetivo: que el candidato pueda abrir el aviso y postularse **sin tener que revisarlo de nuevo**. Solo vacantes reales,
abiertas y verificadas; si algo no encaja, se dice y no se prepara la HV. Nunca rellenar para llegar a una meta.

## Reglas de conducta

- **No enviar nada.** No postular, no conectar ni escribir en LinkedIn, no responder a reclutadores. Solo leer y reportar.
- **No inventar.** Si no se pudo comprobar algo (página que no carga, LinkedIn pide sesión), se reporta como
  "sin verificar", nunca como cumplido.
- **LinkedIn con calma:** pocas consultas, una por vacante. Si aparece un límite o un captcha, parar y decirlo.
- Responder en español, corto.

## Entradas

Una de estas:
- Un enlace a la vacante.
- Una carpeta de `Vacantes con IA/Sin revisar/<YYYY-MM-DD>/<Empresa>` con su Google Doc `Detalle_Vacante`
  (trae cargo, empresa, link, fecha, idioma, correo de contacto y la descripción completa).

## Pasos

### 1. Abrir el aviso original
- Abre el enlace. Si hay navegador con la sesión del usuario (Claude en Chrome o el navegador de la app de escritorio),
  úsalo: LinkedIn muestra más con sesión. Si no, léelo con la herramienta web disponible.
- El aviso debe ser el **original**: LinkedIn, Indeed, Computrabajo, elempleo, Get on Board o el portal de la empresa.
- **Nunca** como fuente final: trabajo.org, Jooble, JobLeads, BeBee, Upwork, Freelancer, Workana, Fiverr, vacantes.com.
  Si solo aparece ahí, busca el aviso original (LinkedIn o portal de la empresa). Si no existe, repórtalo como
  "solo en agregador, original no encontrado".

### 2. ¿Sigue abierta?
Abierta solo si se cumplen todas:
- La página carga (no 404/410) y es el aviso correcto (mismo cargo y empresa).
- Permite postularse: botón activo, sin "No longer accepting applications", "ya no acepta postulaciones",
  "oferta cerrada/caducada/vencida" ni "proceso cerrado".
- Fecha de publicación de máximo 21 días; de 22 a 28 días solo si las señales anteriores confirman que sigue abierta.
  Si el aviso trae fecha límite (`validThrough`), que no haya pasado.
- Nadie publicó que el cargo ya se ocupó (en posts de LinkedIn, revisa los comentarios recientes si se ven).

### 3. ¿Encaja con los filtros?
La fuente de verdad de los filtros automáticos es `apps_script/Config.gs` (`EXCLUDED_VACANCY_RULES`,
`EXCLUDED_TITLE_PATTERN`, `REACHABLE_REMOTE_LOCATION`, `MAX_POST_AGE_DAYS`, `EXPERIENCE_YEARS_LIMIT`); aquí se aplican
leyendo el aviso completo, que es lo que el código no puede hacer bien.

| Criterio | Sirve | No sirve |
|---|---|---|
| Rol | UX/UI, product design, design systems, UX research, diseño digital/web, visual, service design; roles de producto o experiencia de cliente | Copywriter/redactor, SEO, developer/programador, diseño gráfico puro, "Design Engineer" que exige escribir código |
| Nivel | Junior primero; semi senior o senior si pide **menos de 5 años** (también cargos medios de 3 a 5 años) | Staff, principal, head, director, VP, manager, gerente |
| Años | < 5 años | ≥ 5 años → no se descarta: va como **de estirón**, marcado |
| Ubicación | Colombia (presencial, híbrido o remoto; Bogotá y alrededores, Medellín, Cali); remoto abierto a LATAM, a todo el mundo o a UTC-3 a UTC-6 | "Solo EE. UU.", Norteamérica, Europa, India o presencial fuera de Colombia (p. ej. México) |
| Inglés (nivel real: intermedio) | Sin requisito de nivel, o intermedio/B1–B2. Aviso escrito en inglés sin requisito explícito: sirve, pero **avisar** | Avanzado, fluido, nativo, C1/C2, bilingüe |
| Contrato | Indefinido, término fijo, prestación de servicios, obra labor | Freelance puro por proyecto; pasantía no remunerada; vacante exclusiva para personas con discapacidad (sí sirve si solo es una declaración de igualdad) |
| Sector | Cualquiera; fintech y financiero suman | — |

### 4. ¿Está repetida?
Compara por **empresa + cargo**, no solo por enlace (la misma vacante aparece en LinkedIn, Indeed y el portal):
- Hoja `Vacantes UX - Registro` → pestaña Hoja 1 (columnas Empresa, Cargo, Link).
- Pestaña `Aplicadas` (empresas donde ya se postuló).
- Pestaña `Correos en frío` (empresas ya contactadas).
- Carpetas de `Vacantes con IA/CV/` (todas las semanas y subcarpetas, incluidas las "confidencial").

Si ya está, repórtala como repetida y dónde está.

### 5. Señales de alerta (posible fraude o vacante falsa)
Descarta o marca si aparece alguna: piden pagar (curso, examen, "kit"), datos bancarios o documentos antes de una
entrevista; contacto solo por WhatsApp o correo genérico (@gmail, @hotmail) a nombre de una empresa grande; salario muy
por encima del mercado sin explicación; empresa sin rastro (sin web ni LinkedIn); texto copiado con el código
`J-18808-Ljbffr` (copias de JobLeads).

### 6. ¿Cómo se aplica exactamente?
- Botón de postulación en LinkedIn (Easy Apply o externo), Indeed, Computrabajo o el portal: di cuál y el enlace.
- Por correo: la dirección, **de dónde sale** (texto del aviso, página de la empresa) y si está confirmada para esta
  vacante. Nunca adivinar direcciones.
- Requisitos del proceso: formulario, prueba técnica, portafolio, preguntas de filtro, fecha límite.

## Resultado

Un veredicto por vacante:
- ✅ **Lista**: abierta, original, encaja, no repetida y con forma de aplicar confirmada.
- 🟡 **De estirón**: encaja salvo años (≥ 5) o algún requisito menor; vale la pena con la HV bien enfocada.
- ❌ **Descartar**: cerrada, enlace roto, solo en agregador, no encaja, repetida o con señales de alerta.

Formato del reporte (una línea por comprobación; "sin verificar" cuando no se pudo):

```
Empresa — Cargo — <enlace original>
Veredicto: ✅ Lista | 🟡 De estirón | ❌ Descartar
1. Abierta: sí/no/sin verificar (por qué; fecha de publicación)
2. Original: sí/no (fuente)
3. Encaje: rol · nivel/años · ubicación · inglés · contrato (marca lo que no cumple)
4. Repetida: no / sí (dónde)
5. Alertas: ninguna / cuáles
6. Cómo aplicar: botón en <sitio> | correo <dirección> (fuente, confirmada sí/no) · requisitos del proceso
```

Si hay acceso de escritura a Drive, guarda ese mismo reporte como archivo de texto `Verificacion.txt` en la carpeta de
la vacante (así queda trazable). No borres ni muevas carpetas: el usuario decide qué hacer con las descartadas.

## Criterios del documento "Cómo filtro tus vacantes"

Pendiente: el documento del usuario (enlace en `files.instinct.com`) no se pudo leer desde la nube. Cuando esté
disponible, sus criterios se agregan aquí y, si contradicen algo de arriba, se le pregunta al usuario cuál manda.
