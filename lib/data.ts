import { type AssetStatus, type PlacementConfidence, Prisma } from "@prisma/client";
import { cookies } from "next/headers";

import { SHARED_PREFERENCE_COOKIE_NAMES } from "@/lib/auth-config";
import { requireUser } from "@/lib/auth";
import {
  ACCENT_COOKIE,
  LOCALE_COOKIE,
  THEME_COOKIE,
  WORKSPACE_COOKIE,
  locationKindLabels,
} from "@/lib/constants";
import { getDictionary } from "@/lib/i18n";
import { formatLocationDescriptor } from "@/lib/location-descriptors";
import { formatAssetLabel, formatColorLabel, formatSizeLabel, pickLocalizedText } from "@/lib/present";
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

function formatLocationSegmentLabel<
  T extends {
    id: string;
    nameEn?: string | null;
    nameZh?: string | null;
    code?: string | null;
    kind?: keyof typeof locationKindLabels | null;
  },
>(node: T, locale: "ZH_CN" | "EN") {
  const localizedName = pickLocalizedText(locale, node);
  if (localizedName) {
    return localizedName;
  }

  const normalizedCode = node.code?.trim() || "";
  if (normalizedCode && node.kind && locationKindLabels[node.kind]) {
    const kindLabel = locationKindLabels[node.kind][locale === "ZH_CN" ? "zh" : "en"];
    return `${kindLabel} ${normalizedCode}`;
  }

  return normalizedCode || node.id;
}

export function buildLocationPath<
  T extends {
    id: string;
    parentId: string | null;
    nameEn?: string | null;
    nameZh?: string | null;
    code?: string | null;
    kind?: keyof typeof locationKindLabels | null;
  },
>(nodes: T[], locationId: string, locale: "ZH_CN" | "EN") {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const segments: string[] = [];
  let current = byId.get(locationId) ?? null;

  while (current) {
    const label = formatLocationSegmentLabel(current, locale);
    if (label) {
      segments.unshift(label);
    }
    current = current.parentId ? byId.get(current.parentId) ?? null : null;
  }

  return segments.join(" > ");
}

function normalizeSuggestionValue(value: string | null | undefined) {
  return value?.trim() || "";
}

function uniqueSorted(values: Array<string | null | undefined>) {
  const normalized = values
    .map(normalizeSuggestionValue)
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right, "en", { sensitivity: "base" }));

  return [...new Set(normalized)];
}

async function getAssetFieldSuggestions(workspaceId: string) {
  const assets = await prisma.asset.findMany({
    where: { workspaceId },
    select: {
      color: true,
      primaryColor: true,
      secondaryColor: true,
      brand: true,
      brandZh: true,
      model: true,
      variant: true,
      variantZh: true,
      subvariant: true,
      subvariantZh: true,
      size: true,
      barcodeSource: true,
    },
  });

  return {
    primaryColors: uniqueSorted(assets.flatMap((asset) => [asset.primaryColor, asset.color])),
    secondaryColors: uniqueSorted(assets.map((asset) => asset.secondaryColor)),
    brands: uniqueSorted(assets.map((asset) => asset.brand)),
    brandsZh: uniqueSorted(assets.map((asset) => asset.brandZh)),
    models: uniqueSorted(assets.map((asset) => asset.model)),
    variants: uniqueSorted(assets.map((asset) => asset.variant)),
    subvariants: uniqueSorted(assets.map((asset) => asset.subvariant)),
    sizes: uniqueSorted(assets.map((asset) => asset.size)),
    barcodeSources: uniqueSorted(assets.map((asset) => asset.barcodeSource)),
  };
}

