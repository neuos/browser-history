# 🚀 Browser History API - Deployment Guide

## Overview

This guide covers deploying the Browser History API with Native AOT compilation, Docker containerization, and production-ready configurations.

## 🏗️ Architecture Overview

- **Native AOT Compilation**: Self-contained executable with minimal runtime dependencies
- **Docker Containerization**: Multi-stage builds with Alpine Linux for minimal image size
- **Performance Optimizations**: Response compression, caching, and rate limiting
- **Security**: JWT authentication, HTTPS, and device-based authorization
- **Monitoring**: Structured logging, health checks, and performance metrics

## 📋 Prerequisites

### Development Environment
- .NET 9 SDK
- Docker and Docker Compose
- Git

### Production Environment
- Docker runtime
- Reverse proxy (Nginx recommended)
- SSL certificates
- Persistent storage for database and logs

## 🛠️ Build and Deployment Options

### 1. Native AOT Build (Recommended for Production)

```bash
# Build Native AOT executable
dotnet publish BrowserHistory.Api/BrowserHistory.Api.csproj \
  -c Release \
  --self-contained true \
  -r linux-x64 \
  /p:PublishAot=true

# The executable will be in: BrowserHistory.Api/bin/Release/net9.0/linux-x64/publish/
```

**Benefits:**
- Fast startup time (~50ms)
- Low memory footprint (~20MB)
- Single executable file
- No .NET runtime required

### 2. Docker Deployment (Recommended)

#### Development
```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f browser-history-api
```

#### Production
```bash
# Build and start production containers
docker-compose up -d

# With Nginx reverse proxy
docker-compose --profile production up -d
```

### 3. Manual Deployment

```bash
# Restore dependencies
dotnet restore

# Build application
dotnet build -c Release

# Run application
dotnet run --project BrowserHistory.Api -c Release
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `ASPNETCORE_ENVIRONMENT` | Environment (Development/Production) | `Production` | No |
| `ASPNETCORE_URLS` | Binding URLs | `http://+:8080` | No |
| `ConnectionStrings__DefaultConnection` | SQLite database path | `Data Source=browser-history.db` | No |
| `Jwt__Secret` | JWT signing key (32+ chars) | - | **Yes** |
| `Auth__SharedSecret` | Device registration secret | - | **Yes** |
| `Serilog__MinimumLevel__Default` | Logging level | `Information` | No |

### Configuration Files

