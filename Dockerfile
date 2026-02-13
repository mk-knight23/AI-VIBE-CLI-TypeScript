# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Install build dependencies for native modules (like keytar)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    libsecret-1-dev \
    libgnome-keyring-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Use npm ci for deterministic builds (P2-040)
# Clean cache to reduce image size
RUN npm ci --only=production && npm cache clean --force

# Copy source and build
COPY . .
RUN npm run build

# Runtime stage
FROM node:20-slim

# Create non-root user for security (P2-041)
RUN groupadd -r vibe && useradd -r -g vibe -d /home/vibe -m -s /bin/bash vibe

WORKDIR /app

# Install runtime dependencies for native modules
RUN apt-get update && apt-get install -y \
    libsecret-1-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/bin ./bin
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Set proper ownership
RUN chown -R vibe:vibe /app

# Add vibe to path
RUN ln -s /app/bin/vibe.js /usr/local/bin/vibe

# Switch to non-root user
USER vibe

# Default workspace
VOLUME /workspace
WORKDIR /workspace

ENTRYPOINT ["vibe"]
