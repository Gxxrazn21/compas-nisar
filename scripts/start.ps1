# Inicia Compás en http://127.0.0.1:8000 (backend + interfaz ya compilada).
# Uso:  powershell -ExecutionPolicy Bypass -File scripts\start.ps1 [-Build] [-Prewarm]
param(
    [switch]$Build,    # vuelve a compilar la interfaz aunque ya exista dist\
    [switch]$Prewarm   # descarga y calcula las historias antes de abrir (recomendado antes de presentar)
)
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)

python -m pip install -q -r requirements.txt
if (-not (Test-Path 'node_modules')) { npm install }
if ($Build -or -not (Test-Path 'dist\index.html')) { npm run build }
if ($Prewarm) { python -X utf8 scripts\prewarm.py }

Start-Process 'http://127.0.0.1:8000'
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
