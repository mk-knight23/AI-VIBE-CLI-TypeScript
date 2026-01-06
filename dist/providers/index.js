"use strict";
/**
 * VIBE CLI - Providers Module
 *
 * Unified provider system with adapter pattern.
 *
 * Version: 13.0.0
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.unifiedRouter = exports.UnifiedProviderRouter = void 0;
// Adapters
__exportStar(require("./adapters/base.adapter.js"), exports);
__exportStar(require("./adapters/openai.adapter.js"), exports);
__exportStar(require("./adapters/anthropic.adapter.js"), exports);
__exportStar(require("./adapters/google.adapter.js"), exports);
__exportStar(require("./adapters/ollama.adapter.js"), exports);
__exportStar(require("./adapters/openrouter.adapter.js"), exports);
// Unified Router
var unified_router_js_1 = require("./unified.router.js");
Object.defineProperty(exports, "UnifiedProviderRouter", { enumerable: true, get: function () { return unified_router_js_1.UnifiedProviderRouter; } });
Object.defineProperty(exports, "unifiedRouter", { enumerable: true, get: function () { return unified_router_js_1.unifiedRouter; } });
//# sourceMappingURL=index.js.map