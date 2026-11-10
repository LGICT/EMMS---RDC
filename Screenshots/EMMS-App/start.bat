@echo off
rem Opens the EMMS Memo System in your web browser.
cd /d "%~dp0"
if not exist "index.html" (
  echo Could not find index.html. Keep start.bat inside the EMMS-App folder.
  pause
  exit /b 1
)
start "" "%~dp0index.html"
