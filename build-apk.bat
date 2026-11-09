@echo off
setlocal
echo ===================================================
echo   Building AI Pest Detection Android APK (Debug)
echo ===================================================

cd /d "%~dp0android"

REM Automatically locate Java from Android Studio if not already in JAVA_HOME
if not defined JAVA_HOME (
    if exist "C:\Program Files\Android\Android Studio\jbr" (
        set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
    )
)

echo Using JAVA_HOME: %JAVA_HOME%
echo.

call gradlew.bat assembleDebug

if %ERRORLEVEL% equ 0 (
    echo.
    echo ===================================================
    echo   BUILD SUCCESSFUL!
    echo   APK: android\app\build\outputs\apk\debug\app-debug.apk
    echo ===================================================
    start explorer.exe "%~dp0android\app\build\outputs\apk\debug"
) else (
    echo.
    echo [ERROR] Build failed. Please check the error logs above.
)

pause

