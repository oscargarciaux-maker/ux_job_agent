# Recuperación de la fase IA sin duplicados ni gasto innecesario

Actualizado: 2026-11-05. Diagnóstico basado en Drive y en el registro, no en acceso al programador de Claude.

## Síntoma comprobado
- `Sin revisar/2026-11-05`: 14 carpetas de vacantes y 14 filas de `Hoja 1` en estado `Esperando CV (IA)`.
- La muestra revisada de carpetas solo contiene `Detalle_Vacante`; faltan `Verificacion.txt` y `CV_IA.json`.
- La pestaña `Agentes` no tiene filas fechadas 2026-11-05; `Por enviar` no tiene HV de esa fecha.
- GitHub Actions JobSpy y el pipeline de Apps Script sí generaron resultados. `generarCVsDesdeIA` **solo consume** `CV_IA.json`; no ejecuta Claude. No se ha verificado el estado real de las tareas programadas en Claude.

## Recuperación manual controlada (antes de gastar tokens)
1. Abrir en Claude las tareas programadas `Jefe de la mañana` (06:03 y 07:03 hora Bogotá) y `Revisión HV diaria` (07:53 y 08:53). Comprobar si están activas, historial de ejecuciones, errores de permisos, límite semanal del plan y si su entorno aún dispone de conectores Drive/Docs/Sheets.
2. Si las tareas están activas y el historial muestra agotamiento del plan o fallos de herramientas, corregir **esa causa**; no reinstalar activadores de Apps Script ni repetir las búsquedas.
3. Como recuperación, ejecutar **una sola vez** la tarea `Jefe de la mañana` con `ia/prompt_cv_diario.md` y los recursos vigentes de Drive. Debe empezar comprobando `Agentes` y continuar únicamente las carpetas que no tienen `Verificacion.txt`, `CV_IA.json`, o `Revision.txt`.
4. Límite de la recuperación: una sesión coordinadora; agentes por rol, no por vacante; leer cada recurso una sola vez; máximo de 15 HV nuevas por jornada sumando las sesiones; no volver a buscar vacantes ni ejecutar Apify/SerpAPI. Si queda poco presupuesto, procesar primero las oportunidades útiles en Colombia.
5. Confirmar que aparecen `Verificacion.txt` y luego `CV_IA.json`. Después de que el activador ordinario de Apps Script los procese, comprobar la HV y `Revision.txt`, estado de `Hoja 1`, y las entradas de `Por enviar` y `Agentes`.
6. Si `CV_IA.json` existe pero la HV no aparece, revisar errores de Apps Script y `CV_IA_ERRORES.txt`; no reescribir todas las HV. Solo si se confirma que faltan activadores, usar `configurarAgente`, pues reinstala los tres grupos de activadores y puede crear fuentes/propiedades. Requiere revisión humana.

## Protección
- No enviar aplicaciones ni correos automáticamente. Respetar las autorizaciones individuales existentes de `EnvioProgramado.gs`.
- No insertar datos de `CONTEXTO_CV` ni credenciales en GitHub público.
- No regenerar una HV existente ni crear duplicados al reanudar.
- No inferir que Claude funcionó porque GitHub Actions pasó: son sistemas independientes.

## Criterio de resolución
El problema queda resuelto solo si una vacante real tiene verificación, JSON, HV y revisión; la hoja refleja el resultado y la bitácora muestra una ejecución de la tarea de IA. Un cambio en la interfaz del tablero no basta.
