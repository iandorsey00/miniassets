"use client";

import { useMemo, useState } from "react";

import { AssetLocationField, type AssetLocationOption } from "@/components/asset-location-field";
import { createNumberedLocationChildrenAction } from "@/lib/actions";
import {
  getAllowedLocationKinds,
  getAllowedLocationKindsByGroup,
  isNumericCodeLocationKind,
  locationKindLabels,
  type LocationKind,
} from "@/lib/constants";

type LocationOption = {
  id: string;
  kind: LocationKind;
  locationCode?: string | null;
  label: string;
};

type LocationNumberedChildrenFormProps = {
  workspaceId: string;
  locale: "ZH_CN" | "EN";
  defaultParentId?: string;
  defaultKind?: LocationKind;
  dictionary: {
    common: {
      create: string;
    };
    locations: {
      numberedParent: string;
      numberedType: string;
      numberedCount: string;
      numberedHelp: string;
      createNumbered: string;
      topLevel: string;
      typeGroupStructure: string;
      typeGroupStorage: string;
      typeGroupCoordinates: string;
      pickerPlaceholder: string;
      pickerHelp: string;
      pickerMatched: string;
      pickerUnresolved: string;
      pickerAdvanced: string;
      pickerLocationId: string;
    };
  };
  locations: LocationOption[];
};

const countOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export function LocationNumberedChildrenForm({
  workspaceId,
  locale,
  defaultParentId,
  defaultKind,
  dictionary,
  locations,
}: LocationNumberedChildrenFormProps) {
  const [parentId, setParentId] = useState(defaultParentId ?? "");

  const parentKind = useMemo(
    () => locations.find((location) => location.id === parentId)?.kind ?? null,
    [locations, parentId],
  );
  const allowedKindGroups = useMemo(
    () =>
      getAllowedLocationKindsByGroup(parentKind).map((group) => ({
        ...group,
        kinds: group.kinds.filter((kind) => isNumericCodeLocationKind(kind)),
      })),
    [parentKind],
  );
  const allowedKinds = useMemo(
    () => getAllowedLocationKinds(parentKind).filter((kind) => isNumericCodeLocationKind(kind)),
    [parentKind],
  );
  const [kind, setKind] = useState<LocationKind>(defaultKind ?? "SHELF");
  const selectedKind = allowedKinds.includes(kind) ? kind : (allowedKinds[0] ?? "SHELF");
  const pickerOptions: AssetLocationOption[] = useMemo(
    () =>
      locations.map((location) => ({
        id: location.id,
        path: location.label,
        locationCode: location.locationCode,
      })),
    [locations],
  );

  return (
    <form action={createNumberedLocationChildrenAction} className="form-grid location-create-form">
      <input type="hidden" name="workspaceId" value={workspaceId} />

      <div className="location-form-card full-span">
        <div className="location-form-card-grid">
          <AssetLocationField
            inputId="numberedParentId"
            inputName="parentId"
            label={dictionary.locations.numberedParent}
            emptyLabel={dictionary.locations.topLevel}
            defaultLocationId={parentId || undefined}
            options={pickerOptions}
            storageKey={`miniassets:location-numbered-parent:${workspaceId || "default"}`}
            onSelectionChange={({ locationId }) => {
              const nextParentKind = locations.find((location) => location.id === locationId)?.kind ?? null;
              const nextAllowedKinds = getAllowedLocationKinds(nextParentKind).filter((nextKind) =>
                isNumericCodeLocationKind(nextKind),
              );
              setParentId(locationId);
              setKind((currentKind) => (nextAllowedKinds.includes(currentKind) ? currentKind : (nextAllowedKinds[0] ?? "SHELF")));
            }}
            labels={{
              placeholder: dictionary.locations.pickerPlaceholder,
              help: dictionary.locations.pickerHelp,
              matched: dictionary.locations.pickerMatched,
              unresolved: dictionary.locations.pickerUnresolved,
              advanced: dictionary.locations.pickerAdvanced,
              locationId: dictionary.locations.pickerLocationId,
            }}
          />

          <div className="field-stack">
            <label htmlFor="numberedKind">{dictionary.locations.numberedType}</label>
            <select
              id="numberedKind"
              name="kind"
              value={selectedKind}
              onChange={(event) => setKind(event.target.value as LocationKind)}
              disabled={!allowedKinds.length}
            >
              {allowedKindGroups
                .filter((group) => group.kinds.length)
                .map((group) => (
                  <optgroup
                    key={group.group}
                    label={
                      group.group === "STRUCTURE"
                        ? dictionary.locations.typeGroupStructure
                        : group.group === "STORAGE"
                          ? dictionary.locations.typeGroupStorage
                          : dictionary.locations.typeGroupCoordinates
                    }
                  >
                    {group.kinds.map((value) => (
                      <option key={value} value={value}>
                        {locationKindLabels[value][locale === "ZH_CN" ? "zh" : "en"]}
                      </option>
                    ))}
                  </optgroup>
                ))}
            </select>
          </div>

          <div className="field-stack">
            <label htmlFor="numberedCount">{dictionary.locations.numberedCount}</label>
            <select id="numberedCount" name="count" defaultValue="3">
              {countOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="location-form-helper muted">
          <p>{dictionary.locations.numberedHelp}</p>
        </div>
      </div>

      <div className="full-span">
        <button type="submit" disabled={!parentId || !allowedKinds.length}>
          {dictionary.locations.createNumbered}
        </button>
      </div>
    </form>
  );
}
