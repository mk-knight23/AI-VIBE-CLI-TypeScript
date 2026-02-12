# AI-VIBE-CLI - CI/CD Guide
## Continuous Deployment for CLI Tool

---

## Table of Contents

1. [Build Pipeline](#build-pipeline)
2. [Testing Pipeline](#testing-pipeline)
3. [Release Process](#release-process)
4. [Distribution](#distribution)

---

## Build Pipeline

### CI Workflow

```yaml
# .github/workflows/cli-ci.yml
name: CLI CI

on:
  push:
    branches: [main, develop]
    paths:
      - 'AI-VIBE-CLI/**'
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: AI-VIBE-CLI/package-lock.json

      - name: Install dependencies
        working-directory: AI-VIBE-CLI
        run: npm ci

      - name: Type check
        working-directory: AI-VIBE-CLI
        run: npm run type-check

      - name: Lint
        working-directory: AI-VIBE-CLI
        run: npm run lint

      - name: Build
        working-directory: AI-VIBE-CLI
        run: npm run build

      - name: Test
        working-directory: AI-VIBE-CLI
        run: npm test
```

---

## Testing Pipeline

```yaml
# .github/workflows/cli-test.yml
name: CLI Tests

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node: [18, 20]
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}

      - name: Install
        working-directory: AI-VIBE-CLI
        run: npm ci

      - name: Test
        working-directory: AI-VIBE-CLI
        run: npm test
```

---

## Release Process

### NPM Publish

```yaml
# .github/workflows/cli-release.yml
name: Release CLI

on:
  push:
    tags:
      - 'cli-v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'

      - name: Install dependencies
        working-directory: AI-VIBE-CLI
        run: npm ci

      - name: Build
        working-directory: AI-VIBE-CLI
        run: npm run build

      - name: Publish to NPM
        working-directory: AI-VIBE-CLI
        run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## Distribution

### Package Managers

```bash
# NPM
npm install -g @vibe/cli

# Homebrew
brew tap vibe/tap
brew install vibe-cli

# Direct install
curl -fsSL https://vibe.dev/install.sh | bash
```

### Binary Releases

```yaml
# .github/workflows/cli-binaries.yml
name: Build Binaries

on:
  release:
    types: [published]

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        include:
          - os: ubuntu-latest
            target: linux-x64
          - os: windows-latest
            target: win-x64
          - os: macos-latest
            target: darwin-x64
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install pkg
        run: npm install -g pkg

      - name: Build binary
        working-directory: AI-VIBE-CLI
        run: pkg . --targets node20-${{ matrix.target }} --output vibe-${{ matrix.target }}

      - name: Upload to release
        uses: actions/upload-release-asset@v1
        with:
          upload_url: ${{ github.event.release.upload_url }}
          asset_path: ./AI-VIBE-CLI/vibe-${{ matrix.target }}
          asset_name: vibe-${{ matrix.target }}
          asset_content_type: application/octet-stream
```

---

*CI/CD Guide v2.0 - AI-VIBE-CLI*
