# MDEMG Linux Sidebar

Linux system tray companion app for the [MDEMG](https://github.com/reh3376/mdemg) cognitive memory server. Built with [Tauri](https://tauri.app) (Rust + web frontend, ~10MB).

## Features

- **Multi-instance support** — register and monitor multiple MDEMG instances from a single tray icon; switch between them via a dropdown picker
- **System tray icon** — green/yellow/red/gray indicator showing the selected instance's health
- **7-tab sidebar dashboard** — Status, Memory, Learning, Neo4j, Config, Logs, RSIC
- **Status tab** — comprehensive subsystem health (Neo4j, server, embedding, plugins, circuit breakers, CMS), model inventory (embedding/naming/summary/reranker), service uptimes, and lifecycle controls (Start/Stop/Restart)
- **Memory tab** — graph composition by layer (L0-L5), temporal activity (24h/7d/30d), connectivity metrics, learning edge stats
- **Learning tab** — Hebbian learning phase and trend, edge breakdown (strong/surprising/below threshold), configuration, freeze state
- **Neo4j tab** — database health, per-space node counts, connection pool, Go runtime metrics
- **Config tab** — server configuration viewer, database backup/migrate, version display
- **Logs tab** — live log viewer with search/filter and open-in-editor
- **RSIC tab** — self-improvement cycle status, health metrics, calibration data
- **Auto-discovery** — scans `~/*/` for `.mdemg/config.yaml` directories every 60s; reads `.mdemg.port` and `.mdemg/mdemg.pid` to find running servers
- **CLI auto-registration** — `mdemg init` automatically registers the project with the sidebar instance registry
- **Instance management** — add/remove instances manually via Preferences, view per-instance health status dots
- **Configurable polling** — 10s health checks with `/healthz` + `/readyz`, 30s stats refresh, 30s background health for non-selected instances, exponential backoff on failure
- **Autostart** — optional auto-start via XDG autostart (`~/.config/autostart/`)

## Requirements

- Linux desktop environment (GNOME, KDE, XFCE, Sway, i3, etc.)
- [MDEMG](https://github.com/reh3376/mdemg) installed (see [Linux installer](https://github.com/reh3376/mdemg_linux))
- System tray support (see [System Tray Compatibility](#system-tray-compatibility))

### For Building from Source

- Rust toolchain (1.70+) — `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- Node.js 18+ — `sudo apt install nodejs npm` or via [nvm](https://github.com/nvm-sh/nvm)
- System dependencies (see [Tauri Prerequisites](#tauri-prerequisites))

## Quick Start

### Install Pre-built

```bash
# AppImage (works on any distro)
curl -fsSL -o mdemg-sidebar.AppImage https://github.com/reh3376/mdemg-linux-sidebar/releases/latest/download/mdemg-sidebar_amd64.AppImage
chmod +x mdemg-sidebar.AppImage
./mdemg-sidebar.AppImage

# Or Debian/Ubuntu (.deb)
curl -fsSL -o mdemg-sidebar.deb https://github.com/reh3376/mdemg-linux-sidebar/releases/latest/download/mdemg-sidebar_amd64.deb
sudo dpkg -i mdemg-sidebar.deb
```

### Build from Source

```bash
# Install system dependencies (see Tauri Prerequisites below)
make setup   # installs npm deps + Tauri CLI
make dev     # run in development mode with hot reload
make build   # build release artifacts (.AppImage + .deb)
```

## Tauri Prerequisites

Install the required system libraries for your distribution:

**Ubuntu / Debian:**
```bash
sudo apt install -y \
  libwebkit2gtk-4.1-dev \
  libappindicator3-dev \
  librsvg2-dev \
  patchelf \
  libgtk-3-dev \
  libsoup-3.0-dev \
  javascriptcoregtk-4.1
```

**Fedora:**
```bash
sudo dnf install -y \
  webkit2gtk4.1-devel \
  libappindicator-gtk3-devel \
  librsvg2-devel \
  patchelf \
  gtk3-devel \
  libsoup3-devel
```

**Arch Linux:**
```bash
sudo pacman -S webkit2gtk-4.1 libappindicator-gtk3 librsvg patchelf gtk3 libsoup3
```

## System Tray Compatibility

| Desktop Environment | Status | Notes |
|-------------------|--------|-------|
| GNOME | Requires extension | Install `gnome-shell-extension-appindicator` and enable it |
| KDE Plasma | Native | Works out of the box |
| XFCE | Native | Works out of the box |
| Cinnamon | Native | Works out of the box |
| MATE | Native | Works out of the box via `mate-indicator-applet` |
| Sway / Waybar | Requires tray module | Add `"tray"` to your Waybar config |
| i3 | Requires tray | Use a status bar with tray support (e.g., `i3bar` with `--tray-output`) |

**GNOME setup:**
```bash
# Install the AppIndicator extension
sudo apt install gnome-shell-extension-appindicator   # Debian/Ubuntu
sudo dnf install gnome-shell-extension-appindicator   # Fedora

# Enable it
gnome-extensions enable appindicatorsupport@rgcjonas.gmail.com

# Log out and back in (or restart GNOME Shell with Alt+F2 → "r")
```

## Architecture

The app communicates with the MDEMG server exclusively via:

1. **HTTP REST** — monitoring endpoints (`/healthz`, `/readyz`, `/v1/neo4j/overview`, `/v1/embedding/health`, `/v1/memory/stats`, `/v1/learning/stats`, `/v1/memory/distribution`, `/v1/system/pool-metrics`)
2. **CLI subprocess** — lifecycle commands (`mdemg start/stop/restart`) and config (`mdemg config show --json`)
3. **Docker inspect** — Neo4j container uptime via `docker inspect`
4. **File reads** — PID file, port file, log file

No Go packages are linked. The app is a thin monitoring shell around the existing REST API endpoints.

## Multi-Instance Architecture

Instances are persisted as JSON at `~/.config/mdemg-sidebar/instances.json` (XDG standard). This file is shared between:

- **Tauri app** — reads/writes via instance manager, watches for changes via `notify` crate
- **Go CLI** — `mdemg init` appends new entries via `registerWithSidebar()`
- **Auto-discovery** — scans `~/*/` for `.mdemg/config.yaml` every 60s

Each instance has its own HTTP client and CLI executor (with `workingDirectory`). The selected instance gets full health + stats polling; non-selected instances get lightweight `/healthz` checks at 30s intervals.

## Server Discovery

```
1. Read .mdemg.port → get port number
2. Hit GET http://localhost:{port}/healthz → confirm alive
3. If .mdemg.port missing → check .mdemg/mdemg.pid → process alive?
4. Fallback → http://localhost:9999
5. Override → per-instance serverURL in instance registry
```

## Development

```bash
make setup    # Install dependencies
make dev      # Development mode with hot reload
make build    # Build release artifacts
make test     # Run Rust tests
make lint     # Run clippy linter
make clean    # Clean build artifacts
make help     # Show all targets
```

## Project Structure

```
mdemg-linux-sidebar/
├── src/                    # Frontend (HTML/CSS/JS)
│   └── index.html          # Main UI
├── src-tauri/              # Rust backend
│   ├── src/
│   │   └── main.rs         # Entry point, system tray, window management
│   ├── Cargo.toml          # Rust dependencies
│   └── tauri.conf.json     # Tauri configuration
├── package.json            # npm scripts and frontend dependencies
├── Makefile                # Build targets
├── .github/workflows/      # CI/CD
│   ├── build.yml           # Build on push/PR
│   └── release.yml         # Build + publish on tag
├── LICENSE                 # MIT
└── README.md               # This file
```

## Links

- [MDEMG Source Code](https://github.com/reh3376/mdemg)
- [Linux Installer](https://github.com/reh3376/mdemg_linux)
- [macOS Menu Bar App](https://github.com/reh3376/mdemg-menubar) — Swift/SwiftUI equivalent
- [macOS Installer (Homebrew)](https://github.com/reh3376/homebrew-mdemg)
- [Windows Installer](https://github.com/reh3376/mdemg-windows)
- [Issues](https://github.com/reh3376/mdemg/issues)

## License

MIT
