# Instalación del agente en Google Apps Script (una sola vez, ~10 minutos)

Después de esto el agente corre solo todos los días y se actualiza solo desde GitHub.

1. **Activa la API de Apps Script:** entra a https://script.google.com/home/usersettings y activa "API de Google Apps Script".
2. **Crea el proyecto:** en https://script.google.com haz clic en **Nuevo proyecto** y ponle de nombre `Agente UX`.
3. **Pega el manifiesto:** ⚙️ *Configuración del proyecto* → marca **"Mostrar el archivo de manifiesto appsscript.json en el editor"**. Vuelve al editor (`< >`), abre `appsscript.json`, borra todo y pega el contenido de [`apps_script/appsscript.json`](apps_script/appsscript.json).
4. **Pega el instalador:** abre `Código.gs`, borra todo y pega el contenido de [`instalador/Instalador.gs`](instalador/Instalador.gs). Guarda (💾).
5. **Instala:** arriba elige la función `instalar` y haz clic en **▶ Ejecutar**. Acepta los permisos (si aparece "Google no verificó esta app": *Configuración avanzada* → *Ir a Agente UX*). Recarga la página: verás todos los archivos del agente.
6. **Tu clave de SerpAPI:** ⚙️ *Configuración del proyecto* → *Propiedades del script* → **Agregar propiedad**: `SERPAPI_API_KEY` = tu clave **nueva**.
   - Opcional: si ya tienes carpeta, hoja o plantilla de CV, agrega también `GOOGLE_DRIVE_ROOT_FOLDER_ID`, `GOOGLE_SHEET_ID` y `GOOGLE_DOCS_MASTER_TEMPLATE_ID`. Si no, el paso 7 las crea.
7. **Configura:** ejecuta la función `configurarAgente`. En el *Registro de ejecución* verás los enlaces a la carpeta, la hoja y la plantilla de CV.
8. **Tu CV:** abre la plantilla y pon tu CV real, dejando los marcadores `{{CARGO}}`, `{{EMPRESA}}`, `{{RESUMEN}}` y `{{ENFOQUE}}` donde quieras que se personalice.
9. **Prueba:** ejecuta `ejecutarPrueba`. Debe crear 2 carpetas de prueba en Drive y 2 borradores en Gmail (a direcciones `@example.com`, puedes borrarlos).

## Uso diario
- **Automático:** 7:00 AM se sincroniza con GitHub, 8:00 AM busca vacantes y deja los borradores en Gmail.
- **Manual:** en el editor ejecuta `ejecutarPipeline` (real), `ejecutarPrueba` (vacantes de prueba) o `ejecutarSimulacion` (no toca nada).
- Si algo falla, Google te envía un correo con el error.
