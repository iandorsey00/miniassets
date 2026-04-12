import type { LocationNodeType } from "@prisma/client";

import { prisma } from "../lib/prisma.ts";

const STRUCTURAL_KINDS: LocationNodeType[] = [
  "CABINET",
  "DRAWER",
  "SHELF",
  "CONTAINER",
  "ROW",
  "COLUMN",
];

function normalizeCode(value: string | null | undefined) {
  return (value || "").trim();
}

async function backfillStructuralCodes() {
  const locations = await prisma.locationNode.findMany({
    where: {
      kind: { in: STRUCTURAL_KINDS },
    },
    orderBy: [{ workspaceId: "asc" }, { parentId: "asc" }, { kind: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      workspaceId: true,
      parentId: true,
      kind: true,
      code: true,
      sortOrder: true,
      createdAt: true,
    },
  });

  const grouped = new Map<string, typeof locations>();
  for (const location of locations) {
    const key = `${location.workspaceId}::${location.parentId ?? "ROOT"}::${location.kind}`;
    const group = grouped.get(key);
    if (group) {
      group.push(location);
    } else {
      grouped.set(key, [location]);
    }
  }

  for (const group of grouped.values()) {
    const usedNumbers = new Set<number>();

    for (const location of group) {
      const normalized = normalizeCode(location.code);
      if (/^\d+$/.test(normalized)) {
        usedNumbers.add(Number.parseInt(normalized, 10));
      }
    }

    let nextNumber = 1;
    for (const location of group) {
      const normalized = normalizeCode(location.code);
      if (/^\d+$/.test(normalized)) {
        continue;
      }

      while (usedNumbers.has(nextNumber)) {
        nextNumber += 1;
      }

      await prisma.locationNode.update({
        where: { id: location.id },
        data: { code: String(nextNumber) },
      });

      usedNumbers.add(nextNumber);
      nextNumber += 1;
    }
  }
}

backfillStructuralCodes()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
