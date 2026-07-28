import { PrismaClient } from '@prisma/client';
import { hashPassword, verifyPassword } from '../src/lib/auth';
const db = new PrismaClient();

// Try common passwords against real users
const passwords = ['Kynthai@2024', 'Kynthai2024', 'kynthai2024', 'admin123', 'Kynthai!123', 'password', 'Kynthai123'];

db.user.findMany({
  where: { isDemo: false },
  select: { id: true, email: true, name: true, password: true },
  take: 10,
})
  .then(async (users) => {
    for (const u of users) {
      for (const pw of passwords) {
        if (await verifyPassword(pw, u.password)) {
          console.log(`MATCH: ${u.email} → ${pw}`);
          return;
        }
      }
      console.log(`NO MATCH: ${u.email} (password hash: ${u.password.substring(0, 20)}...)`);
    }
    db.$disconnect();
  })
  .catch(err => { console.error(err.message); db.$disconnect(); });
