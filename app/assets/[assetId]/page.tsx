import { AssetLocationField } from "@/components/asset-location-field";
import { AssetEditForm } from "@/components/asset-edit-form";
import { AssetMoveForm } from "@/components/asset-move-form";
import { AssetShareActions } from "@/components/asset-share-actions";
import { Badge, EmptyState, PageHeader, Panel, StatusNotice } from "@/components/ui";
import { deleteAssetAction, duplicateAssetAction, moveAssetAction, updateAssetAction } from "@/lib/actions";
import {
  assetSizeTypeLabels,
  assetStatusLabels,
  assetStockStatusLabels,
  assetUsageStateLabels,
  assetUsageFrequencyLabels,
  capacityUnitLabels,
  lengthUnitLabels,
  lengthUnitValues,
  netWeightUnitLabels,
  placementConfidenceLabels,
  sensitivityLabels,
  trackingModeLabels,
} from "@/lib/constants";
import { buildLocationPath, getAssetDetail, movementTone } from "@/lib/data";
import { formatAssetLabel, formatColorLabel, formatDateTime, formatSizeLabel } from "@/lib/present";

export default async function AssetDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ assetId: string }>;
  searchParams: Promise<{ saved?: string; moved?: string; moveError?: string }>;
}) {
  const { assetId } = await params;
  const pageParams = await searchParams;
  const data = await getAssetDetail(assetId);

  if (!data.asset) {
    return <EmptyState title={data.dictionary.assets.notFound} />;
  }

  const suggestions = data.assetFieldSuggestions ?? {
    brands: [],
    brandsZh: [],
    models: [],
    variants: [],
    subvariants: [],
    sizes: [],
    barcodeSources: [],
  };
  const locationOptions = data.locations.map((location) => ({
    id: location.id,
    path: buildLocationPath(data.locations, location.id, data.locale) || location.code || location.id,
    locationCode: location.locationCode,
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
    `${data.dictionary.common.locationCode}: ${data.asset.currentLocation?.locationCode || "-"}`,
    `${data.dictionary.common.usageFrequency}: ${assetUsageFrequencyLabels[data.asset.usageFrequency][data.locale === "ZH_CN" ? "zh" : "en"]}`,
    `${data.dictionary.common.stockStatus}: ${assetStockStatusLabels[data.asset.stockStatus][data.locale === "ZH_CN" ? "zh" : "en"]}`,
    `${data.dictionary.common.sizeType}: ${assetSizeTypeLabels[data.asset.sizeType][data.locale === "ZH_CN" ? "zh" : "en"]}`,
    `${data.dictionary.common.trackingMode}: ${trackingModeLabels[data.asset.trackingMode][data.locale === "ZH_CN" ? "zh" : "en"]}`,
    `${data.dictionary.common.usageState}: ${data.asset.usageState ? assetUsageStateLabels[data.asset.usageState][data.locale === "ZH_CN" ? "zh" : "en"] : "-"}`,
    `${data.dictionary.common.lowStock}: ${data.asset.isLowStock ? data.dictionary.common.yes : data.dictionary.common.no}`,
    `${data.asset.isAssorted ? data.dictionary.common.estimatedQuantity : data.dictionary.common.quantity}: ${data.asset.quantity}`,
    `${data.dictionary.common.assorted}: ${data.asset.isAssorted ? data.dictionary.common.yes : data.dictionary.common.no}`,
    `${data.dictionary.common.sensitivity}: ${sensitivityLabels[data.asset.sensitivityLevel][data.locale === "ZH_CN" ? "zh" : "en"]}`,
    `${data.dictionary.common.status}: ${assetStatusLabels[data.asset.status][data.locale === "ZH_CN" ? "zh" : "en"]}`,
    `${data.dictionary.common.primaryColor}: ${formatColorLabel(data.locale, data.asset.primaryColor || data.asset.color) || "-"}`,
    `${data.dictionary.common.secondaryColor}: ${formatColorLabel(data.locale, data.asset.secondaryColor) || "-"}`,
    `${data.dictionary.common.brand}: ${data.locale === "ZH_CN" ? data.asset.brandZh || data.asset.brand || "-" : data.asset.brand || data.asset.brandZh || "-"}`,
    `${data.dictionary.common.model}: ${data.asset.model || "-"}`,
    `${data.dictionary.common.variant}: ${data.locale === "ZH_CN" ? data.asset.variantZh || data.asset.variant || "-" : data.asset.variant || data.asset.variantZh || "-"}`,
    `${data.dictionary.common.subvariant}: ${data.locale === "ZH_CN" ? data.asset.subvariantZh || data.asset.subvariant || "-" : data.asset.subvariant || data.asset.subvariantZh || "-"}`,
    `${data.dictionary.common.size}: ${formatSizeLabel(data.locale, data.asset.size) || "-"}`,
    `${data.dictionary.common.barcode}: ${data.asset.barcodeValue || "-"}`,
    `${data.dictionary.common.barcodeFormat}: ${data.asset.barcodeFormat || "-"}`,
    `${data.dictionary.common.barcodeSource}: ${data.asset.barcodeSource || "-"}`,
    `${data.dictionary.common.length}: ${data.asset.lengthValue && data.asset.lengthUnit ? `${data.asset.lengthValue} ${lengthUnitLabels[data.asset.lengthUnit as keyof typeof lengthUnitLabels][data.locale === "ZH_CN" ? "zh" : "en"]}` : "-"}`,
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

      {pageParams.saved === "1" ? <StatusNotice message={data.dictionary.common.savedMessage} /> : null}

      <div className="grid-2">
        <Panel title={data.dictionary.assets.detailTitle}>
          <div className="section-stack">
            <div className="split-line">
              <span>{data.dictionary.common.itemCode}</span>
              <strong>{data.asset.assetCode}</strong>
            </div>
            <div className="split-line">
              <span>{data.dictionary.common.locationCode}</span>
              <span>{data.asset.currentLocation?.locationCode || "-"}</span>
            </div>
            <div className="split-line">
              <span>{data.dictionary.common.sensitivity}</span>
              <Badge
                label={sensitivityLabels[data.asset.sensitivityLevel][data.locale === "ZH_CN" ? "zh" : "en"]}
                tone="neutral"
              />
            </div>
            <div className="split-line">
              <span>{data.dictionary.common.usageFrequency}</span>
              <span>{assetUsageFrequencyLabels[data.asset.usageFrequency][data.locale === "ZH_CN" ? "zh" : "en"]}</span>
            </div>
            <div className="split-line">
              <span>{data.dictionary.common.stockStatus}</span>
              <span>{assetStockStatusLabels[data.asset.stockStatus][data.locale === "ZH_CN" ? "zh" : "en"]}</span>
            </div>
            <div className="split-line">
              <span>{data.dictionary.common.sizeType}</span>
              <span>{assetSizeTypeLabels[data.asset.sizeType][data.locale === "ZH_CN" ? "zh" : "en"]}</span>
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
              <span>{data.dictionary.common.assorted}</span>
              <span>{data.asset.isAssorted ? data.dictionary.common.yes : data.dictionary.common.no}</span>
            </div>
            <div className="split-line">
              <span>{data.dictionary.common.lowStock}</span>
              <span>{data.asset.isLowStock ? data.dictionary.common.yes : data.dictionary.common.no}</span>
            </div>
            <div className="split-line">
              <span>{data.asset.isAssorted ? data.dictionary.common.estimatedQuantity : data.dictionary.common.quantity}</span>
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
              <span>{data.locale === "ZH_CN" ? data.asset.brandZh || data.asset.brand || "-" : data.asset.brand || data.asset.brandZh || "-"}</span>
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
              <span>{data.dictionary.common.size}</span>
              <span>{formatSizeLabel(data.locale, data.asset.size) || "-"}</span>
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
              <span>{data.dictionary.common.length}</span>
              <span>
                {data.asset.lengthValue && data.asset.lengthUnit
                  ? `${data.asset.lengthValue} ${lengthUnitLabels[data.asset.lengthUnit as keyof typeof lengthUnitLabels][data.locale === "ZH_CN" ? "zh" : "en"]}`
                  : "-"}
              </span>
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
            {pageParams.moved === "1" ? <p className="muted save-confirmation">{data.dictionary.assets.moveSaved}</p> : null}
            {pageParams.moveError === "location" ? (
              <p className="form-error">{data.dictionary.assets.moveLocationRequired}</p>
            ) : null}
            <AssetMoveForm
              assetId={data.asset.id}
              defaultLocationId={data.asset.currentLocationId}
              defaultStatus={data.asset.status}
              action={moveAssetAction}
              label={data.dictionary.common.location}
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
                status: data.dictionary.common.status,
                confidence: data.dictionary.common.confidence,
                notes: data.dictionary.common.notes,
                move: data.dictionary.common.move,
                locationRequired: data.dictionary.assets.moveLocationRequired,
              }}
              statusOptions={Object.entries(assetStatusLabels).map(([key, value]) => ({
                value: key,
                label: value[data.locale === "ZH_CN" ? "zh" : "en"],
              }))}
              confidenceOptions={Object.entries(placementConfidenceLabels).map(([key, value]) => ({
                value: key,
                label: value[data.locale === "ZH_CN" ? "zh" : "en"],
              }))}
            />
          </div>
        </Panel>
      </div>

      <Panel title={data.dictionary.assets.editTitle}>
        <AssetEditForm
          action={updateAssetAction}
          asset={data.asset}
          locale={data.locale}
          dictionary={{
            common: data.dictionary.common,
            assets: data.dictionary.assets,
          }}
          locationOptions={locationOptions}
          assetFieldSuggestions={suggestions}
          assetTemplates={data.assetTemplates}
        />
        <div className="asset-utility-zone">
          <p className="muted">{data.dictionary.assets.duplicateAssetHelp}</p>
          <form action={duplicateAssetAction} className="asset-delete-form">
            <input type="hidden" name="assetId" value={data.asset.id} />
            <button type="submit" className="ghost-button">
              {data.dictionary.assets.duplicateAsset}
            </button>
          </form>
        </div>
        <div className="asset-danger-zone">
            <p className="muted">{data.dictionary.assets.deleteAssetHelp}</p>
            <form action={deleteAssetAction} className="asset-delete-form">
              <input type="hidden" name="assetId" value={data.asset.id} />
              <button type="submit" className="ghost-button danger-button">
                {data.dictionary.assets.deleteAsset}
              </button>
            </form>
        </div>
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
