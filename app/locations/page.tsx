import {
  addLocationDescriptorAction,
  deleteLocationAction,
  deleteLocationDescriptorAction,
  moveLocationAction,
  updateLocationAction,
} from "@/lib/actions";
import {
  getAllowedLocationKinds,
  isNumericCodeLocationKind,
  locationDescriptorTypeLabels,
  locationDescriptorTypeValues,
  locationKindLabels,
  type LocationKind,
  wallDirectionLabels,
  wallDirectionValues,
} from "@/lib/constants";
import { buildLocationPath, getLocationsData } from "@/lib/data";
import { formatLocationDescriptor } from "@/lib/location-descriptors";
import { pickLocalizedText } from "@/lib/present";
import { BilingualNameFields } from "@/components/bilingual-name-fields";
import { LocationCreateForm } from "@/components/location-create-form";
import { LocationMoveForm } from "@/components/location-move-form";
import { PageHeader, Panel, StatusNotice } from "@/components/ui";

const wallSortOrder = {
  NORTH: 0,
  EAST: 1,
  SOUTH: 2,
  WEST: 3,
} as const;

function getPerimeterDescriptorSortKey(
  location: Awaited<ReturnType<typeof getLocationsData>>["locations"][number],
) {
  return location.descriptors
    .filter((descriptor) => descriptor.type === "WALL_ZONE" && descriptor.wall && descriptor.ordinal)
    .map((descriptor) => ({
      wall: descriptor.wall!,
      ordinal: descriptor.ordinal ?? 0,
      qualifier: descriptor.qualifier?.trim() || "",
    }))
    .sort((left, right) => {
      const wallDelta = wallSortOrder[left.wall] - wallSortOrder[right.wall];
      if (wallDelta !== 0) {
        return wallDelta;
      }

      const ordinalDelta = left.ordinal - right.ordinal;
      if (ordinalDelta !== 0) {
        return ordinalDelta;
      }

      return left.qualifier.localeCompare(right.qualifier, "en", { sensitivity: "base" });
    })[0];
}

function compareLocations(
  left: Awaited<ReturnType<typeof getLocationsData>>["locations"][number],
  right: Awaited<ReturnType<typeof getLocationsData>>["locations"][number],
  locale: "ZH_CN" | "EN",
) {
  const leftWallDescriptor = getPerimeterDescriptorSortKey(left);
  const rightWallDescriptor = getPerimeterDescriptorSortKey(right);

  if (leftWallDescriptor || rightWallDescriptor) {
    if (!leftWallDescriptor) return 1;
    if (!rightWallDescriptor) return -1;

    const wallDelta = wallSortOrder[leftWallDescriptor.wall] - wallSortOrder[rightWallDescriptor.wall];
    if (wallDelta !== 0) {
      return wallDelta;
    }

    const ordinalDelta = leftWallDescriptor.ordinal - rightWallDescriptor.ordinal;
    if (ordinalDelta !== 0) {
      return ordinalDelta;
    }

    const qualifierDelta = leftWallDescriptor.qualifier.localeCompare(rightWallDescriptor.qualifier, "en", {
      sensitivity: "base",
    });
    if (qualifierDelta !== 0) {
      return qualifierDelta;
    }
  }

  const leftFrontDescriptor = left.descriptors.find((descriptor) => descriptor.type === "FRONT_OF_ZONE");
  const rightFrontDescriptor = right.descriptors.find((descriptor) => descriptor.type === "FRONT_OF_ZONE");
  if (leftFrontDescriptor || rightFrontDescriptor) {
    if (!leftFrontDescriptor) return 1;
    if (!rightFrontDescriptor) return -1;
  }

  const leftLabel = pickLocalizedText(locale, left) || left.code || left.id;
  const rightLabel = pickLocalizedText(locale, right) || right.code || right.id;
  return leftLabel.localeCompare(rightLabel, locale === "ZH_CN" ? "zh-CN" : "en", {
    numeric: true,
    sensitivity: "base",
  });
}

