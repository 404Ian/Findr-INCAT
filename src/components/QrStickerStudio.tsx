import React, { useCallback, useEffect, useState } from "react";
import * as QRCode from "qrcode";
import {
    AlertTriangle,
    BellRing,
    Check,
    Copy,
    Download,
    Eye,
    FileDown,
    FileUp,
    Inbox,
    KeyRound,
    Link2,
    MapPin,
    Plus,
    Printer,
    QrCode,
    RefreshCw,
    ShieldAlert,
    ShieldCheck,
    Sparkles,
    Trash2,
    X,
} from "lucide-react";
import { api, ApiError } from "../lib/api";
import {
    exportRecoveryJson,
    getCapabilityVault,
    getStoredCampusCode,
    importRecoveryJson,
    removeCapabilityItem,
    setStoredCampusCode,
} from "../lib/keys";
import type {
    ContactConfig,
    CreateTagResponse,
    ItemCategory,
    ScanEvent,
    Tag,
    TagMessage,
} from "../types";
import { ContactMatrix, DEFAULT_CONTACT_CONFIG } from "./ContactMatrix";
import { PublicTagPage } from "./PublicTagPage";

export interface QrStickerStudioProps {
    /** Optional callback when user wants to preview a tag in the Scan tab */
    onPreviewTagCode?: (publicCode: string) => void;
    /** Legacy props compatibility */
    tags?: Tag[];
    onTagsChanged?: (tags: Tag[]) => void;
}

const ITEM_TYPE_OPTIONS: readonly { value: ItemCategory; label: string }[] = [
    { value: "ids_cards", label: "ID Card / Lanyard" },
    { value: "calculators", label: "Scientific Calculator" },
    { value: "tumblers_containers", label: "Tumbler / AquaFlask" },
    { value: "wallets_cash", label: "Wallet / Cardholder" },
    { value: "electronics", label: "Phone / Flash Drive / Laptop" },
    { value: "keys_lanyards", label: "Keys / Keychain" },
    { value: "bags_pouches", label: "Bag / Pencil Pouch" },
    { value: "books_notebooks", label: "Notebook / Textbook" },
    { value: "shop_tools", label: "Drafting / Shop Tool" },
    { value: "apparel_umbrellas", label: "Umbrella / Jacket" },
    { value: "other", label: "Other Personal Item" },
] as const;

function getTagPublicUrl(publicCode: string): string {
    const origin =
        typeof window !== "undefined"
            ? window.location.origin
            : "https://myfindr.pages.dev";
    return `${origin}/t/${publicCode}`;
}

