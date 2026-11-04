import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { CAMPUS_HUBS, ITEM_CATEGORIES } from "../data/hubs";
import type { DemoUser, PostItem, PostType, QrGearItem } from "../types";

interface PostModalProps {
    isOpen: boolean;
    currentUser: DemoUser;
    registeredGear: QrGearItem[];
    onClose: () => void;
    onCreatePost: (
        post: Omit<PostItem, "id" | "createdAt" | "claims" | "status">,
    ) => void;
}

export const PostModal: React.FC<PostModalProps> = ({
    isOpen,
    currentUser,
    registeredGear,
    onClose,
    onCreatePost,
}) => {
    const [type, setType] = useState<PostType>("LOST");
    const [title, setTitle] = useState("");
    const [category, setCategory] = useState(ITEM_CATEGORIES[0]);
    const [description, setDescription] = useState("");
    const [hubId, setHubId] = useState(CAMPUS_HUBS[0].id);
    const [locationDetail, setLocationDetail] = useState("");
    const [verificationQuestion, setVerificationQuestion] = useState("");
    const [photoUrl, setPhotoUrl] = useState("");
    const [linkedQrTag, setLinkedQrTag] = useState("");
    const [messenger, setMessenger] = useState("");
    const [sms, setSms] = useState("");
    const [passcode, setPasscode] = useState("");
    const [errors, setErrors] = useState<Record<string, string>>({});

    const titleInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setErrors({});
            setTimeout(() => titleInputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === "string") {
                setPhotoUrl(reader.result);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const nextErrors: Record<string, string> = {};

        if (!title.trim()) nextErrors.title = "Item title is required.";
        if (!description.trim())
            nextErrors.description = "Brief description is required.";
        if (type === "FOUND" && !verificationQuestion.trim()) {
            nextErrors.verificationQuestion =
                "Add a verification question so only the true owner can claim this item.";
        }

        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors);
            return;
        }

        const selectedHub =
            CAMPUS_HUBS.find((h) => h.id === hubId) || CAMPUS_HUBS[0];

        onCreatePost({
            type,
            title: title.trim(),
            category,
            description: description.trim(),
            hubId,
            locationDetail: locationDetail.trim() || selectedHub.building,
            posterName: currentUser.name,
            posterRole: currentUser.role,
            posterDept: currentUser.dept,
            verificationQuestion:
                type === "FOUND" ? verificationQuestion.trim() : undefined,
            photoUrl: photoUrl.trim() || undefined,
            linkedQrTag:
                type === "LOST" && linkedQrTag ? linkedQrTag : undefined,
            passcode: passcode.trim() || undefined,
            contactChannels: {
                inAppChat: true,
                messenger: messenger.trim() || undefined,
                sms: sms.trim() || undefined,
            },
        });

        setTitle("");
        setDescription("");
        setLocationDetail("");
        setVerificationQuestion("");
        setPhotoUrl("");
        setLinkedQrTag("");
        setPasscode("");
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 dark:bg-black/50 p-4 overflow-y-auto"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="post-modal-title"
        >
            <div
                className="w-full max-w-lg bg-surface border border-border rounded-lg p-6 shadow-popover my-8"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between pb-4 border-b border-border">
                    <h2
                        id="post-modal-title"
                        className="text-base font-medium text-text"
                    >
                        Post item
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close modal"
                        className="p-1 text-muted hover:text-text rounded-md"
                    >
                        <X size={18} strokeWidth={1.5} />
                    </button>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="mt-5 space-y-4"
                    noValidate
                >
                    {/* Segmented Type Toggle */}
                    <div>
                        <label className="block text-xs text-muted mb-1.5">
                            Post type
                        </label>
                        <div className="grid grid-cols-2 gap-1 p-1 bg-subtle border border-border rounded-md">
                            <button
                                type="button"
                                onClick={() => setType("LOST")}
                                className={`py-1.5 text-sm font-medium rounded transition-colors duration-150 ${
                                    type === "LOST"
                                        ? "bg-surface text-text border border-border"
                                        : "text-muted hover:text-text"
                                }`}
                            >
                                Lost item
                            </button>
                            <button
                                type="button"
                                onClick={() => setType("FOUND")}
                                className={`py-1.5 text-sm font-medium rounded transition-colors duration-150 ${
                                    type === "FOUND"
                                        ? "bg-surface text-text border border-border"
                                        : "text-muted hover:text-text"
                                }`}
                            >
                                Found item
                            </button>
                        </div>
                    </div>

                    {/* Title */}
                    <div>
                        <label
                            htmlFor="post-title"
                            className="block text-xs text-muted mb-1"
                        >
                            Item title
                        </label>
                        <input
                            ref={titleInputRef}
                            id="post-title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Casio fx-991EX Calculator or Black Leather Wallet"
                            className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-md text-text placeholder:text-muted"
                        />
                        {errors.title && (
                            <p className="text-xs text-lost mt-1">
                                {errors.title}
                            </p>
                        )}
                    </div>

                    {/* Location & Category */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label
                                htmlFor="post-hub"
                                className="block text-xs text-muted mb-1"
                            >
                                Location
                            </label>
                            <select
                                id="post-hub"
                                value={hubId}
                                onChange={(e) => setHubId(e.target.value)}
                                className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-md text-text"
                            >
                                {CAMPUS_HUBS.map((hub) => (
                                    <option key={hub.id} value={hub.id}>
                                        {hub.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label
                                htmlFor="post-category"
                                className="block text-xs text-muted mb-1"
                            >
                                Category
                            </label>
                            <select
                                id="post-category"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-md text-text"
                            >
                                {ITEM_CATEGORIES.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Specific room / desk detail */}
                    <div>
                        <label
                            htmlFor="post-room"
                            className="block text-xs text-muted mb-1"
                        >
                            Specific room or custody spot (optional)
                        </label>
                        <input
                            id="post-room"
                            type="text"
                            value={locationDetail}
                            onChange={(e) => setLocationDetail(e.target.value)}
                            placeholder="e.g. Bleachers Section B or Held at Guidance Room 102"
                            className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-md text-text placeholder:text-muted"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label
                            htmlFor="post-desc"
                            className="block text-xs text-muted mb-1"
                        >
                            Description
                        </label>
                        <textarea
                            id="post-desc"
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="When and where it was last seen or found..."
                            className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-md text-text placeholder:text-muted"
                        />
                        {errors.description && (
                            <p className="text-xs text-lost mt-1">
                                {errors.description}
                            </p>
                        )}
                    </div>

                    {/* Verification question (Found) OR Linked QR tag (Lost) */}
                    {type === "FOUND" ? (
                        <div>
                            <label
                                htmlFor="post-verify"
                                className="block text-xs text-muted mb-1"
                            >
                                Verification question
                            </label>
                            <input
                                id="post-verify"
                                type="text"
                                value={verificationQuestion}
                                onChange={(e) =>
                                    setVerificationQuestion(e.target.value)
                                }
                                placeholder="Ask about a detail not shown in the description (e.g. keychain, wallpaper, name inside cover)"
                                className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-md text-text placeholder:text-muted"
                            />
                            {errors.verificationQuestion && (
                                <p className="text-xs text-lost mt-1">
                                    {errors.verificationQuestion}
                                </p>
                            )}
                        </div>
                    ) : (
                        <div>
                            <label
                                htmlFor="post-qr"
                                className="block text-xs text-muted mb-1"
                            >
                                Link registered tag ID (optional)
                            </label>
                            <select
                                id="post-qr"
                                value={linkedQrTag}
                                onChange={(e) => setLinkedQrTag(e.target.value)}
                                className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-md text-text font-mono"
                            >
                                <option value="">None</option>
                                {registeredGear.map((g) => (
                                    <option key={g.tagId} value={g.tagId}>
                                        {g.tagId} — {g.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Optional photo & passcode */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label
                                htmlFor="post-photo"
                                className="block text-xs text-muted mb-1"
                            >
                                Photo (optional)
                            </label>
                            <input
                                id="post-photo"
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoUpload}
                                className="w-full text-xs text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-border file:bg-subtle file:text-xs file:font-medium file:text-text"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="post-passcode"
                                className="block text-xs text-muted mb-1"
                            >
                                Management passcode (optional)
                            </label>
                            <input
                                id="post-passcode"
                                type="password"
                                value={passcode}
                                onChange={(e) => setPasscode(e.target.value)}
                                placeholder="4-digit PIN to edit/remove"
                                className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-md text-text placeholder:text-muted"
                            />
                        </div>
                    </div>

                    {/* Optional direct contact handles */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label
                                htmlFor="post-messenger"
                                className="block text-xs text-muted mb-1"
                            >
                                Messenger link (optional)
                            </label>
                            <input
                                id="post-messenger"
                                type="text"
                                value={messenger}
                                onChange={(e) => setMessenger(e.target.value)}
                                placeholder="m.me/username"
                                className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-md text-text placeholder:text-muted"
                            />
                        </div>
                        <div>
                            <label
                                htmlFor="post-sms"
                                className="block text-xs text-muted mb-1"
                            >
                                SMS number (optional)
                            </label>
                            <input
                                id="post-sms"
                                type="text"
                                value={sms}
                                onChange={(e) => setSms(e.target.value)}
                                placeholder="0917-xxx-xxxx"
                                className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-md text-text placeholder:text-muted"
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3.5 py-2 text-sm text-muted hover:text-text transition-colors duration-150"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-accent text-accent-fg text-sm font-medium rounded-md hover:opacity-90 transition-opacity duration-150"
                        >
                            Publish post
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
