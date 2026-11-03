import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
    Printer,
    Plus,
    Radio,
    ShieldCheck,
    Smartphone,
    QrCode,
    Tag,
    Scissors,
} from "lucide-react";
import type {
    CampusHubName,
    ItemCategory,
    RegisteredItem,
    StickerFormat,
    UserProfile,
} from "../types";
import { CAMPUS_HUBS, ITEM_CATEGORIES } from "../data/hubs";

interface QrStickerStudioProps {
    items: RegisteredItem[];
    currentUser: UserProfile;
    onRegisterItem: (item: RegisteredItem) => void;
    onToggleLostMode: (item: RegisteredItem) => void;
    onSimulateScan: (item: RegisteredItem) => void;
}

export const QrStickerStudio: React.FC<QrStickerStudioProps> = ({
    items,
    currentUser,
    onRegisterItem,
    onToggleLostMode,
    onSimulateScan,
}) => {
    const [stickerFormat, setStickerFormat] =
        useState<StickerFormat>("standard-square");
    const [showNewForm, setShowNewForm] = useState(false);

    const [name, setName] = useState("");
    const [category, setCategory] = useState<ItemCategory>("Calculators");
    const [customNote, setCustomNote] = useState(
        "If found on campus, please drop off at the SSG Office or message me on Messenger!",
    );
    const [meetupHub, setMeetupHub] = useState<CampusHubName>(
        "SSG / Student Council Office",
    );
    const [meetupRoom, setMeetupRoom] = useState("STEM Building Room 304");
    const [fbMessenger, setFbMessenger] = useState(
        "https://m.me/iandelacruz.stem",
    );
    const [smsNumber, setSmsNumber] = useState("+639175550192");

    const handleCreateGear = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        const hubPreset =
            CAMPUS_HUBS.find((h) => h.name === meetupHub) || CAMPUS_HUBS[0];
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const newItem: RegisteredItem = {
            id: `item-${Date.now()}`,
            user_id: currentUser.id,
            owner_name: currentUser.name,
            owner_role: currentUser.role,
            owner_dept: currentUser.department_or_section,
            tag_code: `CR-${randomSuffix}`,
            name: name.trim(),
            category,
            status: "safe",
            custom_note: customNote.trim(),
            contact_config: {
                enableInAppChat: true,
                fbMessenger: fbMessenger.trim() || undefined,
                smsNumber: smsNumber.trim() || undefined,
                showMapPin: true,
            },
            meetup_hub: meetupHub,
            meetup_room: meetupRoom.trim(),
            lat: hubPreset.lat,
            lng: hubPreset.lng,
            created_at: new Date().toISOString(),
        };
        onRegisterItem(newItem);
        setName("");
        setShowNewForm(false);
    };

    return (
        <div className="space-y-8">
            {/* Top Studio Controls (Hidden when printing) */}
            <div className="no-print radar-card rounded-2xl p-6 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono-tabular uppercase px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
                            <QrCode className="w-3.5 h-3.5" />{" "}
                            High-Error-Correction Physical Gear Tags (Level H)
                        </span>
                        <h2 className="text-xl font-bold text-white mt-2">
                            Student QR Locker & DIY Sticker Print Studio
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Register your tumblers, calculators, and IDs. Toggle
                            1-Click Lost Mode to automatically broadcast to the
                            Campus Wall.
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <button
                            onClick={() => setShowNewForm(!showNewForm)}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/15 transition cursor-pointer"
                        >
                            <Plus className="w-4 h-4" />
                            Register New Campus Gear
                        </button>
                        <button
                            onClick={() => window.print()}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-radar-blue hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition cursor-pointer"
                        >
                            <Printer className="w-4 h-4" />
                            Print Sticker Sheet (A4 / Letter)
                        </button>
                    </div>
                </div>

                {/* Add New Registered Gear Form */}
                {showNewForm && (
                    <form
                        onSubmit={handleCreateGear}
                        className="p-5 rounded-xl bg-radar-bg border border-blue-500/30 space-y-4"
                    >
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <Tag className="w-4 h-4 text-blue-400" /> Register
                            Belonging & Generate QR Tag
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="sm:col-span-2">
                                <label className="block text-[11px] text-slate-400 mb-1">
                                    Item Name & Color/Model *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g., HydroFlask 32oz Cobalt Blue / Casio ClassWiz"
                                    className="w-full px-3 py-2 rounded-lg bg-radar-card border border-white/10 text-xs text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] text-slate-400 mb-1">
                                    Category
                                </label>
                                <select
                                    value={category}
                                    onChange={(e) =>
                                        setCategory(
                                            e.target.value as ItemCategory,
                                        )
                                    }
                                    className="w-full px-3 py-2 rounded-lg bg-radar-card border border-white/10 text-xs text-white"
                                >
                                    {ITEM_CATEGORIES.map((c) => (
                                        <option key={c} value={c}>
                                            {c}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[11px] text-slate-400 mb-1">
                                    Preferred Campus Drop-Off Hub
                                </label>
                                <select
                                    value={meetupHub}
                                    onChange={(e) =>
                                        setMeetupHub(
                                            e.target.value as CampusHubName,
                                        )
                                    }
                                    className="w-full px-3 py-2 rounded-lg bg-radar-card border border-white/10 text-xs text-white"
                                >
                                    {CAMPUS_HUBS.map((h) => (
                                        <option key={h.name} value={h.name}>
                                            {h.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] text-slate-400 mb-1">
                                    Homeroom / Meetup Room Detail
                                </label>
                                <input
                                    type="text"
                                    value={meetupRoom}
                                    onChange={(e) =>
                                        setMeetupRoom(e.target.value)
                                    }
                                    className="w-full px-3 py-2 rounded-lg bg-radar-card border border-white/10 text-xs text-white"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="sm:col-span-1">
                                <label className="block text-[11px] text-slate-400 mb-1">
                                    FB Messenger Link
                                </label>
                                <input
                                    type="text"
                                    value={fbMessenger}
                                    onChange={(e) =>
                                        setFbMessenger(e.target.value)
                                    }
                                    className="w-full px-3 py-2 rounded-lg bg-radar-card border border-white/10 text-xs text-white"
                                />
                            </div>
                            <div className="sm:col-span-1">
                                <label className="block text-[11px] text-slate-400 mb-1">
                                    SMS Contact
                                </label>
                                <input
                                    type="text"
                                    value={smsNumber}
                                    onChange={(e) =>
                                        setSmsNumber(e.target.value)
                                    }
                                    className="w-full px-3 py-2 rounded-lg bg-radar-card border border-white/10 text-xs text-white"
                                />
                            </div>
                            <div className="sm:col-span-1">
                                <label className="block text-[11px] text-slate-400 mb-1">
                                    Note Displayed When Scanned
                                </label>
                                <input
                                    type="text"
                                    value={customNote}
                                    onChange={(e) =>
                                        setCustomNote(e.target.value)
                                    }
                                    className="w-full px-3 py-2 rounded-lg bg-radar-card border border-white/10 text-xs text-white"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setShowNewForm(false)}
                                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
                            >
                                Save & Generate QR Sticker
                            </button>
                        </div>
                    </form>
                )}

                {/* Registered Gear List with 1-Click Lost Mode Escalation */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {items.map((item) => {
                        const isLost = item.status === "lost";
                        return (
                            <div
                                key={item.id}
                                className={`p-4 rounded-xl border transition flex flex-col justify-between space-y-4 ${
                                    isLost
                                        ? "bg-red-500/10 border-red-500/40"
                                        : "bg-radar-bg border-white/10 hover:border-white/20"
                                }`}
                            >
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono-tabular text-xs font-bold px-2 py-0.5 rounded bg-white/5 text-blue-400 border border-white/10">
                                            {item.tag_code}
                                        </span>
                                        <span
                                            className={`inline-flex items-center gap-1 text-[11px] font-mono-tabular font-semibold px-2 py-0.5 rounded-full ${
                                                isLost
                                                    ? "bg-red-500/20 text-red-300 border border-red-500/30"
                                                    : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                            }`}
                                        >
                                            {isLost ? (
                                                <>
                                                    <Radio className="w-3 h-3 animate-pulse" />{" "}
                                                    LOST MODE ACTIVE
                                                </>
                                            ) : (
                                                <>
                                                    <ShieldCheck className="w-3 h-3" />{" "}
                                                    SAFE IN LOCKER
                                                </>
                                            )}
                                        </span>
                                    </div>

                                    <h3 className="text-sm font-bold text-white">
                                        {item.name}
                                    </h3>
                                    <p className="text-xs text-slate-400 line-clamp-2">
                                        {item.custom_note}
                                    </p>

                                    {item.last_ping_location && (
                                        <div className="text-[11px] font-mono-tabular text-slate-300 bg-white/5 px-2.5 py-1.5 rounded-lg">
                                            Last Radar Ping:{" "}
                                            <span className="text-blue-400">
                                                {item.last_ping_location}
                                            </span>{" "}
                                            ({item.last_ping_time})
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                                    <button
                                        onClick={() => onToggleLostMode(item)}
                                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                                            isLost
                                                ? "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30"
                                                : "bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30"
                                        }`}
                                    >
                                        {isLost
                                            ? "Mark Found & Safe"
                                            : "1-Click Lost Mode Alert"}
                                    </button>
                                    <button
                                        onClick={() => onSimulateScan(item)}
                                        title="Preview Mobile QR Scan Screen"
                                        className="p-2 rounded-lg bg-white/5 hover:bg-white/15 text-slate-200 border border-white/10 transition cursor-pointer"
                                    >
                                        <Smartphone className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Physical Printable Sticker Sheet Customizer & Preview */}
            <div className="radar-card rounded-2xl p-6 space-y-5 print-only-sheet">
                <div className="no-print flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                    <div className="flex items-center gap-2">
                        <Scissors className="w-4 h-4 text-blue-400" />
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono-tabular">
                            Physical Sticker Cut-Guide Template Preview
                        </h3>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setStickerFormat("micro-strip")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-mono-tabular transition cursor-pointer ${
                                stickerFormat === "micro-strip"
                                    ? "bg-blue-600 text-white font-bold"
                                    : "bg-radar-bg text-slate-400 border border-white/10"
                            }`}
                        >
                            Micro Pen/Calculator Strip (35×15mm)
                        </button>
                        <button
                            type="button"
                            onClick={() => setStickerFormat("standard-square")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-mono-tabular transition cursor-pointer ${
                                stickerFormat === "standard-square"
                                    ? "bg-blue-600 text-white font-bold"
                                    : "bg-radar-bg text-slate-400 border border-white/10"
                            }`}
                        >
                            Standard Tumbler/Gadget Badge (45×45mm)
                        </button>
                        <button
                            type="button"
                            onClick={() => setStickerFormat("id-card-back")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-mono-tabular transition cursor-pointer ${
                                stickerFormat === "id-card-back"
                                    ? "bg-blue-600 text-white font-bold"
                                    : "bg-radar-bg text-slate-400 border border-white/10"
                            }`}
                        >
                            ID Card Back Tag (54×85mm)
                        </button>
                    </div>
                </div>

                {/* Printable Sticker Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
                    {items.map((item) => {
                        const scanUrl = `${window.location.origin}/?scan=${item.tag_code}`;

                        if (stickerFormat === "micro-strip") {
                            return (
                                <div
                                    key={item.id}
                                    className="sticker-cut-guide bg-white text-slate-950 rounded-lg p-2.5 border-2 border-dashed border-slate-400 flex items-center gap-3 max-w-65"
                                >
                                    <QRCodeSVG
                                        value={scanUrl}
                                        size={46}
                                        level="H"
                                        includeMargin={false}
                                    />
                                    <div className="min-w-0">
                                        <div className="font-mono-tabular text-[10px] font-extrabold uppercase tracking-tight text-slate-900">
                                            SCAN IF FOUND • {item.tag_code}
                                        </div>
                                        <div className="text-[11px] font-bold truncate text-slate-900">
                                            {item.name}
                                        </div>
                                        <div className="text-[9px] font-mono-tabular text-slate-600 truncate">
                                            Drop: {item.meetup_hub}
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        if (stickerFormat === "id-card-back") {
                            return (
                                <div
                                    key={item.id}
                                    className="sticker-cut-guide bg-white text-slate-950 rounded-xl p-4 border-2 border-dashed border-slate-400 flex flex-col items-center text-center space-y-2.5 max-w-57.5 mx-auto"
                                >
                                    <div className="w-full py-1 bg-slate-900 text-white font-mono-tabular text-[10px] font-bold uppercase tracking-widest rounded">
                                        CAMPUSRADAR RETURN TAG
                                    </div>
                                    <QRCodeSVG
                                        value={scanUrl}
                                        size={120}
                                        level="H"
                                        includeMargin={false}
                                    />
                                    <div className="font-mono-tabular text-xs font-extrabold text-slate-900">
                                        {item.tag_code}
                                    </div>
                                    <div className="text-xs font-bold text-slate-900 line-clamp-1">
                                        {item.name}
                                    </div>
                                    <div className="text-[10px] text-slate-700 leading-tight">
                                        Owner:{" "}
                                        <strong>{item.owner_name}</strong> (
                                        {item.owner_dept})
                                    </div>
                                    <div className="w-full pt-1 border-t border-slate-300 text-[9px] font-mono-tabular text-slate-600">
                                        Drop Off: {item.meetup_hub}
                                    </div>
                                </div>
                            );
                        }

                        // Default: Standard Square Tumbler/Gadget Badge (45x45mm)
                        return (
                            <div
                                key={item.id}
                                className="sticker-cut-guide bg-white text-slate-950 rounded-xl p-3.5 border-2 border-dashed border-slate-400 flex items-center gap-3.5"
                            >
                                <div className="p-1.5 bg-white border border-slate-200 rounded-lg shrink-0">
                                    <QRCodeSVG
                                        value={scanUrl}
                                        size={78}
                                        level="H"
                                        includeMargin={false}
                                    />
                                </div>
                                <div className="space-y-1 min-w-0">
                                    <span className="inline-block px-1.5 py-0.5 rounded bg-slate-900 text-white font-mono-tabular text-[9px] font-bold uppercase">
                                        SCAN TO RETURN • {item.tag_code}
                                    </span>
                                    <div className="text-xs font-extrabold text-slate-900 truncate">
                                        {item.name}
                                    </div>
                                    <div className="text-[10px] text-slate-700 font-medium truncate">
                                        {item.owner_name} • {item.owner_dept}
                                    </div>
                                    <div className="text-[10px] font-mono-tabular text-slate-600 truncate">
                                        Hub: {item.meetup_hub}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
