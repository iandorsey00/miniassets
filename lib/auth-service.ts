import crypto from "node:crypto";

import Database from "better-sqlite3";
import { type AccentColor, type Locale, type ThemePreference } from "@prisma/client";
import { cookies } from "next/headers";
import { cache } from "react";

import {
  AUTH_APP_ID,
  AUTH_COOKIE_NAMES,
  AUTH_ROUTES,
  AUTH_SHARED_COOKIE_DOMAIN,
  MINI_AUTH_LOGIN_REDIRECT_ENABLED,
  MINI_AUTH_WORKSPACE_SYNC_ENABLED,
} from "@/lib/auth-config";
import { ACCENT_COOKIE, LOCALE_COOKIE, THEME_COOKIE } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { resolveSqliteFilePath } from "@/lib/database-url";

const SHARED_AUTH_PASSWORD_PLACEHOLDER = "__MINIAUTH_MANAGED__";
const DEFAULT_MINIAUTH_DATABASE_URL = "file:/srv/miniauth/data/miniauth.db";

type UserPreferenceSnapshot = {
  locale: Locale;
  themePreference: ThemePreference;
  accentColor: AccentColor;
};

type MiniAuthIdentity = UserPreferenceSnapshot & {
  authUserId: string;
  email: string;
  displayName: string;
};

type SharedWorkspaceSnapshot = {
  authWorkspaceId: string;
  slug: string;
  name: string;
  description: string | null;
  isArchived: number;
  membershipRole: "ADMIN" | "MEMBER" | null;
};

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function toLocale(value: string | null | undefined): Locale {
  return value === "EN" ? "EN" : "ZH_CN";
}

function toTheme(value: string | null | undefined): ThemePreference {
  return value === "LIGHT" || value === "DARK" ? value : "SYSTEM";
}

function toAccent(value: string | null | undefined): AccentColor {
  switch (value) {
    case "CYAN":
    case "TEAL":
    case "GREEN":
    case "LIME":
    case "YELLOW":
    case "ORANGE":
    case "RED":
    case "PINK":
    case "PURPLE":
      return value;
    default:
      return "BLUE";
  }
}

function toWorkspaceRole(value: string | null | undefined) {
  return value === "ADMIN" ? "ADMIN" : "MEMBER";
}

function getMiniAuthDatabaseUrl() {
  return process.env.MINIAUTH_DATABASE_URL || DEFAULT_MINIAUTH_DATABASE_URL;
}

function getMiniAuthSessionCookieName() {
  return process.env.MINIAUTH_SESSION_COOKIE_NAME || "miniauth_session";
}

function getMiniAuthDb() {
  const filePath = resolveSqliteFilePath(getMiniAuthDatabaseUrl());
  return new Database(filePath, { readonly: true, fileMustExist: true });
}

function queryAll<Row>(db: InstanceType<typeof Database>, sql: string, ...params: unknown[]) {
  return (db.prepare(sql) as unknown as { all: (...values: unknown[]) => Row[] }).all(...params);
}

export async function applyUserPreferenceCookies(preferences: UserPreferenceSnapshot) {
  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, preferences.locale, { path: "/" });
  cookieStore.set(THEME_COOKIE, preferences.themePreference, { path: "/" });
  cookieStore.set(ACCENT_COOKIE, preferences.accentColor, { path: "/" });
}

