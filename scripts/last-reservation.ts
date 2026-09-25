import { prisma } from "../lib/db";
async function main() {
  const r = await prisma.reservation.findFirst({
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true, pickupCode: true, totalAmount: true, paymentIntentId: true, commissionAmount: true, feeAmount: true, merchantId: true },
  });
  console.log(r);
  if (r?.merchantId) {
    const m = await prisma.merchant.findUnique({ where: { id: r.merchantId }, select: { name: true, stripeAccountId: true } });
    console.log("MERCHANT:", m);
  }
  await prisma.$disconnect();
}
main();
