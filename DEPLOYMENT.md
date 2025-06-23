# Deployment Guide

## Environment Configuration

All URL and port configuration is now centralized in the `.env` file. You only need to update these variables to change your deployment settings:

### HTTP Deployment (Default)

For HTTP deployment on port 80:
```env
# Server configuration
API_HOST=localhost
API_PORT=80
API_PROTOCOL=http
BASE_URL=http://localhost:80

# Google OAuth (update for your domain)
GOOGLE_REDIRECT_URI=http://localhost:80/api/auth/google/callback
```

### HTTPS Deployment

For HTTPS deployment:
```env
# Server configuration
API_HOST=yourdomain.com
API_PORT=443
API_PROTOCOL=https
BASE_URL=https://yourdomain.com

# HTTPS configuration
HTTPS_ENABLED=true
SSL_CERT_PATH=/path/to/your/certificate.crt
SSL_KEY_PATH=/path/to/your/private.key
SSL_CA_PATH=/path/to/your/ca-bundle.crt

# Google OAuth (update for your domain)
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback
```

### Custom Port Configuration

For custom ports (e.g., port 8080):
```env
# Server configuration
API_HOST=localhost
API_PORT=8080
API_PROTOCOL=http
BASE_URL=http://localhost:8080

# Google OAuth
GOOGLE_REDIRECT_URI=http://localhost:8080/api/auth/google/callback
```

## HTTP Server Hosting

Your current setup is sufficient for HTTP hosting. You have:

✅ **HTTP Server**: Node.js HTTP server with compression and CORS
✅ **Static File Serving**: Built-in static file handler
✅ **API Routes**: RESTful API endpoints
✅ **Database**: Oracle Database connection
✅ **Authentication**: JWT + Google OAuth
✅ **File Upload**: Image upload with processing

### Production HTTP Deployment Steps:

1. **Update Environment Variables**:
   ```env
   API_HOST=your-server-ip-or-domain
   API_PORT=80
   BASE_URL=http://your-server-ip-or-domain:80
   ```

2. **Start the Server**:
   ```bash
   npm start
   # or
   node backend/server.js
   ```

3. **Configure Reverse Proxy** (Optional but recommended):
   Use nginx or Apache to proxy to your Node.js app for better performance.

## HTTPS Server Hosting

To enable HTTPS, you need SSL certificates and must update your configuration:

### 1. Obtain SSL Certificates

**Option A: Let's Encrypt (Free)**
```bash
# Install certbot
sudo apt install certbot

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com

# Certificates will be in:
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem (certificate)
# /etc/letsencrypt/live/yourdomain.com/privkey.pem (private key)
```

**Option B: Commercial SSL Certificate**
- Purchase from a CA (Certificate Authority)
- Follow their instructions to generate CSR and obtain certificates

**Option C: Self-Signed Certificate (Development Only)**
```bash
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

### 2. Update .env for HTTPS

```env
# Server configuration
API_HOST=yourdomain.com
API_PORT=443
API_PROTOCOL=https
BASE_URL=https://yourdomain.com

# HTTPS configuration
HTTPS_ENABLED=true
SSL_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem

# Update OAuth redirect
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback
```

### 3. Update Google OAuth Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "APIs & Services" > "Credentials"
3. Edit your OAuth 2.0 Client ID
4. Update "Authorized redirect URIs" to: `https://yourdomain.com/api/auth/google/callback`

### 4. Firewall Configuration

Ensure your server allows HTTPS traffic:
```bash
# Ubuntu/Debian
sudo ufw allow 443/tcp

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload
```

### 5. Start HTTPS Server

```bash
node backend/server.js
```

The server will automatically detect HTTPS_ENABLED=true and start an HTTPS server.

## Production Deployment Checklist

### Required for HTTP:
- [ ] Update `.env` with production values
- [ ] Configure database connection
- [ ] Set up process manager (PM2, systemd)
- [ ] Configure firewall rules
- [ ] Set up monitoring/logging

### Additional for HTTPS:
- [ ] Obtain SSL certificates
- [ ] Configure HTTPS in `.env`
- [ ] Update Google OAuth settings
- [ ] Set up certificate auto-renewal
- [ ] Configure HSTS headers (optional)
- [ ] Test SSL configuration

## Process Management

For production, use a process manager:

**PM2 (Recommended)**:
```bash
npm install -g pm2
pm2 start backend/server.js --name "pet-adoption-api"
pm2 startup
pm2 save
```

**systemd**:
Create `/etc/systemd/system/pet-adoption.service`:
```ini
[Unit]
Description=Pet Adoption API
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/your/app
ExecStart=/usr/bin/node backend/server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

## Environment Variables Reference

| Variable | Description | HTTP Example | HTTPS Example |
|----------|-------------|--------------|---------------|
| `API_HOST` | Server hostname | `localhost` | `yourdomain.com` |
| `API_PORT` | Server port | `80` | `443` |
| `API_PROTOCOL` | Protocol | `http` | `https` |
| `BASE_URL` | Full base URL | `http://localhost:80` | `https://yourdomain.com` |
| `HTTPS_ENABLED` | Enable HTTPS | `false` | `true` |
| `SSL_CERT_PATH` | Certificate path | - | `/path/to/cert.pem` |
| `SSL_KEY_PATH` | Private key path | - | `/path/to/key.pem` |
| `GOOGLE_REDIRECT_URI` | OAuth redirect | `http://localhost:80/api/auth/google/callback` | `https://yourdomain.com/api/auth/google/callback` |

## Testing Your Deployment

1. **HTTP Test**:
   ```bash
   curl http://your-domain/api/status
   ```

2. **HTTPS Test**:
   ```bash
   curl https://your-domain/api/status
   ```

3. **SSL Test** (for HTTPS):
   ```bash
   openssl s_client -connect your-domain:443 -servername your-domain
   ```

Your application will automatically adapt to any configuration changes in the `.env` file!
