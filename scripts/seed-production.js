// ponytail: Production data seeding - creates no test/demo accounts
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const db = new PrismaClient();

async function seedAdminIfMissing() {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.log('No ADMIN_EMAIL set, skipping admin seed');
    return;
  }

  const existing = await db.user.findUnique({ where: { email: adminEmail } });
  if (existing) {
    console.log('Admin already exists');
    return;
  }

  // C4: never fall back to a known default password. If ADMIN_PASSWORD is
  // missing in production, fail loudly instead of creating a login-able admin.
  if (!process.env.ADMIN_PASSWORD) {
    console.error('ADMIN_PASSWORD is required to seed the admin account. Refusing to create an admin with a default password.');
    process.exit(1);
  }
  const password = process.env.ADMIN_PASSWORD;
  const hashed = await bcrypt.hash(password, 10);

  await db.user.create({
    data: {
      email: adminEmail,
      password: hashed,
      name: 'Admin',
      role: 'admin',
      emailVerified: new Date(),
      consentAccepted: true,
      dataProcessingConsent: true,
      aiTrainingConsent: true,
    },
  });

  console.log(`Created admin: ${adminEmail}`);
}

seedAdminIfMissing()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
