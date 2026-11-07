import {
    createContext,
    forwardRef,
    useCallback,
    useContext,
    useEffect,
    useId,
    useState,
    type ButtonHTMLAttributes,
    type HTMLAttributes,
    type InputHTMLAttributes,
    type ReactNode,
    type SelectHTMLAttributes,
    type TextareaHTMLAttributes,
} from "react";
import { AnimatePresence, motion, type HTMLMotionProps } from "motion/react";
import { AlertCircle, CheckCircle2, Info, Loader2, X } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { EASE_OUT_FAST, SPRING_SHEET, SPRING_SNAPPY } from "../../lib/motion";
import type { PostStatus, PostType } from "../../types";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/* ============================================================================
 * 1. BUTTON
 * ========================================================================== */
export interface ButtonProps
    extends Omit<
        ButtonHTMLAttributes<HTMLButtonElement>,
        | "onDrag"
        | "onDragStart"
        | "onDragEnd"
        | "onAnimationStart"
        | "onAnimationEnd"
    > {
    variant?: "primary" | "secondary" | "ghost" | "danger";
    size?: "sm" | "md" | "lg";
    loading?: boolean;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
    onDrag?: HTMLMotionProps<"button">["onDrag"];
    onDragStart?: HTMLMotionProps<"button">["onDragStart"];
    onDragEnd?: HTMLMotionProps<"button">["onDragEnd"];
    onAnimationStart?: HTMLMotionProps<"button">["onAnimationStart"];
    onAnimationEnd?: HTMLMotionProps<"button">["onAnimationEnd"];
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            className,
            variant = "primary",
            size = "md",
            loading = false,
            disabled,
            leftIcon,
            rightIcon,
            children,
            type = "button",
            ...props
        },
        ref,
    ) => {
        const isDisabled = disabled || loading;

        const variantClasses: Record<
            NonNullable<ButtonProps["variant"]>,
            string
        > = {
            primary:
                "bg-accent text-accent-fg hover:bg-accent-hover shadow-sm border border-transparent",
            secondary:
                "bg-surface text-text border border-border hover:bg-subtle hover:border-border-strong shadow-sm",
            ghost: "bg-transparent text-text-secondary hover:bg-subtle hover:text-text border border-transparent",
            danger: "bg-danger text-white hover:opacity-95 shadow-sm border border-transparent",
        };

        const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
            sm: "min-h-[38px] sm:min-h-[34px] px-3 py-1.5 text-xs gap-1.5 rounded-lg",
            md: "min-h-11 sm:min-h-10 px-4 py-2 text-xs sm:text-sm gap-2 rounded-xl",
            lg: "min-h-[48px] px-5 py-2.5 text-sm gap-2.5 rounded-xl",
        };

        return (
            <motion.button
                ref={ref}
                type={type}
                disabled={isDisabled}
                whileTap={isDisabled ? undefined : { scale: 0.97 }}
                transition={SPRING_SNAPPY}
                className={cn(
                    "inline-flex items-center justify-center font-semibold transition-colors select-none cursor-pointer disabled:opacity-55 disabled:pointer-events-none",
                    variantClasses[variant],
                    sizeClasses[size],
                    className,
                )}
                {...props}
            >
                {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                ) : (
                    leftIcon
                )}
                <span>{children}</span>
                {!loading && rightIcon}
            </motion.button>
        );
    },
);
Button.displayName = "Button";

/* ============================================================================
 * 2. STATUS BADGE & CHIP
 * ========================================================================== */
export interface StatusBadgeProps {
    type: PostType;
    status?: PostStatus;
    label?: string;
    className?: string;
}

export function StatusBadge({
    type,
    status = "open",
    label,
    className,
}: StatusBadgeProps) {
    const isReturned = status === "returned";

    const styles = isReturned
        ? "bg-returned-bg text-returned border-returned-border"
        : type === "lost"
          ? "bg-lost-bg text-lost border-lost-border"
          : "bg-found-bg text-found border-found-border";

    const dotColor = isReturned
        ? "bg-returned"
        : type === "lost"
          ? "bg-lost"
          : "bg-found";

    const displayText =
        label ?? (isReturned ? "Returned" : type === "lost" ? "Lost" : "Found");

    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-wide uppercase",
                styles,
                className,
            )}
        >
            <span className={cn("h-1.5 w-1.5 rounded-full", dotColor)} />
            {displayText}
        </span>
    );
}

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    active?: boolean;
    onRemove?: () => void;
}

