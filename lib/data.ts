import { type AssetStatus, type PlacementConfidence, Prisma } from "@prisma/client";
import { cookies } from "next/headers";

import { SHARED_PREFERENCE_COOKIE_NAMES } from "@/lib/auth-config";
import { requireUser } from "@/lib/auth";
import { ACCENT_COOKIE, LOCALE_COOKIE, THEME_COOKIE, WORKSPACE_COOKIE } from "@/lib/constants";
import { getDictionary } from "@/lib/i18n";
import { formatLocationDescriptor } from "@/lib/location-descriptors";
import { pickLocalizedText } from "@/lib/present";
import { prisma } from "@/lib/prisma";

export async function getPreferencesForLayout() {
  const user = await requireUser();
  const cookieStore = await cookies();
  const sharedLocale = cookieStore.get(SHARED_PREFERENCE_COOKIE_NAMES.locale)?.value;
  const sharedTheme = cookieStore.get(SHARED_PREFERENCE_COOKIE_NAMES.theme)?.value;
  const sharedAccent = cookieStore.get(SHARED_PREFERENCE_COOKIE_NAMES.accent)?.value;

  return {
    locale:
      user.locale ??
      ((sharedLocale?.toUpperCase() as "ZH_CN" | "EN" | undefined) ??
        (cookieStore.get(LOCALE_COOKIE)?.value as "ZH_CN" | "EN" | undefined) ??
        "ZH_CN"),
    themePreference:
      user.themePreference ??
      ((sharedTheme?.toUpperCase() as "SYSTEM" | "LIGHT" | "DARK" | undefined) ??
        (cookieStore.get(THEME_COOKIE)?.value as "SYSTEM" | "LIGHT" | "DARK" | undefined) ??
        "SYSTEM"),
    accentColor:
      user.accentColor ??
      ((sharedAccent?.toUpperCase() as
        | "BLUE"
        | "CYAN"
        | "TEAL"
        | "GREEN"
        | "LIME"
        | "YELLOW"
        | "ORANGE"
        | "RED"
        | "PINK"
        | "PURPLE"
        | undefined) ??
        (cookieStore.get(ACCENT_COOKIE)?.value as
          | "BLUE"
          | "CYAN"
          | "TEAL"
          | "GREEN"
          | "LIME"
          | "YELLOW"
          | "ORANGE"
          | "RED"
          | "PINK"
          | "PURPLE"
          | undefined) ??
        "BLUE"),
  };
}

export async function getViewerContext(requestedWorkspaceId?: string) {
  const user = await requireUser();
  const cookieStore = await cookies();

  const memberships =
    user.role === "ADMIN"
      ? (
          await prisma.workspace.findMany({
            where: { isArchived: false },
            orderBy: { name: "asc" },
          })
        ).map((workspace) => ({
          id: `admin-${workspace.id}`,
          userId: user.id,
          workspaceId: workspace.id,
          role: "ADMIN" as const,
          createdAt: new Date(),
          workspace,
        }))
      : user.memberships.filter((membership) => !membership.workspace.isArchived);

  const preferredWorkspaceId = requestedWorkspaceId ?? cookieStore.get(WORKSPACE_COOKIE)?.value;
  const currentWorkspace =
    memberships.find((membership) => membership.workspaceId === preferredWorkspaceId)?.workspace ??
    memberships[0]?.workspace ??
    null;

  return {
    user,
    memberships,
    currentWorkspace,
    locale: user.locale,
    localeCode: user.locale === "ZH_CN" ? "zh-CN" : "en",
    dictionary: getDictionary(user.locale),
    accessibleWorkspaceIds: memberships.map((membership) => membership.workspaceId),
  };
}

export function buildLocationPath<
  T extends { id: string; parentId: string | null; nameEn: string | null; nameZh: string | null }
>(nodes: T[], locationId: string, locale: "ZH_CN" | "EN") {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const segments: string[] = [];
  let current = byId.get(locationId) ?? null;

  while (current) {
    const label = pickLocalizedText(locale, current);
    if (label) {
      segments.unshift(label);
    }
    current = current.parentId ? byId.get(current.parentId) ?? null : null;
  }

  return segments.join(" > ");
}

