import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
db.user.findMany({
  where: { isDemo: true },
  select: { id: true, email: true, name: true, role: true },
})
  .then(users => {
    console.log(JSON.stringify(users, null, 2));
    db.disconnect();
  })
  .catch(err => {
    console.error(err.message);
    db.disconnect();
  });
