# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Justo Dev4** is a desktop application for running and managing local Node.js microservices during development. Built with **Tauri 2.0** (Rust backend + React frontend).

## Commands

| Task | Command |
|------|---------|
| Dev (frontend only) | `pnpm dev` |
| Dev (full Tauri app) | `pnpm tauri dev` |
| Build frontend | `pnpm build` |
| Build desktop app | `pnpm tauri build` |
| Lint/format check | `npx @biomejs/biome check src/` |
| Lint/format fix | `npx @biomejs/biome check --write src/` |

Package manager: **pnpm**. Node version: **v22**.

**Important:** Never run the app to test changes. Ask the user to try it instead.

## Architecture

```
src/              → React frontend (Vite + TypeScript)
src-tauri/src/    → Rust backend (Tauri 2.0)
```

### Frontend → Backend IPC

The frontend calls Rust functions via Tauri's `invoke()`. Rust commands are defined in `src-tauri/src/commands.rs` and registered in `src-tauri/src/lib.rs`.

Key Tauri commands:
- `get_services_list` — scans `{servicesPath}/services/` for `.run.local.yaml` configs
- `prepare_services_start` — generates `.start.run.sh` scripts with env vars per service
- `ensure_services_running` — starts/stops services, tracks PIDs
- `stop_all_services_command` — cleanup on app exit

### Frontend Structure

- **State management:** React Context (`Settings`, `CommandBar`)
- **Routing:** React Router — `/`, `/services/:category/:serviceName`, `/settings`
- **UI:** shadcn/ui (New York style) + Tailwind CSS 4
- **Key hooks:**
  - `useSettings` (`src/pages/Settings/useSettings.ts`) — app configuration, persisted to disk
  - `useServices` — fetches service list from Rust
  - `useServicesStatus` / `useProcesses` — real-time service monitoring

### Rust Backend Structure

- `commands.rs` — Tauri IPC command handlers
- `services.rs` — service discovery and YAML config parsing
- `processes.rs` — process spawning, PID tracking (`Arc<Mutex<HashMap>>`)
- `types.rs` — shared types (serializable to TypeScript via serde)

### Process Lifecycle

On launch: load settings → fetch services → generate start scripts → auto-start enabled services.
On exit: `RunEvent::Exit` → `stop_all_services()` → wait 1s → kill orphaned child processes.

## Code Conventions

- Always declare types for variables, parameters, and return values. Avoid `any`.
- Keep files under 200–300 lines; refactor beyond that.
- Use English for all code and documentation.
- Biome formatter: 2-space indent, 100 char line width, single quotes, no semicolons, no bracket spacing.
- Scripts go in `temp/scripts/` using tsx (`#!/usr/bin/env -S npx tsx`).
- Default branch is `master`.

## Important Notes

- Close the app with the window X button, not Cmd+Q — otherwise services may keep running in the background.
- Settings are persisted at `~/.config/Justo Dev4/path_settings.json`.
- The app auto-updates via GitHub releases.
