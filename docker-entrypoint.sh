#!/bin/sh
set -e

echo "Applying database schema..."
npm run db:push

echo "Starting application..."
exec npm run start
