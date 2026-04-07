import { BarcodeScanner } from "@/components/barcode-scanner";
import { AssetLocationField } from "@/components/asset-location-field";
import { AssortedQuantityFields } from "@/components/assorted-quantity-fields";
import { BilingualFieldsScope } from "@/components/bilingual-fields-scope";
import { BilingualNameFields } from "@/components/bilingual-name-fields";
import { PageHeader, Panel } from "@/components/ui";
import { createAssetAction } from "@/lib/actions";
import {
  assetUsageStateLabels,
  capacityUnitLabels,
  capacityUnitValues,
  commonColorValues,
  commonColorLabels,
  commonSizeLabels,
  commonSizeValues,
  lengthUnitLabels,
  lengthUnitValues,
  netWeightUnitLabels,
  netWeightUnitValues,
  sensitivityLabels,
  trackingModeLabels,
} from "@/lib/constants";
import { buildLocationPath, getLocationsData } from "@/lib/data";

export default async function NewAssetPage({
  searchParams,
}: {
  searchParams: Promise<{ workspaceId?: string }>;
}) {
  const params = await searchParams;
  const data = await getLocationsData(params.workspaceId);
  const locationOptions = data.locations.map((location) => ({
    id: location.id,
    path: buildLocationPath(data.locations, location.id, data.locale) || location.code || location.id,
    code: location.code,
    nameEn: location.nameEn,
    nameZh: location.nameZh,
  }));

  return (
    <>
      <PageHeader title={data.dictionary.assets.newTitle} subtitle={data.dictionary.assets.subtitle} />

      <div className="grid-2">
        <Panel title={data.dictionary.assets.scannerTitle}>
          <div className="stack">
            <p className="muted">{data.dictionary.assets.scannerHelp}</p>
            <BarcodeScanner
              targetInputId="barcodeValue"
              lookupEndpoint="/api/barcodes/lookup"
              labels={{
                start: data.dictionary.assets.scannerStart,
                stop: data.dictionary.assets.scannerStop,
                unavailable: data.dictionary.assets.scannerUnavailable,
                cameraFailed: data.dictionary.assets.scannerCameraFailed,
                lookupSuccess: data.dictionary.assets.scannerLookupSuccess,
                lookupMissing: data.dictionary.assets.scannerLookupMissing,
                lookupFailed: data.dictionary.assets.scannerLookupFailed,
              }}
            />
            <p className="muted">{data.dictionary.assets.lookupHelp}</p>
          </div>
        </Panel>

        <Panel title={data.dictionary.assets.newTitle}>
          <form action={createAssetAction} className="form-grid">
            <input type="hidden" name="workspaceId" value={data.currentWorkspace?.id ?? ""} />

            <AssetLocationField
              inputId="currentLocationId"
              inputName="currentLocationId"
              label={data.dictionary.common.location}
              emptyLabel={data.dictionary.assets.currentLocationFallback}
              options={locationOptions}
              storageKey={`miniassets:asset-create-location:${data.currentWorkspace?.id ?? "default"}`}
              labels={{
                placeholder: data.dictionary.assets.locationPickerPlaceholder,
                help: data.dictionary.assets.locationPickerHelp,
                matched: data.dictionary.assets.locationPickerMatched,
                unresolved: data.dictionary.assets.locationPickerUnresolved,
                advanced: data.dictionary.assets.locationPickerAdvanced,
                locationId: data.dictionary.assets.locationPickerLocationId,
              }}
            />

            <BilingualFieldsScope locale={data.locale} label={data.dictionary.common.language}>
              <BilingualNameFields
                locale={data.locale}
                englishLabel={data.dictionary.common.englishName}
                chineseLabel={data.dictionary.common.chineseName}
              />

              <div className="field-stack">
                <label htmlFor="primaryColor">{data.dictionary.common.primaryColor}</label>
                <select id="primaryColor" name="primaryColor" defaultValue="">
                  <option value="">{data.dictionary.common.optional}</option>
                  {commonColorValues.map((value) => (
                    <option key={`primary-${value}`} value={value}>
                      {commonColorLabels[value][data.locale === "ZH_CN" ? "zh" : "en"]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-stack">
                <label htmlFor="secondaryColor">{data.dictionary.common.secondaryColor}</label>
                <select id="secondaryColor" name="secondaryColor" defaultValue="">
                  <option value="">{data.dictionary.common.optional}</option>
                  {commonColorValues.map((value) => (
                    <option key={`secondary-${value}`} value={value}>
                      {commonColorLabels[value][data.locale === "ZH_CN" ? "zh" : "en"]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-stack">
                <label htmlFor="brand">{data.dictionary.common.brand}</label>
                <input id="brand" name="brand" list="brandSuggestions" />
              </div>

              <div className="field-stack">
                <label htmlFor="model">{data.dictionary.common.model}</label>
                <input id="model" name="model" list="modelSuggestions" />
              </div>

              <div className="field-stack">
                <label htmlFor="size">{data.dictionary.common.size}</label>
                <input id="size" name="size" list="sizeSuggestions" />
              </div>

              <BilingualNameFields
                locale={data.locale}
                englishLabel={data.dictionary.common.variant}
                chineseLabel={data.dictionary.common.variant}
                englishId="variant"
                chineseId="variantZh"
                englishName="variant"
                chineseName="variantZh"
              />

              <BilingualNameFields
                locale={data.locale}
                englishLabel={data.dictionary.common.subvariant}
                chineseLabel={data.dictionary.common.subvariant}
                englishId="subvariant"
                chineseId="subvariantZh"
                englishName="subvariant"
                chineseName="subvariantZh"
              />
            </BilingualFieldsScope>

            <div className="field-stack">
              <label htmlFor="barcodeValue">{data.dictionary.common.barcode}</label>
              <input id="barcodeValue" name="barcodeValue" />
            </div>

            <div className="field-stack">
              <label htmlFor="barcodeFormat">{data.dictionary.common.barcodeFormat}</label>
              <input id="barcodeFormat" name="barcodeFormat" />
            </div>

            <div className="field-stack">
              <label htmlFor="trackingMode">{data.dictionary.common.trackingMode}</label>
              <select id="trackingMode" name="trackingMode" defaultValue="INDIVIDUAL">
                {Object.entries(trackingModeLabels).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value[data.locale === "ZH_CN" ? "zh" : "en"]}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-stack">
              <label htmlFor="usageState">{data.dictionary.common.usageState}</label>
              <select id="usageState" name="usageState" defaultValue="">
                <option value="">{data.dictionary.common.optional}</option>
                {Object.entries(assetUsageStateLabels).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value[data.locale === "ZH_CN" ? "zh" : "en"]}
                  </option>
                ))}
              </select>
            </div>

            <AssortedQuantityFields
              assortedLabel={data.dictionary.common.assorted}
              quantityLabel={data.dictionary.common.quantity}
              estimatedQuantityLabel={data.dictionary.common.estimatedQuantity}
              helpText={data.dictionary.assets.assortedHelp}
              defaultQuantity={1}
            />

            <div className="field-stack">
              <label htmlFor="sensitivityLevel">{data.dictionary.common.sensitivity}</label>
              <select id="sensitivityLevel" name="sensitivityLevel" defaultValue="LOW">
                {Object.entries(sensitivityLabels).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value[data.locale === "ZH_CN" ? "zh" : "en"]}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-stack">
              <label className="checkbox-row" htmlFor="isLowStock">
                <input id="isLowStock" name="isLowStock" type="checkbox" value="true" />
                <span>{data.dictionary.common.lowStock}</span>
              </label>
            </div>

            <div className="field-stack">
              <label htmlFor="barcodeSource">{data.dictionary.common.barcodeSource}</label>
              <input id="barcodeSource" name="barcodeSource" list="barcodeSourceSuggestions" defaultValue="manual-or-scan" />
            </div>

            <div className="measurement-pair full-span">
              <div className="field-stack">
                <label htmlFor="lengthValue">{data.dictionary.common.length}</label>
                <input id="lengthValue" name="lengthValue" type="number" min="0" step="0.01" />
              </div>

              <div className="field-stack">
                <label htmlFor="lengthUnit">{data.dictionary.common.unit}</label>
                <select id="lengthUnit" name="lengthUnit" defaultValue="">
                  <option value="">{data.dictionary.common.optional}</option>
                  {lengthUnitValues.map((value) => (
                    <option key={value} value={value}>
                      {lengthUnitLabels[value][data.locale === "ZH_CN" ? "zh" : "en"]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="measurement-pair full-span">
              <div className="field-stack">
                <label htmlFor="capacityValue">{data.dictionary.common.capacity}</label>
                <input id="capacityValue" name="capacityValue" type="number" min="0" step="0.01" />
              </div>

              <div className="field-stack">
                <label htmlFor="capacityUnit">{data.dictionary.common.unit}</label>
                <select id="capacityUnit" name="capacityUnit" defaultValue="">
                  <option value="">{data.dictionary.common.optional}</option>
                  {capacityUnitValues.map((value) => (
                    <option key={value} value={value}>
                      {capacityUnitLabels[value][data.locale === "ZH_CN" ? "zh" : "en"]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="measurement-pair full-span">
              <div className="field-stack">
                <label htmlFor="netWeightValue">{data.dictionary.common.netWeight}</label>
                <input id="netWeightValue" name="netWeightValue" type="number" min="0" step="0.01" />
              </div>

              <div className="field-stack">
                <label htmlFor="netWeightUnit">{data.dictionary.common.unit}</label>
                <select id="netWeightUnit" name="netWeightUnit" defaultValue="">
                  <option value="">{data.dictionary.common.optional}</option>
                  {netWeightUnitValues.map((value) => (
                    <option key={value} value={value}>
                      {netWeightUnitLabels[value][data.locale === "ZH_CN" ? "zh" : "en"]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field-stack full-span">
              <label htmlFor="description">{data.dictionary.common.description}</label>
              <textarea id="description" name="description" />
            </div>

            <div className="field-stack full-span">
              <label htmlFor="notes">{data.dictionary.common.notes}</label>
              <textarea id="notes" name="notes" />
            </div>

            <div className="full-span">
              <button type="submit">{data.dictionary.common.create}</button>
            </div>
          </form>

          <datalist id="brandSuggestions">
            {data.assetFieldSuggestions.brands.map((value) => (
              <option key={`brand-${value}`} value={value} />
            ))}
          </datalist>
          <datalist id="modelSuggestions">
            {data.assetFieldSuggestions.models.map((value) => (
              <option key={`model-${value}`} value={value} />
            ))}
          </datalist>
          <datalist id="sizeSuggestions">
            {commonSizeValues.map((value) => (
              <option
                key={`size-${value}`}
                value={value === "ONE_SIZE" ? commonSizeLabels[value][data.locale === "ZH_CN" ? "zh" : "en"] : value}
              />
            ))}
            {data.assetFieldSuggestions.sizes.map((value) => (
              <option key={`size-custom-${value}`} value={value} />
            ))}
          </datalist>
          <datalist id="variantSuggestions">
            {data.assetFieldSuggestions.variants.map((value) => (
              <option key={`variant-${value}`} value={value} />
            ))}
          </datalist>
          <datalist id="subvariantSuggestions">
            {data.assetFieldSuggestions.subvariants.map((value) => (
              <option key={`subvariant-${value}`} value={value} />
            ))}
          </datalist>
          <datalist id="barcodeSourceSuggestions">
            {data.assetFieldSuggestions.barcodeSources.map((value) => (
              <option key={`barcode-source-${value}`} value={value} />
            ))}
          </datalist>
        </Panel>
      </div>
    </>
  );
}
