"use client";

import { useMemo, useState } from "react";

import { createLocationAction } from "@/lib/actions";
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
  label: string;
};

type LocationCreateFormProps = {
  workspaceId: string;
  locale: "ZH_CN" | "EN";
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
    };
  };
  locations: LocationOption[];
};

export function LocationCreateForm({
  workspaceId,
  locale,
  dictionary,
  locations,
}: LocationCreateFormProps) {
  const [parentId, setParentId] = useState("");

  const parentKind = useMemo(
    () => locations.find((location) => location.id === parentId)?.kind ?? null,
    [locations, parentId],
  );
  const allowedKinds = useMemo(() => getAllowedLocationKinds(parentKind), [parentKind]);
  const allowedKindGroups = useMemo(() => getAllowedLocationKindsByGroup(parentKind), [parentKind]);
  const [kind, setKind] = useState<LocationKind>("HOUSE");
  const selectedKind = allowedKinds.includes(kind) ? kind : (allowedKinds[0] ?? "HOUSE");

  const numericCode = isNumericCodeLocationKind(selectedKind);

  return (
    <form action={createLocationAction} className="form-grid">
      <input type="hidden" name="workspaceId" value={workspaceId} />

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
        <p className="muted">{dictionary.locations.typeHelp}</p>
      </div>

      <div className="field-stack">
        <label htmlFor="nameEn">{dictionary.common.englishName}</label>
        <input id="nameEn" name="nameEn" />
      </div>

      <div className="field-stack">
        <label htmlFor="nameZh">{dictionary.common.chineseName}</label>
        <input id="nameZh" name="nameZh" />
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
        {numericCode ? <p className="muted">{dictionary.locations.numericCodeHint}</p> : null}
      </div>

      <div className="field-stack full-span">
        <label htmlFor="notes">{dictionary.common.notes}</label>
        <textarea id="notes" name="notes" />
      </div>

      <div className="full-span">
        <button type="submit">{dictionary.common.create}</button>
      </div>
    </form>
  );
}