async function syncSharedWorkspaceAccess(localUser: {
  id: string;
  authUserId: string;
  role: string;
}) {
  if (!MINI_AUTH_WORKSPACE_SYNC_ENABLED) {
    return;
  }

  try {
    const db = getMiniAuthDb();
    try {
      const workspaceRows = queryAll<SharedWorkspaceSnapshot>(
        db,
        localUser.role === "ADMIN"
          ? `
              SELECT
                w.id AS authWorkspaceId,
                w.slug AS slug,
                w.name AS name,
                w.description AS description,
                w.isArchived AS isArchived,
                NULL AS membershipRole
              FROM "Workspace" w
              ORDER BY w.name ASC
            `
          : `
              SELECT
                w.id AS authWorkspaceId,
                w.slug AS slug,
                w.name AS name,
                w.description AS description,
                w.isArchived AS isArchived,
                m.role AS membershipRole
              FROM "WorkspaceMembership" m
              JOIN "Workspace" w ON w.id = m.workspaceId
              WHERE m.userId = ?
              ORDER BY w.name ASC
            `,
        ...(localUser.role === "ADMIN" ? [] : [localUser.authUserId]),
      );

      if (!workspaceRows.length) {
        await prisma.workspaceMembership.deleteMany({ where: { userId: localUser.id } });
        return;
      }

      const authWorkspaceIds = workspaceRows.map((row) => row.authWorkspaceId);
      const slugs = workspaceRows.map((row) => row.slug);
      const existing = await prisma.workspace.findMany({
        where: {
          OR: [{ authWorkspaceId: { in: authWorkspaceIds } }, { slug: { in: slugs } }],
        },
        select: { id: true, authWorkspaceId: true, slug: true },
      });

      const localWorkspaceIdByAuthId = new Map<string, string>();

      for (const row of workspaceRows) {
        const found =
          existing.find((item) => item.authWorkspaceId === row.authWorkspaceId) ??
          existing.find((item) => item.slug === row.slug) ??
          null;

        if (found) {
          const updated = await prisma.workspace.update({
            where: { id: found.id },
            data: {
              authWorkspaceId: row.authWorkspaceId,
              slug: row.slug,
              name: row.name,
              description: row.description,
              isArchived: Boolean(row.isArchived),
            },
            select: { id: true },
          });
          localWorkspaceIdByAuthId.set(row.authWorkspaceId, updated.id);
          continue;
        }

        const created = await prisma.workspace.create({
          data: {
            authWorkspaceId: row.authWorkspaceId,
            slug: row.slug,
            name: row.name,
            description: row.description,
            isArchived: Boolean(row.isArchived),
          },
          select: { id: true },
        });
        localWorkspaceIdByAuthId.set(row.authWorkspaceId, created.id);
      }

      await prisma.workspaceMembership.deleteMany({
        where: {
          userId: localUser.id,
          workspace: {
            is: {
              authWorkspaceId: {
                notIn: authWorkspaceIds,
              },
            },
          },
        },
      });

      for (const membership of workspaceRows) {
        const workspaceId = localWorkspaceIdByAuthId.get(membership.authWorkspaceId);
        if (!workspaceId) {
          continue;
        }

        await prisma.workspaceMembership.upsert({
          where: {
            userId_workspaceId: {
              userId: localUser.id,
              workspaceId,
            },
          },
          update: {
            role: toWorkspaceRole(membership.membershipRole),
          },
          create: {
            userId: localUser.id,
            workspaceId,
            role: toWorkspaceRole(membership.membershipRole),
          },
        });
      }
    } finally {
      db.close();
    }
  } catch (error) {
    console.error("Failed to sync MiniAuth workspaces into MiniAssets", error);
  }
}

export async function revokeMiniAuthSession() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(getMiniAuthSessionCookieName())?.value;

  if (!rawToken) {
    return;
  }

  try {
    const db = getMiniAuthDb();
    try {
      db.prepare('UPDATE "Session" SET "revokedAt" = CURRENT_TIMESTAMP WHERE "tokenHash" = ? AND "revokedAt" IS NULL').run(
        sha256(rawToken),
      );
    } finally {
      db.close();
    }
  } catch (error) {
    console.error("Failed to revoke MiniAuth session from MiniAssets", error);
  }

  cookieStore.delete(getMiniAuthSessionCookieName());
}

export const getMiniAuthIdentity = cache(async (): Promise<MiniAuthIdentity | null> => {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(getMiniAuthSessionCookieName())?.value;

  if (!rawToken) {
    return null;
  }

  try {
    const db = getMiniAuthDb();
    try {
      const row = db
        .prepare(
          `
            SELECT
              u.id AS authUserId,
              u.email AS email,
              u.displayName AS displayName,
              u.locale AS locale,
              u.themePreference AS themePreference,
              u.accentColor AS accentColor,
              u.isActive AS isActive,
              s.revokedAt AS revokedAt,
              s.expiresAt AS expiresAt
            FROM "Session" s
            JOIN "User" u ON u.id = s.userId
            JOIN "AppAccess" a ON a.userId = u.id
            WHERE s.tokenHash = ?
              AND a.appKey = ?
              AND a.state = 'ACTIVE'
            LIMIT 1
          `,
        )
        .get(sha256(rawToken), AUTH_APP_ID) as
        | {
            authUserId: string;
            email: string;
            displayName: string;
            locale: string;
            themePreference: string;
            accentColor: string;
            isActive: number;
            revokedAt: string | null;
            expiresAt: string;
          }
        | undefined;

      if (!row || row.revokedAt || !row.isActive || new Date(row.expiresAt) < new Date()) {
        return null;
      }

      return {
        authUserId: row.authUserId,
        email: row.email.toLowerCase(),
        displayName: row.displayName,
        locale: toLocale(row.locale),
        themePreference: toTheme(row.themePreference),
        accentColor: toAccent(row.accentColor),
      };
    } finally {
      db.close();
    }
  } catch (error) {
    console.error("Failed to resolve MiniAuth identity from MiniAssets", error);
    return null;
  }
});

