import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
    Search,
    SlidersHorizontal,
    ArrowRight,
    Sun,
    Moon,
    ChevronDown,
    MapPin,
} from "lucide-react";
import {
    CAMPUS_HUBS,
    DEMO_USERS,
    ITEM_CATEGORIES,
    getHubById,
} from "./data/hubs";
import { api } from "./services/api";
import { CampusMap } from "./components/CampusMap";
import { ClaimVerifyDrawer } from "./components/ClaimVerifyDrawer";
import { ChatDrawer } from "./components/ChatDrawer";
import { PostModal } from "./components/PostModal";
import { QrStickerStudio } from "./components/QrStickerStudio";
import { QrScanSimulator } from "./components/QrScanSimulator";
import {
    CorkboardIllustration,
    EmptyTrayIllustration,
    ItemMediaBox,
} from "./components/CategoryArt";
import type { DemoUser, PostItem, QrGearItem } from "./types";

type ActiveTab = "wall" | "items" | "scan";
type TypeFilter = "ALL" | "LOST" | "FOUND";

/**
 * 400ms Count-Up Number on First Load
 */
const CountUpNumber: React.FC<{ value: number }> = ({ value }) => {
    const prefersReducedMotion = useReducedMotion();
    const [display, setDisplay] = useState(prefersReducedMotion ? value : 0);

    useEffect(() => {
        if (prefersReducedMotion) {
            setDisplay(value);
            return;
        }
        let frameId: number;
        const duration = 400;
        const startTime = performance.now();

        const tick = (now: number) => {
            const progress = Math.min((now - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(Math.round(eased * value));
            if (progress < 1) {
                frameId = requestAnimationFrame(tick);
            }
        };

        frameId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frameId);
    }, [value, prefersReducedMotion]);

    return <>{display}</>;
};

interface PostCardProps {
    post: PostItem;
    index: number;
    isHighlighted: boolean;
    prefersReducedMotion: boolean;
    onSelect: (post: PostItem) => void;
}

/**
 * Memoized 4:3 Photo-First Post Card with Shared-Element Media & Smooth Motion
 */
const PostCard = memo<PostCardProps>(
    ({ post, index, isHighlighted, prefersReducedMotion, onSelect }) => {
        const hub = getHubById(post.hubId);
        const isResolved = post.status === "RESOLVED";
        const actionText = isResolved
            ? "Details"
            : post.type === "FOUND"
              ? "Claim"
              : "I found this";

        // Cap staggered entrance animation at 8 items (30ms stagger)
        const entranceDelay =
            prefersReducedMotion || index >= 8 ? 0 : index * 0.03;

        return (
            <motion.article
                layout={!prefersReducedMotion}
                id={`wall-post-${post.id}`}
                initial={
                    prefersReducedMotion
                        ? { opacity: 0 }
                        : { opacity: 0, y: 12 }
                }
                animate={{ opacity: isResolved ? 0.72 : 1, y: 0, scale: 1 }}
                exit={
                    prefersReducedMotion
                        ? { opacity: 0 }
                        : {
                              opacity: 0,
                              scale: 0.96,
                              transition: { duration: 0.18 },
                          }
                }
                transition={{
                    duration: 0.26,
                    delay: entranceDelay,
                    ease: [0.22, 1, 0.36, 1],
                    layout: { type: "spring", stiffness: 300, damping: 30 },
                }}
                whileHover={prefersReducedMotion ? undefined : { y: -2 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                onClick={() => onSelect(post)}
                tabIndex={0}
                role="button"
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelect(post);
                    }
                }}
                className={`border rounded-lg bg-surface overflow-hidden flex flex-col justify-between hover:border-muted transition-colors duration-150 cursor-pointer text-left ${
                    isHighlighted ? "border-highlight" : "border-border"
                }`}
            >
                <div>
                    {/* 4:3 Top Photo / Tinted Category Placeholder with Shared-Element layoutId */}
                    <motion.div
                        layoutId={
                            prefersReducedMotion
                                ? undefined
                                : `post-media-${post.id}`
                        }
                    >
                        <ItemMediaBox
                            photoUrl={post.photoUrl}
                            title={post.title}
                            category={post.category}
                            type={post.type}
                            status={post.status}
                        />
                    </motion.div>

                    {/* Card Body */}
                    <div className="p-5 pb-4">
                        <h2 className="text-base font-semibold tracking-tight text-text leading-snug line-clamp-1">
                            {post.title}
                        </h2>
                        <p className="text-sm text-muted line-clamp-1 mt-1">
                            {post.description}
                        </p>
                    </div>
                </div>

                {/* Muted meta line + Text action */}
                <div className="px-5 py-3 border-t border-border flex items-center justify-between gap-4 text-xs">
                    <span className="text-muted truncate">
                        {hub.name} · {post.createdAt} · {post.posterName}
                    </span>
                    <span className="font-medium text-accent shrink-0">
                        {actionText}
                    </span>
                </div>
            </motion.article>
        );
    },
);
PostCard.displayName = "PostCard";

