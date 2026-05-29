@echo off
REM Setup Coturn TURN server for WebRTC development
REM Run this script as Administrator on the machine that will host TURN

echo === Coturn TURN Server Setup ===
echo.

where choco >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Chocolatey not found. Installing via winget...
    winget install -e --id Coturn.Coturn 2>nul
    if %ERRORLEVEL% NEQ 0 (
        echo winget failed. Installing via Chocolatey...
        @"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -InputFormat None -ExecutionPolicy Bypass -Command "[System.Net.ServicePointManager]::SecurityProtocol = 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))" && SET "PATH=%PATH%;%ALLUSERSPROFILE%\chocolatey\bin"
        choco install coturn -y
    )
)

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Failed to install Coturn. Please install manually:
    echo   1. Follow: https://github.com/coturn/coturn
    echo   2. Or use a cloud TURN service (see .env comments)
    echo.
    pause
    exit /b 1
)

echo.
echo Coturn installed. Creating config...
set TURN_PORT=3478
set TURN_USER=tuchat
set TURN_PASS=devturn2024

echo listening-device=%COMPUTERNAME% > %USERPROFILE%\turnserver.conf
echo listening-port=%TURN_PORT% >> %USERPROFILE%\turnserver.conf
echo relay-device=%COMPUTERNAME% >> %USERPROFILE%\turnserver.conf
echo min-port=49152 >> %USERPROFILE%\turnserver.conf
echo max-port=65535 >> %USERPROFILE%\turnserver.conf
echo user=%TURN_USER%:%TURN_PASS% >> %USERPROFILE%\turnserver.conf
echo realm=tuchat.dev >> %USERPROFILE%\turnserver.conf
echo fingerprint >> %USERPROFILE%\turnserver.conf
echo lt-cred-mech >> %USERPROFILE%\turnserver.conf

echo.
echo Config written to %%USERPROFILE%%\turnserver.conf
echo.
echo To start Coturn:
echo   turnserver -c %%USERPROFILE%%\turnserver.conf
echo.
echo Update your project .env:
echo   TURN_URL=turn:%COMPUTERNAME%:%TURN_PORT%
echo   TURN_USERNAME=%TURN_USER%
echo   TURN_CREDENTIAL=%TURN_PASS%
echo.
pause
