"use client";

import { useMemo, useState } from "react";

import { AssetLocationField, type AssetLocationOption } from "@/components/asset-location-field";
import { BilingualFieldsScope } from "@/components/bilingual-fields-scope";
import { BilingualNameFields } from "@/components/bilingual-name-fields";
import { createLocationAction } from "@/lib/actions";
import {
  getAllowedLocationKinds,
  getAllowedLocationKindsByGroup,
  isNumericCodeLocationKind,
  locationKindLabels,
  positionPresetLabels,
  positionPresetValues,
  type LocationKind,
} from "@/lib/constants";

type LocationOption = {
  id: string;
  kind: LocationKind;
  locationCode?: string | null;
  label: string;
};

type LocationCreateFormProps = {
  workspaceId: string;
  locale: "ZH_CN" | "EN";
  defaultParentId?: string;
  defaultKind?: LocationKind;
  dictionary: {
    common: {
      englishName: string;
      chineseName: string;
      notes: string;
      create: string;
    };
    locations: {
      parent: string;
      type: string;
      topLevel: string;
      numericCodeHint: string;
      autoCodeHint: string;
      typeHelp: string;
      typeGroupStructure: string;
      typeGroupStorage: string;
      typeGroupCoordinates: string;
      positionPreset: string;
      positionPresetHelp: string;
      pickerPlaceholder: string;
      pickerHelp: string;
      pickerMatched: string;
      pickerUnresolved: string;
    };
  };
  locations: LocationOption[];
};

export function LocationCreateForm({
  workspaceId,
  locale,
  defaultParentId,
  defaultKind,
  dictionary,
  locations,
}: LocationCreateFormProps) {
  const [parentId, setParentId] = useState(defaultParentId ?? "");

  const parentKind = useMemo(
    () => locations.find((location) => location.id === parentId)?.kind ?? null,
    [locations, parentId],
  );
  const allowedKinds = useMemo(() => getAllowedLocationKinds(parentKind), [parentKind]);
  const allowedKindGroups = useMemo(() => getAllowedLocationKindsByGroup(parentKind), [parentKind]);
  const [kind, setKind] = useState<LocationKind>(defaultKind ?? "HOUSE");
  const selectedKind = allowedKinds.includes(kind) ? kind : (allowedKinds[0] ?? "HOUSE");
  const [positionPreset, setPositionPreset] = useState<(typeof positionPresetValues)[number]>("TOP");

  const numericCode = isNumericCodeLocationKind(selectedKind);
  const showPositionPreset = selectedKind === "POSITION";
  const requireCustomNames = showPositionPreset && positionPreset === "OTHER";
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
    <form action={createLocationAction} className="form-grid location-create-form">
      <input type="hidden" name="workspaceId" value={workspaceId} />

      <div className="location-form-card full-span">
        <div className="location-form-card-grid">
          <AssetLocationField
            inputId="parentId"
            inputName="parentId"
            label={dictionary.locations.parent}
            emptyLabel={dictionary.locations.topLevel}
            defaultLocationId={parentId || undefined}
            options={pickerOptions}
            storageKey={`miniassets:location-create-parent:${workspaceId || "default"}`}
            onSelectionChange={({ locationId }) => {
              const nextParentKind = locations.find((location) => location.id === locationId)?.kind ?? null;
              const nextAllowedKinds = getAllowedLocationKinds(nextParentKind);
              setParentId(locationId);
              setKind((currentKind) => (nextAllowedKinds.includes(currentKind) ? currentKind : (nextAllowedKinds[0] ?? "HOUSE")));
            }}
            labels={{
              placeholder: dictionary.locations.pickerPlaceholder,
              help: dictionary.locations.pickerHelp,
              matched: dictionary.locations.pickerMatched,
              unresolved: dictionary.locations.pickerUnresolved,
            }}
          />

          <div className="field-stack">
            <label htmlFor="kind">{dictionary.locations.type}</label>
            <select
              id="kind"
              name="kind"
              value={selectedKind}
              onChange={(event) => setKind(event.target.value as LocationKind)}
            >
              {allowedKindGroups.map((group) => (
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

          {showPositionPreset ? (
            <div className="field-stack">
              <label htmlFor="positionPreset">{dictionary.locations.positionPreset}</label>
              <select
                id="positionPreset"
                name="positionPreset"
                value={positionPreset}
                onChange={(event) => setPositionPreset(event.target.value as (typeof positionPresetValues)[number])}
              >
                {positionPresetValues.map((value) => (
                  <option key={value} value={value}>
                    {positionPresetLabels[value][locale === "ZH_CN" ? "zh" : "en"]}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        <div className="location-form-helper muted">
          <p>{dictionary.locations.typeHelp}</p>
          {numericCode ? <p>{dictionary.locations.autoCodeHint}</p> : null}
          {showPositionPreset ? <p>{dictionary.locations.positionPresetHelp}</p> : null}
        </div>
      </div>

      <div className="location-form-card full-span">
        <BilingualFieldsScope locale={locale} label={locale === "ZH_CN" ? "输入语言" : "Entry language"}>
          <BilingualNameFields
            locale={locale}
            englishLabel={dictionary.common.englishName}
            chineseLabel={dictionary.common.chineseName}
            englishDisabled={showPositionPreset && !requireCustomNames}
            chineseDisabled={showPositionPreset && !requireCustomNames}
          />
        </BilingualFieldsScope>
      </div>

      {showPositionPreset ? (
        <input type="hidden" name="positionPreset" value={positionPreset} />
      ) : null}

      <div className="location-form-card full-span">
        <div className="field-stack full-span">
          <label htmlFor="notes">{dictionary.common.notes}</label>
          <textarea id="notes" name="notes" />
        </div>
      </div>

      <div className="full-span">
        <button type="submit">{dictionary.common.create}</button>
      </div>
    </form>
  );
}
