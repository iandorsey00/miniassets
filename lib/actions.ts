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
import { getViewerContext } from "@/lib/data";
import { prisma } from "@/lib/prisma";

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

const createAssetSchema = z
  .object({
    workspaceId: z.string().min(1),
    currentLocationId: z.string().optional(),
    assetCode: z.string().trim().min(2).max(32),
    nameEn: z.string().trim().max(120).optional(),
    nameZh: z.string().trim().max(120).optional(),
    primaryColor: z.string().trim().max(80).optional(),
    secondaryColor: z.string().trim().max(80).optional(),
    brand: z.string().trim().max(80).optional(),
    model: z.string().trim().max(80).optional(),
    variant: z.string().trim().max(80).optional(),
    subvariant: z.string().trim().max(80).optional(),
    description: z.string().trim().max(1000).optional(),
    barcodeValue: z.string().trim().max(64).optional(),
    barcodeFormat: z.string().trim().max(32).optional(),
    barcodeSource: z.string().trim().max(64).optional(),
    quantity: z.coerce.number().int().min(1).max(100000),
    trackingMode: z.enum(["INDIVIDUAL", "GROUP"]),
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
    assetCode: z.string().trim().min(2).max(32),
    nameEn: z.string().trim().max(120).optional(),
    nameZh: z.string().trim().max(120).optional(),
    primaryColor: z.string().trim().max(80).optional(),
    secondaryColor: z.string().trim().max(80).optional(),
    brand: z.string().trim().max(80).optional(),
    model: z.string().trim().max(80).optional(),
    variant: z.string().trim().max(80).optional(),
    subvariant: z.string().trim().max(80).optional(),
    description: z.string().trim().max(1000).optional(),
    barcodeValue: z.string().trim().max(64).optional(),
    barcodeFormat: z.string().trim().max(32).optional(),
    barcodeSource: z.string().trim().max(64).optional(),
    quantity: z.coerce.number().int().min(1).max(100000),
    trackingMode: z.enum(["INDIVIDUAL", "GROUP"]),
    sensitivityLevel: z.enum(["LOW", "MEDIUM"]),
    notes: z.string().trim().max(1000).optional(),
  })
  .refine((value) => Boolean(value.nameEn || value.nameZh), {
    message: "At least one of the English or Chinese names is required.",
    path: ["nameEn"],
  });

const moveAssetSchema = z.object({
  assetId: z.string().min(1),
  locationId: z.string().optional(),
  status: z.enum(["ACTIVE", "MISSING", "ARCHIVED"]),
  confidence: z.enum(["VERIFIED", "ASSUMED", "REPORTED"]),
  note: z.string().trim().max(500).optional(),
});

function revalidateWorkspaceViews() {
  revalidatePath("/locations");
  revalidatePath("/dashboard");
  revalidatePath("/assets");
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
    if (!normalizedCode) {
      throw new Error("Cabinet, drawer, row, and column entries require a numeric code.");
    }
    if (!/^\d+$/.test(normalizedCode)) {
      throw new Error("Cabinet, drawer, row, and column codes must be numeric.");
    }
  }
}

function collapseWhitespace(value: string | undefined) {
  return value?.replace(/\s+/g, " ").trim() || "";
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

  await prisma.locationNode.create({
    data: {
      workspaceId: parsed.workspaceId,
      parentId: parsed.parentId || null,
      kind: parsed.kind,
      code: parsed.code || null,
      nameEn: resolvedNames.nameEn,
      nameZh: resolvedNames.nameZh,
      notes: parsed.notes || null,
      sortOrder: 0,
    },
  });

  revalidateWorkspaceViews();
  redirect("/locations");
}

