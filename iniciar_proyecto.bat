@echo off
title 🚀 DIAGNOVET - DEMO TECNICA PROFESIONAL
mode con: cols=120 lines=40
color 0A

:: 1. Limpiar cualquier proceso previo en el puerto 8080
echo [SISTEMA] Limpiando puerto 8080 para evitar conflictos...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8080') do taskkill /f /pid %%a >nul 2>&1

:: 2. Iniciar el servidor en una VENTANA APARTE VISIBLE (para que veas los logs fallar/funcionar)
echo [SISTEMA] Iniciando servidor en ventana separada...
start "LOGS DEL SERVIDOR - DIAGNOVET" cmd /c "npm run dev"

:: Esperar a que el servidor arranque (7 segundos para estar seguros)
echo [SISTEMA] Esperando a que el servidor este listo...
timeout /t 7 /nobreak > nul

:menu
cls
echo ========================================================================================
echo                🐾 DIAGNOVET - DEMO TECNICA COMPLETA CON INTERFAZ 🐾
echo ========================================================================================
echo.
echo  Este script ejecutara las pruebas y abrira las paginas visuales automaticamente.
echo  IMPORTANTE: Los logs del servidor se ven en la OTRA ventana abierta.
echo.
echo ========================================================================================
echo.

echo [PASO 1: DOCUMENTACION SWAGGER]
echo Descripcion: Mostraremos la documentacion interactiva de la API.
echo.
echo -- Presiona una tecla para abrir SWAGGER --
pause > nul
start "" "http://localhost:8080/api-docs"
echo ✅ Swagger abierto.
echo.
echo ========================================================================================
echo.

echo [PASO 2: VERIFICACION DE SALUD (HEALTH CHECK)]
echo Peticion: GET /health
echo.
echo -- Presiona una tecla para verificar conexion con Google Cloud --
pause > nul
start "" "http://localhost:8080/health"
echo.
echo RESULTADO EN CONSOLA:
curl.exe -s "http://localhost:8080/health"
echo.
echo ========================================================================================
echo.

echo [PASO 3: INTERFAZ DE CARGA VISUAL (TEST UPLOAD)]
echo.
echo -- Presiona una tecla para abrir la INTERFAZ PARA EL VIDEO --
pause > nul
start "" "test-upload.html"
echo ✅ Interfaz visual lista.
echo.
echo ========================================================================================
echo.

echo [PASO 4: PRUEBA DE PROCESAMIENTO AUTOMATICO (IA)]
echo Peticion: POST /upload (Usando test-report.pdf)
echo.
echo -- Presiona una tecla para ejecutar el analisis de IA ahora --
pause > nul
echo.
echo ⏳ Analizando reporte con Document AI... (espera un momento)
curl.exe -X POST "http://localhost:8080/upload" -F "report=@test-report.pdf"
echo.
echo ✅ Datos extraidos correctamente.
echo.
echo ========================================================================================
echo.

echo [PASO 5: ESTADISTICAS Y CIERRE]
echo.
echo -- Presiona una tecla para ver estadisticas finales --
pause > nul
start "" "http://localhost:8080/reports/stats"
curl.exe -s "http://localhost:8080/reports/stats"
echo.
echo ========================================================================================
echo.

echo ✅ DEMO FINALIZADA CON EXITO. 
echo Puedes dejar la ventana de logs abierta para tu video.
echo.
echo -- Presiona una tecla para salir --
pause > nul
exit
