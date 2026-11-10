import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
    AlertTriangle,
    Check,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Copy,
    Download,
    ImagePlus,
    KeyRound,
    Lock,
    MapPin,
    ShieldQuestion,
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
import {
    EASE_OUT_FAST,
    SPRING_SHEET,
    SPRING_SNAPPY,
    fadeInUpVariants,
} from "../lib/motion";
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
import { TurnstileWidget, type TurnstileWidgetHandle } from "./TurnstileWidget";
import { Button, Input, Select, Textarea } from "./ui/primitives";

export interface PostModalProps {
    isOpen?: boolean;
    open?: boolean;
    onClose: () => void;
    onCreated?: (post: Post, editKey?: string) => void;
    onSubmit?: (post: Post) => void;
    onPostCreated?: (post: Post) => void;
    editingPost?: Post | null;
    locations?: CampusLocation[];
    myTags?: Tag[];
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

const STEP_META = [
    { num: 1, label: "Item & Photo" },
    { num: 2, label: "Campus Spot" },
    { num: 3, label: "Contact & Verify" },
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
    const modalOpen = isOpen ?? open ?? false;
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

    // Uploaded image state + drag & drop
    const [imageKeys, setImageKeys] = useState<string[]>(
        editingPost?.imageUrls ?? [],
    );
    const [imagePreviews, setImagePreviews] = useState<string[]>(
        editingPost?.imageUrls ?? [],
    );
    const [uploadingImage, setUploadingImage] = useState(false);
    const [isDraggingOver, setIsDraggingOver] = useState(false);

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

    // Turnstile, Campus code & submission state
    const turnstileRef = useRef<TurnstileWidgetHandle | null>(null);
    const [turnstileToken, setTurnstileToken] = useState<string>("");
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
        setTurnstileToken("");
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

    const handleLocationDropdownChange = (nextLocId: string) => {
        setLocationId(nextLocId);
        const hub = availableLocations.find((l) => l.id === nextLocId);
        if (hub) {
            setCoords({ lat: hub.lat, lng: hub.lng });
        }
    };

    const processSelectedFile = async (file: File) => {
        setErrorMsg(null);
        if (!file.type.startsWith("image/")) {
            setErrorMsg("Please select a valid image file (JPG, PNG, WebP).");
            return;
        }
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
        }
    };

    const handleImageFileSelect = async (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await processSelectedFile(file);
        e.target.value = "";
    };

