import React, { useState } from "react";
import { motion } from "motion/react";
import {
    Wallet,
    Smartphone,
    CupSoda,
    Calculator,
    IdCard,
    Package,
    CreditCard,
    Briefcase,
    KeyRound,
    Umbrella,
    BookOpen,
    Wrench,
    Check,
} from "lucide-react";
import { SPRING_GENTLE, SPRING_SNAPPY } from "../lib/motion";
import type { ItemCategory, PostStatus, PostType } from "../types";

export const CATEGORY_LABELS: Record<ItemCategory, string> = {
    ids_cards: "IDs & Cards",
    wallets_cash: "Wallets & Cash",
    calculators: "Calculators",
    electronics: "Electronics & Phones",
    tumblers_containers: "Tumblers & Containers",
    keys_lanyards: "Keys & Lanyards",
    bags_pouches: "Bags & Pouches",
    books_notebooks: "Books & Notebooks",
    apparel_umbrellas: "Apparel & Umbrellas",
    shop_tools: "Shop & Lab Tools",
    other: "Other Items",
};

export const CATEGORY_OPTIONS: { value: ItemCategory; label: string }[] = (
    Object.keys(CATEGORY_LABELS) as ItemCategory[]
).map((value) => ({
    value,
    label: CATEGORY_LABELS[value],
}));

export function formatCategoryLabel(category?: ItemCategory | string): string {
    if (!category) return "Other Items";
    if (category in CATEGORY_LABELS) {
        return CATEGORY_LABELS[category as ItemCategory];
    }
    return category.replace(/_/g, " ");
}

export interface CategoryArtProps {
    category?: ItemCategory | string;
    className?: string;
}

export const CategoryArt: React.FC<CategoryArtProps> = ({
    category = "other",
    className = "h-8 w-8 text-accent",
}) => {
    const normalized = String(category).toLowerCase();

    if (normalized.includes("wallet") || normalized.includes("cash")) {
        return <Wallet className={className} />;
    }
    if (normalized.includes("id") || normalized.includes("card")) {
        return <CreditCard className={className} />;
    }
    if (normalized.includes("calc")) {
        return <Calculator className={className} />;
    }
    if (
        normalized.includes("electr") ||
        normalized.includes("phone") ||
        normalized.includes("gadget")
    ) {
        return <Smartphone className={className} />;
    }
    if (normalized.includes("tumbler") || normalized.includes("container")) {
        return <CupSoda className={className} />;
    }
    if (normalized.includes("key") || normalized.includes("lanyard")) {
        return <KeyRound className={className} />;
    }
    if (normalized.includes("bag") || normalized.includes("pouch")) {
        return <Briefcase className={className} />;
    }
    if (normalized.includes("book") || normalized.includes("note")) {
        return <BookOpen className={className} />;
    }
    if (normalized.includes("apparel") || normalized.includes("umbrella")) {
        return <Umbrella className={className} />;
    }
    if (normalized.includes("tool") || normalized.includes("shop")) {
        return <Wrench className={className} />;
    }

    return <Package className={className} />;
};

export default CategoryArt;

/**
 * Client-side canvas image compressor (resizes to max 900px, JPEG 0.78 quality)
 */
export async function compressImageFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Failed to read image"));
        reader.onload = () => {
            const img = new Image();
            img.onerror = () => reject(new Error("Failed to decode image"));
            img.onload = () => {
                const maxDim = 900;
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
                    resolve(reader.result as string);
                    return;
                }
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL("image/jpeg", 0.78));
            };
            img.src = reader.result as string;
        };
        reader.readAsDataURL(file);
    });
}

export function getCategoryIcon(category: string, size = 36) {
    const normalized = category.toLowerCase();
    const props = { size, strokeWidth: 1.4, className: "text-muted" };

    if (normalized.includes("wallet") || normalized.includes("cash"))
        return <Wallet {...props} />;
    if (
        normalized.includes("electr") ||
        normalized.includes("phone") ||
        normalized.includes("gadget")
    )
        return <Smartphone {...props} />;
    if (
        normalized.includes("tumbler") ||
        normalized.includes("container") ||
        normalized.includes("flask")
    )
        return <CupSoda {...props} />;
    if (normalized.includes("calc")) return <Calculator {...props} />;
    if (normalized.includes("id") || normalized.includes("card"))
        return <IdCard {...props} />;
    if (normalized.includes("bag") || normalized.includes("pouch"))
        return <Briefcase {...props} />;
    if (normalized.includes("key") || normalized.includes("lanyard"))
        return <KeyRound {...props} />;
    if (normalized.includes("apparel") || normalized.includes("umbrella"))
        return <Umbrella {...props} />;
    if (normalized.includes("tool") || normalized.includes("shop"))
        return <Wrench {...props} />;
    if (normalized.includes("book") || normalized.includes("note"))
        return <BookOpen {...props} />;
    return <Package {...props} />;
}

export interface ItemMediaBoxProps {
    photoUrl?: string;
    title: string;
    category: ItemCategory | string;
    type?: PostType;
    status?: PostStatus;
    showStamp?: boolean;
    iconSize?: number;
    layoutId?: string;
}

