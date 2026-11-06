// src/types.ts
import type { CampusHubName, CampusLocation } from "./data/hubs";

export type { CampusHubName, CampusLocation };

export type ContactMethodKind =
    | "messenger"
    | "phone"
    | "sms"
    | "email"
    | "facebook"
    | "instagram"
    | "telegram";

export interface ContactMethod {
    kind: ContactMethodKind;
    value: string;
    visible: boolean;
    label?: string;
}

export interface ContactConfig {
    methods: ContactMethod[];
    relayMode: boolean;
    dropOffHub?: CampusHubName;
    notifyWebhookOrEmail?: string;
}

export type ItemCategory =
    | "ids_cards"
    | "wallets_cash"
    | "electronics"
    | "tumblers_containers"
    | "calculators_tools"
    | "keys_lanyards"
    | "bags_apparel"
    | "books_notebooks"
    | "other";

export type PostType = "lost" | "found";
export type PostStatus = "open" | "claimed" | "returned";

export interface PostItem {
    id: string;
    type: PostType;
    title: string;
    description: string;
    category: ItemCategory;
    locationId: string;
    locationName: string;
    building: string;
    lat: number;
    lng: number;
    imageKeys: string[];
    contact: ContactConfig;
    status: PostStatus;
    linkedTagCode?: string | null;
    claimQuestion?: string | null;
    hasClaimProtection: boolean;
    createdAt: string;
    resolvedAt?: string | null;
}

export interface TagItem {
    id: string;
    publicCode: string;
    label: string;
    itemType: ItemCategory;
    photoKey?: string | null;
    contact: ContactConfig;
    relayMode: boolean;
    lostMode: boolean;
    scanCount: number;
    lastScannedAt?: string | null;
    unreadMessageCount: number;
    createdAt: string;
    revokedAt?: string | null;
}

export interface PublicTagView {
    publicCode: string;
    label: string;
    itemType: ItemCategory;
    photoKey?: string | null;
    relayMode: boolean;
    lostMode: boolean;
    dropOffHub?: CampusHubName;
    visibleMethods: Array<Pick<ContactMethod, "kind" | "value" | "label">>;
    requiresTurnstileToReveal: boolean;
    revoked: boolean;
}

export interface RelayMessage {
    id: string;
    tagId: string;
    body: string;
    finderContact?: string | null;
    approxLocation?: string | null;
    createdAt: string;
    readAt?: string | null;
}

export interface ScanEventItem {
    id: string;
    tagId: string;
    scannedAt: string;
    approxLocation?: string | null;
}

export interface WallStats {
    missing: number;
    found: number;
    returned: number;
}

export interface PostFilterParams {
    type?: "all" | PostType;
    status?: "all" | PostStatus;
    category?: "all" | ItemCategory;
    locationId?: string;
    q?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
}
