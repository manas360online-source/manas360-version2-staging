#!/bin/sh
set -e

# --- DATABASE READINESS CHECK ---
# We wait for the database to be reachable before attempting migrations.
# This prevents the "Prisma can't reach database" errors on cold starts.

echo "Waiting for database to be ready..."
RETRIES=30
until npx prisma migrate status > /dev/null 2>&1 || [ $RETRIES -eq 0 ]; do
  echo "Waiting for database connection... ($RETRIES attempts left)"
  RETRIES=$((RETRIES - 1))
  sleep 2
done

if [ $RETRIES -eq 0 ]; then
  echo "Error: Database is not reachable after multiple attempts. Exiting."
  exit 1
fi

echo "Database is reachable. Running migrations..."

# --- RUN MIGRATIONS ---
# 'migrate deploy' is safe for production as it only applies pending migrations 
# without trying to reset the database.
npx prisma migrate deploy

echo "Migrations completed. Starting the application..."

# --- START APPLICATION ---
# We use 'exec' so the node process becomes PID 1, allowing it to receive
# termination signals (SIGTERM, SIGINT) correctly.
exec "$@"