/**
 * 4:3 Image with Shimmer Skeleton + Blur/Fade-in or Tinted Category Placeholder
 */
export const ItemMediaBox: React.FC<ItemMediaBoxProps> = ({
    photoUrl,
    title,
    category,
    type = "lost",
    status = "open",
    showStamp = true,
    iconSize = 36,
    layoutId,
}) => {
    const [imgLoaded, setImgLoaded] = useState(false);
    const [imgError, setImgError] = useState(false);
    const isReturned = status === "returned";

    const stampText = isReturned
        ? "Returned"
        : type === "lost"
          ? "Lost"
          : "Found";

    const stampStyles = isReturned
        ? "bg-returned-bg text-returned border-returned-border"
        : type === "lost"
          ? "bg-lost-bg text-lost border-lost-border"
          : "bg-found-bg text-found border-found-border";

    const hasValidPhoto = Boolean(photoUrl && !imgError);

    return (
        <motion.div
            layoutId={layoutId}
            transition={SPRING_SNAPPY}
            className="relative aspect-4/3 w-full overflow-hidden border-b border-border bg-subtle select-none"
        >
            {hasValidPhoto ? (
                <>
                    {!imgLoaded && (
                        <div
                            aria-hidden="true"
                            className="skeleton-pulse absolute inset-0 bg-subtle"
                        />
                    )}
                    <img
                        src={photoUrl}
                        alt={title}
                        width={600}
                        height={450}
                        loading="lazy"
                        decoding="async"
                        onLoad={() => setImgLoaded(true)}
                        onError={() => setImgError(true)}
                        className={`h-full w-full object-cover transition-all duration-500 group-hover:scale-[1.04] ${
                            imgLoaded
                                ? "scale-100 opacity-100 blur-0"
                                : "scale-105 opacity-0 blur-xs"
                        } ${isReturned ? "grayscale-35 opacity-80" : ""}`}
                    />
                </>
            ) : (
                <div
                    className={`flex h-full w-full flex-col items-center justify-center gap-2 bg-subtle/70 p-4 text-muted transition-transform duration-300 group-hover:scale-[1.03] ${
                        isReturned ? "opacity-70" : ""
                    }`}
                >
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-surface shadow-sm">
                        {getCategoryIcon(String(category), iconSize)}
                    </div>
                    <span className="text-[11px] font-medium tracking-wide text-muted">
                        {formatCategoryLabel(category)}
                    </span>
                </div>
            )}

            {/* Status badge in top-left */}
            {showStamp && (
                <span
                    className={`absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-wide uppercase shadow-sm backdrop-blur-xs ${stampStyles}`}
                >
                    <span
                        className={`h-1.5 w-1.5 rounded-full ${
                            isReturned
                                ? "bg-returned"
                                : type === "lost"
                                  ? "bg-lost"
                                  : "bg-found"
                        }`}
                    />
                    {stampText}
                </span>
            )}

            {/* Returned diagonal ribbon & subtle badge */}
            {isReturned && (
                <>
                    <div className="pointer-events-none absolute top-3 -right-8 rotate-45 bg-returned px-8 py-0.5 text-[10px] font-extrabold tracking-widest text-white uppercase shadow-sm">
                        Returned
                    </div>
                    <div className="pointer-events-none absolute inset-0 flex items-end justify-end bg-bg/25 p-2.5">
                        <span className="inline-flex items-center gap-1 rounded-lg border border-returned-border bg-surface/95 px-2 py-1 text-[11px] font-semibold text-returned shadow-sm">
                            <Check size={13} strokeWidth={2.2} />
                            Returned to owner
                        </span>
                    </div>
                </>
            )}
        </motion.div>
    );
};

/**
 * Animated Campus Pinboard Illustration where small notice cards "pin in" on mount
 */
