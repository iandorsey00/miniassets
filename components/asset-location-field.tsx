"use client";

import { useEffect, useMemo, useState } from "react";

export type AssetLocationOption = {
  id: string;
  path: string;
  code?: string | null;
  nameEn?: string | null;
  nameZh?: string | null;
};

type AssetLocationFieldProps = {
  inputId: string;
  inputName: string;
  label: string;
  defaultLocationId?: string | null;
  emptyLabel: string;
  options: AssetLocationOption[];
  storageKey?: string;
  labels: {
    placeholder: string;
    help: string;
    matched: string;
    unresolved: string;
    advanced: string;
    locationId: string;
  };
};

function normalizeLookupValue(value: string) {
  return value.trim().toLowerCase();
}

export function AssetLocationField({
  inputId,
  inputName,
  label,
  defaultLocationId,
  emptyLabel,
  options,
  storageKey,
  labels,
}: AssetLocationFieldProps) {
  const optionById = useMemo(() => new Map(options.map((option) => [option.id, option])), [options]);

  const lookupMap = useMemo(() => {
    const paths = new Map<string, string>();
    const codes = new Map<string, string>();
    const names = new Map<string, string>();

    for (const option of options) {
      paths.set(normalizeLookupValue(option.path), option.id);

      if (option.code) {
        const normalizedCode = normalizeLookupValue(option.code);
        if (!codes.has(normalizedCode)) {
          codes.set(normalizedCode, option.id);
        }
      }

      for (const maybeName of [option.nameEn, option.nameZh]) {
        if (!maybeName) continue;
        const normalizedName = normalizeLookupValue(maybeName);
        if (!names.has(normalizedName)) {
          names.set(normalizedName, option.id);
        }
      }
    }

    return { paths, codes, names };
  }, [options]);

  const [query, setQuery] = useState(() => {
    if (defaultLocationId && optionById.has(defaultLocationId)) {
      return optionById.get(defaultLocationId)?.path ?? "";
    }
    return "";
  });
  const [locationId, setLocationId] = useState(defaultLocationId ?? "");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advancedId, setAdvancedId] = useState(defaultLocationId ?? "");

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") {
      return;
    }

    const savedQuery = window.localStorage.getItem(`${storageKey}:query`);
    const savedLocationId = window.localStorage.getItem(`${storageKey}:locationId`);
    const savedAdvancedId = window.localStorage.getItem(`${storageKey}:advancedId`);
    const savedAdvancedOpen = window.localStorage.getItem(`${storageKey}:advancedOpen`);

    const restoreTimer = window.setTimeout(() => {
      if (typeof savedAdvancedOpen === "string") {
        setAdvancedOpen(savedAdvancedOpen === "1");
      }

      if (savedQuery !== null) {
        setQuery(savedQuery);
      }

      if (savedLocationId !== null) {
        setLocationId(savedLocationId);
      }

      if (savedAdvancedId !== null) {
        setAdvancedId(savedAdvancedId);
      }
    }, 0);

    return () => window.clearTimeout(restoreTimer);
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(`${storageKey}:query`, query);
    window.localStorage.setItem(`${storageKey}:locationId`, locationId);
    window.localStorage.setItem(`${storageKey}:advancedId`, advancedId);
    window.localStorage.setItem(`${storageKey}:advancedOpen`, advancedOpen ? "1" : "0");
  }, [advancedId, advancedOpen, locationId, query, storageKey]);

  function resolveLocationId(rawValue: string) {
    const normalized = normalizeLookupValue(rawValue);
    if (!normalized) {
      return "";
    }

    return (
      optionById.get(rawValue)?.id ??
      lookupMap.paths.get(normalized) ??
      lookupMap.codes.get(normalized) ??
      lookupMap.names.get(normalized) ??
      ""
    );
  }

  const matchedOption = locationId ? optionById.get(locationId) ?? null : null;
  const hasQuery = query.trim().length > 0;
  const unresolved = hasQuery && !matchedOption;

  return (
    <div className="field-stack location-picker full-span">
      <label htmlFor={`${inputId}-search`}>{label}</label>
      <input type="hidden" id={inputId} name={inputName} value={locationId} />
      <input
        id={`${inputId}-search`}
        list={`${inputId}-suggestions`}
        value={query}
        placeholder={labels.placeholder}
        onChange={(event) => {
          const nextQuery = event.target.value;
          const nextLocationId = resolveLocationId(nextQuery);
          setQuery(nextQuery);
          setLocationId(nextLocationId);
          if (nextLocationId) {
            setAdvancedId(nextLocationId);
          }
        }}
      />
      <datalist id={`${inputId}-suggestions`}>
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option.id} value={option.path} />
        ))}
      </datalist>
      <p className="muted">{labels.help}</p>
      {matchedOption ? (
        <p className="muted">
          {labels.matched}: <strong>{matchedOption.path}</strong>
        </p>
      ) : null}
      {unresolved ? <p className="muted">{labels.unresolved}</p> : null}

      <details
        className="location-picker-advanced"
        open={advancedOpen}
        onToggle={(event) => setAdvancedOpen(event.currentTarget.open)}
      >
        <summary>{labels.advanced}</summary>
        <div className="field-stack">
          <label htmlFor={`${inputId}-advanced`}>{labels.locationId}</label>
          <input
            id={`${inputId}-advanced`}
            value={advancedId}
            onChange={(event) => {
              const nextId = event.target.value.trim();
              setAdvancedId(nextId);

              if (!nextId) {
                setLocationId("");
                setQuery("");
                return;
              }

              const nextOption = optionById.get(nextId);
              setLocationId(nextOption?.id ?? "");
              if (nextOption) {
                setQuery(nextOption.path);
              }
            }}
          />
        </div>
      </details>
    </div>
  );
}
