#!/bin/bash
# Setup Script for Corporate Admin Account

echo "🚀 MANAS360 Corporate Admin Setup"
echo "=================================="
echo ""

# Check Docker
echo "Checking Docker..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker."
    echo "📖 Download from: https://www.docker.com/products/docker-desktop"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo "❌ Docker daemon not running."
    echo "💡 Please start Docker Desktop and try again."
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Start services
echo "Starting database and services..."
cd "$(dirname "$0")"
docker compose up -d

echo "⏳ Waiting for database to be ready..."
sleep 5

# Run database migrations
echo "Running database migrations..."
cd backend
npm run prisma:migrate:deploy 2>/dev/null || echo "Migrations might have been run already"

# Create corporate admin
echo ""
echo "Creating Corporate Admin account..."
node create-corp-admin-phone.js

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Use these credentials to login:"
echo "   Phone: +919000000001"
echo "   Role: Corporate Admin"
echo ""
echo "🌐 Open: http://localhost:5173/auth/login"
