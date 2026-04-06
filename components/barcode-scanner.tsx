"use client";

import { useEffect, useRef, useState } from "react";
import type { BarcodeFormat, BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";

type BarcodeScannerProps = {
  targetInputId: string;
  lookupEndpoint: string;
  labels: {
    start: string;
    stop: string;
    unavailable: string;
    cameraFailed: string;
    lookupSuccess: string;
    lookupMissing: string;
    lookupFailed: string;
  };
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

export function BarcodeScanner({ targetInputId, lookupEndpoint, labels }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetectorLike | null>(null);
  const zxingReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const scannerControlsRef = useRef<IScannerControls | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const handlingScanRef = useRef(false);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      stopScanner();
      void audioContextRef.current?.close();
    };
  }, []);

  async function playSuccessTone() {
    const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) {
      return;
    }

    const audioContext = audioContextRef.current ?? new AudioContextCtor();
    audioContextRef.current = audioContext;

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const now = audioContext.currentTime;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, now);
    oscillator.frequency.linearRampToValueAtTime(1174, now + 0.08);

    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.16);
  }

  async function applyBarcodeResult(rawValue: string, format?: string) {
    if (handlingScanRef.current) {
      return;
    }

    handlingScanRef.current = true;

    await playSuccessTone();

    const barcodeInput = document.getElementById(targetInputId) as HTMLInputElement | null;
    if (barcodeInput) {
      barcodeInput.value = rawValue;
    }

    const formatInput = document.getElementById("barcodeFormat") as HTMLInputElement | null;
    if (formatInput) {
      formatInput.value = format || "";
    }

    const sourceInput = document.getElementById("barcodeSource") as HTMLInputElement | null;
    if (sourceInput && !sourceInput.value) {
      sourceInput.value = "scan";
    }

    stopScanner();

    try {
      const response = await fetch(`${lookupEndpoint}?code=${encodeURIComponent(rawValue)}`);
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
        setLookupMessage(labels.lookupSuccess);
      } else {
        setLookupMessage(labels.lookupMissing);
      }
    } catch {
      setLookupMessage(labels.lookupFailed);
    } finally {
      handlingScanRef.current = false;
    }
  }

  async function startScanner() {
    setError(null);
    setLookupMessage(null);

    try {
      if (window.BarcodeDetector) {
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
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia || !videoRef.current) {
        setError(labels.unavailable);
        return;
      }

      const { BarcodeFormat: ZxingBarcodeFormat, BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();
      zxingReaderRef.current = reader;
      setActive(true);
      scannerControlsRef.current = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        async (result) => {
          if (!result) {
            return;
          }

          const formatValue = ZxingBarcodeFormat[result.getBarcodeFormat() as BarcodeFormat] || "";
          await applyBarcodeResult(result.getText(), formatValue);
        },
      );
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : labels.cameraFailed);
    }
  }

  function stopScanner() {
    setActive(false);
    scannerControlsRef.current?.stop();
    scannerControlsRef.current = null;
    zxingReaderRef.current = null;

    for (const track of streamRef.current?.getTracks() ?? []) {
      track.stop();
    }
    streamRef.current = null;
    detectorRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  async function scanLoop() {
    if (!active || !videoRef.current || !detectorRef.current) {
      return;
    }

    try {
      const results = await detectorRef.current.detect(videoRef.current);
      const first = results[0];
      if (first?.rawValue) {
        await applyBarcodeResult(first.rawValue, first.format || "");
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
          {active ? labels.stop : labels.start}
        </button>
      </div>
      <video ref={videoRef} className={`scanner-preview ${active ? "is-active" : ""}`} muted playsInline />
      {error ? <p className="muted">{error}</p> : null}
      {lookupMessage ? <p className="muted">{lookupMessage}</p> : null}
    </div>
  );
}
