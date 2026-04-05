"use client";

import { useEffect, useRef, useState } from "react";

type BarcodeScannerProps = {
  targetInputId: string;
  lookupEndpoint: string;
};

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string; format?: string }>>;
};

declare global {
  interface Window {
    BarcodeDetector?: {
      new (options?: { formats?: string[] }): BarcodeDetectorLike;
      getSupportedFormats?: () => Promise<string[]>;
    };
  }
}

export function BarcodeScanner({ targetInputId, lookupEndpoint }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetectorLike | null>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      for (const track of streamRef.current?.getTracks() ?? []) {
        track.stop();
      }
    };
  }, []);

  async function startScanner() {
    setError(null);
    setLookupMessage(null);

    if (!window.BarcodeDetector) {
      setError("BarcodeDetector is not available in this browser.");
      return;
    }

    try {
      detectorRef.current = new window.BarcodeDetector({
        formats: ["qr_code", "ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setActive(true);
      requestAnimationFrame(scanLoop);
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : "Failed to access the camera.");
    }
  }

  function stopScanner() {
    setActive(false);
    for (const track of streamRef.current?.getTracks() ?? []) {
      track.stop();
    }
    streamRef.current = null;
  }

  async function scanLoop() {
    if (!active || !videoRef.current || !detectorRef.current) {
      return;
    }

    try {
      const results = await detectorRef.current.detect(videoRef.current);
      const first = results[0];
      if (first?.rawValue) {
        const barcodeInput = document.getElementById(targetInputId) as HTMLInputElement | null;
        if (barcodeInput) {
          barcodeInput.value = first.rawValue;
        }

        const formatInput = document.getElementById("barcodeFormat") as HTMLInputElement | null;
        if (formatInput) {
          formatInput.value = first.format || "";
        }

        stopScanner();

        try {
          const response = await fetch(`${lookupEndpoint}?code=${encodeURIComponent(first.rawValue)}`);
          const payload = (await response.json()) as {
            found?: boolean;
            result?: { title?: string; brand?: string; model?: string };
          };

          if (payload.found && payload.result) {
            const enName = document.getElementById("nameEn") as HTMLInputElement | null;
            const brand = document.getElementById("brand") as HTMLInputElement | null;
            const model = document.getElementById("model") as HTMLInputElement | null;

            if (enName && !enName.value && payload.result.title) {
              enName.value = payload.result.title;
            }
            if (brand && !brand.value && payload.result.brand) {
              brand.value = payload.result.brand;
            }
            if (model && !model.value && payload.result.model) {
              model.value = payload.result.model;
            }
            setLookupMessage("Lookup returned some suggested product metadata.");
          } else {
            setLookupMessage("Barcode captured. No external metadata provider is configured or matched.");
          }
        } catch {
          setLookupMessage("Barcode captured. Metadata lookup did not return usable data.");
        }

        return;
      }
    } catch {
      // Ignore transient detector errors and continue scanning.
    }

    requestAnimationFrame(scanLoop);
  }

  return (
    <div className="scanner-card">
      <div className="scanner-actions">
        <button type="button" onClick={active ? stopScanner : startScanner}>
          {active ? "Stop scanner" : "Start scanner"}
        </button>
      </div>
      <video ref={videoRef} className={`scanner-preview ${active ? "is-active" : ""}`} muted playsInline />
      {error ? <p className="muted">{error}</p> : null}
      {lookupMessage ? <p className="muted">{lookupMessage}</p> : null}
    </div>
  );
}
