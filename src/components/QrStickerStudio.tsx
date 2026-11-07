import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
    AlertTriangle,
    BellRing,
    Check,
    Clock,
    Copy,
    Download,
    Eye,
    FileDown,
    FileUp,
    Inbox,
    KeyRound,
    Link2,
    MapPin,
    MessageSquare,
    Plus,
    Printer,
    QrCode,
    RefreshCw,
    ScanLine,
    Scissors,
    ShieldAlert,
    ShieldCheck,
    Sparkles,
    Trash2,
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
import { SPRING_SNAPPY } from "../lib/motion";
import { renderQrToDataUrl, renderQrToSvgString } from "../lib/qrGenerator";
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
import {
    Button,
    Card,
    EmptyState,
    Input,
    Modal,
    Select,
    Skeleton,
    useToast,
} from "./ui/primitives";

export interface QrStickerStudioProps {
    onPreviewTagCode?: (publicCode: string) => void;
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

type TimelineEntry =
    | { kind: "message"; timestamp: number; data: TagMessage }
    | { kind: "scan"; timestamp: number; data: ScanEvent };

export const QrStickerStudio: React.FC<QrStickerStudioProps> = ({
    onPreviewTagCode,
    onTagsChanged,
}) => {
    const { showToast } = useToast();
    const [myTags, setMyTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});
    const [qrSvgStrings, setQrSvgStrings] = useState<Record<string, string>>(
        {},
    );

    const [stickerSize, setStickerSize] = useState<"small" | "medium">(
        "medium",
    );
    const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(
        new Set(),
    );

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

