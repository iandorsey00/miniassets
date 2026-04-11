import Link from "next/link";

import { bulkUpdateAssetsByLocationAction } from "@/lib/actions";
import { AssetRow, Badge, EmptyState, PageHeader, Panel } from "@/components/ui";
import { assetStatusLabels } from "@/lib/constants";
import { buildLocationPath, getAssetsData } from "@/lib/data";
import { formatAssetLabel } from "@/lib/present";

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<{
    workspaceId?: string;
    q?: string;
    status?: "ACTIVE" | "MISSING" | "ARCHIVED";
    usageState?: "STORAGE" | "IN_USE";
    assorted?: "true";
    locationId?: string;
    bulkUpdated?: "1";
    bulkCount?: string;
    bulkError?: "confirm";
  }>;
}) {
  const params = await searchParams;
  const data = await getAssetsData(params);
  const locationOptions = data.locations
    .map((location) => ({
      id: location.id,
      path: buildLocationPath(data.locations, location.id, data.locale),
    }))
    .sort((left, right) => left.path.localeCompare(right.path, data.localeCode));
  const bulkCount = Number.parseInt(params.bulkCount ?? "0", 10);
  const bulkSavedMessage =
    params.bulkUpdated === "1"
      ? data.dictionary.assets.bulkEditSaved.replace("{count}", String(Number.isFinite(bulkCount) ? bulkCount : 0))
      : null;
  const bulkErrorMessage = params.bulkError === "confirm" ? data.dictionary.assets.bulkEditConfirmRequired : null;
  const bulkCountMessage = data.dictionary.assets.bulkEditCount.replace("{count}", String(data.assets.length));

  return (
    <>
      <PageHeader
        title={data.dictionary.assets.title}
        subtitle={data.dictionary.assets.subtitle}
        action={
          <Link href="/assets/new" className="button">
            {data.dictionary.nav.createAsset}
          </Link>
        }
      />

      <Panel>
        <div className="section-stack">
          <div className="split-line">
            <div className="muted">{data.dictionary.assets.lookupHelp}</div>
            <div className="button-content">
              <Badge label={data.dictionary.common.optional} tone="accent" />
            </div>
          </div>

          <form action="/assets" className="form-grid">
            {data.currentWorkspace?.id ? <input type="hidden" name="workspaceId" value={data.currentWorkspace.id} /> : null}
            <div className="field-stack full-span">
              <label htmlFor="assetSearch">{data.dictionary.common.search}</label>
              <input
                id="assetSearch"
                name="q"
                defaultValue={params.q ?? ""}
                placeholder={data.dictionary.assets.searchPlaceholder}
              />
            </div>

            <div className="field-stack">
              <label htmlFor="locationFilter">{data.dictionary.assets.locationFilter}</label>
              <select id="locationFilter" name="locationId" defaultValue={params.locationId ?? ""}>
                <option value="">{data.dictionary.common.optional}</option>
                {locationOptions.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.path}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-stack">
              <label htmlFor="statusFilter">{data.dictionary.common.status}</label>
              <select id="statusFilter" name="status" defaultValue={params.status ?? ""}>
                <option value="">{data.dictionary.common.optional}</option>
                {Object.entries(assetStatusLabels).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value[data.locale === "ZH_CN" ? "zh" : "en"]}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-stack">
              <label htmlFor="usageStateFilter">{data.dictionary.common.usageState}</label>
              <select id="usageStateFilter" name="usageState" defaultValue={params.usageState ?? ""}>
                <option value="">{data.dictionary.common.optional}</option>
                <option value="STORAGE">{data.dictionary.common.storage}</option>
                <option value="IN_USE">{data.dictionary.common.inUse}</option>
              </select>
            </div>

            <div className="field-stack">
              <label htmlFor="assortedFilter">{data.dictionary.common.assorted}</label>
              <select id="assortedFilter" name="assorted" defaultValue={params.assorted ?? ""}>
                <option value="">{data.dictionary.common.optional}</option>
                <option value="true">{data.dictionary.common.yes}</option>
              </select>
            </div>

            <div className="field-stack search-actions">
              <span className="sr-only">{data.dictionary.common.search}</span>
              <button type="submit">{data.dictionary.common.search}</button>
            </div>
          </form>

          {params.locationId ? (
            <div className="location-filter-summary">
              <p className="muted">{data.dictionary.assets.bulkEditFilterHint}</p>
              {data.selectedLocationPath ? <p className="muted">{data.selectedLocationPath}</p> : null}
            </div>
          ) : null}
        </div>
      </Panel>

      {params.locationId ? (
        <Panel>
          <div className="section-stack">
            <div className="split-line">
              <div>
                <strong>{data.dictionary.assets.bulkEditTitle}</strong>
                <p className="muted bulk-edit-copy">{data.dictionary.assets.bulkEditHelp}</p>
                <p className="muted bulk-edit-copy">{bulkCountMessage}</p>
                {bulkSavedMessage ? <p className="muted save-confirmation">{bulkSavedMessage}</p> : null}
                {bulkErrorMessage ? <p className="form-error">{bulkErrorMessage}</p> : null}
              </div>
              <div className="button-content">
                <Badge label={String(data.assets.length)} tone="accent" />
              </div>
            </div>

            <form action={bulkUpdateAssetsByLocationAction} className="form-grid">
              <input type="hidden" name="workspaceId" value={data.currentWorkspace?.id ?? ""} />
              <input type="hidden" name="locationId" value={params.locationId} />
              <input type="hidden" name="q" value={params.q ?? ""} />
              <input type="hidden" name="status" value={params.status ?? ""} />
              <input type="hidden" name="usageStateFilter" value={params.usageState ?? ""} />
              <input type="hidden" name="assorted" value={params.assorted ?? ""} />

              <div className="field-stack">
                <label htmlFor="bulkUsageState">{data.dictionary.assets.bulkEditUsageState}</label>
                <select id="bulkUsageState" name="nextUsageState" defaultValue="STORAGE" disabled={!data.assets.length}>
                  <option value="STORAGE">{data.dictionary.common.storage}</option>
                  <option value="IN_USE">{data.dictionary.common.inUse}</option>
                  <option value="CLEAR">{data.dictionary.assets.bulkEditClearUsageState}</option>
                </select>
              </div>

              <div className="field-stack search-actions bulk-edit-actions">
                <label className="checkbox-row bulk-edit-confirm" htmlFor="confirmBulk">
                  <input id="confirmBulk" name="confirmBulk" type="checkbox" disabled={!data.assets.length} />
                  <span>{data.dictionary.assets.bulkEditConfirm}</span>
                </label>
                <button type="submit" disabled={!data.assets.length}>
                  {data.dictionary.assets.bulkEditApply}
                </button>
              </div>
            </form>
          </div>
        </Panel>
      ) : null}

      {data.assets.length ? (
        <div className="section-stack">
          {data.assets.map((asset) => {
            const path =
              asset.currentLocationId && data.locations.length
                ? buildLocationPath(data.locations, asset.currentLocationId, data.locale)
                : data.dictionary.assets.currentLocationFallback;

            return (
              <AssetRow
                key={asset.id}
                href={`/assets/${asset.id}`}
                code={asset.assetCode}
                title={formatAssetLabel(data.locale, asset)}
                meta={path}
                trailing={
                  <Badge
                    label={assetStatusLabels[asset.status][data.locale === "ZH_CN" ? "zh" : "en"]}
                    tone={asset.status === "MISSING" ? "danger" : "neutral"}
                  />
                }
              />
            );
          })}
        </div>
      ) : (
        <EmptyState title={data.dictionary.assets.empty} />
      )}
    </>
  );
}
