# Stage 1: Build
FROM node:18-alpine AS builder
WORKDIR /app

# Copy source files
COPY . .

# Install dependencies and build
RUN npm ci
RUN npm run build

# Stage 2: Serve using Nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html

# Replace the default nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
