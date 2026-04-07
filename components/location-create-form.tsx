"use client";

import { useMemo, useState } from "react";

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
      code: string;
      topLevel: string;
      numericCodeHint: string;
      typeHelp: string;
      typeGroupStructure: string;
      typeGroupStorage: string;
      typeGroupCoordinates: string;
      positionPreset: string;
      positionPresetHelp: string;
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

  return (
    <form action={createLocationAction} className="form-grid location-create-form">
      <input type="hidden" name="workspaceId" value={workspaceId} />

      <div className="location-form-card full-span">
        <div className="location-form-card-grid">
          <div className="field-stack">
            <label htmlFor="parentId">{dictionary.locations.parent}</label>
            <select
              id="parentId"
              name="parentId"
              value={parentId}
              onChange={(event) => {
                const nextParentId = event.target.value;
                const nextParentKind = locations.find((location) => location.id === nextParentId)?.kind ?? null;
                const nextAllowedKinds = getAllowedLocationKinds(nextParentKind);
                setParentId(nextParentId);
                setKind((currentKind) => (nextAllowedKinds.includes(currentKind) ? currentKind : (nextAllowedKinds[0] ?? "HOUSE")));
              }}
            >
              <option value="">{dictionary.locations.topLevel}</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.label}
                </option>
              ))}
            </select>
          </div>

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

          <div className="field-stack">
            <label htmlFor="code">{dictionary.locations.code}</label>
            <input
              id="code"
              name="code"
              inputMode={numericCode ? "numeric" : undefined}
              pattern={numericCode ? "[0-9]*" : undefined}
              placeholder={numericCode ? "1" : "R1-C2"}
            />
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
          {numericCode ? <p>{dictionary.locations.numericCodeHint}</p> : null}
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