function collectDescendantIds(
  locations: Array<{ id: string; parentId: string | null }>,
  rootId: string,
) {
  const descendants = new Set<string>([rootId]);
  let changed = true;

  while (changed) {
    changed = false;
    for (const location of locations) {
      if (location.parentId && descendants.has(location.parentId) && !descendants.has(location.id)) {
        descendants.add(location.id);
        changed = true;
      }
    }
  }

  return descendants;
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
    const descendants = collectDescendantIds(locations, parsed.locationId);
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

  await prisma.locationNode.update({
    where: { id: parsed.locationId },
    data: {
      parentId: nextParentId,
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

  const allowedChildKinds = getAllowedLocationKinds(parsed.kind);
  const invalidChild = existingLocation.children.find((child) => !allowedChildKinds.includes(child.kind));
  if (invalidChild) {
    throw new Error("That location type would invalidate one or more child locations.");
  }

  await prisma.locationNode.update({
    where: { id: parsed.locationId },
    data: {
      kind: parsed.kind,
      code: parsed.code || null,
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
  redirect("/locations");
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

export async function createAssetAction(formData: FormData) {
  const user = await requireUser();
  const parsed = createAssetSchema.parse({
    workspaceId: formData.get("workspaceId"),
    currentLocationId: formData.get("currentLocationId") || undefined,
    assetCode: formData.get("assetCode"),
    nameEn: formData.get("nameEn") || undefined,
    nameZh: formData.get("nameZh") || undefined,
    primaryColor: formData.get("primaryColor") || undefined,
    secondaryColor: formData.get("secondaryColor") || undefined,
    brand: formData.get("brand") || undefined,
    model: formData.get("model") || undefined,
    variant: formData.get("variant") || undefined,
    subvariant: formData.get("subvariant") || undefined,
    description: formData.get("description") || undefined,
    barcodeValue: formData.get("barcodeValue") || undefined,
    barcodeFormat: formData.get("barcodeFormat") || undefined,
    barcodeSource: formData.get("barcodeSource") || undefined,
    quantity: formData.get("quantity"),
    trackingMode: formData.get("trackingMode"),
    sensitivityLevel: formData.get("sensitivityLevel"),
    notes: formData.get("notes") || undefined,
  });

  const context = await getViewerContext(parsed.workspaceId);
  if (!context.accessibleWorkspaceIds.includes(parsed.workspaceId)) {
    throw new Error("Workspace access denied.");
  }

  const primaryColor = normalizeColorValue(parsed.primaryColor);
  const secondaryColor = normalizeColorValue(parsed.secondaryColor);
  const [brand, model, variant, subvariant, barcodeSource] = await Promise.all([
    canonicalizeWorkspaceValue(parsed.workspaceId, "brand", parsed.brand),
    canonicalizeWorkspaceValue(parsed.workspaceId, "model", parsed.model),
    canonicalizeWorkspaceValue(parsed.workspaceId, "variant", parsed.variant),
    canonicalizeWorkspaceValue(parsed.workspaceId, "subvariant", parsed.subvariant),
    canonicalizeWorkspaceValue(parsed.workspaceId, "barcodeSource", parsed.barcodeSource),
  ]);

  const asset = await prisma.asset.create({
    data: {
      workspaceId: parsed.workspaceId,
      createdByUserId: user.id,
      currentLocationId: parsed.currentLocationId || null,
      assetCode: parsed.assetCode.toUpperCase(),
      nameEn: parsed.nameEn || null,
      nameZh: parsed.nameZh || null,
      color: primaryColor || null,
      primaryColor: primaryColor || null,
      secondaryColor: secondaryColor || null,
      brand: brand || null,
      model: model || null,
      variant: variant || null,
      subvariant: subvariant || null,
      description: parsed.description || null,
      barcodeValue: parsed.barcodeValue || null,
      barcodeFormat: parsed.barcodeFormat || null,
      barcodeSource: barcodeSource || (parsed.barcodeValue ? "manual" : null),
      quantity: parsed.quantity,
      trackingMode: parsed.trackingMode,
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
    assetCode: formData.get("assetCode"),
    nameEn: formData.get("nameEn") || undefined,
    nameZh: formData.get("nameZh") || undefined,
    primaryColor: formData.get("primaryColor") || undefined,
    secondaryColor: formData.get("secondaryColor") || undefined,
    brand: formData.get("brand") || undefined,
    model: formData.get("model") || undefined,
    variant: formData.get("variant") || undefined,
    subvariant: formData.get("subvariant") || undefined,
    description: formData.get("description") || undefined,
    barcodeValue: formData.get("barcodeValue") || undefined,
    barcodeFormat: formData.get("barcodeFormat") || undefined,
    barcodeSource: formData.get("barcodeSource") || undefined,
    quantity: formData.get("quantity"),
    trackingMode: formData.get("trackingMode"),
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
  const [brand, model, variant, subvariant, barcodeSource] = await Promise.all([
    canonicalizeWorkspaceValue(parsed.workspaceId, "brand", parsed.brand),
    canonicalizeWorkspaceValue(parsed.workspaceId, "model", parsed.model),
    canonicalizeWorkspaceValue(parsed.workspaceId, "variant", parsed.variant),
    canonicalizeWorkspaceValue(parsed.workspaceId, "subvariant", parsed.subvariant),
    canonicalizeWorkspaceValue(parsed.workspaceId, "barcodeSource", parsed.barcodeSource),
  ]);

  await prisma.asset.update({
    where: { id: parsed.assetId },
    data: {
      currentLocationId: parsed.currentLocationId || null,
      assetCode: parsed.assetCode.toUpperCase(),
      nameEn: parsed.nameEn || null,
      nameZh: parsed.nameZh || null,
      color: primaryColor || null,
      primaryColor: primaryColor || null,
      secondaryColor: secondaryColor || null,
      brand: brand || null,
      model: model || null,
      variant: variant || null,
      subvariant: subvariant || null,
      description: parsed.description || null,
      barcodeValue: parsed.barcodeValue || null,
      barcodeFormat: parsed.barcodeFormat || null,
      barcodeSource: barcodeSource || (parsed.barcodeValue ? "manual-or-scan" : null),
      quantity: parsed.quantity,
      trackingMode: parsed.trackingMode,
      sensitivityLevel: parsed.sensitivityLevel,
      notes: parsed.notes || null,
    },
  });

  revalidateWorkspaceViews();
  revalidatePath(`/assets/${parsed.assetId}`);
  redirect(`/assets/${parsed.assetId}`);
}

export async function moveAssetAction(formData: FormData) {
  const user = await requireUser();
  const parsed = moveAssetSchema.parse({
    assetId: formData.get("assetId"),
    locationId: formData.get("locationId") || undefined,
    status: formData.get("status"),
    confidence: formData.get("confidence"),
    note: formData.get("note") || undefined,
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
  redirect(`/assets/${parsed.assetId}`);
}
