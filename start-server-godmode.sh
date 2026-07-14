#!/bin/bash
export DATABASE_URL="file:./prisma/dev.db"
unset DIRECT_URL
export NODE_ENV=development
echo "Starting Kyntha 7000..."
echo "URL: http://localhost:8000"
echo "Directory: $(pwd)"
exec npm run dev
