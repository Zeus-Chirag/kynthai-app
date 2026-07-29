import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**', '**/.next/**'],
    environment: 'node',
    env: {
      DATABASE_URL: 'postgresql://localhost:5432/test',
      ENCRYPTION_KEY: 'dd0bcc25f72560e2bc835df18763090fc8380ceda70fc1a03d6c72edd16e5169',
      NEXT_PUBLIC_SUPABASE_URL: 'https://szqzeemimmafkopwqqfp.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})