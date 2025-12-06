# ==============================================================================
# SINAG Nginx Reverse Proxy Dockerfile
# ==============================================================================
# This Dockerfile creates a production-ready Nginx reverse proxy for SINAG.
# It includes custom configuration and security hardening.
# ==============================================================================

FROM nginx:1.25-alpine

# Metadata labels
LABEL maintainer="SINAG Development Team"
LABEL description="Nginx reverse proxy for SINAG platform"
LABEL version="1.0"

# Install additional packages (if needed)
RUN apk add --no-cache \
    curl \
    tzdata

# Set timezone to Philippines
ENV TZ=Asia/Manila
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Remove default Nginx configuration
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d/ /etc/nginx/conf.d/

# Create directories for logs and cache
# PERFORMANCE: Separate cache directories for API and static assets
RUN mkdir -p /var/cache/nginx/api /var/cache/nginx/static /var/log/nginx && \
    chown -R nginx:nginx /var/cache/nginx /var/log/nginx

# Create a simple health check HTML page
RUN echo '<!DOCTYPE html><html><head><title>SINAG</title></head><body><h1>SINAG Platform</h1></body></html>' > /usr/share/nginx/html/index.html

# Expose ports
EXPOSE 80 443

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Note: Nginx must run as root to bind to port 80/443
# The nginx.conf is configured to drop privileges after binding to ports
# This is a standard and secure Nginx pattern

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
