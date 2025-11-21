@echo off
REM === Caminhos do projeto ===
set ROOT_BACKEND=D:\CHAPADAO\WebAppSentinela\backend
set ROOT_FRONTEND=D:\CHAPADAO\WebAppSentinela\frontend

REM === Backend Flask usando a venv correta ===
start "Backend Sentinela" cmd /K "cd /D %ROOT_BACKEND% && D:\CHAPADAO\WebAppSentinela\backend\venv\Scripts\python.exe app.py"

REM === Frontend HTTP ===
start "Frontend Sentinela" cmd /K "cd /D %ROOT_FRONTEND% && python -m http.server 8000"

REM === Espera alguns segundos e abre o navegador ===
timeout /t 3 /nobreak >nul

start "" "http://127.0.0.1:8000/"
