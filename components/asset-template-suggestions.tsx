"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type AssetTemplate = {
  id: string;
  assetCode: string;
  nameEn: string | null;
  nameZh: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  brand: string | null;
  brandZh: string | null;
  model: string | null;
  variant: string | null;
  variantZh: string | null;
  subvariant: string | null;
  subvariantZh: string | null;
  size: string | null;
  usageFrequency: "DAILY" | "WEEKLY" | "MONTHLY" | "RARE" | null;
  stockStatus: "ACTIVE" | "BACKUP" | null;
  sizeType: "SMALL" | "MEDIUM" | "BULKY" | null;
  barcodeValue: string | null;
  barcodeFormat: string | null;
  barcodeSource: string | null;
  lengthValue: number | null;
  lengthUnit: string | null;
  capacityValue: number | null;
  capacityUnit: string | null;
  netWeightValue: number | null;
  netWeightUnit: string | null;
  isAssorted: boolean;
  trackingMode: "INDIVIDUAL" | "GROUP";
  usageState: "STORAGE" | "IN_USE" | null;
  quantity: number;
  sensitivityLevel: "LOW" | "MEDIUM";
  label: string;
};

type FormSnapshot = {
  nameEn: string;
  nameZh: string;
  brand: string;
  brandZh: string;
  model: string;
  barcodeValue: string;
};

const watchedIds = ["nameEn", "nameZh", "brand", "brandZh", "model", "barcodeValue"] as const;

function getControlValue(form: HTMLFormElement, id: string) {
  const control = form.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`#${id}`);
  return control?.value?.trim() || "";
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function significantCharCount(value: string) {
  return Array.from(value).filter((char) => /[\p{L}\p{N}]/u.test(char)).length;
}

function hasStrongTextSignal(value: string) {
  return significantCharCount(value) >= 2;
}

