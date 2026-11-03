import React from "react";
import {
    MessageSquare,
    Send,
    Phone,
    Mail,
    MessageCircle,
    MapPin,
    Lock,
    Building2,
} from "lucide-react";
import type { ContactConfig, CampusHubName } from "../types";
import { CAMPUS_HUBS } from "../data/hubs";
import { CampusMap } from "./CampusMap";

interface ContactMatrixProps {
    contactConfig: ContactConfig;
    campusHub?: CampusHubName;
    roomDetail?: string;
    lat?: number;
    lng?: number;
    isLockedForVerification?: boolean;
    onOpenInAppChat: () => void;
    compact?: boolean;
}

export const ContactMatrix: React.FC<ContactMatrixProps> = ({
    contactConfig,
    campusHub,
    roomDetail,
    lat,
    lng,
    isLockedForVerification = false,
    onOpenInAppChat,
    compact = false,
}) => {
    const hubPreset = CAMPUS_HUBS.find((h) => h.name === campusHub);

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono-tabular uppercase tracking-wider text-slate-400">
                    Owner-Configured Contact & Handover Channels
                </span>
                {isLockedForVerification && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono-tabular text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                        <Lock className="w-3 h-3" /> Direct Contacts Locked
                        Until Verified
                    </span>
                )}
            </div>

            {/* Conditional Action Buttons — Only renders methods enabled by the poster */}
            <div className="flex flex-wrap gap-2">
                {contactConfig.enableInAppChat && (
                    <button
                        type="button"
                        onClick={onOpenInAppChat}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-radar-blue hover:bg-blue-500 text-white shadow-sm transition cursor-pointer"
                    >
                        <MessageSquare className="w-3.5 h-3.5" />
                        In-App Campus Chat
                    </button>
                )}

                {!isLockedForVerification && contactConfig.fbMessenger && (
                    <a
                        href={
                            contactConfig.fbMessenger.startsWith("http")
                                ? contactConfig.fbMessenger
                                : `https://m.me/${contactConfig.fbMessenger}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-[#0084FF]/15 hover:bg-[#0084FF]/25 text-[#38BDF8] border border-[#0084FF]/30 transition"
                    >
                        <Send className="w-3.5 h-3.5" />
                        FB Messenger
                    </a>
                )}

                {!isLockedForVerification && contactConfig.whatsApp && (
                    <a
                        href={`https://wa.me/${contactConfig.whatsApp.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition"
                    >
                        <MessageCircle className="w-3.5 h-3.5" />
                        WhatsApp
                    </a>
                )}

                {!isLockedForVerification && contactConfig.smsNumber && (
                    <a
                        href={`sms:${contactConfig.smsNumber}`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition"
                    >
                        <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                        SMS Text
                    </a>
                )}

                {!isLockedForVerification && contactConfig.phoneCall && (
                    <a
                        href={`tel:${contactConfig.phoneCall}`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition"
                    >
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                        Call Now
                    </a>
                )}

                {!isLockedForVerification && contactConfig.email && (
                    <a
                        href={`mailto:${contactConfig.email}`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition"
                    >
                        <Mail className="w-3.5 h-3.5 text-blue-400" />
                        School Email
                    </a>
                )}
            </div>

            {/* Conditional Campus Map Pin & Meetup Spot Card */}
            {contactConfig.showMapPin && campusHub && (
                <div className="rounded-xl bg-radar-bg/90 border border-white/10 p-3 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                            <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 mt-0.5">
                                {hubPreset?.isOfficialDropoff ? (
                                    <Building2 className="w-4 h-4" />
                                ) : (
                                    <MapPin className="w-4 h-4" />
                                )}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-white">
                                        {campusHub}
                                    </span>
                                    {hubPreset && (
                                        <span className="font-mono-tabular text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10">
                                            {hubPreset.buildingCode}
                                        </span>
                                    )}
                                </div>
                                {roomDetail && (
                                    <p className="text-xs text-slate-300 mt-0.5 font-medium">
                                        {roomDetail}
                                    </p>
                                )}
                                {hubPreset && (
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                        {hubPreset.handoverInstructions}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {!compact && lat && lng && (
                        <CampusMap
                            center={[lat, lng]}
                            zoom={18}
                            selectedPin={{
                                lat,
                                lng,
                                label: `${campusHub}${roomDetail ? ` • ${roomDetail}` : ""}`,
                                color: "#3B82F6",
                            }}
                            heightClass="h-40"
                        />
                    )}
                </div>
            )}
        </div>
    );
};
