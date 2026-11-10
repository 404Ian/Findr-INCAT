import {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from "react";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { useThemeAndI18n } from "../lib/themeAndI18n";

export interface TurnstileWidgetHandle {
    reset: () => void;
    getResponse: () => string | null;
}

export interface TurnstileWidgetProps {
    onVerify: (token: string) => void;
    onExpire?: () => void;
    onError?: (errorCode?: string) => void;
    action?: string;
    className?: string;
}

interface TurnstileRenderOptions {
    sitekey: string;
    theme?: "light" | "dark" | "auto";
    size?: "normal" | "compact" | "flexible";
    action?: string;
    callback?: (token: string) => void;
    "expired-callback"?: () => void;
    "error-callback"?: (errorCode?: string) => boolean | void;
    "timeout-callback"?: () => void;
}

interface TurnstileGlobal {
    render: (
        container: HTMLElement | string,
        options: TurnstileRenderOptions,
    ) => string;
    reset: (widgetId?: string) => void;
    remove: (widgetId?: string) => void;
    getResponse: (widgetId?: string) => string | undefined;
}

declare global {
    interface Window {
        turnstile?: TurnstileGlobal;
        onFindrTurnstileLoad?: () => void;
    }
}

const TURNSTILE_SCRIPT_ID = "cf-turnstile-Explicit-script";
const TURNSTILE_SCRIPT_SRC =
    "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onFindrTurnstileLoad";

// Fallback to production widget site key if build env var was omitted, or Cloudflare test key in local dev
const ENV_SITE_KEY = (
    import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined
)?.trim();

const RESOLVED_SITE_KEY =
    ENV_SITE_KEY ||
    (import.meta.env.DEV
        ? "1x00000000000000000000AA"
        : "0x4AAAAAAF2kiIgXAVwKFGzo");

let scriptLoadPromise: Promise<void> | null = null;

function ensureTurnstileScript(): Promise<void> {
    if (typeof window === "undefined") return Promise.resolve();
    if (window.turnstile) return Promise.resolve();
    if (scriptLoadPromise) return scriptLoadPromise;

    scriptLoadPromise = new Promise<void>((resolve, reject) => {
        const existing = document.getElementById(
            TURNSTILE_SCRIPT_ID,
        ) as HTMLScriptElement | null;

        window.onFindrTurnstileLoad = () => {
            resolve();
        };

        if (existing) {
            existing.addEventListener("load", () => resolve(), { once: true });
            existing.addEventListener(
                "error",
                () => reject(new Error("Turnstile script failed to load")),
                { once: true },
            );
            return;
        }

        const script = document.createElement("script");
        script.id = TURNSTILE_SCRIPT_ID;
        script.src = TURNSTILE_SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        script.onerror = () => {
            scriptLoadPromise = null;
            reject(
                new Error(
                    "Blocked or failed to load https://challenges.cloudflare.com/turnstile/v0/api.js (check CSP).",
                ),
            );
        };
        document.head.appendChild(script);
    });

    return scriptLoadPromise;
}

export const TurnstileWidget = forwardRef<
    TurnstileWidgetHandle,
    TurnstileWidgetProps
>(function TurnstileWidget(
    { onVerify, onExpire, onError, action, className = "" },
    ref,
) {
    const { theme } = useThemeAndI18n();
    const containerRef = useRef<HTMLDivElement | null>(null);
    const widgetIdRef = useRef<string | null>(null);

    const [status, setStatus] = useState<
        "loading" | "verifying" | "verified" | "expired" | "error"
    >("loading");
    const [errorDetail, setErrorDetail] = useState<string | null>(null);

    const onVerifyRef = useRef(onVerify);
    const onExpireRef = useRef(onExpire);
    const onErrorRef = useRef(onError);

    useEffect(() => {
        onVerifyRef.current = onVerify;
        onExpireRef.current = onExpire;
        onErrorRef.current = onError;
    }, [onVerify, onExpire, onError]);

    useEffect(() => {
        if (!ENV_SITE_KEY && !import.meta.env.DEV) {
            console.warn(
                "[TurnstileWidget] VITE_TURNSTILE_SITE_KEY was not set at build time; using fallback site key.",
            );
        }
    }, []);

    const handleReset = useCallback(() => {
        onVerifyRef.current("");
        setErrorDetail(null);
        if (window.turnstile && widgetIdRef.current !== null) {
            try {
                window.turnstile.reset(widgetIdRef.current);
                setStatus("verifying");
            } catch {
                // ignore reset errors if widget was unmounted
            }
        }
    }, []);

    useImperativeHandle(
        ref,
        () => ({
            reset: handleReset,
            getResponse: () => {
                if (!window.turnstile || widgetIdRef.current === null) {
                    return null;
                }
                return (
                    window.turnstile.getResponse(widgetIdRef.current) ?? null
                );
            },
        }),
        [handleReset],
    );

    useEffect(() => {
        let cancelled = false;
        setStatus("loading");
        setErrorDetail(null);

        ensureTurnstileScript()
            .then(() => {
                if (cancelled || !containerRef.current || !window.turnstile) {
                    return;
                }
                if (widgetIdRef.current !== null) {
                    try {
                        window.turnstile.remove(widgetIdRef.current);
                    } catch {
                        // ignore
                    }
                    widgetIdRef.current = null;
                }

                setStatus("verifying");
                const id = window.turnstile.render(containerRef.current, {
                    sitekey: RESOLVED_SITE_KEY,
                    theme: theme === "dark" ? "dark" : "light",
                    action,
                    callback: (token: string) => {
                        if (cancelled) return;
                        setStatus("verified");
                        setErrorDetail(null);
                        onVerifyRef.current(token);
                    },
                    "expired-callback": () => {
                        if (cancelled) return;
                        setStatus("expired");
                        onVerifyRef.current("");
                        onExpireRef.current?.();
                    },
                    "timeout-callback": () => {
                        if (cancelled) return;
                        setStatus("expired");
                        onVerifyRef.current("");
                        onExpireRef.current?.();
                    },
                    "error-callback": (errCode?: string) => {
                        if (cancelled) return;
                        setStatus("error");
                        setErrorDetail(errCode ? `Code ${errCode}` : null);
                        onVerifyRef.current("");
                        onErrorRef.current?.(errCode);
                    },
                });
                widgetIdRef.current = id;
            })
            .catch((err: unknown) => {
                if (cancelled) return;
                setStatus("error");
                setErrorDetail(
                    err instanceof Error
                        ? err.message
                        : "Failed to load verification widget.",
                );
                onVerifyRef.current("");
                onErrorRef.current?.("SCRIPT_LOAD_FAILED");
            });

        return () => {
            cancelled = true;
            if (window.turnstile && widgetIdRef.current !== null) {
                try {
                    window.turnstile.remove(widgetIdRef.current);
                } catch {
                    // ignore
                }
                widgetIdRef.current = null;
            }
        };
    }, [theme, action]);

    return (
        <div
            className={`rounded-2xl border border-border bg-subtle/40 p-3.5 text-xs ${className}`}
        >
            <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 font-semibold text-text">
                    {(status === "loading" || status === "verifying") && (
                        <>
                            <Loader2 className="size-3.5 animate-spin text-accent" />
                            <span>Verifying you are human...</span>
                        </>
                    )}
                    {status === "verified" && (
                        <>
                            <CheckCircle2 className="size-3.5 text-accent" />
                            <span className="text-accent">
                                Human verification complete
                            </span>
                        </>
                    )}
                    {status === "expired" && (
                        <>
                            <AlertCircle className="size-3.5 text-found" />
                            <span className="text-found">
                                Verification expired
                            </span>
                        </>
                    )}
                    {status === "error" && (
                        <>
                            <AlertCircle className="size-3.5 text-danger" />
                            <span className="text-danger">
                                Verification check failed{" "}
                                {errorDetail ? `(${errorDetail})` : ""}
                            </span>
                        </>
                    )}
                </div>

                {(status === "expired" || status === "error") && (
                    <button
                        type="button"
                        onClick={handleReset}
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2 py-1 text-[11px] font-semibold text-text hover:bg-subtle cursor-pointer"
                    >
                        <RefreshCw className="size-3" />
                        <span>Retry check</span>
                    </button>
                )}
            </div>

            <div
                ref={containerRef}
                className="min-h-16.25 overflow-x-auto"
                aria-label="Cloudflare Turnstile human verification"
            />
        </div>
    );
});

export default TurnstileWidget;
