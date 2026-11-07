import React, { useState } from "react";
import {
    AlertCircle,
    CheckCircle2,
    ShieldQuestion,
    Unlock,
} from "lucide-react";
import { api, ApiError } from "../lib/api";
import type { ContactMethod, Post } from "../types";
import { Button, Input, Modal } from "./ui/primitives";

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
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Claim Verification"
            description="Answer the finder’s security question to unlock direct contact info."
            maxWidthClass="max-w-md"
        >
            <div className="space-y-4 text-xs">
                <div className="rounded-xl border border-border bg-subtle/60 p-3.5">
                    <span className="text-[11px] font-semibold tracking-wider text-muted uppercase">
                        Item Notice
                    </span>
                    <div className="font-display mt-0.5 text-sm font-bold text-text">
                        {post.title}
                    </div>
                    <div className="mt-1 text-muted">
                        Spotted / Turned in at:{" "}
                        <strong className="text-text-secondary">
                            {post.locationName}
                        </strong>
                    </div>
                </div>

                {verifiedMethods ? (
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-accent/35 bg-accent-soft p-4 text-center">
                            <CheckCircle2 className="mx-auto h-8 w-8 text-accent" />
                            <h4 className="font-display mt-2 text-base font-bold text-text">
                                Verification Successful!
                            </h4>
                            <p className="mt-1 text-text-secondary">
                                You answered the poster&apos;s security
                                question.
                            </p>
                        </div>

                        {dropOffHub && (
                            <div className="rounded-xl border border-border bg-subtle p-3 text-text">
                                <strong>Suggested Campus Drop-Off:</strong>{" "}
                                {dropOffHub}
                            </div>
                        )}

                        {verifiedMethods.length > 0 ? (
                            <div className="space-y-2">
                                <div className="font-semibold text-text">
                                    Poster Contact Channels:
                                </div>
                                {verifiedMethods.map((m, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between rounded-xl border border-border bg-subtle/70 px-3.5 py-2.5 font-medium"
                                    >
                                        <span className="font-bold text-accent uppercase">
                                            {m.kind}
                                        </span>
                                        <span className="font-mono text-text">
                                            {m.value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted">
                                This item is managed via anonymous relay
                                messaging or deposited at the campus hub.
                            </p>
                        )}

                        <Button
                            variant="primary"
                            className="w-full"
                            onClick={onClose}
                        >
                            Done
                        </Button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-3.5">
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 font-semibold text-text">
                                <ShieldQuestion className="h-4 w-4 text-found" />
                                <span>Security Question Set by Poster:</span>
                            </div>
                            <p className="rounded-xl border border-found-border bg-found-bg p-3 font-medium text-found">
                                &ldquo;{post.claimQuestionPrompt}&rdquo;
                            </p>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 rounded-xl border border-danger/40 bg-danger-bg p-3 text-danger">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <Input
                            id="claim-answer-input"
                            label="Your Answer *"
                            required
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            placeholder="Type your answer here..."
                        />

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <Button variant="secondary" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="primary"
                                loading={verifying}
                                disabled={!answer.trim()}
                                leftIcon={<Unlock className="h-4 w-4" />}
                            >
                                Verify Claim
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        </Modal>
    );
};

export default ClaimVerifyDrawer;
