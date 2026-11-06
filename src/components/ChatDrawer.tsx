import React, { useState } from "react";
import {
    Calendar,
    CheckCircle2,
    ExternalLink,
    MapPin,
    Share2,
    ShieldCheck,
    Tag as TagIcon,
    X,
} from "lucide-react";
import { api } from "../lib/api";
import { getPostEditKey } from "../lib/keys";
import type { Post } from "../types";
import { ClaimVerifyDrawer } from "./ClaimVerifyDrawer";

export interface ChatDrawerProps {
    post: Post | null;
    isOpen: boolean;
    onClose: () => void;
    onPostUpdated?: (updated: Post) => void;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
    post,
    isOpen,
    onClose,
    onPostUpdated,
}) => {
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [resolving, setResolving] = useState(false);
    const [claimDrawerOpen, setClaimDrawerOpen] = useState(false);
    const [shareCopied, setShareCopied] = useState(false);

    if (!isOpen || !post) return null;

    const hasEditKey = Boolean(getPostEditKey(post.id));

    const handleResolve = async () => {
        if (!window.confirm("Mark this item as returned / resolved?")) return;
        setResolving(true);
        try {
            const res = await api.resolvePost(post.id);
            onPostUpdated?.(res.post);
        } catch (err: unknown) {
            alert(
                err instanceof Error
                    ? err.message
                    : "Failed to mark as returned.",
            );
        } finally {
            setResolving(false);
        }
    };

    const handleShare = async () => {
        const url = window.location.href;
        await navigator.clipboard.writeText(url);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
    };

    return (
        <>
            <div
                className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm"
                role="dialog"
                aria-modal="true"
            >
                <div className="flex h-full w-full max-w-lg flex-col border-l border-neutral-800 bg-neutral-950 text-neutral-100 shadow-2xl">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
                        <div className="flex items-center gap-2">
                            <span
                                className={`rounded-md px-2.5 py-0.5 text-xs font-bold tracking-wider uppercase ${
                                    post.status === "returned"
                                        ? "bg-neutral-800 text-neutral-300"
                                        : post.type === "lost"
                                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                          : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                }`}
                            >
                                {post.status === "returned"
                                    ? "Returned"
                                    : post.type}
                            </span>
                            <span className="text-xs text-neutral-400">
                                ID: #{post.id.slice(0, 8)}
                            </span>
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={handleShare}
                                className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-900 hover:text-neutral-100"
                                title="Copy share link"
                            >
                                <Share2 className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-900 hover:text-neutral-100"
                                title="Close drawer"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    {shareCopied && (
                        <div className="bg-emerald-950/40 px-5 py-2 text-center text-xs font-semibold text-emerald-300">
                            Post link copied to clipboard!
                        </div>
                    )}

                    {/* Scrollable Body */}
                    <div className="flex-1 space-y-6 overflow-y-auto p-5 text-xs">
                        {/* Photo Carousel */}
                        {post.imageUrls.length > 0 && (
                            <div className="space-y-2">
                                <div className="aspect-video w-full overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">
                                    <img
                                        src={post.imageUrls[activeImageIndex]}
                                        alt={post.title}
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                                {post.imageUrls.length > 1 && (
                                    <div className="flex gap-2">
                                        {post.imageUrls.map((url, i) => (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() =>
                                                    setActiveImageIndex(i)
                                                }
                                                className={`h-14 w-14 overflow-hidden rounded-xl border ${
                                                    activeImageIndex === i
                                                        ? "border-emerald-500 ring-2 ring-emerald-500/30"
                                                        : "border-neutral-800 opacity-60"
                                                }`}
                                            >
                                                <img
                                                    src={url}
                                                    alt="Thumbnail"
                                                    className="h-full w-full object-cover"
                                                />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Title & Description */}
                        <div className="space-y-2">
                            <h2 className="text-lg font-bold text-neutral-100 sm:text-xl">
                                {post.title}
                            </h2>
                            <p className="leading-relaxed text-neutral-300 whitespace-pre-wrap">
                                {post.description}
                            </p>
                        </div>

                        {/* Location & Occurred Time */}
                        <div className="grid grid-cols-1 gap-2.5 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4">
                            <div className="flex items-center gap-2 text-neutral-200">
                                <MapPin className="h-4 w-4 shrink-0 text-emerald-400" />
                                <span>
                                    <strong>Location:</strong>{" "}
                                    {post.locationName}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-neutral-400">
                                <Calendar className="h-4 w-4 shrink-0" />
                                <span>
                                    {post.type === "lost"
                                        ? "Lost around"
                                        : "Found around"}
                                    :{" "}
                                    {new Date(post.occurredAt).toLocaleString()}
                                </span>
                            </div>
                            {post.linkedTagCode && (
                                <div className="flex items-center gap-2 text-emerald-300">
                                    <TagIcon className="h-4 w-4 shrink-0" />
                                    <span>
                                        Linked QR Tag: #{post.linkedTagCode}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Claim Verification Button (For Found Items with Question) */}
                        {post.type === "found" &&
                            post.hasClaimQuestion &&
                            post.status !== "returned" && (
                                <div className="rounded-2xl border border-emerald-900/60 bg-emerald-950/20 p-4">
                                    <div className="flex items-center gap-2 font-semibold text-emerald-200">
                                        <ShieldCheck className="h-4 w-4 text-emerald-400" />
                                        <span>
                                            Security Question Required to Claim
                                        </span>
                                    </div>
                                    <p className="mt-1 text-neutral-400">
                                        The finder set a verification question
                                        to ensure the item returns to the true
                                        owner.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setClaimDrawerOpen(true)}
                                        className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500"
                                    >
                                        <span>
                                            Answer Verification Question
                                        </span>
                                        <ExternalLink className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            )}

                        {/* Direct Contact Channels */}
                        {post.contact.methods.length > 0 &&
                            post.status !== "returned" && (
                                <div className="space-y-2">
                                    <div className="font-semibold text-neutral-300">
                                        Contact Methods:
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        {post.contact.methods.map((m, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center justify-between rounded-xl border border-neutral-700 bg-neutral-900 px-3.5 py-2.5 font-medium text-emerald-300"
                                            >
                                                <span className="uppercase">
                                                    {m.kind}
                                                </span>
                                                <span className="font-mono text-neutral-100">
                                                    {m.value}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                        {/* Poster Management Action (Mark as Returned) */}
                        {hasEditKey && post.status !== "returned" && (
                            <div className="rounded-2xl border border-amber-500/40 bg-amber-950/20 p-4">
                                <div className="font-semibold text-amber-200">
                                    Manage Your Post
                                </div>
                                <p className="mt-1 text-neutral-400">
                                    You created this post on this device. Mark
                                    it as returned once the item is safely back
                                    with its owner.
                                </p>
                                <button
                                    type="button"
                                    disabled={resolving}
                                    onClick={handleResolve}
                                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                                >
                                    <CheckCircle2 className="h-4 w-4" />
                                    <span>
                                        {resolving
                                            ? "Updating..."
                                            : "Mark as Returned / Claimed"}
                                    </span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ClaimVerifyDrawer
                post={post}
                isOpen={claimDrawerOpen}
                onClose={() => setClaimDrawerOpen(false)}
            />
        </>
    );
};

export default ChatDrawer;