#### appsettings.json (Base)
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Data Source=browser-history.db"
  },
  "Jwt": {
    "Issuer": "BrowserHistory.Api",
    "Audience": "BrowserHistory.Client",
    "AccessTokenExpiryMinutes": 60,
    "RefreshTokenExpiryDays": 7
  },
  "Caching": {
    "DeviceCacheDuration": "00:30:00",
    "SyncEventsCacheDuration": "00:05:00",
    "HistoryCacheDuration": "00:10:00",
    "MaxItemsPerCategory": 1000
  }
}
```

#### appsettings.Production.json
```json
{
  "Serilog": {
    "MinimumLevel": {
      "Default": "Warning",
      "Override": {
        "BrowserHistory": "Information"
      }
    }
  }
}
```

## 🐳 Docker Configuration

### Dockerfile Features
- **Multi-stage build**: Separate build and runtime stages
- **Alpine Linux**: Minimal runtime image (~100MB total)
- **Non-root user**: Security best practices
- **Health checks**: Built-in monitoring
- **Native AOT**: Optimized executable

### Volume Mounts
- `/app/data`: SQLite database storage
- `/app/logs`: Application logs
- `/app/src`: Source code (development only)

### Port Mapping
- **Container**: 8080
- **Development**: 5000
- **Production**: 80/443 (via reverse proxy)

## 🔒 Security Configuration

### SSL/TLS Setup

#### Option 1: Reverse Proxy (Recommended)
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    location / {
        proxy_pass http://browser-history-api:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # SSE endpoint configuration
    location /api/v1/sse/ {
        proxy_pass http://browser-history-api:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Option 2: HTTPS in Container
```bash
# Generate self-signed certificate (development only)
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Configure HTTPS URLs
export ASPNETCORE_URLS="https://+:8443;http://+:8080"
export ASPNETCORE_Kestrel__Certificates__Default__Path="/app/ssl/cert.pem"
export ASPNETCORE_Kestrel__Certificates__Default__KeyPath="/app/ssl/key.pem"
```

### Authentication Setup

1. **Generate JWT Secret**:
```bash
# Generate a secure 32+ character secret
openssl rand -base64 32
```

2. **Set Environment Variables**:
```bash
export JWT_SECRET="your-generated-secret-here"
export AUTH_SHARED_SECRET="your-device-registration-secret"
```

## 📊 Monitoring and Observability

### Health Checks

| Endpoint | Description | Response |
|----------|-------------|----------|
| `/health` | Basic health check | `200 OK` or `503 Service Unavailable` |
| `/health/ready` | Readiness probe | Database connectivity status |

### Logging

**Structured Logging with Serilog:**
- JSON format for production
- Console output for development
- File rotation (daily, 7-day retention)
- Correlation ID tracking

**Log Levels:**
- `Error`: System errors and exceptions
- `Warning`: Performance issues, validation failures
- `Information`: Request/response logs, business events
- `Debug`: Detailed tracing (development only)

### Performance Metrics

**Built-in Monitoring:**
- Request/response times
- Cache hit/miss ratios
- Rate limiting statistics
- Active SSE connections
- Memory usage

## 🚀 Production Deployment Checklist

### Pre-Deployment
- [ ] Generate secure JWT secret (32+ characters)
- [ ] Set device registration shared secret
- [ ] Configure SSL certificates
- [ ] Set up reverse proxy (Nginx)
- [ ] Configure log rotation
- [ ] Set up backup strategy for database

### Deployment
- [ ] Build Docker image with Native AOT
- [ ] Deploy with docker-compose
- [ ] Verify health checks pass
- [ ] Test authentication endpoints
- [ ] Verify SSE connections work
- [ ] Check logs for errors

### Post-Deployment
- [ ] Monitor application performance
- [ ] Set up alerting for health check failures
- [ ] Monitor log files for errors
- [ ] Verify backup procedures
- [ ] Document API endpoints for frontend team

## 🔄 Scaling and Performance

### Horizontal Scaling

**For multiple instances:**
1. Use external Redis for caching
2. Configure sticky sessions for SSE
3. Load balance with Nginx or HAProxy
4. Use shared storage for SQLite or migrate to PostgreSQL

### Performance Tuning

**Memory Optimization:**
```bash
# Set GC settings for containers
export DOTNET_GCConserveMemory=1
export DOTNET_GCHighMemPercent=75
```

**Connection Limits:**
```json
{
  "Kestrel": {
    "Limits": {
      "MaxConcurrentConnections": 100,
      "MaxConcurrentUpgradedConnections": 100
    }
  }
}
```

## 🛠️ Troubleshooting

### Common Issues

**1. Native AOT Build Failures**
```bash
# Check for unsupported reflection usage
dotnet publish --verbosity detailed

# Add trimming suppressions if needed
<SuppressNativeAotTrimming Include="ProblematicAssembly" />
```

**2. Database Connection Issues**
```bash
# Check file permissions
ls -la /app/data/
chown appuser:appuser /app/data/browser-history.db

# Verify SQLite compatibility
sqlite3 /app/data/browser-history.db ".schema"
```

**3. SSL Certificate Problems**
```bash
# Verify certificate validity
openssl x509 -in cert.pem -text -noout

# Check certificate chain
openssl verify -CAfile ca-bundle.crt cert.pem
```

### Debug Commands

```bash
# Container logs
docker logs browser-history-api -f

# Execute shell in container
docker exec -it browser-history-api /bin/sh

# Health check manually
curl -f http://localhost:8080/health

# Check SSE endpoint
curl -N -H "Accept: text/event-stream" http://localhost:8080/api/v1/sse/events
```

## 📚 Additional Resources

- [.NET 9 Native AOT Documentation](https://docs.microsoft.com/en-us/dotnet/core/deploying/native-aot/)
- [ASP.NET Core Production Best Practices](https://docs.microsoft.com/en-us/aspnet/core/host-and-deploy/)
- [Docker Security Best Practices](https://docs.docker.com/develop/security-best-practices/)
- [Nginx SSL Configuration](https://nginx.org/en/docs/http/configuring_https_servers.html)

---

## 🆘 Support

For deployment issues or questions:
1. Check the logs in `/app/logs/`
2. Verify health check endpoints
3. Review configuration settings
4. Check Docker container status
5. Consult this documentation

**Production Deployment Status**: ✅ **Ready for Production**