export async function getDashboardData(workspaceId?: string) {
  const context = await getViewerContext(workspaceId);
  if (!context.currentWorkspace) {
    return { ...context, stats: null, recentMoves: [], assets: [] };
  }

  const [assetCount, locationCount, missingCount, recentlyVerifiedCount, recentMoves, assets] =
    await Promise.all([
      prisma.asset.count({
        where: { workspaceId: context.currentWorkspace.id, status: { not: "ARCHIVED" } },
      }),
      prisma.locationNode.count({
        where: { workspaceId: context.currentWorkspace.id },
      }),
      prisma.asset.count({
        where: { workspaceId: context.currentWorkspace.id, status: "MISSING" },
      }),
      prisma.asset.count({
        where: {
          workspaceId: context.currentWorkspace.id,
          lastVerifiedAt: {
            gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
          },
        },
      }),
      prisma.assetPlacement.findMany({
        where: { asset: { workspaceId: context.currentWorkspace.id } },
        include: {
          asset: true,
          location: true,
          movedBy: true,
        },
        orderBy: { movedAt: "desc" },
        take: 8,
      }),
      prisma.asset.findMany({
        where: { workspaceId: context.currentWorkspace.id },
        include: {
          currentLocation: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 6,
      }),
    ]);

  return {
    ...context,
    stats: {
      assetCount,
      locationCount,
      missingCount,
      recentlyVerifiedCount,
    },
    recentMoves,
    assets,
  };
}

export async function getAssetsData(filters: {
  workspaceId?: string;
  q?: string;
  status?: AssetStatus;
}) {
  const context = await getViewerContext(filters.workspaceId);
  if (!context.currentWorkspace) {
    return { ...context, assets: [], locations: [] };
  }

  const where: Prisma.AssetWhereInput = {
    workspaceId: context.currentWorkspace.id,
    status: filters.status || undefined,
    OR: filters.q
      ? [
          { assetCode: { contains: filters.q } },
          { nameEn: { contains: filters.q } },
          { nameZh: { contains: filters.q } },
          { barcodeValue: { contains: filters.q } },
          { brand: { contains: filters.q } },
          { model: { contains: filters.q } },
        ]
      : undefined,
  };

  const [assets, locations] = await Promise.all([
    prisma.asset.findMany({
      where,
      include: {
        currentLocation: true,
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    }),
    prisma.locationNode.findMany({
      where: { workspaceId: context.currentWorkspace.id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  return { ...context, assets, locations };
}

export async function getAssetDetail(assetId: string) {
  const context = await getViewerContext();
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    include: {
      workspace: true,
      currentLocation: true,
      createdBy: true,
      placements: {
        include: {
          location: true,
          movedBy: true,
        },
        orderBy: { movedAt: "desc" },
      },
    },
  });

  if (!asset) {
    return { ...context, asset: null, locations: [], locationPath: "" };
  }

  if (!context.accessibleWorkspaceIds.includes(asset.workspaceId)) {
    return { ...context, asset: null, locations: [], locationPath: "" };
  }

  const locations = await prisma.locationNode.findMany({
    where: { workspaceId: asset.workspaceId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const locationPath =
    asset.currentLocationId && locations.length
      ? buildLocationPath(locations, asset.currentLocationId, context.locale)
      : "";

  return { ...context, asset, locations, locationPath };
}

export async function getLocationsData(workspaceId?: string) {
  const context = await getViewerContext(workspaceId);
  if (!context.currentWorkspace) {
    return { ...context, locations: [], assetCounts: new Map<string, number>() };
  }

  const [locations, counts] = await Promise.all([
    prisma.locationNode.findMany({
      where: { workspaceId: context.currentWorkspace.id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        descriptors: {
          include: {
            referenceLocation: {
              select: {
                id: true,
                code: true,
                nameEn: true,
                nameZh: true,
              },
            },
          },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
      },
    }),
    prisma.asset.groupBy({
      by: ["currentLocationId"],
      where: {
        workspaceId: context.currentWorkspace.id,
        currentLocationId: { not: null },
        status: { not: "ARCHIVED" },
      },
      _count: { _all: true },
    }),
  ]);

  return {
    ...context,
    locations,
    assetCounts: new Map(
      counts
        .filter((item) => item.currentLocationId)
        .map((item) => [item.currentLocationId as string, item._count._all]),
    ),
  };
}

export async function exportWorkspaceData(workspaceId?: string) {
  const context = await getViewerContext(workspaceId);
  if (!context.currentWorkspace) {
    return null;
  }

  const [locations, assets] = await Promise.all([
    prisma.locationNode.findMany({
      where: { workspaceId: context.currentWorkspace.id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        descriptors: {
          include: {
            referenceLocation: {
              select: {
                id: true,
                code: true,
                nameEn: true,
                nameZh: true,
              },
            },
          },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
      },
    }),
    prisma.asset.findMany({
      where: { workspaceId: context.currentWorkspace.id },
      include: {
        currentLocation: true,
        placements: {
          include: {
            location: true,
            movedBy: true,
          },
          orderBy: { movedAt: "desc" },
        },
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    }),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    workspace: {
      id: context.currentWorkspace.id,
      slug: context.currentWorkspace.slug,
      name: context.currentWorkspace.name,
      description: context.currentWorkspace.description,
    },
    policy: {
      intendedSensitivity: ["LOW", "MEDIUM"],
      note:
        "Only low-to-medium secrecy items should be exported. High-sensitivity items should stay out of the system.",
    },
    locations: locations.map((location) => ({
      id: location.id,
      parentId: location.parentId,
      kind: location.kind,
      code: location.code,
      nameEn: location.nameEn,
      nameZh: location.nameZh,
      notes: location.notes,
      standardizedPath: buildLocationPath(locations, location.id, "EN"),
      localizedPath: buildLocationPath(locations, location.id, context.locale),
      descriptors: location.descriptors.map((descriptor) => ({
        type: descriptor.type,
        wall: descriptor.wall,
        ordinal: descriptor.ordinal,
        qualifier: descriptor.qualifier,
        referenceLocationId: descriptor.referenceLocationId,
        referenceLocationPath:
          descriptor.referenceLocationId && locations.length
            ? buildLocationPath(locations, descriptor.referenceLocationId, "EN")
            : null,
        localizedLabel: formatLocationDescriptor(descriptor, context.locale),
        englishLabel: formatLocationDescriptor(descriptor, "EN"),
      })),
    })),
    assets: assets.map((asset) => ({
      id: asset.id,
      assetCode: asset.assetCode,
      nameEn: asset.nameEn,
      nameZh: asset.nameZh,
      color: asset.color,
      brand: asset.brand,
      model: asset.model,
      description: asset.description,
      barcodeValue: asset.barcodeValue,
      barcodeFormat: asset.barcodeFormat,
      barcodeSource: asset.barcodeSource,
      quantity: asset.quantity,
      trackingMode: asset.trackingMode,
      sensitivityLevel: asset.sensitivityLevel,
      status: asset.status,
      currentLocationId: asset.currentLocationId,
      currentLocationPath:
        asset.currentLocationId && locations.length
          ? buildLocationPath(locations, asset.currentLocationId, "EN")
          : null,
      lastVerifiedAt: asset.lastVerifiedAt?.toISOString() ?? null,
      notes: asset.notes,
      placements: asset.placements.map((placement) => ({
        movedAt: placement.movedAt.toISOString(),
        locationId: placement.locationId,
        locationPath:
          placement.locationId && locations.length
            ? buildLocationPath(locations, placement.locationId, "EN")
            : null,
        confidence: placement.confidence,
        note: placement.note,
        movedBy: placement.movedBy.displayName,
      })),
    })),
  };
}

export function movementTone(confidence: PlacementConfidence) {
  if (confidence === "VERIFIED") {
    return "success";
  }
  if (confidence === "ASSUMED") {
    return "warning";
  }
  return "accent";
}
