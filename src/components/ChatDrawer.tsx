import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
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
import { EASE_OUT_FAST, SPRING_SHEET, SPRING_SNAPPY } from "../lib/motion";
import type { Post } from "../types";
import { ClaimVerifyDrawer } from "./ClaimVerifyDrawer";
import { formatCategoryLabel, getCategoryIcon } from "./CategoryArt";
import { Button, StatusBadge, useToast } from "./ui/primitives";

export interface ChatDrawerProps {
    post: Post | null;
    isOpen: boolean;
    onClose: () => void;
    onPostUpdated?: (updated: Post) => void;
}

/**
 * Lightweight, zero-dependency canvas confetti burst for Returned items
 */
function triggerCanvasConfetti(canvas: HTMLCanvasElement) {
    if (
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
        return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = (canvas.width = canvas.offsetWidth || 420);
    const height = (canvas.height = canvas.offsetHeight || 360);
    const colors = ["#234b38", "#356b52", "#d97706", "#eab308", "#10b981"];

    const particles = Array.from({ length: 38 }, () => ({
        x: width / 2,
        y: height * 0.4,
        vx: (Math.random() - 0.5) * 9,
        vy: -Math.random() * 8 - 3,
        size: Math.random() * 5 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.2,
        alpha: 1,
    }));

    let frame = 0;
    const animate = () => {
        frame += 1;
        ctx.clearRect(0, 0, width, height);
        for (const p of particles) {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.28;
            p.rotation += p.vr;
            p.alpha = Math.max(0, 1 - frame / 55);

            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.65);
            ctx.restore();
        }
        if (frame < 55) {
            requestAnimationFrame(animate);
        } else {
            ctx.clearRect(0, 0, width, height);
        }
    };
    requestAnimationFrame(animate);
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
    post,
    isOpen,
    onClose,
    onPostUpdated,
}) => {
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [resolving, setResolving] = useState(false);
    const [justReturned, setJustReturned] = useState(false);
    const [claimDrawerOpen, setClaimDrawerOpen] = useState(false);
    const confettiCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const { showToast } = useToast();

    useEffect(() => {
        setActiveImageIndex(0);
        setJustReturned(false);
    }, [post?.id]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [isOpen, onClose]);

    const hasEditKey = post ? Boolean(getPostEditKey(post.id)) : false;

    const handleResolve = async () => {
        if (!post) return;
        if (!window.confirm("Mark this item as returned to its owner?")) return;
        setResolving(true);
        try {
            const res = await api.resolvePost(post.id);
            setJustReturned(true);
            if (confettiCanvasRef.current) {
                triggerCanvasConfetti(confettiCanvasRef.current);
            }
            showToast("Item marked as returned!", "success");
            onPostUpdated?.(res.post);
        } catch (err: unknown) {
            showToast(
                err instanceof Error
                    ? err.message
                    : "Failed to mark as returned.",
                "error",
            );
        } finally {
            setResolving(false);
        }
    };

    const handleShare = async () => {
        const url = window.location.href;
        await navigator.clipboard.writeText(url);
        showToast("Post link copied to clipboard", "info");
    };

    return (
        <>
            <AnimatePresence>
                {isOpen && post && (
                    <div
                        className="fixed inset-0 z-9990 flex items-end justify-end sm:items-stretch"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="post-detail-title"
                    >
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={EASE_OUT_FAST}
                            onClick={onClose}
                            className="fixed inset-0 bg-black/55 backdrop-blur-[2px]"
                        />

                        {/* Drawer Panel */}
                        <motion.div
                            initial={{ opacity: 0, x: 40 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 40 }}
                            transition={SPRING_SHEET}
                            className="theme-surface relative z-10 flex h-[92vh] sm:h-full w-full max-w-lg flex-col overflow-hidden rounded-t-3xl sm:rounded-none border-t sm:border-t-0 sm:border-l border-border bg-surface text-text shadow-lg"
                        >
                            {/* Confetti overlay canvas */}
                            <canvas
                                ref={confettiCanvasRef}
                                className="pointer-events-none absolute inset-0 z-30 h-full w-full"
                            />

                            {/* Mobile drag handle */}
                            <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-border-strong sm:hidden" />

                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
                                <div className="flex items-center gap-2.5">
                                    <StatusBadge
                                        type={post.type}
                                        status={post.status}
                                    />
                                    <span className="font-mono text-xs text-muted">
                                        #{post.id.slice(0, 8)}
                                    </span>
                                </div>

                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={handleShare}
                                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted transition-colors hover:bg-subtle hover:text-text cursor-pointer"
                                        title="Copy share link"
                                        aria-label="Copy share link"
                                    >
                                        <Share2 className="h-4 w-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted transition-colors hover:bg-subtle hover:text-text cursor-pointer"
                                        title="Close details"
                                        aria-label="Close details"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Scrollable Body */}
                            <div className="flex-1 space-y-5 overflow-y-auto p-5 text-xs">
                                {/* Shared-Element Hero Media */}
                                <div className="space-y-2.5">
                                    <motion.div
                                        layoutId={`post-media-${post.id}`}
                                        transition={SPRING_SNAPPY}
                                        className="relative aspect-4/3 w-full overflow-hidden rounded-2xl border border-border bg-subtle"
                                    >
                                        {post.imageUrls.length > 0 ? (
                                            <img
                                                src={
                                                    post.imageUrls[
                                                        activeImageIndex
                                                    ] ?? post.imageUrls[0]
                                                }
                                                alt={post.title}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted">
                                                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-surface shadow-sm">
                                                    {getCategoryIcon(
                                                        post.category,
                                                        40,
                                                    )}
                                                </div>
                                                <span className="text-xs font-medium text-muted">
                                                    {formatCategoryLabel(
                                                        post.category,
                                                    )}
                                                </span>
                                            </div>
                                        )}
                                    </motion.div>

                                    {post.imageUrls.length > 1 && (
                                        <div className="flex gap-2 overflow-x-auto pb-1">
                                            {post.imageUrls.map((url, i) => (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    onClick={() =>
                                                        setActiveImageIndex(i)
                                                    }
                                                    className={`h-14 w-14 shrink-0 overflow-hidden rounded-xl border transition-all cursor-pointer ${
                                                        activeImageIndex === i
                                                            ? "border-accent ring-2 ring-accent/25"
                                                            : "border-border opacity-65 hover:opacity-100"
                                                    }`}
                                                >
                                                    <img
                                                        src={url}
                                                        alt={`${post.title} thumbnail ${i + 1}`}
                                                        className="h-full w-full object-cover"
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Returned Celebration Banner */}
                                <AnimatePresence>
                                    {(post.status === "returned" ||
                                        justReturned) && (
                                        <motion.div
                                            initial={{
                                                opacity: 0,
                                                scale: 0.95,
                                            }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={SPRING_SNAPPY}
                                            className="flex items-center gap-3 rounded-2xl border border-returned-border bg-returned-bg p-4 text-returned"
                                        >
                                            <CheckCircle2 className="h-5 w-5 shrink-0" />
                                            <div>
                                                <div className="text-xs font-bold">
                                                    Returned to Owner
                                                </div>
                                                <p className="text-[11px] opacity-90">
                                                    This item has been reunited
                                                    with its owner on campus.
                                                </p>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Title & Description */}
                                <div className="space-y-2">
                                    <div className="inline-flex items-center gap-1.5 rounded-lg bg-subtle px-2.5 py-1 text-[11px] font-semibold text-text-secondary">
                                        {formatCategoryLabel(post.category)}
                                    </div>
                                    <h2
                                        id="post-detail-title"
                                        className="font-display text-xl font-bold text-text sm:text-2xl"
                                    >
                                        {post.title}
                                    </h2>
                                    <p className="text-sm leading-relaxed text-text-secondary whitespace-pre-wrap">
                                        {post.description}
                                    </p>
                                </div>

                                {/* Location & Occurred Time */}
                                <div className="grid grid-cols-1 gap-2.5 rounded-2xl border border-border bg-subtle/60 p-4">
                                    <div className="flex items-center gap-2.5 text-text">
                                        <MapPin className="h-4 w-4 shrink-0 text-accent" />
                                        <span>
                                            <strong className="font-semibold">
                                                Location:
                                            </strong>{" "}
                                            {post.locationName}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2.5 text-muted">
                                        <Calendar className="h-4 w-4 shrink-0" />
                                        <span>
                                            {post.type === "lost"
                                                ? "Lost around"
                                                : "Found around"}
                                            :{" "}
                                            {new Date(
                                                post.occurredAt,
                                            ).toLocaleString()}
                                        </span>
                                    </div>
                                    {post.linkedTagCode && (
                                        <div className="flex items-center gap-2.5 font-semibold text-accent">
                                            <TagIcon className="h-4 w-4 shrink-0" />
                                            <span>
                                                Linked QR Tag: #
                                                {post.linkedTagCode}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Claim Verification Button (For Found Items with Question) */}
                                {post.type === "found" &&
                                    post.hasClaimQuestion &&
                                    post.status !== "returned" && (
                                        <div className="rounded-2xl border border-accent/30 bg-accent-soft p-4">
                                            <div className="flex items-center gap-2 font-semibold text-accent">
                                                <ShieldCheck className="h-4 w-4 shrink-0" />
                                                <span>
                                                    Security Question Required
                                                    to Claim
                                                </span>
                                            </div>
                                            <p className="mt-1 text-text-secondary">
                                                The finder set a verification
                                                question to make sure this item
                                                returns to the rightful owner.
                                            </p>
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                onClick={() =>
                                                    setClaimDrawerOpen(true)
                                                }
                                                rightIcon={
                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                }
                                                className="mt-3"
                                            >
                                                Answer Verification Question
                                            </Button>
                                        </div>
                                    )}

                                {/* Direct Contact Channels */}
                                {post.contact.methods.length > 0 &&
                                    post.status !== "returned" && (
                                        <div className="space-y-2">
                                            <div className="font-semibold text-text">
                                                Contact Methods
                                            </div>
                                            <div className="grid grid-cols-1 gap-2">
                                                {post.contact.methods.map(
                                                    (m, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="flex items-center justify-between rounded-xl border border-border bg-subtle/50 px-3.5 py-2.5 font-medium"
                                                        >
                                                            <span className="text-[11px] font-bold tracking-wider text-accent uppercase">
                                                                {m.kind}
                                                            </span>
                                                            <span className="font-mono text-xs text-text">
                                                                {m.value}
                                                            </span>
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        </div>
                                    )}

                                {/* Poster Management Action (Mark as Returned) */}
                                {hasEditKey && post.status !== "returned" && (
                                    <div className="rounded-2xl border border-found-border bg-found-bg p-4">
                                        <div className="font-semibold text-found">
                                            Manage Your Notice
                                        </div>
                                        <p className="mt-1 text-text-secondary">
                                            You posted this notice from this
                                            browser. Mark it as returned once
                                            the item is back home.
                                        </p>
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            loading={resolving}
                                            onClick={handleResolve}
                                            leftIcon={
                                                <CheckCircle2 className="h-4 w-4" />
                                            }
                                            className="mt-3"
                                        >
                                            Mark as Returned
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {post && (
                <ClaimVerifyDrawer
                    post={post}
                    isOpen={claimDrawerOpen}
                    onClose={() => setClaimDrawerOpen(false)}
                />
            )}
        </>
    );
};

export default ChatDrawer;