export const getAuthenticatedUserId = cache(async () => {
  const miniAuthIdentity = await getMiniAuthIdentity();
  if (!miniAuthIdentity) {
    return null;
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ authUserId: miniAuthIdentity.authUserId }, { email: miniAuthIdentity.email }],
    },
    select: {
      id: true,
      authUserId: true,
      email: true,
      displayName: true,
      role: true,
      isActive: true,
      locale: true,
      themePreference: true,
      accentColor: true,
    },
  });

  const localUser =
    existingUser ??
    (await prisma.user.create({
      data: {
        authUserId: miniAuthIdentity.authUserId,
        email: miniAuthIdentity.email,
        displayName: miniAuthIdentity.displayName,
        passwordHash: SHARED_AUTH_PASSWORD_PLACEHOLDER,
        locale: miniAuthIdentity.locale,
        themePreference: miniAuthIdentity.themePreference,
        accentColor: miniAuthIdentity.accentColor,
        isActive: true,
      },
      select: {
        id: true,
        authUserId: true,
        email: true,
        displayName: true,
        role: true,
        isActive: true,
        locale: true,
        themePreference: true,
        accentColor: true,
      },
    }));

  if (
    localUser.authUserId !== miniAuthIdentity.authUserId ||
    localUser.email !== miniAuthIdentity.email ||
    localUser.displayName !== miniAuthIdentity.displayName ||
    !localUser.isActive ||
    localUser.locale !== miniAuthIdentity.locale ||
    localUser.themePreference !== miniAuthIdentity.themePreference ||
    localUser.accentColor !== miniAuthIdentity.accentColor
  ) {
    await prisma.user.update({
      where: { id: localUser.id },
      data: {
        authUserId: miniAuthIdentity.authUserId,
        email: miniAuthIdentity.email,
        displayName: miniAuthIdentity.displayName,
        isActive: true,
        locale: miniAuthIdentity.locale,
        themePreference: miniAuthIdentity.themePreference,
        accentColor: miniAuthIdentity.accentColor,
      },
    });
  }

  await syncSharedWorkspaceAccess({
    id: localUser.id,
    authUserId: miniAuthIdentity.authUserId,
    role: localUser.role,
  });

  return localUser.id;
});

export function getMiniAuthLoginUrl(currentPath?: string) {
  const baseUrl = process.env.MINIAUTH_BASE_URL?.trim();
  if (!baseUrl || !MINI_AUTH_LOGIN_REDIRECT_ENABLED) {
    return AUTH_ROUTES.login;
  }

  const redirectTarget = currentPath ? `${process.env.APP_URL || ""}${currentPath}` : process.env.APP_URL || "";
  if (!redirectTarget) {
    return `${baseUrl.replace(/\/$/, "")}/login`;
  }

  return `${baseUrl.replace(/\/$/, "")}/login?returnTo=${encodeURIComponent(redirectTarget)}`;
}

export function getMiniAuthLogoutUrl(currentPath?: string) {
  const baseUrl = process.env.MINIAUTH_BASE_URL?.trim();
  if (!baseUrl || !MINI_AUTH_LOGIN_REDIRECT_ENABLED) {
    return null;
  }

  const redirectTarget = currentPath ? `${process.env.APP_URL || ""}${currentPath}` : process.env.APP_URL || "";
  if (!redirectTarget) {
    return `${baseUrl.replace(/\/$/, "")}/logout`;
  }

  return `${baseUrl.replace(/\/$/, "")}/logout?returnTo=${encodeURIComponent(redirectTarget)}`;
}
