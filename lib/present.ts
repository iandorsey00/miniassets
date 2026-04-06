import { capacityUnitLabels, netWeightUnitLabels } from "@/lib/constants";
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

function formatMeasurement(
  locale: AppLocale,
  value: number | null | undefined,
  unit: string | null | undefined,
  labels: Record<string, { zh: string; en: string }>,
) {
  if (!value || !unit || !labels[unit]) {
    return "";
  }

  return `${value} ${labels[unit][locale === "ZH_CN" ? "zh" : "en"]}`;
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
    variantZh?: string | null;
    subvariant?: string | null;
    subvariantZh?: string | null;
    capacityValue?: number | null;
    capacityUnit?: string | null;
    netWeightValue?: number | null;
    netWeightUnit?: string | null;
    assetCode?: string | null;
  },
  options?: { includeModel?: boolean },
) {
  const primaryColor = values.primaryColor?.trim() || values.color?.trim() || "";
  const variant = locale === "ZH_CN" ? values.variantZh?.trim() || values.variant?.trim() || "" : values.variant?.trim() || values.variantZh?.trim() || "";
  const subvariant =
    locale === "ZH_CN"
      ? values.subvariantZh?.trim() || values.subvariant?.trim() || ""
      : values.subvariant?.trim() || values.subvariantZh?.trim() || "";
  const capacity = formatMeasurement(locale, values.capacityValue, values.capacityUnit, capacityUnitLabels);
  const netWeight = formatMeasurement(locale, values.netWeightValue, values.netWeightUnit, netWeightUnitLabels);
  const segments = [
    pickLocalizedText(locale, values),
    primaryColor,
    values.secondaryColor?.trim() || "",
    values.brand?.trim() || "",
    variant,
    subvariant,
    options?.includeModel ? values.model?.trim() || "" : "",
    capacity,
    netWeight,
  ].filter(Boolean);

  return segments.join(", ") || values.assetCode?.trim() || "";
}
