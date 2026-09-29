import {
  ROOT_MACRO_BY_LEGACY,
  OVERRIDE_MACRO_BY_LEGACY,
  seedInterestMacros,
} from "../lib/categories/seed-interest-macros";

import { prisma } from "../lib/db";

async function main() {
  const result = await seedInterestMacros(prisma);
  console.log(
    JSON.stringify(
      {
        interestUpserted: result.interestUpserted,
        rootsUpdated: result.rootsUpdated,
        overridesUpdated: result.overridesUpdated,
        expectedRoots: Object.keys(ROOT_MACRO_BY_LEGACY).length,
        expectedOverrides: Object.keys(OVERRIDE_MACRO_BY_LEGACY).length,
        missingRoots: result.missingRoots,
        missingOverrides: result.missingOverrides,
      },
      null,
      2,
    ),
  );
  if (
    result.missingRoots.length > 0 ||
    result.missingOverrides.length > 0 ||
    result.interestUpserted !== 12
  ) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
