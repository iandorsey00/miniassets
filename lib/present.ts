import type { AppLocale } from "@/lib/i18n";

export function pickLocalizedText(
  locale: AppLocale,
  values: { nameEn?: string | null; nameZh?: string | null },
) {
  if (locale === "ZH_CN") {
    return values.nameZh?.trim() || values.nameEn?.trim() || "";
  }

  return values.nameEn?.trim() || values.nameZh?.trim() || "";
}

export function formatDateTime(value: Date | null | undefined, localeCode: string) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(localeCode, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

export function normalizeBarcode(input: string) {
  return input.replace(/[^0-9A-Za-z]/g, "").trim();
}

export function formatAssetLabel(
  locale: AppLocale,
  values: {
    nameEn?: string | null;
    nameZh?: string | null;
    color?: string | null;
    brand?: string | null;
    model?: string | null;
    assetCode?: string | null;
  },
  options?: { includeModel?: boolean },
) {
  const segments = [
    pickLocalizedText(locale, values),
    values.color?.trim() || "",
    values.brand?.trim() || "",
    options?.includeModel ? values.model?.trim() || "" : "",
  ].filter(Boolean);

  return segments.join(", ") || values.assetCode?.trim() || "";
}