export const PinboardHeroIllustration: React.FC = () => (
    <svg
        viewBox="0 0 240 156"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="h-36 w-full max-w-60 shrink-0 select-none"
    >
        {/* Wooden / Cork Board Frame */}
        <rect
            x="6"
            y="8"
            width="228"
            height="140"
            rx="14"
            className="fill-subtle stroke-border-strong"
            strokeWidth="2"
        />
        <rect
            x="14"
            y="16"
            width="212"
            height="124"
            rx="9"
            className="fill-bg/70 stroke-border"
            strokeWidth="1.25"
            strokeDasharray="3 3"
        />

        {/* Pinned Note 1: Lost ID Card */}
        <motion.g
            initial={{ opacity: 0, y: -14, rotate: -6 }}
            animate={{ opacity: 1, y: 0, rotate: -3 }}
            transition={{ ...SPRING_GENTLE, delay: 0.08 }}
            style={{ transformOrigin: "62px 30px" }}
        >
            <rect
                x="26"
                y="26"
                width="72"
                height="58"
                rx="6"
                className="fill-surface stroke-border-strong"
                strokeWidth="1.5"
            />
            <rect
                x="34"
                y="36"
                width="22"
                height="16"
                rx="3"
                className="fill-lost-bg stroke-lost-border"
                strokeWidth="1"
            />
            <line
                x1="62"
                y1="40"
                x2="88"
                y2="40"
                className="stroke-text"
                strokeWidth="2"
                strokeLinecap="round"
            />
            <line
                x1="62"
                y1="47"
                x2="82"
                y2="47"
                className="stroke-muted"
                strokeWidth="1.5"
                strokeLinecap="round"
            />
            <line
                x1="34"
                y1="62"
                x2="86"
                y2="62"
                className="stroke-border-strong"
                strokeWidth="1.5"
                strokeLinecap="round"
            />
            <line
                x1="34"
                y1="70"
                x2="70"
                y2="70"
                className="stroke-border-strong"
                strokeWidth="1.5"
                strokeLinecap="round"
            />
            <circle cx="62" cy="26" r="4.5" className="fill-lost" />
            <circle cx="60.5" cy="24.5" r="1.2" fill="#ffffff" opacity="0.7" />
        </motion.g>

        {/* Pinned Note 2: Found Sci-Calculator */}
        <motion.g
            initial={{ opacity: 0, y: -16, rotate: 7 }}
            animate={{ opacity: 1, y: 0, rotate: 3 }}
            transition={{ ...SPRING_GENTLE, delay: 0.18 }}
            style={{ transformOrigin: "152px 32px" }}
        >
            <rect
                x="114"
                y="24"
                width="88"
                height="64"
                rx="6"
                className="fill-surface stroke-border-strong"
                strokeWidth="1.5"
            />
            <rect
                x="124"
                y="34"
                width="36"
                height="10"
                rx="3"
                className="fill-found-bg stroke-found-border"
                strokeWidth="1"
            />
            <line
                x1="124"
                y1="54"
                x2="188"
                y2="54"
                className="stroke-text"
                strokeWidth="2"
                strokeLinecap="round"
            />
            <line
                x1="124"
                y1="63"
                x2="176"
                y2="63"
                className="stroke-muted"
                strokeWidth="1.5"
                strokeLinecap="round"
            />
            <line
                x1="124"
                y1="72"
                x2="160"
                y2="72"
                className="stroke-border-strong"
                strokeWidth="1.5"
                strokeLinecap="round"
            />
            <circle cx="158" cy="24" r="4.5" className="fill-highlight" />
            <circle cx="156.5" cy="22.5" r="1.2" fill="#ffffff" opacity="0.7" />
        </motion.g>

        {/* Pinned Note 3: Returned Tag Card */}
        <motion.g
            initial={{ opacity: 0, y: -12, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ ...SPRING_GENTLE, delay: 0.28 }}
            style={{ transformOrigin: "118px 98px" }}
        >
            <rect
                x="72"
                y="88"
                width="96"
                height="40"
                rx="6"
                className="fill-surface stroke-border-strong"
                strokeWidth="1.5"
            />
            <circle cx="90" cy="108" r="9" className="fill-accent-soft" />
            <path
                d="M86 108.5L89 111.5L94.5 105.5"
                className="stroke-accent"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <line
                x1="106"
                y1="103"
                x2="154"
                y2="103"
                className="stroke-text"
                strokeWidth="2"
                strokeLinecap="round"
            />
            <line
                x1="106"
                y1="112"
                x2="140"
                y2="112"
                className="stroke-muted"
                strokeWidth="1.5"
                strokeLinecap="round"
            />
            <circle cx="120" cy="88" r="4" className="fill-accent" />
        </motion.g>
    </svg>
);

export const CorkboardIllustration: React.FC = () => (
    <PinboardHeroIllustration />
);

export const EmptyTrayIllustration: React.FC = () => (
    <svg
        width="64"
        height="52"
        viewBox="0 0 64 52"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="mx-auto mb-2 text-muted"
    >
        <path
            d="M10 18L17 8H47L54 18V42C54 43.6569 52.6569 45 51 45H13C11.3431 45 10 43.6569 10 42V18Z"
            className="fill-subtle stroke-border-strong"
            strokeWidth="1.75"
            strokeLinejoin="round"
        />
        <path
            d="M10 28H23C23 31.866 26.134 35 30 35H34C37.866 35 41 31.866 41 28H54"
            className="stroke-muted"
            strokeWidth="1.75"
        />
        <circle cx="32" cy="19" r="2.5" className="fill-accent" />
    </svg>
);

export const ErrorBoardIllustration: React.FC = () => (
    <svg
        width="64"
        height="52"
        viewBox="0 0 64 52"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="mx-auto mb-2 text-danger"
    >
        <rect
            x="10"
            y="8"
            width="44"
            height="36"
            rx="6"
            className="fill-danger-bg stroke-danger"
            strokeWidth="1.75"
        />
        <path
            d="M32 18V27"
            className="stroke-danger"
            strokeWidth="2.2"
            strokeLinecap="round"
        />
        <circle cx="32" cy="33" r="1.6" className="fill-danger" />
    </svg>
);
