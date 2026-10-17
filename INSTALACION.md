# Instalación del agente en Google Apps Script (una sola vez, ~10 minutos)

Después de esto el agente corre solo todos los días y siempre usa la última versión probada del código en GitHub.

1. **Crea el proyecto:** en https://script.google.com haz clic en **Nuevo proyecto** y ponle de nombre `Agente UX`.
2. **Pega el manifiesto:** ⚙️ *Configuración del proyecto* → marca **"Mostrar el archivo de manifiesto appsscript.json en el editor"**. Vuelve al editor (`< >`), abre `appsscript.json`, borra todo y pega el contenido de [`apps_script/appsscript.json`](apps_script/appsscript.json).
3. **Pega el cargador:** abre `Código.gs`, borra todo y pega el contenido de [`instalador/Cargador.gs`](instalador/Cargador.gs). Guarda (💾). Es el único archivo del proyecto: en cada ejecución descarga el agente desde GitHub.
4. **Tu clave de SerpAPI:** ⚙️ *Configuración del proyecto* → *Propiedades del script* → **Agregar propiedad**: `SERPAPI_API_KEY` = tu clave **nueva**.
   - Opcional: si ya tienes carpeta, hoja o plantilla de CV, agrega también `GOOGLE_DRIVE_ROOT_FOLDER_ID`, `GOOGLE_SHEET_ID` y `GOOGLE_DOCS_MASTER_TEMPLATE_ID`. Si no, el paso 5 las crea.
5. **Configura:** elige la función `configurarAgente` y haz clic en **▶ Ejecutar**. Acepta los permisos (si aparece "Google no verificó esta app": *Configuración avanzada* → *Ir a Agente UX*). En el *Registro de ejecución* verás los enlaces a la carpeta, la hoja y la plantilla de CV.
6. **Tu CV:** abre la plantilla y pon tu CV real, dejando los marcadores `{{CARGO}}`, `{{EMPRESA}}`, `{{RESUMEN}}` y `{{ENFOQUE}}` donde quieras que se personalice.
7. **Prueba:** ejecuta `ejecutarPrueba`. Debe crear 2 carpetas de prueba en Drive y 2 borradores en Gmail (a direcciones `@example.com`, puedes borrarlos).

## Uso diario
- **Automático:** 8:00 AM busca vacantes y deja los borradores en Gmail.
- **Manual:** en el editor ejecuta `ejecutarPipeline` (real), `ejecutarPrueba` (vacantes de prueba) o `ejecutarSimulacion` (no toca nada).
- Si algo falla, Google te envía un correo con el error.