function renderTree(
  parentId: string | null,
  data: Awaited<ReturnType<typeof getLocationsData>>,
): React.ReactNode {
  const nodes = data.locations
    .filter((location) => location.parentId === parentId)
    .sort((left, right) => compareLocations(left, right, data.locale));
  if (!nodes.length) {
    return null;
  }

  return (
    <div className="tree-list">
      {nodes.map((location) => {
        const descriptorOptions = data.locations.filter((item) => item.id !== location.id);
        const parentKind = data.locations.find((item) => item.id === location.parentId)?.kind ?? null;
        const allowedKinds = getAllowedLocationKinds(parentKind);
        const numericCode = isNumericCodeLocationKind(location.kind);

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
                      {allowedKinds.map((key) => (
                        <option key={key} value={key}>
                          {locationKindLabels[key][data.locale === "ZH_CN" ? "zh" : "en"]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field-stack">
                    <label htmlFor={`code-${location.id}`}>{data.dictionary.locations.code}</label>
                    <input
                      id={`code-${location.id}`}
                      name="code"
                      defaultValue={location.code ?? ""}
                      inputMode={numericCode ? "numeric" : undefined}
                      pattern={numericCode ? "[0-9]*" : undefined}
                    />
                    {numericCode ? <p className="muted">{data.dictionary.locations.numericCodeHint}</p> : null}
                  </div>

                  <BilingualNameFields
                    locale={data.locale}
                    englishLabel={data.dictionary.common.englishName}
                    chineseLabel={data.dictionary.common.chineseName}
                    defaultEnglishValue={location.nameEn ?? ""}
                    defaultChineseValue={location.nameZh ?? ""}
                    englishId={`nameEn-${location.id}`}
                    chineseId={`nameZh-${location.id}`}
                  />

                  <div className="field-stack full-span">
                    <label htmlFor={`notes-${location.id}`}>{data.dictionary.common.notes}</label>
                    <textarea id={`notes-${location.id}`} name="notes" defaultValue={location.notes ?? ""} />
                  </div>

                  <div className="full-span">
                    <button type="submit">{data.dictionary.locations.saveLocation}</button>
                  </div>
                </form>

                <form action={deleteLocationAction} className="location-delete-form">
                  <input type="hidden" name="workspaceId" value={data.currentWorkspace?.id ?? ""} />
                  <input type="hidden" name="locationId" value={location.id} />
                  <button type="submit" className="ghost-button descriptor-remove-button">
                    {data.dictionary.locations.deleteLocation}
                  </button>
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
  searchParams: Promise<{ workspaceId?: string; parentId?: string; kind?: string; saved?: string }>;
}) {
  const params = await searchParams;
  const data = await getLocationsData(params.workspaceId);
  const locationOptions = data.locations.map((location) => ({
    id: location.id,
    kind: location.kind,
    label:
      buildLocationPath(data.locations, location.id, data.locale) ||
      pickLocalizedText(data.locale, location) ||
      location.code ||
      location.id,
  }));

  return (
    <>
      <PageHeader title={data.dictionary.locations.title} subtitle={data.dictionary.locations.subtitle} />

      {params.saved === "1" ? <StatusNotice message={data.dictionary.common.savedMessage} /> : null}

      <div className="grid-2">
        <Panel title={data.dictionary.locations.createTitle}>
          <LocationCreateForm
            workspaceId={data.currentWorkspace?.id ?? ""}
            locale={data.locale}
            defaultParentId={params.parentId}
            defaultKind={params.kind as LocationKind | undefined}
            dictionary={{
              common: {
                englishName: data.dictionary.common.englishName,
                chineseName: data.dictionary.common.chineseName,
                notes: data.dictionary.common.notes,
                create: data.dictionary.common.create,
              },
              locations: {
                parent: data.dictionary.locations.parent,
                type: data.dictionary.locations.type,
                code: data.dictionary.locations.code,
                topLevel: data.dictionary.locations.topLevel,
                numericCodeHint: data.dictionary.locations.numericCodeHint,
                typeHelp: data.dictionary.locations.typeHelp,
                typeGroupStructure: data.dictionary.locations.typeGroupStructure,
                typeGroupStorage: data.dictionary.locations.typeGroupStorage,
                typeGroupCoordinates: data.dictionary.locations.typeGroupCoordinates,
                positionPreset: data.dictionary.locations.positionPreset,
                positionPresetHelp: data.dictionary.locations.positionPresetHelp,
                pickerPlaceholder: data.dictionary.locations.pickerPlaceholder,
                pickerHelp: data.dictionary.locations.pickerHelp,
                pickerMatched: data.dictionary.locations.pickerMatched,
                pickerUnresolved: data.dictionary.locations.pickerUnresolved,
                pickerAdvanced: data.dictionary.locations.pickerAdvanced,
                pickerLocationId: data.dictionary.locations.pickerLocationId,
              },
            }}
            locations={locationOptions}
          />
        </Panel>

        <Panel title={data.dictionary.locations.moveTitle}>
          <LocationMoveForm
            action={moveLocationAction}
            workspaceId={data.currentWorkspace?.id ?? ""}
            options={locationOptions.map((location) => ({
              id: location.id,
              path: location.label,
            }))}
            labels={{
              location: data.dictionary.common.location,
              newParent: data.dictionary.locations.newParent,
              topLevel: data.dictionary.locations.topLevel,
              move: data.dictionary.locations.moveLocation,
              placeholder: data.dictionary.locations.pickerPlaceholder,
              help: data.dictionary.locations.pickerHelp,
              matched: data.dictionary.locations.pickerMatched,
              unresolved: data.dictionary.locations.pickerUnresolved,
              advanced: data.dictionary.locations.pickerAdvanced,
              locationId: data.dictionary.locations.pickerLocationId,
            }}
          />
        </Panel>

        <div className="full-span">
          <Panel title={data.dictionary.locations.title}>
            <p className="muted">{data.dictionary.locations.standardHint}</p>
            <p className="muted">{data.dictionary.locations.numericCodeHint}</p>
            {renderTree(null, data)}
          </Panel>
        </div>
      </div>
    </>
  );
}
