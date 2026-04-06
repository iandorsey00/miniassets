"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";

type AssetShareActionsProps = {
  locationPath: string;
  assetInfo: string;
  labels: {
    copyLocationPath: string;
    copyAssetInfo: string;
    copiedLocationPath: string;
    copiedAssetInfo: string;
  };
};

export function AssetShareActions({ locationPath, assetInfo, labels }: AssetShareActionsProps) {
  const [message, setMessage] = useState("");

  async function copyText(value: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(successMessage);
      window.setTimeout(() => setMessage(""), 2200);
    } catch {
      setMessage("");
    }
  }

  return (
    <div className="asset-share-actions">
      <button type="button" className="ghost-button icon-button" onClick={() => void copyText(locationPath, labels.copiedLocationPath)}>
        <Share2 size={16} />
        <span>{labels.copyLocationPath}</span>
      </button>
      <button type="button" className="ghost-button icon-button" onClick={() => void copyText(assetInfo, labels.copiedAssetInfo)}>
        <Share2 size={16} />
        <span>{labels.copyAssetInfo}</span>
      </button>
      {message ? <p className="muted asset-share-feedback">{message}</p> : null}
    </div>
  );
}
