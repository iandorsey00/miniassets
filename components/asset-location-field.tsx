"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type AssetLocationOption = {
  id: string;
  path: string;
  code?: string | null;
  locationCode?: string | null;
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
  onSelectionChange?: (selection: { locationId: string; isResolved: boolean }) => void;
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

function matchesOption(option: AssetLocationOption, normalizedQuery: string) {
  if (!normalizedQuery) {
    return true;
  }

  const haystacks = [option.path, option.locationCode, option.code, option.nameEn, option.nameZh]
    .filter(Boolean)
    .map((value) => normalizeLookupValue(String(value)));

  return haystacks.some((value) => value.includes(normalizedQuery));
}

export function AssetLocationField({
  inputId,
  inputName,
  label,
  defaultLocationId,
  emptyLabel,
  options,
  storageKey,
  onSelectionChange,
  labels,
}: AssetLocationFieldProps) {
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const advancedInputRef = useRef<HTMLInputElement | null>(null);
  const optionById = useMemo(() => new Map(options.map((option) => [option.id, option])), [options]);

  const lookupMap = useMemo(() => {
    const paths = new Map<string, string>();
    const locationCodes = new Map<string, string>();
    const codes = new Map<string, string>();
    const names = new Map<string, string>();

    for (const option of options) {
      paths.set(normalizeLookupValue(option.path), option.id);

      if (option.locationCode) {
        const normalizedLocationCode = normalizeLookupValue(option.locationCode);
        if (!locationCodes.has(normalizedLocationCode)) {
          locationCodes.set(normalizedLocationCode, option.id);
        }
      }

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

    return { paths, locationCodes, codes, names };
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
  const [recentLocationIds, setRecentLocationIds] = useState<string[]>([]);

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") {
      return;
    }

    const savedQuery = window.localStorage.getItem(`${storageKey}:query`);
    const savedLocationId = window.localStorage.getItem(`${storageKey}:locationId`);
    const savedAdvancedId = window.localStorage.getItem(`${storageKey}:advancedId`);
    const savedAdvancedOpen = window.localStorage.getItem(`${storageKey}:advancedOpen`);
    const savedRecentIds = window.localStorage.getItem(`${storageKey}:recentLocationIds`);

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

      if (savedRecentIds) {
        try {
          const parsed = JSON.parse(savedRecentIds);
          if (Array.isArray(parsed)) {
            setRecentLocationIds(parsed.filter((value): value is string => typeof value === "string"));
          }
        } catch {}
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
    window.localStorage.setItem(`${storageKey}:recentLocationIds`, JSON.stringify(recentLocationIds.slice(0, 8)));
  }, [advancedId, advancedOpen, locationId, query, recentLocationIds, storageKey]);

  function resolveLocationId(rawValue: string) {
    const normalized = normalizeLookupValue(rawValue);
    if (!normalized) {
      return "";
    }

    return (
      optionById.get(rawValue)?.id ??
      lookupMap.paths.get(normalized) ??
      lookupMap.locationCodes.get(normalized) ??
      lookupMap.codes.get(normalized) ??
      lookupMap.names.get(normalized) ??
      ""
    );
  }

  const matchedOption = locationId ? optionById.get(locationId) ?? null : null;
  const hasQuery = query.trim().length > 0;
  const unresolved = hasQuery && !matchedOption;
  const normalizedQuery = normalizeLookupValue(query);
  const suggestionOptions = options.filter((option) => matchesOption(option, normalizedQuery)).slice(0, 8);
  const recentOptions = recentLocationIds
    .map((id) => optionById.get(id))
    .filter((option): option is AssetLocationOption => Boolean(option))
    .filter((option) => option.id !== locationId)
    .slice(0, 5);

  function selectOption(option: AssetLocationOption) {
    setLocationId(option.id);
    setAdvancedId(option.id);
    setQuery(option.path);
    setRecentLocationIds((current) => [option.id, ...current.filter((id) => id !== option.id)].slice(0, 8));
  }

  useEffect(() => {
    onSelectionChange?.({
      locationId,
      isResolved: Boolean(locationId && matchedOption),
    });
  }, [locationId, matchedOption, onSelectionChange]);

  function moveCaretToEnd(input: HTMLInputElement | null) {
    if (!input) {
      return;
    }

    const nextPosition = input.value.length;
    window.requestAnimationFrame(() => {
      try {
        input.setSelectionRange(nextPosition, nextPosition);
      } catch {}
    });
  }

  return (
    <div className="field-stack location-picker full-span">
      <label htmlFor={`${inputId}-search`}>{label}</label>
      <input type="hidden" id={inputId} name={inputName} value={locationId} />
      <input
        id={`${inputId}-search`}
        ref={searchInputRef}
        value={query}
        placeholder={labels.placeholder}
        onFocus={() => moveCaretToEnd(searchInputRef.current)}
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

      {!hasQuery && recentOptions.length ? (
        <div className="location-picker-results">
          <div className="location-picker-results-title">{label}</div>
          {recentOptions.map((option) => (
            <button
              key={`recent-${option.id}`}
              type="button"
              className="location-picker-option"
              onClick={() => selectOption(option)}
            >
              <span className="location-picker-option-path">{option.path}</span>
              {[option.locationCode, option.code].filter(Boolean).length ? (
                <span className="location-picker-option-meta">
                  {[option.locationCode, option.code].filter(Boolean).join(" · ")}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      {hasQuery && suggestionOptions.length ? (
        <div className="location-picker-results">
          {suggestionOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              className="location-picker-option"
              onClick={() => selectOption(option)}
            >
              <span className="location-picker-option-path">{option.path}</span>
              <span className="location-picker-option-meta">
                {[option.locationCode, option.code, option.nameEn, option.nameZh].filter(Boolean).join(" · ")}
              </span>
            </button>
          ))}
        </div>
      ) : null}

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
            ref={advancedInputRef}
            value={advancedId}
            onFocus={() => moveCaretToEnd(advancedInputRef.current)}
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
                selectOption(nextOption);
              }
            }}
          />
        </div>
      </details>
    </div>
  );
}
