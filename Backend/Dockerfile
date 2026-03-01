# Build stage for production dependencies
FROM node:18-alpine AS deps

WORKDIR /app

# Install system dependencies for native modules (canvas, sharp, etc.)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    librsvg-dev \
    pkgconfig \
    pixman-dev \
    bash

# Set Python symlink for node-gyp
RUN ln -sf python3 /usr/bin/python

# Copy package files
COPY package*.json ./

# Set npm registry and install with optimized settings
RUN npm config set registry https://registry.npmjs.org/ \
    && npm config set fetch-retry-maxtimeout 300000 \
    && npm config set fetch-retry-mintimeout 60000 \
    && npm config set maxsockets 3 \
    && npm cache clean --force

# Install all dependencies (including dev dependencies for canvas compilation)
RUN npm install --network-timeout=300000

# Copy source code
COPY . .

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Install RUNTIME system dependencies for canvas and sharp
RUN apk add --no-cache \
    cairo \
    jpeg \
    pango \
    giflib \
    librsvg \
    pixman

# Copy package files
COPY package*.json ./

# Copy installed dependencies from build stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application code
COPY --from=deps /app ./

# Create uploads directory and set permissions
RUN mkdir -p uploads public/uploads uploads/face_recognition \
    && chmod -R 755 uploads public/uploads

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nodeapp -u 1001 \
    && chown -R nodeapp:nodejs /app

USER nodeapp

EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node healthcheck.js || exit 1

CMD ["npm", "start"]