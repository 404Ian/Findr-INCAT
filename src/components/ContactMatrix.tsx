import React from "react";
import { motion } from "motion/react";
import { SPRING_SNAPPY } from "../lib/motion";
import {
    CAMPUS_HUB_NAMES,
    type CampusHubName,
    type ContactConfig,
    type ContactMethod,
    type ContactMethodKind,
} from "../types";

export interface ContactMatrixProps {
    value: ContactConfig;
    onChange: (next: ContactConfig) => void;
    showDropOffHub?: boolean;
    compact?: boolean;
}

interface MethodMeta {
    kind: ContactMethodKind;
    label: string;
    placeholder: string;
    helper: string;
}

const AVAILABLE_METHODS: readonly MethodMeta[] = [
    {
        kind: "messenger",
        label: "Messenger",
        placeholder: "m.me/your.username or profile name",
        helper: "Opens a direct Messenger chat thread",
    },
    {
        kind: "phone",
        label: "Phone Call",
        placeholder: "0917 123 4567",
        helper: "One-tap dial on mobile",
    },
    {
        kind: "sms",
        label: "SMS / Text",
        placeholder: "0917 123 4567",
        helper: "Pre-filled SMS message",
    },
    {
        kind: "email",
        label: "Email",
        placeholder: "name@example.com",
        helper: "Opens mail app with item subject",
    },
    {
        kind: "facebook",
        label: "Facebook Profile",
        placeholder: "facebook.com/your.profile",
        helper: "Profile link for campus message requests",
    },
    {
        kind: "telegram",
        label: "Telegram",
        placeholder: "@username",
        helper: "Opens t.me/@username",
    },
] as const;

export const DEFAULT_CONTACT_CONFIG: ContactConfig = {
    relayMode: true,
    dropOffHub: "Guard House",
    methods: [
        { kind: "messenger", value: "", visible: false },
        { kind: "phone", value: "", visible: false },
    ],
};

