export interface StoredCapabilityItem {
    kind: "tag" | "post";
    id: string;
    key: string;
    label: string;
    publicCode?: string;
    addedAt: string;
}

export interface RecoveryFilePayload {
    app: "Findr INCAT";
    version: 1;
    exportedAt: string;
    items: StoredCapabilityItem[];
}

const VAULT_STORAGE_KEY = "findr_capability_vault_v1";
const CAMPUS_CODE_STORAGE_KEY = "findr_campus_code_v1";

export function getCapabilityVault(): StoredCapabilityItem[] {
    try {
        const raw = localStorage.getItem(VAULT_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as StoredCapabilityItem[];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function saveCapabilityItem(
    item: StoredCapabilityItem,
): StoredCapabilityItem[] {
    const current = getCapabilityVault().filter(
        (entry) =>
            !(entry.kind === item.kind && entry.id === item.id) &&
            entry.key !== item.key,
    );
    const next = [item, ...current];
    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(next));
    return next;
}

export function removeCapabilityItem(id: string): StoredCapabilityItem[] {
    const next = getCapabilityVault().filter((entry) => entry.id !== id);
    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(next));
    return next;
}

export function getPostEditKey(postId: string): string | null {
    const found = getCapabilityVault().find(
        (entry) => entry.kind === "post" && entry.id === postId,
    );
    return found?.key ?? null;
}

export function getTagManageKey(tagId: string): string | null {
    const found = getCapabilityVault().find(
        (entry) => entry.kind === "tag" && entry.id === tagId,
    );
    return found?.key ?? null;
}

export function getAllTagManageKeys(): string[] {
    return getCapabilityVault()
        .filter((entry) => entry.kind === "tag")
        .map((entry) => entry.key);
}

export function exportRecoveryJson(): void {
    const payload: RecoveryFilePayload = {
        app: "Findr INCAT",
        version: 1,
        exportedAt: new Date().toISOString(),
        items: getCapabilityVault(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `findr-incat-recovery-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

export function importRecoveryJson(rawJson: string): StoredCapabilityItem[] {
    const parsed = JSON.parse(rawJson) as Partial<RecoveryFilePayload>;
    if (!parsed || !Array.isArray(parsed.items)) {
        throw new Error("Invalid Findr recovery file.");
    }
    let vault = getCapabilityVault();
    for (const item of parsed.items) {
        if (
            item &&
            (item.kind === "tag" || item.kind === "post") &&
            typeof item.id === "string" &&
            typeof item.key === "string"
        ) {
            vault = saveCapabilityItem({
                kind: item.kind,
                id: item.id,
                key: item.key,
                label: item.label || item.id,
                publicCode: item.publicCode,
                addedAt: item.addedAt || new Date().toISOString(),
            });
        }
    }
    return vault;
}

export function getStoredCampusCode(): string {
    return localStorage.getItem(CAMPUS_CODE_STORAGE_KEY) ?? "";
}

export function setStoredCampusCode(code: string): void {
    localStorage.setItem(CAMPUS_CODE_STORAGE_KEY, code.trim());
}
