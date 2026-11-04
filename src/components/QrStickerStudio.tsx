import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Plus, Printer, X, ArrowUpRight } from "lucide-react";
import { CAMPUS_HUBS, ITEM_CATEGORIES, getHubById } from "../data/hubs";
import type { DemoUser, QrGearItem } from "../types";

interface QrStickerStudioProps {
    gear: QrGearItem[];
    currentUser: DemoUser;
    onToggleLostMode: (tagId: string) => void;
    onRegisterGear: (item: QrGearItem) => void;
    onPreviewScan: (tagId: string) => void;
}

type StickerTemplateSize = "micro" | "standard" | "id-card";

export const QrStickerStudio: React.FC<QrStickerStudioProps> = ({
    gear,
    currentUser,
    onToggleLostMode,
    onRegisterGear,
    onPreviewScan,
}) => {
    const [isStickerModalOpen, setIsStickerModalOpen] = useState(false);
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    const [templateSize, setTemplateSize] =
        useState<StickerTemplateSize>("standard");

    // New item registration state
    const [name, setName] = useState("");
    const [category, setCategory] = useState(ITEM_CATEGORIES[0]);
    const [preferredHubId, setPreferredHubId] = useState("guard-house");
    const [handoverNote, setHandoverNote] = useState("");
    const [nameError, setNameError] = useState("");

    const handleRegisterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setNameError("Please enter the item name.");
            return;
        }

        const suffix = Math.floor(1000 + Math.random() * 9000);
        const prefix = category
            .slice(0, 4)
            .toUpperCase()
            .replace(/[^A-Z]/g, "ITEM");
        const newTagId = `CR-${prefix}-${suffix}`;

        onRegisterGear({
            tagId: newTagId,
            name: name.trim(),
            category,
            ownerName: currentUser.name,
            ownerSection: currentUser.dept,
            preferredHubId,
            handoverNote:
                handoverNote.trim() ||
                `Please drop off at ${getHubById(preferredHubId).name} or message me on Findr INCAT.`,
            status: "SAFE",
            contactChannels: {
                inAppChat: true,
                messenger: "m.me/iandelacruz.incat",
            },
        });

        setName("");
        setHandoverNote("");
        setNameError("");
        setIsRegisterModalOpen(false);
    };

    return (
        <div className="space-y-6">
            {/* Top Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-base font-medium text-text">
                        My items
                    </h1>
                    <p className="text-sm text-muted mt-0.5">
                        Toggle lost mode to post an alert on the wall and update
                        your QR tag status.
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={() => setIsStickerModalOpen(true)}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:opacity-80 transition-opacity duration-150"
                    >
                        <Printer size={16} strokeWidth={1.5} />
                        Print stickers
                    </button>

                    <button
                        type="button"
                        onClick={() => setIsRegisterModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-accent text-accent-fg text-sm font-medium rounded-md hover:opacity-90 transition-opacity duration-150"
                    >
                        <Plus size={16} strokeWidth={1.5} />
                        Register item
                    </button>
                </div>
            </div>

            {/* Simple Ruled Table */}
            {gear.length === 0 ? (
                <div className="py-12 text-center border border-border rounded-lg bg-surface text-sm text-muted">
                    No registered items yet.{" "}
                    <button
                        type="button"
                        onClick={() => setIsRegisterModalOpen(true)}
                        className="text-accent font-medium hover:underline ml-1"
                    >
                        Register your first item
                    </button>
                </div>
            ) : (
                <div className="border border-border rounded-lg bg-surface overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border text-xs text-muted bg-subtle/50">
                                    <th className="py-3 px-6 font-normal">
                                        Item
                                    </th>
                                    <th className="py-3 px-4 font-normal">
                                        Tag ID
                                    </th>
                                    <th className="py-3 px-4 font-normal">
                                        Status
                                    </th>
                                    <th className="py-3 px-6 font-normal text-right">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border text-sm">
                                {gear.map((item) => {
                                    const isLost = item.status === "LOST";
                                    const hub = getHubById(item.preferredHubId);
                                    return (
                                        <tr
                                            key={item.tagId}
                                            className="hover:bg-subtle/40 transition-colors duration-150"
                                        >
                                            <td className="py-4 px-6">
                                                <div className="font-medium text-text">
                                                    {item.name}
                                                </div>
                                                <div className="text-xs text-muted mt-0.5 line-clamp-1">
                                                    Drop-off: {hub.name}
                                                    {item.lastPingLocation
                                                        ? ` · Last scan: ${item.lastPingLocation} (${item.lastPingTime})`
                                                        : ""}
                                                </div>
                                            </td>

                                            <td className="py-4 px-4 align-middle">
                                                <span className="font-mono text-xs text-text">
                                                    {item.tagId}
                                                </span>
                                            </td>

                                            <td className="py-4 px-4 align-middle">
                                                <span className="inline-flex items-center gap-2 text-xs text-text">
                                                    <span
                                                        className={`w-1.5 h-1.5 rounded-full ${
                                                            isLost
                                                                ? "bg-lost"
                                                                : "bg-returned"
                                                        }`}
                                                    />
                                                    {isLost ? "Lost" : "Safe"}
                                                </span>
                                            </td>

                                            <td className="py-4 px-6 align-middle text-right">
                                                <div className="inline-flex items-center justify-end gap-5">
                                                    <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-muted">
                                                        <span>Lost mode</span>
                                                        <button
                                                            type="button"
                                                            role="switch"
                                                            aria-checked={
                                                                isLost
                                                            }
                                                            aria-label={`Toggle lost mode for ${item.name}`}
                                                            onClick={() =>
                                                                onToggleLostMode(
                                                                    item.tagId,
                                                                )
                                                            }
                                                            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-150 ${
                                                                isLost
                                                                    ? "bg-lost border-lost"
                                                                    : "bg-subtle border-border"
                                                            }`}
                                                        >
                                                            <span
                                                                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-150 ${
                                                                    isLost
                                                                        ? "translate-x-4"
                                                                        : "translate-x-0.5"
                                                                }`}
                                                            />
                                                        </button>
                                                    </label>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            onPreviewScan(
                                                                item.tagId,
                                                            )
                                                        }
                                                        className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:opacity-80"
                                                    >
                                                        Scan view
                                                        <ArrowUpRight
                                                            size={14}
                                                            strokeWidth={1.5}
                                                        />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Print Stickers Modal */}
            {isStickerModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 dark:bg-black/50 p-4 overflow-y-auto"
                    onClick={() => setIsStickerModalOpen(false)}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="sticker-modal-title"
                >
                    <div
                        className="w-full max-w-3xl bg-surface border border-border rounded-lg p-6 shadow-popover my-8"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-4 border-b border-border">
                            <div>
                                <h2
                                    id="sticker-modal-title"
                                    className="text-base font-medium text-text"
                                >
                                    Print QR stickers
                                </h2>
                                <p className="text-xs text-muted mt-0.5">
                                    Select a cut-guide size for calculators,
                                    tumblers, or ID cards.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsStickerModalOpen(false)}
                                aria-label="Close modal"
                                className="p-1 text-muted hover:text-text rounded-md"
                            >
                                <X size={18} strokeWidth={1.5} />
                            </button>
                        </div>

                        <div className="my-4 flex flex-wrap items-center justify-between gap-3">
                            <div className="inline-flex p-1 bg-subtle border border-border rounded-md">
                                <button
                                    type="button"
                                    onClick={() => setTemplateSize("micro")}
                                    className={`px-3 py-1 text-xs font-medium rounded ${
                                        templateSize === "micro"
                                            ? "bg-surface text-text border border-border"
                                            : "text-muted hover:text-text"
                                    }`}
                                >
                                    Calculator strip (35×15mm)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTemplateSize("standard")}
                                    className={`px-3 py-1 text-xs font-medium rounded ${
                                        templateSize === "standard"
                                            ? "bg-surface text-text border border-border"
                                            : "text-muted hover:text-text"
                                    }`}
                                >
                                    Tumbler badge (45×45mm)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTemplateSize("id-card")}
                                    className={`px-3 py-1 text-xs font-medium rounded ${
                                        templateSize === "id-card"
                                            ? "bg-surface text-text border border-border"
                                            : "text-muted hover:text-text"
                                    }`}
                                >
                                    ID back tag (54×85mm)
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-accent text-accent-fg text-xs font-medium rounded-md hover:opacity-90"
                            >
                                <Printer size={15} strokeWidth={1.5} />
                                Print sheet (A4 / Letter)
                            </button>
                        </div>

                        <div
                            id="printable-sticker-sheet"
                            className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2"
                        >
                            {gear.map((item) => {
                                const hub = getHubById(item.preferredHubId);
                                const scanUrl = `${window.location.origin}/?scan=${item.tagId}`;
                                return (
                                    <div
                                        key={item.tagId}
                                        className={`border border-dashed border-border rounded-md p-4 bg-white text-stone-900 flex items-center gap-3 ${
                                            templateSize === "id-card"
                                                ? "flex-col text-center py-6"
                                                : ""
                                        }`}
                                    >
                                        <QRCodeSVG
                                            value={scanUrl}
                                            size={
                                                templateSize === "micro"
                                                    ? 48
                                                    : templateSize === "id-card"
                                                      ? 88
                                                      : 64
                                            }
                                            level="H"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="font-mono text-xs font-medium text-stone-900">
                                                {item.tagId}
                                            </div>
                                            <div className="text-xs font-medium text-stone-900 truncate mt-0.5">
                                                {item.name}
                                            </div>
                                            <div className="text-xs text-stone-500 truncate">
                                                {item.ownerName} ·{" "}
                                                {item.ownerSection}
                                            </div>
                                            <div className="text-xs text-stone-500 truncate">
                                                Return: {hub.name}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Register Item Modal */}
            {isRegisterModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 dark:bg-black/50 p-4"
                    onClick={() => setIsRegisterModalOpen(false)}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="register-gear-title"
                >
                    <div
                        className="w-full max-w-md bg-surface border border-border rounded-lg p-6 shadow-popover"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-4 border-b border-border">
                            <h2
                                id="register-gear-title"
                                className="text-base font-medium text-text"
                            >
                                Register item
                            </h2>
                            <button
                                type="button"
                                onClick={() => setIsRegisterModalOpen(false)}
                                aria-label="Close modal"
                                className="p-1 text-muted hover:text-text rounded-md"
                            >
                                <X size={18} strokeWidth={1.5} />
                            </button>
                        </div>

                        <form
                            onSubmit={handleRegisterSubmit}
                            className="mt-4 space-y-4"
                            noValidate
                        >
                            <div>
                                <label
                                    htmlFor="gear-name"
                                    className="block text-xs text-muted mb-1"
                                >
                                    Item name
                                </label>
                                <input
                                    id="gear-name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Graphing Calculator or Black HydroFlask"
                                    className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-md text-text"
                                />
                                {nameError && (
                                    <p className="text-xs text-lost mt-1">
                                        {nameError}
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label
                                        htmlFor="gear-cat"
                                        className="block text-xs text-muted mb-1"
                                    >
                                        Category
                                    </label>
                                    <select
                                        id="gear-cat"
                                        value={category}
                                        onChange={(e) =>
                                            setCategory(e.target.value)
                                        }
                                        className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-md text-text"
                                    >
                                        {ITEM_CATEGORIES.map((c) => (
                                            <option key={c} value={c}>
                                                {c}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label
                                        htmlFor="gear-hub"
                                        className="block text-xs text-muted mb-1"
                                    >
                                        Preferred drop-off hub
                                    </label>
                                    <select
                                        id="gear-hub"
                                        value={preferredHubId}
                                        onChange={(e) =>
                                            setPreferredHubId(e.target.value)
                                        }
                                        className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-md text-text"
                                    >
                                        {CAMPUS_HUBS.map((h) => (
                                            <option key={h.id} value={h.id}>
                                                {h.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label
                                    htmlFor="gear-note"
                                    className="block text-xs text-muted mb-1"
                                >
                                    Handover note for finder
                                </label>
                                <textarea
                                    id="gear-note"
                                    rows={2}
                                    value={handoverNote}
                                    onChange={(e) =>
                                        setHandoverNote(e.target.value)
                                    }
                                    placeholder="Any distinguishing marks or instructions..."
                                    className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-md text-text"
                                />
                            </div>

                            <div className="pt-3 border-t border-border flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setIsRegisterModalOpen(false)
                                    }
                                    className="px-3 py-1.5 text-sm text-muted hover:text-text"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-1.5 bg-accent text-accent-fg text-sm font-medium rounded-md"
                                >
                                    Save item
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
