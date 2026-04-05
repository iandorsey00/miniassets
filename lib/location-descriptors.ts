import type { LocationDescriptor, LocationNode } from "@prisma/client";

import { wallDirectionLabels } from "@/lib/constants";
import type { AppLocale } from "@/lib/i18n";
import { pickLocalizedText } from "@/lib/present";

export type DescriptorWithReference = LocationDescriptor & {
  referenceLocation?: Pick<LocationNode, "id" | "nameEn" | "nameZh" | "code"> | null;
};

function formatOrdinalWord(value: number, locale: AppLocale) {
  if (locale === "ZH_CN") {
    return `第 ${value}`;
  }

  const mod10 = value % 10;
  const mod100 = value % 100;
  let suffix = "th";

  if (mod10 === 1 && mod100 !== 11) suffix = "st";
  else if (mod10 === 2 && mod100 !== 12) suffix = "nd";
  else if (mod10 === 3 && mod100 !== 13) suffix = "rd";

  return `${value}${suffix}`;
}

export function formatLocationDescriptor(
  descriptor: DescriptorWithReference,
  locale: AppLocale,
) {
  if (descriptor.type === "WALL_ZONE") {
    if (!descriptor.wall || !descriptor.ordinal) {
      return locale === "ZH_CN" ? "未完整定义的墙面区域" : "Incomplete wall zone descriptor";
    }

    const wallLabel = wallDirectionLabels[descriptor.wall][locale === "ZH_CN" ? "zh" : "en"];
    const ordinalLabel = formatOrdinalWord(descriptor.ordinal, locale);
    const qualifier = descriptor.qualifier?.trim();

    if (locale === "ZH_CN") {
      return qualifier
        ? `${wallLabel}${formatOrdinalWord(descriptor.ordinal, locale)}区域，${qualifier}`
        : `${wallLabel}${formatOrdinalWord(descriptor.ordinal, locale)}区域`;
    }

    return qualifier
      ? `${ordinalLabel} zone on the ${wallLabel.toLowerCase()}, ${qualifier}`
      : `${ordinalLabel} zone on the ${wallLabel.toLowerCase()}`;
  }

  const referenceLabel = descriptor.referenceLocation
    ? pickLocalizedText(locale, descriptor.referenceLocation) || descriptor.referenceLocation.code || descriptor.referenceLocation.id
    : locale === "ZH_CN"
      ? "未指定区域"
      : "unspecified zone";
  const qualifier = descriptor.qualifier?.trim();

  if (locale === "ZH_CN") {
    return qualifier ? `${referenceLabel}前方区域，${qualifier}` : `${referenceLabel}前方区域`;
  }

  return qualifier ? `In front of ${referenceLabel}, ${qualifier}` : `In front of ${referenceLabel}`;
}
