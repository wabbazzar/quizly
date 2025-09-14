# Quizly Makefile - Common Development Commands
.PHONY: help dev build preview serve test lint type-check clean install setup mobile-dev pwa-build pwa-serve

# Default target - show help
help:
	@echo "Quizly Development Commands:"
	@echo ""
	@echo "Setup & Installation:"
	@echo "  make install     - Install dependencies"
	@echo "  make setup       - Full project setup (install + build)"
	@echo ""
	@echo "Development:"
	@echo "  make dev         - Start development server (localhost:5173)"
	@echo "  make mobile-dev  - Start dev server accessible from mobile devices"
	@echo "  make build       - Build for production"
	@echo "  make preview     - Preview production build"
	@echo ""
	@echo "PWA Testing:"
	@echo "  make pwa-build   - Build PWA with service worker"
	@echo "  make pwa-serve   - Serve PWA on network for mobile testing"
	@echo "  make serve       - Quick serve production build"
	@echo ""
	@echo "Code Quality:"
	@echo "  make lint        - Run ESLint"
	@echo "  make type-check  - Run TypeScript type checking"
	@echo "  make test        - Run tests"
	@echo "  make test-watch  - Run tests in watch mode"
	@echo ""
	@echo "Utilities:"
	@echo "  make clean       - Clean build artifacts and node_modules"
	@echo "  make ports       - Show what's running on dev ports"
	@echo "  make kill-port   - Kill process on port 5173"

# Install dependencies
install:
	npm install

# Full project setup
setup: install
	@echo "✅ Project setup complete!"
	@echo "Run 'make dev' to start development server"

# Start development server
dev:
	npm run dev

# Start development server accessible from mobile devices on same network
mobile-dev:
	@echo "📱 Starting dev server for mobile access..."
	@echo "Server will be available at:"
	@echo "  - http://localhost:5173"
	@echo "  - http://$$(hostname -I | cut -d' ' -f1):5173"
	@echo ""
	npm run dev -- --host 0.0.0.0

# Build for production
build:
	npm run build

# Preview production build
preview:
	npm run preview

# Build PWA with service worker
pwa-build: build
	@echo "📦 PWA build complete!"
	@echo "Run 'make pwa-serve' to test on mobile devices"

# Serve PWA on network for mobile testing
pwa-serve: pwa-build
	@echo "🌐 Serving PWA for mobile testing..."
	@echo "PWA will be available at:"
	@echo "  - http://localhost:4173"
	@echo "  - http://$$(hostname -I | cut -d' ' -f1):4173"
	@echo ""
	@echo "📱 To test on mobile:"
	@echo "  1. Ensure your mobile device is on the same network"
	@echo "  2. Open the network URL above on your mobile browser"
	@echo "  3. Add to home screen to install as PWA"
	@echo ""
	npm run preview -- --host 0.0.0.0

# Quick serve production build
serve: build
	npx serve -s dist -p 3000

# Run linter
lint:
	npm run lint

# Run TypeScript type checking
type-check:
	npm run type-check

# Run tests
test:
	npm test

# Run tests in watch mode
test-watch:
	npm test -- --watch

# Clean build artifacts and dependencies
clean:
	rm -rf dist node_modules .vite
	@echo "✨ Clean complete! Run 'make install' to reinstall dependencies"

# Show what's running on development ports
ports:
	@echo "Checking common development ports..."
	@lsof -i :5173 2>/dev/null || echo "Port 5173 (Vite): Nothing running"
	@lsof -i :4173 2>/dev/null || echo "Port 4173 (Preview): Nothing running"
	@lsof -i :3000 2>/dev/null || echo "Port 3000 (Serve): Nothing running"

# Kill process on port 5173
kill-port:
	@echo "Killing process on port 5173..."
	@lsof -ti:5173 | xargs kill -9 2>/dev/null || echo "No process found on port 5173"

# Development workflow shortcuts
.PHONY: start stop restart

# Start development
start: dev

# Stop development server
stop: kill-port

# Restart development server
restart: stop dev

# Mobile testing workflow
.PHONY: mobile mobile-test

# Quick mobile development
mobile: mobile-dev

# Full mobile PWA testing
mobile-test: pwa-serve

# Production deployment check
.PHONY: prod-check

prod-check: clean install lint type-check test build
	@echo "✅ Production check complete!"
	@echo "Build artifacts in ./dist/"