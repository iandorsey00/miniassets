"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getMiniAuthLogoutUrl, requireUser, revokeMiniAuthSession } from "@/lib/auth";
import {
  getAllowedLocationKinds,
  isLocationKindAllowedUnderParent,
  isNumericCodeLocationKind,
  locationDescriptorTypeValues,
  locationNodeTypeValues,
  positionPresetLabels,
  positionPresetValues,
  wallDirectionValues,
  WORKSPACE_COOKIE,
} from "@/lib/constants";
import { buildAssetSearchText, collectLocationDescendantIds, getViewerContext } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { generateNextAssetCode, generateNextLocationCode } from "@/lib/system-codes";

function optionalPositiveNumber(max: number) {
  return z.preprocess(
    (value) => {
      if (value === "" || value === null || typeof value === "undefined") {
        return undefined;
      }
      return value;
    },
    z.coerce.number().positive().max(max).optional(),
  );
}

const createLocationSchema = z.object({
  workspaceId: z.string().min(1),
  parentId: z.string().optional(),
  kind: z.enum(locationNodeTypeValues),
  code: z.string().trim().max(32).optional(),
  nameEn: z.string().trim().max(80).optional(),
  nameZh: z.string().trim().max(80).optional(),
  positionPreset: z.enum(positionPresetValues).optional(),
  notes: z.string().trim().max(500).optional(),
});

const createNumberedLocationChildrenSchema = z.object({
  workspaceId: z.string().min(1),
  parentId: z.string().min(1),
  kind: z.enum(locationNodeTypeValues),
  count: z.coerce.number().int().min(1).max(9),
});

const moveLocationSchema = z.object({
  workspaceId: z.string().min(1),
  locationId: z.string().min(1),
  parentId: z.string().optional(),
});

const updateLocationSchema = z.object({
  workspaceId: z.string().min(1),
  locationId: z.string().min(1),
  kind: z.enum(locationNodeTypeValues),
  code: z.string().trim().max(32).optional(),
  nameEn: z.string().trim().max(80).optional(),
  nameZh: z.string().trim().max(80).optional(),
  positionPreset: z.enum(positionPresetValues).optional(),
  notes: z.string().trim().max(500).optional(),
});

const addLocationDescriptorSchema = z
  .object({
    workspaceId: z.string().min(1),
    locationId: z.string().min(1),
    type: z.enum(locationDescriptorTypeValues),
    wall: z.enum(wallDirectionValues).optional(),
    ordinal: z.coerce.number().int().min(1).max(99).optional(),
    qualifier: z.string().trim().max(120).optional(),
    referenceLocationId: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.type === "WALL_ZONE") {
      if (!value.wall) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["wall"], message: "Wall is required." });
      }
      if (!value.ordinal) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["ordinal"], message: "Ordinal is required." });
      }
    }

    if (value.type === "FRONT_OF_ZONE") {
      if (!value.referenceLocationId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["referenceLocationId"],
          message: "Reference zone is required.",
        });
      }
    }
  });

const deleteLocationDescriptorSchema = z.object({
  workspaceId: z.string().min(1),
  locationId: z.string().min(1),
  descriptorId: z.string().min(1),
});

const deleteLocationSchema = z.object({
  workspaceId: z.string().min(1),
  locationId: z.string().min(1),
});

const createAssetSchema = z
  .object({
    workspaceId: z.string().min(1),
    currentLocationId: z.string().optional(),
    nameEn: z.string().trim().max(120).optional(),
    nameZh: z.string().trim().max(120).optional(),
    primaryColor: z.string().trim().max(80).optional(),
    secondaryColor: z.string().trim().max(80).optional(),
    brand: z.string().trim().max(80).optional(),
    brandZh: z.string().trim().max(80).optional(),
    model: z.string().trim().max(80).optional(),
    variant: z.string().trim().max(80).optional(),
    variantZh: z.string().trim().max(80).optional(),
    subvariant: z.string().trim().max(80).optional(),
    subvariantZh: z.string().trim().max(80).optional(),
    size: z.string().trim().max(40).optional(),
    description: z.string().trim().max(1000).optional(),
    barcodeValue: z.string().trim().max(64).optional(),
    barcodeFormat: z.string().trim().max(32).optional(),
    barcodeSource: z.string().trim().max(64).optional(),
    lengthValue: optionalPositiveNumber(100000),
    lengthUnit: z.enum(["MM", "CM", "M"]).optional(),
    capacityValue: optionalPositiveNumber(100000),
    capacityUnit: z.enum(["ML", "L"]).optional(),
    netWeightValue: optionalPositiveNumber(100000),
    netWeightUnit: z.enum(["G", "KG"]).optional(),
    quantity: z.coerce.number().int().min(1).max(100000),
    isAssorted: z.coerce.boolean().optional(),
    trackingMode: z.enum(["INDIVIDUAL", "GROUP"]),
    usageFrequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "RARE"]).default("WEEKLY"),
    stockStatus: z.enum(["ACTIVE", "BACKUP"]).default("ACTIVE"),
    sizeType: z.enum(["SMALL", "MEDIUM", "BULKY"]).default("MEDIUM"),
    isLowStock: z.coerce.boolean().optional(),
    sensitivityLevel: z.enum(["LOW", "MEDIUM"]),
    notes: z.string().trim().max(1000).optional(),
  })
  .refine((value) => Boolean(value.nameEn || value.nameZh), {
    message: "At least one of the English or Chinese names is required.",
    path: ["nameEn"],
  });

