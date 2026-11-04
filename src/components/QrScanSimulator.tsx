import React, { useState } from "react";
import { MessageSquare, ExternalLink, Phone, Check } from "lucide-react";
import { CAMPUS_HUBS, getHubById } from "../data/hubs";
import type { QrGearItem } from "../types";

interface QrScanSimulatorProps {
    gear: QrGearItem[];
    selectedTagId: string;
    onSelectTag: (tagId: string) => void;
    onPingTagLocation: (tagId: string, locationName: string) => void;
    onOpenTagChat: (item: QrGearItem) => void;
}

export const QrScanSimulator: React.FC<QrScanSimulatorProps> = ({
    gear,
    selectedTagId,
    onSelectTag,
    onPingTagLocation,
    onOpenTagChat,
}) => {
    const activeItem = gear.find((g) => g.tagId === selectedTagId) || gear[0];
    const [selectedHubName, setSelectedHubName] = useState(CAMPUS_HUBS[1].name);
    const [pingSent, setPingSent] = useState(false);

    if (!activeItem) {
        return (
            <div className="py-12 text-center text-sm text-muted">
                No registered tags available to preview.
            </div>
        );
    }

    const preferredHub = getHubById(activeItem.preferredHubId);

    const handlePing = () => {
        onPingTagLocation(activeItem.tagId, selectedHubName);
        setPingSent(true);
        setTimeout(() => setPingSent(false), 2500);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Tag Selector List */}
            <div className="lg:col-span-5 space-y-4">
                <div>
                    <h1 className="text-base font-medium text-text">
                        Scan preview
                    </h1>
                    <p className="text-sm text-muted mt-0.5">
                        Select a registered tag to preview what a student or
                        guard sees when scanning the sticker.
                    </p>
                </div>

                <div className="border border-border rounded-lg bg-surface divide-y divide-border">
                    {gear.map((item) => {
                        const isSelected = item.tagId === activeItem.tagId;
                        const isLost = item.status === "LOST";
                        return (
                            <button
                                key={item.tagId}
                                type="button"
                                onClick={() => {
                                    onSelectTag(item.tagId);
                                    setPingSent(false);
                                }}
                                className={`w-full text-left px-4 py-3.5 transition-colors duration-150 flex items-center justify-between gap-3 ${
                                    isSelected
                                        ? "bg-subtle"
                                        : "hover:bg-subtle/50"
                                }`}
                            >
                                <div className="min-w-0">
                                    <div className="font-mono text-xs text-muted">
                                        {item.tagId}
                                    </div>
                                    <div className="text-sm font-medium text-text truncate mt-0.5">
                                        {item.name}
                                    </div>
                                </div>
                                <span className="inline-flex items-center gap-1.5 text-xs text-muted shrink-0">
                                    <span
                                        className={`w-1.5 h-1.5 rounded-full ${
                                            isLost ? "bg-lost" : "bg-returned"
                                        }`}
                                    />
                                    {isLost ? "Lost" : "Safe"}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Right Column: Plain Phone Preview */}
            <div className="lg:col-span-7 flex justify-center">
                <div className="w-full max-w-sm border border-border rounded-lg bg-surface p-6 space-y-6">
                    {/* Top URL bar & status */}
                    <div className="pb-4 border-b border-border flex items-center justify-between text-xs text-muted">
                        <span className="font-mono truncate">
                            campusradar.edu/scan/{activeItem.tagId}
                        </span>
                        <span className="inline-flex items-center gap-1.5 shrink-0">
                            <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                    activeItem.status === "LOST"
                                        ? "bg-lost"
                                        : "bg-returned"
                                }`}
                            />
                            {activeItem.status === "LOST" ? "Lost" : "Safe"}
                        </span>
                    </div>

                    {/* Item Name & Owner */}
                    <div className="space-y-1">
                        <div className="font-mono text-xs text-muted">
                            {activeItem.tagId}
                        </div>
                        <h2 className="text-base font-medium text-text">
                            {activeItem.name}
                        </h2>
                        <p className="text-sm text-muted">
                            Owner: {activeItem.ownerName} (
                            {activeItem.ownerSection})
                        </p>
                    </div>

                    {/* Handover Note */}
                    <div className="pt-4 border-t border-border space-y-1 text-sm">
                        <div className="text-xs text-muted">Owner note</div>
                        <p className="text-text leading-relaxed">
                            {activeItem.handoverNote}
                        </p>
                        <p className="text-xs text-muted pt-1">
                            Preferred drop-off: {preferredHub.name}
                        </p>
                    </div>

                    {/* Primary Action: Send Location */}
                    <div className="pt-4 border-t border-border space-y-3">
                        <label
                            htmlFor="scan-spot-select"
                            className="block text-xs text-muted"
                        >
                            Current location of this item
                        </label>
                        <select
                            id="scan-spot-select"
                            value={selectedHubName}
                            onChange={(e) => setSelectedHubName(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-md text-text"
                        >
                            {CAMPUS_HUBS.map((hub) => (
                                <option key={hub.id} value={hub.name}>
                                    {hub.name}
                                </option>
                            ))}
                        </select>

                        <button
                            type="button"
                            onClick={handlePing}
                            className="w-full py-2 px-4 bg-accent text-accent-fg text-sm font-medium rounded-md hover:opacity-90 transition-opacity duration-150 inline-flex items-center justify-center gap-1.5"
                        >
                            {pingSent ? (
                                <>
                                    <Check size={16} strokeWidth={1.5} />
                                    Location sent to owner
                                </>
                            ) : (
                                "Send current location to owner"
                            )}
                        </button>
                    </div>

                    {/* Plain Contact Links Underneath */}
                    <div className="pt-4 border-t border-border space-y-2">
                        <div className="text-xs text-muted">
                            Contact owner directly
                        </div>
                        <div className="flex flex-col gap-2 text-sm">
                            <button
                                type="button"
                                onClick={() => onOpenTagChat(activeItem)}
                                className="inline-flex items-center gap-2 text-text hover:text-accent transition-colors duration-150 text-left py-1"
                            >
                                <MessageSquare
                                    size={15}
                                    strokeWidth={1.5}
                                    className="text-muted"
                                />
                                <span>Open campus chat</span>
                            </button>

                            {activeItem.contactChannels.messenger && (
                                <a
                                    href={`https://${activeItem.contactChannels.messenger.replace(/^https?:\/\//, "")}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2 text-text hover:text-accent transition-colors duration-150 py-1"
                                >
                                    <ExternalLink
                                        size={15}
                                        strokeWidth={1.5}
                                        className="text-muted"
                                    />
                                    <span>Message on Messenger</span>
                                </a>
                            )}

                            {activeItem.contactChannels.sms && (
                                <a
                                    href={`sms:${activeItem.contactChannels.sms}`}
                                    className="inline-flex items-center gap-2 text-text hover:text-accent transition-colors duration-150 py-1"
                                >
                                    <Phone
                                        size={15}
                                        strokeWidth={1.5}
                                        className="text-muted"
                                    />
                                    <span>
                                        Send SMS (
                                        {activeItem.contactChannels.sms})
                                    </span>
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
