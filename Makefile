# Bitcoin Trading Strategy Backtesting Tool - Makefile
# Convenient commands for development and deployment

.PHONY: help install install-dev test test-backend test-frontend lint format clean run-backend run-frontend run-docker build-docker stop-docker logs

# Default target
help:
	@echo "Bitcoin Trading Strategy Backtesting Tool"
	@echo "=========================================="
	@echo ""
	@echo "Available commands:"
	@echo "  install          Install Python dependencies"
	@echo "  install-dev      Install development dependencies"
	@echo "  test             Run all tests"
	@echo "  test-backend     Run backend tests only"
	@echo "  test-frontend    Run frontend tests only"
	@echo "  lint             Run linting checks"
	@echo "  format           Format code with black and isort"
	@echo "  clean            Clean up generated files"
	@echo "  run-backend      Start backend server"
	@echo "  run-frontend     Start frontend development server"
	@echo "  run-docker       Start with Docker Compose"
	@echo "  build-docker     Build Docker images"
	@echo "  stop-docker      Stop Docker containers"
	@echo "  logs             Show Docker logs"
	@echo ""

# Installation
install:
	pip install -r requirements.txt

install-dev: install
	pip install -r requirements.txt
	cd frontend && npm install

# Testing
test: test-backend test-frontend

test-backend:
	cd backend && python -m pytest tests/ -v --cov=core --cov=api

test-frontend:
	cd frontend && npm test

# Code quality
lint:
	flake8 backend --count --select=E9,F63,F7,F82 --show-source --statistics
	flake8 backend --count --exit-zero --max-complexity=10 --max-line-length=127 --statistics
	cd frontend && npm run lint

format:
	black backend/
	isort backend/
	cd frontend && npm run format

# Cleanup
clean:
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	rm -rf backend/.pytest_cache
	rm -rf backend/htmlcov
	rm -rf backend/coverage.xml
	rm -rf frontend/dist
	rm -rf frontend/node_modules
	rm -rf outputs/reports/*.html
	rm -rf outputs/reports/*.png
	rm -rf outputs/logs/*.log

# Development servers
run-backend:
	cd backend && uvicorn api.main:app --reload --host 0.0.0.0 --port 8000

run-frontend:
	cd frontend && npm run dev

# Docker commands
run-docker:
	docker-compose up --build

build-docker:
	docker-compose build

stop-docker:
	docker-compose down

logs:
	docker-compose logs -f

# Quick start commands
start: install-dev
	@echo "Starting Bitcoin Trading Strategy Tool..."
	@echo "Backend will be available at: http://localhost:8000"
	@echo "Frontend will be available at: http://localhost:3000"
	@echo ""
	@echo "Starting backend in background..."
	@$(MAKE) run-backend &
	@echo "Waiting for backend to start..."
	@sleep 5
	@echo "Starting frontend..."
	@$(MAKE) run-frontend

# API examples
api-examples:
	@echo "API Examples:"
	@echo "============="
	@echo ""
	@echo "1. Get data info:"
	@echo "   curl http://localhost:8000/api/data/info"
	@echo ""
	@echo "2. Get available strategies:"
	@echo "   curl http://localhost:8000/api/strategies"
	@echo ""
	@echo "3. Run SMA backtest:"
	@echo "   curl -X POST http://localhost:8000/api/backtest \\"
	@echo "        -H 'Content-Type: application/json' \\"
	@echo "        -d '{\"strategy\": \"SMA\", \"parameters\": {\"fast_window\": 50, \"slow_window\": 200}, \"initial_capital\": 10000}'"
	@echo ""
	@echo "4. Run RSI backtest:"
	@echo "   curl -X POST http://localhost:8000/api/backtest \\"
	@echo "        -H 'Content-Type: application/json' \\"
	@echo "        -d '{\"strategy\": \"RSI\", \"parameters\": {\"rsi_period\": 14, \"oversold\": 30, \"overbought\": 70}, \"initial_capital\": 10000}'"
	@echo ""

# Development workflow
dev-setup: install-dev
	@echo "Setting up development environment..."
	@mkdir -p outputs/reports
	@mkdir -p outputs/logs
	@echo "Development environment ready!"
	@echo "Run 'make start' to start both backend and frontend"

# Production deployment
deploy: build-docker
	@echo "Deploying to production..."
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Health checks
health:
	@echo "Checking service health..."
	@curl -s http://localhost:8000/health | jq . || echo "Backend not responding"
	@curl -s http://localhost:3000/ | grep -q "Bitcoin Trading" && echo "Frontend OK" || echo "Frontend not responding"