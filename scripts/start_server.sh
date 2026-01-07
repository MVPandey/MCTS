#!/bin/bash
# -----------------------------------------------------------------------------
# DTS Server Start Script (Unix/macOS/Linux)
# -----------------------------------------------------------------------------
# Usage:
#   ./scripts/start_server.sh           # Start with docker-compose
#   ./scripts/start_server.sh --dev     # Start in development mode (hot reload)
#   ./scripts/start_server.sh --local   # Start without Docker (local Python)
#   ./scripts/start_server.sh --help    # Show help
# -----------------------------------------------------------------------------

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║           DTS - Dialogue Tree Search Server                   ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_help() {
    print_header
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --dev       Start in development mode with hot reload (Docker)"
    echo "  --local     Start without Docker (uses local Python environment)"
    echo "  --frontend  Start React frontend dev server (with HMR on :3000)"
    echo "  --build     Force rebuild Docker image before starting"
    echo "  --down      Stop and remove containers"
    echo "  --logs      Show container logs"
    echo "  --help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                 # Start production server"
    echo "  $0 --dev           # Start with hot reload (Docker)"
    echo "  $0 --local         # Run without Docker"
    echo "  $0 --frontend      # Start React dev server (run with --local in another terminal)"
    echo "  $0 --build         # Rebuild and start"
    echo ""
}

check_env() {
    if [ ! -f ".env" ]; then
        echo -e "${YELLOW}Warning: .env file not found!${NC}"
        echo "Please create a .env file with your API keys."
        echo "See .env.example for reference."
        exit 1
    fi
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Error: Docker is not installed or not in PATH${NC}"
        echo "Please install Docker: https://docs.docker.com/get-docker/"
        exit 1
    fi

    if ! docker info &> /dev/null; then
        echo -e "${RED}Error: Docker daemon is not running${NC}"
        echo "Please start Docker Desktop or the Docker service."
        exit 1
    fi
}

start_docker() {
    local BUILD_FLAG=""
    if [ "$1" == "--build" ]; then
        BUILD_FLAG="--build"
    fi

    echo -e "${GREEN}Starting DTS server with Docker...${NC}"
    docker-compose up -d $BUILD_FLAG dts-server

    echo ""
    echo -e "${GREEN}Server started!${NC}"
    echo -e "API:      ${BLUE}http://localhost:8000${NC}"
    echo -e "Docs:     ${BLUE}http://localhost:8000/docs${NC}"
    echo -e "Frontend: ${BLUE}Open frontend/index.html in your browser${NC}"
    echo ""
    echo "Run 'docker-compose logs -f' to view logs"
}

start_docker_dev() {
    echo -e "${GREEN}Starting DTS server in development mode...${NC}"
    docker-compose --profile dev up $1 dts-server-dev
}

start_local() {
    echo -e "${GREEN}Starting DTS server locally...${NC}"

    # Check for virtual environment
    if [ -d ".venv" ]; then
        source .venv/bin/activate
    else
        echo -e "${YELLOW}Warning: .venv not found. Using system Python.${NC}"
    fi

    # Build frontend if not already built
    if [ ! -d "frontend/dist" ]; then
        echo -e "${YELLOW}Building frontend...${NC}"
        cd frontend && npm install && npm run build && cd ..
    fi

    # Set PYTHONPATH
    export PYTHONPATH="$PROJECT_ROOT"

    # Start server with uvicorn
    uvicorn backend.api.server:app \
        --host localhost \
        --port 8000 \
        --reload \
        --log-level info
}

start_frontend_dev() {
    echo -e "${GREEN}Starting frontend dev server...${NC}"
    cd frontend && npm run dev
}

stop_docker() {
    echo -e "${YELLOW}Stopping DTS containers...${NC}"
    docker-compose down
    echo -e "${GREEN}Containers stopped.${NC}"
}

show_logs() {
    docker-compose logs -f
}

# Main
print_header
check_env

case "${1:-}" in
    --help|-h)
        print_help
        ;;
    --dev)
        check_docker
        start_docker_dev "${2:-}"
        ;;
    --local)
        start_local
        ;;
    --frontend)
        start_frontend_dev
        ;;
    --build)
        check_docker
        start_docker "--build"
        ;;
    --down|--stop)
        check_docker
        stop_docker
        ;;
    --logs)
        check_docker
        show_logs
        ;;
    "")
        check_docker
        start_docker
        ;;
    *)
        echo -e "${RED}Unknown option: $1${NC}"
        print_help
        exit 1
        ;;
esac
