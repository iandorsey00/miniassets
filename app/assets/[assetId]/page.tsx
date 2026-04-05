import { Badge, EmptyState, PageHeader, Panel } from "@/components/ui";
import { moveAssetAction } from "@/lib/actions";
import { assetStatusLabels, placementConfidenceLabels, sensitivityLabels, trackingModeLabels } from "@/lib/constants";
import { buildLocationPath, getAssetDetail, movementTone } from "@/lib/data";
import { formatDateTime, pickLocalizedText } from "@/lib/present";

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ assetId: string }>;
}) {
  const { assetId } = await params;
  const data = await getAssetDetail(assetId);

  if (!data.asset) {
    return <EmptyState title="Asset not found" />;
  }

  return (
    <>
      <PageHeader
        title={pickLocalizedText(data.locale, data.asset)}
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
              <span>{data.dictionary.common.barcode}</span>
              <span>{data.asset.barcodeValue || "-"}</span>
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
                  <option value="ACTIVE">Active</option>
                  <option value="MISSING">Missing</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>

              <div className="field-stack">
                <label htmlFor="confidence">{data.dictionary.common.confidence}</label>
                <select id="confidence" name="confidence" defaultValue="VERIFIED">
                  <option value="VERIFIED">Verified</option>
                  <option value="ASSUMED">Assumed</option>
                  <option value="REPORTED">Reported</option>
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
