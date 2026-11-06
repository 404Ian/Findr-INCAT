import type { CampusHubName } from "./data/hubs";
export { CAMPUS_HUB_NAMES, type CampusHubName } from "./data/hubs";

export type LanguageCode = "en" | "tl" | "ilo";

export type PostType = "lost" | "found";
export type PostStatus = "open" | "claimed" | "returned";

export type ItemCategory =
    | "ids_cards"
    | "wallets_cash"
    | "calculators"
    | "electronics"
    | "tumblers_containers"
    | "keys_lanyards"
    | "bags_pouches"
    | "books_notebooks"
    | "apparel_umbrellas"
    | "shop_tools"
    | "other";

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
    label?: string;
    visible: boolean;
}

export interface NotifyChannelConfig {
    kind: "email" | "telegram" | "messenger";
    value: string;
}

export interface ContactConfig {
    methods: ContactMethod[];
    relayMode: boolean;
    dropOffHub?: CampusHubName;
    notifyChannel?: NotifyChannelConfig;
}

export interface CampusLocation {
    id: string;
    name: CampusHubName | string;
    buildingCode: string;
    isDropOffHub: boolean;
    lat: number;
    lng: number;
    description: string;
}

export interface Post {
    id: string;
    type: PostType;
    title: string;
    description: string;
    category: ItemCategory;
    locationId: string;
    locationName: string;
    lat: number;
    lng: number;
    imageUrls: string[];
    contact: ContactConfig;
    status: PostStatus;
    linkedTagCode?: string | null;
    hasClaimQuestion: boolean;
    claimQuestionPrompt?: string | null;
    occurredAt: string;
    createdAt: string;
    resolvedAt?: string | null;
}

export interface Tag {
    id: string;
    publicCode: string;
    label: string;
    itemType: ItemCategory;
    photoUrl?: string | null;
    contactConfig: ContactConfig;
    relayMode: boolean;
    lostMode: boolean;
    lostNote?: string | null;
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
    photoUrl?: string | null;
    relayMode: boolean;
    lostMode: boolean;
    lostNote?: string | null;
    dropOffHub?: CampusHubName;
    visibleMethodsCount: number;
    visibleMethods?: ContactMethod[];
    isRevoked: boolean;
}

export interface ScanEvent {
    id: string;
    tagId: string;
    scannedAt: string;
    approxLocation?: {
        lat: number;
        lng: number;
        label?: string;
    } | null;
}

export interface TagMessage {
    id: string;
    tagId: string;
    body: string;
    finderContact?: string | null;
    foundAtHub?: CampusHubName | null;
    approxLocation?: {
        lat: number;
        lng: number;
    } | null;
    createdAt: string;
    readAt?: string | null;
}

export interface PostFilters {
    type?: "all" | PostType;
    status?: "all" | PostStatus;
    category?: "all" | ItemCategory;
    locationId?: "all" | string;
    q?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    cursor?: string;
}

export interface PaginatedPostsResponse {
    items: Post[];
    nextCursor: string | null;
    stats: {
        missingCount: number;
        foundCount: number;
        returnedCount: number;
    };
}

export interface CreatePostInput {
    type: PostType;
    title: string;
    description: string;
    category: ItemCategory;
    locationId: string;
    lat: number;
    lng: number;
    imageKeys: string[];
    contact: ContactConfig;
    linkedTagCode?: string;
    claimQuestionPrompt?: string;
    claimAnswer?: string;
    occurredAt?: string;
    turnstileToken?: string;
}

export interface CreatePostResponse {
    post: Post;
    editKey: string;
    manageUrl: string;
}

export interface CreateTagInput {
    label: string;
    itemType: ItemCategory;
    photoKey?: string;
    contactConfig: ContactConfig;
    lostMode?: boolean;
    lostNote?: string;
    turnstileToken?: string;
}

export interface CreateTagResponse {
    tag: Tag;
    manageKey: string;
    manageUrl: string;
}

export interface ReportPayload {
    targetType: "post" | "tag";
    targetId: string;
    reason: string;
    details?: string;
    turnstileToken?: string;
}
