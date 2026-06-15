@echo off
echo Iniciando servidor de desarrollo...
echo.
echo El servidor estara disponible en: http://localhost:3000
echo.
echo Presiona Ctrl+C para detener el servidor
echo.
start http://localhost:3000
call npm run dev
