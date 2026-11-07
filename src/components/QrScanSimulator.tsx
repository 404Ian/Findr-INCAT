import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Camera,
    CameraOff,
    Flashlight,
    ImageUp,
    Keyboard,
    QrCode,
    Search,
    ShieldAlert,
    Sparkles,
} from "lucide-react";
import { PublicTagPage } from "./PublicTagPage";
import { Button, Card, Input } from "./ui/primitives";

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

interface TorchMediaTrackCapabilities extends MediaTrackCapabilities {
    torch?: boolean;
}

interface TorchConstraintSet extends MediaTrackConstraintSet {
    torch?: boolean;
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
    const [cameraState, setCameraState] = useState<
        "idle" | "denied" | "no_camera" | "notice"
    >("idle");
    const [cameraMessage, setCameraMessage] = useState<string | null>(null);

    const [torchSupported, setTorchSupported] = useState(false);
    const [torchOn, setTorchOn] = useState(false);

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
        setTorchSupported(false);
        setTorchOn(false);
    }, []);

    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, [stopCamera]);

    const toggleTorch = async () => {
        const stream = mediaStreamRef.current;
        if (!stream) return;
        const track = stream.getVideoTracks()[0];
        if (!track) return;
        const nextTorch = !torchOn;
        try {
            const advancedConstraint: TorchConstraintSet = {
                torch: nextTorch,
            };
            await track.applyConstraints({
                advanced: [advancedConstraint],
            });
            setTorchOn(nextTorch);
        } catch {
            setTorchSupported(false);
        }
    };

    const startCamera = async () => {
        setCameraState("idle");
        setCameraMessage(null);
        setManualError(null);

        if (!navigator.mediaDevices?.getUserMedia) {
            setCameraState("no_camera");
            setCameraMessage(
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

            // Check if hardware torch is supported on this video track
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack && "getCapabilities" in videoTrack) {
                const caps =
                    videoTrack.getCapabilities() as TorchMediaTrackCapabilities;
                setTorchSupported(Boolean(caps.torch));
            }

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }

            const detector = getNativeBarcodeDetector();
            if (!detector) {
                setCameraState("notice");
                setCameraMessage(
                    "Live camera preview active. Your browser does not expose native BarcodeDetector—type the 12-character tag code printed under the QR below.",
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
                        const code = extractTagCode(item.rawValue);
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
            }, 240);
        } catch (err: unknown) {
            stopCamera();
            const isDenied =
                err instanceof DOMException &&
                (err.name === "NotAllowedError" ||
                    err.name === "PermissionDeniedError");
            const isNotFound =
                err instanceof DOMException && err.name === "NotFoundError";

            if (isDenied) {
                setCameraState("denied");
                setCameraMessage(
                    "Camera permission was denied. Allow camera access in your browser bar or enter the tag code manually below.",
                );
            } else if (isNotFound) {
                setCameraState("no_camera");
                setCameraMessage(
                    "No camera was detected on this device. Upload a photo of the QR sticker or enter the code manually below.",
                );
            } else {
                setCameraState("no_camera");
                setCameraMessage(
                    err instanceof Error
                        ? err.message
                        : "Unable to start camera. Use the manual tag lookup below.",
                );
            }
        }
    };

    const handleScanImageFile = async (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setCameraMessage(null);
        setManualError(null);

        const detector = getNativeBarcodeDetector();
        if (!detector) {
            setManualError(
                "This browser does not support native image QR decoding. Enter the tag code printed on the sticker below.",
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

            const code = extractTagCode(barcodes[0].rawValue);
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
            <Card elevation="md" className="overflow-hidden p-5 sm:p-6">
                <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
                        <QrCode className="h-3.5 w-3.5" />
                        <span>In-App QR Tag Scanner</span>
                    </span>
                    <h2 className="font-display mt-2 text-xl font-bold text-text sm:text-2xl">
                        Scan a Findr INCAT Sticker
                    </h2>
                    <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                        Point your camera at any Findr QR tag, upload a photo of
                        a sticker, or enter the alphanumeric code printed under
                        the QR.
                    </p>
                </div>

                {/* Full-Bleed Camera Viewport with Corner Brackets & Scanning Line */}
                <div className="relative mt-4 overflow-hidden rounded-2xl border border-border bg-neutral-950 text-white">
                    <video
                        ref={videoRef}
                        playsInline
                        muted
                        className={`h-80 w-full object-cover ${
                            cameraActive ? "block" : "hidden"
                        }`}
                    />

                    {/* Scan Frame Overlay, Corner Brackets & Laser Line */}
                    {cameraActive && (
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-black/25">
                            <div className="relative h-52 w-52">
                                {/* 4 Corner Brackets */}
                                <span className="absolute top-0 left-0 h-7 w-7 rounded-tl-xl border-t-4 border-l-4 border-emerald-400" />
                                <span className="absolute top-0 right-0 h-7 w-7 rounded-tr-xl border-t-4 border-r-4 border-emerald-400" />
                                <span className="absolute bottom-0 left-0 h-7 w-7 rounded-bl-xl border-b-4 border-l-4 border-emerald-400" />
                                <span className="absolute right-0 bottom-0 h-7 w-7 rounded-br-xl border-r-4 border-b-4 border-emerald-400" />

                                {/* Subtle Animated Scanning Line */}
                                <div
                                    className="absolute right-2 left-2 h-0.5 bg-emerald-400 shadow-[0_0_10px_#34d399]"
                                    style={{
                                        animation:
                                            "scanLineSweep 2.1s ease-in-out infinite",
                                    }}
                                />
                            </div>
                            <span className="mt-3 rounded-full bg-black/65 px-3 py-1 text-[11px] font-medium text-neutral-200 backdrop-blur-xs">
                                Align QR sticker inside the frame
                            </span>
                        </div>
                    )}

                    {/* Idle / Permission-Denied / No-Camera State */}
                    {!cameraActive && (
                        <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                            {cameraState === "denied" ? (
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/20 text-red-300">
                                    <ShieldAlert className="h-7 w-7" />
                                </div>
                            ) : (
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-emerald-300">
                                    <Camera className="h-7 w-7" />
                                </div>
                            )}

                            <h3 className="font-display mt-3 text-base font-bold text-white">
                                {cameraState === "denied"
                                    ? "Camera Permission Needed"
                                    : cameraState === "no_camera"
                                      ? "Camera Unavailable"
                                      : "Ready to Scan"}
                            </h3>

                            <p className="mt-1 max-w-sm text-xs leading-relaxed text-neutral-300">
                                {cameraMessage ??
                                    "Use your phone or laptop camera to scan an item’s QR sticker directly."}
                            </p>

                            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
                                <Button
                                    variant="primary"
                                    onClick={startCamera}
                                    leftIcon={<Camera className="h-4 w-4" />}
                                >
                                    Start Camera Scanner
                                </Button>

                                <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/15">
                                    <ImageUp className="h-4 w-4 text-emerald-300" />
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

                    {/* Active Camera Bottom Controls (Torch Toggle & Stop) */}
                    {cameraActive && (
                        <div className="flex items-center justify-center gap-2.5 border-t border-white/10 bg-neutral-950/90 p-3">
                            {torchSupported && (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={toggleTorch}
                                    leftIcon={
                                        <Flashlight className="h-4 w-4" />
                                    }
                                >
                                    {torchOn ? "Torch ON" : "Torch"}
                                </Button>
                            )}
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={stopCamera}
                                leftIcon={<CameraOff className="h-4 w-4" />}
                            >
                                Stop Camera
                            </Button>
                        </div>
                    )}
                </div>

                {cameraActive && cameraMessage && (
                    <div className="mt-3 rounded-xl border border-found-border bg-found-bg p-3 text-xs text-found">
                        {cameraMessage}
                    </div>
                )}

                {/* Manual Code Fallback */}
                <form
                    onSubmit={handleManualSubmit}
                    className="mt-5 border-t border-border pt-4"
                >
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-text">
                        <Keyboard className="h-3.5 w-3.5 text-accent" />
                        <span>Manual Tag Code Lookup</span>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <div className="flex-1">
                            <Input
                                id="manual-tag-code"
                                value={manualInput}
                                onChange={(e) => setManualInput(e.target.value)}
                                placeholder="Enter tag code or URL"
                                aria-label="Manual Findr tag code"
                                className="font-mono uppercase placeholder:font-sans placeholder:normal-case"
                            />
                        </div>
                        <Button
                            type="submit"
                            variant="primary"
                            leftIcon={<Search className="h-4 w-4" />}
                        >
                            Open Tag
                        </Button>
                    </div>

                    {manualError && (
                        <p className="mt-2 text-xs font-medium text-danger">
                            {manualError}
                        </p>
                    )}
                </form>

                {/* Seeded Demo Tags */}
                <div className="mt-4 rounded-2xl border border-border bg-subtle/60 p-3.5 text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-text">
                        <Sparkles className="h-3.5 w-3.5 text-accent" />
                        <span>Try Seeded INCAT Campus Tags:</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setActiveCode("T7V3N9R4W2BC")}
                            className="rounded-xl border border-lost-border bg-lost-bg px-3 py-1.5 font-mono text-[11px] font-bold text-lost transition-opacity hover:opacity-90 cursor-pointer"
                        >
                            #T7V3N9R4W2BC (AquaFlask &middot; Lost Mode ON)
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveCode("K9M4X7P2Q8LA")}
                            className="rounded-xl border border-accent/30 bg-accent-soft px-3 py-1.5 font-mono text-[11px] font-bold text-accent transition-opacity hover:opacity-90 cursor-pointer"
                        >
                            #K9M4X7P2Q8LA (Casio ClassWiz Calculator)
                        </button>
                    </div>
                </div>
            </Card>

            <style>{`
                @keyframes scanLineSweep {
                    0%, 100% { top: 10px; opacity: 0.85; }
                    50% { top: calc(100% - 12px); opacity: 1; }
                }
                @media (prefers-reduced-motion: reduce) {
                    @keyframes scanLineSweep {
                        0%, 100% { top: 50%; opacity: 0.8; }
                    }
                }
            `}</style>
        </div>
    );
};

export default QrScanSimulator;
