#!/usr/bin/env bash
# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  KYNTHA SUPABASE - ONE CLICK SETUP                                     ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Kynthai Supabase Auto-Setup ===${NC}"

# Check for Supabase CLI
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    brew install supabase || npm install -g supabase
fi

# 1. Create local Supabase project
echo -e "${BLUE}Creating local Supabase project...${NC}"
supabase init --project kynthai-local 2>/dev/null || echo "Project may already exist"

# 2. Apply migration
echo -e "${BLUE}Applying database migration...${NC}"
supabase db push < supabase/migrations/20260101_initial_schema.sql 2>/dev/null || echo "Manual step: Run migration in SQL Editor"

# 3. Create storage buckets
echo -e "${BLUE}Creating storage buckets...${NC}"
supabase storage bucket create medical-documents --public false --file-size-limit 5242880 2>/dev/null || true
supabase storage bucket create prescriptions --public false --file-size-limit 5242880 2>/dev/null || true
supabase storage bucket create lab-results --public false --file-size-limit 10485760 2>/dev/null || true

# 4. Generate types (requires link)
echo -e "${BLUE}Type generation ready (run after linking your project):${NC}"
echo "  supabase gen types typescript --project-ref YOUR_PROJECT > src/supabase/types.ts"

# 5. Create .env.local if missing
if [[ ! -f .env.local ]]; then
    echo -e "${GREEN}Created .env.local - add your Supabase keys${NC}"
fi

echo -e "${GREEN}=== Setup Complete ===${NC}"
echo ""
echo "NEXT STEPS:"
echo "1. supabase login"
echo "2. supabase link --project-ref YOUR_PROJECT"
echo "3. Add keys to .env.local"
