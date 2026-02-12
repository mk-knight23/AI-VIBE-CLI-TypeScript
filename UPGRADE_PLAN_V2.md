# VIBE CLI: Upgrade Plan V2 (Ecosystem Expansion)

Following the successful completion of **Phases 3-6**, VIBE CLI is now a robust, secure, and cross-platform AI teammate. This document outlines the vision for **Phase 7: Advanced Ecosystem**, moving VIBE from a standalone CLI to a deeply integrated development platform.

## 🎯 Phase 7 Objectives

### 1. Full VS Code Extension
*   **Integrated Sidebar**: Project tree view and status dashboard.
*   **Inline Intelligence**: AI code review comments directly in the editor as diagnostics.
*   **one-Click Fixes**: A "Vibe Fix" button appearing next to lint errors or AI-identified issues.
*   **TUI Terminal**: Dedicated terminal window running the VIBE interactive mode.

### 2. Community Marketplace
*   **Remote Discovery**: Real-time searching of community templates and plugins via the VIBE API.
*   **Secure Installation**: Signed plugin verification and dependency resolution.
*   **Contribution Pipeline**: Commands for users to publish their own recipes and extensions (`vibe publish`).

### 3. Web Dashboard (Vibe Home)
*   **Local Web UI**: A React-based dashboard served by `vibe server`.
*   **Visual Analytics**: Charts for project health, test coverage, and AI-assisted PR velocity.
*   **Configuration Studio**: Visual editor for `cosmiconfig` profiles and provider routing.

### 4. Telemetry & Reliability
*   **Opt-in Telemetry**: Anonymous usage patterns to improve LLM prompts.
*   **Error Reporting**: Automatic (optional) crash reporting to a centralized VIBE sentry.
*   **Performance Profiling**: Benchmarking of primitive execution times.

---

## 🛠 Proposed Changes

### [NEW] [vibe-home-ui](file:///Users/mkazi/CLI/AI-VIBE-CLI-TypeScript/vibe-home-ui)
Create a new directory for the React-based local dashboard.

### [MODIFY] [api-server.ts](file:///Users/mkazi/CLI/AI-VIBE-CLI-TypeScript/src/core/api-server.ts)
Implement the actual installation logic for the mock marketplace endpoints created in Phase 6.

### [MODIFY] [extension.ts](file:///Users/mkazi/CLI/AI-VIBE-CLI-TypeScript/vscode-extension/src/extension.ts)
Build out the `VibeDiagnosticsProvider` and `VibeSidebarProvider`.

---

## 📅 Timeline

| Phase | Focus | Duration |
|-------|-------|----------|
| 7.1   | VS Code Deep Integration | 2 Weeks |
| 7.2   | Marketplace Logic (Real) | 1 Week |
| 7.3   | Vibe Home (Local Web UI) | 2 Weeks |
| 7.4   | Telemetry & Polish | 1 Week |

**Total Phase 7 Duration: 6 Weeks**