export function Chip({
    active = false,
    onRemove,
    className,
    children,
    ...props
}: ChipProps) {
    return (
        <button
            type="button"
            className={cn(
                "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors cursor-pointer",
                active
                    ? "border-accent bg-accent-soft text-accent font-semibold"
                    : "border-border bg-surface text-text-secondary hover:bg-subtle hover:text-text",
                className,
            )}
            {...props}
        >
            <span>{children}</span>
            {onRemove && (
                <span
                    role="button"
                    tabIndex={0}
                    aria-label="Remove filter"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.stopPropagation();
                            onRemove();
                        }
                    }}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-border"
                >
                    <X className="h-3 w-3" />
                </span>
            )}
        </button>
    );
}

/* ============================================================================
 * 3. CARD
 * ========================================================================== */
export interface CardProps extends HTMLAttributes<HTMLDivElement> {
    interactive?: boolean;
    elevation?: "sm" | "md" | "lg";
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
    (
        {
            className,
            interactive = false,
            elevation = "sm",
            children,
            ...props
        },
        ref,
    ) => {
        const elevationMap = {
            sm: "shadow-sm",
            md: "shadow-md",
            lg: "shadow-lg",
        };
        return (
            <div
                ref={ref}
                className={cn(
                    "theme-surface rounded-2xl border border-border bg-surface",
                    elevationMap[elevation],
                    interactive &&
                        "cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md",
                    className,
                )}
                {...props}
            >
                {children}
            </div>
        );
    },
);
Card.displayName = "Card";

/* ============================================================================
 * 4. INPUT, TEXTAREA & SELECT (Accessible with Labels & 44px mobile touch target)
 * ========================================================================== */
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    hint?: string;
    error?: string;
    leftIcon?: ReactNode;
    rightElement?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    (
        { label, hint, error, leftIcon, rightElement, className, id, ...props },
        ref,
    ) => {
        const generatedId = useId();
        const inputId = id ?? generatedId;

        return (
            <div className="w-full space-y-1.5">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="block text-xs font-semibold text-text"
                    >
                        {label}
                    </label>
                )}
                <div className="relative flex items-center">
                    {leftIcon && (
                        <span className="pointer-events-none absolute left-3.5 text-muted">
                            {leftIcon}
                        </span>
                    )}
                    <input
                        ref={ref}
                        id={inputId}
                        className={cn(
                            "w-full min-h-11 sm:min-h-10 rounded-xl border border-border bg-surface px-3.5 py-2 text-sm text-text placeholder:text-muted transition-colors focus:border-accent focus:outline-none",
                            leftIcon && "pl-10",
                            rightElement && "pr-10",
                            error && "border-danger focus:border-danger",
                            className,
                        )}
                        {...props}
                    />
                    {rightElement && (
                        <div className="absolute right-2.5 flex items-center">
                            {rightElement}
                        </div>
                    )}
                </div>
                {error ? (
                    <p className="text-xs font-medium text-danger">{error}</p>
                ) : hint ? (
                    <p className="text-xs text-muted">{hint}</p>
                ) : null}
            </div>
        );
    },
);
Input.displayName = "Input";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    hint?: string;
    error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ label, hint, error, className, id, ...props }, ref) => {
        const generatedId = useId();
        const textareaId = id ?? generatedId;

        return (
            <div className="w-full space-y-1.5">
                {label && (
                    <label
                        htmlFor={textareaId}
                        className="block text-xs font-semibold text-text"
                    >
                        {label}
                    </label>
                )}
                <textarea
                    ref={ref}
                    id={textareaId}
                    className={cn(
                        "w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-text placeholder:text-muted transition-colors focus:border-accent focus:outline-none",
                        error && "border-danger focus:border-danger",
                        className,
                    )}
                    {...props}
                />
                {error ? (
                    <p className="text-xs font-medium text-danger">{error}</p>
                ) : hint ? (
                    <p className="text-xs text-muted">{hint}</p>
                ) : null}
            </div>
        );
    },
);
Textarea.displayName = "Textarea";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ label, error, className, id, children, ...props }, ref) => {
        const generatedId = useId();
        const selectId = id ?? generatedId;

        return (
            <div className="w-full space-y-1.5">
                {label && (
                    <label
                        htmlFor={selectId}
                        className="block text-xs font-semibold text-text"
                    >
                        {label}
                    </label>
                )}
                <select
                    ref={ref}
                    id={selectId}
                    className={cn(
                        "w-full min-h-11 sm:min-h-10 rounded-xl border border-border bg-surface px-3.5 py-2 text-sm text-text transition-colors focus:border-accent focus:outline-none",
                        error && "border-danger",
                        className,
                    )}
                    {...props}
                >
                    {children}
                </select>
                {error && (
                    <p className="text-xs font-medium text-danger">{error}</p>
                )}
            </div>
        );
    },
);
Select.displayName = "Select";

