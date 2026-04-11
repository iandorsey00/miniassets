import {
  capacityUnitLabels,
  commonColorLabels,
  commonSizeLabels,
  lengthUnitLabels,
  netWeightUnitLabels,
} from "@/lib/constants";
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

export function formatColorLabel(locale: AppLocale, value: string | null | undefined) {
  const normalized = value?.trim() || "";
  if (!normalized) {
    return "";
  }

  const localized = commonColorLabels[normalized as keyof typeof commonColorLabels];
  return localized ? localized[locale === "ZH_CN" ? "zh" : "en"] : normalized;
}

export function formatSizeLabel(locale: AppLocale, value: string | null | undefined) {
  const normalized = value?.trim() || "";
  if (!normalized) {
    return "";
  }

  if (normalized === "One size" || normalized === "均码") {
    return commonSizeLabels.ONE_SIZE[locale === "ZH_CN" ? "zh" : "en"];
  }

  const localized = commonSizeLabels[normalized as keyof typeof commonSizeLabels];
  return localized ? localized[locale === "ZH_CN" ? "zh" : "en"] : normalized;
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
    brandZh?: string | null;
    model?: string | null;
    variant?: string | null;
    variantZh?: string | null;
    subvariant?: string | null;
    subvariantZh?: string | null;
    size?: string | null;
    lengthValue?: number | null;
    lengthUnit?: string | null;
    capacityValue?: number | null;
    capacityUnit?: string | null;
    netWeightValue?: number | null;
    netWeightUnit?: string | null;
    assetCode?: string | null;
    isAssorted?: boolean | null;
  },
  options?: { includeModel?: boolean },
) {
  const primaryColor = formatColorLabel(locale, values.primaryColor?.trim() || values.color?.trim() || "");
  const secondaryColor = formatColorLabel(locale, values.secondaryColor?.trim() || "");
  const brand = locale === "ZH_CN" ? values.brandZh?.trim() || values.brand?.trim() || "" : values.brand?.trim() || values.brandZh?.trim() || "";
  const variant = locale === "ZH_CN" ? values.variantZh?.trim() || values.variant?.trim() || "" : values.variant?.trim() || values.variantZh?.trim() || "";
  const subvariant =
    locale === "ZH_CN"
      ? values.subvariantZh?.trim() || values.subvariant?.trim() || ""
      : values.subvariant?.trim() || values.subvariantZh?.trim() || "";
  const length = formatMeasurement(locale, values.lengthValue, values.lengthUnit, lengthUnitLabels);
  const capacity = formatMeasurement(locale, values.capacityValue, values.capacityUnit, capacityUnitLabels);
  const netWeight = formatMeasurement(locale, values.netWeightValue, values.netWeightUnit, netWeightUnitLabels);
  const assorted = values.isAssorted ? (locale === "ZH_CN" ? "混合项" : "Assorted") : "";
  const segments = [
    assorted,
    pickLocalizedText(locale, values),
    primaryColor,
    secondaryColor,
    brand,
    variant,
    subvariant,
    formatSizeLabel(locale, values.size),
    options?.includeModel ? values.model?.trim() || "" : "",
    length,
    capacity,
    netWeight,
  ].filter(Boolean);

  return segments.join(", ") || values.assetCode?.trim() || "";
}
