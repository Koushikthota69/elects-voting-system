# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Set npm registry and install with optimized settings
RUN npm config set registry https://registry.npmjs.org/ \
    && npm config set fetch-retry-maxtimeout 300000 \
    && npm config set fetch-retry-mintimeout 60000 \
    && npm cache clean --force

# Install dependencies
RUN npm install --legacy-peer-deps --network-timeout=300000

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Production stage
FROM nginx:1.24-alpine

# Copy built app from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create nginx user and set permissions
RUN chown -R nginx:nginx /usr/share/nginx/html \
    && chmod -R 755 /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]