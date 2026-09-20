import { prisma } from "../lib/db";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const merchantSlug = process.argv[3]?.trim();
  const roleArg = (process.argv[4]?.trim().toUpperCase() || "MERCHANT") as
    | "MERCHANT"
    | "ADMIN";

  if (!email || !merchantSlug) {
    console.error(
      "Usage : npx tsx scripts/promote-merchant.ts <email> <merchant-slug> [MERCHANT|ADMIN]",
    );
    console.error("Ex. : npx tsx scripts/promote-merchant.ts vous@exemple.fr bricomarche");
    process.exit(1);
  }

  if (roleArg !== "MERCHANT" && roleArg !== "ADMIN") {
    console.error("Rôle invalide (MERCHANT ou ADMIN).");
    process.exit(1);
  }

  const merchant = await prisma.merchant.findUnique({
    where: { slug: merchantSlug },
    select: { id: true, name: true, slug: true },
  });
  if (!merchant) {
    console.error(`Enseigne inconnue : ${merchantSlug}`);
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });
  if (!user) {
    console.error(
      `Aucun compte pour ${email}. Connectez-vous d’abord sur /login, puis relancez.`,
    );
    process.exit(1);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { role: roleArg, merchantId: merchant.id },
  });

  console.log(
    `${email} est maintenant ${roleArg} de ${merchant.name} (${merchant.slug}). Back-office : /admin/offres`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
