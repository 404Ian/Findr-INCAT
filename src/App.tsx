import { useState, useMemo, useEffect } from "react";
import {
    Radar,
    PlusCircle,
    QrCode,
    Smartphone,
    ShieldCheck,
    Search,
    MapPin,
    Filter,
    CheckCircle2,
    KeyRound,
    RotateCcw,
    UserCheck,
    Building2,
    Sparkles,
    AlertTriangle,
} from "lucide-react";
import type {
    CampusHubName,
    CampusRole,
    ChatMessage,
    ItemCategory,
    RegisteredItem,
    UserProfile,
    WallPost,
} from "./types";
import { CAMPUS_HUBS, ITEM_CATEGORIES } from "./data/hubs";
import { apiService, INITIAL_DEMO_USERS } from "./services/api";
import { CampusMap } from "./components/CampusMap";
import { ContactMatrix } from "./components/ContactMatrix";
import { PostModal } from "./components/PostModal";
import { ClaimVerifyDrawer } from "./components/ClaimVerifyDrawer";
import { ChatDrawer } from "./components/ChatDrawer";
import { QrStickerStudio } from "./components/QrStickerStudio";
import { QrScanSimulator } from "./components/QrScanSimulator";

export function App() {
    const [activeTab, setActiveTab] = useState<
        "wall" | "qr-studio" | "scan-sim"
    >("wall");
    const [currentUser, setCurrentUser] = useState<UserProfile>(
        INITIAL_DEMO_USERS[0],
    );

    const [posts, setPosts] = useState<WallPost[]>(() => apiService.getPosts());
    const [items, setItems] = useState<RegisteredItem[]>(() =>
        apiService.getItems(),
    );
    const [messages, setMessages] = useState<ChatMessage[]>(() =>
        apiService.getMessages(),
    );

    // Multi-Dimensional Wall Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [postTypeFilter, setPostTypeFilter] = useState<
        "all" | "lost" | "found" | "resolved"
    >("all");
    const [roleFilter, setRoleFilter] = useState<"all" | CampusRole>("all");
    const [hubFilter, setHubFilter] = useState<"all" | CampusHubName>("all");
    const [categoryFilter, setCategoryFilter] = useState<"all" | ItemCategory>(
        "all",
    );
    const [showCampusRadarMap, setShowCampusRadarMap] = useState(true);

    // Modals & Drawers
    const [isPostModalOpen, setIsPostModalOpen] = useState(false);
    const [activeClaimPostId, setActiveClaimPostId] = useState<string | null>(
        null,
    );
    const [chatTarget, setChatTarget] = useState<{
        title: string;
        postId?: string;
        itemId?: string;
    } | null>(null);
    const [simulatedScanItem, setSimulatedScanItem] = useState<RegisteredItem>(
        () => items[0],
    );
    const [passcodePromptPostId, setPasscodePromptPostId] = useState<
        string | null
    >(null);
    const [passcodeInput, setPasscodeInput] = useState("");

    // Check if URL has ?scan=TAG_CODE parameter
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const scanCode = params.get("scan");
        if (scanCode) {
            const found = items.find(
                (i) => i.tag_code.toLowerCase() === scanCode.toLowerCase(),
            );
            if (found) {
                setSimulatedScanItem(found);
                setActiveTab("scan-sim");
            }
        }
    }, [items]);

    // Filtered Wall Posts
    const filteredPosts = useMemo(() => {
        return posts.filter((post) => {
            if (postTypeFilter === "resolved" && post.status !== "resolved")
                return false;
            if (
                postTypeFilter === "lost" &&
                (post.post_type !== "lost" || post.status === "resolved")
            )
                return false;
            if (
                postTypeFilter === "found" &&
                (post.post_type !== "found" || post.status === "resolved")
            )
                return false;

            if (roleFilter !== "all" && post.poster_role !== roleFilter)
                return false;
            if (hubFilter !== "all" && post.campus_hub !== hubFilter)
                return false;
            if (categoryFilter !== "all" && post.category !== categoryFilter)
                return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchTitle = post.title.toLowerCase().includes(q);
                const matchDesc = post.description.toLowerCase().includes(q);
                const matchRoom = (post.room_detail || "")
                    .toLowerCase()
                    .includes(q);
                const matchPoster = post.poster_name.toLowerCase().includes(q);
                if (!matchTitle && !matchDesc && !matchRoom && !matchPoster)
                    return false;
            }
            return true;
        });
    }, [
        posts,
        postTypeFilter,
        roleFilter,
        hubFilter,
        categoryFilter,
        searchQuery,
    ]);

    // Handlers
    const handleCreatePost = (newPost: WallPost) => {
        const updated = [newPost, ...posts];
        setPosts(updated);
        apiService.savePosts(updated);
    };

    const handleResolvePost = (post: WallPost) => {
        if (post.is_anonymous && post.edit_passcode) {
            setPasscodePromptPostId(post.id);
            return;
        }
        const updated = posts.map((p) =>
            p.id === post.id ? { ...p, status: "resolved" as const } : p,
        );
        setPosts(updated);
        apiService.savePosts(updated);
    };

    const handleConfirmPasscodeResolve = (postId: string) => {
        const target = posts.find((p) => p.id === postId);
        if (!target) return;
        if (
            target.edit_passcode &&
            passcodeInput.trim().toUpperCase() !==
                target.edit_passcode.toUpperCase()
        ) {
            alert(`Passcode mismatch! Demo hint: ${target.edit_passcode}`);
            return;
        }
        const updated = posts.map((p) =>
            p.id === postId ? { ...p, status: "resolved" as const } : p,
        );
        setPosts(updated);
        apiService.savePosts(updated);
        setPasscodePromptPostId(null);
        setPasscodeInput("");
    };

    const handleSubmitClaim = (
        postId: string,
        claimantName: string,
        claimantRole: CampusRole,
        answer: string,
        contactInfo: string,
    ) => {
        const newClaim = {
            id: `claim-${Date.now().toString().slice(-4)}`,
            post_id: postId,
            claimant_name: claimantName,
            claimant_role: claimantRole,
            verification_answer: answer,
            contact_info: contactInfo,
            status: "pending" as const,
            created_at: "Just now",
        };

        const updated = posts.map((p) => {
            if (p.id !== postId) return p;
            return {
                ...p,
                status: p.status === "open" ? ("verifying" as const) : p.status,
                claims: [newClaim, ...p.claims],
            };
        });

        setPosts(updated);
        apiService.savePosts(updated);
    };

    const handleReviewClaim = (
        postId: string,
        claimId: string,
        decision: "approved" | "rejected",
    ) => {
        const updated = posts.map((p) => {
            if (p.id !== postId) return p;
            const updatedClaims = p.claims.map((c) =>
                c.id === claimId ? { ...c, status: decision } : c,
            );
            return {
                ...p,
                status:
                    decision === "approved" ? ("resolved" as const) : p.status,
                claims: updatedClaims,
            };
        });

        setPosts(updated);
        apiService.savePosts(updated);
    };

    const handleRegisterItem = (newItem: RegisteredItem) => {
        const updated = [newItem, ...items];
        setItems(updated);
        apiService.saveItems(updated);
    };

    // 1-Click Lost Mode Escalation: Updates QR tag status AND cross-posts urgent alert to the Campus Wall
    const handleToggleLostMode = (item: RegisteredItem) => {
        const nextStatus = item.status === "lost" ? "safe" : "lost";
        const updatedItems = items.map((i) =>
            i.id === item.id
                ? { ...i, status: nextStatus as "safe" | "lost" }
                : i,
        );
        setItems(updatedItems);
        apiService.saveItems(updatedItems);

        if (nextStatus === "lost") {
            const autoPost: WallPost = {
                id: `post-qr-${Date.now().toString().slice(-4)}`,
                user_id: currentUser.id,
                is_anonymous: false,
                poster_name: item.owner_name,
                poster_role: item.owner_role,
                poster_dept: item.owner_dept,
                linked_item_id: item.id,
                post_type: "lost",
                title: `LOST QR GEAR: ${item.name} (Tag #${item.tag_code})`,
                description: `${item.custom_note} — Escalated via 1-Click Lost Mode from Student QR Locker.`,
                category: item.category,
                campus_hub: item.meetup_hub,
                room_detail:
                    item.meetup_room ||
                    "Drop off at preferred hub or scan QR sticker",
                lat: item.lat,
                lng: item.lng,
                contact_config: item.contact_config,
                status: "open",
                created_at: "Just now",
                claims: [],
            };
            const updatedPosts = [autoPost, ...posts];
            setPosts(updatedPosts);
            apiService.savePosts(updatedPosts);
        } else {
            const updatedPosts = posts.map((p) =>
                p.linked_item_id === item.id
                    ? { ...p, status: "resolved" as const }
                    : p,
            );
            setPosts(updatedPosts);
            apiService.savePosts(updatedPosts);
        }
    };

    const handlePingItemLocation = (itemId: string, locationLabel: string) => {
        const updated = items.map((i) =>
            i.id === itemId
                ? {
                      ...i,
                      last_ping_location: locationLabel,
                      last_ping_time: "Just now",
                  }
                : i,
        );
        setItems(updated);
        apiService.saveItems(updated);
        const refreshed = updated.find((i) => i.id === itemId);
        if (refreshed) setSimulatedScanItem(refreshed);
    };

    const handleSendMessage = (content: string, isAnonymous: boolean) => {
        if (!chatTarget) return;
        const newMsg: ChatMessage = {
            id: `msg-${Date.now()}`,
            post_id: chatTarget.postId,
            item_id: chatTarget.itemId,
            sender_name: currentUser.name,
            sender_role: currentUser.role,
            is_anonymous: isAnonymous,
            content,
            created_at: "Just now",
        };
        const updated = [...messages, newMsg];
        setMessages(updated);
        apiService.saveMessages(updated);
    };

    const activeClaimPost =
        posts.find((p) => p.id === activeClaimPostId) || null;
    const activeChatMessages = messages.filter(
        (m) =>
            (chatTarget?.postId && m.post_id === chatTarget.postId) ||
            (chatTarget?.itemId && m.item_id === chatTarget.itemId),
    );

    return (
        <div className="min-h-screen flex flex-col">
            {/* Sticky Glass Navigation Header */}
            <header className="no-print sticky top-0 z-40 radar-glass border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
                    {/* Brand Logo */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-inner">
                            <Radar className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-base font-extrabold tracking-tight text-white">
                                    CampusRadar
                                </span>
                                <span className="font-mono-tabular text-[10px] uppercase px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 font-semibold">
                                    Find My • School Edition
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-400">
                                Community Lost & Found Wall • Anti-Theft
                                Verification • DIY QR Sticker Studio
                            </p>
                        </div>
                    </div>

                    {/* Primary Navigation Tabs */}
                    <nav className="flex items-center gap-1.5 bg-radar-bg/90 p-1.5 rounded-xl border border-white/10">
                        <button
                            onClick={() => setActiveTab("wall")}
                            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                activeTab === "wall"
                                    ? "bg-radar-blue text-white shadow"
                                    : "text-slate-400 hover:text-white"
                            }`}
                        >
                            <Radar className="w-3.5 h-3.5" />
                            Campus Wall (
                            {
                                posts.filter((p) => p.status !== "resolved")
                                    .length
                            }
                            )
                        </button>
                        <button
                            onClick={() => setActiveTab("qr-studio")}
                            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                activeTab === "qr-studio"
                                    ? "bg-radar-blue text-white shadow"
                                    : "text-slate-400 hover:text-white"
                            }`}
                        >
                            <QrCode className="w-3.5 h-3.5" />
                            My QR Locker & Sticker Studio ({items.length})
                        </button>
                        <button
                            onClick={() => setActiveTab("scan-sim")}
                            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                activeTab === "scan-sim"
                                    ? "bg-radar-blue text-white shadow"
                                    : "text-slate-400 hover:text-white"
                            }`}
                        >
                            <Smartphone className="w-3.5 h-3.5" />
                            QR Scan Simulator
                        </button>
                    </nav>

                    {/* Active Campus Role Switcher & Post CTA */}
                    <div className="flex items-center gap-2.5">
                        <div className="hidden sm:flex items-center gap-2 bg-radar-bg px-3 py-1.5 rounded-xl border border-white/10">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                            <select
                                aria-label="Switch active demo user profile"
                                value={currentUser.id}
                                onChange={(e) => {
                                    const found = INITIAL_DEMO_USERS.find(
                                        (u) => u.id === e.target.value,
                                    );
                                    if (found) setCurrentUser(found);
                                }}
                                className="bg-transparent text-xs text-slate-200 font-medium outline-none cursor-pointer"
                            >
                                {INITIAL_DEMO_USERS.map((u) => (
                                    <option
                                        key={u.id}
                                        value={u.id}
                                        className="bg-radar-card text-white"
                                    >
                                        {u.name} ({u.role.toUpperCase()})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button
                            onClick={() => setIsPostModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-radar-blue hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/25 transition cursor-pointer"
                        >
                            <PlusCircle className="w-4 h-4" />
                            Post Lost / Found
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content Container */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
                {activeTab === "wall" && (
                    <>
                        {/* Top Radar Overview & Collapsible Map */}
                        <div className="radar-card rounded-2xl p-5 space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div className="flex flex-wrap items-center gap-3">
                                    <span className="inline-flex items-center gap-2 text-xs font-mono-tabular uppercase px-3 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 font-semibold">
                                        <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                                        {
                                            posts.filter(
                                                (p) =>
                                                    p.post_type === "lost" &&
                                                    p.status !== "resolved",
                                            ).length
                                        }{" "}
                                        Active Missing Alerts
                                    </span>
                                    <span className="inline-flex items-center gap-2 text-xs font-mono-tabular uppercase px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                                        <ShieldCheck className="w-3.5 h-3.5" />
                                        {
                                            posts.filter(
                                                (p) =>
                                                    p.post_type === "found" &&
                                                    p.status !== "resolved",
                                            ).length
                                        }{" "}
                                        Found / Held in Custody
                                    </span>
                                    <span className="inline-flex items-center gap-2 text-xs font-mono-tabular uppercase px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        {
                                            posts.filter(
                                                (p) => p.status === "resolved",
                                            ).length
                                        }{" "}
                                        Verified & Returned
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() =>
                                            setShowCampusRadarMap(
                                                !showCampusRadarMap,
                                            )
                                        }
                                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 border border-white/10 transition cursor-pointer"
                                    >
                                        {showCampusRadarMap
                                            ? "Hide Campus Radar Map"
                                            : "Show Campus Radar Map"}
                                    </button>
                                    <button
                                        onClick={() => {
                                            const reset =
                                                apiService.resetDemoData();
                                            setPosts(reset.posts);
                                            setItems(reset.items);
                                            setMessages(reset.messages);
                                        }}
                                        title="Reset demo data to default state"
                                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition cursor-pointer"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {showCampusRadarMap && (
                                <CampusMap
                                    posts={filteredPosts}
                                    onSelectPost={(post) => {
                                        const el = document.getElementById(
                                            post.id,
                                        );
                                        if (el)
                                            el.scrollIntoView({
                                                behavior: "smooth",
                                                block: "center",
                                            });
                                    }}
                                    heightClass="h-64"
                                />
                            )}
                        </div>

                        {/* Multi-Dimensional Filtering Bar */}
                        <div className="radar-card rounded-2xl p-4 space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                {/* Search input */}
                                <div className="md:col-span-4 relative">
                                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) =>
                                            setSearchQuery(e.target.value)
                                        }
                                        placeholder="Search item, room #, brand, or custody office..."
                                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-radar-bg border border-white/10 text-xs text-white focus:border-blue-500 outline-none"
                                    />
                                </div>

                                {/* Post Type Filter */}
                                <div className="md:col-span-2">
                                    <select
                                        aria-label="Filter by post type"
                                        value={postTypeFilter}
                                        onChange={(e) =>
                                            setPostTypeFilter(
                                                e.target.value as
                                                    | "all"
                                                    | "lost"
                                                    | "found"
                                                    | "resolved",
                                            )
                                        }
                                        className="w-full px-3 py-2 rounded-xl bg-radar-bg border border-white/10 text-xs text-white"
                                    >
                                        <option value="all">
                                            All Post Types
                                        </option>
                                        <option value="lost">
                                            Lost Items (Looking For)
                                        </option>
                                        <option value="found">
                                            Found Items (Turned In)
                                        </option>
                                        <option value="resolved">
                                            Resolved / Returned
                                        </option>
                                    </select>
                                </div>

                                {/* Poster / Custody Role Filter */}
                                <div className="md:col-span-2">
                                    <select
                                        aria-label="Filter by poster role"
                                        value={roleFilter}
                                        onChange={(e) =>
                                            setRoleFilter(
                                                e.target.value as
                                                    | "all"
                                                    | CampusRole,
                                            )
                                        }
                                        className="w-full px-3 py-2 rounded-xl bg-radar-bg border border-white/10 text-xs text-white"
                                    >
                                        <option value="all">
                                            All Custody Roles
                                        </option>
                                        <option value="staff">
                                            Official Staff / Office Custody
                                        </option>
                                        <option value="faculty">
                                            Faculty / Teachers
                                        </option>
                                        <option value="student">
                                            Students
                                        </option>
                                    </select>
                                </div>

                                {/* Campus Zone / Drop-off Hub Filter */}
                                <div className="md:col-span-2">
                                    <select
                                        aria-label="Filter by campus zone"
                                        value={hubFilter}
                                        onChange={(e) =>
                                            setHubFilter(
                                                e.target.value as
                                                    | "all"
                                                    | CampusHubName,
                                            )
                                        }
                                        className="w-full px-3 py-2 rounded-xl bg-radar-bg border border-white/10 text-xs text-white"
                                    >
                                        <option value="all">
                                            All Campus Hubs
                                        </option>
                                        {CAMPUS_HUBS.map((h) => (
                                            <option key={h.name} value={h.name}>
                                                {h.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Item Category Filter */}
                                <div className="md:col-span-2">
                                    <select
                                        aria-label="Filter by item category"
                                        value={categoryFilter}
                                        onChange={(e) =>
                                            setCategoryFilter(
                                                e.target.value as
                                                    | "all"
                                                    | ItemCategory,
                                            )
                                        }
                                        className="w-full px-3 py-2 rounded-xl bg-radar-bg border border-white/10 text-xs text-white"
                                    >
                                        <option value="all">
                                            All Categories
                                        </option>
                                        {ITEM_CATEGORIES.map((c) => (
                                            <option key={c} value={c}>
                                                {c}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Quick Filter Pills */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-slate-400 flex items-center gap-1 mr-1">
                                        <Filter className="w-3 h-3" /> Quick
                                        Custody Filter:
                                    </span>
                                    <button
                                        onClick={() =>
                                            setRoleFilter(
                                                roleFilter === "staff"
                                                    ? "all"
                                                    : "staff",
                                            )
                                        }
                                        className={`px-2.5 py-1 rounded-full font-medium transition cursor-pointer ${
                                            roleFilter === "staff"
                                                ? "bg-blue-600 text-white"
                                                : "bg-white/5 text-slate-300 hover:bg-white/10"
                                        }`}
                                    >
                                        Held by Official School Office
                                    </button>
                                    <button
                                        onClick={() =>
                                            setHubFilter(
                                                hubFilter ===
                                                    "Main Gate / Guard House"
                                                    ? "all"
                                                    : "Main Gate / Guard House",
                                            )
                                        }
                                        className={`px-2.5 py-1 rounded-full font-medium transition cursor-pointer ${
                                            hubFilter ===
                                            "Main Gate / Guard House"
                                                ? "bg-blue-600 text-white"
                                                : "bg-white/5 text-slate-300 hover:bg-white/10"
                                        }`}
                                    >
                                        Main Gate Guard House
                                    </button>
                                    <button
                                        onClick={() =>
                                            setHubFilter(
                                                hubFilter === "Guidance Office"
                                                    ? "all"
                                                    : "Guidance Office",
                                            )
                                        }
                                        className={`px-2.5 py-1 rounded-full font-medium transition cursor-pointer ${
                                            hubFilter === "Guidance Office"
                                                ? "bg-blue-600 text-white"
                                                : "bg-white/5 text-slate-300 hover:bg-white/10"
                                        }`}
                                    >
                                        Guidance Office
                                    </button>
                                </div>

                                <span className="font-mono-tabular text-slate-400">
                                    Showing {filteredPosts.length} of{" "}
                                    {posts.length} posts
                                </span>
                            </div>
                        </div>

                        {/* Community Wall Post Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            {filteredPosts.map((post) => {
                                const isLost = post.post_type === "lost";
                                const isResolved = post.status === "resolved";
                                const hasApprovedClaim = post.claims.some(
                                    (c) => c.status === "approved",
                                );
                                const requiresVerification =
                                    post.post_type === "found" &&
                                    Boolean(post.verification_question) &&
                                    !hasApprovedClaim &&
                                    !isResolved;

                                return (
                                    <article
                                        id={post.id}
                                        key={post.id}
                                        className={`radar-card rounded-2xl p-5 flex flex-col justify-between space-y-4 transition ${
                                            isResolved
                                                ? "opacity-80 border-emerald-500/30"
                                                : isLost
                                                  ? "border-red-500/30"
                                                  : "border-amber-500/30"
                                        }`}
                                    >
                                        <div className="space-y-3">
                                            {/* Top Status & Role Badges */}
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span
                                                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono-tabular font-bold uppercase ${
                                                            isResolved
                                                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                                                : isLost
                                                                  ? "bg-red-500/20 text-red-300 border border-red-500/30"
                                                                  : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                                        }`}
                                                    >
                                                        {!isResolved && (
                                                            <span
                                                                className={`w-2 h-2 rounded-full ${
                                                                    isLost
                                                                        ? "bg-red-400 animate-ping"
                                                                        : "bg-amber-400"
                                                                }`}
                                                            />
                                                        )}
                                                        {isResolved
                                                            ? "VERIFIED & RETURNED"
                                                            : isLost
                                                              ? "MISSING / LOST ALERT"
                                                              : "FOUND ON CAMPUS"}
                                                    </span>

                                                    <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] font-mono-tabular text-slate-300">
                                                        {post.category}
                                                    </span>
                                                </div>

                                                <span className="font-mono-tabular text-[11px] text-slate-400">
                                                    {post.created_at}
                                                </span>
                                            </div>

                                            {/* Headline & Description */}
                                            <div>
                                                <h3 className="text-base font-bold text-white leading-snug">
                                                    {post.title}
                                                </h3>
                                                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                                                    {post.description}
                                                </p>
                                            </div>

                                            {/* Poster / Custody Metadata */}
                                            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-radar-bg/70 border border-white/5 text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className={`font-mono-tabular text-[10px] uppercase px-2 py-0.5 rounded font-bold ${
                                                            post.poster_role ===
                                                            "staff"
                                                                ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                                                : post.poster_role ===
                                                                    "faculty"
                                                                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                                                  : "bg-white/10 text-slate-300"
                                                        }`}
                                                    >
                                                        {post.poster_role ===
                                                        "staff"
                                                            ? "OFFICIAL OFFICE CUSTODY"
                                                            : post.poster_role.toUpperCase()}
                                                    </span>
                                                    <span className="font-semibold text-white">
                                                        {post.poster_name}
                                                    </span>
                                                    {post.poster_dept && (
                                                        <span className="text-slate-400 text-[11px]">
                                                            ({post.poster_dept})
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-1 text-[11px] text-blue-400 font-medium">
                                                    {post.poster_role ===
                                                    "staff" ? (
                                                        <Building2 className="w-3.5 h-3.5" />
                                                    ) : (
                                                        <MapPin className="w-3.5 h-3.5" />
                                                    )}
                                                    {post.campus_hub}
                                                </div>
                                            </div>

                                            {/* Ownership Verification Challenge Box (For Found Items) */}
                                            {post.post_type === "found" &&
                                                post.verification_question && (
                                                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                        <div className="space-y-0.5">
                                                            <div className="text-[10px] font-mono-tabular uppercase text-amber-300 font-bold flex items-center gap-1">
                                                                <ShieldCheck className="w-3.5 h-3.5" />{" "}
                                                                Ownership
                                                                Verification
                                                                Required to
                                                                Claim
                                                            </div>
                                                            <p className="text-xs text-white font-medium">
                                                                "
                                                                {
                                                                    post.verification_question
                                                                }
                                                                "
                                                            </p>
                                                        </div>

                                                        <button
                                                            onClick={() =>
                                                                setActiveClaimPostId(
                                                                    post.id,
                                                                )
                                                            }
                                                            className="shrink-0 px-3.5 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition cursor-pointer"
                                                        >
                                                            Claim & Verify (
                                                            {post.claims.length}
                                                            )
                                                        </button>
                                                    </div>
                                                )}

                                            {/* Configurable Contact Matrix & Conditional Map Pin */}
                                            <ContactMatrix
                                                contactConfig={
                                                    post.contact_config
                                                }
                                                campusHub={post.campus_hub}
                                                roomDetail={post.room_detail}
                                                lat={post.lat}
                                                lng={post.lng}
                                                isLockedForVerification={
                                                    requiresVerification
                                                }
                                                onOpenInAppChat={() =>
                                                    setChatTarget({
                                                        title: post.title,
                                                        postId: post.id,
                                                    })
                                                }
                                                compact
                                            />
                                        </div>

                                        {/* Footer Post Management Controls */}
                                        <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                                            <div className="flex items-center gap-2">
                                                {post.linked_item_id && (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-mono-tabular text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                                                        <Sparkles className="w-3 h-3" />{" "}
                                                        Linked to Registered QR
                                                        Sticker
                                                    </span>
                                                )}
                                                {post.is_anonymous && (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-mono-tabular text-amber-300/90">
                                                        <KeyRound className="w-3 h-3" />{" "}
                                                        Passcode Protected
                                                    </span>
                                                )}
                                            </div>

                                            {!isResolved && (
                                                <div className="flex items-center gap-2">
                                                    {passcodePromptPostId ===
                                                    post.id ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <input
                                                                type="text"
                                                                value={
                                                                    passcodeInput
                                                                }
                                                                onChange={(e) =>
                                                                    setPasscodeInput(
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                placeholder="Passcode (e.g. PASS-7741)"
                                                                className="px-2.5 py-1 rounded bg-radar-bg border border-white/20 text-xs text-white font-mono-tabular w-36"
                                                            />
                                                            <button
                                                                onClick={() =>
                                                                    handleConfirmPasscodeResolve(
                                                                        post.id,
                                                                    )
                                                                }
                                                                className="px-2.5 py-1 rounded bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                                                            >
                                                                Unlock
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() =>
                                                                handleResolvePost(
                                                                    post,
                                                                )
                                                            }
                                                            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-emerald-400 transition cursor-pointer"
                                                        >
                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                            Mark as Resolved /
                                                            Returned
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </article>
                                );
                            })}
                        </div>

                        {filteredPosts.length === 0 && (
                            <div className="radar-card rounded-2xl p-12 text-center space-y-3">
                                <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
                                <h3 className="text-base font-bold text-white">
                                    No Campus Wall Posts Match Your Current
                                    Filters
                                </h3>
                                <p className="text-xs text-slate-400 max-w-md mx-auto">
                                    Try clearing your search query or switching
                                    the Campus Zone and Custody Role filters
                                    back to "All".
                                </p>
                            </div>
                        )}
                    </>
                )}

                {activeTab === "qr-studio" && (
                    <QrStickerStudio
                        items={items}
                        currentUser={currentUser}
                        onRegisterItem={handleRegisterItem}
                        onToggleLostMode={handleToggleLostMode}
                        onSimulateScan={(item) => {
                            setSimulatedScanItem(item);
                            setActiveTab("scan-sim");
                        }}
                    />
                )}

                {activeTab === "scan-sim" && (
                    <QrScanSimulator
                        items={items}
                        selectedItem={simulatedScanItem}
                        onSelectItem={setSimulatedScanItem}
                        onPingItemLocation={handlePingItemLocation}
                        onOpenChatForItem={(item) =>
                            setChatTarget({
                                title: `QR Scan Chat: ${item.name} (${item.tag_code})`,
                                itemId: item.id,
                            })
                        }
                    />
                )}
            </main>

            {/* Modals & Drawers */}
            <PostModal
                isOpen={isPostModalOpen}
                onClose={() => setIsPostModalOpen(false)}
                currentUser={currentUser}
                onCreatePost={handleCreatePost}
            />

            <ClaimVerifyDrawer
                post={activeClaimPost}
                onClose={() => setActiveClaimPostId(null)}
                currentUser={currentUser}
                onSubmitClaim={handleSubmitClaim}
                onReviewClaim={handleReviewClaim}
            />

            <ChatDrawer
                isOpen={Boolean(chatTarget)}
                onClose={() => setChatTarget(null)}
                targetTitle={chatTarget?.title || ""}
                postId={chatTarget?.postId}
                itemId={chatTarget?.itemId}
                messages={activeChatMessages}
                currentUser={currentUser}
                onSendMessage={handleSendMessage}
            />
        </div>
    );
}

export default App;
