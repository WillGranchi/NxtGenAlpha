# Production Deployment Guide

This guide covers deploying the Trading Platform to production.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [SSL/HTTPS Setup](#sslhttps-setup)
- [Google OAuth Production Setup](#google-oauth-production-setup)
- [Docker Deployment](#docker-deployment)
- [Post-Deployment](#post-deployment)
- [Monitoring & Health Checks](#monitoring--health-checks)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before deploying, ensure you have:

- [ ] A server/VPS with Docker and Docker Compose installed
- [ ] A domain name pointed to your server's IP address
- [ ] SSL/TLS certificates (Let's Encrypt recommended)
- [ ] Google OAuth credentials configured (see [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md))
- [ ] PostgreSQL database (can use Docker or managed service)
- [ ] At least 2GB RAM and 20GB disk space
- [ ] Firewall configured (ports 80, 443, optionally 8000 for API)

## Quick Start

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd TradingPlat
   ```

2. **Copy environment file**:
   ```bash
   cp .env.example .env
   ```

3. **Configure environment variables** (see [Environment Configuration](#environment-configuration))

4. **Deploy with Docker**:
   ```bash
   docker compose -f docker-compose.yml up -d
   ```

5. **Initialize database**:
   ```bash
   ./scripts/init_db.sh
   ```

6. **Verify deployment**:
   ```bash
   curl https://your-domain.com/api/health
   ```

## Environment Configuration

Create a `.env` file in the project root with the following variables:

### Required Variables

```bash
# Google OAuth (REQUIRED)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Application URLs (REQUIRED)
FRONTEND_URL=https://your-domain.com
BACKEND_URL=https://api.your-domain.com  # or https://your-domain.com/api

# Database (REQUIRED)
DATABASE_URL=postgresql://user:password@host:5432/database_name

# JWT Secret (REQUIRED - Generate a secure random key!)
JWT_SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")

# CORS Origins (REQUIRED)
CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com

# Environment
ENVIRONMENT=production
```

### Optional Variables

```bash
# JWT Configuration
JWT_ALGORITHM=HS256

# Cookie Settings (Production with HTTPS)
COOKIE_SECURE=true
COOKIE_SAMESITE=lax

# Google OAuth Redirect URI (auto-configured from BACKEND_URL)
# GOOGLE_REDIRECT_URI=https://api.your-domain.com/api/auth/google/callback
```

### Generate Secure JWT Secret

```bash
# Method 1: Python
python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# Method 2: OpenSSL
openssl rand -base64 32

# Method 3: Using the setup script
./scripts/setup_env.sh
```

## Database Setup

### Option 1: Docker PostgreSQL (Recommended for Small Deployments)

The `docker-compose.yml` includes a PostgreSQL service. Ensure it's configured:

```yaml
# In docker-compose.yml
db:
  environment:
    POSTGRES_DB: tradingplat
    POSTGRES_USER: your_db_user
    POSTGRES_PASSWORD: your_secure_password
  volumes:
    - postgres_data:/var/lib/postgresql/data
```

Update `.env`:
```bash
DATABASE_URL=postgresql://your_db_user:your_secure_password@db:5432/tradingplat
```

### Option 2: Managed PostgreSQL (Recommended for Production)

Use a managed database service (AWS RDS, Google Cloud SQL, DigitalOcean Managed Databases):

1. Create a database instance
2. Get the connection string
3. Update `DATABASE_URL` in `.env`:
   ```bash
   DATABASE_URL=postgresql://user:password@your-db-host:5432/tradingplat?sslmode=require
   ```
4. Remove the `db` service from `docker-compose.yml` if using external database

### Initialize Database

```bash
# Run migrations
docker compose exec backend alembic upgrade head

# Or use the init script
./scripts/init_db.sh
```

## SSL/HTTPS Setup

Google OAuth **requires HTTPS** in production (except localhost). Set up SSL certificates:

### Option 1: Let's Encrypt with Certbot (Recommended)

1. **Install Certbot**:
   ```bash
   sudo apt-get update
   sudo apt-get install certbot
   ```

2. **Obtain certificates**:
   ```bash
   sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com
   ```

3. **Certificates will be in**:
   - `/etc/letsencrypt/live/your-domain.com/fullchain.pem`
   - `/etc/letsencrypt/live/your-domain.com/privkey.pem`

4. **Configure reverse proxy** (see nginx example below)

### Option 2: Cloud Platform SSL (AWS, GCP, Azure)

Most cloud platforms offer built-in SSL:
- **AWS**: Application Load Balancer with ACM certificates
- **GCP**: Cloud Load Balancing with managed SSL certificates
- **Azure**: Application Gateway with SSL termination

### Option 3: nginx Reverse Proxy

Create `/etc/nginx/sites-available/trading-platform`:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support (if needed)
    location /ws {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/trading-platform /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Google OAuth Production Setup

1. **Configure OAuth credentials** (see [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md))

2. **Add production redirect URIs** in Google Cloud Console:
   - Authorized JavaScript origins: `https://your-domain.com`
   - Authorized redirect URIs: `https://your-domain.com/api/auth/google/callback`

3. **Update environment variables**:
   ```bash
   GOOGLE_CLIENT_ID=your-production-client-id
   GOOGLE_CLIENT_SECRET=your-production-client-secret
   FRONTEND_URL=https://your-domain.com
   BACKEND_URL=https://your-domain.com  # or https://api.your-domain.com
   ```

4. **Verify configuration**:
   ```bash
   docker compose logs backend | grep -i "oauth"
   ```

## Docker Deployment

### Basic Deployment

```bash
# Pull latest code
git pull

# Build and start services
docker compose up -d --build

# Check status
docker compose ps

# View logs
docker compose logs -f
```

### Production Deployment with Specific Compose File

```bash
# Use production compose file (if created)
docker compose -f docker-compose.prod.yml up -d --build
```

### Update Deployment

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker compose up -d --build

# Run migrations if needed
docker compose exec backend alembic upgrade head
```

### Backup Database

```bash
# Backup
docker compose exec db pg_dump -U tradingplat_user tradingplat > backup_$(date +%Y%m%d).sql

# Restore
docker compose exec -T db psql -U tradingplat_user tradingplat < backup_20240101.sql
```

## Post-Deployment

### 1. Verify Services

```bash
# Check all containers are running
docker compose ps

# Check backend health
curl https://your-domain.com/api/health

# Check frontend
curl -I https://your-domain.com
```

### 2. Test Authentication

1. Visit `https://your-domain.com`
2. Click "Sign in with Google"
3. Complete OAuth flow
4. Verify user is created in database:
   ```bash
   docker compose exec db psql -U tradingplat_user tradingplat -c "SELECT email, name FROM users;"
   ```

### 3. Run Tests

```bash
# Run integration tests
./scripts/test_integration.sh
```

## Monitoring & Health Checks

### Health Check Endpoints

- **Backend**: `https://your-domain.com/api/health`
- **Frontend**: `https://your-domain.com` (should return 200)

### Logs

```bash
# View all logs
docker compose logs -f

# View specific service logs
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db
```

### Database Monitoring

```bash
# Check database connections
docker compose exec db psql -U tradingplat_user tradingplat -c "SELECT count(*) FROM pg_stat_activity;"

# Check table sizes
docker compose exec db psql -U tradingplat_user tradingplat -c "\dt+"
```

### Resource Usage

```bash
# Check container resource usage
docker stats

# Check disk usage
df -h
docker system df
```

## Troubleshooting

### Containers Won't Start

```bash
# Check logs
docker compose logs

# Check Docker daemon
sudo systemctl status docker

# Check disk space
df -h
```

### Database Connection Issues

```bash
# Test database connection
docker compose exec backend python3 -c "from backend.core.database import engine; engine.connect()"

# Check database is running
docker compose ps db

# Check database logs
docker compose logs db
```

### OAuth Not Working

1. **Check credentials are set**:
   ```bash
   docker compose exec backend env | grep GOOGLE
   ```

2. **Verify redirect URIs match**:
   - Google Console: `https://your-domain.com/api/auth/google/callback`
   - Backend: Check logs for redirect URL

3. **Check CORS configuration**:
   ```bash
   docker compose exec backend env | grep CORS
   ```

### Frontend Not Loading

1. **Check frontend container**:
   ```bash
   docker compose ps frontend
   docker compose logs frontend
   ```

2. **Verify API URL**:
   - Check `VITE_API_URL` in frontend environment
   - Verify backend is accessible

### High Memory Usage

```bash
# Check container memory
docker stats

# Restart services
docker compose restart

# Increase Docker memory limit in Docker Desktop settings
```

## Security Checklist

- [ ] Changed default JWT secret to a strong random value
- [ ] Set `ENVIRONMENT=production`
- [ ] Configured HTTPS/SSL certificates
- [ ] Set `COOKIE_SECURE=true` (HTTPS only)
- [ ] Restricted CORS origins to your domain only
- [ ] Database uses strong passwords
- [ ] Firewall configured (only ports 80, 443 open)
- [ ] Regular backups configured
- [ ] Google OAuth redirect URIs restricted to your domain
- [ ] `.env` file is not committed to version control
- [ ] Docker images are up to date (security patches)

## Backup Strategy

### Automated Backups

Create a cron job for database backups:

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * cd /path/to/TradingPlat && docker compose exec -T db pg_dump -U tradingplat_user tradingplat > /backups/tradingplat_$(date +\%Y\%m\%d).sql
```

### Restore from Backup

```bash
# Stop services
docker compose stop backend

# Restore database
docker compose exec -T db psql -U tradingplat_user tradingplat < backup_20240101.sql

# Restart services
docker compose start backend
```

## Scaling Considerations

- **Horizontal Scaling**: Use a load balancer with multiple backend instances
- **Database**: Consider read replicas for high read traffic
- **Caching**: Add Redis for session storage and caching
- **CDN**: Use Cloudflare or similar for static assets
- **Monitoring**: Set up Prometheus + Grafana for metrics

## Support

For issues:
1. Check logs: `docker compose logs`
2. Review this guide's troubleshooting section
3. Check [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md) for OAuth issues
4. Review application logs in Google Cloud Console (for OAuth)

