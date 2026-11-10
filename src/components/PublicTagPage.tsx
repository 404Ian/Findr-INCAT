import React, { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import {
    AlertOctagon,
    ArrowLeft,
    CheckCircle2,
    Clock,
    ExternalLink,
    Flag,
    Lock,
    Mail,
    MapPin,
    MessageCircle,
    Navigation,
    Phone,
    Send,
    ShieldAlert,
    ShieldCheck,
    Sparkles,
} from "lucide-react";
import {
    CAMPUS_HUB_NAMES,
    CAMPUS_HUBS,
    type CampusHubName,
} from "../data/hubs";
import { api, ApiError } from "../lib/api";
import { SPRING_SNAPPY, fadeInUpVariants } from "../lib/motion";
import type { ContactMethod, PublicTagView } from "../types";
import CategoryArt, { formatCategoryLabel } from "./CategoryArt";
import { TurnstileWidget, type TurnstileWidgetHandle } from "./TurnstileWidget";
import {
    Button,
    Card,
    Input,
    Select,
    Skeleton,
    Textarea,
} from "./ui/primitives";

export interface PublicTagPageProps {
    publicCode: string;
    previewMode?: boolean;
    onBack?: () => void;
}

function buildContactHref(method: ContactMethod, itemLabel: string): string {
    const raw = method.value.trim();
    const encodedSubject = encodeURIComponent(
        `Found your ${itemLabel} (Findr INCAT)`,
    );
    const encodedBody = encodeURIComponent(
        `Hi! I scanned the Findr INCAT QR tag on your "${itemLabel}". How can I return it to you on campus?`,
    );

    switch (method.kind) {
        case "phone":
            return `tel:${raw.replace(/[^+\d]/g, "")}`;
        case "sms":
            return `sms:${raw.replace(/[^+\d]/g, "")}?body=${encodedBody}`;
        case "email":
            return `mailto:${raw}?subject=${encodedSubject}&body=${encodedBody}`;
        case "messenger": {
            if (raw.startsWith("http://") || raw.startsWith("https://"))
                return raw;
            const clean = raw.replace(/^@/, "").replace(/^m\.me\//i, "");
            return `https://m.me/${clean}`;
        }
        case "facebook": {
            if (raw.startsWith("http://") || raw.startsWith("https://"))
                return raw;
            return `https://${raw.replace(/^\/+/, "")}`;
        }
        case "telegram": {
            if (raw.startsWith("http://") || raw.startsWith("https://"))
                return raw;
            const clean = raw.replace(/^@/, "").replace(/^t\.me\//i, "");
            return `https://t.me/${clean}`;
        }
        case "instagram": {
            if (raw.startsWith("http://") || raw.startsWith("https://"))
                return raw;
            const clean = raw.replace(/^@/, "");
            return `https://instagram.com/${clean}`;
        }
    }
}

export const PublicTagPage: React.FC<PublicTagPageProps> = ({
    publicCode,
    previewMode = false,
    onBack,
}) => {
    const cleanCode = publicCode.trim().toUpperCase();
    const [tag, setTag] = useState<PublicTagView | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorState, setErrorState] = useState<{
        kind: "not_found" | "rate_limited" | "generic";
        message: string;
    } | null>(null);

    const turnstileRef = useRef<TurnstileWidgetHandle | null>(null);
    const [turnstileToken, setTurnstileToken] = useState<string>("");

    const [revealedMethods, setRevealedMethods] = useState<
        ContactMethod[] | null
    >(null);
    const [revealing, setRevealing] = useState(false);
    const [revealError, setRevealError] = useState<string | null>(null);

    const [messageBody, setMessageBody] = useState("");
    const [finderContact, setFinderContact] = useState("");
    const [foundAtHub, setFoundAtHub] = useState<CampusHubName | "">("");
    const [shareApproxLocation, setShareApproxLocation] = useState(false);
    const [approxCoords, setApproxCoords] = useState<{
        lat: number;
        lng: number;
    } | null>(null);
    const [locatingGps, setLocatingGps] = useState(false);
    const [sendingMsg, setSendingMsg] = useState(false);
    const [msgSent, setMsgSent] = useState(false);
    const [msgError, setMsgError] = useState<string | null>(null);

    const [reportOpen, setReportOpen] = useState(false);
    const [reportReason, setReportReason] = useState("");
    const [reportSubmitted, setReportSubmitted] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setErrorState(null);
        setRevealedMethods(null);
        setMsgSent(false);

        api.getPublicTag(cleanCode, previewMode)
            .then((res) => {
                if (cancelled) return;
                setTag(res.tag);
                if (res.tag.dropOffHub) {
                    setFoundAtHub(res.tag.dropOffHub);
                }
            })
            .catch((err: unknown) => {
                if (cancelled) return;
                if (err instanceof ApiError) {
                    if (
                        err.status === 429 ||
                        err.code.toLowerCase().includes("rate")
                    ) {
                        setErrorState({
                            kind: "rate_limited",
                            message:
                                err.message ||
                                "Too many scan requests right now. Please wait a minute and refresh.",
                        });
                        return;
                    }
                    if (err.status === 404) {
                        setErrorState({
                            kind: "not_found",
                            message: `No registered Findr INCAT tag matches code #${cleanCode}.`,
                        });
                        return;
                    }
                    setErrorState({
                        kind: "generic",
                        message: err.message,
                    });
                    return;
                }
                setErrorState({
                    kind: "not_found",
                    message:
                        "Could not load this QR tag. Check the code printed on the sticker and try again.",
                });
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [cleanCode, previewMode]);

    const handleToggleShareLocation = (checked: boolean) => {
        setShareApproxLocation(checked);
        if (!checked) {
            setApproxCoords(null);
            return;
        }
        if (!("geolocation" in navigator)) {
            setMsgError("GPS location is not available on this device.");
            setShareApproxLocation(false);
            return;
        }
        setLocatingGps(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLocatingGps(false);
                setApproxCoords({
                    lat: Number(pos.coords.latitude.toFixed(5)),
                    lng: Number(pos.coords.longitude.toFixed(5)),
                });
            },
            () => {
                setLocatingGps(false);
                setShareApproxLocation(false);
                setMsgError(
                    "Location permission was declined. You can still send a message without GPS.",
                );
            },
            { enableHighAccuracy: false, timeout: 7000 },
        );
    };

    const resetTurnstile = () => {
        setTurnstileToken("");
        turnstileRef.current?.reset();
    };

    const handleRevealContacts = async () => {
        if (!turnstileToken) {
            setRevealError(
                "Please wait for the human verification check below to complete.",
            );
            return;
        }
        setRevealing(true);
        setRevealError(null);
        try {
            const res = await api.revealPublicTagContacts(
                cleanCode,
                turnstileToken,
            );
            setRevealedMethods(res.visibleMethods);
        } catch (err: unknown) {
            setRevealError(
                err instanceof Error
                    ? err.message
                    : "Verification failed. Please use the message form below.",
            );
        } finally {
            setRevealing(false);
            resetTurnstile();
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageBody.trim()) return;
        if (!turnstileToken) {
            setMsgError(
                "Please wait for the human verification check to complete.",
            );
            return;
        }
        setSendingMsg(true);
        setMsgError(null);
        try {
            await api.sendFinderMessage(cleanCode, {
                body: messageBody.trim(),
                finderContact: finderContact.trim() || undefined,
                foundAtHub: foundAtHub || undefined,
                approxLocation: shareApproxLocation ? approxCoords : null,
                turnstileToken,
            });
            setMsgSent(true);
            setMessageBody("");
        } catch (err: unknown) {
            if (err instanceof ApiError && err.status === 429) {
                setMsgError(
                    "Slow down a bit too many messages sent recently. Please wait a moment.",
                );
            } else {
                setMsgError(
                    err instanceof Error
                        ? err.message
                        : "Failed to send message. Please try again.",
                );
            }
        } finally {
            setSendingMsg(false);
            resetTurnstile();
        }
    };

    const handleReportSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reportReason.trim()) return;
        try {
            await api.submitReport({
                targetType: "tag",
                targetId: cleanCode,
                reason: reportReason.trim(),
            });
            setReportSubmitted(true);
        } catch {
            setReportSubmitted(true);
        }
    };

    const suggestedHubDetails = tag?.dropOffHub
        ? CAMPUS_HUBS.find((h) => h.name === tag.dropOffHub)
        : undefined;

    /* ------------------------------------------------------------------------
     * 1. LOADING STATE
     * --------------------------------------------------------------------- */
    if (loading) {
        return (
            <div className="mx-auto max-w-lg space-y-4 py-2">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-9 w-28" />
                    <Skeleton className="h-7 w-24 rounded-full" />
                </div>
                <Skeleton className="h-48 w-full rounded-3xl" />
                <Skeleton className="h-32 w-full rounded-2xl" />
                <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
        );
    }

    /* ------------------------------------------------------------------------
     * 2. RATE-LIMITED STATE
     * --------------------------------------------------------------------- */
    if (errorState?.kind === "rate_limited") {
        return (
            <Card className="mx-auto max-w-md p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-found-bg text-found">
                    <Clock className="h-6 w-6" />
                </div>
                <h2 className="font-display mt-3 text-lg font-bold text-text">
                    Taking a Quick Breather
                </h2>
                <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">
                    {errorState.message}
                </p>
                <p className="mt-2 text-[11px] text-muted">
                    If you found this item on campus, you can also leave it
                    directly at the <strong>INCAT Guard House</strong> or{" "}
                    <strong>Guidance Office</strong>.
                </p>
                {onBack && (
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={onBack}
                        leftIcon={<ArrowLeft className="h-4 w-4" />}
                        className="mt-4"
                    >
                        Back
                    </Button>
                )}
            </Card>
        );
    }

    /* ------------------------------------------------------------------------
     * 3. NOT-FOUND / ERROR STATE
     * --------------------------------------------------------------------- */
    if (errorState || !tag) {
        return (
            <Card className="mx-auto max-w-md p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-lost-bg text-lost">
                    <AlertOctagon className="h-6 w-6" />
                </div>
                <h2 className="font-display mt-3 text-lg font-bold text-text">
                    QR Tag Not Found
                </h2>
                <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">
                    {errorState?.message ||
                        `No active Findr INCAT tag matches code #${cleanCode}.`}
                </p>
                {onBack && (
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={onBack}
                        leftIcon={<ArrowLeft className="h-4 w-4" />}
                        className="mt-4"
                    >
                        Back to Scanner
                    </Button>
                )}
            </Card>
        );
    }

    /* ------------------------------------------------------------------------
     * 4. REVOKED / DEACTIVATED STATE
     * --------------------------------------------------------------------- */
    if (tag.isRevoked) {
        return (
            <Card className="mx-auto max-w-md border-found-border p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-found-bg text-found">
                    <ShieldAlert className="h-6 w-6" />
                </div>
                <h2 className="font-display mt-3 text-lg font-bold text-text">
                    This QR Tag Was Replaced or Deactivated
                </h2>
                <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">
                    The owner has deactivated sticker{" "}
                    <strong className="font-mono text-text">
                        #{tag.publicCode}
                    </strong>
                    . If you found this item at INCAT, please turn it in at the{" "}
                    <strong>Guard House</strong> or{" "}
                    <strong>Guidance Office</strong>.
                </p>
                {onBack && (
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={onBack}
                        leftIcon={<ArrowLeft className="h-4 w-4" />}
                        className="mt-4"
                    >
                        Back
                    </Button>
                )}
            </Card>
        );
    }

    /* ------------------------------------------------------------------------
     * 5. ACTIVE FINDER RECOVERY PAGE
     * --------------------------------------------------------------------- */
    return (
        <motion.div
            variants={fadeInUpVariants}
            initial="hidden"
            animate="visible"
            className="mx-auto max-w-lg space-y-4 pb-12"
        >
            {/* Trust & Brand Top Bar */}
            <div className="flex items-center justify-between gap-2">
                {onBack ? (
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={onBack}
                        leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}
                    >
                        Back
                    </Button>
                ) : (
                    <div className="flex items-center gap-2">
                        <div className="font-display flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-accent-fg shadow-sm">
                            F
                        </div>
                        <div>
                            <div className="font-display text-xs font-bold text-text">
                                Findr INCAT
                            </div>
                            <div className="text-[10px] text-muted">
                                Campus Lost &amp; Found Recovery
                            </div>
                        </div>
                    </div>
                )}

                <span className="rounded-full border border-border bg-surface px-3 py-1 font-mono text-xs font-bold text-accent shadow-sm">
                    #{tag.publicCode}
                </span>
            </div>

            {previewMode && (
                <div className="rounded-xl border border-info/30 bg-info-bg px-3.5 py-2 text-center text-xs font-medium text-info">
                    Finder Preview Mode — This is what someone sees when they
                    scan your sticker.
                </div>
            )}

            {/* Calm, Stronger Banner When Lost Mode Is Active */}
            {tag.lostMode && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={SPRING_SNAPPY}
                    className="rounded-2xl border border-lost-border bg-lost-bg p-4 shadow-sm"
                >
                    <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-lost uppercase">
                        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-lost" />
                        <span>Actively Missing on Campus</span>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-text">
                        {tag.lostNote ||
                            "The owner marked this item as missing at INCAT and has been notified that their tag was scanned."}
                    </p>
                </motion.div>
            )}

            {/* Friendly "You found something!" Hero Card */}
            <Card elevation="md" className="overflow-hidden">
                <div className="p-5 sm:p-6">
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>You found something!</span>
                    </div>

                    <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                        {tag.photoUrl ? (
                            <img
                                src={tag.photoUrl}
                                alt={tag.label}
                                width={96}
                                height={96}
                                loading="eager"
                                decoding="async"
                                className="h-24 w-24 shrink-0 rounded-2xl border border-border object-cover shadow-sm"
                            />
                        ) : (
                            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border border-border bg-subtle">
                                <CategoryArt
                                    category={tag.itemType}
                                    className="h-10 w-10 text-accent"
                                />
                            </div>
                        )}

                        <div className="min-w-0 flex-1">
                            <span className="text-[11px] font-semibold tracking-wider text-muted uppercase">
                                {formatCategoryLabel(tag.itemType)}
                            </span>
                            <h1 className="font-display mt-0.5 text-xl font-bold text-text sm:text-2xl">
                                {tag.label}
                            </h1>
                            <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                                Thank you for scanning! Findr INCAT helps return
                                campus belongings safely with{" "}
                                <strong>no login or app install needed</strong>.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Suggested Drop-off Hub */}
                {tag.dropOffHub && (
                    <div className="border-t border-border bg-subtle/60 px-5 py-3.5">
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                                <MapPin className="h-4 w-4" />
                            </div>
                            <div className="text-xs">
                                <div className="font-semibold text-text">
                                    Suggested INCAT Drop-Off:{" "}
                                    <span className="text-accent">
                                        {tag.dropOffHub}
                                    </span>
                                    {suggestedHubDetails && (
                                        <span className="ml-1.5 rounded-md border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] text-text-secondary">
                                            {suggestedHubDetails.buildingCode}
                                        </span>
                                    )}
                                </div>
                                <p className="mt-0.5 text-muted">
                                    {suggestedHubDetails?.description ||
                                        "You can leave the item here and send a quick note below."}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </Card>

            {/* Large One-Tap Contact Buttons */}
            {tag.visibleMethodsCount > 0 && (
                <Card className="p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="font-display text-base font-bold text-text">
                                One-Tap Owner Contact
                            </h2>
                            <p className="text-xs text-muted">
                                The owner enabled {tag.visibleMethodsCount}{" "}
                                direct contact{" "}
                                {tag.visibleMethodsCount === 1
                                    ? "option"
                                    : "options"}
                                .
                            </p>
                        </div>
                        <Lock className="h-4 w-4 text-accent" />
                    </div>

                    {!revealedMethods ? (
                        <div className="mt-3.5">
                            <Button
                                variant="secondary"
                                size="lg"
                                loading={revealing}
                                disabled={!turnstileToken}
                                onClick={handleRevealContacts}
                                leftIcon={
                                    <ShieldCheck className="h-4 w-4 text-accent" />
                                }
                                className="w-full border-accent/40 bg-accent-soft text-accent hover:bg-accent hover:text-accent-fg"
                            >
                                Tap to reveal contacts
                            </Button>
                            <p className="mt-1.5 text-center text-[11px] text-muted">
                                Protected by anti-scraper verification to keep
                                student phone numbers safe.
                            </p>
                            {revealError && (
                                <p className="mt-2 text-center text-xs text-danger">
                                    {revealError}
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                            {revealedMethods.map((method, i) => {
                                const href = buildContactHref(
                                    method,
                                    tag.label,
                                );
                                return (
                                    <a
                                        key={`${method.kind}-${i}`}
                                        href={href}
                                        target={
                                            method.kind === "phone" ||
                                            method.kind === "sms"
                                                ? undefined
                                                : "_blank"
                                        }
                                        rel="noopener noreferrer"
                                        className="flex min-h-12 items-center justify-between rounded-xl border border-accent/35 bg-accent-soft px-4 py-3 text-xs font-semibold text-text transition-colors hover:bg-accent hover:text-accent-fg"
                                    >
                                        <span className="flex items-center gap-2.5">
                                            {method.kind === "phone" ? (
                                                <Phone className="h-4 w-4 shrink-0" />
                                            ) : method.kind === "email" ? (
                                                <Mail className="h-4 w-4 shrink-0" />
                                            ) : (
                                                <MessageCircle className="h-4 w-4 shrink-0" />
                                            )}
                                            <span className="uppercase">
                                                {method.kind}
                                            </span>
                                            <span className="truncate font-mono font-normal opacity-85">
                                                {method.value}
                                            </span>
                                        </span>
                                        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                                    </a>
                                );
                            })}
                        </div>
                    )}
                </Card>
            )}

            {/* Relay Message Form with Clear Success State */}
            <Card className="p-5">
                <h2 className="font-display text-base font-bold text-text">
                    Send a Quick Note to the Owner
                </h2>
                <p className="mt-0.5 text-xs text-muted">
                    Delivered straight to the owner&apos;s{" "}
                    <strong>My items</strong> inbox without revealing your
                    personal phone number.
                </p>

                {msgSent ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={SPRING_SNAPPY}
                        className="mt-4 rounded-2xl border border-accent/35 bg-accent-soft p-5 text-center"
                    >
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-fg shadow-sm">
                            <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <h3 className="font-display mt-3 text-base font-bold text-text">
                            Message Sent to Owner!
                        </h3>
                        <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                            Thank you for helping return this item at INCAT. If
                            you left it at a drop-off hub, the owner now has
                            your update.
                        </p>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setMsgSent(false)}
                            className="mt-4"
                        >
                            Send another update
                        </Button>
                    </motion.div>
                ) : (
                    <form
                        onSubmit={handleSendMessage}
                        className="mt-4 space-y-4"
                    >
                        {msgError && (
                            <div className="rounded-xl border border-danger/40 bg-danger-bg p-3 text-xs font-medium text-danger">
                                {msgError}
                            </div>
                        )}

                        <Select
                            id="finder-found-hub"
                            label="Where is the item right now?"
                            value={foundAtHub}
                            onChange={(e) =>
                                setFoundAtHub(
                                    e.target.value as CampusHubName | "",
                                )
                            }
                        >
                            <option value="">
                                I still have it with me / Another spot
                            </option>
                            {CAMPUS_HUB_NAMES.map((hub) => (
                                <option key={hub} value={hub}>
                                    Turned in / Spotted at: {hub}
                                </option>
                            ))}
                        </Select>

                        <Textarea
                            id="finder-message-body"
                            label="Your Message *"
                            rows={3}
                            required
                            maxLength={800}
                            value={messageBody}
                            onChange={(e) => setMessageBody(e.target.value)}
                            placeholder="e.g., I found your tumbler near the Covered Court bleachers and left it with the guard on duty at Gate 1."
                        />

                        <Input
                            id="finder-contact-input"
                            label="How can the owner reach you back? (Optional)"
                            maxLength={120}
                            value={finderContact}
                            onChange={(e) => setFinderContact(e.target.value)}
                            placeholder="e.g., Messenger @name, 0917..., or Grade 11 ICT-A room"
                        />

                        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-subtle/50 p-3.5 text-xs">
                            <input
                                type="checkbox"
                                checked={shareApproxLocation}
                                onChange={(e) =>
                                    handleToggleShareLocation(e.target.checked)
                                }
                                className="mt-0.5 h-4 w-4 rounded border-border-strong accent-accent"
                            />
                            <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5 font-semibold text-text">
                                    <Navigation className="h-3.5 w-3.5 text-accent" />
                                    <span>
                                        Share my approximate GPS spot once
                                        (Optional)
                                    </span>
                                </div>
                                <p className="text-[11px] text-muted">
                                    {locatingGps
                                        ? "Reading GPS coordinates..."
                                        : approxCoords
                                          ? `Pinned at ${approxCoords.lat}, ${approxCoords.lng}`
                                          : "Only shared for this single message; never tracked in the background."}
                                </p>
                            </div>
                        </label>

                        <Button
                            type="submit"
                            variant="primary"
                            size="lg"
                            loading={sendingMsg}
                            disabled={!messageBody.trim() || !turnstileToken}
                            leftIcon={<Send className="h-4 w-4" />}
                            className="w-full"
                        >
                            Send Message to Owner
                        </Button>
                    </form>
                )}

                {(!msgSent ||
                    (tag.visibleMethodsCount > 0 && !revealedMethods)) && (
                    <div className="mt-4">
                        <TurnstileWidget
                            ref={turnstileRef}
                            action="finder_interact"
                            onVerify={(token) => setTurnstileToken(token)}
                            onExpire={() => setTurnstileToken("")}
                        />
                    </div>
                )}
            </Card>

            {/* Footer Trust Line & Report */}
            <div className="flex items-center justify-between px-1 text-xs text-muted">
                <span>Findr INCAT &middot; Zero-account campus recovery</span>
                <button
                    type="button"
                    onClick={() => setReportOpen((prev) => !prev)}
                    className="inline-flex items-center gap-1 text-muted hover:text-danger cursor-pointer"
                >
                    <Flag className="h-3.5 w-3.5" />
                    <span>Report tag</span>
                </button>
            </div>

            {reportOpen && (
                <Card className="p-3.5 text-xs">
                    {reportSubmitted ? (
                        <p className="font-medium text-accent">
                            Report submitted to INCAT moderators. Thank you.
                        </p>
                    ) : (
                        <form
                            onSubmit={handleReportSubmit}
                            className="flex items-center gap-2"
                        >
                            <input
                                type="text"
                                required
                                value={reportReason}
                                onChange={(e) =>
                                    setReportReason(e.target.value)
                                }
                                placeholder="Reason for reporting this tag..."
                                aria-label="Reason for reporting this tag"
                                className="min-h-10 w-full rounded-xl border border-border bg-subtle px-3 py-1.5 text-xs text-text focus:border-accent focus:outline-none"
                            />
                            <Button type="submit" variant="danger" size="sm">
                                Submit
                            </Button>
                        </form>
                    )}
                </Card>
            )}
        </motion.div>
    );
};

export default PublicTagPage;
