"use client";

import { AssetLocationField, type AssetLocationOption } from "@/components/asset-location-field";

export function LocationMoveForm({
  action,
  workspaceId,
  labels,
  options,
}: {
  action: (formData: FormData) => void | Promise<void>;
  workspaceId: string;
  labels: {
    location: string;
    newParent: string;
    topLevel: string;
    move: string;
    placeholder: string;
    help: string;
    matched: string;
    unresolved: string;
    advanced: string;
    locationId: string;
  };
  options: AssetLocationOption[];
}) {
  return (
    <form action={action} className="form-grid">
      <input type="hidden" name="workspaceId" value={workspaceId} />

      <AssetLocationField
        inputId="locationId"
        inputName="locationId"
        label={labels.location}
        emptyLabel=""
        options={options}
        storageKey={`miniassets:location-move-target:${workspaceId || "default"}`}
        labels={{
          placeholder: labels.placeholder,
          help: labels.help,
          matched: labels.matched,
          unresolved: labels.unresolved,
          advanced: labels.advanced,
          locationId: labels.locationId,
        }}
      />

      <AssetLocationField
        inputId="parentId"
        inputName="parentId"
        label={labels.newParent}
        emptyLabel={labels.topLevel}
        options={options}
        storageKey={`miniassets:location-move-parent:${workspaceId || "default"}`}
        labels={{
          placeholder: labels.placeholder,
          help: labels.help,
          matched: labels.matched,
          unresolved: labels.unresolved,
          advanced: labels.advanced,
          locationId: labels.locationId,
        }}
      />

      <div className="full-span">
        <button type="submit">{labels.move}</button>
      </div>
    </form>
  );
}
