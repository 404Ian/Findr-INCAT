import { Suspense, lazy } from "react";
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    useTransition,
} from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import {
    ArrowRight,
    Globe,
    LayoutGrid,
    MapPin,
    Moon,
    Plus,
    QrCode,
    RefreshCw,
    ScanLine,
    Search,
    SlidersHorizontal,
    Sparkles,
    Sun,
    X,
} from "lucide-react";
import {
    CATEGORY_OPTIONS,
    EmptyTrayIllustration,
    ErrorBoardIllustration,
    ItemMediaBox,
    PinboardHeroIllustration,
    formatCategoryLabel,
} from "./components/CategoryArt";
import { ChatDrawer } from "./components/ChatDrawer";
import { PostModal } from "./components/PostModal";
import { PublicTagPage } from "./components/PublicTagPage";
import { QrScanSimulator } from "./components/QrScanSimulator";
import { QrStickerStudio } from "./components/QrStickerStudio";
import {
    Button,
    Card,
    Chip,
    EmptyState,
    Modal,
    Select,
    Skeleton,
    Tabs,
    ToastProvider,
} from "./components/ui/primitives";
import { CAMPUS_HUBS } from "./data/hubs";
import { api } from "./lib/api";
import {
    SPRING_GENTLE,
    SPRING_SNAPPY,
    fadeInUpVariants,
    staggerContainerVariants,
} from "./lib/motion";
import { ThemeAndI18nProvider, useThemeAndI18n } from "./lib/themeAndI18n";
import { useDeepLinkRoute } from "./lib/useDeepLinkRoute";
import type {
    ItemCategory,
    LanguageCode,
    Post,
    PostFilters,
    PostStatus,
    PostType,
} from "./types";

const LazyCampusMap = lazy(() => import("./components/CampusMap"));

/**
 * Formats an ISO date into a clean relative string ("Just now", "2h ago", "3d ago")
 */
function formatRelativeTime(isoDate: string): string {
    const time = new Date(isoDate).getTime();
    if (Number.isNaN(time)) return "";
    const diffSec = Math.max(0, Math.floor((Date.now() - time) / 1000));
    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    return new Date(isoDate).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
    });
}

/**
 * Count-up number that animates from 0 once when a positive target arrives
 */
function CountUpStat({ value }: { value: number }) {
    const [display, setDisplay] = useState(0);
    const hasAnimatedRef = useRef(false);

    useEffect(() => {
        if (value <= 0) {
            setDisplay(0);
            return;
        }
        if (
            hasAnimatedRef.current ||
            (typeof window !== "undefined" &&
                window.matchMedia("(prefers-reduced-motion: reduce)").matches)
        ) {
            setDisplay(value);
            return;
        }

        hasAnimatedRef.current = true;
        const duration = 650;
        const start = performance.now();
        let rafId = 0;

        const tick = (now: number) => {
            const progress = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(Math.round(eased * value));
            if (progress < 1) {
                rafId = requestAnimationFrame(tick);
            }
        };

        rafId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafId);
    }, [value]);

    return <span>{display}</span>;
}