const updateAssetSchema = z
  .object({
    assetId: z.string().min(1),
    workspaceId: z.string().min(1),
    currentLocationId: z.string().optional(),
    nameEn: z.string().trim().max(120).optional(),
    nameZh: z.string().trim().max(120).optional(),
    primaryColor: z.string().trim().max(80).optional(),
    secondaryColor: z.string().trim().max(80).optional(),
    brand: z.string().trim().max(80).optional(),
    brandZh: z.string().trim().max(80).optional(),
    model: z.string().trim().max(80).optional(),
    variant: z.string().trim().max(80).optional(),
    variantZh: z.string().trim().max(80).optional(),
    subvariant: z.string().trim().max(80).optional(),
    subvariantZh: z.string().trim().max(80).optional(),
    size: z.string().trim().max(40).optional(),
    description: z.string().trim().max(1000).optional(),
    barcodeValue: z.string().trim().max(64).optional(),
    barcodeFormat: z.string().trim().max(32).optional(),
    barcodeSource: z.string().trim().max(64).optional(),
    lengthValue: optionalPositiveNumber(100000),
    lengthUnit: z.enum(["MM", "CM", "M"]).optional(),
    capacityValue: optionalPositiveNumber(100000),
    capacityUnit: z.enum(["ML", "L"]).optional(),
    netWeightValue: optionalPositiveNumber(100000),
    netWeightUnit: z.enum(["G", "KG"]).optional(),
    quantity: z.coerce.number().int().min(1).max(100000),
    isAssorted: z.coerce.boolean().optional(),
    trackingMode: z.enum(["INDIVIDUAL", "GROUP"]),
    usageFrequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "RARE"]),
    stockStatus: z.enum(["ACTIVE", "BACKUP"]),
    sizeType: z.enum(["SMALL", "MEDIUM", "BULKY"]),
    isLowStock: z.coerce.boolean().optional(),
    sensitivityLevel: z.enum(["LOW", "MEDIUM"]),
    notes: z.string().trim().max(1000).optional(),
  })
  .refine((value) => Boolean(value.nameEn || value.nameZh), {
    message: "At least one of the English or Chinese names is required.",
    path: ["nameEn"],
  });

const moveAssetSchema = z
  .object({
    assetId: z.string().min(1),
    locationId: z.string().optional(),
    status: z.enum(["ACTIVE", "MISSING", "ARCHIVED"]),
    confidence: z.enum(["VERIFIED", "ASSUMED", "REPORTED"]),
    note: z.string().trim().max(500).optional(),
  })
  .superRefine((value, context) => {
    if (value.status !== "MISSING" && !value.locationId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "An exact location is required unless the asset is marked missing.",
        path: ["locationId"],
      });
    }
  });

const deleteAssetSchema = z.object({
  assetId: z.string().min(1),
});

const duplicateAssetSchema = z.object({
  assetId: z.string().min(1),
});

const bulkUpdateAssetsByLocationSchema = z.object({
  workspaceId: z.string().min(1),
  locationId: z.string().min(1),
  q: z.string().trim().max(200).optional(),
  status: z.enum(["ACTIVE", "MISSING", "ARCHIVED"]).optional(),
  usageStateFilter: z.enum(["STORAGE", "IN_USE"]).optional(),
  assorted: z.enum(["true"]).optional(),
  nextUsageState: z.enum(["STORAGE", "IN_USE", "CLEAR"]),
  confirmBulk: z.literal("on"),
});

const updateSettingsSchema = z.object({
  unrecordedItemsPerThousand: z.coerce.number().int().min(0).max(500),
});

function revalidateWorkspaceViews() {
  revalidatePath("/locations");
  revalidatePath("/dashboard");
  revalidatePath("/assets");
  revalidatePath("/settings");
}

function normalizeLocationCode(value: string | undefined) {
  return value?.trim() || "";
}

function applyPositionPreset(
  locale: "ZH_CN" | "EN",
  kind: (typeof locationNodeTypeValues)[number],
  positionPreset: (typeof positionPresetValues)[number] | undefined,
  nameEn: string | undefined,
  nameZh: string | undefined,
) {
  if (kind !== "POSITION" || !positionPreset || positionPreset === "OTHER") {
    return {
      nameEn: nameEn || null,
      nameZh: nameZh || null,
    };
  }

  return {
    nameEn: positionPresetLabels[positionPreset].en,
    nameZh: positionPresetLabels[positionPreset].zh,
  };
}

function validateLocationKindAndCode(
  parentKind: (typeof locationNodeTypeValues)[number] | null,
  kind: (typeof locationNodeTypeValues)[number],
  code: string | undefined,
) {
  if (!isLocationKindAllowedUnderParent(parentKind, kind)) {
    throw new Error("That location type is not allowed under the selected parent.");
  }

  const normalizedCode = normalizeLocationCode(code);
  if (isNumericCodeLocationKind(kind)) {
    if (normalizedCode && !/^\d+$/.test(normalizedCode)) {
      throw new Error("Cabinet, drawer, row, and column codes must be numeric.");
    }
  }
}

async function generateStructuralLocationCode(args: {
  workspaceId: string;
  parentId: string | null;
  kind: (typeof locationNodeTypeValues)[number];
  existingLocationId?: string;
  preferredCode?: string | null;
}) {
  if (!isNumericCodeLocationKind(args.kind)) {
    return null;
  }

  const normalizedPreferredCode = normalizeLocationCode(args.preferredCode || undefined);
  const siblings = await prisma.locationNode.findMany({
    where: {
      workspaceId: args.workspaceId,
      parentId: args.parentId,
      kind: args.kind,
      id: args.existingLocationId ? { not: args.existingLocationId } : undefined,
    },
    select: { code: true },
  });

  const usedCodes = new Set(
    siblings
      .map((location) => normalizeLocationCode(location.code || undefined))
      .filter((value): value is string => Boolean(value)),
  );

  if (normalizedPreferredCode && /^\d+$/.test(normalizedPreferredCode) && !usedCodes.has(normalizedPreferredCode)) {
    return normalizedPreferredCode;
  }

  const highestCode = Array.from(usedCodes).reduce((highest, code) => {
    const parsed = Number.parseInt(code, 10);
    return Number.isFinite(parsed) ? Math.max(highest, parsed) : highest;
  }, 0);

  return String(highestCode + 1);
}

function collapseWhitespace(value: string | undefined) {
  return value?.replace(/\s+/g, " ").trim() || "";
}

function detectLocalizedScript(value: string | null | undefined) {
  const normalized = collapseWhitespace(value || undefined);
  if (!normalized) {
    return "EN" as const;
  }

  const significantChars = Array.from(normalized).filter((char) => /[\p{L}\p{N}]/u.test(char));
  if (!significantChars.length) {
    return "EN" as const;
  }

  const hanChars = significantChars.filter((char) => /\p{Script=Han}/u.test(char));
  return hanChars.length / significantChars.length >= 0.5 ? ("ZH_CN" as const) : ("EN" as const);
}

