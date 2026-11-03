import React, { useState } from "react";
import {
    X,
    ShieldCheck,
    HelpCircle,
    CheckCircle2,
    XCircle,
    Unlock,
    UserCheck,
} from "lucide-react";
import type { CampusRole, UserProfile, VerificationClaim, WallPost } from "../types";

interface ClaimVerifyDrawerProps {
    post: WallPost | null;
    onClose: () => void;
    currentUser: UserProfile;
    onSubmitClaim: (
        postId: string,
        claimantName: string,
        claimantRole: CampusRole,
        answer: string,
        contactInfo: string,
    ) => void;
    onReviewClaim: (
        postId: string,
        claimId: string,
        decision: "approved" | "rejected",
    ) => void;
}

export const ClaimVerifyDrawer: React.FC<ClaimVerifyDrawerProps> = ({
    post,
    onClose,
    currentUser,
    onSubmitClaim,
    onReviewClaim,
}) => {
    const [answer, setAnswer] = useState("");
    const [contactInfo, setContactInfo] = useState(
        "https://m.me/student.claimant | 0917-555-0199",
    );
    const [submittedSuccess, setSubmittedSuccess] = useState(false);

    if (!post) return null;

    const approvedClaim = post.claims.find((c) => c.status === "approved");

    const handleClaimSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!answer.trim()) return;
        onSubmitClaim(
            post.id,
            currentUser.name,
            currentUser.role,
            answer.trim(),
            contactInfo.trim(),
        );
        setAnswer("");
        setSubmittedSuccess(true);
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm">
            <div className="radar-card w-full max-w-lg h-full flex flex-col justify-between border-l border-white/15 overflow-y-auto">
                <div className="p-6 space-y-6">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
                        <div>
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono-tabular uppercase px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                <ShieldCheck className="w-3.5 h-3.5" />{" "}
                                Anti-Theft Ownership Verification
                            </span>
                            <h3 className="text-lg font-bold text-white mt-2">
                                {post.title}
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Custody Holder:{" "}
                                <span className="text-slate-200 font-medium">
                                    {post.poster_name}
                                </span>{" "}
                                • {post.campus_hub}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Challenge Prompt Box */}
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300">
                            <HelpCircle className="w-4 h-4" />
                            Verification Challenge Question
                        </div>
                        <p className="text-sm font-semibold text-white">
                            "
                            {post.verification_question ||
                                "Describe a unique identifying mark or contents inside this item."}
                            "
                        </p>
                    </div>

                    {/* Unlocked Pickup Instructions when Approved */}
                    {approvedClaim && (
                        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 space-y-2">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase text-emerald-300">
                                <Unlock className="w-4 h-4" />
                                Ownership Verified — Pickup Instructions
                                Unlocked
                            </div>
                            <p className="text-xs text-emerald-100 leading-relaxed">
                                {post.sensitive_pickup_note ||
                                    `Proceed to ${post.campus_hub} (${post.room_detail}) with your School ID.`}
                            </p>
                        </div>
                    )}

                    {/* Student Claim Submission Form */}
                    <form
                        onSubmit={handleClaimSubmit}
                        className="space-y-4 border-b border-white/10 pb-6"
                    >
                        <h4 className="text-xs font-mono-tabular uppercase tracking-wider text-slate-300">
                            1. Submit Your Proof of Ownership
                        </h4>
                        <div>
                            <label className="block text-xs text-slate-300 mb-1">
                                Your Answer / Identifying Proof *
                            </label>
                            <textarea
                                rows={3}
                                required
                                value={answer}
                                onChange={(e) => setAnswer(e.target.value)}
                                placeholder="State specific stickers, serial numbers, wallpaper, or items inside..."
                                className="w-full px-3.5 py-2.5 rounded-xl bg-radar-bg border border-white/10 text-xs text-white focus:border-amber-400 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-300 mb-1">
                                Your Messenger Link or Mobile Number
                            </label>
                            <input
                                type="text"
                                required
                                value={contactInfo}
                                onChange={(e) => setContactInfo(e.target.value)}
                                className="w-full px-3.5 py-2 rounded-xl bg-radar-bg border border-white/10 text-xs text-white"
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition cursor-pointer"
                        >
                            Submit Ownership Claim for Review
                        </button>
                        {submittedSuccess && (
                            <p className="text-xs text-emerald-400 text-center font-medium">
                                Claim submitted! The finder/staff member can
                                review and approve it below.
                            </p>
                        )}
                    </form>

                    {/* Finder / Staff Verification Review Console */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-mono-tabular uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                                <UserCheck className="w-4 h-4 text-blue-400" />
                                2. Finder / Staff Claim Review Queue (
                                {post.claims.length})
                            </h4>
                        </div>

                        {post.claims.length === 0 ? (
                            <div className="p-4 rounded-xl bg-radar-bg border border-white/5 text-xs text-slate-400 text-center">
                                No claims submitted yet.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {post.claims.map((claim: VerificationClaim) => (
                                    <div
                                        key={claim.id}
                                        className="p-3.5 rounded-xl bg-radar-bg border border-white/10 space-y-2.5"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-white">
                                                {claim.claimant_name}{" "}
                                                <span className="font-mono-tabular text-[10px] uppercase px-1.5 py-0.5 rounded bg-white/10 text-slate-300 ml-1">
                                                    {claim.claimant_role}
                                                </span>
                                            </span>
                                            <span
                                                className={`text-[10px] font-mono-tabular uppercase px-2 py-0.5 rounded-full font-semibold ${
                                                    claim.status === "approved"
                                                        ? "bg-emerald-500/20 text-emerald-300"
                                                        : claim.status ===
                                                            "rejected"
                                                          ? "bg-red-500/20 text-red-400"
                                                          : "bg-amber-500/20 text-amber-300"
                                                }`}
                                            >
                                                {claim.status}
                                            </span>
                                        </div>

                                        <p className="text-xs text-slate-200 bg-radar-card p-2.5 rounded-lg border border-white/5">
                                            "{claim.verification_answer}"
                                        </p>
                                        <div className="text-[11px] font-mono-tabular text-slate-400">
                                            Contact: {claim.contact_info} •{" "}
                                            {claim.created_at}
                                        </div>

                                        {claim.status === "pending" && (
                                            <div className="flex items-center gap-2 pt-1">
                                                <button
                                                    onClick={() =>
                                                        onReviewClaim(
                                                            post.id,
                                                            claim.id,
                                                            "approved",
                                                        )
                                                    }
                                                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition cursor-pointer"
                                                >
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    Approve & Unlock Pickup
                                                    Details
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        onReviewClaim(
                                                            post.id,
                                                            claim.id,
                                                            "rejected",
                                                        )
                                                    }
                                                    className="inline-flex items-center justify-center gap-1 py-1.5 px-3 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 text-xs font-semibold transition cursor-pointer"
                                                >
                                                    <XCircle className="w-3.5 h-3.5" />
                                                    Reject
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
