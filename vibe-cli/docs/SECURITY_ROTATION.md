# 🚨 URGENT: API Key Rotation Guide

**Date:** 2026-01-05  
**Status:** All API keys posted publicly - IMMEDIATE ROTATION REQUIRED

---

## Critical Priority (Rotate Now)

| Provider | Key Type | Rotation URL | Action |
|----------|----------|--------------|--------|
| OpenAI | `OPENAI_API_KEY` | https://platform.openai.com/api-keys | Delete old key, create new |
| Anthropic | `ANTHROPIC_API_KEY` | https://console.anthropic.com/api-keys | Delete old key, create new |
| xAI (Grok) | `XAI_API_KEY` | https://console.x.ai/ | Regenerate API key |
| OpenRouter | `OPENROUTER_API_KEY` | https://openrouter.ai/keys | Delete & create new |
| GitHub | `GITHUB_TOKEN` | https://github.com/settings/tokens | Revoke old, create new with `repo` scope |

## High Priority (Rotate Within 24h)

| Provider | Key Type | Rotation URL | Notes |
|----------|----------|--------------|-------|
| DeepSeek | `DEEPSEEK_API_KEY` | https://platform.deepseek.com/api-keys | - |
| Mistral | `MISTRAL_API_KEY` | https://console.mistral.ai/api-keys/ | - |
| Perplexity | `PERPLEXITY_API_KEY` | https://www.perplexity.ai/settings/api | - |
| Cohere | `COHERE_API_KEY` | https://dashboard.cohere.com/api-keys | - |
| AI21 Labs | `AI21_API_KEY` | https://studio.ai21.com/account | - |
| Together AI | `TOGETHER_API_KEY` | https://api.together.xyz/settings/api | - |
| Groq | `GROQ_API_KEY` | https://console.groq.com/keys | - |
| HuggingFace | `HF_TOKEN` | https://huggingface.co/settings/tokens | - |
| Brave Search | `BRAVE_SEARCH_API_KEY` | https://search.brave.com/server | - |
| Tavily | `TAVILY_API_KEY` | https://tavily.com/ | - |
| Context7 | `CONTEXT7_API_KEY` | https://context7.com/ | - |
| PostHog | `POSTHOG_API_KEY` | https://app.posthog.com/settings/project | - |
| Deepgram | `DEEPGRAM_API_KEY` | https://console.deepgram.com/ | - |

## Medium Priority

| Provider | Key Type | Rotation URL | Notes |
|----------|----------|--------------|-------|
| Qwen/DashScope | `DASHSCOPE_API_KEY` | https://dashscope.console.aliyun.com/ | Alibaba Cloud |
| MiniMax | `MINIMAX_API_KEY` | Check provider dashboard | - |
| Moonshot/Kimi | `MOONSHOT_API_KEY` | https://platform.moonshot.cn/ | - |
| Fireworks AI | `FIREWORKS_API_KEY` | https://app.fireworks.ai/account/api-keys | - |
| OpenAI (Azure) | `AZURE_OPENAI_API_KEY` | https://portal.azure.com | Via Azure AI Studio |
| AWS Bedrock | `AWS_ACCESS_KEY_ID` | https://console.aws.amazon.com/iam/ | Also rotate `AWS_SECRET_ACCESS_KEY` |

## Additional Credentials to Rotate

| Service | Credential | URL | Notes |
|---------|------------|-----|-------|
| Google OAuth | Client IDs | https://console.cloud.google.com/ | Both OAuth clients |
| Google Drive | Client Secret | https://console.cloud.google.com/ | - |
| Twilio | Account SID/Token | https://console.twilio.com/ | SMS/Telegram bot |
| Telegram Bot | Bot Token | https://t.me/BotFather | Revoke & create new |
| Atlassian | API Token | https://id.atlassian.com/manage-profile/security/api-tokens | - |
| VS Code Marketplace | PAT | https://aka.ms/vscode PAT | - |
| NPM | Token | https://www.npmjs.com/settings/ | - |
| Cerebras | `CEREBRAS_API_KEY` | https://cloud.cerebras.ai/ | - |
| NVIDIA | `NVIDIA_API_KEY` | https://developer.nvidia.com/ | - |

---

## Rotation Steps

### 1. Create New Keys
Visit each URL above and generate a new API key/token.

### 2. Update Environment
```bash
# Edit your .env file
cp vibe-cli/.env.example vibe-cli/.env
nano vibe-cli/.env
```

### 3. Verify New Keys Work
Test each provider before deleting old keys.

### 4. Delete Old Keys
Only after verification, delete old keys from provider dashboards.

---

## Security Recommendations

1. **Never share API keys in chat** - Use `.env` files locally only
2. **Use a secrets manager** - 1Password, HashiCorp Vault, AWS Secrets Manager
3. **Set up key expiration** - Rotate keys every 90 days
4. **Use least privilege** - Only grant necessary permissions
5. **Monitor usage** - Check provider dashboards for unauthorized access

---

## After Rotation

Update your `.env` file with new keys:

```bash
# Example structure
OPENAI_API_KEY=sk-...          # NEW key
ANTHROPIC_API_KEY=sk-ant-...   # NEW key
GITHUB_TOKEN=ghp_...           # NEW key
# ... etc
```

Then rebuild and test VIBE CLI:

```bash
cd vibe-cli
npm run build
node bin/vibe.js --help
```
