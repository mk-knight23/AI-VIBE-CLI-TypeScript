// security/index.ts — Security scanning module for Vibe CLI v2.0
// AI-VIBE-CLI-TypeScript | Kazi Musharraf | mkazi.live

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, extname } from 'path'
import chalk from 'chalk'

interface SecurityIssue {
  file: string
  line: number
  severity: 'critical' | 'high' | 'medium' | 'low'
  rule: string
  message: string
  snippet: string
}

interface ScanResult {
  scannedFiles: number
  issues: SecurityIssue[]
  score: number  // 0-100, higher is safer
  duration: number
}

const SECURITY_RULES: Array<{ pattern: RegExp; rule: string; message: string; severity: SecurityIssue['severity'] }> = [
  { pattern: /\beval\s*\(/g, rule: 'NO_EVAL', message: 'eval() allows arbitrary code execution', severity: 'critical' },
  { pattern: /process\.env\.[A-Z_]+\s*=\s*['"][^'"]+['"]/g, rule: 'HARDCODED_SECRET', message: 'Potential hardcoded secret in env assignment', severity: 'critical' },
  { pattern: /\bexec\s*\([^)]*\$\{/g, rule: 'COMMAND_INJECTION', message: 'Template literal in exec() — potential command injection', severity: 'critical' },
  { pattern: /password\s*[:=]\s*['"][^'"]{1,32}['"]/gi, rule: 'HARDCODED_PASSWORD', message: 'Potential hardcoded password', severity: 'high' },
  { pattern: /api[_-]?key\s*[:=]\s*['"][a-zA-Z0-9_\-]{16,}['"]/gi, rule: 'HARDCODED_API_KEY', message: 'Potential hardcoded API key', severity: 'high' },
  { pattern: /console\.log\(.*password/gi, rule: 'LOG_SENSITIVE', message: 'Logging potentially sensitive data', severity: 'medium' },
  { pattern: /Math\.random\(\)/g, rule: 'WEAK_RANDOM', message: 'Math.random() is not cryptographically secure', severity: 'low' },
]

const SCAN_EXTENSIONS = new Set(['.ts', '.js', '.tsx', '.jsx', '.mjs', '.cjs', '.py'])
const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', '__pycache__', '.venv'])

function collectFiles(dir: string): string[] {
  const files: string[] = []
  try {
    const entries = readdirSync(dir)
    for (const entry of entries) {
      if (IGNORE_DIRS.has(entry)) continue
      const full = join(dir, entry)
      const stat = statSync(full)
      if (stat.isDirectory()) files.push(...collectFiles(full))
      else if (SCAN_EXTENSIONS.has(extname(entry))) files.push(full)
    }
  } catch { /* skip inaccessible */ }
  return files
}

export async function scanDirectory(targetDir: string): Promise<ScanResult> {
  const startTime = Date.now()
  const files = collectFiles(targetDir)
  const issues: SecurityIssue[] = []

  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf-8')
      const lines = content.split('\n')
      for (const rule of SECURITY_RULES) {
        lines.forEach((line, idx) => {
          if (rule.pattern.test(line)) {
            issues.push({
              file: file.replace(targetDir, '.'),
              line: idx + 1,
              severity: rule.severity,
              rule: rule.rule,
              message: rule.message,
              snippet: line.trim().slice(0, 80)
            })
          }
          rule.pattern.lastIndex = 0  // Reset regex state
        })
      }
    } catch { /* skip unreadable files */ }
  }

  const critical = issues.filter(i => i.severity === 'critical').length
  const high = issues.filter(i => i.severity === 'high').length
  const score = Math.max(0, 100 - critical * 25 - high * 10 - issues.length * 2)

  return { scannedFiles: files.length, issues, score, duration: Date.now() - startTime }
}

export function renderScanResult(result: ScanResult): void {
  const { scannedFiles, issues, score, duration } = result
  const scoreColor = score >= 80 ? chalk.green : score >= 60 ? chalk.yellow : chalk.red

  console.log(chalk.bold('\n🔒 Security Scan Results'))
  console.log(chalk.dim('─'.repeat(60)))
  console.log(`  Files scanned:  ${chalk.cyan(scannedFiles)}`)
  console.log(`  Issues found:   ${issues.length > 0 ? chalk.red(issues.length) : chalk.green(0)}`)
  console.log(`  Security score: ${scoreColor(`${score}/100`)}`)
  console.log(`  Duration:       ${chalk.dim(duration + 'ms')}`)
  console.log(chalk.dim('─'.repeat(60)))

  if (issues.length === 0) {
    console.log(chalk.green('\n  ✅ No security issues found!\n'))
    return
  }

  const bySeverity = { critical: [] as SecurityIssue[], high: [] as SecurityIssue[], medium: [] as SecurityIssue[], low: [] as SecurityIssue[] }
  issues.forEach(i => bySeverity[i.severity].push(i))

  for (const [sev, items] of Object.entries(bySeverity)) {
    if (items.length === 0) continue
    const sevColor = { critical: chalk.bgRed.white, high: chalk.red, medium: chalk.yellow, low: chalk.blue }[sev] ?? chalk.white
    console.log(`\n  ${sevColor(` ${sev.toUpperCase()} `)} (${items.length})`)
    items.forEach(issue => {
      console.log(`    ${chalk.dim(issue.file + ':' + issue.line)} ${issue.message}`)
      console.log(`    ${chalk.dim('→ ' + issue.snippet)}`)
    })
  }
  console.log()
}
