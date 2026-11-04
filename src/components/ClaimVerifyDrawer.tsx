import React, { useEffect, useRef, useState } from "react";
import {
    X,
    Check,
    Lock,
    MessageSquare,
    ExternalLink,
    Phone,
    Trash2,
} from "lucide-react";
import type { DemoUser, PostItem } from "../types";
import { getHubById } from "../data/hubs";

interface ClaimVerifyDrawerProps {
    post: PostItem | null;
    currentUser: DemoUser;
    isVerified: boolean;
    onClose: () => void;
    onSubmitClaim: (
        postId: string,
        answer: string,
        contactInfo: string,
    ) => void;
    onReviewClaim: (
        postId: string,
        claimId: string,
        status: "APPROVED" | "REJECTED",
    ) => void;
    onResolvePost: (
        postId: string,
        passcode?: string,
    ) => { ok: boolean; error?: string };
    onDeletePost: (
        postId: string,
        passcode?: string,
    ) => { ok: boolean; error?: string };
    onOpenChat: (post: PostItem) => void;
    onJumpToQrTag?: (tagId: string) => void;
}

export const ClaimVerifyDrawer: React.FC<ClaimVerifyDrawerProps> = ({
    post,
    currentUser,
    isVerified,
    onClose,
    onSubmitClaim,
    onReviewClaim,
    onResolvePost,
    onDeletePost,
    onOpenChat,
    onJumpToQrTag,
}) => {
    const [answer, setAnswer] = useState("");
    const [contactInfo, setContactInfo] = useState("");
    const [formError, setFormError] = useState("");
    const [formSuccess, setFormSuccess] = useState("");
    const [passcodeInput, setPasscodeInput] = useState("");
    const [actionError, setActionError] = useState("");
    const [showPasscodePrompt, setShowPasscodePrompt] = useState<
        "resolve" | "delete" | null
    >(null);

    const closeButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        setAnswer("");
        setContactInfo("");
        setFormError("");
        setFormSuccess("");
        setPasscodeInput("");
        setActionError("");
        setShowPasscodePrompt(null);
        if (post) {
            closeButtonRef.current?.focus();
        }
    }, [post]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && post) onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [post, onClose]);

    if (!post) return null;

    const hub = getHubById(post.hubId);
    const isOwnerOrStaff =
        currentUser.name === post.posterName ||
        currentUser.role === "OFFICE" ||
        currentUser.role === "FACULTY" ||
        currentUser.role === "GUARD";

    const hasApprovedClaim = post.claims.some((c) => c.status === "APPROVED");
    const canViewContacts =
        post.type === "LOST" ||
        isVerified ||
        hasApprovedClaim ||
        isOwnerOrStaff ||
        !post.verificationQuestion;

    const handleClaimSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setFormError("");
        setFormSuccess("");

        if (!answer.trim()) {
            setFormError(
                post.type === "FOUND"
                    ? "Please enter your answer to the verification question."
                    : "Please describe where the item is or how the owner can retrieve it.",
            );
            return;
        }
        if (!contactInfo.trim()) {
            setFormError(
                "Please provide a phone number, room, or Messenger handle.",
            );
            return;
        }

        onSubmitClaim(post.id, answer.trim(), contactInfo.trim());
        setAnswer("");
        setContactInfo("");
        setFormSuccess(
            post.type === "FOUND"
                ? "Verification submitted. If your answer matches, contact channels unlock below."
                : "Sighting details sent to the item owner.",
        );
    };

    const handleConfirmProtectedAction = (e: React.FormEvent) => {
        e.preventDefault();
        setActionError("");
        if (!showPasscodePrompt) return;

        const result =
            showPasscodePrompt === "resolve"
                ? onResolvePost(post.id, passcodeInput)
                : onDeletePost(post.id, passcodeInput);

        if (!result.ok) {
            setActionError(result.error || "Incorrect passcode.");
        } else {
            setShowPasscodePrompt(null);
            setPasscodeInput("");
        }
    };

    const statusLabel =
        post.status === "RESOLVED"
            ? "Returned"
            : post.type === "LOST"
              ? "Lost"
              : "Found";
    const statusDotClass =
        post.status === "RESOLVED"
            ? "bg-returned"
            : post.type === "LOST"
              ? "bg-lost"
              : "bg-found";

    return (
        <div
            className="fixed inset-0 z-50 flex justify-end bg-black/25 dark:bg-black/50 transition-opacity duration-150"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="drawer-item-title"
        >
            <div
                className="w-full max-w-lg bg-surface border-l border-border h-full overflow-y-auto p-6 shadow-popover flex flex-col justify-between"
                onClick={(e) => e.stopPropagation()}
            >
                <div>
                    {/* Top bar */}
                    <div className="flex items-start justify-between gap-4 pb-4 border-b border-border">
                        <div>
                            <div className="flex items-center gap-2 text-xs text-muted mb-1">
                                <span
                                    className={`w-1.5 h-1.5 rounded-full ${statusDotClass}`}
                                />
                                <span>{statusLabel}</span>
                                <span>·</span>
                                <span>{post.category}</span>
                                <span>·</span>
                                <span>{post.createdAt}</span>
                            </div>
                            <h2
                                id="drawer-item-title"
                                className="text-base font-medium text-text"
                            >
                                {post.title}
                            </h2>
                        </div>
                        <button
                            ref={closeButtonRef}
                            onClick={onClose}
                            aria-label="Close panel"
                            className="p-1.5 text-muted hover:text-text rounded-md transition-colors duration-150"
                        >
                            <X size={18} strokeWidth={1.5} />
                        </button>
                    </div>

                    {/* Optional photo */}
                    {post.photoUrl && (
                        <div className="py-4 border-b border-border">
                            <img
                                src={post.photoUrl}
                                alt={post.title}
                                className="w-full max-h-52 object-cover rounded-md border border-border"
                            />
                        </div>
                    )}

                    {/* Ruled Label / Value Layout */}
                    <dl className="divide-y divide-border text-sm">
                        <div className="py-3.5 grid grid-cols-3 gap-4">
                            <dt className="text-muted">Description</dt>
                            <dd className="col-span-2 text-text leading-relaxed">
                                {post.description}
                            </dd>
                        </div>

                        <div className="py-3.5 grid grid-cols-3 gap-4">
                            <dt className="text-muted">Campus hub</dt>
                            <dd className="col-span-2 text-text">
                                <div>{hub.name}</div>
                                <div className="text-xs text-muted mt-0.5">
                                    {post.locationDetail}
                                </div>
                            </dd>
                        </div>

                        <div className="py-3.5 grid grid-cols-3 gap-4">
                            <dt className="text-muted">Custody note</dt>
                            <dd className="col-span-2 text-xs text-muted leading-relaxed">
                                {hub.custodyNote}
                            </dd>
                        </div>

                        <div className="py-3.5 grid grid-cols-3 gap-4">
                            <dt className="text-muted">Posted by</dt>
                            <dd className="col-span-2 text-text">
                                <div>{post.posterName}</div>
                                <div className="text-xs text-muted mt-0.5">
                                    {post.posterDept}
                                </div>
                            </dd>
                        </div>

                        {post.linkedQrTag && (
                            <div className="py-3.5 grid grid-cols-3 gap-4 items-center">
                                <dt className="text-muted">Tag ID</dt>
                                <dd className="col-span-2 flex items-center justify-between">
                                    <span className="font-mono text-xs text-text">
                                        {post.linkedQrTag}
                                    </span>
                                    {onJumpToQrTag && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onJumpToQrTag(post.linkedQrTag!)
                                            }
                                            className="text-xs font-medium text-accent hover:opacity-80 transition-opacity duration-150"
                                        >
                                            Open in Scan
                                        </button>
                                    )}
                                </dd>
                            </div>
                        )}
                    </dl>

                    {/* Verification Question / Claim Form */}
                    {post.status === "OPEN" && (
                        <div className="mt-6 pt-6 border-t border-border">
                            <h3 className="text-sm font-medium text-text mb-1">
                                {post.type === "FOUND"
                                    ? "Verify ownership to claim"
                                    : "Report sighting or handover"}
                            </h3>
                            {post.type === "FOUND" &&
                            post.verificationQuestion ? (
                                <p className="text-sm text-muted mb-4">
                                    {post.verificationQuestion}
                                </p>
                            ) : (
                                <p className="text-sm text-muted mb-4">
                                    Share where you found or turned in this item
                                    so {post.posterName} can pick it up.
                                </p>
                            )}

                            <form
                                onSubmit={handleClaimSubmit}
                                className="space-y-3"
                            >
                                <div>
                                    <label
                                        htmlFor="claim-answer"
                                        className="block text-xs text-muted mb-1"
                                    >
                                        {post.type === "FOUND"
                                            ? "Your answer"
                                            : "Current location or custody desk"}
                                    </label>
                                    <textarea
                                        id="claim-answer"
                                        rows={2}
                                        value={answer}
                                        onChange={(e) =>
                                            setAnswer(e.target.value)
                                        }
                                        placeholder={
                                            post.type === "FOUND"
                                                ? "Provide specific identifying details..."
                                                : "e.g. Turned in to Officer Bautista at the Main Gate..."
                                        }
                                        className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-md text-text placeholder:text-muted"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="claim-contact"
                                        className="block text-xs text-muted mb-1"
                                    >
                                        Your contact detail (phone, Messenger,
                                        or classroom)
                                    </label>
                                    <input
                                        id="claim-contact"
                                        type="text"
                                        value={contactInfo}
                                        onChange={(e) =>
                                            setContactInfo(e.target.value)
                                        }
                                        placeholder="e.g. 0917-xxx-xxxx or Grade 12 STEM A"
                                        className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-md text-text placeholder:text-muted"
                                    />
                                </div>

                                {formError && (
                                    <p className="text-xs text-lost">
                                        {formError}
                                    </p>
                                )}
                                {formSuccess && (
                                    <p className="text-xs text-returned">
                                        {formSuccess}
                                    </p>
                                )}

                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-accent text-accent-fg text-sm font-medium rounded-md hover:opacity-90 transition-opacity duration-150"
                                >
                                    {post.type === "FOUND"
                                        ? "Submit verification"
                                        : "Send update"}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Claims History (for Poster / Staff review) */}
                    {post.claims.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-border">
                            <h3 className="text-sm font-medium text-text mb-3">
                                Submitted claims ({post.claims.length})
                            </h3>
                            <div className="divide-y divide-border border-t border-b border-border">
                                {post.claims.map((claim) => (
                                    <div
                                        key={claim.id}
                                        className="py-3 text-sm"
                                    >
                                        <div className="flex items-center justify-between text-xs text-muted mb-1">
                                            <span>
                                                {claim.claimantName} ·{" "}
                                                {claim.claimantRole} ·{" "}
                                                {claim.createdAt}
                                            </span>
                                            <span className="inline-flex items-center gap-1.5">
                                                <span
                                                    className={`w-1.5 h-1.5 rounded-full ${
                                                        claim.status ===
                                                        "APPROVED"
                                                            ? "bg-returned"
                                                            : claim.status ===
                                                                "REJECTED"
                                                              ? "bg-lost"
                                                              : "bg-found"
                                                    }`}
                                                />
                                                {claim.status === "APPROVED"
                                                    ? "Approved"
                                                    : claim.status ===
                                                        "REJECTED"
                                                      ? "Declined"
                                                      : "Pending"}
                                            </span>
                                        </div>
                                        <p className="text-text text-sm">
                                            {claim.answer}
                                        </p>
                                        <p className="text-xs text-muted mt-1">
                                            Contact: {claim.contactInfo}
                                        </p>

                                        {isOwnerOrStaff &&
                                            claim.status === "PENDING" && (
                                                <div className="flex items-center gap-4 mt-2">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            onReviewClaim(
                                                                post.id,
                                                                claim.id,
                                                                "APPROVED",
                                                            )
                                                        }
                                                        className="text-xs font-medium text-returned hover:opacity-80"
                                                    >
                                                        Approve claim
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            onReviewClaim(
                                                                post.id,
                                                                claim.id,
                                                                "REJECTED",
                                                            )
                                                        }
                                                        className="text-xs font-medium text-lost hover:opacity-80"
                                                    >
                                                        Decline
                                                    </button>
                                                </div>
                                            )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Contact Options (shown simply after verification) */}
                    <div className="mt-6 pt-6 border-t border-border">
                        <h3 className="text-sm font-medium text-text mb-2">
                            Contact options
                        </h3>
                        {canViewContacts ? (
                            <div className="flex flex-wrap items-center gap-3">
                                {post.contactChannels.inAppChat && (
                                    <button
                                        type="button"
                                        onClick={() => onOpenChat(post)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-md text-text hover:bg-subtle transition-colors duration-150"
                                    >
                                        <MessageSquare
                                            size={15}
                                            strokeWidth={1.5}
                                        />
                                        Campus chat
                                    </button>
                                )}
                                {post.contactChannels.messenger && (
                                    <a
                                        href={`https://${post.contactChannels.messenger.replace(/^https?:\/\//, "")}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-md text-text hover:bg-subtle transition-colors duration-150"
                                    >
                                        <ExternalLink
                                            size={15}
                                            strokeWidth={1.5}
                                        />
                                        Messenger
                                    </a>
                                )}
                                {post.contactChannels.sms && (
                                    <a
                                        href={`sms:${post.contactChannels.sms}`}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-md text-text hover:bg-subtle transition-colors duration-150"
                                    >
                                        <Phone size={15} strokeWidth={1.5} />
                                        SMS ({post.contactChannels.sms})
                                    </a>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-xs text-muted py-1">
                                <Lock size={14} strokeWidth={1.5} />
                                <span>
                                    Direct contact links appear once ownership
                                    verification is approved.
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Management Actions */}
                <div className="mt-8 pt-4 border-t border-border">
                    {showPasscodePrompt ? (
                        <form
                            onSubmit={handleConfirmProtectedAction}
                            className="space-y-2"
                        >
                            <label className="block text-xs text-muted">
                                Enter post passcode to{" "}
                                {showPasscodePrompt === "resolve"
                                    ? "mark returned"
                                    : "delete"}{" "}
                                (demo: 1234)
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="password"
                                    value={passcodeInput}
                                    onChange={(e) =>
                                        setPasscodeInput(e.target.value)
                                    }
                                    placeholder="Passcode"
                                    className="px-2.5 py-1.5 text-xs bg-bg border border-border rounded-md text-text w-36"
                                />
                                <button
                                    type="submit"
                                    className="px-3 py-1.5 text-xs font-medium bg-accent text-accent-fg rounded-md"
                                >
                                    Confirm
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowPasscodePrompt(null);
                                        setActionError("");
                                    }}
                                    className="text-xs text-muted hover:text-text"
                                >
                                    Cancel
                                </button>
                            </div>
                            {actionError && (
                                <p className="text-xs text-lost">
                                    {actionError}
                                </p>
                            )}
                        </form>
                    ) : (
                        <div className="flex items-center justify-between text-xs">
                            {post.status === "OPEN" ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (post.passcode && !isOwnerOrStaff) {
                                            setShowPasscodePrompt("resolve");
                                        } else {
                                            onResolvePost(
                                                post.id,
                                                post.passcode,
                                            );
                                        }
                                    }}
                                    className="inline-flex items-center gap-1.5 font-medium text-text hover:text-accent transition-colors duration-150"
                                >
                                    <Check size={15} strokeWidth={1.5} />
                                    Mark as returned
                                </button>
                            ) : (
                                <span className="text-muted">
                                    Marked as returned
                                </span>
                            )}

                            <button
                                type="button"
                                onClick={() => {
                                    if (post.passcode && !isOwnerOrStaff) {
                                        setShowPasscodePrompt("delete");
                                    } else {
                                        onDeletePost(post.id, post.passcode);
                                    }
                                }}
                                className="inline-flex items-center gap-1 text-muted hover:text-lost transition-colors duration-150"
                            >
                                <Trash2 size={14} strokeWidth={1.5} />
                                Remove post
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
