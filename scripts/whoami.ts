import { prisma } from "../lib/db";

async function main() {
  const u = await prisma.user.findUnique({
    where: { email: "admin@achille.test" },
    select: { email: true, role: true, merchantId: true },
  });
  console.log("USER:", u);
  if (u?.merchantId) {
    const m = await prisma.merchant.findUnique({ where: { id: u.merchantId }, select: { name: true } });
    console.log("ENSEIGNE:", m?.name);
  } else {
    console.log("ENSEIGNE: (aucune)");
  }
  await prisma.$disconnect();
}
main();
