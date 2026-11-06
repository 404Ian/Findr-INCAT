import React from "react";
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
        <div className="space-y-4 rounded-xl border border-neutral-800/80 bg-neutral-900/50 p-4 text-sm">
            {/* Relay Mode Banner */}
            <div className="flex items-start justify-between gap-4 rounded-lg border border-emerald-900/50 bg-emerald-950/20 p-3.5">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                        <span className="font-medium text-neutral-100">
                            Anonymous Relay Messaging (Recommended)
                        </span>
                    </div>
                    <p className="text-xs leading-relaxed text-neutral-400">
                        Finders can message you directly inside Findr without
                        seeing your phone number or social profile. You read
                        messages in <strong>My items</strong>.
                    </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                    <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={value.relayMode}
                        onChange={(e) => handleRelayToggle(e.target.checked)}
                        aria-label="Enable anonymous relay messaging"
                    />
                    <div className="h-6 w-11 rounded-full bg-neutral-700 after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-emerald-600 peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-400" />
                </label>
            </div>

            {/* Preferred Campus Drop-off Hub */}
            {showDropOffHub && (
                <div className="space-y-1.5">
                    <label
                        htmlFor="contact-dropoff-hub"
                        className="block text-xs font-medium tracking-wide text-neutral-300 uppercase"
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
                        className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                    >
                        <option value="">No specific hub preference</option>
                        {CAMPUS_HUB_NAMES.map((hubName) => (
                            <option key={hubName} value={hubName}>
                                {hubName}
                            </option>
                        ))}
                    </select>
                    <p className="text-xs text-neutral-400">
                        Shown to the finder so they can leave your item safely
                        on campus.
                    </p>
                </div>
            )}

            {/* Direct Contact Channels */}
            <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-medium tracking-wide text-neutral-300 uppercase">
                        Direct Contact Channels (Per-Channel Visibility)
                    </span>
                    <span className="text-xs text-neutral-400">
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
                                className={`rounded-lg border p-3 transition-colors ${
                                    isEnabled
                                        ? "border-neutral-700 bg-neutral-950/90"
                                        : "border-neutral-800/70 bg-neutral-950/40"
                                }`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <label className="flex cursor-pointer items-center gap-2 font-medium text-neutral-200">
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
                                            className="h-4 w-4 rounded border-neutral-600 text-emerald-600 focus:ring-emerald-500"
                                        />
                                        <span>{meta.label}</span>
                                    </label>

                                    {isEnabled && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                upsertMethod(meta.kind, {
                                                    visible: !isVisible,
                                                })
                                            }
                                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                                                isVisible
                                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                                    : "bg-neutral-800 text-neutral-400 border border-neutral-700"
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
                                            className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-2.5 py-1.5 text-xs text-neutral-100 placeholder:text-neutral-500 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                                        />
                                        <p className="text-[11px] text-neutral-500">
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
            <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-3 text-xs text-neutral-300">
                <div className="font-semibold text-neutral-200">
                    What finders will see publicly:
                </div>
                <ul className="mt-1.5 list-inside list-disc space-y-1 text-neutral-400">
                    {value.relayMode && (
                        <li>
                            An in-app <strong>Message the owner</strong> relay
                            form (your real contact stays private).
                        </li>
                    )}
                    {value.dropOffHub && (
                        <li>
                            Suggested drop-off at{" "}
                            <strong>{value.dropOffHub}</strong>.
                        </li>
                    )}
                    {publicMethods.length > 0 ? (
                        <li>
                            Direct buttons for{" "}
                            <strong>
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
