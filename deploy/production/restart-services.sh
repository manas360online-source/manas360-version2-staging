#!/bin/bash
set -e

echo "Restarting backend service..."
sudo systemctl restart manas360

echo "Reloading nginx..."
sudo nginx -t && sudo systemctl reload nginx

echo "Done."
