import Link from "next/link";

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
  }>;
}) {
  const params = await searchParams;
  const data = await getAssetsData(params);

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
        </div>
      </Panel>

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
