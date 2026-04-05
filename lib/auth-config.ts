export const AUTH_APP_ID = "miniassets";

export const AUTH_ROUTES = {
  login: "/login",
  postLogin: "/dashboard",
} as const;

export const AUTH_COOKIE_NAMES = {
  session: "miniassets_session",
} as const;

export const SHARED_PREFERENCE_COOKIE_NAMES = {
  locale: process.env.SHARED_LOCALE_COOKIE_NAME || "mini_locale",
  theme: process.env.SHARED_THEME_COOKIE_NAME || "mini_theme",
  accent: process.env.SHARED_ACCENT_COOKIE_NAME || "mini_accent",
} as const;

export const MINI_AUTH_LOGIN_REDIRECT_ENABLED =
  process.env.MINIAUTH_LOGIN_REDIRECT_ENABLED === "true";

export const MINI_AUTH_WORKSPACE_SYNC_ENABLED =
  process.env.MINIAUTH_WORKSPACE_SYNC_ENABLED !== "false";

const sharedCookieDomain = process.env.MINIAPP_AUTH_COOKIE_DOMAIN?.trim();
export const AUTH_SHARED_COOKIE_DOMAIN =
  sharedCookieDomain && sharedCookieDomain.length > 0 ? sharedCookieDomain : undefined;
