#!/bin/bash
set -e

curl -f https://manas360.com/api/health && echo "Health check passed!" || (echo "Health check failed!" && exit 1)
