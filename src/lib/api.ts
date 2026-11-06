import type {
    CampusLocation,
    ContactMethod,
    CreatePostInput,
    CreatePostResponse,
    CreateTagInput,
    CreateTagResponse,
    ItemCategory,
    PaginatedPostsResponse,
    Post,
    PostFilters,
    PostStatus,
    PublicTagView,
    ReportPayload,
    ScanEvent,
    Tag,
    TagMessage,
} from "../types";
import {
    getAllTagManageKeys,
    getPostEditKey,
    getStoredCampusCode,
    getTagManageKey,
    saveCapabilityItem,
} from "./keys";

const API_BASE =
    (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "/api";

export class ApiError extends Error {
    readonly status: number;
    readonly code: string;

    constructor(message: string, status: number, code = "API_ERROR") {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.code = code;
    }
}

async function requestJson<T>(
    path: string,
    init?: RequestInit & { bearerKey?: string },
): Promise<T> {
    const headers = new Headers(init?.headers);
    if (!headers.has("Content-Type") && !(init?.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
    }
    const campusCode = getStoredCampusCode();
    if (campusCode) {
        headers.set("X-Campus-Code", campusCode);
    }
    if (init?.bearerKey) {
        headers.set("Authorization", `Bearer ${init.bearerKey}`);
    }

    const response = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers,
    });

    const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
    } & T;

    if (!response.ok) {
        throw new ApiError(
            data.error || `Request failed with status ${response.status}`,
            response.status,
            data.code || "HTTP_ERROR",
        );
    }

    return data as T;
}

