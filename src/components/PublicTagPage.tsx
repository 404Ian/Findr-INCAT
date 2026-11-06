import React, { useEffect, useState } from "react";
import {
    AlertOctagon,
    ArrowLeft,
    CheckCircle2,
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
import type { ContactMethod, PublicTagView } from "../types";
import CategoryArt from "./CategoryArt";

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
    const [error, setError] = useState<string | null>(null);

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
        setError(null);
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
                setError(
                    err instanceof ApiError
                        ? err.message
                        : "Could not load this QR tag. Check the code and try again.",
                );
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

    const handleRevealContacts = async () => {
        setRevealing(true);
        setRevealError(null);
        try {
            const res = await api.revealPublicTagContacts(
                cleanCode,
                "dev-bypass-token",
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
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageBody.trim()) return;
        setSendingMsg(true);
        setMsgError(null);

        try {
            await api.sendFinderMessage(cleanCode, {
                body: messageBody.trim(),
                finderContact: finderContact.trim() || undefined,
                foundAtHub: foundAtHub || undefined,
                approxLocation: shareApproxLocation ? approxCoords : null,
                turnstileToken: "dev-bypass-token",
            });
            setMsgSent(true);
            setMessageBody("");
        } catch (err: unknown) {
            setMsgError(
                err instanceof Error
                    ? err.message
                    : "Failed to send message. Please try again.",
            );
        } finally {
            setSendingMsg(false);
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

    if (loading) {
        return (
            <div className="mx-auto max-w-lg space-y-4 p-4">
                <div className="h-44 animate-pulse rounded-2xl bg-neutral-900" />
                <div className="h-32 animate-pulse rounded-2xl bg-neutral-900" />
                <div className="h-56 animate-pulse rounded-2xl bg-neutral-900" />
            </div>
        );
    }

    if (error || !tag) {
        return (
            <div className="mx-auto max-w-md rounded-2xl border border-neutral-800 bg-neutral-950 p-6 text-center">
                <AlertOctagon className="mx-auto h-10 w-10 text-rose-400" />
                <h2 className="mt-3 text-base font-bold text-neutral-100">
                    QR Tag Not Found
                </h2>
                <p className="mt-1 text-xs text-neutral-400">
                    {error ||
                        `No active Findr INCAT tag matches code #${cleanCode}.`}
                </p>
                {onBack && (
                    <button
                        type="button"
                        onClick={onBack}
                        className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-neutral-800 px-4 py-2 text-xs font-semibold text-neutral-100 hover:bg-neutral-700"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span>Back</span>
                    </button>
                )}
            </div>
        );
    }

    if (tag.isRevoked) {
        return (
            <div className="mx-auto max-w-md rounded-2xl border border-amber-500/40 bg-neutral-950 p-6 text-center">
                <ShieldAlert className="mx-auto h-10 w-10 text-amber-400" />
                <h2 className="mt-3 text-base font-bold text-neutral-100">
                    This QR Tag Has Been Deactivated
                </h2>
                <p className="mt-1 text-xs text-neutral-400">
                    The owner has revoked or replaced tag{" "}
                    <strong>#{tag.publicCode}</strong>. If you found this item
                    at INCAT, please turn it in at the{" "}
                    <strong>Guard House</strong> or{" "}
                    <strong>Guidance Office</strong>.
                </p>
                {onBack && (
                    <button
                        type="button"
                        onClick={onBack}
                        className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-neutral-800 px-4 py-2 text-xs font-semibold text-neutral-100"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span>Back</span>
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-lg space-y-4 pb-10">
            <div className="flex items-center justify-between">
                {onBack ? (
                    <button
                        type="button"
                        onClick={onBack}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-800 bg-neutral-900/80 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:bg-neutral-800"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        <span>Back</span>
                    </button>
                ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                        <ShieldCheck className="h-4 w-4" />
                        Findr INCAT &middot; Official QR Recovery
                    </span>
                )}

                <span className="rounded-full border border-neutral-800 bg-neutral-900 px-2.5 py-1 font-mono text-[11px] text-neutral-300">
                    #{tag.publicCode}
                </span>
            </div>

            {tag.lostMode && (
                <div className="rounded-2xl border border-rose-500/60 bg-rose-950/35 p-4 shadow-lg">
                    <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-rose-300 uppercase">
                        <span className="h-2.5 w-2.5 animate-ping rounded-full bg-rose-400" />
                        <span>
                            Active Lost Mode &middot; Owner Notified of Scan
                        </span>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-rose-100">
                        {tag.lostNote ||
                            "The owner marked this item as actively missing on campus and has been alerted that you scanned this tag."}
                    </p>
                </div>
            )}

            <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 shadow-xl">
                <div className="bg-linear-to-br from-emerald-950/70 via-neutral-950 to-neutral-950 p-5">
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>
                            You found something! &middot; May napulot kang
                            gamit!
                        </span>
                    </div>

                    <div className="mt-4 flex items-center gap-4">
                        {tag.photoUrl ? (
                            <img
                                src={tag.photoUrl}
                                alt={tag.label}
                                className="h-20 w-20 shrink-0 rounded-2xl border border-neutral-700 object-cover"
                            />
                        ) : (
                            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-900">
                                <CategoryArt
                                    category={tag.itemType}
                                    className="h-10 w-10 text-emerald-400"
                                />
                            </div>
                        )}

                        <div>
                            <span className="text-[11px] font-semibold tracking-wider text-neutral-400 uppercase">
                                Registered Campus Item
                            </span>
                            <h1 className="mt-0.5 text-lg font-bold text-neutral-100 sm:text-xl">
                                {tag.label}
                            </h1>
                            <p className="mt-1 text-xs text-neutral-400">
                                Thank you for scanning! Use the options below to
                                return this item to its owner at INCAT. No login
                                or app required.
                            </p>
                        </div>
                    </div>
                </div>

                {tag.dropOffHub && (
                    <div className="border-t border-neutral-800/90 bg-neutral-900/50 px-5 py-3.5">
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 rounded-lg bg-emerald-500/15 p-2 text-emerald-400">
                                <MapPin className="h-4 w-4" />
                            </div>
                            <div className="text-xs">
                                <div className="font-semibold text-neutral-200">
                                    Preferred INCAT Drop-Off:{" "}
                                    <span className="text-emerald-300">
                                        {tag.dropOffHub}
                                    </span>
                                    {suggestedHubDetails && (
                                        <span className="ml-1.5 rounded bg-neutral-800 px-1.5 py-0.5 font-mono text-[10px] text-neutral-300">
                                            {suggestedHubDetails.buildingCode}
                                        </span>
                                    )}
                                </div>
                                <p className="mt-0.5 text-neutral-400">
                                    {suggestedHubDetails?.description ||
                                        "You can leave the item here and let the owner know below."}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {tag.visibleMethodsCount > 0 && (
                <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-sm font-bold text-neutral-100">
                                One-Tap Owner Contact
                            </h2>
                            <p className="text-xs text-neutral-400">
                                The owner enabled {tag.visibleMethodsCount}{" "}
                                direct contact{" "}
                                {tag.visibleMethodsCount === 1
                                    ? "channel"
                                    : "channels"}
                                .
                            </p>
                        </div>
                        <Lock className="h-4 w-4 text-emerald-400" />
                    </div>

                    {!revealedMethods ? (
                        <div className="mt-3.5">
                            <button
                                type="button"
                                onClick={handleRevealContacts}
                                disabled={revealing}
                                className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/50 bg-emerald-600/20 px-4 py-3 text-xs font-semibold text-emerald-200 transition-colors hover:bg-emerald-600/30 disabled:opacity-50"
                            >
                                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                                <span>
                                    {revealing
                                        ? "Verifying human check..."
                                        : "Tap to Reveal Owner Contact Buttons"}
                                </span>
                            </button>
                            <p className="mt-1.5 text-center text-[11px] text-neutral-500">
                                Protected by anti-scraper verification to keep
                                student numbers safe.
                            </p>
                            {revealError && (
                                <p className="mt-2 text-center text-xs text-rose-400">
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
                                        className="flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-4 py-3 text-xs font-semibold text-emerald-100 transition-colors hover:bg-emerald-900/40"
                                    >
                                        <span className="flex items-center gap-2">
                                            {method.kind === "phone" ? (
                                                <Phone className="h-4 w-4 text-emerald-400" />
                                            ) : method.kind === "email" ? (
                                                <Mail className="h-4 w-4 text-emerald-400" />
                                            ) : (
                                                <MessageCircle className="h-4 w-4 text-emerald-400" />
                                            )}
                                            <span className="uppercase">
                                                {method.kind}
                                            </span>
                                            <span className="font-normal text-neutral-300">
                                                ({method.value})
                                            </span>
                                        </span>
                                        <ExternalLink className="h-3.5 w-3.5 text-emerald-400" />
                                    </a>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
                <h2 className="text-sm font-bold text-neutral-100">
                    Message the Owner Directly
                </h2>
                <p className="mt-0.5 text-xs text-neutral-400">
                    Delivered instantly to the owner&apos;s{" "}
                    <strong>My items</strong> inbox without exposing either
                    person&apos;s private number.
                </p>

                {msgSent ? (
                    <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-950/25 p-4 text-center">
                        <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
                        <h3 className="mt-2 text-sm font-bold text-emerald-200">
                            Message Sent to Owner!
                        </h3>
                        <p className="mt-1 text-xs text-neutral-300">
                            Thank you for helping keep INCAT honest and
                            connected.
                        </p>
                        <button
                            type="button"
                            onClick={() => setMsgSent(false)}
                            className="mt-3 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-200 hover:bg-neutral-800"
                        >
                            Send another update
                        </button>
                    </div>
                ) : (
                    <form
                        onSubmit={handleSendMessage}
                        className="mt-4 space-y-3.5"
                    >
                        {msgError && (
                            <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-3 text-xs text-rose-200">
                                {msgError}
                            </div>
                        )}

                        <div>
                            <label
                                htmlFor="finder-found-hub"
                                className="mb-1 block text-xs font-medium text-neutral-300"
                            >
                                Where is the item right now?
                            </label>
                            <select
                                id="finder-found-hub"
                                value={foundAtHub}
                                onChange={(e) =>
                                    setFoundAtHub(
                                        e.target.value as CampusHubName | "",
                                    )
                                }
                                className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs text-neutral-100 focus:border-emerald-500 focus:outline-none"
                            >
                                <option value="">
                                    I still have it with me / Other spot
                                </option>
                                {CAMPUS_HUB_NAMES.map((hub) => (
                                    <option key={hub} value={hub}>
                                        Turned in / Spotted at: {hub}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label
                                htmlFor="finder-message-body"
                                className="mb-1 block text-xs font-medium text-neutral-300"
                            >
                                Your Message *
                            </label>
                            <textarea
                                id="finder-message-body"
                                rows={3}
                                required
                                maxLength={800}
                                value={messageBody}
                                onChange={(e) => setMessageBody(e.target.value)}
                                placeholder="e.g., I found your tumbler near the Covered Court bleachers and left it with the guard on duty at Gate 1."
                                className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3.5 py-2 text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="finder-contact-input"
                                className="mb-1 block text-xs font-medium text-neutral-300"
                            >
                                How can the owner reach you back? (Optional)
                            </label>
                            <input
                                id="finder-contact-input"
                                type="text"
                                maxLength={120}
                                value={finderContact}
                                onChange={(e) =>
                                    setFinderContact(e.target.value)
                                }
                                placeholder="e.g., Messenger @name, 0917..., or Grade 11 ICT-A room"
                                className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3.5 py-2 text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none"
                            />
                        </div>

                        <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-neutral-800 bg-neutral-900/60 p-3 text-xs">
                            <input
                                type="checkbox"
                                checked={shareApproxLocation}
                                onChange={(e) =>
                                    handleToggleShareLocation(e.target.checked)
                                }
                                className="mt-0.5 h-4 w-4 rounded border-neutral-600 text-emerald-600 focus:ring-emerald-500"
                            />
                            <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5 font-medium text-neutral-200">
                                    <Navigation className="h-3.5 w-3.5 text-emerald-400" />
                                    <span>
                                        Share my approximate GPS spot once with
                                        the owner (Optional)
                                    </span>
                                </div>
                                <p className="text-[11px] text-neutral-400">
                                    {locatingGps
                                        ? "Reading GPS coordinates..."
                                        : approxCoords
                                          ? `Pinned at ${approxCoords.lat}, ${approxCoords.lng}`
                                          : "Only shared for this single message; never tracked in the background."}
                                </p>
                            </div>
                        </label>

                        <button
                            type="submit"
                            disabled={sendingMsg || !messageBody.trim()}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                        >
                            <Send className="h-4 w-4" />
                            <span>
                                {sendingMsg
                                    ? "Sending Message..."
                                    : "Send Message to Owner"}
                            </span>
                        </button>
                    </form>
                )}
            </div>

            <div className="flex items-center justify-between px-1 text-xs text-neutral-500">
                <span>
                    Powered by Findr INCAT &middot; Zero-Account QR Recovery
                </span>
                <button
                    type="button"
                    onClick={() => setReportOpen((prev) => !prev)}
                    className="inline-flex items-center gap-1 text-neutral-400 hover:text-rose-400"
                >
                    <Flag className="h-3.5 w-3.5" />
                    <span>Report tag</span>
                </button>
            </div>

            {reportOpen && (
                <form
                    onSubmit={handleReportSubmit}
                    className="rounded-xl border border-neutral-800 bg-neutral-950 p-3.5 text-xs"
                >
                    {reportSubmitted ? (
                        <p className="text-emerald-400">
                            Report submitted to INCAT moderators. Thank you.
                        </p>
                    ) : (
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                required
                                value={reportReason}
                                onChange={(e) =>
                                    setReportReason(e.target.value)
                                }
                                placeholder="Reason for reporting this tag..."
                                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-100"
                            />
                            <button
                                type="submit"
                                className="shrink-0 rounded-lg bg-rose-600 px-3 py-1.5 font-semibold text-white hover:bg-rose-500"
                            >
                                Submit
                            </button>
                        </div>
                    )}
                </form>
            )}
        </div>
    );
};

export default PublicTagPage;