function normalizeLocalizedPair(nameEn: string | undefined, nameZh: string | undefined) {
  const normalizedEn = collapseWhitespace(nameEn);
  const normalizedZh = collapseWhitespace(nameZh);

  if (normalizedEn && normalizedZh && normalizedEn === normalizedZh) {
    const detectedLocale = detectLocalizedScript(normalizedEn);
    return {
      nameEn: detectedLocale === "EN" ? normalizedEn : "",
      nameZh: detectedLocale === "ZH_CN" ? normalizedZh : "",
    };
  }

  return {
    nameEn: normalizedEn,
    nameZh: normalizedZh,
  };
}

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function normalizeColorValue(value: string | undefined) {
  const collapsed = collapseWhitespace(value);
  return collapsed ? toTitleCase(collapsed) : "";
}

function normalizeDescriptorValue(value: string | undefined) {
  const collapsed = collapseWhitespace(value);
  return collapsed ? toTitleCase(collapsed) : "";
}

function normalizeSizeValue(value: string | undefined) {
  const collapsed = collapseWhitespace(value);
  if (!collapsed) {
    return "";
  }

  const upper = collapsed.toUpperCase();
  if (["3XS", "2XS", "XS", "S", "M", "L", "XL", "2XL", "3XL"].includes(upper)) {
    return upper;
  }

  if (["ONE_SIZE", "ONE SIZE", "ONESIZE", "均码"].includes(upper) || collapsed === "均码") {
    return "ONE_SIZE";
  }

  return collapsed;
}

function deriveUsageStateFromStockStatus(stockStatus: "ACTIVE" | "BACKUP") {
  return stockStatus === "ACTIVE" ? ("IN_USE" as const) : ("STORAGE" as const);
}

async function canonicalizeWorkspaceValue(
  workspaceId: string,
  field: "brand" | "model" | "variant" | "subvariant" | "barcodeSource",
  value: string | undefined,
) {
  const collapsed = collapseWhitespace(value);
  if (!collapsed) {
    return "";
  }

  const existingValues = await prisma.asset.findMany({
    where: { workspaceId },
    select: {
      brand: true,
      model: true,
      variant: true,
      subvariant: true,
      barcodeSource: true,
    },
  });

  const canonicalMatch = existingValues.find((item) => {
    const current =
      field === "brand"
        ? item.brand
        : field === "model"
          ? item.model
          : field === "variant"
            ? item.variant
            : field === "subvariant"
              ? item.subvariant
              : item.barcodeSource;
    return typeof current === "string" && current.trim().toLowerCase() === collapsed.toLowerCase();
  });

  const canonical =
    field === "brand"
      ? canonicalMatch?.brand
      : field === "model"
        ? canonicalMatch?.model
        : field === "variant"
          ? canonicalMatch?.variant
          : field === "subvariant"
            ? canonicalMatch?.subvariant
            : canonicalMatch?.barcodeSource;
  if (typeof canonical === "string" && canonical.trim()) {
    return canonical.trim();
  }

  if (field === "brand" || field === "variant" || field === "subvariant") {
    return toTitleCase(collapsed);
  }

  return collapsed;
}

export async function switchWorkspaceAction(formData: FormData) {
  const workspaceId = String(formData.get("workspaceId") || "");
  const cookieStore = await cookies();
  cookieStore.set(WORKSPACE_COOKIE, workspaceId, { path: "/" });
  redirect("/dashboard");
}

export async function logoutAction() {
  await revokeMiniAuthSession();
  const logoutUrl = getMiniAuthLogoutUrl("/login");
  if (logoutUrl) {
    redirect(logoutUrl);
  }
  redirect("/login");
}

export async function createLocationAction(formData: FormData) {
  const parsed = createLocationSchema.parse({
    workspaceId: formData.get("workspaceId"),
    parentId: formData.get("parentId") || undefined,
    kind: formData.get("kind"),
    code: formData.get("code") || undefined,
    nameEn: formData.get("nameEn") || undefined,
    nameZh: formData.get("nameZh") || undefined,
    positionPreset: formData.get("positionPreset") || undefined,
    notes: formData.get("notes") || undefined,
  });

  const context = await getViewerContext(parsed.workspaceId);
  if (!context.accessibleWorkspaceIds.includes(parsed.workspaceId)) {
    throw new Error("Workspace access denied.");
  }

  const parent = parsed.parentId
    ? await prisma.locationNode.findUnique({
        where: { id: parsed.parentId },
        select: { id: true, workspaceId: true, kind: true },
      })
    : null;

  if (parsed.parentId && (!parent || parent.workspaceId !== parsed.workspaceId)) {
    throw new Error("Parent location not found.");
  }

  validateLocationKindAndCode(parent?.kind ?? null, parsed.kind, parsed.code);
  const resolvedNames = applyPositionPreset(context.locale, parsed.kind, parsed.positionPreset, parsed.nameEn, parsed.nameZh);
  const structuralCode = await generateStructuralLocationCode({
    workspaceId: parsed.workspaceId,
    parentId: parsed.parentId || null,
    kind: parsed.kind,
    preferredCode: parsed.code,
  });

  await prisma.locationNode.create({
    data: {
      workspaceId: parsed.workspaceId,
      parentId: parsed.parentId || null,
      kind: parsed.kind,
      locationCode: await generateNextLocationCode(prisma, parsed.workspaceId),
      code: structuralCode,
      nameEn: resolvedNames.nameEn,
      nameZh: resolvedNames.nameZh,
      notes: parsed.notes || null,
      sortOrder: 0,
    },
  });

  revalidateWorkspaceViews();
  const nextParams = new URLSearchParams();
  nextParams.set("workspaceId", parsed.workspaceId);
  nextParams.set("saved", "1");

  if (parsed.parentId) {
    nextParams.set("parentId", parsed.parentId);
  }

  nextParams.set("kind", parsed.kind);
  redirect(`/locations?${nextParams.toString()}`);
}

