import React, { useEffect, useId, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
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

function extractTagCode(rawInput: string): string | null {
    const trimmed = rawInput.trim();
    if (!trimmed) return null;

    // Match /t/CODE in a scanned URL
    const urlMatch = trimmed.match(/\/t\/([A-Za-z0-9_-]{6,32})/i);
    if (urlMatch) {
        return urlMatch[1].toUpperCase();
    }

    // Or direct alphanumeric code (#K9M4X7P2Q8LA or K9M4X7P2Q8LA)
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
    const scannerRegionId = useId().replace(/:/g, "_");
    const scannerRef = useRef<Html5Qrcode | null>(null);

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

    const stopCamera = async () => {
        if (scannerRef.current) {
            try {
                if (scannerRef.current.isScanning) {
                    await scannerRef.current.stop();
                }
                scannerRef.current.clear();
            } catch {
                // Ignore stop errors
            }
            scannerRef.current = null;
        }
        setCameraActive(false);
    };

    useEffect(() => {
        return () => {
            void stopCamera();
        };
    }, []);

    const startCamera = async () => {
        setCameraError(null);
        setManualError(null);

        try {
            const instance = new Html5Qrcode(scannerRegionId);
            scannerRef.current = instance;
            setCameraActive(true);

            await instance.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 220, height: 220 } },
                (decodedText) => {
                    const code = extractTagCode(decodedText);
                    if (code) {
                        void stopCamera();
                        setActiveCode(code);
                        onCodeResolved?.(code);
                    }
                },
                () => {
                    // Frame without QR code; ignore
                },
            );
        } catch (err) {
            setCameraActive(false);
            setCameraError(
                err instanceof Error
                    ? err.message
                    : "Camera permission was denied or no camera was detected on this device. Use photo scan or manual code entry below.",
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

        try {
            const instance = new Html5Qrcode(scannerRegionId);
            const decodedText = await instance.scanFile(file, false);
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
                "Could not detect a valid QR code in that image. Try a clearer photo or type the tag code below.",
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
        void stopCamera();
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
            {/* Scanner Card */}
            <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 p-5 shadow-xl">
                <div className="flex items-center justify-between">
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
                            screenshot, or enter the alphanumeric code printed
                            on the sticker.
                        </p>
                    </div>
                </div>

                {/* Camera Viewport */}
                <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">
                    <div id={scannerRegionId} className="w-full" />

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

                {/* Manual Tag Code Fallback */}
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

                {/* Quick Demo Seeded INCAT Tags for Testing */}
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
