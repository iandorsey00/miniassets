import Link from "next/link";

import { PageHeader, Panel } from "@/components/ui";
import { getViewerContext } from "@/lib/data";

export default async function ExportPage({
  searchParams,
}: {
  searchParams: Promise<{ workspaceId?: string }>;
}) {
  const params = await searchParams;
  const data = await getViewerContext(params.workspaceId);
  const workspaceQuery = data.currentWorkspace ? `?workspaceId=${encodeURIComponent(data.currentWorkspace.id)}` : "";

  return (
    <>
      <PageHeader title={data.dictionary.exportPage.title} subtitle={data.dictionary.exportPage.subtitle} />

      <div className="grid-2">
        <Panel title={data.dictionary.exportPage.title}>
          <div className="stack">
            <p>{data.dictionary.exportPage.body}</p>
            <p className="muted">{data.dictionary.exportPage.caveat}</p>
            <Link href={`/api/export${workspaceQuery}`} className="button">
              {data.dictionary.common.downloadJson}
            </Link>
          </div>
        </Panel>

        <Panel title="Included fields">
          <div className="stack">
            <div className="muted">Workspace metadata, standardized location tree, asset records, current locations, and placement history.</div>
            <div className="muted">Recommended AI uses: reorganization proposals, missing-item triage, duplicate detection, and standard-path cleanup.</div>
          </div>
        </Panel>
      </div>
    </>
  );
}
