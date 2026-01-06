"use strict";
/**
 * VIBE CLI v12 - Security Utilities
 *
 * Input sanitization, secret masking, and security helpers.
 *
 * Version: 12.0.0
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeInput = sanitizeInput;
exports.sanitizeFilePath = sanitizeFilePath;
exports.sanitizeShellCommand = sanitizeShellCommand;
exports.maskSecrets = maskSecrets;
exports.safeLog = safeLog;
exports.maskSecretsInObject = maskSecretsInObject;
exports.maskProviderConfig = maskProviderConfig;
exports.assessRisk = assessRisk;
exports.requiresApproval = requiresApproval;
// ============================================================================
// SECRET PATTERNS (for masking)
// ============================================================================
const SECRET_PATTERNS = [
    // API Keys
    /(?:api[_-]?key|apikey)["']?\s*[:=]\s*["']?([a-zA-Z0-9\-_]{20,})["']?/gi,
    // Bearer tokens
    /Bearer\s+([a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+)/g,
    // Generic secrets
    /(?:secret|token|auth|password|passwd|pwd)["']?\s*[:=]\s*["']?([^"'\s]{8,})["']?/gi,
    // Environment variables with secrets
    /\$?(?:OPENAI|ANTHROPIC|GOOGLE|XAI|MISTRAL|COHERE|AI21|DEEPSEEK|QWEN|BEDROCK|AZURE|HF|OLLAMA)[_A-Z]*["']?\s*[:=]\s*["']?([a-zA-Z0-9\-_]{16,})/gi,
    // Private keys
    /-----BEGIN\s+(?:RSA\s+)?PRIVATE KEY-----[\s\S]*?-----END\s+(?:RSA\s+)?PRIVATE KEY-----/g,
    // Database connection strings
    /(?:mongodb(?:\+srv)?|postgres|mysql|redis):\/\/[^:]+:[^@]+@[^/]+\/\w+/g,
];
const MASKED_VALUE = '[REDACTED]';
// ============================================================================
// INPUT SANITIZATION
// ============================================================================
/**
 * Sanitize user input to prevent injection attacks
 */
function sanitizeInput(input) {
    if (typeof input !== 'string') {
        return '';
    }
    return input
        // Remove null bytes
        .replace(/\0/g, '')
        // Trim whitespace
        .trim()
        // Remove ANSI escape codes
        .replace(/\x1b\[[0-9;]*m/g, '')
        // Limit length
        .slice(0, 10000);
}
/**
 * Sanitize file paths to prevent path traversal
 */
function sanitizeFilePath(input, baseDir) {
    const sanitized = sanitizeInput(input);
    // Remove path traversal attempts
    const normalized = path.normalize(sanitized);
    // Ensure result is within base directory
    if (!normalized.startsWith(baseDir)) {
        // Try to find a safe path within baseDir
        const basename = path.basename(normalized);
        return path.join(baseDir, basename);
    }
    return normalized;
}
/**
 * Sanitize shell commands to prevent injection
 */
function sanitizeShellCommand(input) {
    const sanitized = sanitizeInput(input);
    // Block dangerous characters
    if (/[;&|`$(){}[\]\\!<>#*?"'\n]/.test(sanitized)) {
        throw new Error('Invalid characters in shell command');
    }
    return sanitized;
}
// ============================================================================
// SECRET MASKING
// ============================================================================
/**
 * Mask secrets in strings for logging/display
 */
function maskSecrets(input) {
    if (typeof input !== 'string') {
        return String(input);
    }
    let result = input;
    for (const pattern of SECRET_PATTERNS) {
        pattern.lastIndex = 0; // Reset regex state
        result = result.replace(pattern, (match, captured) => {
            // If we captured a group, mask that; otherwise mask the full match
            return captured ? match.replace(captured, MASKED_VALUE) : MASKED_VALUE;
        });
    }
    return result;
}
/**
 * Create a safe log message by masking secrets
 */
function safeLog(message, ...args) {
    const sanitizedArgs = args.map(arg => {
        if (typeof arg === 'string') {
            return maskSecrets(arg);
        }
        if (typeof arg === 'object' && arg !== null) {
            return maskSecretsInObject(arg);
        }
        return arg;
    });
    console.log(maskSecrets(message), ...sanitizedArgs);
}
/**
 * Mask secrets in an object (recursively)
 */
function maskSecretsInObject(obj) {
    if (obj === null || obj === undefined) {
        return obj;
    }
    if (typeof obj === 'string') {
        return maskSecrets(obj);
    }
    if (Array.isArray(obj)) {
        return obj.map(item => maskSecretsInObject(item));
    }
    if (typeof obj === 'object') {
        const masked = {};
        for (const [key, value] of Object.entries(obj)) {
            const lowerKey = key.toLowerCase();
            // Mask fields that might contain secrets
            if (lowerKey.includes('key') ||
                lowerKey.includes('secret') ||
                lowerKey.includes('token') ||
                lowerKey.includes('password') ||
                lowerKey.includes('credential')) {
                masked[key] = MASKED_VALUE;
            }
            else {
                masked[key] = maskSecretsInObject(value);
            }
        }
        return masked;
    }
    return obj;
}
/**
 * Mask API keys in provider configuration display
 */
function maskProviderConfig(config) {
    return maskSecretsInObject(config);
}
const HIGH_RISK_PATTERNS = [
    /delete\s+(?:all|everything|production|db|database)/i,
    /drop\s+(?:table|database)/i,
    /rm\s+-rf\s+\//i,
    /chmod\s+777/i,
    /chown\s+-R\s+root/i,
    /sudo\s+rm/i,
    /\.exe\s+.*\.exe/i, // Executable files
    /eval\s*\(/i, // Code injection
];
const MEDIUM_RISK_PATTERNS = [
    /deploy/i,
    /push\s+to\s+production/i,
    /modify\s+.*config/i,
    /change\s+.*permission/i,
    /restart\s+.*service/i,
    /kill\s+.*process/i,
    /curl\s+.*\|/i, // Pipe to shell
    /wget\s+.*\|/i,
];
/**
 * Assess risk level of an operation
 */
function assessRisk(intent, context) {
    const reasons = [];
    // Check for high-risk patterns
    for (const pattern of HIGH_RISK_PATTERNS) {
        if (pattern.test(intent)) {
            return {
                level: 'critical',
                requiresApproval: true,
                reasons: ['Critical operation detected: ' + intent.slice(0, 50)],
            };
        }
    }
    // Check for medium-risk patterns
    for (const pattern of MEDIUM_RISK_PATTERNS) {
        if (pattern.test(intent)) {
            reasons.push('Medium-risk operation: ' + intent.slice(0, 50));
        }
    }
    // Check if multiple files are being modified
    if (context.files && context.files.length > 5) {
        reasons.push(`Modifying ${context.files.length} files`);
    }
    if (reasons.length > 0) {
        return {
            level: 'medium',
            requiresApproval: true,
            reasons,
        };
    }
    return {
        level: 'low',
        requiresApproval: false,
        reasons: [],
    };
}
/**
 * Check if an operation requires explicit approval
 */
function requiresApproval(intent) {
    const assessment = assessRisk(intent, {});
    return assessment.requiresApproval || assessment.level !== 'low';
}
// ============================================================================
// EXPORT HELPERS
// ============================================================================
// Re-export path for internal use
const path = __importStar(require("path"));
//# sourceMappingURL=utilities.js.map