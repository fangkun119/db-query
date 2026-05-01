.PHONY: help install dev build test lint clean backend-install frontend-install
.PHONY: backend-dev backend-test backend-lint backend-run
.PHONY: frontend-dev frontend-build frontend-lint test-db test-api

# Default target
help:
	@echo "Available commands:"
	@echo "  install           - Install all dependencies (backend + frontend)"
	@echo "  dev               - Start all development servers"
	@echo "  build             - Build all projects"
	@echo "  test              - Run backend tests"
	@echo "  test-db           - Create test database (interview_db)"
	@echo "  test-api          - Show REST Client API testing instructions"
	@echo "  lint              - Run all linters"
	@echo "  clean             - Clean build artifacts"
	@echo ""
	@echo "Backend commands:"
	@echo "  backend-install   - Install backend dependencies"
	@echo "  backend-dev       - Start backend dev server"
	@echo "  backend-test      - Run backend tests"
	@echo "  backend-lint      - Run backend linter"
	@echo "  backend-run       - Run backend server"
	@echo ""
	@echo "Frontend commands:"
	@echo "  frontend-install  - Install frontend dependencies"
	@echo "  frontend-dev      - Start frontend dev server"
	@echo "  frontend-build    - Build frontend for production"
	@echo "  frontend-lint     - Run frontend linter"

# Install all dependencies
install: backend-install frontend-install

# Install backend dependencies
backend-install:
	@echo "Installing backend dependencies..."
	cd backend && uv sync

# Install frontend dependencies
frontend-install:
	@echo "Installing frontend dependencies..."
	cd frontend && npm install

# Start all development servers
dev:
	@echo "Starting all development servers..."
	@make -j2 backend-dev frontend-dev

# Start backend dev server
backend-dev:
	@echo "Starting backend dev server..."
	cd backend && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Start frontend dev server
frontend-dev:
	@echo "Starting frontend dev server..."
	cd frontend && npm run dev

# Build all projects
build: backend/frontend-build
	@echo "Build complete"

# Build frontend for production
frontend-build:
	@echo "Building frontend..."
	cd frontend && npm run build

# Run all tests
test: backend-test

# Run backend tests
backend-test:
	@echo "Running backend tests..."
	cd backend && uv run pytest

# Run all linters
lint: frontend-lint

# Run backend linter
backend-lint:
	@echo "Running backend linter..."
	cd backend && uv run ruff check .

# Run frontend linter
frontend-lint:
	@echo "Running frontend linter..."
	cd frontend && npm run lint

# Run backend server
backend-run:
	@echo "Running backend server..."
	cd backend && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -rf backend/.venv
	rm -rf frontend/node_modules
	rm -rf frontend/dist
	rm -rf frontend/.vite
	@echo "Clean complete"

# Create test database
test-db:
	@echo "Creating test database..."
	psql -U postgres -f test/db_scripts/postgres/interview_db.sql

# API test instructions
test-api:
	@echo "============================================================================"
	@echo "REST Client API Testing"
	@echo "============================================================================"
	@echo "1. Install VSCode REST Client extension"
	@echo "2. Start backend: make backend-dev"
	@echo "3. Open test/rest/postgres.rest in VSCode"
	@echo "4. Click 'Send Request' above each test"
	@echo "============================================================================"
	@echo "Or use keyboard shortcut: Cmd+Alt+R (Mac) / Ctrl+Alt+R (Windows/Linux)"
	@echo "============================================================================"
