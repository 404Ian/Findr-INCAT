import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Camera,
    CameraOff,
    ImageUp,
    Keyboard,
    QrCode,
    Search,
    Sparkles,
} from "lucide-react";
import { PublicTagPage } from "./PublicTagPage";

export interface QrScanSimulatorProps {
    initialCode?: string | null;
    onCodeResolved?: (code: string) => void;
}

interface DetectedBarcode {
    rawValue: string;
}

interface BarcodeDetectorInstance {
    detect(source: ImageBitmapSource): Promise<DetectedBarcode[]>;
}

interface BarcodeDetectorConstructor {
    new (options?: { formats?: string[] }): BarcodeDetectorInstance;
}

function getNativeBarcodeDetector(): BarcodeDetectorInstance | null {
    if (typeof window === "undefined") return null;
    const win = window as Window & {
        BarcodeDetector?: BarcodeDetectorConstructor;
    };
    if (!win.BarcodeDetector) return null;
    try {
        return new win.BarcodeDetector({ formats: ["qr_code"] });
    } catch {
        return null;
    }
}

function extractTagCode(rawInput: string): string | null {
    const trimmed = rawInput.trim();
    if (!trimmed) return null;

    const urlMatch = trimmed.match(/\/t\/([A-Za-z0-9_-]{6,32})/i);
    if (urlMatch) {
        return urlMatch[1].toUpperCase();
    }

    const cleanCode = trimmed.replace(/^#/, "").toUpperCase();
    if (/^[A-Z0-9_-]{6,32}$/.test(cleanCode)) {
        return cleanCode;
    }

    return null;
}

export const QrScanSimulator: React.FC<QrScanSimulatorProps> = ({
    initialCode = null,
    onCodeResolved,
}) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const scanTimerRef = useRef<number | null>(null);

    const [activeCode, setActiveCode] = useState<string | null>(
        initialCode ? extractTagCode(initialCode) : null,
    );
    const [cameraActive, setCameraActive] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [manualInput, setManualInput] = useState("");
    const [manualError, setManualError] = useState<string | null>(null);

    useEffect(() => {
        if (initialCode) {
            const parsed = extractTagCode(initialCode);
            if (parsed) setActiveCode(parsed);
        }
    }, [initialCode]);

    const stopCamera = useCallback(() => {
        if (scanTimerRef.current !== null) {
            window.clearInterval(scanTimerRef.current);
            scanTimerRef.current = null;
        }
        if (mediaStreamRef.current) {
            for (const track of mediaStreamRef.current.getTracks()) {
                track.stop();
            }
            mediaStreamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setCameraActive(false);
    }, []);

    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, [stopCamera]);

    const startCamera = async () => {
        setCameraError(null);
        setManualError(null);

        if (!navigator.mediaDevices?.getUserMedia) {
            setCameraError(
                "Camera access requires HTTPS or localhost. Use manual tag code lookup below.",
            );
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: "environment" } },
                audio: false,
            });
            mediaStreamRef.current = stream;
            setCameraActive(true);

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }

            const detector = getNativeBarcodeDetector();
            if (!detector) {
                setCameraError(
                    "Live camera preview active. Your browser does not expose native BarcodeDetector—type the tag code printed under the QR below.",
                );
                return;
            }

            scanTimerRef.current = window.setInterval(async () => {
                const videoEl = videoRef.current;
                if (!videoEl || videoEl.readyState < 2) return;
                try {
                    const results: DetectedBarcode[] =
                        await detector.detect(videoEl);
                    for (const item of results) {
                        const decodedText: string = item.rawValue;
                        const code = extractTagCode(decodedText);
                        if (code) {
                            stopCamera();
                            setActiveCode(code);
                            onCodeResolved?.(code);
                            break;
                        }
                    }
                } catch {
                    // Ignore single-frame detection errors
                }
            }, 250);
        } catch (err: unknown) {
            stopCamera();
            setCameraError(
                err instanceof Error
                    ? err.message
                    : "Camera permission was denied or no camera was detected on this device. Use manual code entry below.",
            );
        }
    };

    const handleScanImageFile = async (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setCameraError(null);
        setManualError(null);

        const detector = getNativeBarcodeDetector();
        if (!detector) {
            setManualError(
                "This browser does not support native image QR decoding. Please enter the 12-character tag code printed on the sticker below.",
            );
            e.target.value = "";
            return;
        }

        try {
            const bitmap = await createImageBitmap(file);
            const barcodes: DetectedBarcode[] = await detector.detect(bitmap);
            bitmap.close();

            if (barcodes.length === 0) {
                setManualError(
                    "No QR code was detected in that photo. Try a clearer image or enter the tag code below.",
                );
                return;
            }

            const decodedText: string = barcodes[0].rawValue;
            const code = extractTagCode(decodedText);
            if (!code) {
                setManualError(
                    "QR code was read, but it is not a Findr INCAT tag.",
                );
                return;
            }

            setActiveCode(code);
            onCodeResolved?.(code);
        } catch {
            setManualError(
                "Could not decode QR image. Enter the tag code printed on the sticker below.",
            );
        } finally {
            e.target.value = "";
        }
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setManualError(null);
        const code = extractTagCode(manualInput);
        if (!code) {
            setManualError(
                "Please enter a valid Findr tag code (e.g., K9M4X7P2Q8LA) or /t/ URL.",
            );
            return;
        }
        stopCamera();
        setActiveCode(code);
        onCodeResolved?.(code);
    };

    if (activeCode) {
        return (
            <PublicTagPage
                publicCode={activeCode}
                onBack={() => setActiveCode(null)}
            />
        );
    }

    return (
        <div className="mx-auto max-w-xl space-y-5">
            <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 p-5 shadow-xl">
                <div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                        <QrCode className="h-4 w-4" />
                        <span>In-App QR Tag Scanner</span>
                    </span>
                    <h2 className="mt-1 text-lg font-bold text-neutral-100">
                        Scan a Findr INCAT Sticker
                    </h2>
                    <p className="mt-0.5 text-xs text-neutral-400">
                        Point your camera at any Findr QR tag, upload a
                        screenshot, or enter the alphanumeric code printed on
                        the sticker.
                    </p>
                </div>

                <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">
                    <video
                        ref={videoRef}
                        playsInline
                        muted
                        className={`h-64 w-full object-cover ${
                            cameraActive ? "block" : "hidden"
                        }`}
                    />

                    {!cameraActive && (
                        <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
                            <div className="rounded-2xl bg-emerald-500/10 p-3.5 text-emerald-400">
                                <Camera className="h-8 w-8" />
                            </div>
                            <p className="mt-3 text-xs text-neutral-300">
                                Use your phone or laptop camera to scan an
                                item&apos;s QR tag directly.
                            </p>

                            <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                                <button
                                    type="button"
                                    onClick={startCamera}
                                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500"
                                >
                                    <Camera className="h-4 w-4" />
                                    <span>Start Camera Scanner</span>
                                </button>

                                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-2.5 text-xs font-semibold text-neutral-200 hover:bg-neutral-800">
                                    <ImageUp className="h-4 w-4 text-emerald-400" />
                                    <span>Scan from Photo</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleScanImageFile}
                                        className="sr-only"
                                    />
                                </label>
                            </div>
                        </div>
                    )}

                    {cameraActive && (
                        <div className="flex justify-center border-t border-neutral-800 bg-neutral-950 p-3">
                            <button
                                type="button"
                                onClick={stopCamera}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-950/30 px-4 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-900/40"
                            >
                                <CameraOff className="h-4 w-4" />
                                <span>Stop Camera</span>
                            </button>
                        </div>
                    )}
                </div>

                {cameraError && (
                    <div className="mt-3 rounded-xl border border-amber-500/40 bg-amber-950/20 p-3 text-xs text-amber-200">
                        {cameraError}
                    </div>
                )}

                <form
                    onSubmit={handleManualSubmit}
                    className="mt-5 border-t border-neutral-800/80 pt-4"
                >
                    <label
                        htmlFor="manual-tag-code"
                        className="flex items-center gap-1.5 text-xs font-semibold text-neutral-300"
                    >
                        <Keyboard className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Manual Tag Code Lookup</span>
                    </label>

                    <div className="mt-2 flex items-center gap-2">
                        <input
                            id="manual-tag-code"
                            type="text"
                            value={manualInput}
                            onChange={(e) => setManualInput(e.target.value)}
                            placeholder="Enter code (e.g., K9M4X7P2Q8LA or T7V3N9R4W2BC)"
                            className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3.5 py-2 font-mono text-xs text-neutral-100 uppercase placeholder:font-sans placeholder:normal-case placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none"
                        />
                        <button
                            type="submit"
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                        >
                            <Search className="h-3.5 w-3.5" />
                            <span>Open Tag</span>
                        </button>
                    </div>

                    {manualError && (
                        <p className="mt-2 text-xs text-rose-400">
                            {manualError}
                        </p>
                    )}
                </form>

                <div className="mt-4 rounded-xl border border-neutral-800/80 bg-neutral-900/40 p-3 text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-neutral-300">
                        <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Try Seeded INCAT Campus Tags:</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setActiveCode("T7V3N9R4W2BC")}
                            className="rounded-lg border border-rose-500/40 bg-rose-950/25 px-3 py-1.5 font-mono text-[11px] text-rose-200 hover:bg-rose-950/40"
                        >
                            #T7V3N9R4W2BC (AquaFlask &middot; Lost Mode ON)
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveCode("K9M4X7P2Q8LA")}
                            className="rounded-lg border border-emerald-500/40 bg-emerald-950/25 px-3 py-1.5 font-mono text-[11px] text-emerald-200 hover:bg-emerald-950/40"
                        >
                            #K9M4X7P2Q8LA (Casio ClassWiz Calculator)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QrScanSimulator;
