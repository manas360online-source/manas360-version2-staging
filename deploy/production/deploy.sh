#!/bin/bash
set -e

echo "[1/7] Pulling latest code..."
git pull

echo "[2/7] Installing backend dependencies..."
cd backend && npm ci && npm run build && npx prisma migrate deploy && npx prisma generate
cd ..

echo "[3/7] Installing frontend dependencies..."
cd frontend && npm ci && npm run build
cd ..

echo "[4/7] Restarting backend service..."
sudo systemctl restart manas360

echo "[5/7] Reloading nginx..."
sudo nginx -t && sudo systemctl reload nginx

echo "[6/7] Running health check..."
curl -f https://manas360.com/api/health || (echo "Health check failed" && exit 1)

echo "[7/7] Deployment complete!"
