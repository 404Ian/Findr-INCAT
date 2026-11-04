import React, { useState } from "react";
import {
    Wallet,
    Smartphone,
    CupSoda,
    Calculator,
    IdCard,
    Briefcase,
    KeyRound,
    BookOpen,
    Check,
} from "lucide-react";
import type { PostStatus, PostType } from "../types";

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
    const props = { size, strokeWidth: 1.25, className: "text-muted" };

    if (normalized.includes("wallet")) return <Wallet {...props} />;
    if (normalized.includes("phone") || normalized.includes("gadget"))
        return <Smartphone {...props} />;
    if (normalized.includes("tumbler") || normalized.includes("flask"))
        return <CupSoda {...props} />;
    if (normalized.includes("calc")) return <Calculator {...props} />;
    if (normalized.includes("id") || normalized.includes("lanyard"))
        return <IdCard {...props} />;
    if (normalized.includes("bag") || normalized.includes("pouch"))
        return <Briefcase {...props} />;
    if (normalized.includes("key") || normalized.includes("lock"))
        return <KeyRound {...props} />;
    return <BookOpen {...props} />;
}

interface ItemMediaBoxProps {
    photoUrl?: string;
    title: string;
    category: string;
    type?: PostType;
    status?: PostStatus;
    showStamp?: boolean;
    iconSize?: number;
}

/**
 * 4:3 Image or Tinted Category Placeholder + Flat 2px-radius Corner Stamp
 */
export const ItemMediaBox: React.FC<ItemMediaBoxProps> = ({
    photoUrl,
    title,
    category,
    type = "LOST",
    status = "OPEN",
    showStamp = true,
    iconSize = 36,
}) => {
    const [imgLoaded, setImgLoaded] = useState(false);
    const isReturned = status === "RESOLVED";

    const stampText = isReturned
        ? "RETURNED"
        : type === "LOST"
          ? "LOST"
          : "FOUND";

    const stampStyles = isReturned
        ? "bg-surface text-returned border-returned/40"
        : type === "LOST"
          ? "bg-surface text-lost border-lost/40"
          : "bg-surface text-found border-found/50";

    return (
        <div className="relative aspect-4/3 w-full bg-subtle overflow-hidden border-b border-border select-none">
            {photoUrl ? (
                <img
                    src={photoUrl}
                    alt={title}
                    loading="lazy"
                    onLoad={() => setImgLoaded(true)}
                    className={`w-full h-full object-cover transition-opacity duration-300 ${
                        imgLoaded ? "opacity-100" : "opacity-0"
                    }`}
                />
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted">
                    {getCategoryIcon(category, iconSize)}
                    <span className="text-xs text-muted">{category}</span>
                </div>
            )}

            {/* Flat 2px-radius corner stamp */}
            {showStamp && (
                <span
                    className={`absolute top-3 right-3 px-2 py-0.5 text-xs font-mono font-medium border rounded-xs ${stampStyles}`}
                >
                    {stampText}
                </span>
            )}

            {/* Returned subtle check overlay */}
            {isReturned && (
                <div className="absolute inset-0 bg-bg/45 flex items-center justify-center">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface border border-border rounded-xs text-xs font-medium text-returned">
                        <Check size={14} strokeWidth={1.75} />
                        Returned to owner
                    </span>
                </div>
            )}
        </div>
    );
};

/**
 * Quiet, single-color hand-drawn-style SVG illustration of a campus corkboard & pin
 */
export const CorkboardIllustration: React.FC = () => (
    <svg
        width="84"
        height="56"
        viewBox="0 0 84 56"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="text-muted shrink-0"
    >
        {/* Outer board frame */}
        <rect
            x="4"
            y="6"
            width="76"
            height="46"
            rx="3"
            stroke="currentColor"
            strokeWidth="1.25"
        />
        <rect
            x="8"
            y="10"
            width="68"
            height="38"
            rx="1.5"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="2 2"
        />
        {/* Pinned note 1 */}
        <path
            d="M16 16H36V34H16V16Z"
            stroke="currentColor"
            strokeWidth="1.25"
        />
        <circle cx="26" cy="16" r="2" fill="currentColor" />
        <line
            x1="20"
            y1="22"
            x2="32"
            y2="22"
            stroke="currentColor"
            strokeWidth="1.1"
        />
        <line
            x1="20"
            y1="26"
            x2="29"
            y2="26"
            stroke="currentColor"
            strokeWidth="1.1"
        />
        {/* Pinned note 2 (tilted slightly) */}
        <path
            d="M45 15L66 17L64 36L43 34L45 15Z"
            stroke="currentColor"
            strokeWidth="1.25"
        />
        <circle cx="55.5" cy="16" r="2" fill="currentColor" />
        <line
            x1="48"
            y1="23"
            x2="60"
            y2="24"
            stroke="currentColor"
            strokeWidth="1.1"
        />
        <line
            x1="48"
            y1="27"
            x2="57"
            y2="28"
            stroke="currentColor"
            strokeWidth="1.1"
        />
    </svg>
);

/**
 * Small single-color line illustration for Empty States
 */
export const EmptyTrayIllustration: React.FC = () => (
    <svg
        width="48"
        height="40"
        viewBox="0 0 48 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="mx-auto text-muted mb-2.5"
    >
        <path
            d="M8 14L13 6H35L40 14V32C40 33.1046 39.1046 34 38 34H10C8.89543 34 8 33.1046 8 32V14Z"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinejoin="round"
        />
        <path
            d="M8 22H17C17 24.7614 19.2386 27 22 27H26C28.7614 27 31 24.7614 31 22H40"
            stroke="currentColor"
            strokeWidth="1.25"
        />
    </svg>
);
