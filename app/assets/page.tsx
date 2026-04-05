import Link from "next/link";

import { AssetRow, Badge, EmptyState, PageHeader, Panel } from "@/components/ui";
import { assetStatusLabels } from "@/lib/constants";
import { buildLocationPath, getAssetsData } from "@/lib/data";
import { formatAssetLabel } from "@/lib/present";

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ workspaceId?: string; q?: string; status?: "ACTIVE" | "MISSING" | "ARCHIVED" }>;
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
        <div className="split-line">
          <div className="muted">{data.dictionary.assets.lookupHelp}</div>
          <div className="button-content">
            <Badge label={data.dictionary.common.optional} tone="accent" />
          </div>
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
              <div key={asset.id} className="list-row">
                <AssetRow
                  href={`/assets/${asset.id}`}
                  code={asset.assetCode}
                  title={formatAssetLabel(data.locale, asset)}
                  meta={path}
                />
                <Badge
                  label={assetStatusLabels[asset.status][data.locale === "ZH_CN" ? "zh" : "en"]}
                  tone={asset.status === "MISSING" ? "danger" : "neutral"}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState title={data.dictionary.assets.empty} />
      )}
    </>
  );
}
