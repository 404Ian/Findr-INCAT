import { useEffect, useMemo, useRef, useState } from "react";
import {
    Search,
    SlidersHorizontal,
    Plus,
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
import type { DemoUser, PostItem, QrGearItem } from "./types";

type ActiveTab = "wall" | "items" | "scan";
type TypeFilter = "ALL" | "LOST" | "FOUND";

export function App() {
    // Theme state (default: LIGHT)
    const [darkMode, setDarkMode] = useState<boolean>(() => {
        return localStorage.getItem("findr_theme") === "dark";
    });

    useEffect(() => {
        const root = document.documentElement;
        if (darkMode) {
            root.classList.add("dark");
            localStorage.setItem("findr_theme", "dark");
        } else {
            root.classList.remove("dark");
            localStorage.setItem("findr_theme", "light");
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

    useEffect(() => {
        setPosts(api.getPosts());
        setGear(api.getGear());
        setVerifiedPostIds(api.getVerifiedPostIds());
        const timer = setTimeout(() => setIsLoading(false), 180);
        return () => clearTimeout(timer);
    }, []);

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

    // Wall Filters & Map visibility (hidden by default)
    const [showMap, setShowMap] = useState(false);
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
            p.id === postId ? { ...p, status: "RESOLVED" as const } : p,
        );
        setPosts(updated);
        api.savePosts(updated);
        setSelectedPost(updated.find((p) => p.id === postId) || null);
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
                    linkedQrTag: target.tagId,
                    createdAt: "Just now",
                    contactChannels: target.contactChannels,
                    claims: [],
                };
                const nextPosts = [autoPost, ...posts];
                setPosts(nextPosts);
                api.savePosts(nextPosts);
            }
        } else {
            const nextPosts = posts.map((p) =>
                p.linkedQrTag === tagId
                    ? { ...p, status: "RESOLVED" as const }
                    : p,
            );
            setPosts(nextPosts);
            api.savePosts(nextPosts);
        }
    };

    const handleRegisterGear = (newItem: QrGearItem) => {
        const updated = [newItem, ...gear];
        setGear(updated);
        api.saveGear(updated);
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
    };

    const resetAllFilters = () => {
        setSearchQuery("");
        setTypeFilter("ALL");
        setHubFilter("ALL");
        setCategoryFilter("ALL");
        setRoleFilter("ALL");
    };

    return (
        <div className="min-h-screen flex flex-col bg-bg text-text pb-16 sm:pb-0">
            {/* Slim Top Header */}
            <header className="h-14 border-b border-border bg-surface sticky top-0 z-30">
                <div className="max-w-275 mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-4">
                    {/* Left: Plain text wordmark */}
                    <button
                        type="button"
                        onClick={() => setActiveTab("wall")}
                        className="text-base font-medium text-text tracking-tight hover:opacity-80 transition-opacity duration-150"
                    >
                        Findr INCAT
                    </button>

                    {/* Center: Three plain text tabs (Desktop) */}
                    <nav
                        aria-label="Main navigation"
                        className="hidden sm:flex items-center gap-6"
                    >
                        <button
                            type="button"
                            onClick={() => setActiveTab("wall")}
                            className={`text-sm py-4 border-b-2 transition-colors duration-150 ${
                                activeTab === "wall"
                                    ? "border-text text-text font-medium"
                                    : "border-transparent text-muted hover:text-text"
                            }`}
                        >
                            Wall
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("items")}
                            className={`text-sm py-4 border-b-2 transition-colors duration-150 ${
                                activeTab === "items"
                                    ? "border-text text-text font-medium"
                                    : "border-transparent text-muted hover:text-text"
                            }`}
                        >
                            My items
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("scan")}
                            className={`text-sm py-4 border-b-2 transition-colors duration-150 ${
                                activeTab === "scan"
                                    ? "border-text text-text font-medium"
                                    : "border-transparent text-muted hover:text-text"
                            }`}
                        >
                            Scan
                        </button>
                    </nav>

                    {/* Right: Single Post button + Theme toggle + Avatar menu */}
                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={() => setIsPostModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-accent text-accent-fg text-sm font-medium rounded-md hover:opacity-90 transition-opacity duration-150"
                        >
                            <Plus size={16} strokeWidth={1.5} />
                            Post
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

                            {isAvatarMenuOpen && (
                                <div className="absolute right-0 mt-2 w-64 bg-surface border border-border rounded-lg p-2 shadow-popover z-40">
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
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content Container */}
            <main className="flex-1 w-full max-w-275 mx-auto px-4 sm:px-6 py-8">
                {activeTab === "wall" && (
                    <div>
                        {/* Stat line & Show Map link */}
                        <div className="flex items-center justify-between gap-4 mb-6 text-sm">
                            <p className="text-muted">
                                <span className="text-text font-medium">
                                    {stats.missing}
                                </span>{" "}
                                missing ·{" "}
                                <span className="text-text font-medium">
                                    {stats.found}
                                </span>{" "}
                                found ·{" "}
                                <span className="text-text font-medium">
                                    {stats.returned}
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

                        {/* Collapsible Map */}
                        {showMap && (
                            <CampusMap
                                posts={posts}
                                selectedHubId={hubFilter}
                                onSelectHub={(id) => setHubFilter(id)}
                                onSelectPost={(post) => setSelectedPost(post)}
                            />
                        )}

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
                                        ["ALL", "LOST", "FOUND"] as TypeFilter[]
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
                                                onClick={() => setTypeFilter(t)}
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

                                    {isFilterPopoverOpen && (
                                        <div className="absolute right-0 mt-2 w-72 bg-surface border border-border rounded-lg p-4 shadow-popover z-40 space-y-3">
                                            <div>
                                                <label
                                                    htmlFor="filter-hub"
                                                    className="block text-xs text-muted mb-1"
                                                >
                                                    Campus hub
                                                </label>
                                                <select
                                                    id="filter-hub"
                                                    value={hubFilter}
                                                    onChange={(e) =>
                                                        setHubFilter(
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="w-full px-2.5 py-1.5 text-xs bg-bg border border-border rounded-md text-text"
                                                >
                                                    <option value="ALL">
                                                        All buildings
                                                    </option>
                                                    {CAMPUS_HUBS.map((h) => (
                                                        <option
                                                            key={h.id}
                                                            value={h.id}
                                                        >
                                                            {h.name}
                                                        </option>
                                                    ))}
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
                                                    value={categoryFilter}
                                                    onChange={(e) =>
                                                        setCategoryFilter(
                                                            e.target.value,
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
                                                                value={c}
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
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="w-full px-2.5 py-1.5 text-xs bg-bg border border-border rounded-md text-text"
                                                >
                                                    <option value="ALL">
                                                        Anyone
                                                    </option>
                                                    <option value="OFFICE">
                                                        Guidance / Official
                                                        Office
                                                    </option>
                                                    <option value="GUARD">
                                                        Main Gate Guard House
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
                                                    onClick={resetAllFilters}
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
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Skeleton Loading State */}
                        {isLoading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[1, 2, 3, 4].map((n) => (
                                    <div
                                        key={n}
                                        className="border border-border rounded-lg bg-surface p-6 space-y-3"
                                    >
                                        <div className="h-4 w-2/3 bg-subtle rounded animate-pulse" />
                                        <div className="h-3.5 w-full bg-subtle rounded animate-pulse" />
                                        <div className="h-3 w-1/2 bg-subtle rounded animate-pulse pt-2" />
                                    </div>
                                ))}
                            </div>
                        ) : filteredPosts.length === 0 ? (
                            /* Single-line Empty State */
                            <div className="py-12 text-center border border-border rounded-lg bg-surface text-sm text-muted">
                                No matching items found.{" "}
                                <button
                                    type="button"
                                    onClick={resetAllFilters}
                                    className="text-accent font-medium hover:underline ml-1"
                                >
                                    Clear filters
                                </button>
                            </div>
                        ) : (
                            /* Minimal 2-Column Equal-Height Post Grid */
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredPosts.map((post) => {
                                    const hub = getHubById(post.hubId);
                                    const isResolved =
                                        post.status === "RESOLVED";
                                    const statusText = isResolved
                                        ? "Returned"
                                        : post.type === "LOST"
                                          ? "Lost"
                                          : "Found";
                                    const dotClass = isResolved
                                        ? "bg-returned"
                                        : post.type === "LOST"
                                          ? "bg-lost"
                                          : "bg-found";
                                    const actionText = isResolved
                                        ? "Details"
                                        : post.type === "FOUND"
                                          ? "Claim"
                                          : "I found this";

                                    return (
                                        <article
                                            key={post.id}
                                            onClick={() =>
                                                setSelectedPost(post)
                                            }
                                            tabIndex={0}
                                            role="button"
                                            onKeyDown={(e) => {
                                                if (
                                                    e.key === "Enter" ||
                                                    e.key === " "
                                                ) {
                                                    e.preventDefault();
                                                    setSelectedPost(post);
                                                }
                                            }}
                                            className="border border-border rounded-lg bg-surface p-6 flex flex-col justify-between hover:border-muted transition-colors duration-150 cursor-pointer text-left"
                                        >
                                            <div>
                                                {/* Header: Title (500 weight) + Small Status Dot on Top-Right */}
                                                <div className="flex items-start justify-between gap-4">
                                                    <h2 className="text-base font-medium text-text leading-snug">
                                                        {post.title}
                                                    </h2>
                                                    <span className="inline-flex items-center gap-1.5 text-xs text-muted shrink-0 pt-0.5">
                                                        <span
                                                            className={`w-1.5 h-1.5 rounded-full ${dotClass}`}
                                                        />
                                                        {statusText}
                                                    </span>
                                                </div>

                                                {/* Single line of description */}
                                                <p className="text-sm text-muted line-clamp-1 mt-1.5">
                                                    {post.description}
                                                </p>
                                            </div>

                                            {/* Muted meta line + One text-style action button */}
                                            <div className="mt-6 pt-3 border-t border-border flex items-center justify-between gap-4 text-xs">
                                                <span className="text-muted truncate">
                                                    {hub.name} ·{" "}
                                                    {post.createdAt} ·{" "}
                                                    {post.posterName}
                                                </span>
                                                <span className="font-medium text-accent hover:opacity-80 shrink-0">
                                                    {actionText}
                                                </span>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "items" && (
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
                )}

                {activeTab === "scan" && (
                    <QrScanSimulator
                        gear={gear}
                        selectedTagId={selectedScanTag}
                        onSelectTag={(tagId) => setSelectedScanTag(tagId)}
                        onPingTagLocation={handlePingTagLocation}
                        onOpenTagChat={(item) => {
                            const linkedPost =
                                posts.find(
                                    (p) => p.linkedQrTag === item.tagId,
                                ) || posts[0];
                            if (linkedPost) setChatPost(linkedPost);
                        }}
                    />
                )}
            </main>

            {/* Mobile Bottom Tab Bar (3 items) */}
            <nav
                aria-label="Mobile navigation"
                className="sm:hidden fixed bottom-0 inset-x-0 h-14 bg-surface border-t border-border grid grid-cols-3 z-30"
            >
                <button
                    type="button"
                    onClick={() => setActiveTab("wall")}
                    className={`text-xs font-medium flex items-center justify-center ${
                        activeTab === "wall" ? "text-text" : "text-muted"
                    }`}
                >
                    Wall
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab("items")}
                    className={`text-xs font-medium flex items-center justify-center ${
                        activeTab === "items" ? "text-text" : "text-muted"
                    }`}
                >
                    My items
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab("scan")}
                    className={`text-xs font-medium flex items-center justify-center ${
                        activeTab === "scan" ? "text-text" : "text-muted"
                    }`}
                >
                    Scan
                </button>
            </nav>

            {/* Side Panel: Item Detail & Verification */}
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
