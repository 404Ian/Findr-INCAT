import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Plus, Printer, X, ArrowUpRight, Upload } from "lucide-react";
import { CAMPUS_HUBS, ITEM_CATEGORIES, getHubById } from "../data/hubs";
import type { DemoUser, QrGearItem } from "../types";
import { EmptyTrayIllustration, compressImageFile } from "./CategoryArt";

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
    const prefersReducedMotion = useReducedMotion();
    const [isStickerModalOpen, setIsStickerModalOpen] = useState(false);
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    const [templateSize, setTemplateSize] =
        useState<StickerTemplateSize>("standard");

    // New item registration state
    const [name, setName] = useState("");
    const [category, setCategory] = useState(ITEM_CATEGORIES[0]);
    const [preferredHubId, setPreferredHubId] = useState("guard-house");
    const [handoverNote, setHandoverNote] = useState("");
    const [photoUrl, setPhotoUrl] = useState("");
    const [nameError, setNameError] = useState("");

    const handlePhotoUpload = async (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const compressed = await compressImageFile(file);
            setPhotoUrl(compressed);
        } catch {
            // Ignore compression error
        }
    };

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
                `Please drop off at ${
                    getHubById(preferredHubId).name
                } or message me on Findr INCAT.`,
            status: "SAFE",
            photoUrl: photoUrl || undefined,
            contactChannels: {
                inAppChat: true,
                messenger: "m.me/iandelacruz.incat",
            },
        });

        setName("");
        setHandoverNote("");
        setPhotoUrl("");
        setNameError("");
        setIsRegisterModalOpen(false);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-base font-semibold tracking-tight text-text">
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

            {gear.length === 0 ? (
                <div className="py-14 text-center border border-border rounded-lg bg-surface text-sm text-muted">
                    <EmptyTrayIllustration />
                    <p>No registered items yet.</p>
                    <button
                        type="button"
                        onClick={() => setIsRegisterModalOpen(true)}
                        className="text-accent font-medium hover:underline mt-2 inline-block"
                    >
                        Register your first item
                    </button>
                </div>
            ) : (
                <>
                    {/* Mobile View: Card Grid */}
                    <div className="grid grid-cols-1 gap-4 md:hidden">
                        {gear.map((item) => {
                            const isLost = item.status === "LOST";
                            const hub = getHubById(item.preferredHubId);
                            const scanUrl = `${window.location.origin}/?scan=${item.tagId}`;

                            return (
                                <div
                                    key={item.tagId}
                                    className="border border-border rounded-lg bg-surface p-5 space-y-4"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-3 min-w-0">
                                            <div className="p-1.5 bg-white border border-border rounded shrink-0">
                                                <QRCodeSVG
                                                    value={scanUrl}
                                                    size={40}
                                                    level="M"
                                                />
                                            </div>
                                            <div className="min-w-0">
                                                <span className="font-mono text-xs text-muted block">
                                                    {item.tagId}
                                                </span>
                                                <h2 className="text-sm font-semibold text-text truncate mt-0.5">
                                                    {item.name}
                                                </h2>
                                                <p className="text-xs text-muted mt-0.5 truncate">
                                                    Drop-off: {hub.name}
                                                </p>
                                            </div>
                                        </div>

                                        <span className="inline-flex items-center gap-1.5 text-xs text-text shrink-0">
                                            <span
                                                className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                                                    isLost
                                                        ? "bg-lost"
                                                        : "bg-returned"
                                                }`}
                                            />
                                            {isLost ? "Lost" : "Safe"}
                                        </span>
                                    </div>

                                    {item.lastPingLocation && (
                                        <p className="text-xs text-muted pt-2 border-t border-border">
                                            Last scan: {item.lastPingLocation} (
                                            {item.lastPingTime})
                                        </p>
                                    )}

                                    <div className="pt-3 border-t border-border flex items-center justify-between">
                                        <label className="inline-flex items-center gap-2.5 cursor-pointer text-xs text-muted">
                                            <span>Lost mode</span>
                                            <button
                                                type="button"
                                                role="switch"
                                                aria-checked={isLost}
                                                aria-label={`Toggle lost mode for ${item.name}`}
                                                onClick={() =>
                                                    onToggleLostMode(item.tagId)
                                                }
                                                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border p-0.5 transition-colors duration-200 ${
                                                    isLost
                                                        ? "bg-lost border-lost justify-end"
                                                        : "bg-subtle border-border justify-start"
                                                }`}
                                            >
                                                <motion.span
                                                    layout
                                                    transition={{
                                                        type: "spring",
                                                        stiffness: 300,
                                                        damping: 30,
                                                    }}
                                                    className="inline-block h-3.5 w-3.5 rounded-full bg-white"
                                                />
                                            </button>
                                        </label>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                onPreviewScan(item.tagId)
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
                                </div>
                            );
                        })}
                    </div>

                    {/* Desktop View: Ruled Table with QR Preview Thumbnail */}
                    <div className="hidden md:block border border-border rounded-lg bg-surface overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-border text-xs text-muted bg-subtle/50">
                                        <th className="py-3 px-6 font-medium">
                                            Item
                                        </th>
                                        <th className="py-3 px-4 font-medium">
                                            Tag ID
                                        </th>
                                        <th className="py-3 px-4 font-medium">
                                            Status
                                        </th>
                                        <th className="py-3 px-6 font-medium text-right">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border text-sm">
                                    {gear.map((item) => {
                                        const isLost = item.status === "LOST";
                                        const hub = getHubById(
                                            item.preferredHubId,
                                        );
                                        const scanUrl = `${window.location.origin}/?scan=${item.tagId}`;

                                        return (
                                            <tr
                                                key={item.tagId}
                                                className="hover:bg-subtle/40 transition-colors duration-150"
                                            >
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center gap-3.5">
                                                        <div className="p-1.5 bg-white border border-border rounded shrink-0">
                                                            <QRCodeSVG
                                                                value={scanUrl}
                                                                size={34}
                                                                level="M"
                                                            />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="font-medium text-text">
                                                                {item.name}
                                                            </div>
                                                            <div className="text-xs text-muted mt-0.5 line-clamp-1">
                                                                Drop-off:{" "}
                                                                {hub.name}
                                                                {item.lastPingLocation
                                                                    ? ` · Last scan: ${item.lastPingLocation} (${item.lastPingTime})`
                                                                    : ""}
                                                            </div>
                                                        </div>
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
                                                            className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                                                                isLost
                                                                    ? "bg-lost"
                                                                    : "bg-returned"
                                                            }`}
                                                        />
                                                        {isLost
                                                            ? "Lost"
                                                            : "Safe"}
                                                    </span>
                                                </td>

                                                <td className="py-4 px-6 align-middle text-right">
                                                    <div className="inline-flex items-center justify-end gap-5">
                                                        <label className="inline-flex items-center gap-2.5 cursor-pointer text-xs text-muted">
                                                            <span>
                                                                Lost mode
                                                            </span>
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
                                                                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border p-0.5 transition-colors duration-200 ${
                                                                    isLost
                                                                        ? "bg-lost border-lost justify-end"
                                                                        : "bg-subtle border-border justify-start"
                                                                }`}
                                                            >
                                                                <motion.span
                                                                    layout
                                                                    transition={{
                                                                        type: "spring",
                                                                        stiffness: 300,
                                                                        damping: 30,
                                                                    }}
                                                                    className="inline-block h-3.5 w-3.5 rounded-full bg-white"
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
                                                                strokeWidth={
                                                                    1.5
                                                                }
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
                </>
            )}

            {/* Print Stickers Modal */}
            <AnimatePresence>
                {isStickerModalOpen && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="sticker-modal-title"
                    >
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => setIsStickerModalOpen(false)}
                            className="fixed inset-0 bg-black/30 dark:bg-black/55"
                        />
                        <motion.div
                            initial={
                                prefersReducedMotion
                                    ? { opacity: 0 }
                                    : { opacity: 0, scale: 0.97, y: 6 }
                            }
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.97 }}
                            transition={{
                                duration: 0.22,
                                ease: [0.22, 1, 0.36, 1],
                            }}
                            className="relative z-10 w-full max-w-3xl bg-surface border border-border rounded-lg p-6 shadow-popover my-8"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between pb-4 border-b border-border">
                                <div>
                                    <h2
                                        id="sticker-modal-title"
                                        className="text-base font-semibold tracking-tight text-text"
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
                                        onClick={() =>
                                            setTemplateSize("standard")
                                        }
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
                                        onClick={() =>
                                            setTemplateSize("id-card")
                                        }
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
                                                        : templateSize ===
                                                            "id-card"
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
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Register Item Modal */}
            <AnimatePresence>
                {isRegisterModalOpen && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="register-gear-title"
                    >
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => setIsRegisterModalOpen(false)}
                            className="fixed inset-0 bg-black/30 dark:bg-black/55"
                        />
                        <motion.div
                            initial={
                                prefersReducedMotion
                                    ? { opacity: 0 }
                                    : { opacity: 0, scale: 0.97, y: 6 }
                            }
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.97 }}
                            transition={{
                                duration: 0.22,
                                ease: [0.22, 1, 0.36, 1],
                            }}
                            className="relative z-10 w-full max-w-md bg-surface border border-border rounded-lg p-6 shadow-popover"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between pb-4 border-b border-border">
                                <h2
                                    id="register-gear-title"
                                    className="text-base font-semibold tracking-tight text-text"
                                >
                                    Register item
                                </h2>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setIsRegisterModalOpen(false)
                                    }
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
                                        onChange={(e) =>
                                            setName(e.target.value)
                                        }
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
                                                setPreferredHubId(
                                                    e.target.value,
                                                )
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

                                <div>
                                    <label className="block text-xs text-muted mb-1">
                                        Item photo (optional)
                                    </label>
                                    <label
                                        htmlFor="gear-photo-upload"
                                        className="flex items-center justify-center gap-2 px-3 py-2.5 border border-dashed border-border rounded-md bg-bg text-xs text-muted hover:text-text cursor-pointer"
                                    >
                                        <Upload size={14} strokeWidth={1.5} />
                                        <span>
                                            {photoUrl
                                                ? "Photo attached"
                                                : "Upload item photo"}
                                        </span>
                                        <input
                                            id="gear-photo-upload"
                                            type="file"
                                            accept="image/*"
                                            onChange={handlePhotoUpload}
                                            className="hidden"
                                        />
                                    </label>
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
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
