"use client";

import { useState } from "react";
import { useBilingualFieldsScope } from "@/components/bilingual-fields-scope";

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

function detectInputLocale(value: string) {
  const significantChars = Array.from(value).filter((char) => /[\p{L}\p{N}]/u.test(char));
  if (!significantChars.length) {
    return "EN" as const;
  }

  const hanChars = significantChars.filter((char) => /\p{Script=Han}/u.test(char));
  return hanChars.length / significantChars.length >= 0.5 ? ("ZH_CN" as const) : ("EN" as const);
}

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
  const sharedScope = useBilingualFieldsScope();
  const [localVisibleLocale, setLocalVisibleLocale] = useState<"ZH_CN" | "EN">(locale);
  const [englishValue, setEnglishValue] = useState(defaultEnglishValue);
  const [chineseValue, setChineseValue] = useState(defaultChineseValue);
  const visibleLocale = sharedScope?.visibleLocale ?? localVisibleLocale;
  const setVisibleLocale = sharedScope?.setVisibleLocale ?? setLocalVisibleLocale;
  const showLocalToggle = !sharedScope;

  function routeValue(origin: "EN" | "ZH_CN", nextValue: string) {
    const detectedLocale = detectInputLocale(nextValue);

    if (origin === "EN") {
      if (detectedLocale === "ZH_CN" && !chineseDisabled && !chineseValue.trim()) {
        setChineseValue(nextValue);
        setEnglishValue("");
        setVisibleLocale("ZH_CN");
        return;
      }

      setEnglishValue(nextValue);
      return;
    }

    if (detectedLocale === "EN" && !englishDisabled && !englishValue.trim()) {
      setEnglishValue(nextValue);
      setChineseValue("");
      setVisibleLocale("EN");
      return;
    }

    setChineseValue(nextValue);
  }

  return (
    <div className="bilingual-fields full-span">
      {showLocalToggle ? (
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
      ) : null}

      <div className={`field-stack ${visibleLocale === "EN" ? "" : "is-hidden"}`}>
        <label htmlFor={englishId}>{englishLabel}</label>
        <input
          id={englishId}
          name={englishName}
          value={englishValue}
          onChange={(event) => routeValue("EN", event.target.value)}
          disabled={englishDisabled}
        />
      </div>

      <div className={`field-stack ${visibleLocale === "ZH_CN" ? "" : "is-hidden"}`}>
        <label htmlFor={chineseId}>{chineseLabel}</label>
        <input
          id={chineseId}
          name={chineseName}
          value={chineseValue}
          onChange={(event) => routeValue("ZH_CN", event.target.value)}
          disabled={chineseDisabled}
        />
      </div>
    </div>
  );
}
