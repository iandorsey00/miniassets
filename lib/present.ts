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
    primaryColor?: string | null;
    secondaryColor?: string | null;
    brand?: string | null;
    model?: string | null;
    variant?: string | null;
    subvariant?: string | null;
    assetCode?: string | null;
  },
  options?: { includeModel?: boolean },
) {
  const primaryColor = values.primaryColor?.trim() || values.color?.trim() || "";
  const segments = [
    pickLocalizedText(locale, values),
    primaryColor,
    values.secondaryColor?.trim() || "",
    values.brand?.trim() || "",
    values.variant?.trim() || "",
    values.subvariant?.trim() || "",
    options?.includeModel ? values.model?.trim() || "" : "",
  ].filter(Boolean);

  return segments.join(", ") || values.assetCode?.trim() || "";
}
