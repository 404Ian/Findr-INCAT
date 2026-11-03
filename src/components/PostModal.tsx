import React, { useState } from "react";
import {
    X,
    ShieldAlert,
    EyeOff,
    Sparkles,
    MapPin,
    CheckCircle2,
    KeyRound,
    Building2,
} from "lucide-react";
import type {
    CampusHubName,
    CampusRole,
    ItemCategory,
    PostType,
    UserProfile,
    WallPost,
} from "../types";
import { CAMPUS_HUBS, ITEM_CATEGORIES } from "../data/hubs";
import { CampusMap } from "./CampusMap";

interface PostModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: UserProfile;
    onCreatePost: (post: WallPost) => void;
}

export const PostModal: React.FC<PostModalProps> = ({
    isOpen,
    onClose,
    currentUser,
    onCreatePost,
}) => {
    const [postType, setPostType] = useState<PostType>("lost");
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [posterName, setPosterName] = useState(currentUser.name);
    const [posterRole, setPosterRole] = useState<CampusRole>(currentUser.role);
    const [posterDept, setPosterDept] = useState(
        currentUser.department_or_section,
    );

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState<ItemCategory>("Tumblers & Flasks");
    const [campusHub, setCampusHub] = useState<CampusHubName>(
        "Main Gate / Guard House",
    );
    const [roomDetail, setRoomDetail] = useState("Main Gate Security Logbook");
    const [lat, setLat] = useState(CAMPUS_HUBS[0].lat);
    const [lng, setLng] = useState(CAMPUS_HUBS[0].lng);

    // Anti-Theft Ownership Verification Challenge (for Found posts)
    const [verificationQuestion, setVerificationQuestion] = useState(
        "What identifying sticker, keychain, or name is written inside this item?",
    );
    const [sensitivePickupNote, setSensitivePickupNote] = useState(
        "Present your School ID at the desk and reference this CampusRadar post.",
    );

    // Configurable Contact Channels
    const [enableInAppChat, setEnableInAppChat] = useState(true);
    const [fbMessenger, setFbMessenger] = useState(
        "https://m.me/campus.student",
    );
    const [whatsApp, setWhatsApp] = useState("");
    const [smsNumber, setSmsNumber] = useState("+639175550192");
    const [phoneCall, ] = useState("");
    const [email, setEmail] = useState("");
    const [showMapPin, setShowMapPin] = useState(true);

    const [generatedPasscode, setGeneratedPasscode] = useState<string | null>(
        null,
    );

    if (!isOpen) return null;

    const handleSelectHub = (hubName: CampusHubName) => {
        setCampusHub(hubName);
        const preset = CAMPUS_HUBS.find((h) => h.name === hubName);
        if (preset) {
            setLat(preset.lat);
            setLng(preset.lng);
            setRoomDetail(preset.handoverInstructions);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const editPasscode = isAnonymous
            ? `PASS-${Math.floor(1000 + Math.random() * 9000)}`
            : undefined;

        const newPost: WallPost = {
            id: `post-${Date.now().toString().slice(-5)}`,
            user_id: isAnonymous ? null : currentUser.id,
            is_anonymous: isAnonymous,
            poster_name: isAnonymous
                ? "Anonymous Student / Onlooker"
                : posterName,
            poster_role: posterRole,
            poster_dept: isAnonymous ? "Anonymous Campus Tip" : posterDept,
            edit_passcode: editPasscode,
            post_type: postType,
            title:
                title.trim() ||
                `${postType === "lost" ? "Lost" : "Found"} ${category}`,
            description: description.trim(),
            category,
            campus_hub: campusHub,
            room_detail: roomDetail,
            lat,
            lng,
            verification_question:
                postType === "found" && verificationQuestion.trim()
                    ? verificationQuestion.trim()
                    : null,
            sensitive_pickup_note:
                postType === "found" && sensitivePickupNote.trim()
                    ? sensitivePickupNote.trim()
                    : null,
            contact_config: {
                enableInAppChat,
                fbMessenger: fbMessenger.trim() || undefined,
                whatsApp: whatsApp.trim() || undefined,
                smsNumber: smsNumber.trim() || undefined,
                phoneCall: phoneCall.trim() || undefined,
                email: email.trim() || undefined,
                showMapPin,
            },
            status: "open",
            created_at: "Just now",
            claims: [],
        };

        onCreatePost(newPost);

        if (editPasscode) {
            setGeneratedPasscode(editPasscode);
        } else {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <div className="radar-card w-full max-w-3xl rounded-2xl overflow-hidden my-8 border border-white/15">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-radar-elevated">
                    <div className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
                        <h2 className="text-lg font-bold text-white">
                            Broadcast to Campus Lost & Found Wall
                        </h2>
                    </div>
                    <button
                        onClick={() => {
                            setGeneratedPasscode(null);
                            onClose();
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {generatedPasscode ? (
                    <div className="p-8 text-center space-y-4">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                            <KeyRound className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl font-bold text-white">
                            Anonymous Post Live on Campus Wall!
                        </h3>
                        <p className="text-sm text-slate-300 max-w-md mx-auto">
                            Your identity is masked on the public wall as{" "}
                            <span className="text-white font-semibold">
                                "Anonymous Student / Onlooker"
                            </span>
                            . Save this one-time **Post Management Passcode** so
                            you can mark it resolved later:
                        </p>
                        <div className="inline-block font-mono-tabular text-2xl font-bold tracking-widest px-6 py-3 rounded-xl bg-radar-bg border border-emerald-500/40 text-emerald-400">
                            {generatedPasscode}
                        </div>
                        <div className="pt-3">
                            <button
                                onClick={() => {
                                    setGeneratedPasscode(null);
                                    onClose();
                                }}
                                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition"
                            >
                                Done & Return to Wall
                            </button>
                        </div>
                    </div>
                ) : (
                    <form
                        onSubmit={handleSubmit}
                        className="p-6 space-y-6 max-h-[82vh] overflow-y-auto"
                    >
                        {/* 1. Post Type Selector */}
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setPostType("lost")}
                                className={`p-3.5 rounded-xl border text-left transition flex items-center justify-between ${
                                    postType === "lost"
                                        ? "bg-red-500/15 border-red-500/50 text-white"
                                        : "bg-radar-bg/60 border-white/10 text-slate-400 hover:text-white"
                                }`}
                            >
                                <div>
                                    <div className="text-xs font-mono-tabular uppercase text-red-400 font-semibold">
                                        Missing Gear Alert
                                    </div>
                                    <div className="text-sm font-bold mt-0.5">
                                        I Lost Something on Campus
                                    </div>
                                </div>
                                <span className="w-3 h-3 rounded-full bg-red-500" />
                            </button>

                            <button
                                type="button"
                                onClick={() => setPostType("found")}
                                className={`p-3.5 rounded-xl border text-left transition flex items-center justify-between ${
                                    postType === "found"
                                        ? "bg-amber-500/15 border-amber-500/50 text-white"
                                        : "bg-radar-bg/60 border-white/10 text-slate-400 hover:text-white"
                                }`}
                            >
                                <div>
                                    <div className="text-xs font-mono-tabular uppercase text-amber-400 font-semibold">
                                        Found / Custody Report
                                    </div>
                                    <div className="text-sm font-bold mt-0.5">
                                        I Found or Turned In an Item
                                    </div>
                                </div>
                                <span className="w-3 h-3 rounded-full bg-amber-400" />
                            </button>
                        </div>

                        {/* 2. Identity & One-Click Anonymous Mode */}
                        <div className="p-4 rounded-xl bg-radar-bg/90 border border-white/10 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-blue-400" />
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                                        Poster Identity & Custody Role
                                    </span>
                                </div>
                                <label className="inline-flex items-center gap-2 cursor-pointer select-none bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                                    <input
                                        type="checkbox"
                                        checked={isAnonymous}
                                        onChange={(e) =>
                                            setIsAnonymous(e.target.checked)
                                        }
                                        className="accent-blue-500 rounded"
                                    />
                                    <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                                    <span className="text-xs font-semibold text-white">
                                        Post Anonymously (Generates Edit
                                        Passcode)
                                    </span>
                                </label>
                            </div>

                            {!isAnonymous ? (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                                    <div>
                                        <label className="block text-[11px] text-slate-400 mb-1">
                                            Full Name
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={posterName}
                                            onChange={(e) =>
                                                setPosterName(e.target.value)
                                            }
                                            className="w-full px-3 py-2 rounded-lg bg-radar-card border border-white/10 text-xs text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] text-slate-400 mb-1">
                                            Campus Role
                                        </label>
                                        <select
                                            value={posterRole}
                                            onChange={(e) =>
                                                setPosterRole(
                                                    e.target
                                                        .value as CampusRole,
                                                )
                                            }
                                            className="w-full px-3 py-2 rounded-lg bg-radar-card border border-white/10 text-xs text-white"
                                        >
                                            <option value="student">
                                                Student
                                            </option>
                                            <option value="faculty">
                                                Faculty / Teacher
                                            </option>
                                            <option value="staff">
                                                Staff / Official Office
                                            </option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] text-slate-400 mb-1">
                                            Grade / Section or Office
                                        </label>
                                        <input
                                            type="text"
                                            value={posterDept}
                                            onChange={(e) =>
                                                setPosterDept(e.target.value)
                                            }
                                            placeholder="e.g., Grade 12 STEM-A / Guidance"
                                            className="w-full px-3 py-2 rounded-lg bg-radar-card border border-white/10 text-xs text-white"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <p className="text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-lg">
                                    Your name will be hidden as{" "}
                                    <strong>
                                        "Anonymous Student / Onlooker"
                                    </strong>
                                    . We will generate a private passcode so you
                                    can still manage or close this post.
                                </p>
                            )}
                        </div>

                        {/* 3. Item Details */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-semibold text-slate-300 mb-1">
                                    Headline / Item Summary *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder={
                                        postType === "lost"
                                            ? "e.g., Lost Black Casio fx-991EX Calculator near Canteen"
                                            : "e.g., Found White HydroFlask Turned In to Guard House"
                                    }
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-radar-bg border border-white/10 text-sm text-white focus:border-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">
                                    Item Category
                                </label>
                                <select
                                    value={category}
                                    onChange={(e) =>
                                        setCategory(
                                            e.target.value as ItemCategory,
                                        )
                                    }
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-radar-bg border border-white/10 text-sm text-white"
                                >
                                    {ITEM_CATEGORIES.map((cat) => (
                                        <option key={cat} value={cat}>
                                            {cat}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">
                                Detailed Description & Circumstances *
                            </label>
                            <textarea
                                rows={2}
                                required
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Include color, brand, time last seen or spotted, and where it is currently held..."
                                className="w-full px-3.5 py-2 rounded-xl bg-radar-bg border border-white/10 text-sm text-white focus:border-blue-500 outline-none"
                            />
                        </div>

                        {/* 4. Anti-Theft Ownership Verification (For Found Items) */}
                        {postType === "found" && (
                            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                                <div className="flex items-center gap-2 text-amber-300">
                                    <ShieldAlert className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase tracking-wider">
                                        Anti-Theft Ownership Verification
                                        Challenge
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] text-amber-200/80 mb-1">
                                            Challenge Question for Claimant
                                        </label>
                                        <input
                                            type="text"
                                            value={verificationQuestion}
                                            onChange={(e) =>
                                                setVerificationQuestion(
                                                    e.target.value,
                                                )
                                            }
                                            className="w-full px-3 py-2 rounded-lg bg-radar-bg border border-amber-500/30 text-xs text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] text-amber-200/80 mb-1">
                                            Pickup Reference Unlocked After
                                            Approval
                                        </label>
                                        <input
                                            type="text"
                                            value={sensitivePickupNote}
                                            onChange={(e) =>
                                                setSensitivePickupNote(
                                                    e.target.value,
                                                )
                                            }
                                            className="w-full px-3 py-2 rounded-lg bg-radar-bg border border-amber-500/30 text-xs text-white"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 5. 1-Click Campus Hub Presets & Interactive Map Picker */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5 text-blue-400" />
                                    1-Click Official School Drop-Off Hubs &
                                    Campus Zones
                                </label>
                                <span className="font-mono-tabular text-[11px] text-slate-400">
                                    {lat.toFixed(4)}, {lng.toFixed(4)}
                                </span>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                                {CAMPUS_HUBS.map((hub) => (
                                    <button
                                        key={hub.name}
                                        type="button"
                                        onClick={() =>
                                            handleSelectHub(hub.name)
                                        }
                                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition flex items-center gap-1.5 cursor-pointer ${
                                            campusHub === hub.name
                                                ? "bg-blue-600 text-white border-blue-400"
                                                : "bg-radar-bg text-slate-300 border-white/10 hover:border-white/25"
                                        }`}
                                    >
                                        {hub.isOfficialDropoff && (
                                            <Building2 className="w-3 h-3 text-blue-300" />
                                        )}
                                        {hub.shortLabel}
                                    </button>
                                ))}
                            </div>

                            <div>
                                <label className="block text-[11px] text-slate-400 mb-1">
                                    Specific Room #, Desk, or Handover
                                    Instructions
                                </label>
                                <input
                                    type="text"
                                    value={roomDetail}
                                    onChange={(e) =>
                                        setRoomDetail(e.target.value)
                                    }
                                    placeholder="e.g., Turned in to Guard Bautista / Room 304 Second Row"
                                    className="w-full px-3 py-2 rounded-lg bg-radar-bg border border-white/10 text-xs text-white"
                                />
                            </div>

                            <CampusMap
                                center={[lat, lng]}
                                zoom={17}
                                interactivePicker
                                onSelectCoords={(newLat, newLng) => {
                                    setLat(newLat);
                                    setLng(newLng);
                                }}
                                selectedPin={{
                                    lat,
                                    lng,
                                    label: `${campusHub} • ${roomDetail}`,
                                    color:
                                        postType === "lost"
                                            ? "#EF4444"
                                            : "#F59E0B",
                                }}
                                heightClass="h-48"
                            />
                        </div>

                        {/* 6. Owner-Configurable Contact Matrix */}
                        <div className="p-4 rounded-xl bg-radar-bg/90 border border-white/10 space-y-3">
                            <div className="text-xs font-bold uppercase tracking-wider text-slate-200">
                                Enabled Contact Methods (Only filled/checked
                                channels appear on your post)
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <label className="flex items-center gap-2 text-xs text-slate-200 bg-radar-card p-2.5 rounded-lg border border-white/10">
                                    <input
                                        type="checkbox"
                                        checked={enableInAppChat}
                                        onChange={(e) =>
                                            setEnableInAppChat(e.target.checked)
                                        }
                                        className="accent-blue-500"
                                    />
                                    In-App Campus Chat
                                </label>
                                <label className="flex items-center gap-2 text-xs text-slate-200 bg-radar-card p-2.5 rounded-lg border border-white/10">
                                    <input
                                        type="checkbox"
                                        checked={showMapPin}
                                        onChange={(e) =>
                                            setShowMapPin(e.target.checked)
                                        }
                                        className="accent-blue-500"
                                    />
                                    Show Interactive Map Pin
                                </label>
                                <input
                                    type="text"
                                    value={fbMessenger}
                                    onChange={(e) =>
                                        setFbMessenger(e.target.value)
                                    }
                                    placeholder="FB Messenger URL (m.me/...)"
                                    className="px-3 py-2 rounded-lg bg-radar-card border border-white/10 text-xs text-white"
                                />
                                <input
                                    type="text"
                                    value={smsNumber}
                                    onChange={(e) =>
                                        setSmsNumber(e.target.value)
                                    }
                                    placeholder="SMS Number (+63...)"
                                    className="px-3 py-2 rounded-lg bg-radar-card border border-white/10 text-xs text-white"
                                />
                                <input
                                    type="text"
                                    value={whatsApp}
                                    onChange={(e) =>
                                        setWhatsApp(e.target.value)
                                    }
                                    placeholder="WhatsApp (optional)"
                                    className="px-3 py-2 rounded-lg bg-radar-card border border-white/10 text-xs text-white"
                                />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="School Email (optional)"
                                    className="px-3 py-2 rounded-lg bg-radar-card border border-white/10 text-xs text-white"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-radar-blue hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition cursor-pointer"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                Publish to Campus Wall
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};
