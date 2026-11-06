import React, { useState } from "react";
import {
    AlertCircle,
    CheckCircle2,
    ShieldQuestion,
    Unlock,
    X,
} from "lucide-react";
import { api, ApiError } from "../lib/api";
import type { ContactMethod, Post } from "../types";

export interface ClaimVerifyDrawerProps {
    post: Post;
    isOpen: boolean;
    onClose: () => void;
}

export const ClaimVerifyDrawer: React.FC<ClaimVerifyDrawerProps> = ({
    post,
    isOpen,
    onClose,
}) => {
    const [answer, setAnswer] = useState("");
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [verifiedMethods, setVerifiedMethods] = useState<
        ContactMethod[] | null
    >(null);
    const [dropOffHub, setDropOffHub] = useState<string | undefined>(undefined);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!answer.trim()) return;
        setVerifying(true);
        setError(null);

        try {
            const res = await api.verifyClaimAnswer(post.id, answer.trim());
            setVerifiedMethods(res.methods);
            setDropOffHub(res.dropOffHub);
        } catch (err: unknown) {
            setError(
                err instanceof ApiError && err.code === "CLAIM_MISMATCH"
                    ? "Incorrect answer. Please check with the poster or try again."
                    : err instanceof Error
                      ? err.message
                      : "Verification failed.",
            );
        } finally {
            setVerifying(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
        >
            <div className="w-full max-w-md overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 p-5 text-neutral-100 shadow-2xl">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                    <div className="flex items-center gap-2">
                        <ShieldQuestion className="h-5 w-5 text-emerald-400" />
                        <h3 className="text-base font-bold">
                            Claim Verification
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-800"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="mt-4 space-y-4 text-xs">
                    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3.5">
                        <span className="text-[11px] font-semibold tracking-wider text-neutral-400 uppercase">
                            Item
                        </span>
                        <div className="font-semibold text-neutral-100">
                            {post.title}
                        </div>
                        <div className="mt-1 text-neutral-400">
                            Posted at:{" "}
                            <strong className="text-neutral-200">
                                {post.locationName}
                            </strong>
                        </div>
                    </div>

                    {verifiedMethods ? (
                        <div className="space-y-4">
                            <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-4 text-center">
                                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
                                <h4 className="mt-2 text-sm font-bold text-emerald-200">
                                    Verification Successful!
                                </h4>
                                <p className="mt-1 text-neutral-300">
                                    You successfully answered the poster&apos;s
                                    verification question.
                                </p>
                            </div>

                            {dropOffHub && (
                                <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-3 text-neutral-200">
                                    <strong>Suggested Campus Drop-Off:</strong>{" "}
                                    {dropOffHub}
                                </div>
                            )}

                            {verifiedMethods.length > 0 ? (
                                <div className="space-y-2">
                                    <div className="font-semibold text-neutral-300">
                                        Poster Contact Channels:
                                    </div>
                                    {verifiedMethods.map((m, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 font-medium text-emerald-300"
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
                            ) : (
                                <p className="text-neutral-400">
                                    This item is managed via anonymous relay
                                    messaging or deposited at the campus hub.
                                </p>
                            )}

                            <button
                                type="button"
                                onClick={onClose}
                                className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 font-semibold text-white hover:bg-emerald-500"
                            >
                                Close
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-3.5">
                            <div className="space-y-1">
                                <label className="block font-medium text-neutral-300">
                                    Security Question Set by Poster:
                                </label>
                                <p className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 font-medium text-amber-200">
                                    &ldquo;{post.claimQuestionPrompt}&rdquo;
                                </p>
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-950/30 p-3 text-rose-200">
                                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div>
                                <label
                                    htmlFor="claim-answer-input"
                                    className="mb-1 block font-medium text-neutral-300"
                                >
                                    Your Answer *
                                </label>
                                <input
                                    id="claim-answer-input"
                                    type="text"
                                    required
                                    value={answer}
                                    onChange={(e) => setAnswer(e.target.value)}
                                    placeholder="Type your answer here..."
                                    className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3.5 py-2 text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="rounded-xl border border-neutral-800 px-4 py-2 text-neutral-300 hover:bg-neutral-900"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={verifying || !answer.trim()}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                                >
                                    <Unlock className="h-4 w-4" />
                                    <span>
                                        {verifying
                                            ? "Verifying..."
                                            : "Verify Claim"}
                                    </span>
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ClaimVerifyDrawer;