function FindrShell() {
    const { publicTagCode, restoredNotice, clearPublicTag } =
        useDeepLinkRoute();
    const { theme, toggleTheme, lang, setLang, t } = useThemeAndI18n();

    const [activeTab, setActiveTab] = useState<"wall" | "my-items" | "scan">(
        "wall",
    );
    const [scrolled, setScrolled] = useState(false);

    // Wall Data & Pagination State
    const [posts, setPosts] = useState<Post[]>([]);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [stats, setStats] = useState({
        missingCount: 0,
        foundCount: 0,
        returnedCount: 0,
    });
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [, startTransition] = useTransition();

    // Filters
    const [typeFilter, setTypeFilter] = useState<"all" | PostType>("all");
    const [statusFilter, setStatusFilter] = useState<"all" | PostStatus>("all");
    const [categoryFilter, setCategoryFilter] = useState<"all" | ItemCategory>(
        "all",
    );
    const [locationFilter, setLocationFilter] = useState<"all" | string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [showMap, setShowMap] = useState(false);

    // Filter UI (Popover on desktop, Sheet on mobile)
    const [desktopFilterOpen, setDesktopFilterOpen] = useState(false);
    const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

    // Modals & Drawers
    const [postModalOpen, setPostModalOpen] = useState(false);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [scanInitialCode, setScanInitialCode] = useState<string | null>(null);

    // Scroll listener for subtle sticky header elevation
    useEffect(() => {
        const onScroll = () => {
            setScrolled(window.scrollY > 8);
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const fetchWallPosts = useCallback(
        async (cursor?: string) => {
            if (cursor) {
                setLoadingMore(true);
            } else {
                setLoadingPosts(true);
                setFetchError(null);
            }
            try {
                const filters: PostFilters = {
                    type: typeFilter,
                    status: statusFilter,
                    category: categoryFilter,
                    locationId:
                        locationFilter === "all" ? undefined : locationFilter,
                    q: searchQuery.trim() || undefined,
                    limit: 24,
                    cursor,
                };
                const res = await api.getPosts(filters);
                setPosts((prev) =>
                    cursor ? [...prev, ...res.items] : res.items,
                );
                setNextCursor(res.nextCursor);
                setStats(res.stats);
            } catch (err: unknown) {
                if (!cursor) {
                    setPosts([]);
                    setFetchError(
                        err instanceof Error
                            ? err.message
                            : "Unable to load campus notices right now.",
                    );
                }
            } finally {
                setLoadingPosts(false);
                setLoadingMore(false);
            }
        },
        [typeFilter, statusFilter, categoryFilter, locationFilter, searchQuery],
    );

    useEffect(() => {
        startTransition(() => {
            void fetchWallPosts();
        });
    }, [fetchWallPosts]);

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (categoryFilter !== "all") count += 1;
        if (locationFilter !== "all") count += 1;
        if (statusFilter !== "all") count += 1;
        return count;
    }, [categoryFilter, locationFilter, statusFilter]);

    const hasAnyFilter =
        typeFilter !== "all" ||
        searchQuery.trim().length > 0 ||
        activeFilterCount > 0;

    const clearAllFilters = () => {
        setTypeFilter("all");
        setCategoryFilter("all");
        setLocationFilter("all");
        setStatusFilter("all");
        setSearchQuery("");
    };

    const selectedHubName = useMemo(() => {
        if (locationFilter === "all") return null;
        return (
            CAMPUS_HUBS.find((h) => h.id === locationFilter)?.name ??
            locationFilter
        );
    }, [locationFilter]);

    // Deep-link /t/:code public finder view
    if (publicTagCode) {
        return (
            <div className="min-h-screen bg-bg px-4 py-8 text-text">
                <PublicTagPage
                    publicCode={publicTagCode}
                    onBack={clearPublicTag}
                />
            </div>
        );
    }

    const filterControlsContent = (
        <div className="space-y-4">
            <Select
                label="Item Category"
                value={categoryFilter}
                onChange={(e) =>
                    setCategoryFilter(e.target.value as "all" | ItemCategory)
                }
            >
                <option value="all">All Categories</option>
                {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </Select>

            <Select
                label="Campus Building / Hub"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
            >
                <option value="all">All Campus Locations</option>
                {CAMPUS_HUBS.map((hub) => (
                    <option key={hub.id} value={hub.id}>
                        {hub.name} ({hub.buildingCode})
                    </option>
                ))}
            </Select>

            <Select
                label="Resolution Status"
                value={statusFilter}
                onChange={(e) =>
                    setStatusFilter(e.target.value as "all" | PostStatus)
                }
            >
                <option value="all">All Statuses</option>
                <option value="open">Open (Still missing / unclaimed)</option>
                <option value="claimed">Claim in progress</option>
                <option value="returned">Returned to owner</option>
            </Select>

            {activeFilterCount > 0 && (
                <div className="flex justify-end pt-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setCategoryFilter("all");
                            setLocationFilter("all");
                            setStatusFilter("all");
                        }}
                    >
                        Reset filters
                    </Button>
                </div>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-bg pb-24 text-text selection:bg-accent selection:text-accent-fg sm:pb-12">
            {restoredNotice && (
                <div className="bg-accent px-4 py-2 text-center text-xs font-semibold text-accent-fg">
                    {restoredNotice}
                </div>
            )}

            {/* Sticky Top Header */}
            <header
                className={`sticky top-0 z-40 transition-all duration-200 ${
                    scrolled
                        ? "border-b border-border bg-surface/92 shadow-sm backdrop-blur-md"
                        : "border-b border-border/60 bg-bg/85 backdrop-blur-xs"
                }`}
            >
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
                    {/* Brand Identity */}
                    <div className="flex items-center gap-3">
                        <div className="font-display flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-lg font-bold text-accent-fg shadow-sm">
                            F
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-display text-base font-bold tracking-tight text-text">
                                    Findr INCAT
                                </span>
                                <span className="rounded-full border border-accent/25 bg-accent-soft px-2 py-0.5 text-[10px] font-bold tracking-wide text-accent uppercase">
                                    Laoag
                                </span>
                            </div>
                            <p className="hidden text-[11px] text-muted sm:block">
                                {t.appSubtitle}
                            </p>
                        </div>
                    </div>

                    {/* Desktop Navigation Tabs (Animated layoutId underline) */}
                    <div className="hidden md:block">
                        <Tabs
                            activeId={activeTab}
                            onChange={setActiveTab}
                            layoutId="header-nav-underline"
                            items={[
                                {
                                    id: "wall",
                                    label: t.tabWall,
                                    badge:
                                        stats.missingCount + stats.foundCount,
                                    icon: <LayoutGrid className="h-4 w-4" />,
                                },
                                {
                                    id: "my-items",
                                    label: t.tabMyItems,
                                    icon: <QrCode className="h-4 w-4" />,
                                },
                                {
                                    id: "scan",
                                    label: t.tabScan,
                                    icon: <ScanLine className="h-4 w-4" />,
                                },
                            ]}
                        />
                    </div>

                    {/* Right Utility Controls: Language Switcher, Theme Toggle & Desktop Post Button */}
                    <div className="flex items-center gap-2">
                        {/* Language Switcher (EN / TL / ILO) */}
                        <div className="inline-flex items-center rounded-xl border border-border bg-surface px-2 py-1 text-xs font-semibold text-text-secondary">
                            <Globe
                                className="mr-1 h-3.5 w-3.5 text-muted"
                                aria-hidden="true"
                            />
                            <label htmlFor="lang-switcher" className="sr-only">
                                Language
                            </label>
                            <select
                                id="lang-switcher"
                                value={lang}
                                onChange={(e) =>
                                    setLang(e.target.value as LanguageCode)
                                }
                                className="bg-transparent text-xs font-semibold text-text focus:outline-none cursor-pointer"
                            >
                                <option value="en">EN</option>
                                <option value="tl">TL</option>
                                <option value="ilo">ILO</option>
                            </select>
                        </div>

                        {/* Light / Dark Theme Toggle */}
                        <button
                            type="button"
                            onClick={toggleTheme}
                            aria-label={
                                theme === "dark" ? t.themeLight : t.themeDark
                            }
                            title={
                                theme === "dark" ? t.themeLight : t.themeDark
                            }
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-text-secondary transition-colors hover:bg-subtle hover:text-text cursor-pointer"
                        >
                            {theme === "dark" ? (
                                <Sun className="h-4 w-4 text-highlight" />
                            ) : (
                                <Moon className="h-4 w-4" />
                            )}
                        </button>

                        {/* Primary Post CTA */}
                        <Button
                            variant="primary"
                            size="md"
                            onClick={() => setPostModalOpen(true)}
                            leftIcon={<Plus className="h-4 w-4" />}
                            className="hidden sm:inline-flex"
                        >
                            {t.postItem}
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content Container */}
            <main className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 sm:pt-7">
                <AnimatePresence mode="wait">
                    {/* TAB 1: CAMPUS WALL */}
                    {activeTab === "wall" && (
                        <motion.div
                            key="tab-wall"
                            variants={fadeInUpVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="space-y-6"
                        >
                            {/* Notice-Board Hero Section */}
                            <section className="theme-surface relative overflow-hidden rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-8">
                                <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
                                    <div className="max-w-xl space-y-3">
                                        <div className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
                                            <Sparkles className="h-3.5 w-3.5" />
                                            <span>{t.heroBadge}</span>
                                        </div>

                                        <h1 className="font-display text-2xl font-bold tracking-tight text-text sm:text-4xl">
                                            {t.heroTitle}
                                        </h1>

                                        <p className="text-xs leading-relaxed text-text-secondary sm:text-sm">
                                            {t.heroSubtitle}
                                        </p>

                                        {/* Count-up Real API Stats */}
                                        <div className="grid grid-cols-3 gap-2.5 pt-2 sm:flex sm:flex-wrap sm:gap-3">
                                            <div className="rounded-2xl border border-lost-border bg-lost-bg px-3.5 py-2.5">
                                                <div className="font-display text-xl font-bold text-lost sm:text-2xl">
                                                    <CountUpStat
                                                        value={
                                                            stats.missingCount
                                                        }
                                                    />
                                                </div>
                                                <div className="text-[11px] font-medium text-text-secondary">
                                                    {t.statMissing}
                                                </div>
                                            </div>

                                            <div className="rounded-2xl border border-found-border bg-found-bg px-3.5 py-2.5">
                                                <div className="font-display text-xl font-bold text-found sm:text-2xl">
                                                    <CountUpStat
                                                        value={stats.foundCount}
                                                    />
                                                </div>
                                                <div className="text-[11px] font-medium text-text-secondary">
                                                    {t.statFound}
                                                </div>
                                            </div>

                                            <div className="rounded-2xl border border-returned-border bg-returned-bg px-3.5 py-2.5">
                                                <div className="font-display text-xl font-bold text-returned sm:text-2xl">
                                                    <CountUpStat
                                                        value={
                                                            stats.returnedCount
                                                        }
                                                    />
                                                </div>
                                                <div className="text-[11px] font-medium text-text-secondary">
                                                    {t.statReturned}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Illustrated Pinboard + Map Toggle */}
                                    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-end">
                                        <PinboardHeroIllustration />
                                        <Button
                                            variant={
                                                showMap
                                                    ? "primary"
                                                    : "secondary"
                                            }
                                            size="sm"
                                            onClick={() =>
                                                setShowMap((prev) => !prev)
                                            }
                                            leftIcon={
                                                <MapPin className="h-4 w-4" />
                                            }
                                        >
                                            {showMap ? t.hideMap : t.showMap}
                                        </Button>
                                    </div>
                                </div>
                            </section>

                            {/* Animated Collapsible INCAT Campus Map */}
                            <AnimatePresence initial={false}>
                                {showMap && (
                                    <motion.section
                                        key="wall-campus-map"
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{
                                            opacity: 1,
                                            height: "auto",
                                        }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={SPRING_GENTLE}
                                        onAnimationComplete={() => {
                                            window.dispatchEvent(
                                                new Event("resize"),
                                            );
                                        }}
                                        className="overflow-hidden"
                                    >
                                        <div className="space-y-2 pb-2">
                                            <div className="flex items-center justify-between text-xs text-muted">
                                                <span className="font-medium text-text-secondary">
                                                    Interactive INCAT Campus Map
                                                    (P. Gomez St., Laoag City)
                                                </span>
                                                <span>
                                                    {CAMPUS_HUBS.length} Hubs
                                                    &middot; Live Pins
                                                </span>
                                            </div>
                                            <Suspense
                                                fallback={
                                                    <Skeleton className="h-90 min-h-90 w-full rounded-2xl sm:h-120 sm:min-h-120" />
                                                }
                                            >
                                                <LazyCampusMap
                                                    posts={posts}
                                                    selectedPostId={
                                                        selectedPost?.id ?? null
                                                    }
                                                    onSelectPost={(p) =>
                                                        setSelectedPost(p)
                                                    }
                                                />
                                            </Suspense>
                                        </div>
                                    </motion.section>
                                )}
                            </AnimatePresence>

                            {/* Search Bar, Animated Segmented Control & Filters Button */}
                            <section className="space-y-3">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                    {/* Search Input with Clear Button */}
                                    <div className="relative flex-1">
                                        <Search
                                            className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted"
                                            aria-hidden="true"
                                        />
                                        <label
                                            htmlFor="wall-search-input"
                                            className="sr-only"
                                        >
                                            Search campus lost and found items
                                        </label>
                                        <input
                                            id="wall-search-input"
                                            type="search"
                                            value={searchQuery}
                                            onChange={(e) =>
                                                setSearchQuery(e.target.value)
                                            }
                                            placeholder={t.searchPlaceholder}
                                            className="min-h-11 w-full rounded-xl border border-border bg-surface py-2.5 pr-10 pl-10 text-xs sm:text-sm text-text placeholder:text-muted shadow-sm transition-colors focus:border-accent focus:outline-none"
                                        />
                                        {searchQuery && (
                                            <button
                                                type="button"
                                                aria-label="Clear search query"
                                                onClick={() =>
                                                    setSearchQuery("")
                                                }
                                                className="absolute top-1/2 right-2.5 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:bg-subtle hover:text-text cursor-pointer"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Segmented Pill Control (All / Lost / Found) + Filters Trigger */}
                                    <div className="flex items-center justify-between gap-2 sm:justify-end">
                                        <Tabs
                                            variant="pill"
                                            layoutId="wall-type-segmented-pill"
                                            activeId={typeFilter}
                                            onChange={setTypeFilter}
                                            items={[
                                                {
                                                    id: "all",
                                                    label: t.filterAll,
                                                },
                                                {
                                                    id: "lost",
                                                    label: t.filterLost,
                                                },
                                                {
                                                    id: "found",
                                                    label: t.filterFound,
                                                },
                                            ]}
                                        />

                                        {/* Desktop Popover + Mobile Sheet Trigger */}
                                        <div className="relative">
                                            <Button
                                                variant={
                                                    activeFilterCount > 0
                                                        ? "primary"
                                                        : "secondary"
                                                }
                                                size="md"
                                                leftIcon={
                                                    <SlidersHorizontal className="h-4 w-4" />
                                                }
                                                onClick={() => {
                                                    if (
                                                        window.innerWidth < 640
                                                    ) {
                                                        setMobileFilterOpen(
                                                            true,
                                                        );
                                                    } else {
                                                        setDesktopFilterOpen(
                                                            (prev) => !prev,
                                                        );
                                                    }
                                                }}
                                            >
                                                <span>{t.moreFilters}</span>
                                                {activeFilterCount > 0 && (
                                                    <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] font-bold">
                                                        {activeFilterCount}
                                                    </span>
                                                )}
                                            </Button>

                                            {/* Desktop Filters Popover */}
                                            <AnimatePresence>
                                                {desktopFilterOpen && (
                                                    <>
                                                        <div
                                                            className="fixed inset-0 z-30 hidden sm:block"
                                                            onClick={() =>
                                                                setDesktopFilterOpen(
                                                                    false,
                                                                )
                                                            }
                                                        />
                                                        <motion.div
                                                            initial={{
                                                                opacity: 0,
                                                                y: 8,
                                                                scale: 0.97,
                                                            }}
                                                            animate={{
                                                                opacity: 1,
                                                                y: 0,
                                                                scale: 1,
                                                            }}
                                                            exit={{
                                                                opacity: 0,
                                                                y: 6,
                                                                scale: 0.97,
                                                            }}
                                                            transition={
                                                                SPRING_SNAPPY
                                                            }
                                                            className="theme-surface absolute right-0 z-40 mt-2 hidden w-80 rounded-2xl border border-border bg-surface p-4 shadow-lg sm:block"
                                                        >
                                                            <div className="mb-3 flex items-center justify-between">
                                                                <span className="font-display text-sm font-bold text-text">
                                                                    Filter Board
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setDesktopFilterOpen(
                                                                            false,
                                                                        )
                                                                    }
                                                                    className="rounded-lg p-1 text-muted hover:bg-subtle hover:text-text"
                                                                    aria-label="Close filters popover"
                                                                >
                                                                    <X className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                            {
                                                                filterControlsContent
                                                            }
                                                        </motion.div>
                                                    </>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                </div>

                                {/* Active Filter Chips Row */}
                                {hasAnyFilter && (
                                    <div className="flex flex-wrap items-center gap-2 pt-1">
                                        {typeFilter !== "all" && (
                                            <Chip
                                                active
                                                onRemove={() =>
                                                    setTypeFilter("all")
                                                }
                                            >
                                                Type: {typeFilter.toUpperCase()}
                                            </Chip>
                                        )}
                                        {categoryFilter !== "all" && (
                                            <Chip
                                                active
                                                onRemove={() =>
                                                    setCategoryFilter("all")
                                                }
                                            >
                                                {formatCategoryLabel(
                                                    categoryFilter,
                                                )}
                                            </Chip>
                                        )}
                                        {selectedHubName && (
                                            <Chip
                                                active
                                                onRemove={() =>
                                                    setLocationFilter("all")
                                                }
                                            >
                                                {selectedHubName}
                                            </Chip>
                                        )}
                                        {statusFilter !== "all" && (
                                            <Chip
                                                active
                                                onRemove={() =>
                                                    setStatusFilter("all")
                                                }
                                            >
                                                Status: {statusFilter}
                                            </Chip>
                                        )}
                                        {searchQuery.trim() && (
                                            <Chip
                                                active
                                                onRemove={() =>
                                                    setSearchQuery("")
                                                }
                                            >
                                                “{searchQuery.trim()}”
                                            </Chip>
                                        )}

                                        <button
                                            type="button"
                                            onClick={clearAllFilters}
                                            className="ml-1 text-xs font-semibold text-accent underline-offset-2 hover:underline cursor-pointer"
                                        >
                                            {t.clearFilters}
                                        </button>
                                    </div>
                                )}
                            </section>

                            {/* Mobile Filters Bottom Sheet */}
                            <Modal
                                isOpen={mobileFilterOpen}
                                onClose={() => setMobileFilterOpen(false)}
                                title="Filter Campus Board"
                                description="Narrow notices by category, building hub, or status."
                            >
                                {filterControlsContent}
                                <div className="mt-5">
                                    <Button
                                        variant="primary"
                                        className="w-full"
                                        onClick={() =>
                                            setMobileFilterOpen(false)
                                        }
                                    >
                                        Apply Filters
                                    </Button>
                                </div>
                            </Modal>

                            {/* Cards Grid / Skeleton / Error / Empty States */}
                            {loadingPosts ? (
                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                                    {[1, 2, 3, 4, 5, 6].map((n) => (
                                        <Card
                                            key={n}
                                            className="overflow-hidden p-0"
                                        >
                                            <Skeleton className="aspect-4/3 w-full rounded-none" />
                                            <div className="space-y-3 p-4">
                                                <Skeleton className="h-4 w-2/3" />
                                                <Skeleton className="h-3 w-full" />
                                                <Skeleton className="h-3 w-4/5" />
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            ) : fetchError ? (
                                <EmptyState
                                    illustration={<ErrorBoardIllustration />}
                                    title="Couldn’t load the notice board"
                                    description={fetchError}
                                    action={
                                        <Button
                                            variant="secondary"
                                            onClick={() =>
                                                void fetchWallPosts()
                                            }
                                            leftIcon={
                                                <RefreshCw className="h-4 w-4" />
                                            }
                                        >
                                            Retry
                                        </Button>
                                    }
                                />
                            ) : posts.length === 0 ? (
                                <EmptyState
                                    illustration={<EmptyTrayIllustration />}
                                    title={t.emptyTitle}
                                    description={t.emptyBody}
                                    action={
                                        <div className="flex flex-wrap items-center justify-center gap-2.5">
                                            {hasAnyFilter && (
                                                <Button
                                                    variant="secondary"
                                                    onClick={clearAllFilters}
                                                >
                                                    {t.clearFilters}
                                                </Button>
                                            )}
                                            <Button
                                                variant="primary"
                                                onClick={() =>
                                                    setPostModalOpen(true)
                                                }
                                                leftIcon={
                                                    <Plus className="h-4 w-4" />
                                                }
                                            >
                                                {t.postMissingCta}
                                            </Button>
                                        </div>
                                    }
                                />
                            ) : (
                                <>
                                    <motion.div
                                        variants={staggerContainerVariants}
                                        initial="hidden"
                                        animate="visible"
                                        className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
                                    >
                                        {posts.map((post) => {
                                            const isReturned =
                                                post.status === "returned";
                                            return (
                                                <motion.article
                                                    key={post.id}
                                                    variants={fadeInUpVariants}
                                                >
                                                    <div
                                                        role="button"
                                                        tabIndex={0}
                                                        onClick={() =>
                                                            setSelectedPost(
                                                                post,
                                                            )
                                                        }
                                                        onKeyDown={(e) => {
                                                            if (
                                                                e.key ===
                                                                    "Enter" ||
                                                                e.key === " "
                                                            ) {
                                                                e.preventDefault();
                                                                setSelectedPost(
                                                                    post,
                                                                );
                                                            }
                                                        }}
                                                        aria-label={`${post.type === "lost" ? "Lost" : "Found"}: ${post.title} at ${post.locationName}`}
                                                        className={`theme-surface group flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-border bg-surface text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md cursor-pointer ${
                                                            isReturned
                                                                ? "opacity-80"
                                                                : ""
                                                        }`}
                                                    >
                                                        <div>
                                                            <ItemMediaBox
                                                                photoUrl={
                                                                    post
                                                                        .imageUrls[0]
                                                                }
                                                                title={
                                                                    post.title
                                                                }
                                                                category={
                                                                    post.category
                                                                }
                                                                type={post.type}
                                                                status={
                                                                    post.status
                                                                }
                                                                layoutId={`post-media-${post.id}`}
                                                            />

                                                            <div className="p-4">
                                                                <div className="flex items-center justify-between gap-2 text-[11px] text-muted">
                                                                    <span className="font-medium text-text-secondary">
                                                                        {formatCategoryLabel(
                                                                            post.category,
                                                                        )}
                                                                    </span>
                                                                    <time
                                                                        dateTime={
                                                                            post.createdAt
                                                                        }
                                                                    >
                                                                        {formatRelativeTime(
                                                                            post.createdAt,
                                                                        )}
                                                                    </time>
                                                                </div>

                                                                <h3 className="font-display mt-1.5 line-clamp-1 text-base font-bold text-text transition-colors group-hover:text-accent">
                                                                    {post.title}
                                                                </h3>

                                                                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-text-secondary">
                                                                    {
                                                                        post.description
                                                                    }
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center justify-between border-t border-border/80 px-4 py-3 text-xs">
                                                            <span className="inline-flex items-center gap-1.5 truncate font-medium text-text-secondary">
                                                                <MapPin className="h-3.5 w-3.5 shrink-0 text-accent" />
                                                                <span className="truncate">
                                                                    {
                                                                        post.locationName
                                                                    }
                                                                </span>
                                                            </span>
                                                            <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-accent">
                                                                <span>
                                                                    {
                                                                        t.viewDetails
                                                                    }
                                                                </span>
                                                                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                                                            </span>
                                                        </div>
                                                    </div>
                                                </motion.article>
                                            );
                                        })}
                                    </motion.div>

                                    {/* Load More / Pagination */}
                                    {nextCursor && (
                                        <div className="flex justify-center pt-4">
                                            <Button
                                                variant="secondary"
                                                size="lg"
                                                loading={loadingMore}
                                                onClick={() =>
                                                    void fetchWallPosts(
                                                        nextCursor,
                                                    )
                                                }
                                            >
                                                Load more notices
                                            </Button>
                                        </div>
                                    )}
                                </>
                            )}
                        </motion.div>
                    )}

                    {/* TAB 2: MY ITEMS (QR TAG STUDIO) */}
                    {activeTab === "my-items" && (
                        <motion.div
                            key="tab-my-items"
                            variants={fadeInUpVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                        >
                            <QrStickerStudio
                                onPreviewTagCode={(code) => {
                                    setScanInitialCode(code);
                                    setActiveTab("scan");
                                }}
                            />
                        </motion.div>
                    )}

                    {/* TAB 3: SCANNER */}
                    {activeTab === "scan" && (
                        <motion.div
                            key="tab-scan"
                            variants={fadeInUpVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                        >
                            <QrScanSimulator
                                initialCode={scanInitialCode}
                                onCodeResolved={(code) =>
                                    setScanInitialCode(code)
                                }
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Mobile Bottom Navigation Bar with Prominent Post Button & Safe-Area Padding */}
            <nav
                aria-label="Mobile primary navigation"
                className="theme-surface fixed right-0 bottom-0 left-0 z-40 border-t border-border bg-surface/95 px-3 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-lg backdrop-blur-md md:hidden"
            >
                <div className="mx-auto grid max-w-md grid-cols-4 items-center gap-1">
                    <button
                        type="button"
                        onClick={() => setActiveTab("wall")}
                        className={`relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold transition-colors ${
                            activeTab === "wall"
                                ? "text-accent"
                                : "text-muted hover:text-text"
                        }`}
                    >
                        <LayoutGrid className="h-5 w-5" />
                        <span>{t.tabWall}</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab("my-items")}
                        className={`relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold transition-colors ${
                            activeTab === "my-items"
                                ? "text-accent"
                                : "text-muted hover:text-text"
                        }`}
                    >
                        <QrCode className="h-5 w-5" />
                        <span>{t.tabMyItems}</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab("scan")}
                        className={`relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold transition-colors ${
                            activeTab === "scan"
                                ? "text-accent"
                                : "text-muted hover:text-text"
                        }`}
                    >
                        <ScanLine className="h-5 w-5" />
                        <span>{t.tabScan}</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setPostModalOpen(true)}
                        className="flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl bg-accent px-2 py-1.5 text-[11px] font-bold text-accent-fg shadow-sm active:scale-95"
                    >
                        <Plus className="h-5 w-5" />
                        <span>{t.postItem}</span>
                    </button>
                </div>
            </nav>

            {/* Post Modal */}
            <PostModal
                isOpen={postModalOpen}
                onClose={() => setPostModalOpen(false)}
                onCreated={() => {
                    setPostModalOpen(false);
                    void fetchWallPosts();
                }}
            />

            {/* Post Details & Shared-Element Drawer */}
            <ChatDrawer
                post={selectedPost}
                isOpen={Boolean(selectedPost)}
                onClose={() => setSelectedPost(null)}
                onPostUpdated={(updated) => {
                    setSelectedPost(updated);
                    void fetchWallPosts();
                }}
            />
        </div>
    );
}

export function App() {
    return (
        <MotionConfig reducedMotion="user">
            <ThemeAndI18nProvider>
                <ToastProvider>
                    <FindrShell />
                </ToastProvider>
            </ThemeAndI18nProvider>
        </MotionConfig>
    );
}

export default App;
