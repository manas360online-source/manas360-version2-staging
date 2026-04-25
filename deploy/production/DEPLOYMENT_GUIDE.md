# MANAS360 Production Deployment Guide

## 1. Server Setup
- Provision AWS Lightsail Ubuntu instance
- Set up domain DNS for manas360.com and www.manas360.com
- Open ports 80, 443, 5432, 5000 as needed

## 2. PostgreSQL Configuration
- Install PostgreSQL
- Create user and database:
  ```
  sudo -u postgres psql
  CREATE USER manas360 WITH PASSWORD 'changeme';
  CREATE DATABASE manas360 OWNER manas360;
  ```
- Set DATABASE_URL in backend .env:
  `DATABASE_URL=postgresql://manas360:changeme@localhost:5432/manas360`

## 3. Prisma Migrations
- Run migrations and generate client:
  ```
  npx prisma migrate deploy
  npx prisma generate
  ```

## 4. Domain & SSL Setup
- Point A/AAAA records to server IP
- Install certbot and python3-certbot-nginx:
  ```
  sudo apt update && sudo apt install certbot python3-certbot-nginx
  sudo certbot --nginx -d manas360.com -d www.manas360.com
  sudo certbot renew --dry-run
  ```
- Ensure SSL certs are referenced in nginx/production.conf

## 5. Nginx Configuration
- Copy nginx/production.conf to /etc/nginx/conf.d/default.conf
- Test and reload:
  ```
  sudo nginx -t
  sudo systemctl reload nginx
  ```
- Ensure permissions for nginx user on config and web root

## 6. Deployment Workflow
- Pull latest code:
  `git pull`
- Build frontend and backend:
  ```
  cd frontend && npm ci && npm run build
  cd ../backend && npm ci && npm run build && npx prisma migrate deploy && npx prisma generate
  ```
- Use docker-compose for services:
  `docker-compose up -d --build`
- Restart backend:
  `sudo systemctl restart manas360`

## 7. Systemd Service for Backend
- Create /etc/systemd/system/manas360.service:
  ```
  [Unit]
  Description=MANAS360 Backend
  After=network.target

  [Service]
  Type=simple
  User=ubuntu
  WorkingDirectory=/opt/manas360/backend
  ExecStart=/usr/bin/node dist/index.js
  Restart=always
  Environment=NODE_ENV=production
  EnvironmentFile=/opt/manas360/backend/.env

  [Install]
  WantedBy=multi-user.target
  ```
- Enable and start:
  ```
  sudo systemctl daemon-reload
  sudo systemctl enable manas360
  sudo systemctl start manas360
  ```

## 8. Health Check
- Test: `curl https://manas360.com/api/health`
- Should return `{ "status": "ok", "service": "manas360-api" }`

## 9. Troubleshooting
- Check logs: `sudo journalctl -u manas360` and `/var/log/nginx/*.log`
- Validate nginx: `sudo nginx -t`
- Restart services as needed

---

This guide ensures a secure, robust, and automated production deployment for MANAS360.
