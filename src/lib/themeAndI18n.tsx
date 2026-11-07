import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import type { LanguageCode } from "../types";

export type ThemeMode = "light" | "dark" | "system";

const TRANSLATIONS: Record<
    LanguageCode,
    {
        postItem: string;
        tabWall: string;
        tabMyItems: string;
        tabScan: string;
        showMap: string;
        hideMap: string;
        heroBadge: string;
        heroTitle: string;
        heroSubtitle: string;
        statMissing: string;
        statFound: string;
        statReturned: string;
        searchPlaceholder: string;
        filterAll: string;
        filterLost: string;
        filterFound: string;
        moreFilters: string;
        clearFilters: string;
        emptyTitle: string;
        emptyBody: string;
        postMissingCta: string;
        statusLost: string;
        statusFound: string;
        statusReturned: string;
        statusClaimed: string;
        viewDetails: string;
        themeLight: string;
        themeDark: string;
    }
> = {
    en: {
        postItem: "Post Item",
        tabWall: "Board",
        tabMyItems: "My items",
        tabScan: "Scan",
        showMap: "Show INCAT Map",
        hideMap: "Hide INCAT Map",
        heroBadge: "INCAT Lost & Found Board",
        heroTitle: "What’s missing at INCAT?",
        heroSubtitle:
            "Check items turned in at the Guard House, Guidance Office, or department shops. No account or login needed.",
        statMissing: "missing items",
        statFound: "found items",
        statReturned: "returned home",
        searchPlaceholder:
            "Search items, calculators, ID cards, shop tools, buildings...",
        filterAll: "All",
        filterLost: "Lost",
        filterFound: "Found",
        moreFilters: "Filters",
        clearFilters: "Clear all",
        emptyTitle: "No matching items on the board",
        emptyBody:
            "Try clearing a filter, searching another building, or post a notice directly.",
        postMissingCta: "Post a lost or found item",
        statusLost: "Lost",
        statusFound: "Found",
        statusReturned: "Returned",
        statusClaimed: "Claimed",
        viewDetails: "View",
        themeLight: "Switch to light mode",
        themeDark: "Switch to dark mode",
    },
    tl: {
        postItem: "Mag-post",
        tabWall: "Board",
        tabMyItems: "Mga Gamit",
        tabScan: "I-scan",
        showMap: "Ipakita ang Mapa",
        hideMap: "Itago ang Mapa",
        heroBadge: "INCAT Lost & Found Board",
        heroTitle: "May nawawala ba sa INCAT?",
        heroSubtitle:
            "Tingnan ang mga naisoli sa Guard House, Guidance Office, o mga shop. Walang account na kailangan.",
        statMissing: "nawawala",
        statFound: "napulot",
        statReturned: "naibalik na",
        searchPlaceholder: "Maghanap ng gamit, calculator, ID, building...",
        filterAll: "Lahat",
        filterLost: "Nawawala",
        filterFound: "Napulot",
        moreFilters: "Salaan",
        clearFilters: "I-clear lahat",
        emptyTitle: "Walang nahanap na gamit",
        emptyBody:
            "Subukang baguhin ang hinahanap o mag-post ng nawawala o napulot na gamit.",
        postMissingCta: "Mag-post ng gamit",
        statusLost: "Nawawala",
        statusFound: "Napulot",
        statusReturned: "Naibalik",
        statusClaimed: "May Nag-claim",
        viewDetails: "Tingnan",
        themeLight: "Gawing maliwanag",
        themeDark: "Gawing madilim",
    },
    ilo: {
        postItem: "Ag post",
        tabWall: "Board",
        tabMyItems: "Alikamen",
        tabScan: "Ag Scan",
        showMap: "Ipakita ti Mapa",
        hideMap: "Ilemmeng ti Mapa",
        heroBadge: "INCAT Lost & Found Board",
        heroTitle: "Ania ti mapukpukaw ditoy INCAT?",
        heroSubtitle:
            "Kitaen dagiti naipan idiay Guard House, Guidance Office, wenno department shops. Awan account a masapul.",
        statMissing: "mapukpukaw",
        statFound: "nasarakan",
        statReturned: "naisublin",
        searchPlaceholder: "Agbirok ti gamit, calculator, ID card, pasdek...",
        filterAll: "Amin",
        filterLost: "Mapukpukaw",
        filterFound: "Nasarakan",
        moreFilters: "Pilien",
        clearFilters: "Ikkaten amin",
        emptyTitle: "Awan ti nasarakan a kapada",
        emptyBody:
            "Padasem a baliwan ti birokem wenno ag-post ti baro a pakaammo.",
        postMissingCta: "Ag-post ti gamit",
        statusLost: "Mapukpukaw",
        statusFound: "Nasarakan",
        statusReturned: "Naisublin",
        statusClaimed: "Adda Nagtunton",
        viewDetails: "Kitaen",
        themeLight: "Silaw nga tema",
        themeDark: "Nasipnget nga tema",
    },
};