export const ContactMatrix: React.FC<ContactMatrixProps> = ({
    value,
    onChange,
    showDropOffHub = true,
    compact = false,
}) => {
    const getMethod = (kind: ContactMethodKind): ContactMethod | undefined =>
        value.methods.find((m) => m.kind === kind);

    const upsertMethod = (
        kind: ContactMethodKind,
        patch: Partial<ContactMethod>,
    ) => {
        const existing = getMethod(kind);
        let nextMethods: ContactMethod[];

        if (existing) {
            nextMethods = value.methods.map((m) =>
                m.kind === kind ? { ...m, ...patch } : m,
            );
        } else {
            nextMethods = [
                ...value.methods,
                {
                    kind,
                    value: patch.value ?? "",
                    visible: patch.visible ?? !value.relayMode,
                    label: patch.label,
                },
            ];
        }

        onChange({
            ...value,
            methods: nextMethods,
        });
    };

    const removeMethod = (kind: ContactMethodKind) => {
        onChange({
            ...value,
            methods: value.methods.filter((m) => m.kind !== kind),
        });
    };

    const handleRelayToggle = (relayMode: boolean) => {
        onChange({
            ...value,
            relayMode,
        });
    };

    const handleDropOffChange = (hub: CampusHubName | "") => {
        onChange({
            ...value,
            dropOffHub: hub === "" ? undefined : hub,
        });
    };

    const publicMethods = value.methods.filter(
        (m) => m.visible && m.value.trim().length > 0,
    );

    return (
        <div className="theme-surface space-y-4 rounded-2xl border border-border bg-subtle/40 p-4 text-sm">
            {/* Relay Mode Banner with Animated Switch */}
            <div className="flex items-start justify-between gap-4 rounded-xl border border-accent/25 bg-accent-soft p-3.5">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="inline-block h-2 w-2 rounded-full bg-accent" />
                        <span className="font-semibold text-text">
                            Anonymous Relay Messaging (Recommended)
                        </span>
                    </div>
                    <p className="text-xs leading-relaxed text-text-secondary">
                        Finders can message you directly inside Findr without
                        seeing your phone number or social profile. You read
                        messages in <strong>My items</strong>.
                    </p>
                </div>
                <button
                    type="button"
                    role="switch"
                    aria-checked={value.relayMode}
                    aria-label="Enable anonymous relay messaging"
                    onClick={() => handleRelayToggle(!value.relayMode)}
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border transition-colors ${
                        value.relayMode
                            ? "border-accent bg-accent"
                            : "border-border-strong bg-subtle"
                    }`}
                >
                    <motion.span
                        layout
                        transition={SPRING_SNAPPY}
                        className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm ${
                            value.relayMode ? "translate-x-6" : "translate-x-1"
                        }`}
                    />
                </button>
            </div>

            {/* Preferred Campus Drop-off Hub */}
            {showDropOffHub && (
                <div className="space-y-1.5">
                    <label
                        htmlFor="contact-dropoff-hub"
                        className="block text-xs font-semibold tracking-wide text-text uppercase"
                    >
                        Suggested INCAT Drop-off Hub
                    </label>
                    <select
                        id="contact-dropoff-hub"
                        value={value.dropOffHub ?? ""}
                        onChange={(e) =>
                            handleDropOffChange(
                                e.target.value as CampusHubName | "",
                            )
                        }
                        className="min-h-11 w-full rounded-xl border border-border bg-surface px-3.5 py-2 text-sm text-text focus:border-accent focus:outline-none"
                    >
                        <option value="">No specific hub preference</option>
                        {CAMPUS_HUB_NAMES.map((hubName) => (
                            <option key={hubName} value={hubName}>
                                {hubName}
                            </option>
                        ))}
                    </select>
                    <p className="text-xs text-muted">
                        Shown to the finder so they can leave your item safely
                        on campus.
                    </p>
                </div>
            )}

            {/* Direct Contact Channels */}
            <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="text-xs font-semibold tracking-wide text-text uppercase">
                        Direct Contact Channels (Per-Channel Visibility)
                    </span>
                    <span className="text-[11px] text-muted">
                        Protected by Turnstile anti-scrape check
                    </span>
                </div>

                <div
                    className={
                        compact
                            ? "grid grid-cols-1 gap-2.5"
                            : "grid grid-cols-1 gap-3 sm:grid-cols-2"
                    }
                >
                    {AVAILABLE_METHODS.map((meta) => {
                        const current = getMethod(meta.kind);
                        const isEnabled = Boolean(current);
                        const isVisible = current?.visible ?? false;

                        return (
                            <div
                                key={meta.kind}
                                className={`rounded-xl border p-3 transition-colors ${
                                    isEnabled
                                        ? "border-border-strong bg-surface shadow-sm"
                                        : "border-border bg-surface/50"
                                }`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <label className="flex cursor-pointer items-center gap-2 font-semibold text-text">
                                        <input
                                            type="checkbox"
                                            checked={isEnabled}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    upsertMethod(meta.kind, {
                                                        value: "",
                                                        visible: true,
                                                    });
                                                } else {
                                                    removeMethod(meta.kind);
                                                }
                                            }}
                                            className="h-4 w-4 rounded border-border-strong accent-accent"
                                        />
                                        <span className="text-xs sm:text-sm">
                                            {meta.label}
                                        </span>
                                    </label>

                                    {isEnabled && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                upsertMethod(meta.kind, {
                                                    visible: !isVisible,
                                                })
                                            }
                                            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors cursor-pointer ${
                                                isVisible
                                                    ? "border-accent/40 bg-accent-soft text-accent"
                                                    : "border-border bg-subtle text-muted"
                                            }`}
                                            title={
                                                isVisible
                                                    ? "Publicly visible after human verification"
                                                    : "Hidden from public page"
                                            }
                                        >
                                            {isVisible
                                                ? "Visible on scan"
                                                : "Hidden"}
                                        </button>
                                    )}
                                </div>

                                {isEnabled && (
                                    <div className="mt-2.5 space-y-1">
                                        <input
                                            type="text"
                                            value={current?.value ?? ""}
                                            onChange={(e) =>
                                                upsertMethod(meta.kind, {
                                                    value: e.target.value,
                                                })
                                            }
                                            placeholder={meta.placeholder}
                                            aria-label={`${meta.label} contact value`}
                                            className="min-h-10 w-full rounded-lg border border-border bg-subtle/50 px-3 py-1.5 text-xs text-text placeholder:text-muted focus:border-accent focus:bg-surface focus:outline-none"
                                        />
                                        <p className="text-[11px] text-muted">
                                            {meta.helper}
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Live Public Disclosure Summary */}
            <div className="rounded-xl border border-border bg-surface p-3.5 text-xs text-text-secondary">
                <div className="font-semibold text-text">
                    What finders will see publicly:
                </div>
                <ul className="mt-1.5 list-inside list-disc space-y-1 text-muted">
                    {value.relayMode && (
                        <li>
                            An in-app{" "}
                            <strong className="text-text">
                                Message the owner
                            </strong>{" "}
                            relay form (your real contact stays private).
                        </li>
                    )}
                    {value.dropOffHub && (
                        <li>
                            Suggested drop-off at{" "}
                            <strong className="text-text">
                                {value.dropOffHub}
                            </strong>
                            .
                        </li>
                    )}
                    {publicMethods.length > 0 ? (
                        <li>
                            Direct buttons for{" "}
                            <strong className="text-text">
                                {publicMethods
                                    .map((m) => m.kind.toUpperCase())
                                    .join(", ")}
                            </strong>{" "}
                            (revealed only after a human Turnstile check).
                        </li>
                    ) : (
                        <li>
                            No direct phone numbers or social links are publicly
                            exposed.
                        </li>
                    )}
                </ul>
            </div>
        </div>
    );
};

export default ContactMatrix;
