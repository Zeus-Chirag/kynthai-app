#!/usr/bin/env bash
# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  KYNTHA PRODUCTION DB SETUP — PostgreSQL + Supabase                      ║
# ║  Run this on your deployment server where Supabase DB is reachable.      ║
# ╚═══════════════════════════════════════════════════════════════════════════╝
set -euo pipefail
cd "$(dirname "$0")/.."

RED='\033[0;31m'; GREEN='\033[0;32m'; NC='\033[0m'

echo -e "${GREEN}=== Kynthai Production DB Setup ===${NC}"

# 1. Unset any global DATABASE_URL that might interfere
unset DATABASE_URL

# 2. Switch Prisma to PostgreSQL
sed -i '' 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
echo -e "${GREEN}✔ Schema switched to PostgreSQL${NC}"

# 3. Update DATABASE_URL in .env.local
# If your Supabase password has special chars, URL-encode them (%40 for @, %23 for #, etc.)
read -rp "Enter PostgreSQL DATABASE_URL (or press Enter to use existing): " DB_URL
if [ -n "$DB_URL" ]; then
  sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=${DB_URL}|" .env.local
fi

# 4. Generate Prisma client for PostgreSQL
npx prisma generate
echo -e "${GREEN}✔ Prisma client generated${NC}"

# 5. Push schema to PostgreSQL (creates all tables)
echo -e "${GREEN}Pushing schema to PostgreSQL...${NC}"
npx prisma db push
echo -e "${GREEN}✔ Schema pushed to Supabase PostgreSQL${NC}"

# 6. Seed admin user
echo -e "${GREEN}Seeding admin user...${NC}"
node scripts/seed-production.js
echo -e "${GREEN}✔ Admin seeded${NC}"

# 7. Verify
echo ""
echo -e "${GREEN}=== Setup Complete ===${NC}"
echo "DATABASE_URL: $(grep '^DATABASE_URL=' .env.local | head -c 60)..."
echo ""
echo "Next: npm run build && npm start"