export function App() {
    const prefersReducedMotion = Boolean(useReducedMotion());

    // Theme state (default: LIGHT)
    const [darkMode, setDarkMode] = useState<boolean>(() => {
        return localStorage.getItem("campusradar_theme") === "dark";
    });

    useEffect(() => {
        const root = document.documentElement;
        if (darkMode) {
            root.classList.add("dark");
            localStorage.setItem("campusradar_theme", "dark");
        } else {
            root.classList.remove("dark");
            localStorage.setItem("campusradar_theme", "light");
        }
    }, [darkMode]);

    // Navigation & URL `?scan=` sync
    const [activeTab, setActiveTab] = useState<ActiveTab>("wall");
    const [selectedScanTag, setSelectedScanTag] =
        useState<string>("CR-991EX-STEM");

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const scanParam = params.get("scan");
        if (scanParam) {
            setSelectedScanTag(scanParam);
        }
    }, []);

    // Core data state
    const [posts, setPosts] = useState<PostItem[]>([]);
    const [gear, setGear] = useState<QrGearItem[]>([]);
    const [verifiedPostIds, setVerifiedPostIds] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    useEffect(() => {
        setPosts(api.getPosts());
        setGear(api.getGear());
        setVerifiedPostIds(api.getVerifiedPostIds());
        const timer = setTimeout(() => setIsLoading(false), 220);
        return () => clearTimeout(timer);
    }, []);

    const triggerToast = (msg: string) => {
        setToastMessage(msg);
    };

    useEffect(() => {
        if (!toastMessage) return;
        const t = setTimeout(() => setToastMessage(null), 2800);
        return () => clearTimeout(t);
    }, [toastMessage]);

    // User & Popover menus
    const [currentUser, setCurrentUser] = useState<DemoUser>(DEMO_USERS[0]);
    const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
    const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);

    const avatarMenuRef = useRef<HTMLDivElement>(null);
    const filterPopoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                avatarMenuRef.current &&
                !avatarMenuRef.current.contains(e.target as Node)
            ) {
                setIsAvatarMenuOpen(false);
            }
            if (
                filterPopoverRef.current &&
                !filterPopoverRef.current.contains(e.target as Node)
            ) {
                setIsFilterPopoverOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Wall Filters & Map state
    const [showMap, setShowMap] = useState(false);
    const [highlightedPostId, setHighlightedPostId] = useState<string | null>(
        null,
    );
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
    const [hubFilter, setHubFilter] = useState<string>("ALL");
    const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
    const [roleFilter, setRoleFilter] = useState<string>("ALL");

    // Modals & Drawers
    const [selectedPost, setSelectedPost] = useState<PostItem | null>(null);
    const [chatPost, setChatPost] = useState<PostItem | null>(null);
    const [isPostModalOpen, setIsPostModalOpen] = useState(false);

    // Counts for the plain single-line status summary
    const stats = useMemo(() => {
        const missing = posts.filter(
            (p) => p.type === "LOST" && p.status === "OPEN",
        ).length;
        const found = posts.filter(
            (p) => p.type === "FOUND" && p.status === "OPEN",
        ).length;
        const returned = posts.filter((p) => p.status === "RESOLVED").length;
        return { missing, found, returned };
    }, [posts]);

    const activeExtraFilterCount =
        (hubFilter !== "ALL" ? 1 : 0) +
        (categoryFilter !== "ALL" ? 1 : 0) +
        (roleFilter !== "ALL" ? 1 : 0);

    const filteredPosts = useMemo(() => {
        return posts.filter((post) => {
            if (typeFilter !== "ALL" && post.type !== typeFilter) return false;
            if (hubFilter !== "ALL" && post.hubId !== hubFilter) return false;
            if (categoryFilter !== "ALL" && post.category !== categoryFilter)
                return false;
            if (roleFilter !== "ALL" && post.posterRole !== roleFilter)
                return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const hubName = getHubById(post.hubId).name.toLowerCase();
                const matches =
                    post.title.toLowerCase().includes(q) ||
                    post.description.toLowerCase().includes(q) ||
                    post.posterName.toLowerCase().includes(q) ||
                    post.locationDetail.toLowerCase().includes(q) ||
                    hubName.includes(q) ||
                    (post.linkedQrTag &&
                        post.linkedQrTag.toLowerCase().includes(q));
                if (!matches) return false;
            }
            return true;
        });
    }, [posts, typeFilter, hubFilter, categoryFilter, roleFilter, searchQuery]);

    // Handlers
    const handleCreatePost = (
        newPostData: Omit<PostItem, "id" | "createdAt" | "claims" | "status">,
    ) => {
        const created: PostItem = {
            ...newPostData,
            id: `post-${Date.now()}`,
            status: "OPEN",
            createdAt: "Just now",
            claims: [],
        };
        const updated = [created, ...posts];
        setPosts(updated);
        api.savePosts(updated);
        triggerToast("Post published to the INCAT wall.");
    };

    const handleSubmitClaim = (
        postId: string,
        answer: string,
        contactInfo: string,
    ) => {
        const target = posts.find((p) => p.id === postId);
        const matchesHint =
            target?.expectedAnswerHint &&
            answer
                .toLowerCase()
                .includes(target.expectedAnswerHint.toLowerCase());

        const updated = api.submitClaim(postId, {
            claimantName: currentUser.name,
            claimantRole: currentUser.dept,
            answer,
            contactInfo,
            status: matchesHint ? "APPROVED" : "PENDING",
        });

        if (matchesHint) {
            const nextVerified = api.markPostVerifiedForSession(postId);
            setVerifiedPostIds(nextVerified);
        }

        setPosts(updated);
        const refreshed = updated.find((p) => p.id === postId) || null;
        setSelectedPost(refreshed);
    };

    const handleReviewClaim = (
        postId: string,
        claimId: string,
        status: "APPROVED" | "REJECTED",
    ) => {
        const updated = api.updateClaimStatus(postId, claimId, status);
        setPosts(updated);
        setVerifiedPostIds(api.getVerifiedPostIds());
        setSelectedPost(updated.find((p) => p.id === postId) || null);
    };

    const handleResolvePost = (postId: string, passcode?: string) => {
        const target = posts.find((p) => p.id === postId);
        if (!target) return { ok: false, error: "Post not found." };
        if (
            target.passcode &&
            target.passcode !== passcode &&
            currentUser.name !== target.posterName
        ) {
            return { ok: false, error: "Incorrect passcode." };
        }
        const updated = posts.map((p) =>
            p.id === postId
                ? { ...p, status: "RESOLVED" as const, returnedAt: "Just now" }
                : p,
        );
        setPosts(updated);
        api.savePosts(updated);
        setSelectedPost(updated.find((p) => p.id === postId) || null);
        triggerToast("Item marked as returned.");
        return { ok: true };
    };

    const handleDeletePost = (postId: string, passcode?: string) => {
        const target = posts.find((p) => p.id === postId);
        if (!target) return { ok: false, error: "Post not found." };
        if (
            target.passcode &&
            target.passcode !== passcode &&
            currentUser.name !== target.posterName
        ) {
            return { ok: false, error: "Incorrect passcode." };
        }
        const updated = posts.filter((p) => p.id !== postId);
        setPosts(updated);
        api.savePosts(updated);
        setSelectedPost(null);
        triggerToast("Post removed.");
        return { ok: true };
    };

    const handleToggleLostMode = (tagId: string) => {
        const target = gear.find((g) => g.tagId === tagId);
        if (!target) return;

        const nextStatus = target.status === "LOST" ? "SAFE" : "LOST";
        const updatedGear = gear.map((g) =>
            g.tagId === tagId
                ? { ...g, status: nextStatus as "SAFE" | "LOST" }
                : g,
        );
        setGear(updatedGear);
        api.saveGear(updatedGear);

        if (nextStatus === "LOST") {
            const existingPost = posts.find(
                (p) => p.linkedQrTag === tagId && p.status === "OPEN",
            );
            if (!existingPost) {
                const hub = getHubById(target.preferredHubId);
                const autoPost: PostItem = {
                    id: `post-qr-${Date.now()}`,
                    type: "LOST",
                    status: "OPEN",
                    title: `${target.name} (QR Tag #${target.tagId})`,
                    category: target.category,
                    description: target.handoverNote,
                    hubId: target.preferredHubId,
                    locationDetail: `Drop off at ${hub.name}`,
                    posterName: target.ownerName,
                    posterRole: "STUDENT",
                    posterDept: target.ownerSection,
                    photoUrl: target.photoUrl,
                    linkedQrTag: target.tagId,
                    createdAt: "Just now",
                    contactChannels: target.contactChannels,
                    claims: [],
                };
                const nextPosts = [autoPost, ...posts];
                setPosts(nextPosts);
                api.savePosts(nextPosts);
            }
            triggerToast(`Lost mode enabled for ${target.tagId}.`);
        } else {
            const nextPosts = posts.map((p) =>
                p.linkedQrTag === tagId
                    ? {
                          ...p,
                          status: "RESOLVED" as const,
                          returnedAt: "Just now",
                      }
                    : p,
            );
            setPosts(nextPosts);
            api.savePosts(nextPosts);
            triggerToast(`${target.tagId} marked safe.`);
        }
    };

    const handleRegisterGear = (newItem: QrGearItem) => {
        const updated = [newItem, ...gear];
        setGear(updated);
        api.saveGear(updated);
        triggerToast(`Registered ${newItem.tagId}.`);
    };

    const handlePingTagLocation = (tagId: string, locationName: string) => {
        const updated = gear.map((g) =>
            g.tagId === tagId
                ? {
                      ...g,
                      lastPingLocation: locationName,
                      lastPingTime: "Just now",
                  }
                : g,
        );
        setGear(updated);
        api.saveGear(updated);
        triggerToast(`Location sent to owner (${locationName}).`);
    };

    const handleHighlightFromMap = (post: PostItem) => {
        setHighlightedPostId(post.id);
        const cardEl = document.getElementById(`wall-post-${post.id}`);
        if (cardEl) {
            cardEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
        setTimeout(() => {
            setHighlightedPostId((prev) => (prev === post.id ? null : prev));
        }, 2200);
    };

    const resetAllFilters = () => {
        setSearchQuery("");
        setTypeFilter("ALL");
        setHubFilter("ALL");
        setCategoryFilter("ALL");
        setRoleFilter("ALL");
    };

    const tabs: { id: ActiveTab; label: string }[] = [
        { id: "wall", label: "Wall" },
        { id: "items", label: "My items" },
        { id: "scan", label: "Scan" },
    ];

    return (
        <div className="min-h-screen flex flex-col bg-bg text-text pb-16 sm:pb-0">
            {/* Slim Top Header */}
            <header className="h-14 border-b border-border bg-surface sticky top-0 z-30">
                <div className="max-w-275 mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-4">
                    {/* Left: Plain text wordmark */}
                    <button
                        type="button"
                        onClick={() => setActiveTab("wall")}
                        className="text-base font-semibold tracking-tight text-text hover:opacity-80 transition-opacity duration-150"
                    >
                        CampusRadar
                    </button>

                    {/* Center: Three plain text tabs with sliding layoutId underline */}
                    <nav
                        aria-label="Main navigation"
                        className="hidden sm:flex items-center gap-6 h-full"
                    >
                        {tabs.map((tab) => {
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`relative h-full inline-flex items-center text-sm transition-colors duration-150 ${
                                        isActive
                                            ? "text-text font-medium"
                                            : "text-muted hover:text-text"
                                    }`}
                                >
                                    {tab.label}
                                    {isActive && (
                                        <motion.span
                                            layoutId="desktop-tab-underline"
                                            transition={{
                                                type: "spring",
                                                stiffness: 300,
                                                damping: 30,
                                            }}
                                            className="absolute bottom-0 inset-x-0 h-0.5 bg-accent"
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </nav>

                    {/* Right: Post button (with 2px arrow nudge on hover) + Theme toggle + Avatar menu */}
                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={() => setIsPostModalOpen(true)}
                            className="group inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-accent text-accent-fg text-sm font-medium rounded-md hover:opacity-90 transition-opacity duration-150"
                        >
                            <span>Post</span>
                            <ArrowRight
                                size={15}
                                strokeWidth={1.5}
                                className="transition-transform duration-150 group-hover:translate-x-0.5"
                            />
                        </button>

                        <button
                            type="button"
                            onClick={() => setDarkMode(!darkMode)}
                            aria-label="Toggle color theme"
                            className="p-2 text-muted hover:text-text rounded-md border border-border bg-surface transition-colors duration-150"
                        >
                            {darkMode ? (
                                <Sun size={16} strokeWidth={1.5} />
                            ) : (
                                <Moon size={16} strokeWidth={1.5} />
                            )}
                        </button>

                        {/* Avatar Menu with Role Switcher */}
                        <div className="relative" ref={avatarMenuRef}>
                            <button
                                type="button"
                                onClick={() =>
                                    setIsAvatarMenuOpen(!isAvatarMenuOpen)
                                }
                                aria-label="Account and demo role switcher"
                                aria-expanded={isAvatarMenuOpen}
                                className="inline-flex items-center gap-1.5 pl-2.5 pr-2 py-1.5 text-xs font-medium border border-border rounded-md bg-surface text-text hover:bg-subtle transition-colors duration-150"
                            >
                                <span>{currentUser.initials}</span>
                                <ChevronDown
                                    size={14}
                                    strokeWidth={1.5}
                                    className="text-muted"
                                />
                            </button>

                            <AnimatePresence>
                                {isAvatarMenuOpen && (
                                    <motion.div
                                        initial={{
                                            opacity: 0,
                                            y: 4,
                                            scale: 0.98,
                                        }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 4, scale: 0.98 }}
                                        transition={{ duration: 0.16 }}
                                        className="absolute right-0 mt-2 w-64 bg-surface border border-border rounded-lg p-2 shadow-popover z-40"
                                    >
                                        <div className="px-2.5 py-2 border-b border-border">
                                            <div className="text-sm font-medium text-text">
                                                {currentUser.name}
                                            </div>
                                            <div className="text-xs text-muted">
                                                {currentUser.dept}
                                            </div>
                                        </div>

                                        <div className="pt-2 pb-1 px-2.5 text-xs text-muted">
                                            Demo: switch user
                                        </div>

                                        <div className="space-y-0.5">
                                            {DEMO_USERS.map((u) => {
                                                const active =
                                                    u.id === currentUser.id;
                                                return (
                                                    <button
                                                        key={u.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setCurrentUser(u);
                                                            setIsAvatarMenuOpen(
                                                                false,
                                                            );
                                                        }}
                                                        className={`w-full text-left px-2.5 py-1.5 rounded text-xs flex items-center justify-between transition-colors duration-150 ${
                                                            active
                                                                ? "bg-subtle text-text font-medium"
                                                                : "text-muted hover:text-text hover:bg-subtle/50"
                                                        }`}
                                                    >
                                                        <span>{u.name}</span>
                                                        <span className="text-muted">
                                                            {u.role.toLowerCase()}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content Container with Page Crossfade + 8px Upward Slide */}
            <main className="flex-1 w-full max-w-275 mx-auto px-4 sm:px-6 py-8">
                <AnimatePresence mode="wait">
                    {activeTab === "wall" && (
                        <motion.div
                            key="tab-wall"
                            initial={
                                prefersReducedMotion
                                    ? { opacity: 0 }
                                    : { opacity: 0, y: 8 }
                            }
                            animate={{ opacity: 1, y: 0 }}
                            exit={
                                prefersReducedMotion
                                    ? { opacity: 0 }
                                    : { opacity: 0, y: -4 }
                            }
                            transition={{
                                duration: 0.2,
                                ease: [0.22, 1, 0.36, 1],
                            }}
                        >
                            {/* Wall Header: Human Headline + Warm Yellow Accent Underline + Hand-Drawn SVG */}
                            <div className="flex items-center justify-between gap-6 pb-6 mb-6 border-b border-border">
                                <div>
                                    <h1 className="text-xl font-semibold tracking-tight text-text">
                                        What&apos;s missing at{" "}
                                        <span className="underline decoration-highlight decoration-2 underline-offset-4">
                                            INCAT
                                        </span>
                                        ?
                                    </h1>
                                    <p className="text-sm text-muted mt-1">
                                        Check items turned in at the Guard
                                        House, Guidance, or department labs.
                                    </p>
                                </div>
                                <CorkboardIllustration />
                            </div>

                            {/* Count-up Stat Line & Show Map Toggle */}
                            <div className="flex items-center justify-between gap-4 mb-6 text-sm">
                                <p className="text-muted">
                                    <span className="text-text font-medium">
                                        <CountUpNumber value={stats.missing} />
                                    </span>{" "}
                                    missing ·{" "}
                                    <span className="text-text font-medium">
                                        <CountUpNumber value={stats.found} />
                                    </span>{" "}
                                    found ·{" "}
                                    <span className="text-text font-medium">
                                        <CountUpNumber value={stats.returned} />
                                    </span>{" "}
                                    returned
                                </p>

                                <button
                                    type="button"
                                    onClick={() => setShowMap(!showMap)}
                                    className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:opacity-80 transition-opacity duration-150"
                                >
                                    <MapPin size={15} strokeWidth={1.5} />
                                    {showMap ? "Hide map" : "Show map"}
                                </button>
                            </div>

                            {/* Animated Collapsible INCAT Map */}
                            <CampusMap
                                isOpen={showMap}
                                darkMode={darkMode}
                                posts={posts}
                                selectedHubId={hubFilter}
                                activePinPostId={highlightedPostId}
                                onSelectHub={(id) => setHubFilter(id)}
                                onHighlightPost={handleHighlightFromMap}
                                onOpenPostDetail={(post) =>
                                    setSelectedPost(post)
                                }
                            />

                            {/* Search Input + Segmented Control + Single Filters Button */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
                                <div className="relative flex-1">
                                    <Search
                                        size={16}
                                        strokeWidth={1.5}
                                        className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                                    />
                                    <input
                                        type="search"
                                        value={searchQuery}
                                        onChange={(e) =>
                                            setSearchQuery(e.target.value)
                                        }
                                        placeholder="Search items, buildings, or names..."
                                        aria-label="Search posts"
                                        className="w-full pl-9 pr-3 py-1.5 text-sm bg-surface border border-border rounded-md text-text placeholder:text-muted"
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    {/* Segmented Control: All / Lost / Found */}
                                    <div
                                        role="group"
                                        aria-label="Filter by post type"
                                        className="inline-flex p-0.5 bg-subtle border border-border rounded-md"
                                    >
                                        {(
                                            [
                                                "ALL",
                                                "LOST",
                                                "FOUND",
                                            ] as TypeFilter[]
                                        ).map((t) => {
                                            const active = typeFilter === t;
                                            const label =
                                                t === "ALL"
                                                    ? "All"
                                                    : t === "LOST"
                                                      ? "Lost"
                                                      : "Found";
                                            return (
                                                <button
                                                    key={t}
                                                    type="button"
                                                    onClick={() =>
                                                        setTypeFilter(t)
                                                    }
                                                    className={`px-3 py-1 text-xs font-medium rounded transition-colors duration-150 ${
                                                        active
                                                            ? "bg-surface text-text border border-border"
                                                            : "text-muted hover:text-text"
                                                    }`}
                                                >
                                                    {label}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Single Filters Popover Button */}
                                    <div
                                        className="relative"
                                        ref={filterPopoverRef}
                                    >
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setIsFilterPopoverOpen(
                                                    !isFilterPopoverOpen,
                                                )
                                            }
                                            aria-expanded={isFilterPopoverOpen}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-surface border border-border rounded-md text-text hover:bg-subtle transition-colors duration-150"
                                        >
                                            <SlidersHorizontal
                                                size={14}
                                                strokeWidth={1.5}
                                            />
                                            <span>
                                                Filters
                                                {activeExtraFilterCount > 0
                                                    ? ` (${activeExtraFilterCount})`
                                                    : ""}
                                            </span>
                                        </button>

                                        <AnimatePresence>
                                            {isFilterPopoverOpen && (
                                                <motion.div
                                                    initial={{
                                                        opacity: 0,
                                                        y: 4,
                                                        scale: 0.98,
                                                    }}
                                                    animate={{
                                                        opacity: 1,
                                                        y: 0,
                                                        scale: 1,
                                                    }}
                                                    exit={{
                                                        opacity: 0,
                                                        y: 4,
                                                        scale: 0.98,
                                                    }}
                                                    transition={{
                                                        duration: 0.16,
                                                    }}
                                                    className="absolute right-0 mt-2 w-72 bg-surface border border-border rounded-lg p-4 shadow-popover z-40 space-y-3"
                                                >
                                                    <div>
                                                        <label
                                                            htmlFor="filter-hub"
                                                            className="block text-xs text-muted mb-1"
                                                        >
                                                            INCAT building
                                                        </label>
                                                        <select
                                                            id="filter-hub"
                                                            value={hubFilter}
                                                            onChange={(e) =>
                                                                setHubFilter(
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            className="w-full px-2.5 py-1.5 text-xs bg-bg border border-border rounded-md text-text"
                                                        >
                                                            <option value="ALL">
                                                                All buildings
                                                            </option>
                                                            {CAMPUS_HUBS.map(
                                                                (h) => (
                                                                    <option
                                                                        key={
                                                                            h.id
                                                                        }
                                                                        value={
                                                                            h.id
                                                                        }
                                                                    >
                                                                        {h.name}
                                                                    </option>
                                                                ),
                                                            )}
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <label
                                                            htmlFor="filter-cat"
                                                            className="block text-xs text-muted mb-1"
                                                        >
                                                            Category
                                                        </label>
                                                        <select
                                                            id="filter-cat"
                                                            value={
                                                                categoryFilter
                                                            }
                                                            onChange={(e) =>
                                                                setCategoryFilter(
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            className="w-full px-2.5 py-1.5 text-xs bg-bg border border-border rounded-md text-text"
                                                        >
                                                            <option value="ALL">
                                                                All categories
                                                            </option>
                                                            {ITEM_CATEGORIES.map(
                                                                (c) => (
                                                                    <option
                                                                        key={c}
                                                                        value={
                                                                            c
                                                                        }
                                                                    >
                                                                        {c}
                                                                    </option>
                                                                ),
                                                            )}
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <label
                                                            htmlFor="filter-role"
                                                            className="block text-xs text-muted mb-1"
                                                        >
                                                            Custody role
                                                        </label>
                                                        <select
                                                            id="filter-role"
                                                            value={roleFilter}
                                                            onChange={(e) =>
                                                                setRoleFilter(
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            className="w-full px-2.5 py-1.5 text-xs bg-bg border border-border rounded-md text-text"
                                                        >
                                                            <option value="ALL">
                                                                Anyone
                                                            </option>
                                                            <option value="OFFICE">
                                                                Guidance /
                                                                Official Office
                                                            </option>
                                                            <option value="GUARD">
                                                                Main Gate Guard
                                                                House
                                                            </option>
                                                            <option value="FACULTY">
                                                                Faculty
                                                            </option>
                                                            <option value="STUDENT">
                                                                Student
                                                            </option>
                                                        </select>
                                                    </div>

                                                    <div className="pt-2 border-t border-border flex items-center justify-between">
                                                        <button
                                                            type="button"
                                                            onClick={
                                                                resetAllFilters
                                                            }
                                                            className="text-xs text-muted hover:text-text"
                                                        >
                                                            Reset filters
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setIsFilterPopoverOpen(
                                                                    false,
                                                                )
                                                            }
                                                            className="text-xs font-medium text-accent"
                                                        >
                                                            Done
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>

                            {/* Slow-Pulse Skeleton Loading State */}
                            {isLoading ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {[1, 2, 3, 4].map((n) => (
                                        <div
                                            key={n}
                                            className="border border-border rounded-lg bg-surface overflow-hidden"
                                        >
                                            <div className="aspect-4/3 w-full bg-subtle skeleton-pulse" />
                                            <div className="p-5 space-y-2.5">
                                                <div className="h-4 w-2/3 bg-subtle rounded skeleton-pulse" />
                                                <div className="h-3.5 w-full bg-subtle rounded skeleton-pulse" />
                                                <div className="h-3 w-1/2 bg-subtle rounded skeleton-pulse pt-2" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : filteredPosts.length === 0 ? (
                                /* Empty State with Line Illustration */
                                <div className="py-14 text-center border border-border rounded-lg bg-surface text-sm text-muted">
                                    <EmptyTrayIllustration />
                                    <p>
                                        {posts.length === 0
                                            ? "Nothing lost right now. Good news."
                                            : "No matching items found."}
                                    </p>
                                    {posts.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={resetAllFilters}
                                            className="text-accent font-medium hover:underline mt-2 inline-block"
                                        >
                                            Clear filters
                                        </button>
                                    )}
                                </div>
                            ) : (
                                /* 2-Column Photo-First Post Grid with Smooth Layout Reflow */
                                <motion.div
                                    layout={!prefersReducedMotion}
                                    className="grid grid-cols-1 md:grid-cols-2 gap-5"
                                >
                                    <AnimatePresence mode="popLayout">
                                        {filteredPosts.map((post, idx) => (
                                            <PostCard
                                                key={post.id}
                                                post={post}
                                                index={idx}
                                                isHighlighted={
                                                    highlightedPostId ===
                                                    post.id
                                                }
                                                prefersReducedMotion={
                                                    prefersReducedMotion
                                                }
                                                onSelect={(p) =>
                                                    setSelectedPost(p)
                                                }
                                            />
                                        ))}
                                    </AnimatePresence>
                                </motion.div>
                            )}
                        </motion.div>
                    )}

                    {activeTab === "items" && (
                        <motion.div
                            key="tab-items"
                            initial={
                                prefersReducedMotion
                                    ? { opacity: 0 }
                                    : { opacity: 0, y: 8 }
                            }
                            animate={{ opacity: 1, y: 0 }}
                            exit={
                                prefersReducedMotion
                                    ? { opacity: 0 }
                                    : { opacity: 0, y: -4 }
                            }
                            transition={{
                                duration: 0.2,
                                ease: [0.22, 1, 0.36, 1],
                            }}
                        >
                            <QrStickerStudio
                                gear={gear}
                                currentUser={currentUser}
                                onToggleLostMode={handleToggleLostMode}
                                onRegisterGear={handleRegisterGear}
                                onPreviewScan={(tagId) => {
                                    setSelectedScanTag(tagId);
                                    setActiveTab("scan");
                                }}
                            />
                        </motion.div>
                    )}

                    {activeTab === "scan" && (
                        <motion.div
                            key="tab-scan"
                            initial={
                                prefersReducedMotion
                                    ? { opacity: 0 }
                                    : { opacity: 0, y: 8 }
                            }
                            animate={{ opacity: 1, y: 0 }}
                            exit={
                                prefersReducedMotion
                                    ? { opacity: 0 }
                                    : { opacity: 0, y: -4 }
                            }
                            transition={{
                                duration: 0.2,
                                ease: [0.22, 1, 0.36, 1],
                            }}
                        >
                            <QrScanSimulator
                                gear={gear}
                                selectedTagId={selectedScanTag}
                                onSelectTag={(tagId) =>
                                    setSelectedScanTag(tagId)
                                }
                                onPingTagLocation={handlePingTagLocation}
                                onOpenTagChat={(item) => {
                                    const linkedPost =
                                        posts.find(
                                            (p) => p.linkedQrTag === item.tagId,
                                        ) || posts[0];
                                    if (linkedPost) setChatPost(linkedPost);
                                }}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Minimal Footer */}
            <footer className="border-t border-border py-6 text-center text-xs text-muted">
                Made for INCAT students
            </footer>

            {/* Mobile Bottom Tab Bar (3 items with sliding active indicator) */}
            <nav
                aria-label="Mobile navigation"
                className="sm:hidden fixed bottom-0 inset-x-0 h-14 bg-surface border-t border-border grid grid-cols-3 z-30"
            >
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`relative text-xs font-medium flex items-center justify-center ${
                                isActive ? "text-text" : "text-muted"
                            }`}
                        >
                            {tab.label}
                            {isActive && (
                                <motion.span
                                    layoutId="mobile-tab-underline"
                                    transition={{
                                        type: "spring",
                                        stiffness: 300,
                                        damping: 30,
                                    }}
                                    className="absolute top-0 inset-x-6 h-0.5 bg-accent"
                                />
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* Slide-Up Toast Notification */}
            <AnimatePresence>
                {toastMessage && (
                    <motion.div
                        key="status-toast"
                        initial={
                            prefersReducedMotion
                                ? { opacity: 0 }
                                : { opacity: 0, y: 16 }
                        }
                        animate={{ opacity: 1, y: 0 }}
                        exit={
                            prefersReducedMotion
                                ? { opacity: 0 }
                                : { opacity: 0, y: 12 }
                        }
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        role="status"
                        className="fixed bottom-16 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-text text-bg text-xs font-medium rounded-md shadow-popover"
                    >
                        {toastMessage}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Side Panel: Item Detail, Shared Photo & Timeline */}
            <ClaimVerifyDrawer
                post={selectedPost}
                currentUser={currentUser}
                isVerified={
                    selectedPost
                        ? verifiedPostIds.includes(selectedPost.id)
                        : false
                }
                onClose={() => setSelectedPost(null)}
                onSubmitClaim={handleSubmitClaim}
                onReviewClaim={handleReviewClaim}
                onResolvePost={handleResolvePost}
                onDeletePost={handleDeletePost}
                onOpenChat={(post) => {
                    setSelectedPost(null);
                    setChatPost(post);
                }}
                onJumpToQrTag={(tagId) => {
                    setSelectedPost(null);
                    setSelectedScanTag(tagId);
                    setActiveTab("scan");
                }}
            />

            {/* In-App Campus Chat Drawer */}
            <ChatDrawer
                post={chatPost}
                currentUser={currentUser}
                onClose={() => setChatPost(null)}
            />

            {/* Post Modal */}
            <PostModal
                isOpen={isPostModalOpen}
                currentUser={currentUser}
                registeredGear={gear}
                onClose={() => setIsPostModalOpen(false)}
                onCreatePost={handleCreatePost}
            />
        </div>
    );
}

export default App;
