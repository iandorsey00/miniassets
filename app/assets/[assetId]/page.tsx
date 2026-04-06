import { BarcodeScanner } from "@/components/barcode-scanner";
import { AssetLocationField } from "@/components/asset-location-field";
import { AssetShareActions } from "@/components/asset-share-actions";
import { BilingualFieldsScope } from "@/components/bilingual-fields-scope";
import { BilingualNameFields } from "@/components/bilingual-name-fields";
import { Badge, EmptyState, PageHeader, Panel } from "@/components/ui";
import { deleteAssetAction, moveAssetAction, updateAssetAction } from "@/lib/actions";
import {
  assetStatusLabels,
  assetUsageStateLabels,
  capacityUnitLabels,
  capacityUnitValues,
  commonColorValues,
  commonColorLabels,
  netWeightUnitLabels,
  netWeightUnitValues,
  placementConfidenceLabels,
  sensitivityLabels,
  trackingModeLabels,
} from "@/lib/constants";
import { buildLocationPath, getAssetDetail, movementTone } from "@/lib/data";
import { formatAssetLabel, formatColorLabel, formatDateTime } from "@/lib/present";

export default async function AssetDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ assetId: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { assetId } = await params;
  const pageParams = await searchParams;
  const data = await getAssetDetail(assetId);

  if (!data.asset) {
    return <EmptyState title={data.dictionary.assets.notFound} />;
  }

  const suggestions = data.assetFieldSuggestions ?? {
    brands: [],
    models: [],
    variants: [],
    subvariants: [],
    barcodeSources: [],
  };
  const locationOptions = data.locations.map((location) => ({
    id: location.id,
    path: buildLocationPath(data.locations, location.id, data.locale) || location.code || location.id,
    code: location.code,
    nameEn: location.nameEn,
    nameZh: location.nameZh,
  }));
  const shareLocationPath = data.locationPath || data.dictionary.assets.currentLocationFallback;
  const shareAssetInfo = [
    `${data.dictionary.common.itemCode}: ${data.asset.assetCode}`,
    `${data.dictionary.common.englishName}: ${data.asset.nameEn || "-"}`,
    `${data.dictionary.common.chineseName}: ${data.asset.nameZh || "-"}`,
    `${data.dictionary.common.location}: ${shareLocationPath}`,
    `${data.dictionary.common.trackingMode}: ${trackingModeLabels[data.asset.trackingMode][data.locale === "ZH_CN" ? "zh" : "en"]}`,
    `${data.dictionary.common.usageState}: ${data.asset.usageState ? assetUsageStateLabels[data.asset.usageState][data.locale === "ZH_CN" ? "zh" : "en"] : "-"}`,
    `${data.dictionary.common.lowStock}: ${data.asset.isLowStock ? data.dictionary.common.yes : data.dictionary.common.no}`,
    `${data.dictionary.common.quantity}: ${data.asset.quantity}`,
    `${data.dictionary.common.sensitivity}: ${sensitivityLabels[data.asset.sensitivityLevel][data.locale === "ZH_CN" ? "zh" : "en"]}`,
    `${data.dictionary.common.status}: ${assetStatusLabels[data.asset.status][data.locale === "ZH_CN" ? "zh" : "en"]}`,
    `${data.dictionary.common.primaryColor}: ${formatColorLabel(data.locale, data.asset.primaryColor || data.asset.color) || "-"}`,
    `${data.dictionary.common.secondaryColor}: ${formatColorLabel(data.locale, data.asset.secondaryColor) || "-"}`,
    `${data.dictionary.common.brand}: ${data.asset.brand || "-"}`,
    `${data.dictionary.common.model}: ${data.asset.model || "-"}`,
    `${data.dictionary.common.variant}: ${data.locale === "ZH_CN" ? data.asset.variantZh || data.asset.variant || "-" : data.asset.variant || data.asset.variantZh || "-"}`,
    `${data.dictionary.common.subvariant}: ${data.locale === "ZH_CN" ? data.asset.subvariantZh || data.asset.subvariant || "-" : data.asset.subvariant || data.asset.subvariantZh || "-"}`,
    `${data.dictionary.common.barcode}: ${data.asset.barcodeValue || "-"}`,
    `${data.dictionary.common.barcodeFormat}: ${data.asset.barcodeFormat || "-"}`,
    `${data.dictionary.common.barcodeSource}: ${data.asset.barcodeSource || "-"}`,
    `${data.dictionary.common.capacity}: ${data.asset.capacityValue && data.asset.capacityUnit ? `${data.asset.capacityValue} ${capacityUnitLabels[data.asset.capacityUnit as keyof typeof capacityUnitLabels][data.locale === "ZH_CN" ? "zh" : "en"]}` : "-"}`,
    `${data.dictionary.common.netWeight}: ${data.asset.netWeightValue && data.asset.netWeightUnit ? `${data.asset.netWeightValue} ${netWeightUnitLabels[data.asset.netWeightUnit as keyof typeof netWeightUnitLabels][data.locale === "ZH_CN" ? "zh" : "en"]}` : "-"}`,
    `${data.dictionary.common.lastVerified}: ${formatDateTime(data.asset.lastVerifiedAt, data.localeCode)}`,
    `${data.dictionary.common.description}: ${data.asset.description || "-"}`,
    `${data.dictionary.common.notes}: ${data.asset.notes || "-"}`,
    "",
    `${data.dictionary.assets.movementTitle}:`,
    ...data.asset.placements.map(
      (placement) =>
        `- ${placement.locationId ? buildLocationPath(data.locations, placement.locationId, data.locale) : data.dictionary.assets.currentLocationFallback} | ${placementConfidenceLabels[placement.confidence][data.locale === "ZH_CN" ? "zh" : "en"]} | ${formatDateTime(placement.movedAt, data.localeCode)}${placement.note ? ` | ${placement.note}` : ""}`,
    ),
  ].join("\n");

  return (
    <>
      <PageHeader
        title={formatAssetLabel(data.locale, data.asset)}
        subtitle={data.locationPath || data.dictionary.assets.currentLocationFallback}
        action={
          <AssetShareActions
            locationPath={shareLocationPath}
            assetInfo={shareAssetInfo}
            labels={{
              copyLocationPath: data.dictionary.assets.copyLocationPath,
              copyAssetInfo: data.dictionary.assets.copyAssetInfo,
              copiedLocationPath: data.dictionary.assets.copiedLocationPath,
              copiedAssetInfo: data.dictionary.assets.copiedAssetInfo,
            }}
          />
        }
      />

      <div className="grid-2">
        <Panel title={data.dictionary.assets.detailTitle}>
          <div className="section-stack">
            <div className="split-line">
              <span>{data.dictionary.common.itemCode}</span>
              <strong>{data.asset.assetCode}</strong>
            </div>
            <div className="split-line">
              <span>{data.dictionary.common.sensitivity}</span>
              <Badge
                label={sensitivityLabels[data.asset.sensitivityLevel][data.locale === "ZH_CN" ? "zh" : "en"]}
                tone="neutral"
              />
            </div>
            <div className="split-line">
              <span>{data.dictionary.common.trackingMode}</span>
              <span>{trackingModeLabels[data.asset.trackingMode][data.locale === "ZH_CN" ? "zh" : "en"]}</span>
            </div>
            <div className="split-line">
              <span>{data.dictionary.common.usageState}</span>
              <span>
                {data.asset.usageState
                  ? assetUsageStateLabels[data.asset.usageState][data.locale === "ZH_CN" ? "zh" : "en"]
                  : "-"}
              </span>
            </div>
            <div className="split-line">
              <span>{data.dictionary.common.lowStock}</span>
              <span>{data.asset.isLowStock ? data.dictionary.common.yes : data.dictionary.common.no}</span>
            </div>
            <div className="split-line">
              <span>{data.dictionary.common.quantity}</span>
              <span>{data.asset.quantity}</span>
            </div>
            <div className="split-line">
              <span>{data.dictionary.common.status}</span>
              <Badge
                label={assetStatusLabels[data.asset.status][data.locale === "ZH_CN" ? "zh" : "en"]}
                tone={data.asset.status === "MISSING" ? "danger" : "neutral"}
              />
            </div>
            <div className="split-line">
              <span>{data.dictionary.common.lastVerified}</span>
              <span>{formatDateTime(data.asset.lastVerifiedAt, data.localeCode)}</span>
            </div>
            <div className="split-line">
              <span>{data.dictionary.common.primaryColor}</span>
              <span>{formatColorLabel(data.locale, data.asset.primaryColor || data.asset.color) || "-"}</span>
            </div>
            <div className="split-line">
              <span>{data.dictionary.common.secondaryColor}</span>
              <span>{formatColorLabel(data.locale, data.asset.secondaryColor) || "-"}</span>
            </div>
            <div className="split-line">
              <span>{data.dictionary.common.brand}</span>
              <span>{data.asset.brand || "-"}</span>
            </div>
            <div className="split-line">
              <span>{data.dictionary.common.model}</span>
              <span>{data.asset.model || "-"}</span>
            </div>
            <div className="split-line">
              <span>{data.dictionary.common.variant}</span>
              <span>{data.locale === "ZH_CN" ? data.asset.variantZh || data.asset.variant || "-" : data.asset.variant || data.asset.variantZh || "-"}</span>
            </div>
            <div className="split-line">
              <span>{data.dictionary.common.subvariant}</span>
              <span>{data.locale === "ZH_CN" ? data.asset.subvariantZh || data.asset.subvariant || "-" : data.asset.subvariant || data.asset.subvariantZh || "-"}</span>
            </div>
            <div className="split-line">
              <span>{data.dictionary.common.barcode}</span>
              <span>{data.asset.barcodeValue || "-"}</span>
            </div>
            <div className="split-line">
              <span>{data.dictionary.common.barcodeFormat}</span>
              <span>{data.asset.barcodeFormat || "-"}</span>
            </div>
            <div className="split-line">
              <span>{data.dictionary.common.barcodeSource}</span>
              <span>{data.asset.barcodeSource || "-"}</span>
            </div>
            <div className="split-line">
              <span>{data.dictionary.common.capacity}</span>
              <span>
                {data.asset.capacityValue && data.asset.capacityUnit
                  ? `${data.asset.capacityValue} ${capacityUnitLabels[data.asset.capacityUnit as keyof typeof capacityUnitLabels][data.locale === "ZH_CN" ? "zh" : "en"]}`
                  : "-"}
              </span>
            </div>
            <div className="split-line">
              <span>{data.dictionary.common.netWeight}</span>
              <span>
                {data.asset.netWeightValue && data.asset.netWeightUnit
                  ? `${data.asset.netWeightValue} ${netWeightUnitLabels[data.asset.netWeightUnit as keyof typeof netWeightUnitLabels][data.locale === "ZH_CN" ? "zh" : "en"]}`
                  : "-"}
              </span>
            </div>
            <div className="stack">
              <strong>{data.dictionary.common.description}</strong>
              <div className="muted">{data.asset.description || "-"}</div>
            </div>
            <div className="stack">
              <strong>{data.dictionary.common.notes}</strong>
              <div className="muted">{data.asset.notes || "-"}</div>
            </div>
          </div>
        </Panel>

        <Panel title={data.dictionary.assets.moveTitle}>
          <div className="stack">
            <p className="muted">{data.dictionary.assets.moveHelp}</p>
            <form action={moveAssetAction} className="form-grid">
              <input type="hidden" name="assetId" value={data.asset.id} />

              <AssetLocationField
                inputId="locationId"
                inputName="locationId"
                label={data.dictionary.common.location}
                defaultLocationId={data.asset.currentLocationId}
                emptyLabel={data.dictionary.assets.currentLocationFallback}
                options={locationOptions}
                storageKey={`miniassets:asset-move-location:${data.asset.id}`}
                labels={{
                  placeholder: data.dictionary.assets.locationPickerPlaceholder,
                  help: data.dictionary.assets.locationPickerHelp,
                  matched: data.dictionary.assets.locationPickerMatched,
                  unresolved: data.dictionary.assets.locationPickerUnresolved,
                  advanced: data.dictionary.assets.locationPickerAdvanced,
                  locationId: data.dictionary.assets.locationPickerLocationId,
                }}
              />

              <div className="field-stack">
                <label htmlFor="status">{data.dictionary.common.status}</label>
                <select id="status" name="status" defaultValue={data.asset.status}>
                  {Object.entries(assetStatusLabels).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value[data.locale === "ZH_CN" ? "zh" : "en"]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-stack">
                <label htmlFor="confidence">{data.dictionary.common.confidence}</label>
                <select id="confidence" name="confidence" defaultValue="VERIFIED">
                  {Object.entries(placementConfidenceLabels).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value[data.locale === "ZH_CN" ? "zh" : "en"]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-stack full-span">
                <label htmlFor="note">{data.dictionary.common.notes}</label>
                <textarea id="note" name="note" />
              </div>

              <div className="full-span">
                <button type="submit">{data.dictionary.common.move}</button>
              </div>
            </form>
          </div>
        </Panel>
      </div>

      <Panel title={data.dictionary.assets.editTitle}>
        {pageParams.saved === "1" ? <p className="muted save-confirmation">{data.dictionary.common.savedMessage}</p> : null}
        <form action={updateAssetAction} className="form-grid">
          <input type="hidden" name="assetId" value={data.asset.id} />
          <input type="hidden" name="workspaceId" value={data.asset.workspaceId} />

          <div className="stack full-span scanner-inline-block">
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

          <AssetLocationField
            inputId="currentLocationId"
            inputName="currentLocationId"
            label={data.dictionary.common.location}
            defaultLocationId={data.asset.currentLocationId}
            emptyLabel={data.dictionary.assets.currentLocationFallback}
            options={locationOptions}
            storageKey={`miniassets:asset-edit-location:${data.asset.id}`}
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
              defaultEnglishValue={data.asset.nameEn ?? ""}
              defaultChineseValue={data.asset.nameZh ?? ""}
            />

            <div className="field-stack">
              <label htmlFor="primaryColor">{data.dictionary.common.primaryColor}</label>
              <select
                id="primaryColor"
                name="primaryColor"
                defaultValue={data.asset.primaryColor ?? data.asset.color ?? ""}
              >
                <option value="">{data.dictionary.common.optional}</option>
                {!commonColorValues.includes((data.asset.primaryColor ?? data.asset.color ?? "") as (typeof commonColorValues)[number]) &&
                (data.asset.primaryColor ?? data.asset.color) ? (
                  <option value={data.asset.primaryColor ?? data.asset.color ?? ""}>
                    {data.asset.primaryColor ?? data.asset.color}
                  </option>
                ) : null}
                {commonColorValues.map((value) => (
                  <option key={`primary-${value}`} value={value}>
                    {commonColorLabels[value][data.locale === "ZH_CN" ? "zh" : "en"]}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-stack">
              <label htmlFor="secondaryColor">{data.dictionary.common.secondaryColor}</label>
              <select
                id="secondaryColor"
                name="secondaryColor"
                defaultValue={data.asset.secondaryColor ?? ""}
              >
                <option value="">{data.dictionary.common.optional}</option>
                {!commonColorValues.includes((data.asset.secondaryColor ?? "") as (typeof commonColorValues)[number]) &&
                data.asset.secondaryColor ? (
                  <option value={data.asset.secondaryColor}>{data.asset.secondaryColor}</option>
                ) : null}
                {commonColorValues.map((value) => (
                  <option key={`secondary-${value}`} value={value}>
                    {commonColorLabels[value][data.locale === "ZH_CN" ? "zh" : "en"]}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-stack">
              <label htmlFor="brand">{data.dictionary.common.brand}</label>
              <input id="brand" name="brand" list="brandSuggestions" defaultValue={data.asset.brand ?? ""} />
            </div>

            <div className="field-stack">
              <label htmlFor="model">{data.dictionary.common.model}</label>
              <input id="model" name="model" list="modelSuggestions" defaultValue={data.asset.model ?? ""} />
            </div>

            <BilingualNameFields
              locale={data.locale}
              englishLabel={data.dictionary.common.variant}
              chineseLabel={data.dictionary.common.variant}
              englishId="variant"
              chineseId="variantZh"
              englishName="variant"
              chineseName="variantZh"
              defaultEnglishValue={data.asset.variant ?? ""}
              defaultChineseValue={data.asset.variantZh ?? ""}
            />

            <BilingualNameFields
              locale={data.locale}
              englishLabel={data.dictionary.common.subvariant}
              chineseLabel={data.dictionary.common.subvariant}
              englishId="subvariant"
              chineseId="subvariantZh"
              englishName="subvariant"
              chineseName="subvariantZh"
              defaultEnglishValue={data.asset.subvariant ?? ""}
              defaultChineseValue={data.asset.subvariantZh ?? ""}
            />
          </BilingualFieldsScope>

          <div className="field-stack">
            <label htmlFor="barcodeValue">{data.dictionary.common.barcode}</label>
            <input id="barcodeValue" name="barcodeValue" defaultValue={data.asset.barcodeValue ?? ""} />
          </div>

          <div className="field-stack">
            <label htmlFor="barcodeFormat">{data.dictionary.common.barcodeFormat}</label>
            <input id="barcodeFormat" name="barcodeFormat" defaultValue={data.asset.barcodeFormat ?? ""} />
          </div>

          <div className="field-stack">
            <label htmlFor="barcodeSource">{data.dictionary.common.barcodeSource}</label>
            <input
              id="barcodeSource"
              name="barcodeSource"
              list="barcodeSourceSuggestions"
              defaultValue={data.asset.barcodeSource ?? ""}
            />
          </div>

            <div className="field-stack">
              <label htmlFor="capacityValue">{data.dictionary.common.capacity}</label>
              <input
                id="capacityValue"
                name="capacityValue"
                type="number"
                min="0"
                step="0.01"
                defaultValue={data.asset.capacityValue ?? ""}
              />
            </div>

            <div className="field-stack">
              <label htmlFor="capacityUnit">{data.dictionary.common.unit}</label>
              <select id="capacityUnit" name="capacityUnit" defaultValue={data.asset.capacityUnit ?? ""}>
                <option value="">{data.dictionary.common.optional}</option>
                {capacityUnitValues.map((value) => (
                  <option key={value} value={value}>
                    {capacityUnitLabels[value][data.locale === "ZH_CN" ? "zh" : "en"]}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-stack">
              <label htmlFor="netWeightValue">{data.dictionary.common.netWeight}</label>
              <input
                id="netWeightValue"
                name="netWeightValue"
                type="number"
                min="0"
                step="0.01"
                defaultValue={data.asset.netWeightValue ?? ""}
              />
            </div>

            <div className="field-stack">
              <label htmlFor="netWeightUnit">{data.dictionary.common.unit}</label>
              <select id="netWeightUnit" name="netWeightUnit" defaultValue={data.asset.netWeightUnit ?? ""}>
                <option value="">{data.dictionary.common.optional}</option>
                {netWeightUnitValues.map((value) => (
                  <option key={value} value={value}>
                    {netWeightUnitLabels[value][data.locale === "ZH_CN" ? "zh" : "en"]}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-stack">
              <label htmlFor="trackingMode">{data.dictionary.common.trackingMode}</label>
              <select id="trackingMode" name="trackingMode" defaultValue={data.asset.trackingMode}>
                {Object.entries(trackingModeLabels).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value[data.locale === "ZH_CN" ? "zh" : "en"]}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-stack">
              <label htmlFor="usageState">{data.dictionary.common.usageState}</label>
              <select id="usageState" name="usageState" defaultValue={data.asset.usageState ?? ""}>
                <option value="">{data.dictionary.common.optional}</option>
                {Object.entries(assetUsageStateLabels).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value[data.locale === "ZH_CN" ? "zh" : "en"]}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-stack">
              <label htmlFor="quantity">{data.dictionary.common.quantity}</label>
              <input id="quantity" name="quantity" type="number" min="1" defaultValue={data.asset.quantity} />
            </div>

            <div className="field-stack">
              <label htmlFor="sensitivityLevel">{data.dictionary.common.sensitivity}</label>
              <select id="sensitivityLevel" name="sensitivityLevel" defaultValue={data.asset.sensitivityLevel}>
                {Object.entries(sensitivityLabels).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value[data.locale === "ZH_CN" ? "zh" : "en"]}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-stack">
              <label className="checkbox-row" htmlFor="isLowStock">
                <input
                  id="isLowStock"
                  name="isLowStock"
                  type="checkbox"
                  value="true"
                  defaultChecked={data.asset.isLowStock}
                />
                <span>{data.dictionary.common.lowStock}</span>
              </label>
            </div>

            <div className="field-stack full-span">
              <label htmlFor="description">{data.dictionary.common.description}</label>
              <textarea id="description" name="description" defaultValue={data.asset.description ?? ""} />
            </div>

            <div className="field-stack full-span">
              <label htmlFor="notes">{data.dictionary.common.notes}</label>
              <textarea id="notes" name="notes" defaultValue={data.asset.notes ?? ""} />
            </div>

          <div className="full-span">
            <button type="submit">{data.dictionary.common.save}</button>
          </div>
        </form>
        <div className="asset-danger-zone">
            <p className="muted">{data.dictionary.assets.deleteAssetHelp}</p>
            <form action={deleteAssetAction} className="asset-delete-form">
              <input type="hidden" name="assetId" value={data.asset.id} />
              <button type="submit" className="ghost-button danger-button">
                {data.dictionary.assets.deleteAsset}
              </button>
            </form>
        </div>
        <datalist id="brandSuggestions">
          {suggestions.brands.map((value) => (
            <option key={`brand-${value}`} value={value} />
          ))}
        </datalist>
        <datalist id="modelSuggestions">
          {suggestions.models.map((value) => (
            <option key={`model-${value}`} value={value} />
          ))}
        </datalist>
        <datalist id="variantSuggestions">
          {suggestions.variants.map((value) => (
            <option key={`variant-${value}`} value={value} />
          ))}
        </datalist>
        <datalist id="subvariantSuggestions">
          {suggestions.subvariants.map((value) => (
            <option key={`subvariant-${value}`} value={value} />
          ))}
        </datalist>
        <datalist id="barcodeSourceSuggestions">
          {suggestions.barcodeSources.map((value) => (
            <option key={`barcode-source-${value}`} value={value} />
          ))}
        </datalist>
      </Panel>

      <Panel title={data.dictionary.assets.movementTitle}>
        <div className="section-stack">
          {data.asset.placements.map((placement) => (
            <div key={placement.id} className="list-row">
              <div>
                <strong>
                  {placement.locationId
                    ? buildLocationPath(data.locations, placement.locationId, data.locale)
                    : data.dictionary.assets.currentLocationFallback}
                </strong>
                <div className="tree-path">{placement.note || ""}</div>
              </div>
              <div className="row-meta">
                <Badge
                  label={placementConfidenceLabels[placement.confidence][data.locale === "ZH_CN" ? "zh" : "en"]}
                  tone={movementTone(placement.confidence)}
                />
                <div>{formatDateTime(placement.movedAt, data.localeCode)}</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}
