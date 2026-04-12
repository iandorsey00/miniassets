import "dotenv/config";

import { prisma } from "../lib/prisma.ts";

async function main() {
  const assets = await prisma.asset.findMany({
    select: {
      id: true,
      usageState: true,
      usageFrequency: true,
      stockStatus: true,
      sizeType: true,
    },
  });

  for (const asset of assets) {
    const nextStockStatus =
      asset.usageState === "STORAGE"
        ? "BACKUP"
        : asset.usageState === "IN_USE"
          ? "ACTIVE"
          : asset.stockStatus;
    const nextUsageFrequency =
      asset.usageState === "STORAGE" && asset.usageFrequency === "WEEKLY"
        ? "MONTHLY"
        : asset.usageFrequency;
    const nextSizeType = asset.sizeType || "MEDIUM";
    const nextUsageState = nextStockStatus === "ACTIVE" ? "IN_USE" : "STORAGE";

    if (
      asset.stockStatus === nextStockStatus &&
      asset.usageFrequency === nextUsageFrequency &&
      asset.sizeType === nextSizeType &&
      asset.usageState === nextUsageState
    ) {
      continue;
    }

    await prisma.asset.update({
      where: { id: asset.id },
      data: {
        stockStatus: nextStockStatus,
        usageFrequency: nextUsageFrequency,
        sizeType: nextSizeType,
        usageState: nextUsageState,
      },
    });
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
