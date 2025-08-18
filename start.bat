@echo off
echo Starting Buffer Killer App...

REM Try local electron first
if exist node_modules\.bin\electron.cmd (
    echo Using local Electron...
    node_modules\.bin\electron.cmd .
) else (
    REM Try global electron
    where electron >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        echo Using global Electron...
        electron .
    ) else (
        echo ERROR: Electron is not installed!
        echo Please run: npm install electron@28.0.0
        pause
    )
)