function buildAssetSearchText(
  asset: {
    assetCode: string;
    nameEn: string | null;
    nameZh: string | null;
    color: string | null;
    primaryColor: string | null;
    secondaryColor: string | null;
    brand: string | null;
    brandZh: string | null;
    model: string | null;
    variant: string | null;
    variantZh: string | null;
    subvariant: string | null;
    subvariantZh: string | null;
    size: string | null;
    lengthValue: number | null;
    lengthUnit: string | null;
    barcodeValue: string | null;
    description: string | null;
    notes: string | null;
    currentLocationId?: string | null;
  },
  locations: Array<{ id: string; parentId: string | null; nameEn: string | null; nameZh: string | null }>,
) {
  return [
    asset.assetCode,
    asset.nameEn,
    asset.nameZh,
    formatColorLabel("EN", asset.primaryColor ?? asset.color),
    formatColorLabel("ZH_CN", asset.primaryColor ?? asset.color),
    formatColorLabel("EN", asset.secondaryColor),
    formatColorLabel("ZH_CN", asset.secondaryColor),
    asset.brandZh,
    formatAssetLabel("EN", asset, { includeModel: true }),
    formatAssetLabel("ZH_CN", asset, { includeModel: true }),
    asset.variantZh,
    asset.subvariantZh,
    formatSizeLabel("EN", asset.size),
    formatSizeLabel("ZH_CN", asset.size),
    asset.lengthValue ? String(asset.lengthValue) : "",
    asset.lengthUnit,
    asset.barcodeValue,
    asset.description,
    asset.notes,
    asset.currentLocationId ? buildLocationPath(locations, asset.currentLocationId, "EN") : "",
    asset.currentLocationId ? buildLocationPath(locations, asset.currentLocationId, "ZH_CN") : "",
  ]
    .filter(Boolean)
    .join(" | ")
    .toLowerCase();
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
  usageState?: "STORAGE" | "IN_USE";
  assorted?: "true";
}) {
  const context = await getViewerContext(filters.workspaceId);
  if (!context.currentWorkspace) {
    return { ...context, assets: [], locations: [] };
  }

  const where: Prisma.AssetWhereInput = {
    workspaceId: context.currentWorkspace.id,
    status: filters.status || undefined,
    usageState: filters.usageState || undefined,
    isAssorted: filters.assorted === "true" ? true : undefined,
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

  const query = filters.q?.trim().toLowerCase();
  const filteredAssets = query
    ? assets.filter((asset) => buildAssetSearchText(asset, locations).includes(query))
    : assets;

  return { ...context, assets: filteredAssets, locations };
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
    return { ...context, asset: null, locations: [], locationPath: "", assetFieldSuggestions: null };
  }

  if (!context.accessibleWorkspaceIds.includes(asset.workspaceId)) {
    return { ...context, asset: null, locations: [], locationPath: "", assetFieldSuggestions: null };
  }

  const [locations, assetFieldSuggestions] = await Promise.all([
    prisma.locationNode.findMany({
      where: { workspaceId: asset.workspaceId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    getAssetFieldSuggestions(asset.workspaceId),
  ]);

  const locationPath =
    asset.currentLocationId && locations.length
      ? buildLocationPath(locations, asset.currentLocationId, context.locale)
      : "";

  return { ...context, asset, locations, locationPath, assetFieldSuggestions };
}

export async function getLocationsData(workspaceId?: string) {
  const context = await getViewerContext(workspaceId);
  if (!context.currentWorkspace) {
    return {
      ...context,
      locations: [],
      assetCounts: new Map<string, number>(),
      assetFieldSuggestions: {
        primaryColors: [],
        secondaryColors: [],
        brands: [],
        brandsZh: [],
        models: [],
        variants: [],
        subvariants: [],
        sizes: [],
        barcodeSources: [],
      },
    };
  }

  const [locations, counts, assetFieldSuggestions] = await Promise.all([
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
    getAssetFieldSuggestions(context.currentWorkspace.id),
  ]);

  return {
    ...context,
    locations,
    assetFieldSuggestions,
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
      primaryColor: asset.primaryColor ?? asset.color,
      secondaryColor: asset.secondaryColor,
      brand: asset.brand,
      brandZh: asset.brandZh,
      model: asset.model,
      variant: asset.variant,
      variantZh: asset.variantZh,
      subvariant: asset.subvariant,
      subvariantZh: asset.subvariantZh,
      size: asset.size,
      description: asset.description,
      barcodeValue: asset.barcodeValue,
      barcodeFormat: asset.barcodeFormat,
      barcodeSource: asset.barcodeSource,
      lengthValue: asset.lengthValue,
      lengthUnit: asset.lengthUnit,
      capacityValue: asset.capacityValue,
      capacityUnit: asset.capacityUnit,
      netWeightValue: asset.netWeightValue,
      netWeightUnit: asset.netWeightUnit,
      quantity: asset.quantity,
      isAssorted: asset.isAssorted,
      trackingMode: asset.trackingMode,
      usageState: asset.usageState,
      isLowStock: asset.isLowStock,
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
