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

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Runtime stage
FROM node:20-slim

WORKDIR /app

# Install runtime dependencies for native modules
RUN apt-get update && apt-get install -y \
    libsecret-1-0 \
    && rm -rf /var/lib/apt/lists/*

COPY --from:builder /app/dist ./dist
COPY --from:builder /app/bin ./bin
COPY --from:builder /app/package*.json ./
COPY --from:builder /app/node_modules ./node_modules

# Add vibe to path
RUN ln -s /app/bin/vibe.js /usr/local/bin/vibe

# Default workspace
VOLUME /workspace
WORKDIR /workspace

ENTRYPOINT ["vibe"]
