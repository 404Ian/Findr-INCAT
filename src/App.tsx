import { useEffect, useState, useTransition } from "react";
import {
    HelpCircle,
    MapPin,
    Plus,
    QrCode,
    Search,
    Sparkles,
} from "lucide-react";
import { CampusMap } from "./components/CampusMap";
import { ChatDrawer } from "./components/ChatDrawer";
import { PostModal } from "./components/PostModal";
import { QrScanSimulator } from "./components/QrScanSimulator";
import { QrStickerStudio } from "./components/QrStickerStudio";
import { PublicTagPage } from "./components/PublicTagPage";
import { api } from "./lib/api";
import { useDeepLinkRoute } from "./lib/useDeepLinkRoute";
import type {
    ItemCategory,
    Post,
    PostFilters,
    PostStatus,
    PostType,
} from "./types";

export function App() {
    const { publicTagCode, restoredNotice, clearPublicTag } =
        useDeepLinkRoute();

    const [activeTab, setActiveTab] = useState<"wall" | "my-items" | "scan">(
        "wall",
    );
    const [posts, setPosts] = useState<Post[]>([]);
    const [stats, setStats] = useState({
        missingCount: 0,
        foundCount: 0,
        returnedCount: 0,
    });
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [, startTransition] = useTransition();

    // Filters
    const [typeFilter, setTypeFilter] = useState<"all" | PostType>("all");
    const [statusFilter, ] = useState<"all" | PostStatus>("all");
    const [categoryFilter, ] = useState<"all" | ItemCategory>(
        "all",
    );
    const [searchQuery, setSearchQuery] = useState("");
    const [showMap, setShowMap] = useState(false);

    // Modals & Drawers
    const [postModalOpen, setPostModalOpen] = useState(false);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [scanInitialCode, setScanInitialCode] = useState<string | null>(null);

    const fetchWallPosts = async () => {
        setLoadingPosts(true);
        try {
            const filters: PostFilters = {
                type: typeFilter,
                status: statusFilter,
                category: categoryFilter,
                q: searchQuery.trim() || undefined,
                limit: 30,
            };
            const res = await api.getPosts(filters);
            setPosts(res.items);
            setStats(res.stats);
        } catch {
            // Fallback empty state
            setPosts([]);
        } finally {
            setLoadingPosts(false);
        }
    };

    useEffect(() => {
        startTransition(() => {
            void fetchWallPosts();
        });
    }, [typeFilter, statusFilter, categoryFilter, searchQuery]);

    // If a deep-link /t/:code route is present, render PublicTagPage full screen
    if (publicTagCode) {
        return (
            <div className="min-h-screen bg-neutral-950 px-4 py-8 text-neutral-100">
                <PublicTagPage
                    publicCode={publicTagCode}
                    onBack={clearPublicTag}
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-100 selection:bg-emerald-500 selection:text-white">
            {restoredNotice && (
                <div className="bg-emerald-900 px-4 py-2 text-center text-xs font-semibold text-emerald-100">
                    {restoredNotice}
                </div>
            )}

            {/* Header Navigation */}
            <header className="sticky top-0 z-40 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur-md">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 font-bold text-white shadow-md">
                            F
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5 text-sm font-bold text-neutral-100">
                                <span>Findr INCAT</span>
                                <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-300">
                                    v2.0
                                </span>
                            </div>
                            <p className="text-[11px] text-neutral-400">
                                Ilocos Norte College of Arts &amp; Trades
                                &middot; Laoag City
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={() => setPostModalOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-500"
                        >
                            <Plus className="h-4 w-4" />
                            <span>Post Item</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Container */}
            <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
                {/* Navigation Tabs */}
                <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setActiveTab("wall")}
                            className={`rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
                                activeTab === "wall"
                                    ? "bg-neutral-800 text-neutral-100 shadow-sm"
                                    : "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200"
                            }`}
                        >
                            Wall ({stats.missingCount + stats.foundCount})
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("my-items")}
                            className={`rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
                                activeTab === "my-items"
                                    ? "bg-neutral-800 text-neutral-100 shadow-sm"
                                    : "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200"
                            }`}
                        >
                            My items (QR Tags)
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("scan")}
                            className={`rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
                                activeTab === "scan"
                                    ? "bg-neutral-800 text-neutral-100 shadow-sm"
                                    : "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200"
                            }`}
                        >
                            Scan
                        </button>
                    </div>

                    {activeTab === "wall" && (
                        <button
                            type="button"
                            onClick={() => setShowMap((prev) => !prev)}
                            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                                showMap
                                    ? "border-emerald-500 bg-emerald-950/40 text-emerald-200"
                                    : "border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
                            }`}
                        >
                            <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                            <span>
                                {showMap ? "Hide INCAT Map" : "Show INCAT Map"}
                            </span>
                        </button>
                    )}
                </div>

                {/* TAB 1: WALL */}
                {activeTab === "wall" && (
                    <div className="mt-6 space-y-6">
                        {/* Hero Banner */}
                        <div className="rounded-2xl border border-neutral-800 bg-linear-to-br from-neutral-900 via-neutral-950 to-neutral-950 p-6 shadow-xl sm:p-8">
                            <div className="max-w-xl space-y-2">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    <span>
                                        INCAT Campus Lost &amp; Found Hub
                                    </span>
                                </span>
                                <h1 className="text-2xl font-black tracking-tight text-neutral-100 sm:text-3xl">
                                    What&apos;s missing at INCAT?
                                </h1>
                                <p className="text-xs leading-relaxed text-neutral-400">
                                    Check items turned in at the Guard House,
                                    Guidance Office, or department labs. No
                                    login or accounts required.
                                </p>
                            </div>

                            <div className="mt-6 flex flex-wrap gap-4 text-xs font-semibold text-neutral-300">
                                <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 px-4 py-2.5">
                                    <span className="text-rose-400">
                                        {stats.missingCount}
                                    </span>{" "}
                                    missing items
                                </div>
                                <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 px-4 py-2.5">
                                    <span className="text-emerald-400">
                                        {stats.foundCount}
                                    </span>{" "}
                                    found items
                                </div>
                                <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 px-4 py-2.5">
                                    <span className="text-neutral-400">
                                        {stats.returnedCount}
                                    </span>{" "}
                                    successfully returned
                                </div>
                            </div>
                        </div>

                        {/* INCAT Campus Map Section Toggle */}
                        {showMap && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs text-neutral-400">
                                    <span>
                                        Interactive Campus Map (P. Gomez St.,
                                        Laoag City)
                                    </span>
                                    <span>12 Hubs &amp; Live Item Pins</span>
                                </div>
                                <CampusMap
                                    posts={posts}
                                    onSelectPost={(p) => setSelectedPost(p)}
                                />
                            </div>
                        )}

                        {/* Search & Filters Bar */}
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative flex-1">
                                <Search className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-neutral-500" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) =>
                                        setSearchQuery(e.target.value)
                                    }
                                    placeholder="Search items, calculators, ID cards, buildings..."
                                    className="w-full rounded-xl border border-neutral-800 bg-neutral-900 py-2.5 pr-4 pl-10 text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none"
                                />
                            </div>

                            <div className="flex gap-1.5 rounded-xl border border-neutral-800 bg-neutral-900 p-1 text-xs">
                                {(["all", "lost", "found"] as const).map(
                                    (t) => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setTypeFilter(t)}
                                            className={`rounded-lg px-3 py-1.5 font-semibold uppercase transition-colors ${
                                                typeFilter === t
                                                    ? "bg-emerald-600 text-white shadow-sm"
                                                    : "text-neutral-400 hover:text-neutral-200"
                                            }`}
                                        >
                                            {t}
                                        </button>
                                    ),
                                )}
                            </div>
                        </div>

                        {/* Posts Grid */}
                        {loadingPosts ? (
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {[1, 2, 3].map((n) => (
                                    <div
                                        key={n}
                                        className="h-64 animate-pulse rounded-2xl border border-neutral-800 bg-neutral-900/60"
                                    />
                                ))}
                            </div>
                        ) : posts.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-950 p-12 text-center">
                                <HelpCircle className="mx-auto h-10 w-10 text-neutral-500" />
                                <h3 className="mt-3 text-sm font-bold text-neutral-100">
                                    No items found matching your filter
                                </h3>
                                <p className="mt-1 text-xs text-neutral-400">
                                    Try adjusting your search query or publish a
                                    new post.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setPostModalOpen(true)}
                                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                                >
                                    <Plus className="h-4 w-4" />
                                    <span>Post Missing Item</span>
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {posts.map((post) => (
                                    <div
                                        key={post.id}
                                        onClick={() => setSelectedPost(post)}
                                        className="group flex cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 p-4 transition-all hover:border-neutral-700 hover:shadow-xl"
                                    >
                                        <div>
                                            <div className="aspect-video w-full overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
                                                {post.imageUrls.length > 0 ? (
                                                    <img
                                                        src={post.imageUrls[0]}
                                                        alt={post.title}
                                                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                    />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center text-neutral-600">
                                                        <QrCode className="h-10 w-10 opacity-30" />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="mt-3.5 flex items-center justify-between">
                                                <span
                                                    className={`rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${
                                                        post.status ===
                                                        "returned"
                                                            ? "bg-neutral-800 text-neutral-300"
                                                            : post.type ===
                                                                "lost"
                                                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                                              : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                                    }`}
                                                >
                                                    {post.status === "returned"
                                                        ? "Returned"
                                                        : post.type}
                                                </span>
                                                <span className="text-[11px] text-neutral-500">
                                                    {new Date(
                                                        post.createdAt,
                                                    ).toLocaleDateString()}
                                                </span>
                                            </div>

                                            <h3 className="mt-2 text-base font-bold text-neutral-100 group-hover:text-emerald-400">
                                                {post.title}
                                            </h3>
                                            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-neutral-400">
                                                {post.description}
                                            </p>
                                        </div>

                                        <div className="mt-4 flex items-center justify-between border-t border-neutral-800/80 pt-3 text-xs text-neutral-400">
                                            <span className="inline-flex items-center gap-1 text-neutral-300">
                                                <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                                                {post.locationName}
                                            </span>
                                            <span className="font-semibold text-emerald-400">
                                                View &rarr;
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 2: MY ITEMS (QR TAG STUDIO) */}
                {activeTab === "my-items" && (
                    <div className="mt-6">
                        <QrStickerStudio
                            onPreviewTagCode={(code) =>
                                setScanInitialCode(code)
                            }
                        />
                    </div>
                )}

                {/* TAB 3: SCAN */}
                {activeTab === "scan" && (
                    <div className="mt-6">
                        <QrScanSimulator
                            initialCode={scanInitialCode}
                            onCodeResolved={(code) => setScanInitialCode(code)}
                        />
                    </div>
                )}
            </main>

            {/* Post Modal */}
            <PostModal
                isOpen={postModalOpen}
                onClose={() => setPostModalOpen(false)}
                onCreated={() => {
                    setPostModalOpen(false);
                    void fetchWallPosts();
                }}
            />

            {/* Post Details / Relay Chat Drawer */}
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

export default App;
