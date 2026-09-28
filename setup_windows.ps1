$ErrorActionPreference = 'Stop'
Write-Host '=== SceneForge Fresh Setup ===' -ForegroundColor Cyan
if (-not (Get-Command py -ErrorAction SilentlyContinue)) { throw 'Python launcher (py) was not found. Install Python 3.11 first.' }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw 'npm was not found. Install Node.js first.' }
Set-Location $PSScriptRoot
Write-Host '[1/3] Creating backend virtual environment...'
py -3.11 -m venv backend\venv
Write-Host '[2/3] Installing backend dependencies...'
& .\backend\venv\Scripts\python.exe -m pip install --upgrade pip
& .\backend\venv\Scripts\python.exe -m pip install -r backend\requirements.txt
Write-Host '[3/3] Installing frontend dependencies...'
Set-Location frontend
npm install
Set-Location ..
Write-Host ''
Write-Host 'Setup complete.' -ForegroundColor Green
Write-Host 'Next: edit config\settings.json with your known-working 3DGS and SIBR paths.'
Write-Host 'Then run: .\run_backend.ps1 and .\run_frontend.ps1' -ForegroundColor Yellow
