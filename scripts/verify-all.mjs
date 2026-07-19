import { PrismaClient } from '@prisma/client';
import { hashPassword, verifyPassword } from '../src/lib/auth';
const db = new PrismaClient();

const candidates = ['Demo@123', 'Demo@2024', 'Kyntha@2024', 'kyntha123', 'password'];

db.user.findMany({
  where: { isDemo: false },
  select: { id: true, email: true, name: true, role: true, password: true, emailVerified: true, isDemo: true },
  take: 10,
})
  .then(async (users) => {
    for (const u of users) {
      console.log(`\n${u.email} (${u.role}) emailVerified=${u.emailVerified} isDemo=${u.isDemo}`);
      for (const pw of candidates) {
        const match = await verifyPassword(pw, u.password);
        if (match) {
          console.log(`  → MATCH: "${pw}"`);
          break;
        }
      }
    }
    const fresh = await hashPassword('Demo@123');
    console.log('\nFresh hash of "Demo@123":', fresh);
    console.log('\nActual hash prefix from DB:', users[0]?.password?.substring(0, 30));
    console.log('Fresh hash prefix:           ', fresh.substring(0, 30));
    console.log('Match:', users[0]?.password?.substring(0, 30) === fresh.substring(0, 30) ? 'SAME' : 'DIFFERENT');
    db.$disconnect();
  })
  .catch(err => { console.error(err.message); db.$disconnect(); });
