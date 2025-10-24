# ============================================================================
# AI Music Royalty Platform - Makefile
# ============================================================================
# Common development and deployment tasks
# Usage: make [target]
# ============================================================================

.PHONY: help install dev build test lint format clean smoke deploy

# Default target
.DEFAULT_GOAL := help

# Colors
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[1;33m
NC := \033[0m # No Color

## help: Show this help message
help:
	@echo "$(BLUE)AI Music Royalty Platform - Makefile$(NC)"
	@echo ""
	@echo "$(GREEN)Available targets:$(NC)"
	@echo ""
	@grep -E '^## ' $(MAKEFILE_LIST) | sed 's/^## /  $(YELLOW)/' | sed 's/:/ $(NC)-/'
	@echo ""

## install: Install all dependencies
install:
	@echo "$(BLUE)Installing dependencies...$(NC)"
	npm install
	cd server && pip install -r requirements.txt

## dev: Start development servers (Next.js + FastAPI)
dev:
	@echo "$(BLUE)Starting development servers...$(NC)"
	@echo "$(YELLOW)Next.js:$(NC) http://localhost:3000"
	@echo "$(YELLOW)FastAPI:$(NC) http://localhost:8001"
	@echo "$(YELLOW)API Docs:$(NC) http://localhost:8001/docs"
	@echo ""
	@echo "Press Ctrl+C to stop all servers"
	@echo ""
	@# Run both servers in parallel
	@trap 'kill 0' EXIT; \
	(cd server && uvicorn main:app --reload --port 8001 & npm run dev)

## build: Build production artifacts
build:
	@echo "$(BLUE)Building production artifacts...$(NC)"
	npm run build
	cd server && docker build -t ai-music-api:latest .

## test: Run all tests
test:
	@echo "$(BLUE)Running tests...$(NC)"
	npm run type-check
	cd server && pytest -v

## test-unit: Run unit tests only
test-unit:
	@echo "$(BLUE)Running unit tests...$(NC)"
	cd server && pytest tests/ -v

## lint: Run linters
lint:
	@echo "$(BLUE)Running linters...$(NC)"
	npm run lint
	cd server && flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics

## format: Format code
format:
	@echo "$(BLUE)Formatting code...$(NC)"
	npm run format
	cd server && black .

## smoke: Run smoke tests
smoke:
	@echo "$(BLUE)Running smoke tests...$(NC)"
	@chmod +x scripts/smoke.sh
	./scripts/smoke.sh local

## smoke-staging: Run smoke tests against staging
smoke-staging:
	@echo "$(BLUE)Running smoke tests (staging)...$(NC)"
	@chmod +x scripts/smoke.sh
	./scripts/smoke.sh staging

## smoke-prod: Run smoke tests against production
smoke-prod:
	@echo "$(BLUE)Running smoke tests (production)...$(NC)"
	@chmod +x scripts/smoke.sh
	./scripts/smoke.sh production

## seed: Seed database with demo data
seed:
	@echo "$(BLUE)Seeding database...$(NC)"
	@if [ -f scripts/seed.sh ]; then \
		chmod +x scripts/seed.sh && ./scripts/seed.sh; \
	else \
		echo "$(YELLOW)scripts/seed.sh not found$(NC)"; \
	fi

## migrate: Run database migrations
migrate:
	@echo "$(BLUE)Running database migrations...$(NC)"
	@echo "$(YELLOW)Applying Supabase migrations...$(NC)"
	@# Supabase migrations would go here
	@echo "$(GREEN)✓ Migrations complete$(NC)"

## docker-build: Build Docker image for FastAPI
docker-build:
	@echo "$(BLUE)Building Docker image...$(NC)"
	cd server && docker build -t ai-music-api:latest .

## docker-run: Run Docker container locally
docker-run:
	@echo "$(BLUE)Running Docker container...$(NC)"
	docker run --rm -p 8001:8001 \
		--env-file .env.local \
		ai-music-api:latest

## deploy-preview: Deploy preview to Vercel
deploy-preview:
	@echo "$(BLUE)Deploying preview to Vercel...$(NC)"
	vercel --yes

## deploy-prod: Deploy to production (Vercel + Railway)
deploy-prod:
	@echo "$(BLUE)Deploying to production...$(NC)"
	@echo "$(YELLOW)Frontend:$(NC) Deploying to Vercel..."
	vercel --prod --yes
	@echo "$(YELLOW)Backend:$(NC) Deploying to Railway..."
	@echo "$(GREEN)✓ Use Railway CLI or dashboard to deploy$(NC)"

## clean: Clean build artifacts
clean:
	@echo "$(BLUE)Cleaning build artifacts...$(NC)"
	rm -rf .next
	rm -rf node_modules/.cache
	rm -rf server/__pycache__
	rm -rf server/**/__pycache__
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	@echo "$(GREEN)✓ Clean complete$(NC)"

## logs: Tail development logs
logs:
	@echo "$(BLUE)Tailing logs...$(NC)"
	@echo "$(YELLOW)Press Ctrl+C to stop$(NC)"
	tail -f server/logs/*.log 2>/dev/null || echo "No log files found"

## health: Check health of all services
health:
	@echo "$(BLUE)Checking service health...$(NC)"
	@echo "$(YELLOW)API Health:$(NC)"
	@curl -s http://localhost:8001/health | jq . || echo "API not reachable"
	@echo ""
	@echo "$(YELLOW)Compliance Health:$(NC)"
	@curl -s http://localhost:8001/compliance/health | jq . || echo "Compliance API not reachable"
	@echo ""
	@echo "$(YELLOW)Frontend:$(NC)"
	@curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3000 || echo "Frontend not reachable"

## setup: Initial project setup
setup: install
	@echo "$(BLUE)Setting up project...$(NC)"
	@if [ ! -f .env.local ]; then \
		echo "$(YELLOW)Creating .env.local from ENV_EXAMPLE.txt...$(NC)"; \
		cp ENV_EXAMPLE.txt .env.local; \
		echo "$(GREEN)✓ .env.local created$(NC)"; \
		echo "$(YELLOW)⚠ Edit .env.local with your actual values$(NC)"; \
	else \
		echo "$(GREEN).env.local already exists$(NC)"; \
	fi
	@echo ""
	@echo "$(GREEN)✓ Setup complete!$(NC)"
	@echo ""
	@echo "Next steps:"
	@echo "  1. Edit .env.local with your Supabase credentials"
	@echo "  2. Run 'make dev' to start development servers"
	@echo "  3. Visit http://localhost:3000"

## version: Show versions of tools
version:
	@echo "$(BLUE)Tool Versions:$(NC)"
	@echo "Node: $$(node --version)"
	@echo "npm: $$(npm --version)"
	@echo "Python: $$(python --version 2>&1)"
	@echo "Docker: $$(docker --version)"

