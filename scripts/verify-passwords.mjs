import { PrismaClient } from '@prisma/client';
import { hashPassword, verifyPassword } from '../src/lib/auth';
const db = new PrismaClient();

// Try the seed password AND what ensureDemoUsers uses
const candidates = ['Demo@123', 'Demo@2024'];

db.user.findMany({
  where: { isDemo: false },
  select: { id: true, email: true, password: true },
  take: 10,
})
  .then(async (users) => {
    for (const u of users) {
      for (const pw of candidates) {
        const match = await verifyPassword(pw, u.password);
        if (match) {
          console.log(`MATCH: ${u.email} → "${pw}"`);
          return;
        }
      }
      console.log(`NO MATCH: ${u.email}`);
      console.log(`  Hash: ${u.password}`);
    }
    // Also try a fresh hash to compare
    const fresh = await hashPassword('Demo@123');
    console.log('\nFresh hash of "Demo@123":', fresh);
    db.$disconnect();
  })
  .catch(err => { console.error(err.message); db.$disconnect(); });
