import { BarcodeScanner } from "@/components/barcode-scanner";
import { Badge, EmptyState, PageHeader, Panel } from "@/components/ui";
import { moveAssetAction, updateAssetAction } from "@/lib/actions";
import { assetStatusLabels, placementConfidenceLabels, sensitivityLabels, trackingModeLabels } from "@/lib/constants";
import { buildLocationPath, getAssetDetail, movementTone } from "@/lib/data";
import { formatAssetLabel, formatDateTime } from "@/lib/present";

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ assetId: string }>;
}) {
  const { assetId } = await params;
  const data = await getAssetDetail(assetId);

  if (!data.asset) {
    return <EmptyState title={data.dictionary.assets.notFound} />;
  }

  return (
    <>
      <PageHeader
        title={formatAssetLabel(data.locale, data.asset)}
        subtitle={data.locationPath || data.dictionary.assets.currentLocationFallback}
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
                tone="warning"
              />
            </div>
            <div className="split-line">
              <span>{data.dictionary.common.trackingMode}</span>
              <span>{trackingModeLabels[data.asset.trackingMode][data.locale === "ZH_CN" ? "zh" : "en"]}</span>
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
              <span>{data.dictionary.common.color}</span>
              <span>{data.asset.color || "-"}</span>
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

              <div className="field-stack">
                <label htmlFor="locationId">{data.dictionary.common.location}</label>
                <select id="locationId" name="locationId" defaultValue={data.asset.currentLocationId ?? ""}>
                  <option value="">{data.dictionary.assets.currentLocationFallback}</option>
                  {data.locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {buildLocationPath(data.locations, location.id, data.locale)}
                    </option>
                  ))}
                </select>
              </div>

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
        <div className="grid-2">
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

          <form action={updateAssetAction} className="form-grid">
            <input type="hidden" name="assetId" value={data.asset.id} />
            <input type="hidden" name="workspaceId" value={data.asset.workspaceId} />

            <div className="field-stack">
              <label htmlFor="assetCode">{data.dictionary.common.itemCode}</label>
              <input id="assetCode" name="assetCode" defaultValue={data.asset.assetCode} required />
            </div>

            <div className="field-stack">
              <label htmlFor="currentLocationId">{data.dictionary.common.location}</label>
              <select id="currentLocationId" name="currentLocationId" defaultValue={data.asset.currentLocationId ?? ""}>
                <option value="">{data.dictionary.assets.currentLocationFallback}</option>
                {data.locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {buildLocationPath(data.locations, location.id, data.locale)}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-stack">
              <label htmlFor="nameEn">{data.dictionary.common.englishName}</label>
              <input id="nameEn" name="nameEn" defaultValue={data.asset.nameEn ?? ""} />
            </div>

            <div className="field-stack">
              <label htmlFor="nameZh">{data.dictionary.common.chineseName}</label>
              <input id="nameZh" name="nameZh" defaultValue={data.asset.nameZh ?? ""} />
            </div>

            <div className="field-stack">
              <label htmlFor="color">{data.dictionary.common.color}</label>
              <input id="color" name="color" defaultValue={data.asset.color ?? ""} />
            </div>

            <div className="field-stack">
              <label htmlFor="brand">{data.dictionary.common.brand}</label>
              <input id="brand" name="brand" defaultValue={data.asset.brand ?? ""} />
            </div>

            <div className="field-stack">
              <label htmlFor="model">{data.dictionary.common.model}</label>
              <input id="model" name="model" defaultValue={data.asset.model ?? ""} />
            </div>

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
              <input id="barcodeSource" name="barcodeSource" defaultValue={data.asset.barcodeSource ?? ""} />
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
