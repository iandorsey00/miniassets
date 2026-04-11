import "dotenv/config";

import { prisma } from "../lib/prisma.ts";
import {
  buildAssetCode,
  buildLocationCode,
  ensureWorkspaceCode,
  parseAssetCodeSequence,
} from "../lib/system-codes.ts";

async function backfillWorkspaceCodes() {
  const workspaces = await prisma.workspace.findMany({
    orderBy: [{ createdAt: "asc" }],
    select: { id: true, slug: true, name: true, workspaceCode: true },
  });

  for (const workspace of workspaces) {
    await ensureWorkspaceCode(prisma, workspace.id, workspace);
  }
}

async function backfillLocationCodes() {
  const workspaces = await prisma.workspace.findMany({
    where: { workspaceCode: { not: null } },
    orderBy: [{ createdAt: "asc" }],
    select: { id: true, workspaceCode: true },
  });

  for (const workspace of workspaces) {
    const locations = await prisma.locationNode.findMany({
      where: { workspaceId: workspace.id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true, locationCode: true },
    });

    const updates = locations.flatMap((location, index) => {
      const nextCode = buildLocationCode(workspace.workspaceCode!, index + 1);
      if (location.locationCode === nextCode) {
        return [];
      }

      return [prisma.locationNode.update({
        where: { id: location.id },
        data: { locationCode: nextCode },
      })];
    });

    if (updates.length) {
      await prisma.$transaction(updates);
    }
  }
}

async function backfillAssetCodes() {
  const workspaces = await prisma.workspace.findMany({
    where: { workspaceCode: { not: null } },
    orderBy: [{ createdAt: "asc" }],
    select: { id: true, workspaceCode: true },
  });

  for (const workspace of workspaces) {
    const assets = await prisma.asset.findMany({
      where: { workspaceId: workspace.id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true, assetCode: true },
    });

    const usedSequences = new Set<number>();
    const desiredSequences = new Map<string, number>();

    for (const asset of assets) {
      const parsedSequence = parseAssetCodeSequence(asset.assetCode);
      if (parsedSequence > 0 && !usedSequences.has(parsedSequence)) {
        usedSequences.add(parsedSequence);
        desiredSequences.set(asset.id, parsedSequence);
      }
    }

    let nextSequence = 1;
    for (const asset of assets) {
      if (desiredSequences.has(asset.id)) {
        continue;
      }

      while (usedSequences.has(nextSequence)) {
        nextSequence += 1;
      }

      desiredSequences.set(asset.id, nextSequence);
      usedSequences.add(nextSequence);
      nextSequence += 1;
    }

    const updates = assets.flatMap((asset) => {
      const nextCode = buildAssetCode(workspace.workspaceCode!, desiredSequences.get(asset.id)!);
      if (asset.assetCode === nextCode) {
        return [];
      }

      return [prisma.asset.update({
        where: { id: asset.id },
        data: { assetCode: nextCode },
      })];
    });

    if (updates.length) {
      await prisma.$transaction(updates);
    }
  }
}

async function main() {
  await backfillWorkspaceCodes();
  await backfillLocationCodes();
  await backfillAssetCodes();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
