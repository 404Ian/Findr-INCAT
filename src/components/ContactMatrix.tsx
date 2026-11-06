// src/components/ContactMatrix.tsx
import React from "react";
import { INCAT_HUBS, type CampusHubName } from "../data/hubs";
import type { ContactConfig, ContactMethod, ContactMethodKind } from "../types";

interface ContactMatrixProps {
    value: ContactConfig;
    onChange: (next: ContactConfig) => void;
    language?: "en" | "tl";
}

const METHOD_META: Record<
    ContactMethodKind,
    { label: string; placeholder: string; prefixHint: string }
> = {
    messenger: {
        label: "Messenger",
        placeholder: "m.me/juan.delacruz",
        prefixHint: "Username or m.me link",
    },
    phone: {
        label: "Phone Call",
        placeholder: "0917 123 4567",
        prefixHint: "PH mobile number",
    },
    sms: {
        label: "SMS Text",
        placeholder: "0917 123 4567",
        prefixHint: "SMS number",
    },
    email: {
        label: "Email",
        placeholder: "student@incat.edu.ph",
        prefixHint: "Direct email address",
    },
    facebook: {
        label: "Facebook Profile",
        placeholder: "facebook.com/juan.incat",
        prefixHint: "Profile URL or name",
    },
    instagram: {
        label: "Instagram",
        placeholder: "@juan.incat",
        prefixHint: "IG handle",
    },
    telegram: {
        label: "Telegram",
        placeholder: "@juan_incat",
        prefixHint: "Telegram username",
    },
};

const DROP_OFF_HUBS = INCAT_HUBS.filter((h) => h.type === "dropoff");

