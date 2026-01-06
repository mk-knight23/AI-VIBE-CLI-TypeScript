"use strict";
/**
 * VIBE CLI - Tools Module
 *
 * Unified tool system with:
 * - Tool registry with risk-based execution
 * - Sandboxed execution environment
 * - Diff-based file editing
 * - Checkpoint/undo support
 * - Security scanning
 *
 * Version: 13.0.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.commandValidator = exports.VibeCommandValidator = exports.securityScanner = exports.VibeSecurityScanner = exports.checkpointSystem = exports.CheckpointSystem = exports.DiffGenerator = exports.diffEditor = exports.DiffEditor = exports.sandbox = exports.Sandbox = exports.VibeToolRegistry = exports.toolRegistry = exports.ToolRegistry = void 0;
// Tool Registry
var index_js_1 = require("./registry/index.js");
Object.defineProperty(exports, "ToolRegistry", { enumerable: true, get: function () { return index_js_1.ToolRegistry; } });
Object.defineProperty(exports, "toolRegistry", { enumerable: true, get: function () { return index_js_1.toolRegistry; } });
Object.defineProperty(exports, "VibeToolRegistry", { enumerable: true, get: function () { return index_js_1.VibeToolRegistry; } });
// Sandbox System
var sandbox_js_1 = require("./sandbox.js");
Object.defineProperty(exports, "Sandbox", { enumerable: true, get: function () { return sandbox_js_1.Sandbox; } });
Object.defineProperty(exports, "sandbox", { enumerable: true, get: function () { return sandbox_js_1.sandbox; } });
// Diff Editor
var diff_editor_js_1 = require("./diff-editor.js");
Object.defineProperty(exports, "DiffEditor", { enumerable: true, get: function () { return diff_editor_js_1.DiffEditor; } });
Object.defineProperty(exports, "diffEditor", { enumerable: true, get: function () { return diff_editor_js_1.diffEditor; } });
Object.defineProperty(exports, "DiffGenerator", { enumerable: true, get: function () { return diff_editor_js_1.DiffGenerator; } });
Object.defineProperty(exports, "CheckpointSystem", { enumerable: true, get: function () { return diff_editor_js_1.CheckpointSystem; } });
Object.defineProperty(exports, "checkpointSystem", { enumerable: true, get: function () { return diff_editor_js_1.checkpointSystem; } });
// Security
var index_js_2 = require("../security/index.js");
Object.defineProperty(exports, "VibeSecurityScanner", { enumerable: true, get: function () { return index_js_2.SecurityScanner; } });
Object.defineProperty(exports, "securityScanner", { enumerable: true, get: function () { return index_js_2.securityScanner; } });
Object.defineProperty(exports, "VibeCommandValidator", { enumerable: true, get: function () { return index_js_2.CommandValidator; } });
Object.defineProperty(exports, "commandValidator", { enumerable: true, get: function () { return index_js_2.commandValidator; } });
//# sourceMappingURL=index.js.map