"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getMiniAuthLogoutUrl, requireUser, revokeMiniAuthSession } from "@/lib/auth";
import { WORKSPACE_COOKIE } from "@/lib/constants";
import { getViewerContext } from "@/lib/data";
import { prisma } from "@/lib/prisma";

const createLocationSchema = z.object({
  workspaceId: z.string().min(1),
  parentId: z.string().optional(),
  kind: z.enum([
    "HOUSE",
    "FLOOR",
    "ROOM",
    "AREA",
    "STORAGE",
    "SHELF",
    "DRAWER",
    "BIN",
    "BOX",
    "ROW",
    "COLUMN",
    "POSITION",
  ]),
  code: z.string().trim().max(32).optional(),
  nameEn: z.string().trim().max(80).optional(),
  nameZh: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(500).optional(),
});

const moveLocationSchema = z.object({
  workspaceId: z.string().min(1),
  locationId: z.string().min(1),
  parentId: z.string().optional(),
});

const createAssetSchema = z
  .object({
    workspaceId: z.string().min(1),
    currentLocationId: z.string().optional(),
    assetCode: z.string().trim().min(2).max(32),
    nameEn: z.string().trim().max(120).optional(),
    nameZh: z.string().trim().max(120).optional(),
    brand: z.string().trim().max(80).optional(),
    model: z.string().trim().max(80).optional(),
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
  const user = await requireUser();
  const parsed = createLocationSchema.parse({
    workspaceId: formData.get("workspaceId"),
    parentId: formData.get("parentId") || undefined,
    kind: formData.get("kind"),
    code: formData.get("code") || undefined,
    nameEn: formData.get("nameEn") || undefined,
    nameZh: formData.get("nameZh") || undefined,
    notes: formData.get("notes") || undefined,
  });

  const context = await getViewerContext(parsed.workspaceId);
  if (!context.accessibleWorkspaceIds.includes(parsed.workspaceId)) {
    throw new Error("Workspace access denied.");
  }

  await prisma.locationNode.create({
    data: {
      workspaceId: parsed.workspaceId,
      parentId: parsed.parentId || null,
      kind: parsed.kind,
      code: parsed.code || null,
      nameEn: parsed.nameEn || null,
      nameZh: parsed.nameZh || null,
      notes: parsed.notes || null,
      sortOrder: 0,
    },
  });

  revalidatePath("/locations");
  revalidatePath("/dashboard");
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
    select: { id: true, parentId: true },
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

  await prisma.locationNode.update({
    where: { id: parsed.locationId },
    data: {
      parentId: nextParentId,
    },
  });

  revalidatePath("/locations");
  revalidatePath("/dashboard");
  revalidatePath("/assets");
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
    brand: formData.get("brand") || undefined,
    model: formData.get("model") || undefined,
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

  const asset = await prisma.asset.create({
    data: {
      workspaceId: parsed.workspaceId,
      createdByUserId: user.id,
      currentLocationId: parsed.currentLocationId || null,
      assetCode: parsed.assetCode.toUpperCase(),
      nameEn: parsed.nameEn || null,
      nameZh: parsed.nameZh || null,
      brand: parsed.brand || null,
      model: parsed.model || null,
      description: parsed.description || null,
      barcodeValue: parsed.barcodeValue || null,
      barcodeFormat: parsed.barcodeFormat || null,
      barcodeSource: parsed.barcodeSource || (parsed.barcodeValue ? "manual" : null),
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

  revalidatePath("/assets");
  revalidatePath("/dashboard");
  revalidatePath("/locations");
  redirect(`/assets/${asset.id}`);
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

  revalidatePath(`/assets/${parsed.assetId}`);
  revalidatePath("/assets");
  revalidatePath("/dashboard");
  revalidatePath("/locations");
  redirect(`/assets/${parsed.assetId}`);
}