export async function createNumberedLocationChildrenAction(formData: FormData) {
  const parsed = createNumberedLocationChildrenSchema.parse({
    workspaceId: formData.get("workspaceId"),
    parentId: formData.get("parentId"),
    kind: formData.get("kind"),
    count: formData.get("count"),
  });

  const context = await getViewerContext(parsed.workspaceId);
  if (!context.accessibleWorkspaceIds.includes(parsed.workspaceId)) {
    throw new Error("Workspace access denied.");
  }

  const parent = await prisma.locationNode.findUnique({
    where: { id: parsed.parentId },
    select: { id: true, workspaceId: true, kind: true },
  });

  if (!parent || parent.workspaceId !== parsed.workspaceId) {
    throw new Error("Parent location not found.");
  }

  validateLocationKindAndCode(parent.kind, parsed.kind, undefined);
  if (!isNumericCodeLocationKind(parsed.kind)) {
    throw new Error("That location type does not support automatic numbered child creation.");
  }

  for (let index = 0; index < parsed.count; index += 1) {
    const structuralCode = await generateStructuralLocationCode({
      workspaceId: parsed.workspaceId,
      parentId: parsed.parentId,
      kind: parsed.kind,
    });

    await prisma.locationNode.create({
      data: {
        workspaceId: parsed.workspaceId,
        parentId: parsed.parentId,
        kind: parsed.kind,
        locationCode: await generateNextLocationCode(prisma, parsed.workspaceId),
        code: structuralCode,
        sortOrder: 0,
      },
    });
  }

  revalidateWorkspaceViews();
  const nextParams = new URLSearchParams();
  nextParams.set("workspaceId", parsed.workspaceId);
  nextParams.set("saved", "1");
  nextParams.set("parentId", parsed.parentId);
  nextParams.set("kind", parsed.kind);
  redirect(`/locations?${nextParams.toString()}`);
}

export async function moveLocationAction(formData: FormData) {
  const parsed = moveLocationSchema.parse({
    workspaceId: formData.get("workspaceId"),
    locationId: formData.get("locationId"),
    parentId: formData.get("parentId") || undefined,
  });

  const context = await getViewerContext(parsed.workspaceId);
  if (!context.accessibleWorkspaceIds.includes(parsed.workspaceId)) {
    throw new Error("Workspace access denied.");
  }

  const locations = await prisma.locationNode.findMany({
    where: { workspaceId: parsed.workspaceId },
    select: { id: true, parentId: true, kind: true },
  });

  const location = locations.find((item) => item.id === parsed.locationId);
  if (!location) {
    throw new Error("Location not found.");
  }

  const nextParentId = parsed.parentId || null;
  if (nextParentId === parsed.locationId) {
    throw new Error("A location cannot be its own parent.");
  }

  if (nextParentId) {
    const descendants = collectLocationDescendantIds(locations, parsed.locationId);
    if (descendants.has(nextParentId)) {
      throw new Error("A location cannot be moved under itself or one of its descendants.");
    }
  }

  const nextParent = nextParentId ? locations.find((item) => item.id === nextParentId) : null;
  if (nextParentId && !nextParent) {
    throw new Error("Parent location not found.");
  }

  const nextParentKind = nextParent?.kind ?? null;
  if (!isLocationKindAllowedUnderParent(nextParentKind, location.kind)) {
    throw new Error("That location type is not allowed under the selected parent.");
  }

  const nextStructuralCode = await generateStructuralLocationCode({
    workspaceId: parsed.workspaceId,
    parentId: nextParentId,
    kind: location.kind,
    existingLocationId: parsed.locationId,
    preferredCode: null,
  });

  await prisma.locationNode.update({
    where: { id: parsed.locationId },
    data: {
      parentId: nextParentId,
      code: nextStructuralCode,
    },
  });

  revalidateWorkspaceViews();
  redirect("/locations");
}

export async function updateLocationAction(formData: FormData) {
  const parsed = updateLocationSchema.parse({
    workspaceId: formData.get("workspaceId"),
    locationId: formData.get("locationId"),
    kind: formData.get("kind"),
    code: formData.get("code") || undefined,
    nameEn: formData.get("nameEn") || undefined,
    nameZh: formData.get("nameZh") || undefined,
    positionPreset: formData.get("positionPreset") || undefined,
    notes: formData.get("notes") || undefined,
  });

  const context = await getViewerContext(parsed.workspaceId);
  if (!context.accessibleWorkspaceIds.includes(parsed.workspaceId)) {
    throw new Error("Workspace access denied.");
  }

  const existingLocation = await prisma.locationNode.findUnique({
    where: { id: parsed.locationId },
    include: {
      parent: {
        select: { kind: true },
      },
      children: {
        select: { kind: true },
      },
    },
  });

  if (!existingLocation || existingLocation.workspaceId !== parsed.workspaceId) {
    throw new Error("Location not found.");
  }

  validateLocationKindAndCode(existingLocation.parent?.kind ?? null, parsed.kind, parsed.code);
  const resolvedNames = applyPositionPreset(context.locale, parsed.kind, parsed.positionPreset, parsed.nameEn, parsed.nameZh);
  const structuralCode = await generateStructuralLocationCode({
    workspaceId: parsed.workspaceId,
    parentId: existingLocation.parentId,
    kind: parsed.kind,
    existingLocationId: parsed.locationId,
    preferredCode: existingLocation.code,
  });

  const allowedChildKinds = getAllowedLocationKinds(parsed.kind);
  const invalidChild = existingLocation.children.find((child) => !allowedChildKinds.includes(child.kind));
  if (invalidChild) {
    throw new Error("That location type would invalidate one or more child locations.");
  }

  await prisma.locationNode.update({
    where: { id: parsed.locationId },
    data: {
      kind: parsed.kind,
      code: structuralCode,
      nameEn: resolvedNames.nameEn,
      nameZh: resolvedNames.nameZh,
      notes: parsed.notes || null,
    },
  });

  revalidateWorkspaceViews();
  redirect("/locations");
}