function setControlValue(id: string, value: string | number | null | undefined) {
  const element = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
  if (!element) {
    return;
  }

  const nextValue = value === null || typeof value === "undefined" ? "" : String(value);
  const prototype =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : element instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
  descriptor?.set?.call(element, nextValue);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

function setCheckboxValue(id: string, checked: boolean) {
  const element = document.getElementById(id) as HTMLInputElement | null;
  if (!element) {
    return;
  }

  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "checked");
  descriptor?.set?.call(element, checked);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

function scoreTemplate(snapshot: FormSnapshot, template: AssetTemplate) {
  let score = 0;
  const barcode = normalizeText(snapshot.barcodeValue);
  const barcodeExact = Boolean(barcode && normalizeText(template.barcodeValue || "") === barcode);
  if (barcodeExact) {
    score += 120;
  }

  const textPairs: Array<[string, string | null | undefined, number]> = [
    [snapshot.nameEn, template.nameEn, 36],
    [snapshot.nameZh, template.nameZh, 36],
    [snapshot.brand, template.brand, 20],
    [snapshot.brandZh, template.brandZh, 20],
    [snapshot.model, template.model, 14],
  ];

  for (const [current, existing, weight] of textPairs) {
    const normalizedCurrent = normalizeText(current);
    const normalizedExisting = normalizeText(existing || "");
    if (!normalizedCurrent || !normalizedExisting || !hasStrongTextSignal(normalizedCurrent)) {
      continue;
    }

    if (normalizedCurrent === normalizedExisting) {
      score += weight;
      continue;
    }

    if (normalizedExisting.includes(normalizedCurrent) || normalizedCurrent.includes(normalizedExisting)) {
      score += Math.max(8, Math.floor(weight / 2));
    }
  }

  return score;
}

export function AssetTemplateSuggestions({
  locale,
  templates,
  labels,
}: {
  locale: "ZH_CN" | "EN";
  templates: AssetTemplate[];
  labels: {
    title: string;
    help: string;
    apply: string;
    applied: string;
  };
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [snapshot, setSnapshot] = useState<FormSnapshot>({
    nameEn: "",
    nameZh: "",
    brand: "",
    brandZh: "",
    model: "",
    barcodeValue: "",
  });
  const [appliedTemplateId, setAppliedTemplateId] = useState<string | null>(null);

  useEffect(() => {
    const form = rootRef.current?.closest("form");
    if (!form) {
      return;
    }

    const updateSnapshot = () => {
      setSnapshot({
        nameEn: getControlValue(form, "nameEn"),
        nameZh: getControlValue(form, "nameZh"),
        brand: getControlValue(form, "brand"),
        brandZh: getControlValue(form, "brandZh"),
        model: getControlValue(form, "model"),
        barcodeValue: getControlValue(form, "barcodeValue"),
      });
    };

    updateSnapshot();
    const controls = watchedIds
      .map((id) => form.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`#${id}`))
      .filter(Boolean) as Array<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;

    for (const control of controls) {
      control.addEventListener("input", updateSnapshot);
      control.addEventListener("change", updateSnapshot);
    }

    return () => {
      for (const control of controls) {
        control.removeEventListener("input", updateSnapshot);
        control.removeEventListener("change", updateSnapshot);
      }
    };
  }, []);

  const matches = useMemo(() => {
    const hasQuery = Object.values(snapshot).some((value) => value.trim());
    if (!hasQuery) {
      return [];
    }

    const hasStrongSignal =
      significantCharCount(snapshot.barcodeValue) >= 4 ||
      [snapshot.nameEn, snapshot.nameZh, snapshot.brand, snapshot.brandZh, snapshot.model].some(hasStrongTextSignal);
    if (!hasStrongSignal) {
      return [];
    }

    return templates
      .map((template) => ({ template, score: scoreTemplate(snapshot, template) }))
      .filter((item) => item.score >= 24)
      .sort((left, right) => right.score - left.score || left.template.assetCode.localeCompare(right.template.assetCode))
      .slice(0, 5);
  }, [snapshot, templates]);

  function applyTemplate(template: AssetTemplate) {
    setControlValue("nameEn", template.nameEn);
    setControlValue("nameZh", template.nameZh);
    setControlValue("primaryColor", template.primaryColor);
    setControlValue("secondaryColor", template.secondaryColor);
    setControlValue("brand", template.brand);
    setControlValue("brandZh", template.brandZh);
    setControlValue("model", template.model);
    setControlValue("variant", template.variant);
    setControlValue("variantZh", template.variantZh);
    setControlValue("subvariant", template.subvariant);
    setControlValue("subvariantZh", template.subvariantZh);
    setControlValue("size", template.size);
    setControlValue("usageFrequency", template.usageFrequency);
    setControlValue("stockStatus", template.stockStatus);
    setControlValue("sizeType", template.sizeType);
    setControlValue("barcodeFormat", template.barcodeFormat);
    setControlValue("barcodeSource", template.barcodeSource);
    setControlValue("lengthValue", template.lengthValue);
    setControlValue("lengthUnit", template.lengthUnit);
    setControlValue("capacityValue", template.capacityValue);
    setControlValue("capacityUnit", template.capacityUnit);
    setControlValue("netWeightValue", template.netWeightValue);
    setControlValue("netWeightUnit", template.netWeightUnit);
    setControlValue("trackingMode", template.trackingMode);
    setControlValue("quantity", template.quantity);
    setControlValue("sensitivityLevel", template.sensitivityLevel);
    setCheckboxValue("isAssorted", template.isAssorted);
    setAppliedTemplateId(template.id);
  }

  if (!matches.length && !appliedTemplateId) {
    return <div ref={rootRef} className="asset-template-suggestions-anchor" />;
  }

  return (
    <div ref={rootRef} className="asset-template-suggestions full-span">
      <div className="asset-template-suggestions-header">
        <strong>{labels.title}</strong>
        <p className="muted">{labels.help}</p>
        {appliedTemplateId ? <p className="muted save-confirmation">{labels.applied}</p> : null}
      </div>
      {matches.length ? (
        <div className="asset-template-suggestion-list">
          {matches.map(({ template }) => (
            <button
              key={template.id}
              type="button"
              className="asset-template-suggestion"
              onClick={() => applyTemplate(template)}
            >
              <div className="asset-template-suggestion-copy">
                <span className="asset-code">{template.assetCode}</span>
                <strong>{template.label || (locale === "ZH_CN" ? template.nameZh || template.nameEn : template.nameEn || template.nameZh)}</strong>
              </div>
              <span className="ghost-button">{labels.apply}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