interface ThemeAndI18nContextValue {
    theme: "light" | "dark";
    themeMode: ThemeMode;
    setThemeMode: (mode: ThemeMode) => void;
    toggleTheme: () => void;
    lang: LanguageCode;
    setLang: (lang: LanguageCode) => void;
    t: (typeof TRANSLATIONS)["en"];
}

const ThemeAndI18nContext = createContext<ThemeAndI18nContextValue | null>(
    null,
);

function resolveEffectiveTheme(mode: ThemeMode): "light" | "dark" {
    if (mode === "light" || mode === "dark") return mode;
    if (typeof window !== "undefined") {
        return window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
    }
    return "light";
}

export function ThemeAndI18nProvider({ children }: { children: ReactNode }) {
    const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
        if (typeof window === "undefined") return "system";
        const saved = localStorage.getItem("findr-theme");
        if (saved === "light" || saved === "dark" || saved === "system") {
            return saved;
        }
        return "system";
    });

    const [theme, setTheme] = useState<"light" | "dark">(() =>
        resolveEffectiveTheme(themeMode),
    );

    const [lang, setLangState] = useState<LanguageCode>(() => {
        if (typeof window === "undefined") return "en";
        const saved = localStorage.getItem("findr-lang");
        if (saved === "en" || saved === "tl" || saved === "ilo") {
            return saved;
        }
        return "en";
    });

    const applyDomTheme = useCallback((resolved: "light" | "dark") => {
        const root = document.documentElement;
        if (resolved === "dark") {
            root.classList.add("dark");
            root.setAttribute("data-theme", "dark");
        } else {
            root.classList.remove("dark");
            root.setAttribute("data-theme", "light");
        }
        setTheme(resolved);
    }, []);

    useEffect(() => {
        const resolved = resolveEffectiveTheme(themeMode);
        applyDomTheme(resolved);

        if (themeMode !== "system") return;
        const mql = window.matchMedia("(prefers-color-scheme: dark)");
        const listener = (e: MediaQueryListEvent) => {
            applyDomTheme(e.matches ? "dark" : "light");
        };
        mql.addEventListener("change", listener);
        return () => mql.removeEventListener("change", listener);
    }, [themeMode, applyDomTheme]);

    const setThemeMode = useCallback((mode: ThemeMode) => {
        setThemeModeState(mode);
        try {
            localStorage.setItem("findr-theme", mode);
        } catch {
            // ignore storage errors
        }
    }, []);

    const toggleTheme = useCallback(() => {
        const next = theme === "dark" ? "light" : "dark";
        setThemeMode(next);
    }, [theme, setThemeMode]);

    const setLang = useCallback((next: LanguageCode) => {
        setLangState(next);
        try {
            localStorage.setItem("findr-lang", next);
        } catch {
            // ignore storage errors
        }
    }, []);

    const value = useMemo<ThemeAndI18nContextValue>(
        () => ({
            theme,
            themeMode,
            setThemeMode,
            toggleTheme,
            lang,
            setLang,
            t: TRANSLATIONS[lang],
        }),
        [theme, themeMode, setThemeMode, toggleTheme, lang, setLang],
    );

    return (
        <ThemeAndI18nContext.Provider value={value}>
            {children}
        </ThemeAndI18nContext.Provider>
    );
}

export function useThemeAndI18n() {
    const ctx = useContext(ThemeAndI18nContext);
    if (!ctx) {
        throw new Error(
            "useThemeAndI18n must be used within ThemeAndI18nProvider",
        );
    }
    return ctx;
}
