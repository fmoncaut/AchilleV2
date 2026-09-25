import { prisma } from "../lib/db";

async function main() {
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { email: true } });
  console.log(admins.length ? admins : "AUCUN ADMIN");
  await prisma.$disconnect();
}

main();