export async function addLocationDescriptorAction(formData: FormData) {
  const parsed = addLocationDescriptorSchema.parse({
    workspaceId: formData.get("workspaceId"),
    locationId: formData.get("locationId"),
    type: formData.get("type"),
    wall: formData.get("wall") || undefined,
    ordinal: formData.get("ordinal") || undefined,
    qualifier: formData.get("qualifier") || undefined,
    referenceLocationId: formData.get("referenceLocationId") || undefined,
  });

  const context = await getViewerContext(parsed.workspaceId);
  if (!context.accessibleWorkspaceIds.includes(parsed.workspaceId)) {
    throw new Error("Workspace access denied.");
  }

  const location = await prisma.locationNode.findUnique({
    where: { id: parsed.locationId },
    select: { id: true, workspaceId: true },
  });

  if (!location || location.workspaceId !== parsed.workspaceId) {
    throw new Error("Location not found.");
  }

  if (parsed.type === "FRONT_OF_ZONE" && parsed.referenceLocationId === parsed.locationId) {
    throw new Error("A zone cannot be in front of itself.");
  }

  if (parsed.referenceLocationId) {
    const referenceLocation = await prisma.locationNode.findUnique({
      where: { id: parsed.referenceLocationId },
      select: { id: true, workspaceId: true },
    });

    if (!referenceLocation || referenceLocation.workspaceId !== parsed.workspaceId) {
      throw new Error("Reference zone not found.");
    }
  }

  if (parsed.type === "WALL_ZONE" && parsed.wall) {
    const existingWallDescriptor = await prisma.locationDescriptor.findFirst({
      where: {
        locationId: parsed.locationId,
        wall: parsed.wall,
      },
      select: { id: true },
    });

    if (existingWallDescriptor) {
      throw new Error("A descriptor for that wall already exists on this location.");
    }
  }

  if (parsed.type === "FRONT_OF_ZONE" && parsed.referenceLocationId) {
    const existingFrontDescriptor = await prisma.locationDescriptor.findFirst({
      where: {
        locationId: parsed.locationId,
        referenceLocationId: parsed.referenceLocationId,
      },
      select: { id: true },
    });

    if (existingFrontDescriptor) {
      throw new Error("That in-front-of descriptor already exists on this location.");
    }
  }

  const descriptorCount = await prisma.locationDescriptor.count({
    where: { locationId: parsed.locationId },
  });

  await prisma.locationDescriptor.create({
    data: {
      locationId: parsed.locationId,
      type: parsed.type,
      wall: parsed.type === "WALL_ZONE" ? parsed.wall ?? null : null,
      ordinal: parsed.type === "WALL_ZONE" ? parsed.ordinal ?? null : null,
      qualifier: parsed.qualifier || null,
      referenceLocationId: parsed.type === "FRONT_OF_ZONE" ? parsed.referenceLocationId || null : null,
      sortOrder: descriptorCount,
    },
  });

  revalidateWorkspaceViews();
  const nextParams = new URLSearchParams();
  nextParams.set("workspaceId", parsed.workspaceId);
  nextParams.set("saved", "1");
  nextParams.set("expanded", parsed.locationId);
  nextParams.set("editor", parsed.locationId);
  redirect(`/locations?${nextParams.toString()}`);
}

export async function deleteLocationDescriptorAction(formData: FormData) {
  const parsed = deleteLocationDescriptorSchema.parse({
    workspaceId: formData.get("workspaceId"),
    locationId: formData.get("locationId"),
    descriptorId: formData.get("descriptorId"),
  });

  const context = await getViewerContext(parsed.workspaceId);
  if (!context.accessibleWorkspaceIds.includes(parsed.workspaceId)) {
    throw new Error("Workspace access denied.");
  }

  const descriptor = await prisma.locationDescriptor.findUnique({
    where: { id: parsed.descriptorId },
    include: {
      location: {
        select: { workspaceId: true },
      },
    },
  });

  if (
    !descriptor ||
    descriptor.locationId !== parsed.locationId ||
    descriptor.location.workspaceId !== parsed.workspaceId
  ) {
    throw new Error("Descriptor not found.");
  }

  await prisma.locationDescriptor.delete({
    where: { id: parsed.descriptorId },
  });

  revalidateWorkspaceViews();
  redirect("/locations");
}