export const ContactMatrix: React.FC<ContactMatrixProps> = ({
    value,
    onChange,
    language = "en",
}) => {
    const handleToggleRelay = (relayMode: boolean) => {
        onChange({ ...value, relayMode });
    };

    const handleHubChange = (dropOffHub: CampusHubName | "") => {
        onChange({
            ...value,
            dropOffHub: dropOffHub === "" ? undefined : dropOffHub,
        });
    };

    const handleMethodChange = (
        index: number,
        patch: Partial<ContactMethod>,
    ) => {
        const nextMethods = value.methods.map((method, i) =>
            i === index ? { ...method, ...patch } : method,
        );
        onChange({ ...value, methods: nextMethods });
    };

    const handleAddMethod = (kind: ContactMethodKind) => {
        const nextMethods: ContactMethod[] = [
            ...value.methods,
            { kind, value: "", visible: !value.relayMode },
        ];
        onChange({ ...value, methods: nextMethods });
    };

    const handleRemoveMethod = (index: number) => {
        const nextMethods = value.methods.filter((_, i) => i !== index);
        onChange({ ...value, methods: nextMethods });
    };

    const visibleCount = value.methods.filter(
        (m) => m.visible && m.value.trim().length > 0,
    ).length;

    return (
        <div className="space-y-4 rounded-xl border border-stone-200 bg-stone-50/70 p-4 dark:border-stone-800 dark:bg-stone-900/60">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                        {language === "tl"
                            ? "Privacy at Paraan ng Pakikipag-ugnayan"
                            : "Privacy & Contact Controls"}
                    </h4>
                    <p className="text-xs text-stone-600 dark:text-stone-400">
                        {language === "tl"
                            ? "Piliin kung aling detalye ang makikita kapag na-scan ang QR o binuksan ang post."
                            : "Choose what finders can see when they scan your tag or view this post."}
                    </p>
                </div>

                <label className="inline-flex cursor-pointer items-center gap-2 self-start rounded-lg border border-emerald-700/20 bg-emerald-950/5 px-3 py-1.5 text-xs font-medium text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-200">
                    <input
                        type="checkbox"
                        checked={value.relayMode}
                        onChange={(e) => handleToggleRelay(e.target.checked)}
                        className="h-4 w-4 rounded border-stone-300 text-emerald-700 focus:ring-emerald-600"
                    />
                    <span>
                        {language === "tl"
                            ? "Relay Mode (Nakatago ang numero)"
                            : "Relay Mode (Hide personal contact)"}
                    </span>
                </label>
            </div>

            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
                {value.relayMode ? (
                    <span>
                        <strong>Private Relay Active:</strong> Your phone number
                        and social links stay hidden. Finders send messages
                        through a secure form delivered straight to your{" "}
                        <em>My items</em> tab.
                    </span>
                ) : (
                    <span>
                        <strong>Public Reveal Notice:</strong> {visibleCount}{" "}
                        contact method(s) marked visible will be shown to
                        finders after a Cloudflare Turnstile anti-scraper check.
                    </span>
                )}
            </div>

            <div>
                <label
                    htmlFor="dropoff-hub-select"
                    className="block text-xs font-medium text-stone-700 dark:text-stone-300"
                >
                    {language === "tl"
                        ? "Inirerekomendang Drop-off Hub sa INCAT"
                        : "Preferred INCAT Drop-off Hub"}
                </label>
                <select
                    id="dropoff-hub-select"
                    value={value.dropOffHub ?? ""}
                    onChange={(e) =>
                        handleHubChange(e.target.value as CampusHubName | "")
                    }
                    className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                >
                    <option value="">No specific hub preference</option>
                    {DROP_OFF_HUBS.map((hub) => (
                        <option key={hub.id} value={hub.name}>
                            {hub.name} — {hub.building}
                        </option>
                    ))}
                </select>
            </div>

            <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-stone-700 dark:text-stone-300">
                        Contact Methods ({value.methods.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                        {(
                            [
                                "messenger",
                                "phone",
                                "sms",
                                "email",
                            ] as ContactMethodKind[]
                        ).map((kind) => (
                            <button
                                key={kind}
                                type="button"
                                onClick={() => handleAddMethod(kind)}
                                className="rounded-md border border-stone-300 bg-white px-2 py-1 text-xs font-medium text-stone-700 transition hover:border-emerald-700 hover:text-emerald-800 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
                            >
                                + {METHOD_META[kind].label}
                            </button>
                        ))}
                    </div>
                </div>

                {value.methods.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-stone-300 p-3 text-center text-xs text-stone-500 dark:border-stone-700 dark:text-stone-400">
                        No direct contact methods added. Finders will use the
                        anonymous Relay Message box and drop-off hub
                        instructions.
                    </p>
                ) : (
                    <div className="space-y-2">
                        {value.methods.map((method, idx) => {
                            const meta = METHOD_META[method.kind];
                            return (
                                <div
                                    key={`${method.kind}-${idx}`}
                                    className="flex flex-col gap-2 rounded-lg border border-stone-200 bg-white p-2.5 sm:flex-row sm:items-center dark:border-stone-800 dark:bg-stone-950"
                                >
                                    <select
                                        aria-label="Contact type"
                                        value={method.kind}
                                        onChange={(e) =>
                                            handleMethodChange(idx, {
                                                kind: e.target
                                                    .value as ContactMethodKind,
                                            })
                                        }
                                        className="rounded-md border border-stone-300 bg-stone-50 px-2.5 py-1.5 text-xs font-medium text-stone-800 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
                                    >
                                        {Object.entries(METHOD_META).map(
                                            ([k, v]) => (
                                                <option key={k} value={k}>
                                                    {v.label}
                                                </option>
                                            ),
                                        )}
                                    </select>

                                    <input
                                        type="text"
                                        value={method.value}
                                        onChange={(e) =>
                                            handleMethodChange(idx, {
                                                value: e.target.value,
                                            })
                                        }
                                        placeholder={meta.placeholder}
                                        aria-label={`${meta.label} value`}
                                        className="flex-1 rounded-md border border-stone-300 bg-transparent px-3 py-1.5 text-sm text-stone-900 focus:border-emerald-700 focus:outline-none dark:border-stone-700 dark:text-stone-100"
                                    />

                                    <div className="flex items-center justify-between gap-2 sm:justify-end">
                                        <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-stone-600 dark:text-stone-400">
                                            <input
                                                type="checkbox"
                                                checked={
                                                    method.visible &&
                                                    !value.relayMode
                                                }
                                                disabled={value.relayMode}
                                                onChange={(e) =>
                                                    handleMethodChange(idx, {
                                                        visible:
                                                            e.target.checked,
                                                    })
                                                }
                                                className="h-3.5 w-3.5 rounded border-stone-300 text-emerald-700 focus:ring-emerald-600 disabled:opacity-40"
                                            />
                                            <span>
                                                {value.relayMode
                                                    ? "Hidden by Relay"
                                                    : method.visible
                                                      ? "Public"
                                                      : "Hidden"}
                                            </span>
                                        </label>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleRemoveMethod(idx)
                                            }
                                            aria-label={`Remove ${meta.label}`}
                                            className="rounded p-1 text-xs text-stone-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
