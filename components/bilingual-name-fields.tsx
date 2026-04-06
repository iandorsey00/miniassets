"use client";

import { useState } from "react";

type BilingualNameFieldsProps = {
  locale: "ZH_CN" | "EN";
  englishLabel: string;
  chineseLabel: string;
  defaultEnglishValue?: string;
  defaultChineseValue?: string;
  englishId?: string;
  chineseId?: string;
  englishName?: string;
  chineseName?: string;
  englishDisabled?: boolean;
  chineseDisabled?: boolean;
};

export function BilingualNameFields({
  locale,
  englishLabel,
  chineseLabel,
  defaultEnglishValue = "",
  defaultChineseValue = "",
  englishId = "nameEn",
  chineseId = "nameZh",
  englishName = "nameEn",
  chineseName = "nameZh",
  englishDisabled = false,
  chineseDisabled = false,
}: BilingualNameFieldsProps) {
  const [visibleLocale, setVisibleLocale] = useState<"ZH_CN" | "EN">(locale);

  return (
    <div className="bilingual-fields full-span">
      <div className="bilingual-toggle" role="tablist" aria-label={`${englishLabel} / ${chineseLabel}`}>
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

      <div className={`field-stack ${visibleLocale === "EN" ? "" : "is-hidden"}`}>
        <label htmlFor={englishId}>{englishLabel}</label>
        <input
          id={englishId}
          name={englishName}
          defaultValue={defaultEnglishValue}
          disabled={englishDisabled}
        />
      </div>

      <div className={`field-stack ${visibleLocale === "ZH_CN" ? "" : "is-hidden"}`}>
        <label htmlFor={chineseId}>{chineseLabel}</label>
        <input
          id={chineseId}
          name={chineseName}
          defaultValue={defaultChineseValue}
          disabled={chineseDisabled}
        />
      </div>
    </div>
  );
}
