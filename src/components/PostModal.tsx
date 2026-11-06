import React, { useEffect, useState } from "react";
import {
    AlertTriangle,
    Check,
    ChevronLeft,
    ChevronRight,
    Copy,
    Download,
    ImagePlus,
    KeyRound,
    Lock,
    MapPin,
    ShieldQuestion,
    Sparkles,
    Tag as TagIcon,
    Trash2,
    X,
} from "lucide-react";
import { CAMPUS_HUBS, INCAT_CENTER } from "../data/hubs";
import { api, ApiError } from "../lib/api";
import {
    exportRecoveryJson,
    getStoredCampusCode,
    setStoredCampusCode,
} from "../lib/keys";
import type {
    CampusLocation,
    ContactConfig,
    CreatePostInput,
    CreatePostResponse,
    ItemCategory,
    Post,
    PostType,
    Tag,
} from "../types";
import { CampusMap } from "./CampusMap";
import { ContactMatrix, DEFAULT_CONTACT_CONFIG } from "./ContactMatrix";

export interface PostModalProps {
    /** Whether the modal is open */
    isOpen?: boolean;
    /** Legacy alias if App.tsx passes `open` */
    open?: boolean;
    onClose: () => void;
    /** Callback when a post is created or updated */
    onCreated?: (post: Post, editKey?: string) => void;
    /** Legacy alias if App.tsx passes `onSubmit` or `onPostCreated` */
    onSubmit?: (post: Post) => void;
    onPostCreated?: (post: Post) => void;
    /** Optional initial post when editing an existing post */
    editingPost?: Post | null;
    /** Optional list of locations from App.tsx */
    locations?: CampusLocation[];
    /** Optional user tags to link to a lost post */
    myTags?: Tag[];
    /** Optional default post type */
    defaultType?: PostType;
}

const CATEGORIES: readonly { value: ItemCategory; label: string }[] = [
    { value: "ids_cards", label: "IDs & Lanyards" },
    { value: "wallets_cash", label: "Wallets & Cash" },
    { value: "calculators", label: "Calculators" },
    { value: "electronics", label: "Phones & Electronics" },
    { value: "tumblers_containers", label: "Tumblers & Lunchboxes" },
    { value: "keys_lanyards", label: "Keys & Keychains" },
    { value: "bags_pouches", label: "Bags & Pouches" },
    { value: "books_notebooks", label: "Books & Notebooks" },
    { value: "apparel_umbrellas", label: "Apparel & Umbrellas" },
    { value: "shop_tools", label: "Shop / Drafting Tools" },
    { value: "other", label: "Other Items" },
] as const;

async function compressImageBeforeUpload(file: File): Promise<File> {
    if (file.size <= 600 * 1024) return file;
    return new Promise((resolve) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            const maxDim = 1400;
            let { width, height } = img;
            if (width > maxDim || height > maxDim) {
                if (width > height) {
                    height = Math.round((height * maxDim) / width);
                    width = maxDim;
                } else {
                    width = Math.round((width * maxDim) / height);
                    height = maxDim;
                }
            }
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                resolve(file);
                return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        resolve(file);
                        return;
                    }
                    const compressed = new File(
                        [blob],
                        file.name.replace(/\.[^.]+$/, ".webp"),
                        { type: "image/webp" },
                    );
                    resolve(compressed);
                },
                "image/webp",
                0.84,
            );
        };
        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(file);
        };
        img.src = objectUrl;
    });
}

