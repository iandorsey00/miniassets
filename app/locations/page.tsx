import {
  addLocationDescriptorAction,
  createLocationAction,
  deleteLocationDescriptorAction,
  moveLocationAction,
  updateLocationAction,
} from "@/lib/actions";
import {
  locationDescriptorTypeLabels,
  locationDescriptorTypeValues,
  locationKindLabels,
  wallDirectionLabels,
  wallDirectionValues,
} from "@/lib/constants";
import { buildLocationPath, getLocationsData } from "@/lib/data";
import { formatLocationDescriptor } from "@/lib/location-descriptors";
import { pickLocalizedText } from "@/lib/present";
import { PageHeader, Panel } from "@/components/ui";

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
      {nodes.map((location) => {
        const descriptorOptions = data.locations.filter((item) => item.id !== location.id);

        return (
          <details key={location.id} className="tree-node">
            <summary className="tree-node-summary">
              <div className="tree-node-header">
                <div className="tree-node-copy">
                  <strong>{pickLocalizedText(data.locale, location) || location.code || location.id}</strong>
                  <div className="tree-path">
                    {locationKindLabels[location.kind][data.locale === "ZH_CN" ? "zh" : "en"]}
                  </div>
                </div>
                <div className="row-meta">{data.assetCounts.get(location.id) ?? 0}</div>
              </div>
            </summary>

            <div className="tree-node-body">
              {location.descriptors.length ? (
                <div className="descriptor-list">
                  {location.descriptors.map((descriptor) => (
                    <div key={descriptor.id} className="descriptor-item">
                      <span>{formatLocationDescriptor(descriptor, data.locale)}</span>
                      <form action={deleteLocationDescriptorAction}>
                        <input type="hidden" name="workspaceId" value={data.currentWorkspace?.id ?? ""} />
                        <input type="hidden" name="locationId" value={location.id} />
                        <input type="hidden" name="descriptorId" value={descriptor.id} />
                        <button type="submit" className="ghost-button descriptor-remove-button">
                          {data.dictionary.locations.removeDescriptor}
                        </button>
                      </form>
                    </div>
                  ))}
                </div>
              ) : null}

              <details className="location-editor">
                <summary className="location-editor-summary">{data.dictionary.locations.editLocation}</summary>

                <form action={updateLocationAction} className="form-grid location-editor-form">
                  <input type="hidden" name="workspaceId" value={data.currentWorkspace?.id ?? ""} />
                  <input type="hidden" name="locationId" value={location.id} />

                  <div className="field-stack">
                    <label htmlFor={`kind-${location.id}`}>{data.dictionary.locations.type}</label>
                    <select id={`kind-${location.id}`} name="kind" defaultValue={location.kind}>
                      {Object.entries(locationKindLabels).map(([key, value]) => (
                        <option key={key} value={key}>
                          {value[data.locale === "ZH_CN" ? "zh" : "en"]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field-stack">
                    <label htmlFor={`code-${location.id}`}>{data.dictionary.locations.code}</label>
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
                    <button type="submit">{data.dictionary.locations.saveLocation}</button>
                  </div>
                </form>

                <div className="descriptor-editor">
                  <div className="descriptor-editor-header">
                    <strong>{data.dictionary.locations.descriptorsTitle}</strong>
                    <p className="muted">{data.dictionary.locations.descriptorHint}</p>
                  </div>
                  <form action={addLocationDescriptorAction} className="form-grid location-editor-form">
                    <input type="hidden" name="workspaceId" value={data.currentWorkspace?.id ?? ""} />
                    <input type="hidden" name="locationId" value={location.id} />

                    <div className="field-stack">
                      <label htmlFor={`descriptorType-${location.id}`}>{data.dictionary.locations.descriptorType}</label>
                      <select id={`descriptorType-${location.id}`} name="type" defaultValue={locationDescriptorTypeValues[0]}>
                        {locationDescriptorTypeValues.map((value) => (
                          <option key={value} value={value}>
                            {locationDescriptorTypeLabels[value][data.locale === "ZH_CN" ? "zh" : "en"]}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="field-stack">
                      <label htmlFor={`descriptorWall-${location.id}`}>{data.dictionary.locations.wall}</label>
                      <select id={`descriptorWall-${location.id}`} name="wall" defaultValue="">
                        <option value="">-</option>
                        {wallDirectionValues.map((value) => (
                          <option key={value} value={value}>
                            {wallDirectionLabels[value][data.locale === "ZH_CN" ? "zh" : "en"]}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="field-stack">
                      <label htmlFor={`descriptorOrdinal-${location.id}`}>{data.dictionary.locations.ordinal}</label>
                      <input id={`descriptorOrdinal-${location.id}`} name="ordinal" type="number" min="1" max="99" />
                    </div>

                    <div className="field-stack">
                      <label htmlFor={`descriptorReference-${location.id}`}>{data.dictionary.locations.referenceZone}</label>
                      <select id={`descriptorReference-${location.id}`} name="referenceLocationId" defaultValue="">
                        <option value="">-</option>
                        {descriptorOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {buildLocationPath(data.locations, option.id, data.locale) ||
                              pickLocalizedText(data.locale, option) ||
                              option.code ||
                              option.id}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="field-stack full-span">
                      <label htmlFor={`descriptorQualifier-${location.id}`}>{data.dictionary.locations.qualifier}</label>
                      <input
                        id={`descriptorQualifier-${location.id}`}
                        name="qualifier"
                        placeholder={data.dictionary.locations.frontOfHint}
                      />
                    </div>

                    <div className="full-span">
                      <button type="submit">{data.dictionary.locations.addDescriptor}</button>
                    </div>
                  </form>
                </div>
              </details>

              <div className="tree-children">{renderTree(location.id, data)}</div>
            </div>
          </details>
        );
      })}
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
              <label htmlFor="parentId">{data.dictionary.locations.parent}</label>
              <select id="parentId" name="parentId" defaultValue="">
                <option value="">{data.dictionary.locations.topLevel}</option>
                {data.locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {pickLocalizedText(data.locale, location) || location.code || location.id}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-stack">
              <label htmlFor="kind">{data.dictionary.locations.type}</label>
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
              <label htmlFor="code">{data.dictionary.locations.code}</label>
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

        <Panel title={data.dictionary.locations.moveTitle}>
          <form action={moveLocationAction} className="form-grid">
            <input type="hidden" name="workspaceId" value={data.currentWorkspace?.id ?? ""} />

            <div className="field-stack">
              <label htmlFor="locationId">{data.dictionary.common.location}</label>
              <select id="locationId" name="locationId" defaultValue="">
                <option value="" disabled>
                  {data.dictionary.locations.chooseLocation}
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
              <label htmlFor="moveParentId">{data.dictionary.locations.newParent}</label>
              <select id="moveParentId" name="parentId" defaultValue="">
                <option value="">{data.dictionary.locations.topLevel}</option>
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
              <button type="submit">{data.dictionary.locations.moveLocation}</button>
            </div>
          </form>
        </Panel>

        <div className="full-span">
          <Panel title={data.dictionary.locations.title}>
            <p className="muted">{data.dictionary.locations.standardHint}</p>
            {renderTree(null, data)}
          </Panel>
        </div>
      </div>
    </>
  );
}
