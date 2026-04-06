"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type VisibleLocale = "ZH_CN" | "EN";

type BilingualFieldsContextValue = {
  visibleLocale: VisibleLocale;
  setVisibleLocale: (locale: VisibleLocale) => void;
};

const BilingualFieldsContext = createContext<BilingualFieldsContextValue | null>(null);

export function BilingualFieldsScope({
  locale,
  label,
  children,
}: {
  locale: VisibleLocale;
  label: string;
  children: ReactNode;
}) {
  const [visibleLocale, setVisibleLocale] = useState<VisibleLocale>(locale);
  const value = useMemo(() => ({ visibleLocale, setVisibleLocale }), [visibleLocale]);

  return (
    <BilingualFieldsContext.Provider value={value}>
      <div className="bilingual-scope full-span">
        <div className="bilingual-scope-header full-span">
          <span className="muted bilingual-scope-label">{label}</span>
          <div className="bilingual-toggle" role="tablist" aria-label={label}>
            <button
              type="button"
              className={`ghost-button bilingual-chip ${visibleLocale === "ZH_CN" ? "is-active" : ""}`}
              onClick={() => setVisibleLocale("ZH_CN")}
            >
              中
            </button>
            <button
              type="button"
              className={`ghost-button bilingual-chip ${visibleLocale === "EN" ? "is-active" : ""}`}
              onClick={() => setVisibleLocale("EN")}
            >
              En
            </button>
          </div>
        </div>
        <div className="bilingual-scope-grid form-grid">{children}</div>
      </div>
    </BilingualFieldsContext.Provider>
  );
}

export function useBilingualFieldsScope() {
  return useContext(BilingualFieldsContext);
}
