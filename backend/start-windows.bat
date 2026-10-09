@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 22 or newer is required.
  echo Install it from https://nodejs.org/ and reopen this window.
  pause
  exit /b 1
)
for /f "tokens=1 delims=v." %%V in ('node --version') do set NODE_MAJOR=%%V
if not defined NODE_MAJOR (
  echo Could not detect Node.js version.
  pause
  exit /b 1
)
if %NODE_MAJOR% LSS 22 (
  echo Node.js 22 or newer is required. Detected:
  node --version
  pause
  exit /b 1
)
echo Starting AWEWEBOS Local Publish Node on this computer only.
echo Keep this window open while you want your files and apps to be available.
echo The publish token is shown below. Keep it private.
npm start
pause
