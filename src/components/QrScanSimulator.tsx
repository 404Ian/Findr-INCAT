import React, { useState } from "react";
import {
    Smartphone,
    Radio,
    ShieldCheck,
    Navigation,
    CheckCircle2,
    QrCode,
    User,
} from "lucide-react";
import type { RegisteredItem } from "../types";
import { ContactMatrix } from "./ContactMatrix";
import { CAMPUS_HUBS } from "../data/hubs";

interface QrScanSimulatorProps {
    items: RegisteredItem[];
    selectedItem: RegisteredItem;
    onSelectItem: (item: RegisteredItem) => void;
    onPingItemLocation: (itemId: string, locationLabel: string) => void;
    onOpenChatForItem: (item: RegisteredItem) => void;
}

export const QrScanSimulator: React.FC<QrScanSimulatorProps> = ({
    items,
    selectedItem,
    onSelectItem,
    onPingItemLocation,
    onOpenChatForItem,
}) => {
    const [selectedPingSpot, setSelectedPingSpot] = useState<string>(
        "Main Gate / Guard House — Security Desk",
    );
    const [pingSent, setPingSent] = useState(false);

    const handleSendPing = () => {
        onPingItemLocation(selectedItem.id, selectedPingSpot);
        setPingSent(true);
        setTimeout(() => setPingSent(false), 3500);
    };

    const isLost = selectedItem.status === "lost";

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Tag Selector & How It Works */}
            <div className="lg:col-span-5 space-y-4">
                <div className="radar-card rounded-2xl p-5 space-y-4">
                    <div className="flex items-center gap-2 text-blue-400 text-xs font-mono-tabular uppercase">
                        <QrCode className="w-4 h-4" /> Public Scan Endpoint
                        Simulator (/scan/:tagId)
                    </div>
                    <h2 className="text-lg font-bold text-white">
                        Test What a Finder Sees When Scanning a Student's
                        Sticker
                    </h2>
                    <p className="text-xs text-slate-400 leading-relaxed">
                        Select any registered QR tag below to preview the mobile
                        web screen that opens when a student, teacher, or guard
                        scans the physical sticker with their smartphone camera.
                    </p>

                    <div className="space-y-2 pt-2">
                        {items.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => onSelectItem(item)}
                                className={`w-full p-3 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                                    selectedItem.id === item.id
                                        ? "bg-blue-600/15 border-blue-500 text-white"
                                        : "bg-radar-bg border-white/10 text-slate-300 hover:border-white/25"
                                }`}
                            >
                                <div>
                                    <div className="font-mono-tabular text-xs font-bold text-blue-400">
                                        {item.tag_code}
                                    </div>
                                    <div className="text-xs font-semibold text-white mt-0.5">
                                        {item.name}
                                    </div>
                                </div>
                                <span
                                    className={`text-[10px] font-mono-tabular uppercase px-2 py-0.5 rounded-full font-bold ${
                                        item.status === "lost"
                                            ? "bg-red-500/20 text-red-300"
                                            : "bg-emerald-500/20 text-emerald-300"
                                    }`}
                                >
                                    {item.status}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Column: iPhone / Mobile Viewport Frame */}
            <div className="lg:col-span-7 flex justify-center">
                <div className="w-full max-w-102.5 rounded-[38px] p-3 bg-radar-elevated border-2 border-white/15 shadow-2xl">
                    <div className="rounded-[30px] bg-radar-bg border border-white/10 overflow-hidden">
                        {/* Mobile Top Status Bar */}
                        <div className="px-5 py-3 bg-radar-card border-b border-white/10 flex items-center justify-between text-[11px] font-mono-tabular text-slate-400">
                            <span className="flex items-center gap-1.5 text-white font-semibold">
                                <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                                campusradar.edu/scan/{selectedItem.tag_code}
                            </span>
                            <span className="text-emerald-400">SSL</span>
                        </div>

                        <div className="p-5 space-y-5">
                            {/* Alert Banner */}
                            <div
                                className={`p-4 rounded-2xl border ${
                                    isLost
                                        ? "bg-red-500/15 border-red-500/40"
                                        : "bg-emerald-500/10 border-emerald-500/30"
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span
                                        className={`inline-flex items-center gap-1.5 text-[11px] font-mono-tabular font-bold uppercase ${
                                            isLost
                                                ? "text-red-400"
                                                : "text-emerald-400"
                                        }`}
                                    >
                                        {isLost ? (
                                            <>
                                                <Radio className="w-3.5 h-3.5 animate-ping" />{" "}
                                                ACTIVE LOST ITEM ALERT
                                            </>
                                        ) : (
                                            <>
                                                <ShieldCheck className="w-3.5 h-3.5" />{" "}
                                                REGISTERED CAMPUS GEAR
                                            </>
                                        )}
                                    </span>
                                    <span className="font-mono-tabular text-xs text-slate-300 font-bold">
                                        {selectedItem.tag_code}
                                    </span>
                                </div>

                                <h3 className="text-base font-extrabold text-white mt-2">
                                    {selectedItem.name}
                                </h3>
                                <div className="flex items-center gap-2 text-xs text-slate-300 mt-1">
                                    <User className="w-3.5 h-3.5 text-blue-400" />
                                    <span>
                                        Owner:{" "}
                                        <strong>
                                            {selectedItem.owner_name}
                                        </strong>{" "}
                                        ({selectedItem.owner_dept})
                                    </span>
                                </div>
                            </div>

                            {/* Owner's Custom Return Note */}
                            <div className="p-3.5 rounded-xl bg-radar-card border border-white/10 space-y-1">
                                <div className="text-[10px] font-mono-tabular uppercase text-slate-400">
                                    Owner's Handover Note
                                </div>
                                <p className="text-xs text-slate-200 leading-relaxed">
                                    "{selectedItem.custom_note}"
                                </p>
                            </div>

                            {/* 1-Tap Ping Campus Location Action */}
                            <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 space-y-2.5">
                                <div className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                                    <Navigation className="w-3.5 h-3.5" />
                                    1-Tap "Ping Where I Found This"
                                </div>
                                <select
                                    value={selectedPingSpot}
                                    onChange={(e) =>
                                        setSelectedPingSpot(e.target.value)
                                    }
                                    className="w-full px-3 py-2 rounded-lg bg-radar-bg border border-white/15 text-xs text-white"
                                >
                                    {CAMPUS_HUBS.map((h) => (
                                        <option
                                            key={h.name}
                                            value={`${h.name} (${h.buildingCode})`}
                                        >
                                            Currently at: {h.name}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={handleSendPing}
                                    className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Ping Owner With Current Campus Spot
                                </button>
                                {pingSent && (
                                    <p className="text-[11px] text-emerald-400 text-center font-medium">
                                        Location ping sent! Owner notified at{" "}
                                        {selectedPingSpot}.
                                    </p>
                                )}
                            </div>

                            {/* Owner-Configurable Contact Matrix & Map Pin */}
                            <ContactMatrix
                                contactConfig={selectedItem.contact_config}
                                campusHub={selectedItem.meetup_hub}
                                roomDetail={selectedItem.meetup_room}
                                lat={selectedItem.lat}
                                lng={selectedItem.lng}
                                onOpenInAppChat={() =>
                                    onOpenChatForItem(selectedItem)
                                }
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
