@echo off
setlocal enabledelayedexpansion
title ClipFlow - API + Tunnel
cd /d "%~dp0"

set "TUNNEL_LOG=%TEMP%\clipflow-tunnel.log"
set "API_URL=http://localhost:4000"

echo.
echo  ===========================================
echo    ClipFlow - starting API and tunnel
echo  ===========================================
echo.

REM ---------------------------------------------------------------- checks --
where node >nul 2>&1
if errorlevel 1 (
  echo  [X] Node.js not found. Install it from https://nodejs.org
  goto :fail
)

REM cloudflared may not be on PATH straight after install; look where winget puts it.
set "CLOUDFLARED=cloudflared"
where cloudflared >nul 2>&1
if errorlevel 1 (
  if exist "%ProgramFiles%\cloudflared\cloudflared.exe" (
    set "CLOUDFLARED=%ProgramFiles%\cloudflared\cloudflared.exe"
  ) else if exist "%ProgramFiles(x86)%\cloudflared\cloudflared.exe" (
    set "CLOUDFLARED=%ProgramFiles(x86)%\cloudflared\cloudflared.exe"
  ) else (
    echo  [X] cloudflared not found. Install it with:
    echo      winget install --id Cloudflare.cloudflared
    goto :fail
  )
)

if not exist "node_modules" (
  echo  [*] Installing dependencies, this happens once...
  call npm install
  if errorlevel 1 goto :fail
)

if not exist "server\.env" (
  echo  [*] Creating server\.env from the example
  copy /y "server\.env.example" "server\.env" >nul
)

REM ------------------------------------------------------------------ API ---
REM Reuse an API that is already listening instead of starting a second one.
set "API_RUNNING="
for /f %%P in ('powershell -NoProfile -Command "(Test-NetConnection -ComputerName localhost -Port 4000 -InformationLevel Quiet -WarningAction SilentlyContinue)"') do set "API_RUNNING=%%P"

if /i "!API_RUNNING!"=="True" (
  echo  [=] API already running on %API_URL%
) else (
  echo  [*] Starting the API in its own window...
  start "ClipFlow API" cmd /c "cd /d "%~dp0server" && npx tsx src/index.ts"
)

echo  [*] Waiting for the API to answer...
set "API_OK="
for /l %%i in (1,1,60) do (
  if not defined API_OK (
    powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri '%API_URL%/api/health' -UseBasicParsing -TimeoutSec 3; exit 0 } catch { exit 1 }" >nul 2>&1
    if not errorlevel 1 set "API_OK=1"
    if not defined API_OK ping -n 3 127.0.0.1 >nul
  )
)

if not defined API_OK (
  echo  [X] The API did not start. Check the "ClipFlow API" window for the reason.
  goto :fail
)
echo  [OK] API is up.

REM --------------------------------------------------------------- tunnel ---
if exist "%TUNNEL_LOG%" del /q "%TUNNEL_LOG%" >nul 2>&1

echo  [*] Opening the Cloudflare tunnel...
start /b "" "%CLOUDFLARED%" tunnel --url %API_URL% --logfile "%TUNNEL_LOG%" >nul 2>&1

set "TUNNEL_URL="
for /l %%i in (1,1,45) do (
  if not defined TUNNEL_URL (
    ping -n 3 127.0.0.1 >nul
    if exist "%TUNNEL_LOG%" (
      for /f "usebackq delims=" %%U in (`powershell -NoProfile -Command "$m = Select-String -Path '%TUNNEL_LOG%' -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -AllMatches -ErrorAction SilentlyContinue; if ($m) { $m.Matches[0].Value }"`) do set "TUNNEL_URL=%%U"
    )
  )
)

if not defined TUNNEL_URL (
  echo  [X] The tunnel did not report a URL. Log: %TUNNEL_LOG%
  goto :fail
)

REM ---------------------------------------------------------------- ready ---
echo.
echo  ===========================================
echo    READY
echo  ===========================================
echo.
echo    Public API URL:
echo      !TUNNEL_URL!
echo.
echo    This URL is NEW every time you run this script.
echo    Paste it into Vercel as API_ORIGIN, then redeploy:
echo      Settings -^> Environment Variables -^> API_ORIGIN
echo      Deployments -^> ... -^> Redeploy
echo.
echo    Your site: https://clip-flow-swart.vercel.app
echo.
echo    Prefer to just use it yourself? Close this and run:  npm run dev
echo    then open http://localhost:3000 - no tunnel needed.
echo.
echo  -------------------------------------------
echo    Keep this window open. Closing it stops
echo    the tunnel. Close the "ClipFlow API"
echo    window too when you are done.
echo  -------------------------------------------
echo.

powershell -NoProfile -Command "Set-Clipboard -Value '!TUNNEL_URL!'" >nul 2>&1 && echo    (URL copied to your clipboard)
echo.

:hold
powershell -NoProfile -Command "Start-Sleep -Seconds 3600" >nul
goto :hold

:fail
echo.
echo  Startup failed. Nothing is running.
echo.
pause
exit /b 1