export const PostModal: React.FC<PostModalProps> = ({
    isOpen,
    open,
    onClose,
    onCreated,
    onSubmit,
    onPostCreated,
    editingPost = null,
    locations,
    myTags = [],
    defaultType = "lost",
}) => {
    const modalOpen = isOpen ?? open ?? true;
    const availableLocations: readonly CampusLocation[] =
        locations && locations.length > 0 ? locations : CAMPUS_HUBS;

    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [type, setType] = useState<PostType>(
        editingPost?.type ?? defaultType,
    );
    const [title, setTitle] = useState(editingPost?.title ?? "");
    const [category, setCategory] = useState<ItemCategory>(
        editingPost?.category ?? "wallets_cash",
    );
    const [description, setDescription] = useState(
        editingPost?.description ?? "",
    );
    const [locationId, setLocationId] = useState(
        editingPost?.locationId ??
            availableLocations[0]?.id ??
            "loc-guard-house",
    );
    const [coords, setCoords] = useState<{ lat: number; lng: number }>({
        lat: editingPost?.lat ?? availableLocations[0]?.lat ?? INCAT_CENTER.lat,
        lng: editingPost?.lng ?? availableLocations[0]?.lng ?? INCAT_CENTER.lng,
    });
    const [occurredAt, setOccurredAt] = useState<string>(() =>
        editingPost?.occurredAt
            ? editingPost.occurredAt.slice(0, 16)
            : new Date().toISOString().slice(0, 16),
    );
    const [linkedTagCode, setLinkedTagCode] = useState<string>(
        editingPost?.linkedTagCode ?? "",
    );

    // Uploaded image state
    const [imageKeys, setImageKeys] = useState<string[]>(
        editingPost?.imageUrls ?? [],
    );
    const [imagePreviews, setImagePreviews] = useState<string[]>(
        editingPost?.imageUrls ?? [],
    );
    const [uploadingImage, setUploadingImage] = useState(false);

    // Contact & Claim Verification
    const [contact, setContact] = useState<ContactConfig>(
        editingPost?.contact ?? DEFAULT_CONTACT_CONFIG,
    );
    const [enableClaimQuestion, setEnableClaimQuestion] = useState<boolean>(
        Boolean(editingPost?.hasClaimQuestion),
    );
    const [claimQuestionPrompt, setClaimQuestionPrompt] = useState<string>(
        editingPost?.claimQuestionPrompt ?? "",
    );
    const [claimAnswer, setClaimAnswer] = useState<string>("");

    // Campus code & submission state
    const [campusCode, setCampusCode] = useState<string>(getStoredCampusCode());
    const [needsCampusCode, setNeedsCampusCode] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Created capability key state (Step 4)
    const [createdResult, setCreatedResult] =
        useState<CreatePostResponse | null>(null);
    const [copiedKey, setCopiedKey] = useState(false);

    useEffect(() => {
        if (!modalOpen) return;
        setStep(1);
        setErrorMsg(null);
        setCreatedResult(null);
        if (editingPost) {
            setType(editingPost.type);
            setTitle(editingPost.title);
            setCategory(editingPost.category);
            setDescription(editingPost.description);
            setLocationId(editingPost.locationId);
            setCoords({ lat: editingPost.lat, lng: editingPost.lng });
            setImageKeys(editingPost.imageUrls);
            setImagePreviews(editingPost.imageUrls);
            setContact(editingPost.contact);
            setLinkedTagCode(editingPost.linkedTagCode ?? "");
            setEnableClaimQuestion(editingPost.hasClaimQuestion);
            setClaimQuestionPrompt(editingPost.claimQuestionPrompt ?? "");
        }
    }, [modalOpen, editingPost]);

    if (!modalOpen) return null;

    const handleLocationDropdownChange = (nextLocId: string) => {
        setLocationId(nextLocId);
        const hub = availableLocations.find((l) => l.id === nextLocId);
        if (hub) {
            setCoords({ lat: hub.lat, lng: hub.lng });
        }
    };

    const handleImageFileSelect = async (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setErrorMsg(null);

        if (imageKeys.length >= 3) {
            setErrorMsg("You can attach up to 3 photos per post.");
            return;
        }

        try {
            setUploadingImage(true);
            const compressed = await compressImageBeforeUpload(file);
            const localPreview = URL.createObjectURL(compressed);

            try {
                const uploaded = await api.uploadImage(compressed);
                setImageKeys((prev) => [...prev, uploaded.key]);
                setImagePreviews((prev) => [
                    ...prev,
                    uploaded.url || localPreview,
                ]);
            } catch {
                // Fallback if R2 bucket is not bound in pure Vite mode
                const reader = new FileReader();
                reader.onloadend = () => {
                    if (typeof reader.result === "string") {
                        setImageKeys((prev) => [
                            ...prev,
                            reader.result as string,
                        ]);
                        setImagePreviews((prev) => [
                            ...prev,
                            reader.result as string,
                        ]);
                    }
                };
                reader.readAsDataURL(compressed);
            }
        } catch (err) {
            setErrorMsg(
                err instanceof Error ? err.message : "Failed to process image.",
            );
        } finally {
            setUploadingImage(false);
            e.target.value = "";
        }
    };

    const removeImageAt = (idx: number) => {
        setImageKeys((prev) => prev.filter((_, i) => i !== idx));
        setImagePreviews((prev) => prev.filter((_, i) => i !== idx));
    };

    const canAdvanceFromStep1 =
        title.trim().length >= 3 && description.trim().length >= 5;

    const handleFinalSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        if (!canAdvanceFromStep1) {
            setErrorMsg("Please enter an item title and description.");
            setStep(1);
            return;
        }

        if (
            type === "found" &&
            enableClaimQuestion &&
            (!claimQuestionPrompt.trim() ||
                (!editingPost && !claimAnswer.trim()))
        ) {
            setErrorMsg(
                "Please provide both the verification question and expected answer.",
            );
            return;
        }

        if (campusCode.trim()) {
            setStoredCampusCode(campusCode.trim());
        }

        const payload: CreatePostInput = {
            type,
            title: title.trim(),
            description: description.trim(),
            category,
            locationId,
            lat: coords.lat,
            lng: coords.lng,
            imageKeys,
            contact,
            linkedTagCode: linkedTagCode.trim() || undefined,
            claimQuestionPrompt:
                type === "found" && enableClaimQuestion
                    ? claimQuestionPrompt.trim()
                    : undefined,
            claimAnswer:
                type === "found" && enableClaimQuestion
                    ? claimAnswer.trim()
                    : undefined,
            occurredAt: occurredAt
                ? new Date(occurredAt).toISOString()
                : new Date().toISOString(),
            turnstileToken: "dev-bypass-token",
        };

        try {
            setSubmitting(true);
            if (editingPost) {
                const { post } = await api.updatePost(editingPost.id, payload);
                onCreated?.(post);
                onSubmit?.(post);
                onPostCreated?.(post);
                onClose();
            } else {
                const res = await api.createPost(payload);
                setCreatedResult(res);
                setStep(4);
                onCreated?.(res.post, res.editKey);
                onSubmit?.(res.post);
                onPostCreated?.(res.post);
            }
        } catch (err) {
            if (
                err instanceof ApiError &&
                err.code === "CAMPUS_CODE_REQUIRED"
            ) {
                setNeedsCampusCode(true);
                setErrorMsg(
                    "Enter the INCAT campus access code below to publish your post.",
                );
            } else {
                setErrorMsg(
                    err instanceof Error
                        ? err.message
                        : "Could not publish post. Please try again.",
                );
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleCopyEditLink = async () => {
        if (!createdResult) return;
        const fullUrl = `${window.location.origin}${createdResult.manageUrl}`;
        await navigator.clipboard.writeText(fullUrl);
        setCopiedKey(true);
        setTimeout(() => setCopiedKey(false), 2500);
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="post-modal-title"
        >
            <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 text-neutral-100 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
                    <div>
                        <h2
                            id="post-modal-title"
                            className="text-base font-bold sm:text-lg"
                        >
                            {step === 4
                                ? "Post Published — Save Your Edit Key"
                                : editingPost
                                  ? "Edit Campus Post"
                                  : "Post to Findr INCAT Wall"}
                        </h2>
                        {step < 4 && (
                            <p className="text-xs text-neutral-400">
                                Step {step} of 3 &middot;{" "}
                                {step === 1
                                    ? "Item details & photo"
                                    : step === 2
                                      ? "Where & when on campus"
                                      : "Privacy & verification"}
                            </p>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close modal"
                        className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-100"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Step Progress Bar */}
                {step < 4 && (
                    <div className="grid grid-cols-3 gap-1 bg-neutral-900 px-5 py-2">
                        {[1, 2, 3].map((s) => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => {
                                    if (s === 1 || canAdvanceFromStep1) {
                                        setStep(s as 1 | 2 | 3);
                                    }
                                }}
                                className={`h-1.5 rounded-full transition-colors ${
                                    step >= s
                                        ? "bg-emerald-500"
                                        : "bg-neutral-800"
                                }`}
                                aria-label={`Go to step ${s}`}
                            />
                        ))}
                    </div>
                )}

                {/* Body */}
                <form
                    onSubmit={handleFinalSubmit}
                    className="flex-1 space-y-5 overflow-y-auto px-5 py-4"
                >
                    {errorMsg && (
                        <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/40 bg-rose-950/30 p-3 text-xs text-rose-200">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {/* STEP 1: Type, Photo, Title, Category, Description */}
                    {step === 1 && (
                        <div className="space-y-4">
                            {/* Lost vs Found Toggle */}
                            <div className="grid grid-cols-2 gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setType("lost")}
                                    className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition-all ${
                                        type === "lost"
                                            ? "border-rose-500/70 bg-rose-950/25 text-rose-100 shadow-sm"
                                            : "border-neutral-800 bg-neutral-900/40 text-neutral-400 hover:border-neutral-700"
                                    }`}
                                >
                                    <span className="text-xs font-bold tracking-wider uppercase">
                                        I Lost Something
                                    </span>
                                    <span className="mt-0.5 text-xs text-neutral-400">
                                        Alert INCAT students & hubs to watch for
                                        your item
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setType("found")}
                                    className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition-all ${
                                        type === "found"
                                            ? "border-emerald-500/70 bg-emerald-950/25 text-emerald-100 shadow-sm"
                                            : "border-neutral-800 bg-neutral-900/40 text-neutral-400 hover:border-neutral-700"
                                    }`}
                                >
                                    <span className="text-xs font-bold tracking-wider uppercase">
                                        I Found Something
                                    </span>
                                    <span className="mt-0.5 text-xs text-neutral-400">
                                        Help return an item turned in or spotted
                                        on campus
                                    </span>
                                </button>
                            </div>

                            {/* Title & Category */}
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <div className="sm:col-span-2">
                                    <label
                                        htmlFor="post-title"
                                        className="mb-1 block text-xs font-medium text-neutral-300"
                                    >
                                        Item Title *
                                    </label>
                                    <input
                                        id="post-title"
                                        type="text"
                                        required
                                        maxLength={120}
                                        value={title}
                                        onChange={(e) =>
                                            setTitle(e.target.value)
                                        }
                                        placeholder={
                                            type === "lost"
                                                ? "e.g., Black leather cardholder wallet"
                                                : "e.g., Casio fx-991EX Calculator found at ICT Lab"
                                        }
                                        className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3.5 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="post-category"
                                        className="mb-1 block text-xs font-medium text-neutral-300"
                                    >
                                        Category *
                                    </label>
                                    <select
                                        id="post-category"
                                        value={category}
                                        onChange={(e) =>
                                            setCategory(
                                                e.target.value as ItemCategory,
                                            )
                                        }
                                        className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none"
                                    >
                                        {CATEGORIES.map((c) => (
                                            <option
                                                key={c.value}
                                                value={c.value}
                                            >
                                                {c.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label
                                    htmlFor="post-description"
                                    className="mb-1 block text-xs font-medium text-neutral-300"
                                >
                                    Description & Distinguishing Marks *
                                </label>
                                <textarea
                                    id="post-description"
                                    rows={3}
                                    required
                                    maxLength={1500}
                                    value={description}
                                    onChange={(e) =>
                                        setDescription(e.target.value)
                                    }
                                    placeholder={
                                        type === "lost"
                                            ? "Mention stickers, color, brand, or where you last had it..."
                                            : "Describe the item generally (keep 1 detail secret if you want to use Claim Verification in Step 3)."
                                    }
                                    className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3.5 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none"
                                />
                            </div>

                            {/* Photo Upload (Compressed + R2) */}
                            <div>
                                <div className="mb-1.5 flex items-center justify-between text-xs">
                                    <span className="font-medium text-neutral-300">
                                        Photos (Optional, max 3 &middot;
                                        auto-compressed)
                                    </span>
                                    <span className="text-neutral-500">
                                        {imagePreviews.length}/3 attached
                                    </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-3">
                                    {imagePreviews.map((src, idx) => (
                                        <div
                                            key={idx}
                                            className="group relative h-20 w-20 overflow-hidden rounded-xl border border-neutral-700 bg-neutral-900"
                                        >
                                            <img
                                                src={src}
                                                alt={`Upload preview ${idx + 1}`}
                                                className="h-full w-full object-cover"
                                            />
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    removeImageAt(idx)
                                                }
                                                aria-label="Remove photo"
                                                className="absolute top-1 right-1 rounded-full bg-black/80 p-1 text-rose-400 opacity-90 hover:bg-black"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    ))}

                                    {imagePreviews.length < 3 && (
                                        <label className="flex h-20 w-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-neutral-700 bg-neutral-900/50 text-xs text-neutral-400 transition-colors hover:border-emerald-500/60 hover:text-emerald-300">
                                            <ImagePlus className="h-5 w-5" />
                                            <span>
                                                {uploadingImage
                                                    ? "Uploading..."
                                                    : "Add photo"}
                                            </span>
                                            <input
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp,image/gif"
                                                disabled={uploadingImage}
                                                onChange={handleImageFileSelect}
                                                className="sr-only"
                                            />
                                        </label>
                                    )}
                                </div>
                            </div>

                            {/* Optional Link to Existing Findr QR Tag */}
                            {myTags.length > 0 && (
                                <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-3">
                                    <label
                                        htmlFor="post-linked-tag"
                                        className="flex items-center gap-1.5 text-xs font-medium text-neutral-300"
                                    >
                                        <TagIcon className="h-3.5 w-3.5 text-emerald-400" />
                                        Link to one of your Findr QR Tags
                                        (Optional)
                                    </label>
                                    <select
                                        id="post-linked-tag"
                                        value={linkedTagCode}
                                        onChange={(e) =>
                                            setLinkedTagCode(e.target.value)
                                        }
                                        className="mt-1.5 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-xs text-neutral-200"
                                    >
                                        <option value="">
                                            Not linked to a QR tag
                                        </option>
                                        {myTags.map((t) => (
                                            <option
                                                key={t.id}
                                                value={t.publicCode}
                                            >
                                                {t.label} (#{t.publicCode})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 2: INCAT Location + Map Pin + Date/Time */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div>
                                    <label
                                        htmlFor="post-location"
                                        className="mb-1 block text-xs font-medium text-neutral-300"
                                    >
                                        INCAT Building / Campus Hub *
                                    </label>
                                    <select
                                        id="post-location"
                                        value={locationId}
                                        onChange={(e) =>
                                            handleLocationDropdownChange(
                                                e.target.value,
                                            )
                                        }
                                        className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none"
                                    >
                                        {availableLocations.map((loc) => (
                                            <option key={loc.id} value={loc.id}>
                                                {loc.name} ({loc.buildingCode})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label
                                        htmlFor="post-occurred-at"
                                        className="mb-1 block text-xs font-medium text-neutral-300"
                                    >
                                        When was it{" "}
                                        {type === "lost" ? "lost" : "found"}?
                                    </label>
                                    <input
                                        id="post-occurred-at"
                                        type="datetime-local"
                                        value={occurredAt}
                                        onChange={(e) =>
                                            setOccurredAt(e.target.value)
                                        }
                                        className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Interactive INCAT Map Picker */}
                            <div>
                                <div className="mb-1.5 flex items-center justify-between text-xs">
                                    <span className="inline-flex items-center gap-1 font-medium text-neutral-300">
                                        <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                                        Fine-tune exact spot on the INCAT map
                                    </span>
                                    <span className="font-mono text-[11px] text-neutral-400">
                                        {coords.lat.toFixed(5)},{" "}
                                        {coords.lng.toFixed(5)}
                                    </span>
                                </div>

                                <CampusMap
                                    interactivePicker
                                    locations={
                                        availableLocations as CampusLocation[]
                                    }
                                    pickedCoords={coords}
                                    heightClassName="h-[260px]"
                                    onPickCoords={(picked) => {
                                        setCoords({
                                            lat: picked.lat,
                                            lng: picked.lng,
                                        });
                                        if (picked.nearestHubId) {
                                            setLocationId(picked.nearestHubId);
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Contact Matrix & Optional Claim Verification */}
                    {step === 3 && (
                        <div className="space-y-4">
                            {type === "found" && (
                                <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/15 p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-200">
                                                <ShieldQuestion className="h-4 w-4 text-emerald-400" />
                                                <span>
                                                    Ownership Claim Verification
                                                    (Optional)
                                                </span>
                                            </div>
                                            <p className="text-xs text-neutral-400">
                                                Ask a question only the rightful
                                                owner can answer (e.g.,
                                                wallpaper, ID number, keychain
                                                charm) before your direct
                                                contact is unlocked.
                                            </p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={enableClaimQuestion}
                                            onChange={(e) =>
                                                setEnableClaimQuestion(
                                                    e.target.checked,
                                                )
                                            }
                                            aria-label="Enable ownership claim verification"
                                            className="mt-1 h-4 w-4 rounded border-neutral-600 text-emerald-600 focus:ring-emerald-500"
                                        />
                                    </div>

                                    {enableClaimQuestion && (
                                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            <div>
                                                <label
                                                    htmlFor="claim-question"
                                                    className="mb-1 block text-xs font-medium text-neutral-300"
                                                >
                                                    Verification Question *
                                                </label>
                                                <input
                                                    id="claim-question"
                                                    type="text"
                                                    value={claimQuestionPrompt}
                                                    onChange={(e) =>
                                                        setClaimQuestionPrompt(
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="e.g., What sticker is on the back cover?"
                                                    className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-100"
                                                />
                                            </div>

                                            <div>
                                                <label
                                                    htmlFor="claim-answer"
                                                    className="mb-1 block text-xs font-medium text-neutral-300"
                                                >
                                                    Expected Answer
                                                    (case-insensitive) *
                                                </label>
                                                <input
                                                    id="claim-answer"
                                                    type="text"
                                                    value={claimAnswer}
                                                    onChange={(e) =>
                                                        setClaimAnswer(
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="e.g., One Piece Jolly Roger"
                                                    className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-100"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <ContactMatrix
                                value={contact}
                                onChange={setContact}
                            />

                            {needsCampusCode && (
                                <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-3.5">
                                    <label
                                        htmlFor="campus-access-code"
                                        className="flex items-center gap-1.5 text-xs font-semibold text-amber-200"
                                    >
                                        <Lock className="h-3.5 w-3.5 text-amber-400" />
                                        INCAT Campus Access Code
                                    </label>
                                    <input
                                        id="campus-access-code"
                                        type="text"
                                        value={campusCode}
                                        onChange={(e) =>
                                            setCampusCode(e.target.value)
                                        }
                                        placeholder="Enter campus code (e.g., INCAT2026)"
                                        className="mt-2 w-full rounded-lg border border-amber-500/50 bg-neutral-950 px-3 py-1.5 text-xs text-neutral-100"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 4: One-Time Capability Key Receipt */}
                    {step === 4 && createdResult && (
                        <div className="space-y-4 py-2">
                            <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4">
                                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
                                    <Sparkles className="h-4 w-4" />
                                    <span>
                                        Your post is now live on the INCAT Wall!
                                    </span>
                                </div>
                                <p className="mt-1 text-xs leading-relaxed text-neutral-300">
                                    Findr INCAT uses{" "}
                                    <strong>zero user accounts</strong>. Control
                                    of this post is stored in your browser and
                                    tied to the secret capability key below.
                                </p>
                            </div>

                            <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-4 text-xs">
                                <div className="flex items-center gap-2 font-semibold text-amber-300">
                                    <KeyRound className="h-4 w-4" />
                                    <span>
                                        Save your recovery link or file (shown
                                        once — no password reset)
                                    </span>
                                </div>
                                <p className="mt-1 text-neutral-400">
                                    If you clear your browser data or switch
                                    phones, you will need this link or recovery
                                    file to mark the item as returned or edit
                                    the post.
                                </p>

                                <div className="mt-3 flex items-center gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={`${window.location.origin}${createdResult.manageUrl}`}
                                        aria-label="Secret post management link"
                                        className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 font-mono text-xs text-emerald-300"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleCopyEditLink}
                                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                                    >
                                        {copiedKey ? (
                                            <>
                                                <Check className="h-3.5 w-3.5" />
                                                <span>Copied</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="h-3.5 w-3.5" />
                                                <span>Copy Link</span>
                                            </>
                                        )}
                                    </button>
                                </div>

                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={exportRecoveryJson}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:bg-neutral-800"
                                    >
                                        <Download className="h-3.5 w-3.5 text-emerald-400" />
                                        <span>Download Recovery JSON</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Footer Navigation */}
                    <div className="flex items-center justify-between border-t border-neutral-800 pt-4">
                        {step === 1 && (
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-xl border border-neutral-800 px-4 py-2 text-xs font-medium text-neutral-300 hover:bg-neutral-900"
                            >
                                Cancel
                            </button>
                        )}

                        {step > 1 && step < 4 && (
                            <button
                                type="button"
                                onClick={() =>
                                    setStep((prev) => (prev - 1) as 1 | 2 | 3)
                                }
                                className="inline-flex items-center gap-1 rounded-xl border border-neutral-800 px-4 py-2 text-xs font-medium text-neutral-300 hover:bg-neutral-900"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                <span>Back</span>
                            </button>
                        )}

                        {step < 3 && (
                            <button
                                type="button"
                                disabled={step === 1 && !canAdvanceFromStep1}
                                onClick={() =>
                                    setStep((prev) => (prev + 1) as 2 | 3)
                                }
                                className="ml-auto inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <span>Next</span>
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        )}

                        {step === 3 && (
                            <button
                                type="submit"
                                disabled={submitting}
                                className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                            >
                                <span>
                                    {submitting
                                        ? "Publishing..."
                                        : editingPost
                                          ? "Save Changes"
                                          : "Publish to INCAT Wall"}
                                </span>
                            </button>
                        )}

                        {step === 4 && (
                            <button
                                type="button"
                                onClick={onClose}
                                className="ml-auto rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                            >
                                Done
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PostModal;
