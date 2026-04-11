import "dotenv/config";

import { prisma } from "../lib/prisma.ts";

async function main() {
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    return;
  }

  const admin = await prisma.user.create({
    data: {
      email: "admin@example.com",
      displayName: "Admin",
      role: "ADMIN",
      locale: "EN",
      accentColor: "TEAL",
      unrecordedItemsPerThousand: 10,
    },
  });

  const workspace = await prisma.workspace.create({
    data: {
      slug: "home",
      workspaceCode: "HO",
      name: "Home",
      description: "Local development workspace",
      memberships: {
        create: {
          userId: admin.id,
          role: "ADMIN",
        },
      },
    },
  });

  const house = await prisma.locationNode.create({
    data: {
      workspaceId: workspace.id,
      locationCode: "MAHOLC000001",
      kind: "HOUSE",
      nameEn: "House",
      nameZh: "房屋",
      sortOrder: 0,
    },
  });

  const bedroom = await prisma.locationNode.create({
    data: {
      workspaceId: workspace.id,
      parentId: house.id,
      locationCode: "MAHOLC000002",
      kind: "ROOM",
      nameEn: "Bedroom",
      nameZh: "卧室",
      sortOrder: 0,
    },
  });

  const area = await prisma.locationNode.create({
    data: {
      workspaceId: workspace.id,
      parentId: bedroom.id,
      locationCode: "MAHOLC000003",
      kind: "AREA",
      nameEn: "Temporary Squares",
      nameZh: "临时方格",
      sortOrder: 0,
    },
  });

  const asset = await prisma.asset.create({
    data: {
      workspaceId: workspace.id,
      createdByUserId: admin.id,
      currentLocationId: area.id,
      assetCode: "MAHOAS000001",
      nameEn: "Charging cables",
      nameZh: "充电线",
      quantity: 5,
      trackingMode: "GROUP",
      sensitivityLevel: "LOW",
      description: "Example grouped household item.",
      lastVerifiedAt: new Date(),
      placements: {
        create: {
          movedByUserId: admin.id,
          locationId: area.id,
          confidence: "VERIFIED",
          note: "Seed placement",
        },
      },
    },
  });

  console.log(`Seeded workspace ${workspace.name} with asset ${asset.assetCode}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
