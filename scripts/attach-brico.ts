import { prisma } from "../lib/db";

async function main() {
  const brico = await prisma.merchant.findFirst({ where: { name: { contains: "Bricomarch" } } });
  if (!brico) { console.log("Bricomarché introuvable"); await prisma.$disconnect(); return; }
  const u = await prisma.user.update({
    where: { email: "admin@achille.test" },
    data: { role: "ADMIN", merchantId: brico.id },
  });
  console.log("OK:", u.email, u.role, "-> enseigne", brico.name);
  await prisma.$disconnect();
}
main();
