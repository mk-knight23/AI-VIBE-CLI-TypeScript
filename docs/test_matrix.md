# VIBE CLI: Hard Validation Test Matrix

| # | Feature | Mode | Scenario | Status | File Mapping |
| --- | --- | --- | --- | --- | --- |
| 1 | Customizable TUI (Themes) | Functional | Switch to 'neon' theme | Pending | `src/ui/themes/themes.ts` |
| 2 | Status (Spinners/Bars) | Functional | Run long command | Pending | `src/ui/progress/` |
| 3 | Export (JSON/CSV) | Functional | Export model stats | Pending | `src/ui/formatters/exporter.ts` |
| 4 | Autocomplete | Functional | In-TUI command tab | Pending | `bin/vibe-completion.sh` |
| 5 | Onboarding Wizard | Functional | First run setup | Pending | `src/config.ts` |
| 6 | Persistent State | Functional | Re-open session | Pending | `src/core/state-manager.ts` |
| 7 | Global/Project Config | Functional | Override global theme | Pending | `src/core/config-system.ts` |
| 8 | Multi-Profile | Functional | Switch to 'prod' profile | Pending | `src/core/config-system.ts` |
| 9 | Repo Bootstrapper | Functional | `vibe init` in empty dir | Pending | `src/core/bootstrapper.ts` |
| 10 | CLI Doctor | Functional | Check system health | Pending | `src/core/diagnostics.ts` |
| 11 | Self-update | Functional | Check for new version | Pending | `src/core/update-manager.ts` |
| 12 | Telemetry (Opt-in) | Functional | Disable telemetry in setup | Pending | `src/core/config-system.ts` |
| 13 | Safe Mode | Security | Run risky cmd in Safe Mode | Pending | `src/core/config-system.ts` |
| 14 | Secrets Management | Security | Mask API keys in logs | Pending | `src/security/secrets-manager.ts` |
| 15 | Redaction/PII Scrub | Security | Scrub email from output | Pending | `src/security/pii-scrubber.ts` |
| 16 | Signed Updates | Security | Verify update integrity | Pending | `src/core/integrity-manager.ts` |
| 17 | Feature Flags | Functional | Toggle agent-mode flag | Pending | `src/core/feature-flags.ts` |
| 18 | Offline Mode | Resilience | Run with no network | Pending | `src/providers/router.ts` |
| 19 | Failure Recovery | Resilience | Resume after crash | Pending | `src/core/recovery-manager.ts` |
| 20 | Caching Layer | Performance | Cache duplicate response | Pending | `src/core/cache-manager.ts` |
| 21 | AI Error Fixes | Functional | Surface AI suggestion | Pending | `src/core/error-enhancer.ts` |
| 22 | Command History | Functional | Replay previous command | Pending | `src/core/state-manager.ts` |
| 23 | Help System | Functional | Show context-aware help | Pending | `src/ui/help-system.ts` |
| 24 | Logging/Debug | Functional | Run with VERBOSE=1 | Pending | `src/utils/structured-logger.ts` |
| 25 | Templates/Snippets | Functional | List quick start templates | Pending | `src/core/templates.ts` |
| 26 | Smart Suggestions | Medium | Suggest next likely cmd | Pending | `src/core/suggestion-engine.ts` |
| 27 | Multi-file Edit | Medium | Surgical edit 3 files | Pending | `src/primitives/multi-edit.ts` |
| 28 | Checkpoint/Rollback | Medium | Rollback after bad edit | Pending | `src/core/checkpoint-system.ts` |
| 29 | Code Explanation | Medium | Explain complex class | Pending | `src/core/code-explainer.ts` |
| 30 | Cmd Generation | Medium | Generate bash loop intent | Pending | `src/core/command-generator.ts` |
| 31 | Quality Analysis | Medium | Score file quality | Pending | `src/core/code-analyzer.ts` |
| 32 | Dep Audit | Medium | Scan for vuln deps | Pending | `src/core/dependency-manager.ts` |
| 33 | Test Generation | Medium | Gen unit tests for helper | Pending | `src/core/test-generator.ts` |
| 34 | Code Review | Medium | Review PR logic | Pending | `src/core/code-analyzer.ts` |
| 35 | Static Analysis+ | Medium | Detect complex smells | Pending | `src/core/code-analyzer.ts` |
| 36 | Security Audit | Medium | Detect hardcoded secret | Pending | `src/core/security-auditor.ts` |
| 37 | Task Planning | Medium | Break down project task | Pending | `src/primitives/planning.ts` |
| 38 | Interactive Plan | Medium | Modify plan in TUI | Pending | `src/primitives/planning.ts` |
| 39 | Knowledge Base | Medium | Query project docs | Pending | `src/core/knowledge-engine.ts` |
| 40 | Example Discovery | Medium | Find repo usage example | Pending | `src/core/knowledge-engine.ts` |
| 41 | Context Navigation | Medium | Jump to definition | Pending | `src/core/knowledge-engine.ts` |
| 42 | Intelligent Search | Medium | Context-aware bug search | Pending | `src/core/error-resolver.ts` |
| 43 | Error Analysis | Medium | Analyze stack trace | Pending | `src/core/error-resolver.ts` |
| 44 | Auto Remediation | Medium | Auto-fix syntax error | Pending | `src/core/error-resolver.ts` |
| 45 | Pattern Refactor | Medium | Apply design pattern | Pending | `src/core/error-resolver.ts` |
| 46 | Arch Discovery | Medium | Map project architecture | Pending | `src/core/semantic-search.ts` |
| 47 | Semantic Search | Medium | Search for "auth logic" | Pending | `src/core/semantic-search.ts` |
| 48 | Project Viz | Medium | Generate file tree/map | Pending | `src/core/semantic-search.ts` |
| 49 | Smart Predictions | Medium | Predict next task | Pending | `src/core/semantic-search.ts` |
| 50 | Learning Support | Medium | "How to add a primitive?" | Pending | `src/core/pair-manager.ts` |
| 51 | Interactive Learn | Medium | Step-through logic | Pending | `src/core/pair-manager.ts` |
| 52 | Pair Programming | Medium | Multi-turn pairing | Pending | `src/core/pair-manager.ts` |
| 53 | Real-time FT | Medium | Ongoing code feedback | Pending | `src/core/pair-manager.ts` |
| 54 | Rich Output | Medium | Render markdown in TUI | Pending | `src/ui/timeline.ts` |
| 55 | Hybrid Generator | Medium | AI+Deterministic scaffold | Pending | `src/core/hybrid-generators.ts` |
| 56 | Plugin System | Medium | Load custom Vibe plugin | Pending | `src/core/plugin-manager.ts` |
| 57 | Sentiment Analysis | Medium | Detect user frustration | Pending | `src/core/sentiment-engine.ts` |
| 58 | Code Mood | Medium | Detect "code vibe" | Pending | `src/core/sentiment-engine.ts` |
| 59 | Workflow chain | Medium | Chain 3 primitives | Pending | `src/core/hybrid-generators.ts` |
| 60 | Session Replay | Medium | Replay last session | Pending | `src/core/session-manager.ts` |
| 61 | Macros | Medium | Save a custom macro | Pending | `src/core/session-manager.ts` |
| 62 | Analytics | Medium | Session health report | Pending | `src/core/analytics-manager.ts` |
| 63 | Batch Operations | Medium | Rename files in batch | Pending | `src/core/session-manager.ts` |
| 64 | Custom DSL | Medium | Use vibe script | Pending | `src/core/session-manager.ts` |
| 65 | Ask Confirm | Medium | Force confirm for delete | Pending | `src/core/session-manager.ts` |
| 66 | Autonomous Agent | Advanced | Full autonomy dev task | Pending | `src/core/autonomous-agent.ts` |
| 67 | Workflow Orch | Advanced | Orchestrate 5 modules | Pending | `src/core/workflow-manager.ts` |
| 68 | Context Understanding| Advanced | Global repo context sum | Pending | `src/core/context-manager.ts` |
| 69 | RC Completion | Advanced | Predictive completion | Pending | `src/core/context-manager.ts` |
| 70 | Git Intelligence | Advanced | Semantic commit gen | Pending | `src/core/git-intelligence.ts` |
| 71 | GitHub/GitLab | Advanced | Create PR from Vibe | Pending | `src/adapters/github.ts` |
| 72 | Slack | Advanced | Notify Slack of finish | Pending | `src/adapters/slack.ts` |
| 73 | Custom API | Advanced | Call user defined API | Pending | `src/adapters/github.ts` |
| 74 | IaC Assistant | Advanced | Generate Dockerfile | Pending | `src/core/iac-helper.ts` |
| 75 | CI/CD Integration | Advanced | Trigger GH Action | Pending | `src/core/ci-integration.ts` |
| 76 | Cloud Integration | Advanced | Deploy to AWS (stub) | Pending | `src/core/ci-integration.ts` |
| 77 | Env Management | Advanced | Set up dev environment | Pending | `src/core/iac-helper.ts` |
| 78 | Build Monitoring | Advanced | Monitor long build | Pending | `src/core/ci-integration.ts` |
| 79 | Optimal Router | Advanced | High-complexity routing | Pending | `src/core/model-selector.ts` |
| 80 | Local Model | Advanced | Ollama fallback | Pending | `src/core/model-selector.ts` |
| 81 | Context Packing | Advanced | Token window packing | Pending | `src/core/context-packer.ts` |
| 82 | MCP Support | Advanced | Use MCP tool | Pending | `src/core/mcp-bridge.ts` |
| 83 | Cost Tracking | Advanced | Session budget check | Pending | `src/core/cost-tracker.ts` |
| 84 | Sandbox dry-run | Advanced | Run cmd in sandbox | Pending | `src/core/sandbox-manager.ts` |
| 85 | Audit Trace | Advanced | View execution logs | Pending | `src/core/sandbox-manager.ts` |
| 86 | Prompt Versioning | Advanced | Migrate system prompt | Pending | `src/core/sandbox-manager.ts` |
| 87 | Policy Engine | Advanced | No sudo enforcement | Pending | `src/core/policy-engine.ts` |
| 88 | Capability Registry | Advanced | Tool discovery | Pending | `src/core/policy-engine.ts` |
| 89 | Budget Enforcement | Advanced | Kill session at $1 | Pending | `src/core/policy-engine.ts` |
| 90 | Kill-switch | Advanced | Force halt agent | Pending | `src/core/policy-engine.ts` |
| 91 | Conflict Resolve | Advanced | Handle multi-agent lock | Pending | `src/primitives/orchestration.ts` |
| 92 | HITL Approval | Advanced | Forced human input | Pending | `src/primitives/approval.ts` |
| 93 | Incremental Index | Advanced | Update semantic cache | Pending | `src/core/semantic-search.ts` |
| 94 | Background Precomputation | Advanced | Pre-index codebase | Pending | `src/core/semantic-search.ts` |
| 95 | Throttling | Advanced | API rate limit backoff | Pending | `src/core/mcp-bridge.ts` |
| 96 | Cold Start | Advanced | Startup time < 500ms | Pending | `src/core/diagnostics.ts` |
| 97 | Graceful Degradation | Enterprise | Fallback to Ask mode | Pending | `src/core/policy-engine.ts` |
| 98 | Usage Recommendations| Enterprise | Suggest better models | Pending | `src/core/policy-engine.ts` |
| 99 | Template Market | Enterprise | Local template registry | Pending | `src/core/policy-engine.ts` |
| 100| Org-wide Agents | Enterprise | Shared agent pool | Pending | `src/core/policy-engine.ts` |
| 101| Dashboard | Enterprise | Read-only CLI stats | Pending | `src/core/policy-engine.ts` |
| 102| Impact Estimation | Enterprise | Predict diff impact | Pending | `src/core/policy-engine.ts` |
| 103| Sandbox Profiles | Enterprise | High-security sandbox | Pending | `src/core/sandbox-manager.ts` |
| 104| Agent Simulation | Enterprise | Simulation what-if run | Pending | `src/core/policy-engine.ts` |
| 105| Distributed Agent | Enterprise | Remote agent control | Pending | `src/core/policy-engine.ts` |
| 106| Memory Compression | Enterprise | Summarize interaction | Pending | `src/core/memory-compressor.ts` |
| 107| Context Drift | Enterprise | Detect context loss | Pending | `src/core/memory-compressor.ts` |
| 108| Cross-Repo | Enterprise | Query multiple repos | Pending | `src/core/cross-repo-scanner.ts` |
| 109| Release Notes AI | Enterprise | Generate changelog | Pending | `src/core/release-notes-gen.ts` |
| 110| Readiness Check | Enterprise | Confirm org policies | Pending | `src/core/readiness-validator.ts` |
| 111| Team Integration | Enterprise | Shared session results | Pending | `src/core/vibe-stats.ts` |
| 112| Metrics | Enterprise | Team performance stats | Pending | `src/core/vibe-stats.ts` |
| 113| Snippet Registry | Enterprise | Shared code blocks | Pending | `src/core/vibe-stats.ts` |
| 114| Community Vote | Enterprise | Feedback on plans | Pending | `src/core/vibe-stats.ts` |
| 115| Leaderboards | Enterprise | Interaction ranking | Pending | `src/core/vibe-stats.ts` |
| 116| Vibe Stats | Enterprise | Happiness metrics | Pending | `src/core/vibe-stats.ts` |
| 117| Collaboration | Enterprise | Real-time pair ops | Pending | `src/core/vibe-stats.ts` |
| 118| Workflow Intel | Enterprise | Team workflow pattern | Pending | `src/core/vibe-stats.ts` |
| 119| Knowledge Share | Enterprise | Shared project index | Pending | `src/core/vibe-stats.ts` |
| 120| Gamification | Enterprise | Interaction points | Pending | `src/core/vibe-stats.ts` |
