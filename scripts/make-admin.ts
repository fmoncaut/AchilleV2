import { prisma } from "../lib/db";

async function main() {
  const u = await prisma.user.update({
    where: { email: "admin@achille.test" },
    data: { role: "ADMIN" },
  });
  console.log("OK admin:", u.email, u.role);
  await prisma.$disconnect();
}

main();
