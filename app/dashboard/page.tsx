import Link from "next/link";

import { Badge, EmptyState, PageHeader, Panel, StatCard } from "@/components/ui";
import { assetStatusLabels, placementConfidenceLabels } from "@/lib/constants";
import { getDashboardData } from "@/lib/data";
import { formatDateTime, pickLocalizedText } from "@/lib/present";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ workspaceId?: string }>;
}) {
  const params = await searchParams;
  const data = await getDashboardData(params.workspaceId);

  return (
    <>
      <PageHeader title={data.dictionary.dashboard.title} subtitle={data.dictionary.dashboard.subtitle} />

      <div className="hero-note">{data.dictionary.dashboard.secrecyNotice}</div>

      {data.stats ? (
        <div className="grid-4">
          <StatCard label={data.dictionary.dashboard.trackedAssets} value={data.stats.assetCount} />
          <StatCard label={data.dictionary.dashboard.estimatedTotalItems} value={data.stats.estimatedTotalItems} />
          <StatCard label={data.dictionary.dashboard.locationNodes} value={data.stats.locationCount} />
          <StatCard label={data.dictionary.dashboard.missingAssets} value={data.stats.missingCount} />
          <StatCard label={data.dictionary.dashboard.recentlyVerified} value={data.stats.recentlyVerifiedCount} />
        </div>
      ) : (
        <EmptyState title={data.dictionary.common.noWorkspace} />
      )}

      <div className="grid-2">
        <Panel title={data.dictionary.dashboard.recentMoves}>
          <div className="section-stack">
            {data.recentMoves.length ? (
              data.recentMoves.map((move) => (
                <div key={move.id} className="list-row">
                  <div>
                    <div className="asset-code">{move.asset.assetCode}</div>
                    <strong>{pickLocalizedText(data.locale, move.asset)}</strong>
                    <div className="tree-path">
                      {move.location ? pickLocalizedText(data.locale, move.location) : data.dictionary.dashboard.missingAssets}
                    </div>
                  </div>
                  <div className="row-meta">
                    <Badge
                      label={
                        placementConfidenceLabels[move.confidence][data.locale === "ZH_CN" ? "zh" : "en"]
                      }
                      tone={move.confidence === "VERIFIED" ? "success" : move.confidence === "ASSUMED" ? "warning" : "accent"}
                    />
                    <div>{formatDateTime(move.movedAt, data.localeCode)}</div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title={data.dictionary.dashboard.emptyMoves} />
            )}
          </div>
        </Panel>

        <Panel title={data.dictionary.nav.assets}>
          <div className="section-stack">
            {data.assets.map((asset) => (
              <Link key={asset.id} href={`/assets/${asset.id}`} className="list-row">
                <div>
                  <div className="asset-code">{asset.assetCode}</div>
                  <strong>{pickLocalizedText(data.locale, asset)}</strong>
                  <div className="tree-path">
                    {asset.currentLocation ? pickLocalizedText(data.locale, asset.currentLocation) : data.dictionary.assets.currentLocationFallback}
                  </div>
                </div>
                <Badge
                  label={assetStatusLabels[asset.status][data.locale === "ZH_CN" ? "zh" : "en"]}
                  tone={asset.status === "MISSING" ? "danger" : "neutral"}
                />
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