function formatTimeAgo(iso?: string | null): string {
    if (!iso) return "Never scanned";
    const diffMs = Date.now() - new Date(iso).getTime();
    if (Number.isNaN(diffMs)) return "Recently";
    const mins = Math.max(1, Math.floor(diffMs / 60000));
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

export const QrStickerStudio: React.FC<QrStickerStudioProps> = ({
    onPreviewTagCode,
    onTagsChanged,
}) => {
    const [myTags, setMyTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // QR SVG + PNG data URL caches keyed by publicCode
    const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});
    const [qrSvgStrings, setQrSvgStrings] = useState<Record<string, string>>(
        {},
    );

    // Sticker print configuration
    const [stickerSize, setStickerSize] = useState<"small" | "medium">(
        "medium",
    );
    const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(
        new Set(),
    );

    // Create Tag Modal / Drawer state
    const [createOpen, setCreateOpen] = useState(false);
    const [label, setLabel] = useState("");
    const [itemType, setItemType] = useState<ItemCategory>("calculators");
    const [contactConfig, setContactConfig] = useState<ContactConfig>(
        DEFAULT_CONTACT_CONFIG,
    );
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [needsCampusCode, setNeedsCampusCode] = useState(false);
    const [campusCode, setCampusCode] = useState(getStoredCampusCode());
    const [createdReceipt, setCreatedReceipt] =
        useState<CreateTagResponse | null>(null);
    const [copiedReceipt, setCopiedReceipt] = useState(false);

    // Recovery import / paste link state
    const [recoveryInput, setRecoveryInput] = useState("");
    const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null);

    // Active Tag Messages & Scan Log Drawer
    const [inboxTag, setInboxTag] = useState<Tag | null>(null);
    const [inboxMessages, setInboxMessages] = useState<TagMessage[]>([]);
    const [inboxScans, setInboxScans] = useState<ScanEvent[]>([]);
    const [inboxLoading, setInboxLoading] = useState(false);

    // Live Finder Page Preview Modal
    const [previewPublicCode, setPreviewPublicCode] = useState<string | null>(
        null,
    );

    const loadTags = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { tags } = await api.getMyTags();
            setMyTags(tags);
            onTagsChanged?.(tags);
            setSelectedTagIds(
                new Set(tags.filter((t) => !t.revokedAt).map((t) => t.id)),
            );
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to load your QR tags.",
            );
        } finally {
            setLoading(false);
        }
    }, [onTagsChanged]);

    useEffect(() => {
        void loadTags();
    }, [loadTags]);

    // Generate QR PNG data URLs and SVG strings for every tag's public URL
    useEffect(() => {
        let active = true;
        async function generateAllQrs() {
            const nextPng: Record<string, string> = {};
            const nextSvg: Record<string, string> = {};

            for (const t of myTags) {
                const url = getTagPublicUrl(t.publicCode);
                try {
                    nextPng[t.publicCode] = await QRCode.toDataURL(url, {
                        width: 360,
                        margin: 1,
                        errorCorrectionLevel: "M",
                        color: {
                            dark: "#052e16",
                            light: "#ffffff",
                        },
                    });
                    nextSvg[t.publicCode] = await QRCode.toString(url, {
                        type: "svg",
                        margin: 1,
                        errorCorrectionLevel: "M",
                        color: {
                            dark: "#052e16",
                            light: "#ffffff",
                        },
                    });
                } catch {
                    // Ignore individual QR generation errors
                }
            }

            if (active) {
                setQrDataUrls(nextPng);
                setQrSvgStrings(nextSvg);
            }
        }
        if (myTags.length > 0) {
            void generateAllQrs();
        }
        return () => {
            active = false;
        };
    }, [myTags]);

    const handleCreateTag = async (e: React.FormEvent) => {
        e.preventDefault();
        if (label.trim().length < 2) {
            setCreateError(
                "Please enter an item name (at least 2 characters).",
            );
            return;
        }

        setCreating(true);
        setCreateError(null);

        if (campusCode.trim()) {
            setStoredCampusCode(campusCode.trim());
        }

        try {
            let photoKey: string | undefined;
            if (photoFile) {
                try {
                    const uploaded = await api.uploadImage(photoFile);
                    photoKey = uploaded.key;
                } catch {
                    // Proceed without photo if R2 is not bound locally
                }
            }

            const res = await api.createTag({
                label: label.trim(),
                itemType,
                photoKey,
                contactConfig,
                turnstileToken: "dev-bypass-token",
            });

            setCreatedReceipt(res);
            setLabel("");
            setPhotoFile(null);
            await loadTags();
        } catch (err) {
            if (
                err instanceof ApiError &&
                err.code === "CAMPUS_CODE_REQUIRED"
            ) {
                setNeedsCampusCode(true);
                setCreateError(
                    "Enter the INCAT campus access code below to generate a tag.",
                );
            } else {
                setCreateError(
                    err instanceof Error
                        ? err.message
                        : "Could not create QR tag.",
                );
            }
        } finally {
            setCreating(false);
        }
    };

    const handleToggleLostMode = async (tag: Tag) => {
        const nextLost = !tag.lostMode;
        let nextNote = tag.lostNote ?? "";
        if (nextLost && !nextNote) {
            const promptNote = window.prompt(
                'Optional message shown on the finder banner (e.g., "Left in ICT Lab 2, please drop off at Guidance Office"):',
                "Left on INCAT campus. Please message me or drop off at the Guard House!",
            );
            if (promptNote === null) return;
            nextNote = promptNote.trim();
        }

        try {
            const { tag: updated } = await api.updateTag(tag.id, {
                lostMode: nextLost,
                lostNote: nextLost ? nextNote : null,
            });
            setMyTags((prev) =>
                prev.map((t) => (t.id === updated.id ? updated : t)),
            );
        } catch (err) {
            alert(
                err instanceof Error
                    ? err.message
                    : "Failed to update Lost Mode.",
            );
        }
    };

    const handleRegenerateCode = async (tag: Tag) => {
        if (
            !window.confirm(
                `Regenerate QR code for "${tag.label}"? Any previously printed stickers with #${tag.publicCode} will stop working immediately.`,
            )
        ) {
            return;
        }
        try {
            const { tag: updated } = await api.regenerateTagCode(tag.id);
            setMyTags((prev) =>
                prev.map((t) => (t.id === updated.id ? updated : t)),
            );
        } catch (err) {
            alert(
                err instanceof Error
                    ? err.message
                    : "Failed to regenerate code.",
            );
        }
    };

    const handleToggleRevoke = async (tag: Tag) => {
        const isCurrentlyRevoked = Boolean(tag.revokedAt);
        try {
            const { tag: updated } = await api.updateTag(tag.id, {
                revoke: !isCurrentlyRevoked,
            });
            setMyTags((prev) =>
                prev.map((t) => (t.id === updated.id ? updated : t)),
            );
        } catch (err) {
            alert(
                err instanceof Error
                    ? err.message
                    : "Failed to update tag state.",
            );
        }
    };

    const handleDeleteTag = async (tag: Tag) => {
        if (
            !window.confirm(
                `Permanently delete "${tag.label}" (#${tag.publicCode})? This cannot be undone.`,
            )
        ) {
            return;
        }
        try {
            await api.deleteTag(tag.id);
            removeCapabilityItem(tag.id);
            setMyTags((prev) => prev.filter((t) => t.id !== tag.id));
        } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to delete tag.");
        }
    };

    const handleOpenInbox = async (tag: Tag) => {
        setInboxTag(tag);
        setInboxLoading(true);
        try {
            const { messages, scans } = await api.getTagMessagesAndScans(
                tag.id,
            );
            setInboxMessages(messages);
            setInboxScans(scans);
            // Clear unread badge locally
            setMyTags((prev) =>
                prev.map((t) =>
                    t.id === tag.id ? { ...t, unreadMessageCount: 0 } : t,
                ),
            );
        } catch (err) {
            alert(
                err instanceof Error ? err.message : "Failed to load messages.",
            );
        } finally {
            setInboxLoading(false);
        }
    };

    const handleRestoreFromKeyOrLink = async (e: React.FormEvent) => {
        e.preventDefault();
        const raw = recoveryInput.trim();
        if (!raw) return;
        setRecoveryNotice(null);

        // Extract key if user pasted full URL like https://myfindr.pages.dev/manage/abc123...
        const match = raw.match(/\/manage\/([A-Za-z0-9_-]+)/);
        const extractedKey = match ? match[1] : raw;

        try {
            const restored = await api.restoreCapabilityKey(extractedKey);
            setRecoveryInput("");
            setRecoveryNotice(
                `Restored ${restored.kind.toUpperCase()}: "${restored.label}" to this device!`,
            );
            await loadTags();
        } catch (err) {
            setRecoveryNotice(
                err instanceof Error
                    ? err.message
                    : "Could not restore key. Verify the link or recovery file.",
            );
        }
    };

    const handleImportRecoveryFile = async (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const text = await file.text();
            const items = importRecoveryJson(text);
            setRecoveryNotice(
                `Imported ${items.length} capability key(s) into this browser.`,
            );
            await loadTags();
        } catch (err) {
            setRecoveryNotice(
                err instanceof Error
                    ? err.message
                    : "Invalid recovery JSON file.",
            );
        } finally {
            e.target.value = "";
        }
    };

    const downloadStickerAsset = (tag: Tag, format: "png" | "svg") => {
        if (format === "png") {
            const dataUrl = qrDataUrls[tag.publicCode];
            if (!dataUrl) return;
            const a = document.createElement("a");
            a.href = dataUrl;
            a.download = `findr-incat-${tag.publicCode}.png`;
            a.click();
        } else {
            const svg = qrSvgStrings[tag.publicCode];
            if (!svg) return;
            const blob = new Blob([svg], {
                type: "image/svg+xml;charset=utf-8",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `findr-incat-${tag.publicCode}.svg`;
            a.click();
            URL.revokeObjectURL(url);
        }
    };

    const printableTags = myTags.filter(
        (t) => selectedTagIds.has(t.id) && !t.revokedAt,
    );

    const vaultCount = getCapabilityVault().length;

    return (
        <div className="space-y-6">
            {/* Screen-Only Controls & Tag Management */}
            <div className="no-print space-y-6">
                {/* Top Header + Create Tag CTA */}
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
                    <div>
                        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                            <QrCode className="h-4 w-4" />
                            <span>
                                Zero-Login QR Tag Studio &middot; My Items
                            </span>
                        </div>
                        <h2 className="mt-1 text-lg font-bold text-neutral-100 sm:text-xl">
                            Protect Your Campus Belongings with Printable QR
                            Stickers
                        </h2>
                        <p className="mt-0.5 text-xs text-neutral-400">
                            Anyone at INCAT who scans your sticker with their
                            phone camera lands on a safe recovery page—without
                            seeing your private info unless you allow it.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <button
                            type="button"
                            onClick={() => {
                                setCreatedReceipt(null);
                                setCreateError(null);
                                setCreateOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-500"
                        >
                            <Plus className="h-4 w-4" />
                            <span>Create New QR Tag</span>
                        </button>

                        {printableTags.length > 0 && (
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-xs font-semibold text-neutral-100 transition-colors hover:bg-neutral-800"
                            >
                                <Printer className="h-4 w-4 text-emerald-400" />
                                <span>
                                    Print A4 Sheet / Save PDF (
                                    {printableTags.length})
                                </span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Device Capability Vault & Recovery Bar */}
                <div className="rounded-2xl border border-neutral-800/90 bg-neutral-900/40 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 text-xs">
                            <KeyRound className="h-4 w-4 shrink-0 text-amber-400" />
                            <div>
                                <span className="font-semibold text-neutral-200">
                                    Device Key Vault ({vaultCount} saved key
                                    {vaultCount === 1 ? "" : "s"})
                                </span>
                                <span className="ml-2 text-neutral-400">
                                    No accounts are used. Back up your keys so
                                    you never lose access if you clear browser
                                    data.
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={exportRecoveryJson}
                                disabled={vaultCount === 0}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:bg-neutral-800 disabled:opacity-40"
                            >
                                <FileDown className="h-3.5 w-3.5 text-emerald-400" />
                                <span>Download Recovery JSON</span>
                            </button>

                            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:bg-neutral-800">
                                <FileUp className="h-3.5 w-3.5 text-emerald-400" />
                                <span>Import Recovery File</span>
                                <input
                                    type="file"
                                    accept="application/json,.json"
                                    onChange={handleImportRecoveryFile}
                                    className="sr-only"
                                />
                            </label>
                        </div>
                    </div>

                    {/* Paste /manage/:key link or raw capability key */}
                    <form
                        onSubmit={handleRestoreFromKeyOrLink}
                        className="mt-3 flex flex-wrap items-center gap-2"
                    >
                        <div className="relative flex-1">
                            <Link2 className="pointer-events-none absolute top-2.5 left-3 h-3.5 w-3.5 text-neutral-500" />
                            <input
                                type="text"
                                value={recoveryInput}
                                onChange={(e) =>
                                    setRecoveryInput(e.target.value)
                                }
                                placeholder="Paste a /manage/:key link or secret key to restore an item on this device..."
                                aria-label="Restore capability key or link"
                                className="w-full rounded-lg border border-neutral-800 bg-neutral-950 py-1.5 pr-3 pl-8 text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none"
                            />
                        </div>
                        <button
                            type="submit"
                            className="rounded-lg bg-neutral-800 px-3.5 py-1.5 text-xs font-semibold text-neutral-200 hover:bg-neutral-700"
                        >
                            Restore Key
                        </button>
                    </form>

                    {recoveryNotice && (
                        <p className="mt-2 text-xs text-emerald-300">
                            {recoveryNotice}
                        </p>
                    )}
                </div>

                {/* My Tags Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {[1, 2].map((n) => (
                            <div
                                key={n}
                                className="h-52 animate-pulse rounded-2xl border border-neutral-800 bg-neutral-900/60"
                            />
                        ))}
                    </div>
                ) : error ? (
                    <div className="rounded-2xl border border-rose-500/40 bg-rose-950/20 p-5 text-xs text-rose-200">
                        {error}
                    </div>
                ) : myTags.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-950/60 p-10 text-center">
                        <QrCode className="mx-auto h-10 w-10 text-emerald-400/80" />
                        <h3 className="mt-3 text-sm font-bold text-neutral-100">
                            No QR Tags on This Device Yet
                        </h3>
                        <p className="mx-auto mt-1 max-w-md text-xs text-neutral-400">
                            Create a tag for your calculator, ID lanyard,
                            tumbler, or wallet to generate a printable QR
                            sticker sheet—or import your recovery file above.
                        </p>
                        <button
                            type="button"
                            onClick={() => setCreateOpen(true)}
                            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                        >
                            <Plus className="h-4 w-4" />
                            <span>Create Your First Tag</span>
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {myTags.map((tag) => {
                            const qrPng = qrDataUrls[tag.publicCode];
                            const isSelectedForPrint = selectedTagIds.has(
                                tag.id,
                            );
                            const isRevoked = Boolean(tag.revokedAt);

                            return (
                                <div
                                    key={tag.id}
                                    className={`flex flex-col justify-between rounded-2xl border p-4 transition-all ${
                                        isRevoked
                                            ? "border-neutral-800/60 bg-neutral-950/40 opacity-65"
                                            : tag.lostMode
                                              ? "border-rose-500/60 bg-rose-950/15 shadow-lg"
                                              : "border-neutral-800 bg-neutral-950"
                                    }`}
                                >
                                    <div className="flex items-start gap-4">
                                        {/* QR Preview Box */}
                                        <div className="flex shrink-0 flex-col items-center gap-1.5">
                                            <div className="h-24 w-24 overflow-hidden rounded-xl border border-neutral-700 bg-white p-1.5">
                                                {qrPng ? (
                                                    <img
                                                        src={qrPng}
                                                        alt={`QR code for ${tag.label}`}
                                                        className="h-full w-full object-contain"
                                                    />
                                                ) : (
                                                    <div className="h-full w-full animate-pulse bg-neutral-200" />
                                                )}
                                            </div>
                                            <span className="font-mono text-[11px] font-bold text-emerald-400">
                                                #{tag.publicCode}
                                            </span>
                                        </div>

                                        {/* Tag Metadata & Stats */}
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                {isRevoked ? (
                                                    <span className="rounded-md bg-neutral-800 px-2 py-0.5 text-[10px] font-bold text-neutral-400 uppercase">
                                                        Revoked
                                                    </span>
                                                ) : tag.lostMode ? (
                                                    <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-300 uppercase">
                                                        <BellRing className="h-3 w-3" />
                                                        Lost Mode Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300 uppercase">
                                                        <ShieldCheck className="h-3 w-3" />
                                                        Protected
                                                    </span>
                                                )}

                                                {tag.unreadMessageCount > 0 && (
                                                    <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-neutral-950">
                                                        {tag.unreadMessageCount}{" "}
                                                        new msg
                                                    </span>
                                                )}
                                            </div>

                                            <h3 className="mt-1.5 truncate text-base font-bold text-neutral-100">
                                                {tag.label}
                                            </h3>

                                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-400">
                                                <span>
                                                    Scans:{" "}
                                                    <strong className="text-neutral-200">
                                                        {tag.scanCount}
                                                    </strong>
                                                </span>
                                                <span>&middot;</span>
                                                <span>
                                                    Last scan:{" "}
                                                    {formatTimeAgo(
                                                        tag.lastScannedAt,
                                                    )}
                                                </span>
                                            </div>

                                            {tag.contactConfig.dropOffHub && (
                                                <div className="mt-1.5 inline-flex items-center gap-1 text-xs text-neutral-300">
                                                    <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                                                    <span>
                                                        Drop-off:{" "}
                                                        {
                                                            tag.contactConfig
                                                                .dropOffHub
                                                        }
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Tag Action Bar */}
                                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-800/80 pt-3 text-xs">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleToggleLostMode(tag)
                                                }
                                                disabled={isRevoked}
                                                className={`rounded-lg px-2.5 py-1.5 font-semibold transition-colors ${
                                                    tag.lostMode
                                                        ? "bg-rose-600 text-white hover:bg-rose-500"
                                                        : "border border-neutral-700 bg-neutral-900 text-neutral-200 hover:bg-neutral-800"
                                                }`}
                                            >
                                                {tag.lostMode
                                                    ? "Turn Off Lost Mode"
                                                    : "Mark Lost"}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleOpenInbox(tag)
                                                }
                                                className="inline-flex items-center gap-1 rounded-lg border border-neutral-700 bg-neutral-900 px-2.5 py-1.5 font-medium text-neutral-200 hover:bg-neutral-800"
                                            >
                                                <Inbox className="h-3.5 w-3.5 text-emerald-400" />
                                                <span>Messages & Scans</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setPreviewPublicCode(
                                                        tag.publicCode,
                                                    );
                                                    onPreviewTagCode?.(
                                                        tag.publicCode,
                                                    );
                                                }}
                                                className="inline-flex items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-900/70 px-2.5 py-1.5 text-neutral-300 hover:bg-neutral-800"
                                                title="Preview what a finder sees when scanning"
                                            >
                                                <Eye className="h-3.5 w-3.5" />
                                                <span>Finder Page</span>
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    downloadStickerAsset(
                                                        tag,
                                                        "png",
                                                    )
                                                }
                                                className="rounded-lg border border-neutral-800 px-2 py-1 text-[11px] text-neutral-300 hover:bg-neutral-800"
                                                title="Download QR as PNG"
                                            >
                                                PNG
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    downloadStickerAsset(
                                                        tag,
                                                        "svg",
                                                    )
                                                }
                                                className="rounded-lg border border-neutral-800 px-2 py-1 text-[11px] text-neutral-300 hover:bg-neutral-800"
                                                title="Download QR as SVG"
                                            >
                                                SVG
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleRegenerateCode(tag)
                                                }
                                                className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
                                                title="Regenerate QR code (invalidates old sticker)"
                                            >
                                                <RefreshCw className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleToggleRevoke(tag)
                                                }
                                                className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-amber-400"
                                                title={
                                                    isRevoked
                                                        ? "Reactivate tag"
                                                        : "Revoke tag"
                                                }
                                            >
                                                <ShieldAlert className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleDeleteTag(tag)
                                                }
                                                className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-rose-400"
                                                title="Delete tag"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Print Selection Checkbox */}
                                    {!isRevoked && (
                                        <label className="mt-2.5 flex cursor-pointer items-center gap-2 text-[11px] text-neutral-400">
                                            <input
                                                type="checkbox"
                                                checked={isSelectedForPrint}
                                                onChange={(e) => {
                                                    setSelectedTagIds(
                                                        (prev) => {
                                                            const next =
                                                                new Set(prev);
                                                            if (
                                                                e.target.checked
                                                            )
                                                                next.add(
                                                                    tag.id,
                                                                );
                                                            else
                                                                next.delete(
                                                                    tag.id,
                                                                );
                                                            return next;
                                                        },
                                                    );
                                                }}
                                                className="h-3.5 w-3.5 rounded border-neutral-600 text-emerald-600"
                                            />
                                            <span>
                                                Include on printable A4 sticker
                                                sheet below
                                            </span>
                                        </label>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Sticker Sheet Controls Bar */}
                {printableTags.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-800 bg-neutral-950 px-5 py-3.5 text-xs">
                        <div className="flex items-center gap-3">
                            <span className="font-semibold text-neutral-200">
                                Printable A4 Sticker Sheet Preview
                            </span>
                            <div className="inline-flex rounded-lg border border-neutral-800 bg-neutral-900 p-0.5">
                                <button
                                    type="button"
                                    onClick={() => setStickerSize("small")}
                                    className={`rounded-md px-2.5 py-1 font-medium ${
                                        stickerSize === "small"
                                            ? "bg-emerald-600 text-white"
                                            : "text-neutral-400 hover:text-neutral-200"
                                    }`}
                                >
                                    Small (3-col)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStickerSize("medium")}
                                    className={`rounded-md px-2.5 py-1 font-medium ${
                                        stickerSize === "medium"
                                            ? "bg-emerald-600 text-white"
                                            : "text-neutral-400 hover:text-neutral-200"
                                    }`}
                                >
                                    Medium (2-col)
                                </button>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500"
                        >
                            <Printer className="h-4 w-4" />
                            <span>Print Stickers / Save as PDF</span>
                        </button>
                    </div>
                )}
            </div>

            {/* PRINTABLE A4 STICKER SHEET (Visible on screen preview AND exclusively when printing) */}
            {printableTags.length > 0 && (
                <div
                    id="findr-printable-sheet"
                    className="print-sheet rounded-2xl border border-neutral-800 bg-white p-6 text-neutral-900 shadow-xl"
                >
                    <div className="mb-4 flex items-center justify-between border-b border-neutral-200 pb-3">
                        <div>
                            <div className="text-sm font-extrabold tracking-tight text-emerald-950">
                                FINDR INCAT &middot; CAMPUS RECOVERY STICKERS
                            </div>
                            <div className="text-[11px] text-neutral-600">
                                Cut along the dashed lines and stick onto your
                                calculator, ID holder, tumbler, or charger.
                                Cover with clear tape for waterproofing.
                            </div>
                        </div>
                        <div className="text-right font-mono text-[11px] text-neutral-500">
                            myfindr.pages.dev
                        </div>
                    </div>

                    <div
                        className={
                            stickerSize === "small"
                                ? "grid grid-cols-2 gap-3 sm:grid-cols-3"
                                : "grid grid-cols-1 gap-4 sm:grid-cols-2"
                        }
                    >
                        {printableTags.map((tag) => {
                            const qrPng = qrDataUrls[tag.publicCode];
                            return (
                                <div
                                    key={tag.id}
                                    className={`flex items-center gap-3.5 rounded-xl border-2 border-dashed border-neutral-400 bg-white ${
                                        stickerSize === "small"
                                            ? "p-2.5"
                                            : "p-3.5"
                                    }`}
                                >
                                    <div
                                        className={`shrink-0 rounded-lg border border-neutral-300 bg-white p-1 ${
                                            stickerSize === "small"
                                                ? "h-20 w-20"
                                                : "h-28 w-28"
                                        }`}
                                    >
                                        {qrPng && (
                                            <img
                                                src={qrPng}
                                                alt={`Sticker QR for ${tag.label}`}
                                                className="h-full w-full object-contain"
                                            />
                                        )}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="inline-flex items-center gap-1 rounded bg-emerald-900 px-1.5 py-0.5 text-[9px] font-extrabold tracking-wider text-white uppercase">
                                            <span>FINDR INCAT</span>
                                            <span>&middot;</span>
                                            <span>#{tag.publicCode}</span>
                                        </div>

                                        <div
                                            className={`mt-1 font-extrabold text-neutral-950 ${
                                                stickerSize === "small"
                                                    ? "text-xs"
                                                    : "text-sm"
                                            }`}
                                        >
                                            Found this? Scan me!
                                        </div>

                                        <div className="text-[10px] font-medium text-neutral-700">
                                            If found, please scan &bull; Kapag
                                            napulot, i-scan po
                                        </div>

                                        <div className="mt-1.5 truncate border-t border-neutral-200 pt-1 text-xs font-bold text-emerald-950">
                                            {tag.label}
                                        </div>

                                        {tag.contactConfig.dropOffHub && (
                                            <div className="truncate text-[10px] text-neutral-600">
                                                Drop-off:{" "}
                                                {tag.contactConfig.dropOffHub}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* CREATE TAG MODAL */}
            {createOpen && (
                <div
                    className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
                    role="dialog"
                    aria-modal="true"
                >
                    <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-950 p-5 text-neutral-100 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                            <h3 className="text-base font-bold">
                                {createdReceipt
                                    ? "QR Tag Created — Save Your Manage Key"
                                    : "Create Printable Findr QR Tag"}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setCreateOpen(false)}
                                className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-800"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {createdReceipt ? (
                            <div className="mt-4 space-y-4 text-xs">
                                <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/25 p-4">
                                    <div className="flex items-center gap-2 text-sm font-bold text-emerald-300">
                                        <Sparkles className="h-4 w-4" />
                                        <span>
                                            Tag #{createdReceipt.tag.publicCode}{" "}
                                            is ready to print!
                                        </span>
                                    </div>
                                    <p className="mt-1 text-neutral-300">
                                        The QR code encodes only{" "}
                                        <code className="text-emerald-300">
                                            {getTagPublicUrl(
                                                createdReceipt.tag.publicCode,
                                            )}
                                        </code>
                                        . Your personal contact data is never
                                        embedded inside the QR image itself.
                                    </p>
                                </div>

                                <div className="rounded-xl border border-amber-500/50 bg-amber-950/20 p-4">
                                    <div className="flex items-center gap-2 font-bold text-amber-300">
                                        <AlertTriangle className="h-4 w-4" />
                                        <span>
                                            Important: Save your secret Manage
                                            Key (shown once)
                                        </span>
                                    </div>
                                    <p className="mt-1 text-neutral-300">
                                        Because Findr has no user accounts,
                                        losing this key means losing control of
                                        this tag if you clear your browser or
                                        switch phones. There is no password
                                        reset.
                                    </p>

                                    <div className="mt-3 flex items-center gap-2">
                                        <input
                                            type="text"
                                            readOnly
                                            value={`${window.location.origin}${createdReceipt.manageUrl}`}
                                            className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 font-mono text-xs text-emerald-300"
                                        />
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                await navigator.clipboard.writeText(
                                                    `${window.location.origin}${createdReceipt.manageUrl}`,
                                                );
                                                setCopiedReceipt(true);
                                                setTimeout(
                                                    () =>
                                                        setCopiedReceipt(false),
                                                    2000,
                                                );
                                            }}
                                            className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 font-semibold text-white hover:bg-emerald-500"
                                        >
                                            {copiedReceipt ? (
                                                <>
                                                    <Check className="h-3.5 w-3.5" />
                                                    <span>Copied</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="h-3.5 w-3.5" />
                                                    <span>Copy Link</span>
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={exportRecoveryJson}
                                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 font-medium text-neutral-200 hover:bg-neutral-800"
                                    >
                                        <Download className="h-3.5 w-3.5 text-emerald-400" />
                                        <span>Download Recovery JSON File</span>
                                    </button>
                                </div>

                                <div className="flex justify-end pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setCreateOpen(false)}
                                        className="rounded-xl bg-emerald-600 px-5 py-2 font-semibold text-white hover:bg-emerald-500"
                                    >
                                        Done & View Sticker
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <form
                                onSubmit={handleCreateTag}
                                className="mt-4 space-y-4"
                            >
                                {createError && (
                                    <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-3 text-xs text-rose-200">
                                        {createError}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div>
                                        <label
                                            htmlFor="tag-label"
                                            className="mb-1 block text-xs font-medium text-neutral-300"
                                        >
                                            Item Name / Label *
                                        </label>
                                        <input
                                            id="tag-label"
                                            type="text"
                                            required
                                            maxLength={80}
                                            value={label}
                                            onChange={(e) =>
                                                setLabel(e.target.value)
                                            }
                                            placeholder="e.g., Casio fx-991EX Calculator"
                                            className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs text-neutral-100"
                                        />
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="tag-item-type"
                                            className="mb-1 block text-xs font-medium text-neutral-300"
                                        >
                                            Item Category *
                                        </label>
                                        <select
                                            id="tag-item-type"
                                            value={itemType}
                                            onChange={(e) =>
                                                setItemType(
                                                    e.target
                                                        .value as ItemCategory,
                                                )
                                            }
                                            className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs text-neutral-100"
                                        >
                                            {ITEM_TYPE_OPTIONS.map((opt) => (
                                                <option
                                                    key={opt.value}
                                                    value={opt.value}
                                                >
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-medium text-neutral-300">
                                        Optional Item Photo (Shown on finder
                                        page)
                                    </label>
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        onChange={(e) =>
                                            setPhotoFile(
                                                e.target.files?.[0] ?? null,
                                            )
                                        }
                                        className="w-full text-xs text-neutral-400 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-800 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-neutral-200"
                                    />
                                </div>

                                <ContactMatrix
                                    value={contactConfig}
                                    onChange={setContactConfig}
                                    compact
                                />

                                {needsCampusCode && (
                                    <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-3">
                                        <label
                                            htmlFor="tag-campus-code"
                                            className="block text-xs font-semibold text-amber-200"
                                        >
                                            INCAT Campus Access Code
                                        </label>
                                        <input
                                            id="tag-campus-code"
                                            type="text"
                                            value={campusCode}
                                            onChange={(e) =>
                                                setCampusCode(e.target.value)
                                            }
                                            placeholder="Enter campus code (e.g., INCAT2026)"
                                            className="mt-1.5 w-full rounded-lg border border-amber-500/40 bg-neutral-950 px-3 py-1.5 text-xs text-neutral-100"
                                        />
                                    </div>
                                )}

                                <div className="flex items-center justify-end gap-2 border-t border-neutral-800 pt-3">
                                    <button
                                        type="button"
                                        onClick={() => setCreateOpen(false)}
                                        className="rounded-xl border border-neutral-800 px-4 py-2 text-xs text-neutral-300"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={creating}
                                        className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                                    >
                                        {creating
                                            ? "Generating QR Tag..."
                                            : "Generate QR Sticker"}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* RELAY MESSAGES & SCAN EVENTS MODAL */}
            {inboxTag && (
                <div
                    className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
                    role="dialog"
                    aria-modal="true"
                >
                    <div className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-950 p-5 text-neutral-100 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                            <div>
                                <h3 className="text-base font-bold">
                                    {inboxTag.label}
                                </h3>
                                <p className="text-xs text-neutral-400">
                                    Tag #{inboxTag.publicCode} &middot; Finder
                                    Messages & Scan Log
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setInboxTag(null)}
                                className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-800"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {inboxLoading ? (
                            <div className="space-y-3 py-6">
                                <div className="h-16 animate-pulse rounded-xl bg-neutral-900" />
                                <div className="h-16 animate-pulse rounded-xl bg-neutral-900" />
                            </div>
                        ) : (
                            <div className="mt-4 space-y-5 text-xs">
                                <div>
                                    <h4 className="font-semibold tracking-wider text-neutral-300 uppercase">
                                        Finder Relay Messages (
                                        {inboxMessages.length})
                                    </h4>
                                    {inboxMessages.length === 0 ? (
                                        <p className="mt-2 rounded-xl border border-neutral-800/80 bg-neutral-900/40 p-3 text-neutral-400">
                                            No messages yet for this tag.
                                        </p>
                                    ) : (
                                        <div className="mt-2 space-y-2.5">
                                            {inboxMessages.map((m) => (
                                                <div
                                                    key={m.id}
                                                    className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-3.5"
                                                >
                                                    <div className="flex items-center justify-between text-[11px] text-neutral-400">
                                                        <span>
                                                            {formatTimeAgo(
                                                                m.createdAt,
                                                            )}
                                                        </span>
                                                        {m.foundAtHub && (
                                                            <span className="rounded bg-emerald-500/15 px-2 py-0.5 font-medium text-emerald-300">
                                                                Hub:{" "}
                                                                {m.foundAtHub}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="mt-1.5 text-neutral-100">
                                                        {m.body}
                                                    </p>
                                                    {m.finderContact && (
                                                        <div className="mt-2 border-t border-neutral-800 pt-1.5 text-emerald-300">
                                                            Finder contact:{" "}
                                                            <strong>
                                                                {
                                                                    m.finderContact
                                                                }
                                                            </strong>
                                                        </div>
                                                    )}
                                                    {m.approxLocation && (
                                                        <div className="mt-1 text-[11px] text-neutral-400">
                                                            Shared GPS:{" "}
                                                            {
                                                                m.approxLocation
                                                                    .lat
                                                            }
                                                            ,{" "}
                                                            {
                                                                m.approxLocation
                                                                    .lng
                                                            }
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <h4 className="font-semibold tracking-wider text-neutral-300 uppercase">
                                        Recent Scan Events ({inboxScans.length})
                                    </h4>
                                    {inboxScans.length === 0 ? (
                                        <p className="mt-2 text-neutral-500">
                                            No scans recorded yet.
                                        </p>
                                    ) : (
                                        <ul className="mt-2 divide-y divide-neutral-800 rounded-xl border border-neutral-800 bg-neutral-900/40">
                                            {inboxScans.map((s) => (
                                                <li
                                                    key={s.id}
                                                    className="flex items-center justify-between px-3 py-2 text-neutral-300"
                                                >
                                                    <span>
                                                        Scanned{" "}
                                                        {formatTimeAgo(
                                                            s.scannedAt,
                                                        )}
                                                    </span>
                                                    {s.approxLocation ? (
                                                        <span className="font-mono text-[11px] text-emerald-400">
                                                            GPS:{" "}
                                                            {
                                                                s.approxLocation
                                                                    .lat
                                                            }
                                                            ,{" "}
                                                            {
                                                                s.approxLocation
                                                                    .lng
                                                            }
                                                        </span>
                                                    ) : (
                                                        <span className="text-[11px] text-neutral-500">
                                                            No GPS shared
                                                        </span>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* PUBLIC FINDER PAGE PREVIEW MODAL */}
            {previewPublicCode && (
                <div
                    className="no-print fixed inset-0 z-50 overflow-y-auto bg-black/85 p-4 backdrop-blur-sm"
                    role="dialog"
                    aria-modal="true"
                >
                    <div className="mx-auto max-w-lg pt-4">
                        <PublicTagPage
                            publicCode={previewPublicCode}
                            previewMode
                            onBack={() => setPreviewPublicCode(null)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default QrStickerStudio;