export const api = {
    async getLocations(): Promise<{
        locations: CampusLocation[];
        campusCodeRequired: boolean;
    }> {
        return requestJson("/locations");
    },

    async getPosts(filters: PostFilters = {}): Promise<PaginatedPostsResponse> {
        const params = new URLSearchParams();
        if (filters.type && filters.type !== "all")
            params.set("type", filters.type);
        if (filters.status && filters.status !== "all")
            params.set("status", filters.status);
        if (filters.category && filters.category !== "all")
            params.set("category", filters.category);
        if (filters.locationId && filters.locationId !== "all")
            params.set("locationId", filters.locationId);
        if (filters.q?.trim()) params.set("q", filters.q.trim());
        if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
        if (filters.dateTo) params.set("dateTo", filters.dateTo);
        if (filters.limit) params.set("limit", String(filters.limit));
        if (filters.cursor) params.set("cursor", filters.cursor);

        const qs = params.toString();
        return requestJson(`/posts${qs ? `?${qs}` : ""}`);
    },

    async getPost(id: string): Promise<{ post: Post }> {
        return requestJson(`/posts/${encodeURIComponent(id)}`);
    },

    async createPost(input: CreatePostInput): Promise<CreatePostResponse> {
        const res = await requestJson<CreatePostResponse>("/posts", {
            method: "POST",
            body: JSON.stringify(input),
        });
        saveCapabilityItem({
            kind: "post",
            id: res.post.id,
            key: res.editKey,
            label: res.post.title,
            addedAt: new Date().toISOString(),
        });
        return res;
    },

    async updatePost(
        postId: string,
        patch: Partial<CreatePostInput> & { status?: PostStatus },
        explicitEditKey?: string,
    ): Promise<{ post: Post }> {
        const key = explicitEditKey ?? getPostEditKey(postId);
        if (!key) throw new ApiError("No edit key found on this device.", 401);
        return requestJson(`/posts/${encodeURIComponent(postId)}`, {
            method: "PATCH",
            bearerKey: key,
            body: JSON.stringify(patch),
        });
    },

    async resolvePost(
        postId: string,
        explicitEditKey?: string,
    ): Promise<{ post: Post }> {
        const key = explicitEditKey ?? getPostEditKey(postId);
        if (!key) throw new ApiError("No edit key found on this device.", 401);
        return requestJson(`/posts/${encodeURIComponent(postId)}/resolve`, {
            method: "POST",
            bearerKey: key,
        });
    },

    async deletePost(postId: string, explicitEditKey?: string): Promise<void> {
        const key = explicitEditKey ?? getPostEditKey(postId);
        if (!key) throw new ApiError("No edit key found on this device.", 401);
        await requestJson(`/posts/${encodeURIComponent(postId)}`, {
            method: "DELETE",
            bearerKey: key,
        });
    },

    async verifyClaimAnswer(
        postId: string,
        answer: string,
    ): Promise<{
        verified: boolean;
        methods: ContactMethod[];
        dropOffHub?: string;
    }> {
        return requestJson(
            `/posts/${encodeURIComponent(postId)}/verify-claim`,
            {
                method: "POST",
                body: JSON.stringify({ answer }),
            },
        );
    },

    async getMyTags(): Promise<{ tags: Tag[] }> {
        const keys = getAllTagManageKeys();
        if (keys.length === 0) return { tags: [] };
        return requestJson("/tags", {
            headers: {
                "X-Manage-Keys": keys.join(","),
            },
        });
    },

    async createTag(input: CreateTagInput): Promise<CreateTagResponse> {
        const res = await requestJson<CreateTagResponse>("/tags", {
            method: "POST",
            body: JSON.stringify(input),
        });
        saveCapabilityItem({
            kind: "tag",
            id: res.tag.id,
            key: res.manageKey,
            label: res.tag.label,
            publicCode: res.tag.publicCode,
            addedAt: new Date().toISOString(),
        });
        return res;
    },

    async updateTag(
        tagId: string,
        patch: {
            label?: string;
            itemType?: ItemCategory;
            contactConfig?: CreateTagInput["contactConfig"];
            lostMode?: boolean;
            lostNote?: string | null;
            revoke?: boolean;
        },
        explicitManageKey?: string,
    ): Promise<{ tag: Tag }> {
        const key = explicitManageKey ?? getTagManageKey(tagId);
        if (!key) throw new ApiError("No manage key found for this tag.", 401);
        return requestJson(`/tags/${encodeURIComponent(tagId)}`, {
            method: "PATCH",
            bearerKey: key,
            body: JSON.stringify(patch),
        });
    },

    async regenerateTagCode(
        tagId: string,
        explicitManageKey?: string,
    ): Promise<{ tag: Tag }> {
        const key = explicitManageKey ?? getTagManageKey(tagId);
        if (!key) throw new ApiError("No manage key found for this tag.", 401);
        return requestJson(`/tags/${encodeURIComponent(tagId)}/regenerate`, {
            method: "POST",
            bearerKey: key,
        });
    },

    async deleteTag(tagId: string, explicitManageKey?: string): Promise<void> {
        const key = explicitManageKey ?? getTagManageKey(tagId);
        if (!key) throw new ApiError("No manage key found for this tag.", 401);
        await requestJson(`/tags/${encodeURIComponent(tagId)}`, {
            method: "DELETE",
            bearerKey: key,
        });
    },

    async getTagMessagesAndScans(
        tagId: string,
        explicitManageKey?: string,
    ): Promise<{ messages: TagMessage[]; scans: ScanEvent[] }> {
        const key = explicitManageKey ?? getTagManageKey(tagId);
        if (!key) throw new ApiError("No manage key found for this tag.", 401);
        return requestJson(`/tags/${encodeURIComponent(tagId)}/messages`, {
            bearerKey: key,
        });
    },

    async getPublicTag(
        publicCode: string,
        preview = false,
    ): Promise<{ tag: PublicTagView }> {
        const qs = preview ? "?preview=1" : "";
        return requestJson(`/t/${encodeURIComponent(publicCode)}${qs}`);
    },

    async revealPublicTagContacts(
        publicCode: string,
        turnstileToken: string,
    ): Promise<{ visibleMethods: ContactMethod[]; dropOffHub?: string }> {
        return requestJson(`/t/${encodeURIComponent(publicCode)}/reveal`, {
            method: "POST",
            body: JSON.stringify({ turnstileToken }),
        });
    },

    async sendFinderMessage(
        publicCode: string,
        payload: {
            body: string;
            finderContact?: string;
            foundAtHub?: string;
            approxLocation?: { lat: number; lng: number } | null;
            turnstileToken?: string;
        },
    ): Promise<{ sent: boolean; id: string }> {
        return requestJson(`/t/${encodeURIComponent(publicCode)}/message`, {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    async restoreCapabilityKey(rawKey: string): Promise<{
        kind: "tag" | "post";
        id: string;
        label: string;
        publicCode?: string;
    }> {
        const res = await requestJson<{
            kind: "tag" | "post";
            id: string;
            label: string;
            publicCode?: string;
        }>(`/key/restore/${encodeURIComponent(rawKey.trim())}`);

        saveCapabilityItem({
            kind: res.kind,
            id: res.id,
            key: rawKey.trim(),
            label: res.label,
            publicCode: res.publicCode,
            addedAt: new Date().toISOString(),
        });
        return res;
    },

    async uploadImage(file: File): Promise<{ key: string; url: string }> {
        const form = new FormData();
        form.append("file", file);
        return requestJson("/upload", {
            method: "POST",
            body: form,
        });
    },

    async submitReport(payload: ReportPayload): Promise<{ reported: boolean }> {
        return requestJson("/report", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },
};
