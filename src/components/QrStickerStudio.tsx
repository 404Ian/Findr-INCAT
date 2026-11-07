import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
    AlertTriangle,
    BellRing,
    Check,
    CheckSquare,
    Clock,
    Copy,
    Download,
    ExternalLink,
    Eye,
    FileDown,
    FileUp,
    Inbox,
    KeyRound,
    Link2,
    MapPin,
    MessageSquare,
    Palette,
    Plus,
    Printer,
    QrCode,
    RefreshCw,
    ScanLine,
    Scissors,
    ShieldAlert,
    ShieldCheck,
    Sparkles,
    Square,
    Tag as TagIcon,
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

type StickerSize = "small" | "medium";
type StickerTheme = "industrial" | "minimal" | "stealth";

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

const CATEGORY_LABEL_MAP: Record<string, string> = Object.fromEntries(
    ITEM_TYPE_OPTIONS.map((opt) => [opt.value, opt.label]),
);

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

    const [stickerSize, setStickerSize] = useState<StickerSize>("medium");
    const [stickerTheme, setStickerTheme] =
        useState<StickerTheme>("industrial");
    const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(
        new Set(),
    );
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

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
                        dark: "#141413",
                        light: "#ffffff",
                        margin: 1,
                    });
                    nextPng[t.publicCode] = await renderQrToDataUrl(url, {
                        width: 400,
                        dark: "#141413",
                        light: "#ffffff",
                        margin: 1,
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

    const handleCopyPublicUrl = async (publicCode: string) => {
        try {
            await navigator.clipboard.writeText(getTagPublicUrl(publicCode));
            setCopiedCode(publicCode);
            showToast(`Copied link for #${publicCode}`, "success");
            setTimeout(() => {
                setCopiedCode((prev) => (prev === publicCode ? null : prev));
            }, 2000);
        } catch {
            showToast("Failed to copy link", "error");
        }
    };

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

    const activeTags = useMemo(
        () => myTags.filter((t) => !t.revokedAt),
        [myTags],
    );

    const printableTags = useMemo(
        () => myTags.filter((t) => selectedTagIds.has(t.id) && !t.revokedAt),
        [myTags, selectedTagIds],
    );

    const stats = useMemo(() => {
        const lostCount = activeTags.filter((t) => t.lostMode).length;
        const unreadCount = myTags.reduce(
            (sum, t) => sum + (t.unreadMessageCount || 0),
            0,
        );
        const totalScans = myTags.reduce(
            (sum, t) => sum + (t.scanCount || 0),
            0,
        );
        return {
            active: activeTags.length,
            lost: lostCount,
            unread: unreadCount,
            scans: totalScans,
        };
    }, [activeTags, myTags]);

    const vaultCount = getCapabilityVault().length;

    const toggleSelectAllForPrint = () => {
        if (printableTags.length === activeTags.length) {
            setSelectedTagIds(new Set());
        } else {
            setSelectedTagIds(new Set(activeTags.map((t) => t.id)));
        }
    };

    return (
        <div className="space-y-6">
            <div className="no-print space-y-6">
                {/* ============================================================
                 * STUDIO HERO & TELEMETRY BAR
                 * ========================================================== */}
                <Card className="relative overflow-hidden p-5 sm:p-6">
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-accent/8 blur-3xl"
                    />

                    <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="max-w-xl space-y-2">
                            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent-soft px-3 py-1 text-[11px] font-semibold tracking-wide text-accent uppercase">
                                <QrCode className="size-3.5" />
                                <span>QR Sticker Studio &middot; INCAT</span>
                            </div>

                            <h2 className="font-display text-xl font-bold tracking-tight text-text sm:text-2xl">
                                Smart Recovery Labels for Campus Gear
                            </h2>

                            <p className="text-xs leading-relaxed text-text-secondary sm:text-sm">
                                Generate high-contrast, privacy-first QR labels
                                for your calculator, tumbler, ID lanyard, or
                                tools. Anyone who scans your sticker gets a
                                direct recovery page without exposing your phone
                                number.
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
                                leftIcon={<Plus className="size-4" />}
                            >
                                New QR Tag
                            </Button>

                            {printableTags.length > 0 && (
                                <Button
                                    variant="secondary"
                                    onClick={() => window.print()}
                                    leftIcon={
                                        <Printer className="size-4 text-accent" />
                                    }
                                >
                                    Print Sheet ({printableTags.length})
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Quick Telemetry Strip */}
                    {myTags.length > 0 && (
                        <div className="mt-5 grid grid-cols-2 gap-2.5 border-t border-border pt-4 sm:grid-cols-4">
                            <div className="rounded-xl border border-border bg-subtle/50 px-3.5 py-2.5">
                                <div className="text-[11px] font-medium text-muted">
                                    Protected Items
                                </div>
                                <div className="font-display mt-0.5 flex items-baseline gap-1.5 text-lg font-bold text-text">
                                    <span>{stats.active}</span>
                                    <span className="text-[11px] font-normal text-muted">
                                        / {myTags.length} total
                                    </span>
                                </div>
                            </div>

                            <div className="rounded-xl border border-border bg-subtle/50 px-3.5 py-2.5">
                                <div className="text-[11px] font-medium text-muted">
                                    Active Lost Mode
                                </div>
                                <div
                                    className={`font-display mt-0.5 text-lg font-bold ${
                                        stats.lost > 0
                                            ? "text-lost"
                                            : "text-text"
                                    }`}
                                >
                                    {stats.lost}
                                </div>
                            </div>

                            <div className="rounded-xl border border-border bg-subtle/50 px-3.5 py-2.5">
                                <div className="text-[11px] font-medium text-muted">
                                    Total QR Scans
                                </div>
                                <div className="font-display mt-0.5 text-lg font-bold text-text">
                                    {stats.scans}
                                </div>
                            </div>

                            <div className="rounded-xl border border-border bg-subtle/50 px-3.5 py-2.5">
                                <div className="text-[11px] font-medium text-muted">
                                    Unread Messages
                                </div>
                                <div
                                    className={`font-display mt-0.5 text-lg font-bold ${
                                        stats.unread > 0
                                            ? "text-accent"
                                            : "text-text"
                                    }`}
                                >
                                    {stats.unread}
                                </div>
                            </div>
                        </div>
                    )}
                </Card>

                {/* ============================================================
                 * TAG HARDWARE CARDS GRID
                 * ========================================================== */}
                {loading ? (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {[1, 2].map((n) => (
                            <Skeleton
                                key={n}
                                className="h-60 w-full rounded-2xl"
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
                                leftIcon={<Plus className="size-4" />}
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
                            const categoryLabel =
                                CATEGORY_LABEL_MAP[tag.itemType] ??
                                "Personal Item";

                            return (
                                <Card
                                    key={tag.id}
                                    className={`group relative flex flex-col justify-between overflow-hidden p-4 sm:p-5 transition-all ${
                                        isRevoked
                                            ? "opacity-60 grayscale-35"
                                            : tag.lostMode
                                              ? "border-lost-border bg-linear-to-br from-lost-bg/45 via-surface to-surface"
                                              : "hover:border-border-strong"
                                    }`}
                                >
                                    {/* Top Status & Lost Mode Bar */}
                                    <div className="flex items-center justify-between gap-2 border-b border-border/70 pb-3">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            {isRevoked ? (
                                                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-subtle px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-muted uppercase">
                                                    Deactivated
                                                </span>
                                            ) : tag.lostMode ? (
                                                <span className="inline-flex items-center gap-1 rounded-full border border-lost-border bg-lost-bg px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-lost uppercase">
                                                    <BellRing className="size-3 animate-pulse" />
                                                    Lost Mode Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 rounded-full border border-accent/25 bg-accent-soft px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-accent uppercase">
                                                    <ShieldCheck className="size-3" />
                                                    Protected
                                                </span>
                                            )}

                                            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-subtle/70 px-2 py-0.5 font-mono text-[10px] font-bold text-text-secondary">
                                                #{tag.publicCode}
                                            </span>

                                            {tag.unreadMessageCount > 0 && (
                                                <span className="rounded-full bg-highlight px-2 py-0.5 text-[10px] font-extrabold text-white">
                                                    {tag.unreadMessageCount} new
                                                </span>
                                            )}
                                        </div>

                                        {!isRevoked && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] font-semibold text-muted">
                                                    Lost mode
                                                </span>
                                                <button
                                                    type="button"
                                                    role="switch"
                                                    aria-checked={tag.lostMode}
                                                    aria-label={`Toggle Lost Mode for ${tag.label}`}
                                                    onClick={() =>
                                                        handleToggleLostMode(
                                                            tag,
                                                        )
                                                    }
                                                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors ${
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
                                                        className={`inline-block size-3.5 rounded-full bg-white shadow-xs ${
                                                            tag.lostMode
                                                                ? "translate-x-4"
                                                                : "translate-x-0.5"
                                                        }`}
                                                    />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Main Content Body */}
                                    <div className="mt-3.5 flex items-start gap-4">
                                        {/* Tactile QR Badge */}
                                        <div className="flex shrink-0 flex-col items-center gap-1.5">
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
                                                title="Preview Finder Page"
                                                className="group/qr relative size-24 overflow-hidden rounded-xl border border-border-strong bg-white p-1.5 shadow-xs transition-transform hover:scale-[1.02] cursor-pointer"
                                            >
                                                {qrPng ? (
                                                    <img
                                                        src={qrPng}
                                                        alt={`QR code for ${tag.label}`}
                                                        className="size-full object-contain"
                                                    />
                                                ) : (
                                                    <Skeleton className="size-full" />
                                                )}
                                                <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 transition-opacity group-hover/qr:opacity-100">
                                                    <Eye className="size-5 text-white" />
                                                </span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleCopyPublicUrl(
                                                        tag.publicCode,
                                                    )
                                                }
                                                className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-muted transition-colors hover:bg-subtle hover:text-text cursor-pointer"
                                                title="Copy public finder link"
                                            >
                                                {copiedCode ===
                                                tag.publicCode ? (
                                                    <>
                                                        <Check className="size-3 text-accent" />
                                                        <span className="text-accent">
                                                            Copied
                                                        </span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="size-3" />
                                                        <span>Copy URL</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>

                                        {/* Tag Details */}
                                        <div className="min-w-0 flex-1 space-y-2">
                                            <div>
                                                <div className="inline-flex items-center gap-1 text-[11px] font-medium text-muted">
                                                    <TagIcon className="size-3" />
                                                    <span>{categoryLabel}</span>
                                                </div>
                                                <h3 className="font-display truncate text-base font-bold text-text sm:text-lg">
                                                    {tag.label}
                                                </h3>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                                <span className="inline-flex items-center gap-1 rounded-lg border border-border bg-subtle/60 px-2 py-0.5 text-[11px] text-text-secondary">
                                                    <ScanLine className="size-3 text-accent" />
                                                    <strong className="font-semibold text-text">
                                                        {tag.scanCount}
                                                    </strong>{" "}
                                                    {tag.scanCount === 1
                                                        ? "scan"
                                                        : "scans"}
                                                </span>

                                                <span className="inline-flex items-center gap-1 rounded-lg border border-border bg-subtle/60 px-2 py-0.5 text-[11px] text-text-secondary">
                                                    <Clock className="size-3 text-muted" />
                                                    <span>
                                                        {formatTimeAgo(
                                                            tag.lastScannedAt,
                                                        )}
                                                    </span>
                                                </span>
                                            </div>

                                            {tag.contactConfig.dropOffHub && (
                                                <div className="inline-flex items-center gap-1.5 rounded-lg border border-accent/15 bg-accent-soft/50 px-2.5 py-1 text-[11px] font-medium text-text-secondary">
                                                    <MapPin className="size-3.5 shrink-0 text-accent" />
                                                    <span className="truncate">
                                                        Drop-off:{" "}
                                                        <strong className="font-semibold text-text">
                                                            {
                                                                tag
                                                                    .contactConfig
                                                                    .dropOffHub
                                                            }
                                                        </strong>
                                                    </span>
                                                </div>
                                            )}

                                            {tag.lostMode && tag.lostNote && (
                                                <p className="line-clamp-2 rounded-lg border border-lost-border/60 bg-lost-bg/50 px-2.5 py-1.5 text-[11px] leading-snug text-text-secondary">
                                                    &ldquo;{tag.lostNote}&rdquo;
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Bottom Action & Print Queue Bar */}
                                    <div className="mt-4 space-y-2.5 border-t border-border pt-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() =>
                                                        handleOpenInbox(tag)
                                                    }
                                                    leftIcon={
                                                        <Inbox className="size-3.5 text-accent" />
                                                    }
                                                >
                                                    Timeline
                                                    {tag.unreadMessageCount >
                                                        0 && (
                                                        <span className="ml-1 rounded-full bg-highlight px-1.5 py-0.2 text-[10px] font-bold text-white">
                                                            {
                                                                tag.unreadMessageCount
                                                            }
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
                                                        <ExternalLink className="size-3.5" />
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
                                                    className="rounded-lg border border-border bg-subtle px-2 py-1 text-[11px] font-semibold text-text-secondary transition-colors hover:bg-surface hover:text-text cursor-pointer"
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
                                                    className="rounded-lg border border-border bg-subtle px-2 py-1 text-[11px] font-semibold text-text-secondary transition-colors hover:bg-surface hover:text-text cursor-pointer"
                                                    title="Download QR as SVG"
                                                >
                                                    SVG
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleRegenerateCode(
                                                            tag,
                                                        )
                                                    }
                                                    className="inline-flex size-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-subtle hover:text-text cursor-pointer"
                                                    title="Regenerate QR code (invalidates old sticker)"
                                                    aria-label="Regenerate QR code"
                                                >
                                                    <RefreshCw className="size-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleToggleRevoke(tag)
                                                    }
                                                    className="inline-flex size-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-subtle hover:text-found cursor-pointer"
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
                                                    <ShieldAlert className="size-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleDeleteTag(tag)
                                                    }
                                                    className="inline-flex size-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-subtle hover:text-danger cursor-pointer"
                                                    title="Delete tag"
                                                    aria-label="Delete tag"
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </button>
                                            </div>
                                        </div>

                                        {!isRevoked && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedTagIds(
                                                        (prev) => {
                                                            const next =
                                                                new Set(prev);
                                                            if (
                                                                next.has(tag.id)
                                                            ) {
                                                                next.delete(
                                                                    tag.id,
                                                                );
                                                            } else {
                                                                next.add(
                                                                    tag.id,
                                                                );
                                                            }
                                                            return next;
                                                        },
                                                    );
                                                }}
                                                className={`flex w-full cursor-pointer items-center justify-between rounded-xl border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                                                    isSelectedForPrint
                                                        ? "border-accent/30 bg-accent-soft/60 text-accent"
                                                        : "border-border bg-subtle/40 text-muted hover:text-text"
                                                }`}
                                            >
                                                <span className="inline-flex items-center gap-2">
                                                    {isSelectedForPrint ? (
                                                        <CheckSquare className="size-3.5" />
                                                    ) : (
                                                        <Square className="size-3.5" />
                                                    )}
                                                    <span>
                                                        Include on A4 printable
                                                        sticker sheet
                                                    </span>
                                                </span>
                                                <span className="font-mono text-[10px] uppercase">
                                                    {isSelectedForPrint
                                                        ? "Queued"
                                                        : "Skipped"}
                                                </span>
                                            </button>
                                        )}
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}

                {/* ============================================================
                 * DEVICE CAPABILITY VAULT
                 * ========================================================== */}
                <Card className="border-found-border bg-found-bg/35 p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex items-start gap-3 text-xs">
                            <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-found-border bg-found-bg text-found">
                                <KeyRound className="size-4" />
                            </div>
                            <div>
                                <div className="font-display flex items-center gap-2 text-sm font-bold text-text">
                                    <span>Device Capability Vault</span>
                                    <span className="rounded-full border border-found-border bg-found-bg px-2 py-0.5 font-mono text-[10px] font-bold text-found">
                                        {vaultCount} key
                                        {vaultCount === 1 ? "" : "s"}
                                    </span>
                                </div>
                                <p className="mt-0.5 max-w-xl leading-relaxed text-text-secondary">
                                    Findr INCAT uses{" "}
                                    <strong className="font-semibold text-text">
                                        zero accounts or passwords
                                    </strong>
                                    . Export your recovery JSON or paste a
                                    management link below to sync your tags
                                    across browsers or phones.
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
                                    <FileDown className="size-3.5 text-accent" />
                                }
                            >
                                Export Vault JSON
                            </Button>

                            <label className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text shadow-xs transition-colors hover:bg-subtle">
                                <FileUp className="size-3.5 text-accent" />
                                <span>Import JSON</span>
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
                            <Link2 className="pointer-events-none absolute top-1/2 left-3.5 size-3.5 -translate-y-1/2 text-muted" />
                            <input
                                type="text"
                                value={recoveryInput}
                                onChange={(e) =>
                                    setRecoveryInput(e.target.value)
                                }
                                placeholder="Paste a /manage/:key link or raw capability key to restore..."
                                aria-label="Restore capability key or link"
                                className="min-h-9.5 w-full rounded-xl border border-border bg-surface py-1.5 pr-3 pl-9 text-xs text-text placeholder:text-muted focus:border-accent focus:outline-none"
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

                {/* ============================================================
                 * STICKER SHEET DESIGNER TOOLBAR
                 * ========================================================== */}
                {activeTags.length > 0 && (
                    <Card className="flex flex-col gap-3.5 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5 sm:py-4 text-xs">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2">
                                <Printer className="size-4 text-accent" />
                                <span className="font-display text-sm font-bold text-text">
                                    A4 Sticker Sheet Studio
                                </span>
                            </div>

                            <button
                                type="button"
                                onClick={toggleSelectAllForPrint}
                                className="rounded-lg border border-border bg-subtle px-2.5 py-1 text-[11px] font-semibold text-text-secondary transition-colors hover:bg-surface hover:text-text cursor-pointer"
                            >
                                {printableTags.length === activeTags.length
                                    ? "Deselect All"
                                    : `Select All (${activeTags.length})`}
                            </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5">
                            {/* Theme Switcher */}
                            <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-subtle p-1">
                                <Palette className="ml-1.5 size-3.5 text-muted" />
                                {(
                                    [
                                        {
                                            id: "industrial",
                                            label: "Industrial",
                                        },
                                        { id: "minimal", label: "Minimal" },
                                        {
                                            id: "stealth",
                                            label: "Stealth Dark",
                                        },
                                    ] as const
                                ).map((t) => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => setStickerTheme(t.id)}
                                        className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                                            stickerTheme === t.id
                                                ? "bg-surface text-text shadow-xs"
                                                : "text-text-secondary hover:text-text"
                                        }`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>

                            {/* Size Switcher */}
                            <div className="inline-flex rounded-xl border border-border bg-subtle p-1">
                                <button
                                    type="button"
                                    onClick={() => setStickerSize("small")}
                                    className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
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
                                    className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                                        stickerSize === "medium"
                                            ? "bg-accent text-accent-fg"
                                            : "text-text-secondary hover:text-text"
                                    }`}
                                >
                                    Standard (2-col)
                                </button>
                            </div>

                            <Button
                                variant="primary"
                                size="sm"
                                disabled={printableTags.length === 0}
                                onClick={() => window.print()}
                                leftIcon={<Printer className="size-4" />}
                            >
                                Print / Save PDF
                            </Button>
                        </div>
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
                    className="print-sheet rounded-2xl border border-border-strong bg-white p-6 text-neutral-900 shadow-md sm:p-8"
                >
                    {/* Print Sheet Header */}
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b-2 border-neutral-900 pb-3.5">
                        <div className="flex items-center gap-3">
                            <div className="flex size-9 items-center justify-center rounded-lg bg-[#1d3f2f] text-white">
                                <QrCode className="size-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 text-sm font-black tracking-tight text-neutral-900 uppercase">
                                    <span>FINDR INCAT &middot; QR LABELS</span>
                                    <span className="rounded bg-neutral-900 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
                                        {printableTags.length}{" "}
                                        {printableTags.length === 1
                                            ? "TAG"
                                            : "TAGS"}
                                    </span>
                                </div>
                                <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-neutral-600">
                                    <Scissors className="size-3.5 text-neutral-900" />
                                    <span>
                                        Cut along outer dashed guides. Laminate
                                        with clear tape for water &amp; abrasion
                                        resistance.
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="text-right font-mono text-[11px] leading-tight">
                            <div className="font-bold text-neutral-900">
                                INCAT &middot; LAOAG CITY
                            </div>
                            <div className="text-neutral-500">
                                myfindr.pages.dev
                            </div>
                        </div>
                    </div>

                    {/* Stickers Grid */}
                    <div
                        className={
                            stickerSize === "small"
                                ? "grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3"
                                : "grid grid-cols-1 gap-4 sm:grid-cols-2"
                        }
                    >
                        {printableTags.map((tag) => {
                            const qrPng = qrDataUrls[tag.publicCode];
                            const categoryLabel =
                                CATEGORY_LABEL_MAP[tag.itemType] ??
                                "Personal Item";
                            const isStealth = stickerTheme === "stealth";
                            const isMinimal = stickerTheme === "minimal";

                            return (
                                <div
                                    key={tag.id}
                                    className=" rounded-2xl border-2 border-dashed border-neutral-400 p-1.5"
                                >
                                    {/* Inner Die-Cut Sticker Body */}
                                    <div
                                        className={`flex h-full flex-col justify-between overflow-hidden rounded-xl border-2 transition-colors ${
                                            isStealth
                                                ? "border-neutral-900 bg-neutral-950 text-white"
                                                : isMinimal
                                                  ? "border-neutral-900 bg-white text-neutral-900"
                                                  : "border-neutral-900 bg-white text-neutral-900"
                                        }`}
                                    >
                                        {/* Top Industrial Banner */}
                                        <div
                                            className={`flex items-center justify-between gap-2 px-3 py-1.5 ${
                                                isStealth
                                                    ? "border-b border-neutral-800 bg-neutral-900 text-white"
                                                    : isMinimal
                                                      ? "border-b-2 border-neutral-900 bg-neutral-100 text-neutral-900"
                                                      : "bg-[#1d3f2f] text-white"
                                            }`}
                                        >
                                            <div className="flex items-center gap-1.5 text-[10px] font-black tracking-wider uppercase">
                                                <ShieldCheck className="size-3.5 shrink-0" />
                                                <span>
                                                    FINDR INCAT RECOVERY TAG
                                                </span>
                                            </div>
                                            <span
                                                className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-black tracking-tight ${
                                                    isStealth
                                                        ? "bg-white text-neutral-950"
                                                        : isMinimal
                                                          ? "bg-neutral-900 text-white"
                                                          : "bg-white/15 text-white"
                                                }`}
                                            >
                                                #{tag.publicCode}
                                            </span>
                                        </div>

                                        {/* Center QR + Callout Body */}
                                        <div
                                            className={`flex items-center gap-3.5 ${
                                                stickerSize === "small"
                                                    ? "p-2.5"
                                                    : "p-3.5"
                                            }`}
                                        >
                                            {/* QR Frame */}
                                            <div className="flex shrink-0 flex-col items-center">
                                                <div
                                                    className={`overflow-hidden rounded-xl border-2 bg-white p-1 ${
                                                        isStealth
                                                            ? "border-white"
                                                            : "border-neutral-900"
                                                    } ${
                                                        stickerSize === "small"
                                                            ? "size-20"
                                                            : "size-26"
                                                    }`}
                                                >
                                                    {qrPng && (
                                                        <img
                                                            src={qrPng}
                                                            alt={`Sticker QR for ${tag.label}`}
                                                            className="size-full object-contain"
                                                        />
                                                    )}
                                                </div>
                                                <span
                                                    className={`mt-1 font-mono text-[8px] font-extrabold tracking-widest uppercase ${
                                                        isStealth
                                                            ? "text-neutral-300"
                                                            : "text-neutral-600"
                                                    }`}
                                                >
                                                    SCAN ME!
                                                </span>
                                            </div>

                                            {/* Right Column Information */}
                                            <div className="min-w-0 flex-1 space-y-1.5">
                                                <div>
                                                    <div
                                                        className={`font-black tracking-tight leading-none ${
                                                            stickerSize ===
                                                            "small"
                                                                ? "text-xs"
                                                                : "text-base"
                                                        } ${
                                                            isStealth
                                                                ? "text-white"
                                                                : "text-neutral-950"
                                                        }`}
                                                    >
                                                        FOUND THIS ITEM?
                                                    </div>
                                                    <div
                                                        className={`mt-0.5 text-[10px] font-semibold italic leading-snug ${
                                                            isStealth
                                                                ? "text-neutral-300"
                                                                : "text-neutral-700"
                                                        }`}
                                                    >
                                                        Scan QR with phone
                                                        camera &bull; I-scan
                                                        para maibalik
                                                    </div>
                                                </div>

                                                {/* Item Name Box */}
                                                <div
                                                    className={`rounded-lg border px-2.5 py-1.5 ${
                                                        isStealth
                                                            ? "border-neutral-800 bg-neutral-900"
                                                            : "border-neutral-300 bg-neutral-50"
                                                    }`}
                                                >
                                                    <div
                                                        className={`text-[8px] font-extrabold tracking-wider uppercase ${
                                                            isStealth
                                                                ? "text-neutral-400"
                                                                : "text-neutral-500"
                                                        }`}
                                                    >
                                                        {categoryLabel}
                                                    </div>
                                                    <div
                                                        className={`truncate font-extrabold leading-tight ${
                                                            stickerSize ===
                                                            "small"
                                                                ? "text-xs"
                                                                : "text-sm"
                                                        } ${
                                                            isStealth
                                                                ? "text-white"
                                                                : "text-neutral-950"
                                                        }`}
                                                    >
                                                        {tag.label}
                                                    </div>
                                                </div>

                                                {/* Drop-off & URL Footer */}
                                                <div className="flex flex-wrap items-center justify-between gap-1 pt-0.5 text-[10px]">
                                                    {tag.contactConfig
                                                        .dropOffHub ? (
                                                        <span
                                                            className={`inline-flex items-center gap-1 truncate font-bold ${
                                                                isStealth
                                                                    ? "text-emerald-300"
                                                                    : "text-[#1d3f2f]"
                                                            }`}
                                                        >
                                                            <MapPin className="size-3 shrink-0" />
                                                            <span className="truncate">
                                                                Drop:{" "}
                                                                {
                                                                    tag
                                                                        .contactConfig
                                                                        .dropOffHub
                                                                }
                                                            </span>
                                                        </span>
                                                    ) : (
                                                        <span
                                                            className={`font-semibold ${
                                                                isStealth
                                                                    ? "text-neutral-400"
                                                                    : "text-neutral-600"
                                                            }`}
                                                        >
                                                            No account needed
                                                        </span>
                                                    )}

                                                    <span
                                                        className={`font-mono text-[9px] font-bold ${
                                                            isStealth
                                                                ? "text-neutral-400"
                                                                : "text-neutral-500"
                                                        }`}
                                                    >
                                                        /t/{tag.publicCode}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
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
                        ? "QR Tag Created"
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
                                <Sparkles className="size-4" />
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
                                <AlertTriangle className="size-4 shrink-0" />
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
                                            <Check className="size-3.5" />
                                        ) : (
                                            <Copy className="size-3.5" />
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
                                    <Download className="size-3.5 text-accent" />
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
                        <Clock className="mx-auto mb-2 size-7 text-muted" />
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
                                        <span className="absolute -left-7.25 top-1 flex size-5 items-center justify-center rounded-full border border-accent bg-accent text-accent-fg shadow-xs">
                                            <MessageSquare className="size-3" />
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
                                                        <MapPin className="size-3" />
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
                                    <span className="absolute -left-7.25 top-1 flex size-5 items-center justify-center rounded-full border border-border-strong bg-surface text-muted">
                                        <ScanLine className="size-3" />
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
