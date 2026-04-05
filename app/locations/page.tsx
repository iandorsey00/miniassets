import { PageHeader, Panel } from "@/components/ui";
import { createLocationAction, moveLocationAction, updateLocationAction } from "@/lib/actions";
import { locationKindLabels } from "@/lib/constants";
import { buildLocationPath, getLocationsData } from "@/lib/data";
import { pickLocalizedText } from "@/lib/present";

function renderTree(
  parentId: string | null,
  data: Awaited<ReturnType<typeof getLocationsData>>,
): React.ReactNode {
  const nodes = data.locations.filter((location) => location.parentId === parentId);
  if (!nodes.length) {
    return null;
  }

  return (
    <div className="tree-list">
      {nodes.map((location) => (
        <div key={location.id} className="tree-node">
          <div className="tree-node-header">
            <div>
              <strong>{pickLocalizedText(data.locale, location) || location.code || location.id}</strong>
              <div className="tree-path">
                {locationKindLabels[location.kind][data.locale === "ZH_CN" ? "zh" : "en"]}
              </div>
            </div>
            <div className="row-meta">{data.assetCounts.get(location.id) ?? 0}</div>
          </div>
          <details className="location-editor">
            <summary className="location-editor-summary">Edit location</summary>
            <form action={updateLocationAction} className="form-grid location-editor-form">
              <input type="hidden" name="workspaceId" value={data.currentWorkspace?.id ?? ""} />
              <input type="hidden" name="locationId" value={location.id} />

              <div className="field-stack">
                <label htmlFor={`kind-${location.id}`}>Type</label>
                <select id={`kind-${location.id}`} name="kind" defaultValue={location.kind}>
                  {Object.entries(locationKindLabels).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value[data.locale === "ZH_CN" ? "zh" : "en"]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-stack">
                <label htmlFor={`code-${location.id}`}>Code</label>
                <input id={`code-${location.id}`} name="code" defaultValue={location.code ?? ""} />
              </div>

              <div className="field-stack">
                <label htmlFor={`nameEn-${location.id}`}>{data.dictionary.common.englishName}</label>
                <input id={`nameEn-${location.id}`} name="nameEn" defaultValue={location.nameEn ?? ""} />
              </div>

              <div className="field-stack">
                <label htmlFor={`nameZh-${location.id}`}>{data.dictionary.common.chineseName}</label>
                <input id={`nameZh-${location.id}`} name="nameZh" defaultValue={location.nameZh ?? ""} />
              </div>

              <div className="field-stack full-span">
                <label htmlFor={`notes-${location.id}`}>{data.dictionary.common.notes}</label>
                <textarea id={`notes-${location.id}`} name="notes" defaultValue={location.notes ?? ""} />
              </div>

              <div className="full-span">
                <button type="submit">Save location</button>
              </div>
            </form>
          </details>
          <div className="tree-children">{renderTree(location.id, data)}</div>
        </div>
      ))}
    </div>
  );
}

export default async function LocationsPage({
  searchParams,
}: {
  searchParams: Promise<{ workspaceId?: string }>;
}) {
  const params = await searchParams;
  const data = await getLocationsData(params.workspaceId);

  return (
    <>
      <PageHeader title={data.dictionary.locations.title} subtitle={data.dictionary.locations.subtitle} />

      <div className="grid-2">
        <Panel title={data.dictionary.locations.createTitle}>
          <form action={createLocationAction} className="form-grid">
            <input type="hidden" name="workspaceId" value={data.currentWorkspace?.id ?? ""} />

            <div className="field-stack">
              <label htmlFor="parentId">Parent</label>
              <select id="parentId" name="parentId" defaultValue="">
                <option value="">Top level</option>
                {data.locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {pickLocalizedText(data.locale, location) || location.code || location.id}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-stack">
              <label htmlFor="kind">Type</label>
              <select id="kind" name="kind" defaultValue="ROOM">
                {Object.entries(locationKindLabels).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value[data.locale === "ZH_CN" ? "zh" : "en"]}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-stack">
              <label htmlFor="nameEn">{data.dictionary.common.englishName}</label>
              <input id="nameEn" name="nameEn" />
            </div>

            <div className="field-stack">
              <label htmlFor="nameZh">{data.dictionary.common.chineseName}</label>
              <input id="nameZh" name="nameZh" />
            </div>

            <div className="field-stack">
              <label htmlFor="code">Code</label>
              <input id="code" name="code" placeholder="R1-C2" />
            </div>

            <div className="field-stack full-span">
              <label htmlFor="notes">{data.dictionary.common.notes}</label>
              <textarea id="notes" name="notes" />
            </div>

            <div className="full-span">
              <button type="submit">{data.dictionary.common.create}</button>
            </div>
          </form>
        </Panel>

        <Panel title="Move location">
          <form action={moveLocationAction} className="form-grid">
            <input type="hidden" name="workspaceId" value={data.currentWorkspace?.id ?? ""} />

            <div className="field-stack">
              <label htmlFor="locationId">Location</label>
              <select id="locationId" name="locationId" defaultValue="">
                <option value="" disabled>
                  Choose a location
                </option>
                {data.locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {buildLocationPath(data.locations, location.id, data.locale) ||
                      pickLocalizedText(data.locale, location) ||
                      location.code ||
                      location.id}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-stack">
              <label htmlFor="moveParentId">New parent</label>
              <select id="moveParentId" name="parentId" defaultValue="">
                <option value="">Top level</option>
                {data.locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {buildLocationPath(data.locations, location.id, data.locale) ||
                      pickLocalizedText(data.locale, location) ||
                      location.code ||
                      location.id}
                  </option>
                ))}
              </select>
            </div>

            <div className="full-span">
              <button type="submit">Move location</button>
            </div>
          </form>
        </Panel>

        <Panel title={data.dictionary.locations.title}>
          <p className="muted">{data.dictionary.locations.standardHint}</p>
          {renderTree(null, data)}
        </Panel>
      </div>
    </>
  );
}