    const [recoveryInput, setRecoveryInput] = useState("");
    const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null);

    const [inboxTag, setInboxTag] = useState<Tag | null>(null);
    const [inboxMessages, setInboxMessages] = useState<TagMessage[]>([]);
    const [inboxScans, setInboxScans] = useState<ScanEvent[]>([]);
    const [inboxLoading, setInboxLoading] = useState(false);

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
        } catch (err: unknown) {
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

    useEffect(() => {
        let active = true;
        async function generateAllQrs() {
            const nextPng: Record<string, string> = {};
            const nextSvg: Record<string, string> = {};

            for (const t of myTags) {
                const url = getTagPublicUrl(t.publicCode);
                try {
                    nextSvg[t.publicCode] = renderQrToSvgString(url, {
                        dark: "#1c1917",
                        light: "#ffffff",
                        margin: 2,
                    });
                    nextPng[t.publicCode] = await renderQrToDataUrl(url, {
                        width: 360,
                        dark: "#1c1917",
                        light: "#ffffff",
                        margin: 2,
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
            showToast(`Tag #${res.tag.publicCode} created!`, "success");
            await loadTags();
        } catch (err: unknown) {
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
                'Optional note shown on the finder banner (e.g., "Left in ICT Lab 2, please drop off at Guidance Office"):',
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
            showToast(
                nextLost
                    ? `Lost Mode enabled for ${tag.label}`
                    : `Lost Mode turned off for ${tag.label}`,
                nextLost ? "info" : "success",
            );
        } catch (err: unknown) {
            showToast(
                err instanceof Error
                    ? err.message
                    : "Failed to update Lost Mode.",
                "error",
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
            showToast(`New code #${updated.publicCode} generated`, "info");
        } catch (err: unknown) {
            showToast(
                err instanceof Error
                    ? err.message
                    : "Failed to regenerate code.",
                "error",
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
            showToast(
                isCurrentlyRevoked ? "Tag reactivated" : "Tag deactivated",
                "info",
            );
        } catch (err: unknown) {
            showToast(
                err instanceof Error
                    ? err.message
                    : "Failed to update tag state.",
                "error",
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
            showToast("Tag deleted", "info");
        } catch (err: unknown) {
            showToast(
                err instanceof Error ? err.message : "Failed to delete tag.",
                "error",
            );
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
            setMyTags((prev) =>
                prev.map((t) =>
                    t.id === tag.id ? { ...t, unreadMessageCount: 0 } : t,
                ),
            );
        } catch (err: unknown) {
            showToast(
                err instanceof Error ? err.message : "Failed to load timeline.",
                "error",
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

        const match = raw.match(/\/manage\/([A-Za-z0-9_-]+)/);
        const extractedKey = match ? match[1] : raw;

        try {
            const restored = await api.restoreCapabilityKey(extractedKey);
            setRecoveryInput("");
            setRecoveryNotice(
                `Restored ${restored.kind.toUpperCase()}: "${restored.label}" to this device!`,
            );
            showToast(`Restored "${restored.label}"`, "success");
            await loadTags();
        } catch (err: unknown) {
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
            showToast(`Imported ${items.length} key(s)`, "success");
            await loadTags();
        } catch (err: unknown) {
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

    // Unified chronological timeline combining messages & scan events
    const timelineItems = useMemo<TimelineEntry[]>(() => {
        const entries: TimelineEntry[] = [
            ...inboxMessages.map(
                (m): TimelineEntry => ({
                    kind: "message",
                    timestamp: new Date(m.createdAt).getTime() || 0,
                    data: m,
                }),
            ),
            ...inboxScans.map(
                (s): TimelineEntry => ({
                    kind: "scan",
                    timestamp: new Date(s.scannedAt).getTime() || 0,
                    data: s,
                }),
            ),
        ];
        return entries.sort((a, b) => b.timestamp - a.timestamp);
    }, [inboxMessages, inboxScans]);

    const printableTags = myTags.filter(
        (t) => selectedTagIds.has(t.id) && !t.revokedAt,
    );

    const vaultCount = getCapabilityVault().length;

    return (
        <div className="space-y-6">
            <div className="no-print space-y-6">
                {/* Studio Header Card */}
                <Card className="p-5 sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="max-w-xl">
                            <div className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
                                <QrCode className="h-3.5 w-3.5" />
                                <span>My Items &middot; Printable QR Tags</span>
                            </div>
                            <h2 className="font-display mt-2 text-xl font-bold text-text sm:text-2xl">
                                Protect Your Campus Belongings with QR Stickers
                            </h2>
                            <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                                Anyone at INCAT who scans your sticker with
                                their phone camera lands on a calm recovery page
                                without seeing your private number unless you
                                choose to share it.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5">
                            <Button
                                variant="primary"
                                onClick={() => {
                                    setCreatedReceipt(null);
                                    setCreateError(null);
                                    setCreateOpen(true);
                                }}
                                leftIcon={<Plus className="h-4 w-4" />}
                            >
                                Create New QR Tag
                            </Button>

                            {printableTags.length > 0 && (
                                <Button
                                    variant="secondary"
                                    onClick={() => window.print()}
                                    leftIcon={
                                        <Printer className="h-4 w-4 text-accent" />
                                    }
                                >
                                    Print A4 Sheet ({printableTags.length})
                                </Button>
                            )}
                        </div>
                    </div>
                </Card>

                {/* Tag Cards Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {[1, 2].map((n) => (
                            <Skeleton
                                key={n}
                                className="h-56 w-full rounded-2xl"
                            />
                        ))}
                    </div>
                ) : error ? (
                    <Card className="border-danger/40 bg-danger-bg p-5 text-xs font-medium text-danger">
                        {error}
                    </Card>
                ) : myTags.length === 0 ? (
                    <EmptyState
                        title="No QR Tags on This Device Yet"
                        description="Create a tag for your calculator, ID lanyard, tumbler, or wallet to generate a printable A4 sticker sheet—or restore your keys below."
                        action={
                            <Button
                                variant="primary"
                                onClick={() => setCreateOpen(true)}
                                leftIcon={<Plus className="h-4 w-4" />}
                            >
                                Create Your First Tag
                            </Button>
                        }
                    />
                ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {myTags.map((tag) => {
                            const qrPng = qrDataUrls[tag.publicCode];
                            const isSelectedForPrint = selectedTagIds.has(
                                tag.id,
                            );
                            const isRevoked = Boolean(tag.revokedAt);

                            return (
                                <Card
                                    key={tag.id}
                                    className={`flex flex-col justify-between p-4 sm:p-5 transition-all ${
                                        isRevoked
                                            ? "opacity-60"
                                            : tag.lostMode
                                              ? "border-lost-border bg-lost-bg/35"
                                              : ""
                                    }`}
                                >
                                    <div>
                                        <div className="flex items-start gap-4">
                                            {/* QR Preview Thumbnail */}
                                            <div className="flex shrink-0 flex-col items-center gap-1.5">
                                                <div className="h-24 w-24 overflow-hidden rounded-xl border border-border-strong bg-white p-1.5 shadow-sm">
                                                    {qrPng ? (
                                                        <img
                                                            src={qrPng}
                                                            alt={`QR code for ${tag.label}`}
                                                            className="h-full w-full object-contain"
                                                        />
                                                    ) : (
                                                        <Skeleton className="h-full w-full" />
                                                    )}
                                                </div>
                                                <span className="font-mono text-[11px] font-bold text-accent">
                                                    #{tag.publicCode}
                                                </span>
                                            </div>

                                            {/* Tag Metadata & Animated Lost Mode Switch */}
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        {isRevoked ? (
                                                            <span className="rounded-full border border-border bg-subtle px-2.5 py-0.5 text-[10px] font-bold text-muted uppercase">
                                                                Deactivated
                                                            </span>
                                                        ) : tag.lostMode ? (
                                                            <span className="inline-flex items-center gap-1 rounded-full border border-lost-border bg-lost-bg px-2.5 py-0.5 text-[10px] font-bold text-lost uppercase">
                                                                <BellRing className="h-3 w-3" />
                                                                Lost Mode ON
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 rounded-full border border-accent/25 bg-accent-soft px-2.5 py-0.5 text-[10px] font-bold text-accent uppercase">
                                                                <ShieldCheck className="h-3 w-3" />
                                                                Protected
                                                            </span>
                                                        )}

                                                        {tag.unreadMessageCount >
                                                            0 && (
                                                            <span className="rounded-full bg-highlight px-2 py-0.5 text-[10px] font-extrabold text-white">
                                                                {
                                                                    tag.unreadMessageCount
                                                                }{" "}
                                                                unread
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Animated Lost-Mode Switch */}
                                                    {!isRevoked && (
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-[11px] font-semibold text-muted">
                                                                Lost mode
                                                            </span>
                                                            <button
                                                                type="button"
                                                                role="switch"
                                                                aria-checked={
                                                                    tag.lostMode
                                                                }
                                                                aria-label={`Toggle Lost Mode for ${tag.label}`}
                                                                onClick={() =>
                                                                    handleToggleLostMode(
                                                                        tag,
                                                                    )
                                                                }
                                                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors ${
                                                                    tag.lostMode
                                                                        ? "border-lost bg-lost"
                                                                        : "border-border-strong bg-subtle"
                                                                }`}
                                                            >
                                                                <motion.span
                                                                    layout
                                                                    transition={
                                                                        SPRING_SNAPPY
                                                                    }
                                                                    className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm ${
                                                                        tag.lostMode
                                                                            ? "translate-x-5"
                                                                            : "translate-x-1"
                                                                    }`}
                                                                />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                <h3 className="font-display mt-2 truncate text-base font-bold text-text">
                                                    {tag.label}
                                                </h3>

                                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                                                    <span>
                                                        Scans:{" "}
                                                        <strong className="text-text">
                                                            {tag.scanCount}
                                                        </strong>
                                                    </span>
                                                    <span>&middot;</span>
                                                    <span>
                                                        Last scan:{" "}
                                                        <strong className="text-text-secondary">
                                                            {formatTimeAgo(
                                                                tag.lastScannedAt,
                                                            )}
                                                        </strong>
                                                    </span>
                                                </div>

                                                {tag.contactConfig
                                                    .dropOffHub && (
                                                    <div className="mt-1.5 inline-flex items-center gap-1 text-xs text-text-secondary">
                                                        <MapPin className="h-3.5 w-3.5 text-accent" />
                                                        <span>
                                                            Drop-off:{" "}
                                                            {
                                                                tag
                                                                    .contactConfig
                                                                    .dropOffHub
                                                            }
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card Actions Bar */}
                                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() =>
                                                    handleOpenInbox(tag)
                                                }
                                                leftIcon={
                                                    <Inbox className="h-3.5 w-3.5 text-accent" />
                                                }
                                            >
                                                Timeline
                                                {tag.unreadMessageCount > 0 && (
                                                    <span className="ml-1 rounded-full bg-highlight px-1.5 py-0.2 text-[10px] font-bold text-white">
                                                        {tag.unreadMessageCount}
                                                    </span>
                                                )}
                                            </Button>

                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setPreviewPublicCode(
                                                        tag.publicCode,
                                                    );
                                                    onPreviewTagCode?.(
                                                        tag.publicCode,
                                                    );
                                                }}
                                                leftIcon={
                                                    <Eye className="h-3.5 w-3.5" />
                                                }
                                            >
                                                Finder View
                                            </Button>
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
                                                className="rounded-lg border border-border bg-subtle px-2 py-1 text-[11px] font-semibold text-text-secondary hover:bg-surface hover:text-text cursor-pointer"
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
                                                className="rounded-lg border border-border bg-subtle px-2 py-1 text-[11px] font-semibold text-text-secondary hover:bg-surface hover:text-text cursor-pointer"
                                                title="Download QR as SVG"
                                            >
                                                SVG
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleRegenerateCode(tag)
                                                }
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-subtle hover:text-text cursor-pointer"
                                                title="Regenerate QR code (invalidates old sticker)"
                                                aria-label="Regenerate QR code"
                                            >
                                                <RefreshCw className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleToggleRevoke(tag)
                                                }
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-subtle hover:text-found cursor-pointer"
                                                title={
                                                    isRevoked
                                                        ? "Reactivate tag"
                                                        : "Deactivate tag"
                                                }
                                                aria-label={
                                                    isRevoked
                                                        ? "Reactivate tag"
                                                        : "Deactivate tag"
                                                }
                                            >
                                                <ShieldAlert className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleDeleteTag(tag)
                                                }
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-subtle hover:text-danger cursor-pointer"
                                                title="Delete tag"
                                                aria-label="Delete tag"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    {!isRevoked && (
                                        <label className="mt-2.5 flex cursor-pointer items-center gap-2 text-[11px] font-medium text-muted">
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
                                                className="h-3.5 w-3.5 rounded border-border-strong accent-accent"
                                            />
                                            <span>
                                                Include on A4 printable sticker
                                                sheet
                                            </span>
                                        </label>
                                    )}
                                </Card>
                            );
                        })}
                    </div>
                )}

                {/* Safe & Obvious Manage-Link / Device Recovery Vault (Warning Style) */}
                <Card className="border-found-border bg-found-bg/40 p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex items-start gap-3 text-xs">
                            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-found-bg text-found border border-found-border">
                                <KeyRound className="h-4 w-4" />
                            </div>
                            <div>
                                <div className="font-display text-sm font-bold text-text">
                                    Device Capability Vault ({vaultCount} saved
                                    key{vaultCount === 1 ? "" : "s"})
                                </div>
                                <p className="mt-0.5 max-w-xl leading-relaxed text-text-secondary">
                                    Findr INCAT uses{" "}
                                    <strong>no accounts or passwords</strong>.
                                    Download a backup of your recovery keys so
                                    you never lose control of your tags or posts
                                    if you clear browser data or change phones.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={exportRecoveryJson}
                                disabled={vaultCount === 0}
                                leftIcon={
                                    <FileDown className="h-3.5 w-3.5 text-accent" />
                                }
                            >
                                Backup Recovery JSON
                            </Button>

                            <label className="inline-flex min-h-9.5 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text shadow-sm transition-colors hover:bg-subtle">
                                <FileUp className="h-3.5 w-3.5 text-accent" />
                                <span>Import Backup File</span>
                                <input
                                    type="file"
                                    accept="application/json,.json"
                                    onChange={handleImportRecoveryFile}
                                    className="sr-only"
                                />
                            </label>
                        </div>
                    </div>

                    <form
                        onSubmit={handleRestoreFromKeyOrLink}
                        className="mt-3.5 flex flex-col gap-2 sm:flex-row sm:items-center"
                    >
                        <div className="relative flex-1">
                            <Link2 className="pointer-events-none absolute top-1/2 left-3.5 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
                            <input
                                type="text"
                                value={recoveryInput}
                                onChange={(e) =>
                                    setRecoveryInput(e.target.value)
                                }
                                placeholder="Paste a /manage/:key link or secret key to restore an item on this device..."
                                aria-label="Restore capability key or link"
                                className="min-h-10 w-full rounded-xl border border-border bg-surface py-1.5 pr-3 pl-9 text-xs text-text placeholder:text-muted focus:border-accent focus:outline-none"
                            />
                        </div>
                        <Button type="submit" variant="secondary" size="sm">
                            Restore Key
                        </Button>
                    </form>

                    {recoveryNotice && (
                        <p className="mt-2 text-xs font-semibold text-accent">
                            {recoveryNotice}
                        </p>
                    )}
                </Card>

                {/* Print Layout Controls */}
                {printableTags.length > 0 && (
                    <Card className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-xs">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="font-display text-sm font-bold text-text">
                                Printable A4 Sticker Sheet Preview
                            </span>
                            <div className="inline-flex rounded-xl border border-border bg-subtle p-1">
                                <button
                                    type="button"
                                    onClick={() => setStickerSize("small")}
                                    className={`rounded-lg px-3 py-1 font-semibold transition-colors cursor-pointer ${
                                        stickerSize === "small"
                                            ? "bg-accent text-accent-fg"
                                            : "text-text-secondary hover:text-text"
                                    }`}
                                >
                                    Compact (3-col)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStickerSize("medium")}
                                    className={`rounded-lg px-3 py-1 font-semibold transition-colors cursor-pointer ${
                                        stickerSize === "medium"
                                            ? "bg-accent text-accent-fg"
                                            : "text-text-secondary hover:text-text"
                                    }`}
                                >
                                    Standard (2-col)
                                </button>
                            </div>
                        </div>

                        <Button
                            variant="primary"
                            size="sm"
                            onClick={() => window.print()}
                            leftIcon={<Printer className="h-4 w-4" />}
                        >
                            Print or Save PDF
                        </Button>
                    </Card>
                )}
            </div>

            {/* ================================================================
             * CRISP A4 PRINTABLE STICKER SHEET (@media print)
             * ============================================================== */}
            {printableTags.length > 0 && (
                <div
                    id="findr-printable-sheet"
                    style={{
                        WebkitPrintColorAdjust: "exact",
                        printColorAdjust: "exact",
                    }}
                    className="print-sheet rounded-2xl border border-border-strong bg-white p-6 text-black shadow-md"
                >
                    <div className="mb-4 flex items-center justify-between border-b-2 border-black pb-3">
                        <div>
                            <div className="text-sm font-extrabold tracking-tight text-black">
                                FINDR INCAT &middot; CAMPUS LOST &amp; FOUND QR
                                LABELS
                            </div>
                            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-neutral-700">
                                <Scissors className="h-3.5 w-3.5" />
                                <span>
                                    Cut along the dashed cut guides. Cover with
                                    clear tape for water &amp; scratch
                                    protection.
                                </span>
                            </div>
                        </div>
                        <div className="text-right font-mono text-[11px] font-bold text-neutral-700">
                            INCAT &middot; LAOAG CITY
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
                                    className={`relative flex items-center gap-3.5 rounded-xl border-2 border-dashed border-neutral-500 bg-white text-black ${
                                        stickerSize === "small"
                                            ? "p-2.5"
                                            : "p-3.5"
                                    }`}
                                >
                                    <div
                                        className={`shrink-0 rounded-lg border-2 border-black bg-white p-1 ${
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
                                        <div className="inline-flex items-center gap-1 rounded bg-[#234b38] px-2 py-0.5 text-[9px] font-extrabold tracking-wider text-white uppercase">
                                            <span>FINDR INCAT</span>
                                            <span>&middot;</span>
                                            <span className="font-mono">
                                                #{tag.publicCode}
                                            </span>
                                        </div>

                                        <div
                                            className={`mt-1 font-extrabold leading-tight text-black ${
                                                stickerSize === "small"
                                                    ? "text-xs"
                                                    : "text-sm"
                                            }`}
                                        >
                                            Found this? Scan me
                                        </div>

                                        <div className="text-[10px] font-semibold italic text-neutral-800">
                                            Nahanap mo ba ito? I-scan ang QR
                                            code.
                                        </div>

                                        <div className="mt-1.5 truncate border-t border-neutral-300 pt-1 text-xs font-extrabold text-black">
                                            {tag.label}
                                        </div>

                                        {tag.contactConfig.dropOffHub && (
                                            <div className="truncate text-[10px] font-medium text-neutral-700">
                                                Drop off:{" "}
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

            {/* ================================================================
             * CREATE QR TAG MODAL
             * ============================================================== */}
            <Modal
                isOpen={createOpen}
                onClose={() => setCreateOpen(false)}
                title={
                    createdReceipt
                        ? "QR Tag Created — Save Your Manage Key"
                        : "Create Printable Findr QR Tag"
                }
                description={
                    createdReceipt
                        ? "Save your recovery link before closing."
                        : "Generate a privacy-safe QR sticker for your campus item."
                }
                maxWidthClass="max-w-xl"
            >
                {createdReceipt ? (
                    <div className="space-y-4 text-xs">
                        <div className="rounded-2xl border border-accent/30 bg-accent-soft p-4">
                            <div className="flex items-center gap-2 text-sm font-bold text-accent">
                                <Sparkles className="h-4 w-4" />
                                <span>
                                    Tag #{createdReceipt.tag.publicCode} is
                                    ready to print!
                                </span>
                            </div>
                            <p className="mt-1 leading-relaxed text-text-secondary">
                                The QR code encodes only{" "}
                                <code className="font-mono font-semibold text-accent">
                                    {getTagPublicUrl(
                                        createdReceipt.tag.publicCode,
                                    )}
                                </code>
                                . Your personal phone number is never embedded
                                inside the printed QR image itself.
                            </p>
                        </div>

                        <div className="rounded-2xl border border-found-border bg-found-bg p-4">
                            <div className="flex items-center gap-2 font-bold text-found">
                                <AlertTriangle className="h-4 w-4 shrink-0" />
                                <span>
                                    Important: Save your secret Manage Key
                                    (shown once)
                                </span>
                            </div>
                            <p className="mt-1 leading-relaxed text-text-secondary">
                                Because Findr has no user accounts, you need
                                this link or recovery file if you clear your
                                browser data or switch phones.
                            </p>

                            <div className="mt-3 flex items-center gap-2">
                                <input
                                    type="text"
                                    readOnly
                                    aria-label="Secret tag management URL"
                                    value={`${window.location.origin}${createdReceipt.manageUrl}`}
                                    className="min-h-10 w-full rounded-xl border border-border bg-surface px-3 py-2 font-mono text-xs text-accent"
                                />
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={async () => {
                                        await navigator.clipboard.writeText(
                                            `${window.location.origin}${createdReceipt.manageUrl}`,
                                        );
                                        setCopiedReceipt(true);
                                        setTimeout(
                                            () => setCopiedReceipt(false),
                                            2000,
                                        );
                                    }}
                                    leftIcon={
                                        copiedReceipt ? (
                                            <Check className="h-3.5 w-3.5" />
                                        ) : (
                                            <Copy className="h-3.5 w-3.5" />
                                        )
                                    }
                                >
                                    {copiedReceipt ? "Copied" : "Copy"}
                                </Button>
                            </div>

                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={exportRecoveryJson}
                                leftIcon={
                                    <Download className="h-3.5 w-3.5 text-accent" />
                                }
                                className="mt-3"
                            >
                                Download Recovery JSON File
                            </Button>
                        </div>

                        <div className="flex justify-end pt-2">
                            <Button
                                variant="primary"
                                onClick={() => setCreateOpen(false)}
                            >
                                Done &amp; View Sticker
                            </Button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleCreateTag} className="space-y-4">
                        {createError && (
                            <div className="rounded-xl border border-danger/40 bg-danger-bg p-3 text-xs font-medium text-danger">
                                {createError}
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <Input
                                id="tag-label"
                                label="Item Name / Label *"
                                required
                                maxLength={80}
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                                placeholder="e.g., Casio fx-991EX Calculator"
                            />

                            <Select
                                id="tag-item-type"
                                label="Item Category *"
                                value={itemType}
                                onChange={(e) =>
                                    setItemType(e.target.value as ItemCategory)
                                }
                            >
                                {ITEM_TYPE_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </Select>
                        </div>

                        <div>
                            <label
                                htmlFor="tag-photo-upload"
                                className="mb-1.5 block text-xs font-semibold text-text"
                            >
                                Optional Item Photo (Shown on finder page)
                            </label>
                            <input
                                id="tag-photo-upload"
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={(e) =>
                                    setPhotoFile(e.target.files?.[0] ?? null)
                                }
                                className="w-full text-xs text-muted file:mr-3 file:rounded-lg file:border file:border-border file:bg-subtle file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-text hover:file:bg-surface"
                            />
                        </div>

                        <ContactMatrix
                            value={contactConfig}
                            onChange={setContactConfig}
                            compact
                        />

                        {needsCampusCode && (
                            <div className="rounded-xl border border-found-border bg-found-bg p-3">
                                <Input
                                    id="tag-campus-code"
                                    label="INCAT Campus Access Code"
                                    value={campusCode}
                                    onChange={(e) =>
                                        setCampusCode(e.target.value)
                                    }
                                    placeholder="Enter campus code"
                                />
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
                            <Button
                                variant="secondary"
                                onClick={() => setCreateOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="primary"
                                loading={creating}
                            >
                                Generate QR Sticker
                            </Button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* ================================================================
             * UNIFIED MESSAGES & SCAN HISTORY TIMELINE MODAL
             * ============================================================== */}
            <Modal
                isOpen={Boolean(inboxTag)}
                onClose={() => setInboxTag(null)}
                title={inboxTag ? inboxTag.label : "Tag Activity Timeline"}
                description={
                    inboxTag
                        ? `Tag #${inboxTag.publicCode} · Chronological finder messages and scan events`
                        : undefined
                }
                maxWidthClass="max-w-lg"
            >
                {inboxLoading ? (
                    <div className="space-y-3 py-4">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                    </div>
                ) : timelineItems.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border-strong bg-subtle/40 p-8 text-center text-xs text-muted">
                        <Clock className="mx-auto mb-2 h-7 w-7 text-muted" />
                        <div className="font-semibold text-text">
                            No scans or messages yet
                        </div>
                        <p className="mt-1">
                            Whenever someone scans #{inboxTag?.publicCode} or
                            sends a message, it will appear here in real time.
                        </p>
                    </div>
                ) : (
                    <ol className="relative ml-3 space-y-4 border-l-2 border-border pl-5 text-xs">
                        {timelineItems.map((entry) => {
                            if (entry.kind === "message") {
                                const m = entry.data;
                                return (
                                    <li
                                        key={`msg-${m.id}`}
                                        className="relative"
                                    >
                                        <span className="absolute -left-7.25 top-1 flex h-5 w-5 items-center justify-center rounded-full border border-accent bg-accent text-accent-fg shadow-sm">
                                            <MessageSquare className="h-3 w-3" />
                                        </span>
                                        <div className="rounded-2xl border border-border bg-subtle/60 p-3.5">
                                            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted">
                                                <span className="font-bold text-accent uppercase">
                                                    Finder Message
                                                </span>
                                                <span>
                                                    {formatTimeAgo(m.createdAt)}
                                                </span>
                                            </div>
                                            <p className="mt-1.5 text-sm leading-relaxed text-text">
                                                {m.body}
                                            </p>
                                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                                {m.foundAtHub && (
                                                    <span className="inline-flex items-center gap-1 rounded-md bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">
                                                        <MapPin className="h-3 w-3" />
                                                        {m.foundAtHub}
                                                    </span>
                                                )}
                                                {m.finderContact && (
                                                    <span className="rounded-md border border-border bg-surface px-2 py-0.5 font-mono text-[11px] text-text">
                                                        Reply:{" "}
                                                        <strong>
                                                            {m.finderContact}
                                                        </strong>
                                                    </span>
                                                )}
                                                {m.approxLocation && (
                                                    <span className="font-mono text-[11px] text-muted">
                                                        GPS:{" "}
                                                        {m.approxLocation.lat},{" "}
                                                        {m.approxLocation.lng}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </li>
                                );
                            }

                            const s = entry.data;
                            return (
                                <li key={`scan-${s.id}`} className="relative">
                                    <span className="absolute -left-7.25 top-1 flex h-5 w-5 items-center justify-center rounded-full border border-border-strong bg-surface text-muted">
                                        <ScanLine className="h-3 w-3" />
                                    </span>
                                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3.5 py-2.5">
                                        <span className="font-medium text-text-secondary">
                                            QR sticker scanned{" "}
                                            <strong className="text-text">
                                                {formatTimeAgo(s.scannedAt)}
                                            </strong>
                                        </span>
                                        {s.approxLocation ? (
                                            <span className="font-mono text-[11px] text-accent">
                                                GPS: {s.approxLocation.lat},{" "}
                                                {s.approxLocation.lng}
                                            </span>
                                        ) : (
                                            <span className="text-[11px] text-muted">
                                                Standard scan
                                            </span>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                )}
            </Modal>

            {/* Finder Page Preview Modal */}
            <Modal
                isOpen={Boolean(previewPublicCode)}
                onClose={() => setPreviewPublicCode(null)}
                title="Public Finder Page Preview"
                maxWidthClass="max-w-xl"
            >
                {previewPublicCode && (
                    <PublicTagPage
                        publicCode={previewPublicCode}
                        previewMode
                        onBack={() => setPreviewPublicCode(null)}
                    />
                )}
            </Modal>
        </div>
    );
};

export default QrStickerStudio;
