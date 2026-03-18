# MDEMG Linux Sidebar - Makefile
# Tauri-based system tray companion for MDEMG

.PHONY: all setup dev build test clean release lint check

# ─── Default ─────────────────────────────────────────────────────────────────
all: build

# ─── Setup ───────────────────────────────────────────────────────────────────
setup: ## Install all dependencies
	@echo "Installing npm dependencies..."
	npm install
	@echo "Checking Rust toolchain..."
	rustup update stable
	@echo "Installing Tauri CLI..."
	cargo install tauri-cli
	@echo "Setup complete."

# ─── Development ─────────────────────────────────────────────────────────────
dev: ## Run in development mode with hot reload
	cargo tauri dev

# ─── Build ───────────────────────────────────────────────────────────────────
build: ## Build release artifacts (.AppImage + .deb)
	cargo tauri build

# ─── Test ────────────────────────────────────────────────────────────────────
test: ## Run Rust tests
	cargo test --manifest-path src-tauri/Cargo.toml

# ─── Lint ────────────────────────────────────────────────────────────────────
lint: ## Run linters
	cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
	npm run lint 2>/dev/null || true

# ─── Check ───────────────────────────────────────────────────────────────────
check: ## Check compilation without building
	cargo check --manifest-path src-tauri/Cargo.toml

# ─── Clean ───────────────────────────────────────────────────────────────────
clean: ## Clean all build artifacts
	cargo clean --manifest-path src-tauri/Cargo.toml
	rm -rf dist node_modules

# ─── Release ─────────────────────────────────────────────────────────────────
release: build ## Build and copy artifacts to dist/
	@mkdir -p dist
	@echo "Build artifacts:"
	@find src-tauri/target/release/bundle -name "*.AppImage" -o -name "*.deb" 2>/dev/null | while read f; do \
		cp "$$f" dist/; \
		echo "  → dist/$$(basename $$f)"; \
	done
	@echo "Release artifacts copied to dist/"

# ─── Version ─────────────────────────────────────────────────────────────────
version: ## Show current version
	@jq -r '.package.version' src-tauri/tauri.conf.json

bump-version: ## Bump version (usage: make bump-version V=0.2.0)
	@if [ -z "$(V)" ]; then echo "Usage: make bump-version V=x.y.z"; exit 1; fi
	jq '.package.version = "$(V)"' src-tauri/tauri.conf.json > tmp.json && mv tmp.json src-tauri/tauri.conf.json
	sed -i 's/^version = .*/version = "$(V)"/' src-tauri/Cargo.toml
	npm version $(V) --no-git-tag-version
	@echo "Version bumped to $(V)"

# ─── Help ────────────────────────────────────────────────────────────────────
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'