/* ============================================================================
 * 5. MODAL / SHEET (Responsive Dialog on Desktop, Bottom Sheet on Mobile)
 * ========================================================================== */
export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    children: ReactNode;
    maxWidthClass?: string;
}

export function Modal({
    isOpen,
    onClose,
    title,
    description,
    children,
    maxWidthClass = "max-w-lg",
}: ModalProps) {
    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [isOpen, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-label={title}
                >
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={EASE_OUT_FAST}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-[2px]"
                    />
                    <motion.div
                        initial={{ opacity: 0, y: 36, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 24, scale: 0.98 }}
                        transition={SPRING_SHEET}
                        className={cn(
                            "relative z-10 w-full max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-lg",
                            maxWidthClass,
                        )}
                    >
                        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-border-strong sm:hidden" />
                        {(title || description) && (
                            <div className="mb-4 flex items-start justify-between gap-4">
                                <div>
                                    {title && (
                                        <h2 className="font-display text-lg font-bold text-text">
                                            {title}
                                        </h2>
                                    )}
                                    {description && (
                                        <p className="mt-0.5 text-xs text-muted">
                                            {description}
                                        </p>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    aria-label="Close modal"
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted hover:bg-subtle hover:text-text"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                        {children}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

/* ============================================================================
 * 6. SKELETON
 * ========================================================================== */
export function Skeleton({
    className,
    ...props
}: HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                "skeleton-pulse rounded-xl bg-subtle border border-border/50",
                className,
            )}
            {...props}
        />
    );
}

/* ============================================================================
 * 7. EMPTY STATE (Inline SVG illustration, no stock emoji)
 * ========================================================================== */
export interface EmptyStateProps {
    title: string;
    description: string;
    action?: ReactNode;
    illustration?: ReactNode;
}

export function EmptyState({
    title,
    description,
    action,
    illustration,
}: EmptyStateProps) {
    return (
        <div className="theme-surface flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-strong bg-surface/60 px-6 py-12 text-center">
            {illustration ?? (
                <svg
                    viewBox="0 0 120 90"
                    className="h-20 w-28 text-muted"
                    fill="none"
                    aria-hidden="true"
                >
                    <rect
                        x="14"
                        y="12"
                        width="92"
                        height="66"
                        rx="8"
                        className="fill-subtle stroke-border-strong"
                        strokeWidth="2"
                    />
                    <rect
                        x="28"
                        y="26"
                        width="34"
                        height="38"
                        rx="4"
                        className="fill-surface stroke-border"
                        strokeWidth="1.5"
                    />
                    <circle cx="45" cy="26" r="3.5" className="fill-accent" />
                    <path
                        d="M35 40h20M35 48h14"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        opacity="0.5"
                    />
                    <rect
                        x="68"
                        y="30"
                        width="26"
                        height="28"
                        rx="4"
                        className="fill-surface stroke-border"
                        strokeWidth="1.5"
                    />
                    <circle cx="81" cy="30" r="3" className="fill-highlight" />
                </svg>
            )}
            <h3 className="font-display mt-3 text-base font-bold text-text">
                {title}
            </h3>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted">
                {description}
            </p>
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}

/* ============================================================================
 * 8. ANIMATED TABS
 * ========================================================================== */
export interface TabItem<T extends string> {
    id: T;
    label: string;
    badge?: number | string;
    icon?: ReactNode;
}

export interface TabsProps<T extends string> {
    items: TabItem<T>[];
    activeId: T;
    onChange: (id: T) => void;
    layoutId?: string;
    variant?: "underline" | "pill";
    className?: string;
}

export function Tabs<T extends string>({
    items,
    activeId,
    onChange,
    layoutId = "findr-tabs-indicator",
    variant = "underline",
    className,
}: TabsProps<T>) {
    if (variant === "pill") {
        return (
            <div
                role="tablist"
                className={cn(
                    "inline-flex items-center gap-1 rounded-xl border border-border bg-subtle p-1",
                    className,
                )}
            >
                {items.map((item) => {
                    const isActive = item.id === activeId;
                    return (
                        <button
                            key={item.id}
                            role="tab"
                            type="button"
                            aria-selected={isActive}
                            onClick={() => onChange(item.id)}
                            className={cn(
                                "relative z-10 inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer",
                                isActive
                                    ? "text-accent-fg"
                                    : "text-text-secondary hover:text-text",
                            )}
                        >
                            {isActive && (
                                <motion.span
                                    layoutId={layoutId}
                                    transition={SPRING_SNAPPY}
                                    className="absolute inset-0 -z-10 rounded-lg bg-accent shadow-sm"
                                />
                            )}
                            {item.icon}
                            <span>{item.label}</span>
                            {item.badge !== undefined && (
                                <span
                                    className={cn(
                                        "rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                                        isActive
                                            ? "bg-white/20 text-white"
                                            : "bg-surface text-muted",
                                    )}
                                >
                                    {item.badge}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        );
    }

    return (
        <div
            role="tablist"
            className={cn("flex items-center gap-1 sm:gap-2", className)}
        >
            {items.map((item) => {
                const isActive = item.id === activeId;
                return (
                    <button
                        key={item.id}
                        role="tab"
                        type="button"
                        aria-selected={isActive}
                        onClick={() => onChange(item.id)}
                        className={cn(
                            "relative inline-flex min-h-11 items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer",
                            isActive
                                ? "text-text"
                                : "text-muted hover:text-text-secondary",
                        )}
                    >
                        {item.icon}
                        <span>{item.label}</span>
                        {item.badge !== undefined && (
                            <span
                                className={cn(
                                    "rounded-full px-2 py-0.5 text-[11px] font-bold",
                                    isActive
                                        ? "bg-accent-soft text-accent"
                                        : "bg-subtle text-muted",
                                )}
                            >
                                {item.badge}
                            </span>
                        )}
                        {isActive && (
                            <motion.span
                                layoutId={layoutId}
                                transition={SPRING_SNAPPY}
                                className="absolute right-2 bottom-0 left-2 h-0.5 rounded-full bg-accent"
                            />
                        )}
                    </button>
                );
            })}
        </div>
    );
}

/* ============================================================================
 * 9. TOAST SYSTEM (Accessible with aria-live="polite")
 * ========================================================================== */
export interface ToastItem {
    id: string;
    title: string;
    variant?: "success" | "error" | "info";
}

interface ToastContextValue {
    showToast: (title: string, variant?: ToastItem["variant"]) => void;
}

const ToastContext = createContext<ToastContextValue>({
    showToast: () => {},
});

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const showToast = useCallback(
        (title: string, variant: ToastItem["variant"] = "info") => {
            const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            setToasts((prev) => [...prev, { id, title, variant }]);
            window.setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== id));
            }, 3800);
        },
        [],
    );

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div
                aria-live="polite"
                aria-atomic="true"
                className="pointer-events-none fixed right-4 bottom-20 z-50 flex flex-col gap-2 sm:bottom-6"
            >
                <AnimatePresence>
                    {toasts.map((toast) => (
                        <motion.div
                            key={toast.id}
                            initial={{ opacity: 0, y: 16, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.96 }}
                            transition={SPRING_SNAPPY}
                            className="pointer-events-auto flex items-center gap-2.5 rounded-xl border border-border bg-surface px-4 py-3 text-xs font-semibold text-text shadow-lg"
                        >
                            {toast.variant === "success" && (
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />
                            )}
                            {toast.variant === "error" && (
                                <AlertCircle className="h-4 w-4 shrink-0 text-danger" />
                            )}
                            {toast.variant === "info" && (
                                <Info className="h-4 w-4 shrink-0 text-info" />
                            )}
                            <span>{toast.title}</span>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    return useContext(ToastContext);
}
