@echo off
REM -----------------------------------------------------------------------------
REM DTS Server Start Script (Windows)
REM -----------------------------------------------------------------------------
REM Usage:
REM   scripts\start_server.bat           - Start with docker-compose
REM   scripts\start_server.bat --dev     - Start in development mode (hot reload)
REM   scripts\start_server.bat --local   - Start without Docker (local Python)
REM   scripts\start_server.bat --help    - Show help
REM -----------------------------------------------------------------------------

setlocal enabledelayedexpansion

REM Get the directory where this script is located
set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."

cd /d "%PROJECT_ROOT%"

REM Parse arguments
set "ARG=%~1"

if "%ARG%"=="--help" goto :help
if "%ARG%"=="-h" goto :help
if "%ARG%"=="--dev" goto :dev
if "%ARG%"=="--local" goto :local
if "%ARG%"=="--build" goto :build
if "%ARG%"=="--down" goto :down
if "%ARG%"=="--stop" goto :down
if "%ARG%"=="--logs" goto :logs
if "%ARG%"=="" goto :start

echo Unknown option: %ARG%
goto :help

:header
echo.
echo =====================================================================
echo            DTS - Dialogue Tree Search Server
echo =====================================================================
echo.
goto :eof

:help
call :header
echo Usage: %~nx0 [OPTIONS]
echo.
echo Options:
echo   --dev       Start in development mode with hot reload
echo   --local     Start without Docker (uses local Python environment)
echo   --build     Force rebuild Docker image before starting
echo   --down      Stop and remove containers
echo   --logs      Show container logs
echo   --help      Show this help message
echo.
echo Examples:
echo   %~nx0                 Start production server
echo   %~nx0 --dev           Start with hot reload
echo   %~nx0 --local         Run without Docker
echo   %~nx0 --build         Rebuild and start
echo.
goto :eof

:check_env
if not exist ".env" (
    echo Warning: .env file not found!
    echo Please create a .env file with your API keys.
    echo See .env.example for reference.
    exit /b 1
)
goto :eof

:check_docker
where docker >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Error: Docker is not installed or not in PATH
    echo Please install Docker: https://docs.docker.com/get-docker/
    exit /b 1
)

docker info >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Error: Docker daemon is not running
    echo Please start Docker Desktop.
    exit /b 1
)
goto :eof

:start
call :header
call :check_env
call :check_docker

echo Starting DTS server with Docker...
docker-compose up -d dts-server

echo.
echo Server started!
echo API:      http://localhost:8000
echo Docs:     http://localhost:8000/docs
echo Frontend: Open frontend\index.html in your browser
echo.
echo Run 'docker-compose logs -f' to view logs
goto :eof

:build
call :header
call :check_env
call :check_docker

echo Building and starting DTS server...
docker-compose up -d --build dts-server

echo.
echo Server started!
echo API:      http://localhost:8000
echo Docs:     http://localhost:8000/docs
goto :eof

:dev
call :header
call :check_env
call :check_docker

echo Starting DTS server in development mode...
docker-compose --profile dev up dts-server-dev
goto :eof

:local
call :header
call :check_env

echo Starting DTS server locally...

REM Activate virtual environment if it exists
if exist ".venv\Scripts\activate.bat" (
    call .venv\Scripts\activate.bat
) else (
    echo Warning: .venv not found. Using system Python.
)

REM Set PYTHONPATH
set "PYTHONPATH=%PROJECT_ROOT%"

REM Start server
uvicorn backend.api.server:app --host localhost --port 8000 --reload --log-level info
goto :eof

:down
call :check_docker
echo Stopping DTS containers...
docker-compose down
echo Containers stopped.
goto :eof

:logs
call :check_docker
docker-compose logs -f
goto :eof

endlocal
