"use client";

import { useState } from "react";

import { AssetLocationField, type AssetLocationOption } from "@/components/asset-location-field";
import type { AssetStatus, PlacementConfidence } from "@prisma/client";

type SelectOption = {
  value: string;
  label: string;
};

export function AssetMoveForm({
  assetId,
  defaultLocationId,
  defaultStatus,
  action,
  label,
  emptyLabel,
  options,
  storageKey,
  labels,
  statusOptions,
  confidenceOptions,
}: {
  assetId: string;
  defaultLocationId?: string | null;
  defaultStatus: AssetStatus;
  action: (formData: FormData) => void | Promise<void>;
  label: string;
  emptyLabel: string;
  options: AssetLocationOption[];
  storageKey: string;
  labels: {
    placeholder: string;
    help: string;
    matched: string;
    unresolved: string;
    advanced: string;
    locationId: string;
    status: string;
    confidence: string;
    notes: string;
    move: string;
    locationRequired: string;
  };
  statusOptions: SelectOption[];
  confidenceOptions: SelectOption[];
}) {
  const [status, setStatus] = useState<AssetStatus>(defaultStatus);
  const [selection, setSelection] = useState({
    locationId: defaultLocationId ?? "",
    isResolved: Boolean(defaultLocationId),
  });

  const locationRequired = status !== "MISSING";
  const submitDisabled = locationRequired && !selection.isResolved;

  return (
    <form action={action} className="form-grid">
      <input type="hidden" name="assetId" value={assetId} />

      <AssetLocationField
        inputId="locationId"
        inputName="locationId"
        label={label}
        defaultLocationId={defaultLocationId}
        emptyLabel={emptyLabel}
        options={options}
        storageKey={storageKey}
        onSelectionChange={setSelection}
        labels={{
          placeholder: labels.placeholder,
          help: labels.help,
          matched: labels.matched,
          unresolved: labels.unresolved,
          advanced: labels.advanced,
          locationId: labels.locationId,
        }}
      />

      <div className="field-stack">
        <label htmlFor="status">{labels.status}</label>
        <select
          id="status"
          name="status"
          value={status}
          onChange={(event) => setStatus(event.target.value as AssetStatus)}
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field-stack">
        <label htmlFor="confidence">{labels.confidence}</label>
        <select id="confidence" name="confidence" defaultValue={"VERIFIED" as PlacementConfidence}>
          {confidenceOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field-stack full-span">
        <label htmlFor="note">{labels.notes}</label>
        <textarea id="note" name="note" />
      </div>

      {submitDisabled ? <p className="muted full-span">{labels.locationRequired}</p> : null}

      <div className="full-span">
        <button type="submit" disabled={submitDisabled}>
          {labels.move}
        </button>
      </div>
    </form>
  );
}