    const handleDropFile = async (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        setIsDraggingOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            await processSelectedFile(file);
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

        if (!editingPost && !turnstileToken) {
            setErrorMsg(
                "Please wait for the human verification check to finish.",
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
            turnstileToken: editingPost ? undefined : turnstileToken,
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
            // Single-use token: always reset widget so retry gets a fresh token
            setTurnstileToken("");
            turnstileRef.current?.reset();

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
        <AnimatePresence>
            {modalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="post-modal-title"
                >
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={EASE_OUT_FAST}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/55 backdrop-blur-[2px]"
                    />

                    <motion.div
                        initial={{ opacity: 0, y: 32, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 24, scale: 0.98 }}
                        transition={SPRING_SHEET}
                        className="theme-surface relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl sm:rounded-2xl border border-border bg-surface text-text shadow-lg"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-border px-5 py-4">
                            <div>
                                <h2
                                    id="post-modal-title"
                                    className="font-display text-lg font-bold text-text sm:text-xl"
                                >
                                    {step === 4
                                        ? "Notice Published — Save Your Recovery Key"
                                        : editingPost
                                          ? "Edit Campus Notice"
                                          : "Post to Findr INCAT Board"}
                                </h2>
                                {step < 4 && (
                                    <p className="text-xs text-muted">
                                        Step {step} of 3 &middot;{" "}
                                        {STEP_META[step - 1]?.label}
                                    </p>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Close modal"
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted transition-colors hover:bg-subtle hover:text-text cursor-pointer"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Numbered Stepper Progress Bar */}
                        {step < 4 && (
                            <div className="grid grid-cols-3 gap-2 border-b border-border bg-subtle/50 px-5 py-2.5">
                                {STEP_META.map((s) => {
                                    const isActive = step === s.num;
                                    const isDone = step > s.num;
                                    return (
                                        <button
                                            key={s.num}
                                            type="button"
                                            onClick={() => {
                                                if (
                                                    s.num === 1 ||
                                                    canAdvanceFromStep1
                                                ) {
                                                    setStep(s.num as 1 | 2 | 3);
                                                }
                                            }}
                                            className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs font-semibold transition-colors cursor-pointer ${
                                                isActive
                                                    ? "bg-surface text-accent shadow-sm"
                                                    : isDone
                                                      ? "text-text"
                                                      : "text-muted"
                                            }`}
                                        >
                                            <span
                                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                                                    isActive || isDone
                                                        ? "bg-accent text-accent-fg"
                                                        : "bg-border text-muted"
                                                }`}
                                            >
                                                {isDone ? (
                                                    <Check className="h-3 w-3" />
                                                ) : (
                                                    s.num
                                                )}
                                            </span>
                                            <span className="truncate">
                                                {s.label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Form Body with Animated Step Transitions */}
                        <form
                            onSubmit={handleFinalSubmit}
                            className="flex-1 space-y-5 overflow-y-auto px-5 py-4"
                        >
                            {errorMsg && (
                                <div className="flex items-start gap-2.5 rounded-xl border border-danger/40 bg-danger-bg p-3 text-xs font-medium text-danger">
                                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                    <span>{errorMsg}</span>
                                </div>
                            )}

                            <AnimatePresence mode="wait">
                                {/* STEP 1: Type, Photo, Title, Category, Description */}
                                {step === 1 && (
                                    <motion.div
                                        key="post-step-1"
                                        variants={fadeInUpVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                        className="space-y-4"
                                    >
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setType("lost")}
                                                className={`flex flex-col items-start rounded-2xl border p-3.5 text-left transition-all cursor-pointer ${
                                                    type === "lost"
                                                        ? "border-lost bg-lost-bg text-text shadow-sm"
                                                        : "border-border bg-subtle/40 text-muted hover:border-border-strong"
                                                }`}
                                            >
                                                <span className="text-xs font-bold tracking-wider text-lost uppercase">
                                                    I Lost Something
                                                </span>
                                                <span className="mt-0.5 text-xs text-text-secondary">
                                                    Alert INCAT students &amp;
                                                    hubs to watch for your item
                                                </span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setType("found")}
                                                className={`flex flex-col items-start rounded-2xl border p-3.5 text-left transition-all cursor-pointer ${
                                                    type === "found"
                                                        ? "border-found bg-found-bg text-text shadow-sm"
                                                        : "border-border bg-subtle/40 text-muted hover:border-border-strong"
                                                }`}
                                            >
                                                <span className="text-xs font-bold tracking-wider text-found uppercase">
                                                    I Found Something
                                                </span>
                                                <span className="mt-0.5 text-xs text-text-secondary">
                                                    Help return an item turned
                                                    in or spotted on campus
                                                </span>
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                            <div className="sm:col-span-2">
                                                <Input
                                                    id="post-title"
                                                    label="Item Title *"
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
                                                />
                                            </div>
                                            <Select
                                                id="post-category"
                                                label="Category *"
                                                value={category}
                                                onChange={(e) =>
                                                    setCategory(
                                                        e.target
                                                            .value as ItemCategory,
                                                    )
                                                }
                                            >
                                                {CATEGORIES.map((c) => (
                                                    <option
                                                        key={c.value}
                                                        value={c.value}
                                                    >
                                                        {c.label}
                                                    </option>
                                                ))}
                                            </Select>
                                        </div>

                                        <Textarea
                                            id="post-description"
                                            label="Description & Distinguishing Marks *"
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
                                        />

                                        <div>
                                            <div className="mb-1.5 flex items-center justify-between text-xs">
                                                <span className="font-semibold text-text">
                                                    Photos (Optional, max 3
                                                    &middot; auto-compressed)
                                                </span>
                                                <span className="text-muted">
                                                    {imagePreviews.length}/3
                                                    attached
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-3">
                                                {imagePreviews.map(
                                                    (src, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="group relative h-24 w-24 overflow-hidden rounded-xl border border-border bg-subtle"
                                                        >
                                                            <img
                                                                src={src}
                                                                alt={`Upload preview ${idx + 1}`}
                                                                className="h-full w-full object-cover"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    removeImageAt(
                                                                        idx,
                                                                    )
                                                                }
                                                                aria-label="Remove photo"
                                                                className="absolute top-1.5 right-1.5 rounded-full bg-black/80 p-1 text-white hover:bg-danger cursor-pointer"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                    ),
                                                )}
                                                {imagePreviews.length < 3 && (
                                                    <label
                                                        onDragOver={(e) => {
                                                            e.preventDefault();
                                                            setIsDraggingOver(
                                                                true,
                                                            );
                                                        }}
                                                        onDragLeave={() =>
                                                            setIsDraggingOver(
                                                                false,
                                                            )
                                                        }
                                                        onDrop={handleDropFile}
                                                        className={`flex h-24 flex-1 min-w-40 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 text-center text-xs transition-colors ${
                                                            isDraggingOver
                                                                ? "border-accent bg-accent-soft text-accent"
                                                                : "border-border-strong bg-subtle/40 text-muted hover:border-accent hover:text-text"
                                                        }`}
                                                    >
                                                        <ImagePlus className="h-5 w-5 text-accent" />
                                                        <span className="font-semibold">
                                                            {uploadingImage
                                                                ? "Compressing & uploading..."
                                                                : "Click or drag & drop photo"}
                                                        </span>
                                                        <input
                                                            type="file"
                                                            accept="image/jpeg,image/png,image/webp,image/gif"
                                                            disabled={
                                                                uploadingImage
                                                            }
                                                            onChange={
                                                                handleImageFileSelect
                                                            }
                                                            className="sr-only"
                                                        />
                                                    </label>
                                                )}
                                            </div>
                                        </div>

                                        {myTags.length > 0 && (
                                            <div className="rounded-xl border border-border bg-subtle/50 p-3.5">
                                                <label
                                                    htmlFor="post-linked-tag"
                                                    className="flex items-center gap-1.5 text-xs font-semibold text-text"
                                                >
                                                    <TagIcon className="h-3.5 w-3.5 text-accent" />
                                                    Link to one of your Findr QR
                                                    Tags (Optional)
                                                </label>
                                                <select
                                                    id="post-linked-tag"
                                                    value={linkedTagCode}
                                                    onChange={(e) =>
                                                        setLinkedTagCode(
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="mt-1.5 min-h-10 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-text"
                                                >
                                                    <option value="">
                                                        Not linked to a QR tag
                                                    </option>
                                                    {myTags.map((t) => (
                                                        <option
                                                            key={t.id}
                                                            value={t.publicCode}
                                                        >
                                                            {t.label} (#
                                                            {t.publicCode})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                {/* STEP 2: INCAT Location + Map Pin + Date/Time */}
                                {step === 2 && (
                                    <motion.div
                                        key="post-step-2"
                                        variants={fadeInUpVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                        className="space-y-4"
                                    >
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            <Select
                                                id="post-location"
                                                label="INCAT Building / Campus Hub *"
                                                value={locationId}
                                                onChange={(e) =>
                                                    handleLocationDropdownChange(
                                                        e.target.value,
                                                    )
                                                }
                                            >
                                                {availableLocations.map(
                                                    (loc) => (
                                                        <option
                                                            key={loc.id}
                                                            value={loc.id}
                                                        >
                                                            {loc.name} (
                                                            {loc.buildingCode})
                                                        </option>
                                                    ),
                                                )}
                                            </Select>
                                            <Input
                                                id="post-occurred-at"
                                                type="datetime-local"
                                                label={`When was it ${type === "lost" ? "lost" : "found"}?`}
                                                value={occurredAt}
                                                onChange={(e) =>
                                                    setOccurredAt(
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </div>

                                        <div>
                                            <div className="mb-1.5 flex items-center justify-between text-xs">
                                                <span className="inline-flex items-center gap-1 font-semibold text-text">
                                                    <MapPin className="h-3.5 w-3.5 text-accent" />
                                                    Where did you{" "}
                                                    {type === "lost"
                                                        ? "lose"
                                                        : "find"}{" "}
                                                    it?
                                                </span>
                                                <span className="font-mono text-[11px] text-muted">
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
                                                        setLocationId(
                                                            picked.nearestHubId,
                                                        );
                                                    }
                                                }}
                                            />
                                        </div>
                                    </motion.div>
                                )}

                                {/* STEP 3: Contact Matrix, Optional Claim Verification & Turnstile */}
                                {step === 3 && (
                                    <motion.div
                                        key="post-step-3"
                                        variants={fadeInUpVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                        className="space-y-4"
                                    >
                                        {type === "found" && (
                                            <div className="rounded-2xl border border-accent/30 bg-accent-soft p-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2 text-sm font-bold text-text">
                                                            <ShieldQuestion className="h-4 w-4 text-accent" />
                                                            <span>
                                                                Ownership Claim
                                                                Verification
                                                                (Optional)
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-text-secondary">
                                                            Ask a question only
                                                            the rightful owner
                                                            can answer (e.g.,
                                                            lockscreen
                                                            wallpaper, keychain
                                                            charm) before your
                                                            direct contact is
                                                            unlocked.
                                                        </p>
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            enableClaimQuestion
                                                        }
                                                        onChange={(e) =>
                                                            setEnableClaimQuestion(
                                                                e.target
                                                                    .checked,
                                                            )
                                                        }
                                                        aria-label="Enable ownership claim verification"
                                                        className="mt-1 h-4 w-4 rounded border-border-strong accent-accent"
                                                    />
                                                </div>
                                                {enableClaimQuestion && (
                                                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                        <Input
                                                            id="claim-question"
                                                            label="Verification Question *"
                                                            value={
                                                                claimQuestionPrompt
                                                            }
                                                            onChange={(e) =>
                                                                setClaimQuestionPrompt(
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            placeholder="e.g., What sticker is on the back cover?"
                                                        />
                                                        <Input
                                                            id="claim-answer"
                                                            label="Expected Answer (case-insensitive) *"
                                                            value={claimAnswer}
                                                            onChange={(e) =>
                                                                setClaimAnswer(
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            placeholder="e.g., One Piece Jolly Roger"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <ContactMatrix
                                            value={contact}
                                            onChange={setContact}
                                        />

                                        {needsCampusCode && (
                                            <div className="rounded-xl border border-found-border bg-found-bg p-3.5">
                                                <label
                                                    htmlFor="campus-access-code"
                                                    className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-found"
                                                >
                                                    <Lock className="h-3.5 w-3.5" />
                                                    INCAT Campus Access Code
                                                </label>
                                                <Input
                                                    id="campus-access-code"
                                                    value={campusCode}
                                                    onChange={(e) =>
                                                        setCampusCode(
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="Enter campus code"
                                                />
                                            </div>
                                        )}

                                        {!editingPost && (
                                            <TurnstileWidget
                                                ref={turnstileRef}
                                                action="create_post"
                                                onVerify={(token) =>
                                                    setTurnstileToken(token)
                                                }
                                                onExpire={() =>
                                                    setTurnstileToken("")
                                                }
                                            />
                                        )}
                                    </motion.div>
                                )}

                                {/* STEP 4: One-Time Capability Key Receipt */}
                                {step === 4 && createdResult && (
                                    <motion.div
                                        key="post-step-4"
                                        variants={fadeInUpVariants}
                                        initial="hidden"
                                        animate="visible"
                                        className="space-y-4 py-2"
                                    >
                                        <div className="flex items-start gap-3.5 rounded-2xl border border-accent/35 bg-accent-soft p-4">
                                            <motion.div
                                                initial={{ scale: 0.5 }}
                                                animate={{ scale: 1 }}
                                                transition={SPRING_SNAPPY}
                                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg shadow-sm"
                                            >
                                                <CheckCircle2 className="h-5 w-5" />
                                            </motion.div>
                                            <div>
                                                <div className="font-display text-base font-bold text-text">
                                                    Your notice is live on the
                                                    INCAT Wall!
                                                </div>
                                                <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">
                                                    Findr INCAT uses{" "}
                                                    <strong>
                                                        zero user accounts
                                                    </strong>
                                                    . Control of this notice is
                                                    saved in your browser and
                                                    tied to the secret
                                                    capability key below.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="rounded-2xl border border-found-border bg-found-bg p-4 text-xs">
                                            <div className="flex items-center gap-2 font-bold text-found">
                                                <KeyRound className="h-4 w-4 shrink-0" />
                                                <span>
                                                    Save your recovery link or
                                                    file (shown once)
                                                </span>
                                            </div>
                                            <p className="mt-1 text-text-secondary">
                                                If you clear your browser data
                                                or switch phones, you will need
                                                this link or recovery JSON to
                                                mark the item as returned.
                                            </p>
                                            <div className="mt-3 flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value={`${window.location.origin}${createdResult.manageUrl}`}
                                                    aria-label="Secret post management link"
                                                    className="min-h-10 w-full rounded-xl border border-border bg-surface px-3 py-2 font-mono text-xs text-accent"
                                                />
                                                <Button
                                                    variant="primary"
                                                    size="sm"
                                                    onClick={handleCopyEditLink}
                                                    leftIcon={
                                                        copiedKey ? (
                                                            <Check className="h-3.5 w-3.5" />
                                                        ) : (
                                                            <Copy className="h-3.5 w-3.5" />
                                                        )
                                                    }
                                                >
                                                    {copiedKey
                                                        ? "Copied"
                                                        : "Copy Link"}
                                                </Button>
                                            </div>
                                            <div className="mt-3">
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={exportRecoveryJson}
                                                    leftIcon={
                                                        <Download className="h-3.5 w-3.5 text-accent" />
                                                    }
                                                >
                                                    Download Recovery JSON
                                                </Button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Footer Navigation */}
                            <div className="flex items-center justify-between border-t border-border pt-4">
                                {step === 1 && (
                                    <Button
                                        variant="secondary"
                                        onClick={onClose}
                                    >
                                        Cancel
                                    </Button>
                                )}
                                {step > 1 && step < 4 && (
                                    <Button
                                        variant="secondary"
                                        onClick={() =>
                                            setStep(
                                                (prev) =>
                                                    (prev - 1) as 1 | 2 | 3,
                                            )
                                        }
                                        leftIcon={
                                            <ChevronLeft className="h-4 w-4" />
                                        }
                                    >
                                        Back
                                    </Button>
                                )}
                                {step < 3 && (
                                    <Button
                                        variant="primary"
                                        disabled={
                                            step === 1 && !canAdvanceFromStep1
                                        }
                                        onClick={() =>
                                            setStep(
                                                (prev) => (prev + 1) as 2 | 3,
                                            )
                                        }
                                        rightIcon={
                                            <ChevronRight className="h-4 w-4" />
                                        }
                                        className="ml-auto"
                                    >
                                        Next
                                    </Button>
                                )}
                                {step === 3 && (
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        loading={submitting}
                                        disabled={
                                            !editingPost && !turnstileToken
                                        }
                                        className="ml-auto"
                                    >
                                        {editingPost
                                            ? "Save Changes"
                                            : "Publish to INCAT Wall"}
                                    </Button>
                                )}
                                {step === 4 && (
                                    <Button
                                        variant="primary"
                                        onClick={onClose}
                                        className="ml-auto"
                                    >
                                        Done
                                    </Button>
                                )}
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default PostModal;