export async function deleteLocationAction(formData: FormData) {
  const parsed = deleteLocationSchema.parse({
    workspaceId: formData.get("workspaceId"),
    locationId: formData.get("locationId"),
  });

  const context = await getViewerContext(parsed.workspaceId);
  if (!context.accessibleWorkspaceIds.includes(parsed.workspaceId)) {
    throw new Error("Workspace access denied.");
  }

  const location = await prisma.locationNode.findUnique({
    where: { id: parsed.locationId },
    include: {
      currentAssets: {
        select: { id: true },
        take: 1,
      },
      placements: {
        select: { id: true },
        take: 1,
      },
      children: {
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!location || location.workspaceId !== parsed.workspaceId) {
    throw new Error("Location not found.");
  }

  if (location.children.length) {
    throw new Error("Delete child locations first.");
  }

  if (location.currentAssets.length || location.placements.length) {
    throw new Error("This location still has associated assets or asset history.");
  }

  await prisma.locationNode.delete({
    where: { id: parsed.locationId },
  });

  revalidateWorkspaceViews();
  redirect("/locations");
}

export async function createAssetAction(formData: FormData) {
  const user = await requireUser();
  const parsed = createAssetSchema.parse({
    workspaceId: formData.get("workspaceId"),
    currentLocationId: formData.get("currentLocationId") || undefined,
    nameEn: formData.get("nameEn") || undefined,
    nameZh: formData.get("nameZh") || undefined,
    primaryColor: formData.get("primaryColor") || undefined,
    secondaryColor: formData.get("secondaryColor") || undefined,
    brand: formData.get("brand") || undefined,
    brandZh: formData.get("brandZh") || undefined,
    model: formData.get("model") || undefined,
    variant: formData.get("variant") || undefined,
    variantZh: formData.get("variantZh") || undefined,
    subvariant: formData.get("subvariant") || undefined,
    subvariantZh: formData.get("subvariantZh") || undefined,
    size: formData.get("size") || undefined,
    description: formData.get("description") || undefined,
    barcodeValue: formData.get("barcodeValue") || undefined,
    barcodeFormat: formData.get("barcodeFormat") || undefined,
    barcodeSource: formData.get("barcodeSource") || undefined,
    lengthValue: formData.get("lengthValue") || undefined,
    lengthUnit: formData.get("lengthUnit") || undefined,
    capacityValue: formData.get("capacityValue") || undefined,
    capacityUnit: formData.get("capacityUnit") || undefined,
    netWeightValue: formData.get("netWeightValue") || undefined,
    netWeightUnit: formData.get("netWeightUnit") || undefined,
    quantity: formData.get("quantity"),
    isAssorted: formData.get("isAssorted") || undefined,
    trackingMode: formData.get("trackingMode"),
    usageFrequency: formData.get("usageFrequency") || "WEEKLY",
    stockStatus: formData.get("stockStatus") || "ACTIVE",
    sizeType: formData.get("sizeType") || "MEDIUM",
    isLowStock: formData.get("isLowStock") || undefined,
    sensitivityLevel: formData.get("sensitivityLevel"),
    notes: formData.get("notes") || undefined,
  });

  const context = await getViewerContext(parsed.workspaceId);
  if (!context.accessibleWorkspaceIds.includes(parsed.workspaceId)) {
    throw new Error("Workspace access denied.");
  }

  const primaryColor = normalizeColorValue(parsed.primaryColor);
  const secondaryColor = normalizeColorValue(parsed.secondaryColor);
  const normalizedBrand = normalizeLocalizedPair(parsed.brand, parsed.brandZh);
  const size = normalizeSizeValue(parsed.size);
  const normalizedNames = normalizeLocalizedPair(parsed.nameEn, parsed.nameZh);
  const normalizedVariant = normalizeLocalizedPair(parsed.variant, parsed.variantZh);
  const normalizedSubvariant = normalizeLocalizedPair(parsed.subvariant, parsed.subvariantZh);
  const [assetCode, brand, model, variant, subvariant, barcodeSource] = await Promise.all([
    generateNextAssetCode(prisma, parsed.workspaceId),
    canonicalizeWorkspaceValue(parsed.workspaceId, "brand", normalizedBrand.nameEn),
    canonicalizeWorkspaceValue(parsed.workspaceId, "model", parsed.model),
    canonicalizeWorkspaceValue(parsed.workspaceId, "variant", normalizedVariant.nameEn),
    canonicalizeWorkspaceValue(parsed.workspaceId, "subvariant", normalizedSubvariant.nameEn),
    canonicalizeWorkspaceValue(parsed.workspaceId, "barcodeSource", parsed.barcodeSource),
  ]);

  const asset = await prisma.asset.create({
    data: {
      workspaceId: parsed.workspaceId,
      createdByUserId: user.id,
      currentLocationId: parsed.currentLocationId || null,
      assetCode,
      nameEn: normalizedNames.nameEn || null,
      nameZh: normalizedNames.nameZh || null,
      color: primaryColor || null,
      primaryColor: primaryColor || null,
      secondaryColor: secondaryColor || null,
      brand: brand || null,
      brandZh: normalizedBrand.nameZh || null,
      model: model || null,
      variant: variant || null,
      variantZh: normalizedVariant.nameZh || null,
      subvariant: subvariant || null,
      subvariantZh: normalizedSubvariant.nameZh || null,
      size: size || null,
      description: parsed.description || null,
      barcodeValue: parsed.barcodeValue || null,
      barcodeFormat: parsed.barcodeFormat || null,
      barcodeSource: barcodeSource || (parsed.barcodeValue ? "manual" : null),
      lengthValue: parsed.lengthValue || null,
      lengthUnit: parsed.lengthValue ? parsed.lengthUnit || null : null,
      capacityValue: parsed.capacityValue || null,
      capacityUnit: parsed.capacityValue ? parsed.capacityUnit || null : null,
      netWeightValue: parsed.netWeightValue || null,
      netWeightUnit: parsed.netWeightValue ? parsed.netWeightUnit || null : null,
      quantity: parsed.quantity,
      isAssorted: Boolean(parsed.isAssorted),
      trackingMode: parsed.trackingMode,
      usageFrequency: parsed.usageFrequency,
      stockStatus: parsed.stockStatus,
      sizeType: parsed.sizeType,
      usageState: deriveUsageStateFromStockStatus(parsed.stockStatus),
      isLowStock: Boolean(parsed.isLowStock),
      sensitivityLevel: parsed.sensitivityLevel,
      notes: parsed.notes || null,
      lastVerifiedAt: parsed.currentLocationId ? new Date() : null,
      placements: parsed.currentLocationId
        ? {
            create: {
              movedByUserId: user.id,
              locationId: parsed.currentLocationId,
              confidence: "VERIFIED",
              note: "Initial placement",
            },
          }
        : undefined,
    },
  });

  revalidateWorkspaceViews();
  redirect(`/assets/${asset.id}`);
}

export async function updateAssetAction(formData: FormData) {
  const parsed = updateAssetSchema.parse({
    assetId: formData.get("assetId"),
    workspaceId: formData.get("workspaceId"),
    currentLocationId: formData.get("currentLocationId") || undefined,
    nameEn: formData.get("nameEn") || undefined,
    nameZh: formData.get("nameZh") || undefined,
    primaryColor: formData.get("primaryColor") || undefined,
    secondaryColor: formData.get("secondaryColor") || undefined,
    brand: formData.get("brand") || undefined,
    brandZh: formData.get("brandZh") || undefined,
    model: formData.get("model") || undefined,
    variant: formData.get("variant") || undefined,
    variantZh: formData.get("variantZh") || undefined,
    subvariant: formData.get("subvariant") || undefined,
    subvariantZh: formData.get("subvariantZh") || undefined,
    size: formData.get("size") || undefined,
    description: formData.get("description") || undefined,
    barcodeValue: formData.get("barcodeValue") || undefined,
    barcodeFormat: formData.get("barcodeFormat") || undefined,
    barcodeSource: formData.get("barcodeSource") || undefined,
    lengthValue: formData.get("lengthValue") || undefined,
    lengthUnit: formData.get("lengthUnit") || undefined,
    capacityValue: formData.get("capacityValue") || undefined,
    capacityUnit: formData.get("capacityUnit") || undefined,
    netWeightValue: formData.get("netWeightValue") || undefined,
    netWeightUnit: formData.get("netWeightUnit") || undefined,
    quantity: formData.get("quantity"),
    isAssorted: formData.get("isAssorted") || undefined,
    trackingMode: formData.get("trackingMode"),
    usageFrequency: formData.get("usageFrequency") || "WEEKLY",
    stockStatus: formData.get("stockStatus") || "ACTIVE",
    sizeType: formData.get("sizeType") || "MEDIUM",
    isLowStock: formData.get("isLowStock") || undefined,
    sensitivityLevel: formData.get("sensitivityLevel"),
    notes: formData.get("notes") || undefined,
  });

  const context = await getViewerContext(parsed.workspaceId);
  if (!context.accessibleWorkspaceIds.includes(parsed.workspaceId)) {
    throw new Error("Workspace access denied.");
  }

  const asset = await prisma.asset.findUnique({
    where: { id: parsed.assetId },
    select: { id: true, workspaceId: true },
  });

  if (!asset || asset.workspaceId !== parsed.workspaceId) {
    throw new Error("Asset not found.");
  }

  const primaryColor = normalizeColorValue(parsed.primaryColor);
  const secondaryColor = normalizeColorValue(parsed.secondaryColor);
  const normalizedBrand = normalizeLocalizedPair(parsed.brand, parsed.brandZh);
  const size = normalizeSizeValue(parsed.size);
  const normalizedNames = normalizeLocalizedPair(parsed.nameEn, parsed.nameZh);
  const normalizedVariant = normalizeLocalizedPair(parsed.variant, parsed.variantZh);
  const normalizedSubvariant = normalizeLocalizedPair(parsed.subvariant, parsed.subvariantZh);
  const [brand, model, variant, subvariant, barcodeSource] = await Promise.all([
    canonicalizeWorkspaceValue(parsed.workspaceId, "brand", normalizedBrand.nameEn),
    canonicalizeWorkspaceValue(parsed.workspaceId, "model", parsed.model),
    canonicalizeWorkspaceValue(parsed.workspaceId, "variant", normalizedVariant.nameEn),
    canonicalizeWorkspaceValue(parsed.workspaceId, "subvariant", normalizedSubvariant.nameEn),
    canonicalizeWorkspaceValue(parsed.workspaceId, "barcodeSource", parsed.barcodeSource),
  ]);

  await prisma.asset.update({
    where: { id: parsed.assetId },
    data: {
      currentLocationId: parsed.currentLocationId || null,
      nameEn: normalizedNames.nameEn || null,
      nameZh: normalizedNames.nameZh || null,
      color: primaryColor || null,
      primaryColor: primaryColor || null,
      secondaryColor: secondaryColor || null,
      brand: brand || null,
      brandZh: normalizedBrand.nameZh || null,
      model: model || null,
      variant: variant || null,
      variantZh: normalizedVariant.nameZh || null,
      subvariant: subvariant || null,
      subvariantZh: normalizedSubvariant.nameZh || null,
      size: size || null,
      description: parsed.description || null,
      barcodeValue: parsed.barcodeValue || null,
      barcodeFormat: parsed.barcodeFormat || null,
      barcodeSource: barcodeSource || (parsed.barcodeValue ? "manual-or-scan" : null),
      lengthValue: parsed.lengthValue || null,
      lengthUnit: parsed.lengthValue ? parsed.lengthUnit || null : null,
      capacityValue: parsed.capacityValue || null,
      capacityUnit: parsed.capacityValue ? parsed.capacityUnit || null : null,
      netWeightValue: parsed.netWeightValue || null,
      netWeightUnit: parsed.netWeightValue ? parsed.netWeightUnit || null : null,
      quantity: parsed.quantity,
      isAssorted: Boolean(parsed.isAssorted),
      trackingMode: parsed.trackingMode,
      usageFrequency: parsed.usageFrequency,
      stockStatus: parsed.stockStatus,
      sizeType: parsed.sizeType,
      usageState: deriveUsageStateFromStockStatus(parsed.stockStatus),
      isLowStock: Boolean(parsed.isLowStock),
      sensitivityLevel: parsed.sensitivityLevel,
      notes: parsed.notes || null,
    },
  });

  revalidateWorkspaceViews();
  revalidatePath(`/assets/${parsed.assetId}`);
  redirect(`/assets/${parsed.assetId}?saved=1`);
}

export async function moveAssetAction(formData: FormData) {
  const user = await requireUser();
  const rawAssetId = String(formData.get("assetId") || "").trim();
  const parsedResult = moveAssetSchema.safeParse({
    assetId: formData.get("assetId"),
    locationId: formData.get("locationId") || undefined,
    status: formData.get("status"),
    confidence: formData.get("confidence"),
    note: formData.get("note") || undefined,
  });
  if (!parsedResult.success) {
    if (rawAssetId) {
      redirect(`/assets/${rawAssetId}?moveError=location`);
    }

    throw new Error("Invalid move payload.");
  }
  const parsed = parsedResult.data;

  const asset = await prisma.asset.findUnique({
    where: { id: parsed.assetId },
  });

  if (!asset) {
    throw new Error("Asset not found.");
  }

  const context = await getViewerContext(asset.workspaceId);
  if (!context.accessibleWorkspaceIds.includes(asset.workspaceId)) {
    throw new Error("Workspace access denied.");
  }

  await prisma.asset.update({
    where: { id: parsed.assetId },
    data: {
      currentLocationId: parsed.status === "MISSING" ? null : parsed.locationId || null,
      status: parsed.status,
      lastVerifiedAt: parsed.confidence === "VERIFIED" ? new Date() : asset.lastVerifiedAt,
      placements: {
        create: {
          movedByUserId: user.id,
          locationId: parsed.status === "MISSING" ? null : parsed.locationId || null,
          confidence: parsed.confidence,
          note: parsed.note || null,
        },
      },
    },
  });

  revalidateWorkspaceViews();
  redirect(`/assets/${parsed.assetId}?moved=1`);
}

export async function deleteAssetAction(formData: FormData) {
  const parsed = deleteAssetSchema.parse({
    assetId: formData.get("assetId"),
  });

  const asset = await prisma.asset.findUnique({
    where: { id: parsed.assetId },
    select: { id: true, workspaceId: true },
  });

  if (!asset) {
    throw new Error("Asset not found.");
  }

  const context = await getViewerContext(asset.workspaceId);
  if (!context.accessibleWorkspaceIds.includes(asset.workspaceId)) {
    throw new Error("Workspace access denied.");
  }

  await prisma.asset.delete({
    where: { id: parsed.assetId },
  });

  revalidateWorkspaceViews();
  redirect("/assets");
}

export async function duplicateAssetAction(formData: FormData) {
  const user = await requireUser();
  const parsed = duplicateAssetSchema.parse({
    assetId: formData.get("assetId"),
  });

  const asset = await prisma.asset.findUnique({
    where: { id: parsed.assetId },
  });

  if (!asset) {
    throw new Error("Asset not found.");
  }

  const context = await getViewerContext(asset.workspaceId);
  if (!context.accessibleWorkspaceIds.includes(asset.workspaceId)) {
    throw new Error("Workspace access denied.");
  }

  const nextAssetCode = await generateNextAssetCode(prisma, asset.workspaceId);
  const duplicatedAsset = await prisma.asset.create({
    data: {
      workspaceId: asset.workspaceId,
      createdByUserId: user.id,
      currentLocationId: asset.currentLocationId,
      assetCode: nextAssetCode,
      nameEn: asset.nameEn,
      nameZh: asset.nameZh,
      color: asset.color,
      primaryColor: asset.primaryColor,
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
      usageFrequency: asset.usageFrequency,
      stockStatus: asset.stockStatus,
      sizeType: asset.sizeType,
      usageState: asset.usageState,
      isLowStock: asset.isLowStock,
      sensitivityLevel: asset.sensitivityLevel,
      status: asset.status,
      lastVerifiedAt: asset.currentLocationId ? new Date() : asset.lastVerifiedAt,
      notes: asset.notes,
      placements: asset.currentLocationId
        ? {
            create: {
              movedByUserId: user.id,
              locationId: asset.currentLocationId,
              confidence: "VERIFIED",
              note: `Duplicated from ${asset.assetCode}`,
            },
          }
        : undefined,
    },
  });

  revalidateWorkspaceViews();
  redirect(`/assets/${duplicatedAsset.id}?saved=1`);
}

export async function bulkUpdateAssetsByLocationAction(formData: FormData) {
  const rawValues = {
    workspaceId: formData.get("workspaceId"),
    locationId: formData.get("locationId"),
    q: formData.get("q") || undefined,
    status: formData.get("status") || undefined,
    usageStateFilter: formData.get("usageStateFilter") || undefined,
    assorted: formData.get("assorted") || undefined,
    nextUsageState: formData.get("nextUsageState"),
    confirmBulk: formData.get("confirmBulk"),
  };
  const parsedResult = bulkUpdateAssetsByLocationSchema.safeParse(rawValues);
  if (!parsedResult.success) {
    const nextParams = new URLSearchParams();
    nextParams.set("workspaceId", String(rawValues.workspaceId || ""));
    nextParams.set("locationId", String(rawValues.locationId || ""));
    nextParams.set("bulkError", "confirm");

    if (typeof rawValues.q === "string" && rawValues.q) {
      nextParams.set("q", rawValues.q);
    }

    if (typeof rawValues.status === "string" && rawValues.status) {
      nextParams.set("status", rawValues.status);
    }

    if (typeof rawValues.usageStateFilter === "string" && rawValues.usageStateFilter) {
      nextParams.set("usageState", rawValues.usageStateFilter);
    }

    if (typeof rawValues.assorted === "string" && rawValues.assorted) {
      nextParams.set("assorted", rawValues.assorted);
    }

    redirect(`/assets?${nextParams.toString()}`);
  }
  const parsed = parsedResult.data;

  const context = await getViewerContext(parsed.workspaceId);
  if (!context.accessibleWorkspaceIds.includes(parsed.workspaceId)) {
    throw new Error("Workspace access denied.");
  }

  const locations = await prisma.locationNode.findMany({
    where: { workspaceId: parsed.workspaceId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const selectedLocation = locations.find((location) => location.id === parsed.locationId);
  if (!selectedLocation) {
    throw new Error("Location not found.");
  }

  const scopedLocationIds = Array.from(collectLocationDescendantIds(locations, parsed.locationId));
  const assets = await prisma.asset.findMany({
    where: {
      workspaceId: parsed.workspaceId,
      status: parsed.status || undefined,
      usageState: parsed.usageStateFilter || undefined,
      isAssorted: parsed.assorted === "true" ? true : undefined,
      currentLocationId: { in: scopedLocationIds },
    },
    select: {
      id: true,
      assetCode: true,
      nameEn: true,
      nameZh: true,
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
      usageFrequency: true,
      stockStatus: true,
      sizeType: true,
      lengthValue: true,
      lengthUnit: true,
      barcodeValue: true,
      description: true,
      notes: true,
      currentLocationId: true,
    },
  });

  const query = parsed.q?.trim().toLowerCase();
  const matchingAssetIds = query
    ? assets
        .filter((asset) => buildAssetSearchText(asset, locations).includes(query))
        .map((asset) => asset.id)
    : assets.map((asset) => asset.id);

  if (matchingAssetIds.length) {
    await prisma.asset.updateMany({
      where: { id: { in: matchingAssetIds } },
      data: {
        stockStatus: parsed.nextUsageState === "CLEAR" ? "BACKUP" : parsed.nextUsageState === "IN_USE" ? "ACTIVE" : "BACKUP",
        usageState: parsed.nextUsageState === "CLEAR" ? "STORAGE" : parsed.nextUsageState,
      },
    });
  }

  revalidateWorkspaceViews();

  const nextParams = new URLSearchParams();
  nextParams.set("workspaceId", parsed.workspaceId);
  nextParams.set("locationId", parsed.locationId);
  nextParams.set("bulkUpdated", "1");
  nextParams.set("bulkCount", String(matchingAssetIds.length));

  if (parsed.q) {
    nextParams.set("q", parsed.q);
  }

  if (parsed.status) {
    nextParams.set("status", parsed.status);
  }

  if (parsed.usageStateFilter) {
    nextParams.set("usageState", parsed.usageStateFilter);
  }

  if (parsed.assorted) {
    nextParams.set("assorted", parsed.assorted);
  }

  redirect(`/assets?${nextParams.toString()}`);
}

export async function updateSettingsAction(formData: FormData) {
  const parsed = updateSettingsSchema.parse({
    unrecordedItemsPerThousand: formData.get("unrecordedItemsPerThousand"),
  });

  const user = await requireUser();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      unrecordedItemsPerThousand: parsed.unrecordedItemsPerThousand,
    },
  });

  revalidateWorkspaceViews();
  redirect("/settings?saved=1");
}
