import type { PrismaClient, Workspace } from "@prisma/client";

const ASSET_CODE_PREFIX = "AS";
const LOCATION_CODE_PREFIX = "LC";
const SYSTEM_CODE_PREFIX = "MA";
const SYSTEM_SEQUENCE_WIDTH = 6;

function normalizeCodeSource(value: string | null | undefined) {
  return (value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function toSystemSequence(value: number) {
  return String(value).padStart(SYSTEM_SEQUENCE_WIDTH, "0");
}

function collectWorkspaceCodeCandidates(workspace: Pick<Workspace, "slug" | "name">) {
  const source = normalizeCodeSource(workspace.slug) || normalizeCodeSource(workspace.name) || "WS";
  const chars = Array.from(source);
  const candidates: string[] = [];

  function pushCandidate(raw: string) {
    const normalized = normalizeCodeSource(raw).slice(0, 2).padEnd(2, "X");
    if (!candidates.includes(normalized)) {
      candidates.push(normalized);
    }
  }

  pushCandidate(source.slice(0, 2));

  if (chars.length >= 2) {
    pushCandidate(`${chars[0]}${chars.at(-1) ?? "X"}`);
  }

  for (let leftIndex = 0; leftIndex < chars.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < chars.length; rightIndex += 1) {
      pushCandidate(`${chars[leftIndex]}${chars[rightIndex]}`);
    }
  }

  const fallbackAlphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const first = chars[0] ?? "W";
  for (const char of fallbackAlphabet) {
    pushCandidate(`${first}${char}`);
  }

  return candidates;
}

export function parseAssetCodeSequence(assetCode: string | null | undefined) {
  const normalized = (assetCode || "").trim().toUpperCase();
  const modernMatch = normalized.match(/^MA[A-Z0-9]{2}AS(\d+)$/);
  if (modernMatch) {
    return Number.parseInt(modernMatch[1] ?? "", 10) || 0;
  }

  const legacyMatch = normalized.match(/^AST-(\d+)$/);
  if (legacyMatch) {
    return Number.parseInt(legacyMatch[1] ?? "", 10) || 0;
  }

  return 0;
}

export function parseLocationCodeSequence(locationCode: string | null | undefined) {
  const normalized = (locationCode || "").trim().toUpperCase();
  const modernMatch = normalized.match(/^MA[A-Z0-9]{2}LC(\d+)$/);
  if (!modernMatch) {
    return 0;
  }

  return Number.parseInt(modernMatch[1] ?? "", 10) || 0;
}

export function buildAssetCode(workspaceCode: string, sequence: number) {
  return `${SYSTEM_CODE_PREFIX}${workspaceCode}${ASSET_CODE_PREFIX}${toSystemSequence(sequence)}`;
}

export function buildLocationCode(workspaceCode: string, sequence: number) {
  return `${SYSTEM_CODE_PREFIX}${workspaceCode}${LOCATION_CODE_PREFIX}${toSystemSequence(sequence)}`;
}

export async function ensureWorkspaceCode(
  prisma: PrismaClient,
  workspaceId: string,
  preloadedWorkspace?: Pick<Workspace, "id" | "slug" | "name" | "workspaceCode">,
) {
  const workspace =
    preloadedWorkspace ??
    (await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, slug: true, name: true, workspaceCode: true },
    }));

  if (!workspace) {
    throw new Error("Workspace not found.");
  }

  if (workspace.workspaceCode) {
    return workspace.workspaceCode;
  }

  const takenCodes = new Set(
    (
      await prisma.workspace.findMany({
        where: { workspaceCode: { not: null }, id: { not: workspace.id } },
        select: { workspaceCode: true },
      })
    )
      .map((item) => item.workspaceCode)
      .filter((value): value is string => Boolean(value)),
  );

  const nextWorkspaceCode =
    collectWorkspaceCodeCandidates(workspace).find((candidate) => !takenCodes.has(candidate)) ?? "WX";

  await prisma.workspace.update({
    where: { id: workspace.id },
    data: { workspaceCode: nextWorkspaceCode },
  });

  return nextWorkspaceCode;
}

export async function generateNextAssetCode(prisma: PrismaClient, workspaceId: string) {
  const workspaceCode = await ensureWorkspaceCode(prisma, workspaceId);
  const existingCodes = await prisma.asset.findMany({
    where: { workspaceId },
    select: { assetCode: true },
  });

  const highestSequence = existingCodes.reduce(
    (highest, asset) => Math.max(highest, parseAssetCodeSequence(asset.assetCode)),
    0,
  );

  return buildAssetCode(workspaceCode, highestSequence + 1);
}

export async function generateNextLocationCode(prisma: PrismaClient, workspaceId: string) {
  const workspaceCode = await ensureWorkspaceCode(prisma, workspaceId);
  const existingCodes = await prisma.locationNode.findMany({
    where: { workspaceId, locationCode: { not: null } },
    select: { locationCode: true },
  });

  const highestSequence = existingCodes.reduce(
    (highest, location) => Math.max(highest, parseLocationCodeSequence(location.locationCode)),
    0,
  );

  return buildLocationCode(workspaceCode, highestSequence + 1);
}
