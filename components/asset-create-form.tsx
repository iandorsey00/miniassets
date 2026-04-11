"use client";

import { useEffect, useState } from "react";

import { AssetLocationField, type AssetLocationOption } from "@/components/asset-location-field";
import { AssortedQuantityFields } from "@/components/assorted-quantity-fields";
import { BilingualFieldsScope } from "@/components/bilingual-fields-scope";
import { BilingualNameFields } from "@/components/bilingual-name-fields";
import {
  assetUsageStateLabels,
  capacityUnitLabels,
  capacityUnitValues,
  commonColorLabels,
  commonColorValues,
  commonSizeLabels,
  commonSizeValues,
  lengthUnitLabels,
  lengthUnitValues,
  netWeightUnitLabels,
  netWeightUnitValues,
  sensitivityLabels,
  trackingModeLabels,
} from "@/lib/constants";

type AssetCreateView = "STANDARD" | "CLOTHES";

type SuggestionData = {
  brands: string[];
  brandsZh: string[];
  models: string[];
  sizes: string[];
  variants: string[];
  subvariants: string[];
  barcodeSources: string[];
};

export function AssetCreateForm({
  action,
  workspaceId,
  locale,
  dictionary,
  locationOptions,
  assetFieldSuggestions,
}: {
  action: (formData: FormData) => void | Promise<void>;
  workspaceId: string;
  locale: "ZH_CN" | "EN";
  dictionary: {
    common: Record<string, string>;
    assets: Record<string, string>;
  };
  locationOptions: AssetLocationOption[];
  assetFieldSuggestions: SuggestionData;
}) {
  const [view, setView] = useState<AssetCreateView>(() => {
    if (typeof window === "undefined") {
      return "STANDARD";
    }

    const savedView = window.localStorage.getItem("miniassets:asset-create-view");
    return savedView === "STANDARD" || savedView === "CLOTHES" ? savedView : "STANDARD";
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem("miniassets:asset-create-view", view);
  }, [view]);

  const showBarcodeInMain = view === "STANDARD";
  const showCapacityInMain = view === "STANDARD";
  const showWeightInMain = view === "STANDARD";
  const showUsageStateInMain = view === "STANDARD";
  const showQuantityInMain = view === "STANDARD";
  const showSizeInMain = view === "CLOTHES";

  return (
    <form action={action} className="form-grid">
      <input type="hidden" name="workspaceId" value={workspaceId} />

      <div className="asset-create-view-switcher full-span">
        <span className="muted asset-create-view-label">{dictionary.assets.viewLabel}</span>
        <div className="bilingual-toggle" role="tablist" aria-label={dictionary.assets.viewLabel}>
          <button
            type="button"
            className={`ghost-button bilingual-chip ${view === "STANDARD" ? "is-active" : ""}`}
            onClick={() => setView("STANDARD")}
          >
            {dictionary.assets.viewStandard}
          </button>
          <button
            type="button"
            className={`ghost-button bilingual-chip ${view === "CLOTHES" ? "is-active" : ""}`}
            onClick={() => setView("CLOTHES")}
          >
            {dictionary.assets.viewClothes}
          </button>
        </div>
      </div>

      <AssetLocationField
        inputId="currentLocationId"
        inputName="currentLocationId"
        label={dictionary.common.location}
        emptyLabel={dictionary.assets.currentLocationFallback}
        options={locationOptions}
        storageKey={`miniassets:asset-create-location:${workspaceId || "default"}`}
        labels={{
          placeholder: dictionary.assets.locationPickerPlaceholder,
          help: dictionary.assets.locationPickerHelp,
          matched: dictionary.assets.locationPickerMatched,
          unresolved: dictionary.assets.locationPickerUnresolved,
          advanced: dictionary.assets.locationPickerAdvanced,
          locationId: dictionary.assets.locationPickerLocationId,
        }}
      />

      <BilingualFieldsScope locale={locale} label={dictionary.common.language}>
        <BilingualNameFields
          locale={locale}
          englishLabel={dictionary.common.englishName}
          chineseLabel={dictionary.common.chineseName}
        />

        <div className="field-stack">
          <label htmlFor="primaryColor">{dictionary.common.primaryColor}</label>
          <select id="primaryColor" name="primaryColor" defaultValue="">
            <option value="">{dictionary.common.optional}</option>
            {commonColorValues.map((value) => (
              <option key={`primary-${value}`} value={value}>
                {commonColorLabels[value][locale === "ZH_CN" ? "zh" : "en"]}
              </option>
            ))}
          </select>
        </div>

        <div className="field-stack">
          <label htmlFor="secondaryColor">{dictionary.common.secondaryColor}</label>
          <select id="secondaryColor" name="secondaryColor" defaultValue="">
            <option value="">{dictionary.common.optional}</option>
            {commonColorValues.map((value) => (
              <option key={`secondary-${value}`} value={value}>
                {commonColorLabels[value][locale === "ZH_CN" ? "zh" : "en"]}
              </option>
            ))}
          </select>
        </div>

        <BilingualNameFields
          locale={locale}
          englishLabel={dictionary.common.brand}
          chineseLabel={dictionary.common.brand}
          englishId="brand"
          chineseId="brandZh"
          englishName="brand"
          chineseName="brandZh"
          englishList="brandSuggestions"
          chineseList="brandZhSuggestions"
        />

        {showSizeInMain ? (
          <div className="field-stack">
            <label htmlFor="size">{dictionary.common.size}</label>
            <input id="size" name="size" list="sizeSuggestions" />
          </div>
        ) : null}
      </BilingualFieldsScope>

      {showBarcodeInMain ? (
        <div className="field-stack">
          <label htmlFor="barcodeValue">{dictionary.common.barcode}</label>
          <input id="barcodeValue" name="barcodeValue" />
        </div>
      ) : null}

      {showCapacityInMain ? (
        <div className="measurement-pair full-span">
          <div className="field-stack">
            <label htmlFor="capacityValue">{dictionary.common.capacity}</label>
            <input id="capacityValue" name="capacityValue" type="number" min="0" step="0.01" />
          </div>

          <div className="field-stack">
            <label htmlFor="capacityUnit">{dictionary.common.unit}</label>
            <select id="capacityUnit" name="capacityUnit" defaultValue="">
              <option value="">{dictionary.common.optional}</option>
              {capacityUnitValues.map((value) => (
                <option key={value} value={value}>
                  {capacityUnitLabels[value][locale === "ZH_CN" ? "zh" : "en"]}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      {showWeightInMain ? (
        <div className="measurement-pair full-span">
          <div className="field-stack">
            <label htmlFor="netWeightValue">{dictionary.common.netWeight}</label>
            <input id="netWeightValue" name="netWeightValue" type="number" min="0" step="0.01" />
          </div>

          <div className="field-stack">
            <label htmlFor="netWeightUnit">{dictionary.common.unit}</label>
            <select id="netWeightUnit" name="netWeightUnit" defaultValue="">
              <option value="">{dictionary.common.optional}</option>
              {netWeightUnitValues.map((value) => (
                <option key={value} value={value}>
                  {netWeightUnitLabels[value][locale === "ZH_CN" ? "zh" : "en"]}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      {showUsageStateInMain ? (
        <div className="field-stack">
          <label htmlFor="usageState">{dictionary.common.usageState}</label>
          <select id="usageState" name="usageState" defaultValue="">
            <option value="">{dictionary.common.optional}</option>
            {Object.entries(assetUsageStateLabels).map(([key, value]) => (
              <option key={key} value={key}>
                {value[locale === "ZH_CN" ? "zh" : "en"]}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {showQuantityInMain ? (
        <AssortedQuantityFields
          assortedLabel={dictionary.common.assorted}
          quantityLabel={dictionary.common.quantity}
          estimatedQuantityLabel={dictionary.common.estimatedQuantity}
          helpText={dictionary.assets.assortedHelp}
          defaultQuantity={1}
        />
      ) : null}

      <details className="asset-advanced full-span">
        <summary>{dictionary.assets.advancedDetails}</summary>
        <p className="muted asset-advanced-help">{dictionary.assets.advancedHelp}</p>
        <div className="form-grid">
          <div className="field-stack">
            <label htmlFor="model">{dictionary.common.model}</label>
            <input id="model" name="model" list="modelSuggestions" />
          </div>

          {!showSizeInMain ? (
            <div className="field-stack">
              <label htmlFor="size">{dictionary.common.size}</label>
              <input id="size" name="size" list="sizeSuggestions" />
            </div>
          ) : null}

          <BilingualFieldsScope locale={locale} label={dictionary.common.language}>
            <BilingualNameFields
              locale={locale}
              englishLabel={dictionary.common.variant}
              chineseLabel={dictionary.common.variant}
              englishId="variant"
              chineseId="variantZh"
              englishName="variant"
              chineseName="variantZh"
            />

            <BilingualNameFields
              locale={locale}
              englishLabel={dictionary.common.subvariant}
              chineseLabel={dictionary.common.subvariant}
              englishId="subvariant"
              chineseId="subvariantZh"
              englishName="subvariant"
              chineseName="subvariantZh"
            />
          </BilingualFieldsScope>

          {!showBarcodeInMain ? (
            <div className="field-stack">
              <label htmlFor="barcodeValue">{dictionary.common.barcode}</label>
              <input id="barcodeValue" name="barcodeValue" />
            </div>
          ) : null}

          <div className="field-stack">
            <label htmlFor="barcodeFormat">{dictionary.common.barcodeFormat}</label>
            <input id="barcodeFormat" name="barcodeFormat" />
          </div>

          <div className="field-stack">
            <label htmlFor="barcodeSource">{dictionary.common.barcodeSource}</label>
            <input id="barcodeSource" name="barcodeSource" list="barcodeSourceSuggestions" defaultValue="manual-or-scan" />
          </div>

          <div className="measurement-pair full-span">
            <div className="field-stack">
              <label htmlFor="lengthValue">{dictionary.common.length}</label>
              <input id="lengthValue" name="lengthValue" type="number" min="0" step="0.01" />
            </div>

            <div className="field-stack">
              <label htmlFor="lengthUnit">{dictionary.common.unit}</label>
              <select id="lengthUnit" name="lengthUnit" defaultValue="">
                <option value="">{dictionary.common.optional}</option>
                {lengthUnitValues.map((value) => (
                  <option key={value} value={value}>
                    {lengthUnitLabels[value][locale === "ZH_CN" ? "zh" : "en"]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!showCapacityInMain ? (
            <div className="measurement-pair full-span">
              <div className="field-stack">
                <label htmlFor="capacityValue">{dictionary.common.capacity}</label>
                <input id="capacityValue" name="capacityValue" type="number" min="0" step="0.01" />
              </div>

              <div className="field-stack">
                <label htmlFor="capacityUnit">{dictionary.common.unit}</label>
                <select id="capacityUnit" name="capacityUnit" defaultValue="">
                  <option value="">{dictionary.common.optional}</option>
                  {capacityUnitValues.map((value) => (
                    <option key={value} value={value}>
                      {capacityUnitLabels[value][locale === "ZH_CN" ? "zh" : "en"]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}

          {!showWeightInMain ? (
            <div className="measurement-pair full-span">
              <div className="field-stack">
                <label htmlFor="netWeightValue">{dictionary.common.netWeight}</label>
                <input id="netWeightValue" name="netWeightValue" type="number" min="0" step="0.01" />
              </div>

              <div className="field-stack">
                <label htmlFor="netWeightUnit">{dictionary.common.unit}</label>
                <select id="netWeightUnit" name="netWeightUnit" defaultValue="">
                  <option value="">{dictionary.common.optional}</option>
                  {netWeightUnitValues.map((value) => (
                    <option key={value} value={value}>
                      {netWeightUnitLabels[value][locale === "ZH_CN" ? "zh" : "en"]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}

          <div className="field-stack">
            <label htmlFor="trackingMode">{dictionary.common.trackingMode}</label>
            <select id="trackingMode" name="trackingMode" defaultValue="INDIVIDUAL">
              {Object.entries(trackingModeLabels).map(([key, value]) => (
                <option key={key} value={key}>
                  {value[locale === "ZH_CN" ? "zh" : "en"]}
                </option>
              ))}
            </select>
          </div>

          {!showUsageStateInMain ? (
            <div className="field-stack">
              <label htmlFor="usageState">{dictionary.common.usageState}</label>
              <select id="usageState" name="usageState" defaultValue="">
                <option value="">{dictionary.common.optional}</option>
                {Object.entries(assetUsageStateLabels).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value[locale === "ZH_CN" ? "zh" : "en"]}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {!showQuantityInMain ? (
            <AssortedQuantityFields
              assortedLabel={dictionary.common.assorted}
              quantityLabel={dictionary.common.quantity}
              estimatedQuantityLabel={dictionary.common.estimatedQuantity}
              helpText={dictionary.assets.assortedHelp}
              defaultQuantity={1}
            />
          ) : null}

          <div className="field-stack">
            <label htmlFor="sensitivityLevel">{dictionary.common.sensitivity}</label>
            <select id="sensitivityLevel" name="sensitivityLevel" defaultValue="LOW">
              {Object.entries(sensitivityLabels).map(([key, value]) => (
                <option key={key} value={key}>
                  {value[locale === "ZH_CN" ? "zh" : "en"]}
                </option>
              ))}
            </select>
          </div>

          <div className="field-stack">
            <label className="checkbox-row" htmlFor="isLowStock">
              <input id="isLowStock" name="isLowStock" type="checkbox" value="true" />
              <span>{dictionary.common.lowStock}</span>
            </label>
          </div>

          <div className="field-stack full-span">
            <label htmlFor="description">{dictionary.common.description}</label>
            <textarea id="description" name="description" />
          </div>

          <div className="field-stack full-span">
            <label htmlFor="notes">{dictionary.common.notes}</label>
            <textarea id="notes" name="notes" />
          </div>
        </div>
      </details>

      <div className="full-span">
        <button type="submit">{dictionary.common.create}</button>
      </div>

      <datalist id="brandSuggestions">
        {assetFieldSuggestions.brands.map((value) => (
          <option key={`brand-${value}`} value={value} />
        ))}
      </datalist>
      <datalist id="brandZhSuggestions">
        {assetFieldSuggestions.brandsZh.map((value) => (
          <option key={`brand-zh-${value}`} value={value} />
        ))}
      </datalist>
      <datalist id="modelSuggestions">
        {assetFieldSuggestions.models.map((value) => (
          <option key={`model-${value}`} value={value} />
        ))}
      </datalist>
      <datalist id="sizeSuggestions">
        {commonSizeValues.map((value) => (
          <option
            key={`size-${value}`}
            value={value === "ONE_SIZE" ? commonSizeLabels[value][locale === "ZH_CN" ? "zh" : "en"] : value}
          />
        ))}
        {assetFieldSuggestions.sizes.map((value) => (
          <option key={`size-custom-${value}`} value={value} />
        ))}
      </datalist>
      <datalist id="variantSuggestions">
        {assetFieldSuggestions.variants.map((value) => (
          <option key={`variant-${value}`} value={value} />
        ))}
      </datalist>
      <datalist id="subvariantSuggestions">
        {assetFieldSuggestions.subvariants.map((value) => (
          <option key={`subvariant-${value}`} value={value} />
        ))}
      </datalist>
      <datalist id="barcodeSourceSuggestions">
        {assetFieldSuggestions.barcodeSources.map((value) => (
          <option key={`barcode-source-${value}`} value={value} />
        ))}
      </datalist>
    </form>
  );
}
