import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

export interface DeepLinkState {
    publicTagCode: string | null;
    restoredNotice: string | null;
    clearPublicTag: () => void;
}

function parsePublicTagFromLocation(): string | null {
    if (typeof window === "undefined") return null;
    const match = window.location.pathname.match(/^\/t\/([A-Za-z0-9_-]+)/);
    return match ? match[1].toUpperCase() : null;
}

export function useDeepLinkRoute(onKeyRestored?: () => void): DeepLinkState {
    const [publicTagCode, setPublicTagCode] = useState<string | null>(() =>
        parsePublicTagFromLocation(),
    );
    const [restoredNotice, setRestoredNotice] = useState<string | null>(null);

    // Sync with browser Back / Forward navigation
    useEffect(() => {
        if (typeof window === "undefined") return;
        const onPopState = () => {
            setPublicTagCode(parsePublicTagFromLocation());
        };
        window.addEventListener("popstate", onPopState);
        return () => window.removeEventListener("popstate", onPopState);
    }, []);

    // Handle /manage/:key capability recovery links
    useEffect(() => {
        if (typeof window === "undefined") return;
        const manageMatch = window.location.pathname.match(
            /^\/manage\/([A-Za-z0-9_-]+)/,
        );
        if (!manageMatch) return;

        const rawKey = manageMatch[1];
        api.restoreCapabilityKey(rawKey)
            .then((res) => {
                setRestoredNotice(
                    `Restored ${res.kind.toUpperCase()} "${res.label}" to this device!`,
                );
                window.history.replaceState({}, "", "/");
                onKeyRestored?.();
            })
            .catch(() => {
                setRestoredNotice(
                    "Invalid or expired capability recovery link.",
                );
                window.history.replaceState({}, "", "/");
            });
    }, [onKeyRestored]);

    const clearPublicTag = useCallback(() => {
        setPublicTagCode(null);
        if (
            typeof window !== "undefined" &&
            window.location.pathname.startsWith("/t/")
        ) {
            window.history.pushState({}, "", "/");
        }
    }, []);

    return { publicTagCode, restoredNotice, clearPublicTag };
}
