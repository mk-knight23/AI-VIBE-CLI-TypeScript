/**
 * VIBE CLI v0.0.1 - Core Types
 *
 * All types are defined here to avoid circular imports.
 */
// ============================================================================
// INTENT TYPES
// ============================================================================
export var IntentType;
(function (IntentType) {
    IntentType["ASK"] = "ask";
    IntentType["CODE"] = "code";
    IntentType["DEBUG"] = "debug";
    IntentType["REFACTOR"] = "refactor";
    IntentType["TEST"] = "test";
    IntentType["API"] = "api";
    IntentType["UI"] = "ui";
    IntentType["DEPLOY"] = "deploy";
    IntentType["MEMORY"] = "memory";
    IntentType["PLAN"] = "plan";
    IntentType["AGENT"] = "agent";
    IntentType["GIT"] = "git";
    IntentType["UNKNOWN"] = "unknown";
})(IntentType || (IntentType = {}));
//# sourceMappingURL=types.js.map