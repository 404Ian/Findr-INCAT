import type {
    ContactConfig,
    CreatePostInput,
    CreateTagInput,
    ItemCategory,
    Post,
    PostStatus,
    PostType,
    PublicTagView,
    ReportPayload,
    Tag,
    TagMessage,
} from "../../src/types";

export interface Env {
    DB: D1Database;
    BUCKET?: R2Bucket;
    CAMPUS_CODE?: string;
    ADMIN_PASSWORD?: string;
    TURNSTILE_SECRET_KEY?: string;
}

interface PostRow {
    id: string;
    type: PostType;
    title: string;
    description: string;
    category: ItemCategory;
    location_id: string;
    location_name?: string;
    lat: number;
    lng: number;
    image_keys: string;
    contact: string;
    status: PostStatus;
    linked_tag_code: string | null;
    claim_question_prompt: string | null;
    claim_answer_hash: string | null;
    edit_key_hash: string;
    occurred_at: string;
    created_at: string;
    resolved_at: string | null;
}

interface TagRow {
    id: string;
    public_code: string;
    manage_key_hash: string;
    label: string;
    item_type: ItemCategory;
    photo_key: string | null;
    contact_methods: string;
    relay_mode: number;
    lost_mode: number;
    lost_note: string | null;
    created_at: string;
    revoked_at: string | null;
    scan_count?: number;
    last_scanned_at?: string | null;
    unread_message_count?: number;
}

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
]);

const BLOCKED_TERMS = [
    "free crypto",
    "casino bonus",
    "whatsapp +",
    "telegram @crypto",
    "putangina",
    "gago ka",
    "ulol",
];

function jsonResponse(
    data: unknown,
    status = 200,
    extraHeaders?: Record<string, string>,
): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
            ...extraHeaders,
        },
    });
}

function errorResponse(
    message: string,
    status = 400,
    code = "BAD_REQUEST",
): Response {
    return jsonResponse({ error: message, code }, status);
}

async function sha256Hex(input: string): Promise<string> {
    const bytes = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

function constantTimeEqualHex(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
        diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return diff === 0;
}

function generateRandomString(length: number, alphabet: string): string {
    const randomBytes = new Uint8Array(length);
    crypto.getRandomValues(randomBytes);
    let out = "";
    for (let i = 0; i < length; i++) {
        out += alphabet[randomBytes[i] % alphabet.length];
    }
    return out;
}

function generatePublicCode(): string {
    // 12 chars, unambiguous uppercase alphanumeric
    return generateRandomString(12, "23456789ABCDEFGHJKLMNPQRSTUVWXYZ");
}

function generateCapabilityKey(): string {
    // 32 random chars (~190 bits of entropy)
    return generateRandomString(
        32,
        "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz",
    );
}

function extractBearerKey(request: Request): string | null {
    const auth = request.headers.get("Authorization");
    if (!auth || !auth.startsWith("Bearer ")) return null;
    const token = auth.slice("Bearer ".length).trim();
    return token.length >= 16 ? token : null;
}

function getClientIp(request: Request): string {
    return (
        request.headers.get("CF-Connecting-IP") ||
        request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
        "127.0.0.1"
    );
}

function containsProfanityOrSpam(text: string): boolean {
    const lower = text.toLowerCase();
    return BLOCKED_TERMS.some((term) => lower.includes(term));
}

async function checkRateLimit(
    db: D1Database,
    bucketKey: string,
    maxRequests: number,
    windowSeconds: number,
): Promise<boolean> {
    const nowSec = Math.floor(Date.now() / 1000);
    const existing = await db
        .prepare(
            "SELECT count, window_start FROM rate_limits WHERE bucket_key = ?1",
        )
        .bind(bucketKey)
        .first<{ count: number; window_start: number }>();

    if (!existing || nowSec - existing.window_start >= windowSeconds) {
        await db
            .prepare(
                "INSERT INTO rate_limits (bucket_key, count, window_start) VALUES (?1, 1, ?2) ON CONFLICT(bucket_key) DO UPDATE SET count = 1, window_start = ?2",
            )
            .bind(bucketKey, nowSec)
            .run();
        return true;
    }

    if (existing.count >= maxRequests) {
        return false;
    }

    await db
        .prepare(
            "UPDATE rate_limits SET count = count + 1 WHERE bucket_key = ?1",
        )
        .bind(bucketKey)
        .run();
    return true;
}

async function verifyTurnstile(
    secretKey: string | undefined,
    token: string | undefined,
    remoteIp: string,
): Promise<boolean> {
    if (!secretKey) return true; // Not configured in local dev
    if (!token) return false;
    if (token === "dev-bypass-token" && secretKey.startsWith("1x00000000")) {
        return true;
    }
    const form = new URLSearchParams();
    form.set("secret", secretKey);
    form.set("response", token);
    form.set("remoteip", remoteIp);

    const res = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
            method: "POST",
            body: form,
        },
    );
    if (!res.ok) return false;
    const outcome = (await res.json()) as { success?: boolean };
    return Boolean(outcome.success);
}

async function getActiveCampusCode(env: Env): Promise<string | null> {
    const row = await env.DB.prepare(
        "SELECT value FROM app_settings WHERE key = 'campus_code'",
    ).first<{ value: string }>();
    if (row) {
        return row.value.trim() || null;
    }
    return env.CAMPUS_CODE?.trim() || null;
}

async function verifyCampusCodeIfRequired(
    request: Request,
    env: Env,
): Promise<boolean> {
    const requiredCode = await getActiveCampusCode(env);
    if (!requiredCode) return true;
    const supplied = request.headers.get("X-Campus-Code")?.trim() ?? "";
    return supplied.toUpperCase() === requiredCode.toUpperCase();
}

function parseCookie(request: Request, name: string): string | null {
    const cookieHeader = request.headers.get("Cookie");
    if (!cookieHeader) return null;
    for (const part of cookieHeader.split(";")) {
        const [k, ...v] = part.trim().split("=");
        if (k === name) return decodeURIComponent(v.join("="));
    }
    return null;
}

async function isAdminAuthorized(request: Request, env: Env): Promise<boolean> {
    if (!env.ADMIN_PASSWORD) return false;
    const sessionCookie = parseCookie(request, "findr_admin_session");
    if (!sessionCookie) return false;
    const expectedHash = await sha256Hex(`admin-session:${env.ADMIN_PASSWORD}`);
    return constantTimeEqualHex(sessionCookie, expectedHash);
}

function safeParseJson<T>(raw: string | null | undefined, fallback: T): T {
    if (!raw) return fallback;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

function mapPostRow(row: PostRow): Post {
    const rawContact = safeParseJson<ContactConfig>(row.contact, {
        relayMode: true,
        methods: [],
    });
    const sanitizedMethods = (rawContact.methods ?? []).filter(
        (m) => m.visible,
    );
    const imageKeys = safeParseJson<string[]>(row.image_keys, []);

    return {
        id: row.id,
        type: row.type,
        title: row.title,
        description: row.description,
        category: row.category,
        locationId: row.location_id,
        locationName: row.location_name ?? row.location_id,
        lat: row.lat,
        lng: row.lng,
        imageUrls: imageKeys.map((k) =>
            k.startsWith("http") || k.startsWith("/")
                ? k
                : `/api/media/${encodeURIComponent(k)}`,
        ),
        contact: {
            ...rawContact,
            // If post has a claim question on a found item, hide direct methods until claim verified
            methods: row.claim_question_prompt ? [] : sanitizedMethods,
        },
        status: row.status,
        linkedTagCode: row.linked_tag_code,
        hasClaimQuestion: Boolean(row.claim_question_prompt),
        claimQuestionPrompt: row.claim_question_prompt,
        occurredAt: row.occurred_at,
        createdAt: row.created_at,
        resolvedAt: row.resolved_at,
    };
}

function mapTagRow(row: TagRow): Tag {
    const contactConfig = safeParseJson<ContactConfig>(row.contact_methods, {
        relayMode: true,
        methods: [],
    });
    return {
        id: row.id,
        publicCode: row.public_code,
        label: row.label,
        itemType: row.item_type,
        photoUrl: row.photo_key
            ? row.photo_key.startsWith("/")
                ? row.photo_key
                : `/api/media/${encodeURIComponent(row.photo_key)}`
            : null,
        contactConfig,
        relayMode: Boolean(row.relay_mode),
        lostMode: Boolean(row.lost_mode),
        lostNote: row.lost_note,
        scanCount: Number(row.scan_count ?? 0),
        lastScannedAt: row.last_scanned_at ?? null,
        unreadMessageCount: Number(row.unread_message_count ?? 0),
        createdAt: row.created_at,
        revokedAt: row.revoked_at,
    };
}

export const onRequest: PagesFunction<Env> = async (context) => {
    const { request, env } = context;
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/api\/?/, "");
    const segments = path.split("/").filter(Boolean);
    const method = request.method.toUpperCase();
    const clientIp = getClientIp(request);
    const ipHash = await sha256Hex(`ip:${clientIp}`);

    try {
        // 1. GET /api/locations
        if (segments[0] === "locations" && method === "GET") {
            const { results } = await env.DB.prepare(
                "SELECT id, name, building_code, is_drop_off_hub, lat, lng, description FROM locations ORDER BY is_drop_off_hub DESC, name ASC",
            ).all<{
                id: string;
                name: string;
                building_code: string;
                is_drop_off_hub: number;
                lat: number;
                lng: number;
                description: string;
            }>();

            const requiredCode = await getActiveCampusCode(env);

            return jsonResponse({
                locations: results.map((r) => ({
                    id: r.id,
                    name: r.name,
                    buildingCode: r.building_code,
                    isDropOffHub: Boolean(r.is_drop_off_hub),
                    lat: r.lat,
                    lng: r.lng,
                    description: r.description,
                })),
                campusCodeRequired: Boolean(requiredCode),
            });
        }

        // 2. GET /api/posts & POST /api/posts
        if (segments[0] === "posts" && segments.length === 1) {
            if (method === "GET") {
                const type = url.searchParams.get("type");
                const status = url.searchParams.get("status");
                const category = url.searchParams.get("category");
                const locationId = url.searchParams.get("locationId");
                const q = url.searchParams.get("q")?.trim();
                const dateFrom = url.searchParams.get("dateFrom");
                const dateTo = url.searchParams.get("dateTo");
                const cursor = url.searchParams.get("cursor");
                const limit = Math.min(
                    Math.max(Number(url.searchParams.get("limit") || 20), 1),
                    50,
                );

                const conditions: string[] = [];
                const binds: unknown[] = [];

                if (type && type !== "all") {
                    conditions.push(`p.type = ?${binds.length + 1}`);
                    binds.push(type);
                }
                if (status && status !== "all") {
                    conditions.push(`p.status = ?${binds.length + 1}`);
                    binds.push(status);
                }
                if (category && category !== "all") {
                    conditions.push(`p.category = ?${binds.length + 1}`);
                    binds.push(category);
                }
                if (locationId && locationId !== "all") {
                    conditions.push(`p.location_id = ?${binds.length + 1}`);
                    binds.push(locationId);
                }
                if (q) {
                    conditions.push(
                        `(p.title LIKE ?${binds.length + 1} OR p.description LIKE ?${binds.length + 1} OR l.name LIKE ?${binds.length + 1})`,
                    );
                    binds.push(`%${q}%`);
                }
                if (dateFrom) {
                    conditions.push(`p.occurred_at >= ?${binds.length + 1}`);
                    binds.push(dateFrom);
                }
                if (dateTo) {
                    conditions.push(`p.occurred_at <= ?${binds.length + 1}`);
                    binds.push(dateTo);
                }
                if (cursor) {
                    conditions.push(`p.created_at < ?${binds.length + 1}`);
                    binds.push(cursor);
                }

                const whereClause =
                    conditions.length > 0
                        ? `WHERE ${conditions.join(" AND ")}`
                        : "";

                const sql = `
          SELECT p.*, l.name AS location_name
          FROM posts p
          LEFT JOIN locations l ON l.id = p.location_id
          ${whereClause}
          ORDER BY p.created_at DESC
          LIMIT ${limit + 1}
        `;

                const { results } = await env.DB.prepare(sql)
                    .bind(...binds)
                    .all<PostRow>();

                const hasMore = results.length > limit;
                const slice = hasMore ? results.slice(0, limit) : results;
                const nextCursor =
                    hasMore && slice.length > 0
                        ? slice[slice.length - 1].created_at
                        : null;

                const statsRow = await env.DB.prepare(
                    `
          SELECT
            SUM(CASE WHEN type = 'lost' AND status = 'open' THEN 1 ELSE 0 END) AS missing_count,
            SUM(CASE WHEN type = 'found' AND status = 'open' THEN 1 ELSE 0 END) AS found_count,
            SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END) AS returned_count
          FROM posts
        `,
                ).first<{
                    missing_count: number | null;
                    found_count: number | null;
                    returned_count: number | null;
                }>();

                return jsonResponse({
                    items: slice.map(mapPostRow),
                    nextCursor,
                    stats: {
                        missingCount: Number(statsRow?.missing_count ?? 0),
                        foundCount: Number(statsRow?.found_count ?? 0),
                        returnedCount: Number(statsRow?.returned_count ?? 0),
                    },
                });
            }

            if (method === "POST") {
                if (!(await verifyCampusCodeIfRequired(request, env))) {
                    return errorResponse(
                        "Valid INCAT campus access code required to create a post.",
                        403,
                        "CAMPUS_CODE_REQUIRED",
                    );
                }

                const allowed = await checkRateLimit(
                    env.DB,
                    `post_create:${ipHash}`,
                    10,
                    86400,
                );
                if (!allowed) {
                    return errorResponse(
                        "Daily post limit reached for this network. Please try again tomorrow.",
                        429,
                        "RATE_LIMITED",
                    );
                }

                const body = (await request.json()) as CreatePostInput;
                const turnstileOk = await verifyTurnstile(
                    env.TURNSTILE_SECRET_KEY,
                    body.turnstileToken,
                    clientIp,
                );
                if (!turnstileOk) {
                    return errorResponse(
                        "Human verification failed. Please retry.",
                        403,
                        "TURNSTILE_FAILED",
                    );
                }

                const title = body.title?.trim() ?? "";
                const description = body.description?.trim() ?? "";
                if (title.length < 3 || title.length > 120) {
                    return errorResponse(
                        "Title must be between 3 and 120 characters.",
                    );
                }
                if (description.length < 5 || description.length > 1500) {
                    return errorResponse(
                        "Description must be between 5 and 1500 characters.",
                    );
                }
                if (
                    containsProfanityOrSpam(title) ||
                    containsProfanityOrSpam(description)
                ) {
                    return errorResponse(
                        "Post contains blocked spam or inappropriate language.",
                    );
                }

                const id = `post-${crypto.randomUUID().slice(0, 12)}`;
                const editKey = generateCapabilityKey();
                const editKeyHash = await sha256Hex(editKey);
                const nowIso = new Date().toISOString();
                const occurredAt = body.occurredAt || nowIso;

                const claimPrompt = body.claimQuestionPrompt?.trim() || null;
                const claimAnswerHash =
                    claimPrompt && body.claimAnswer?.trim()
                        ? await sha256Hex(body.claimAnswer.trim().toLowerCase())
                        : null;

                await env.DB.prepare(
                    `INSERT INTO posts (
            id, type, title, description, category, location_id, lat, lng,
            image_keys, contact, status, linked_tag_code,
            claim_question_prompt, claim_answer_hash, edit_key_hash,
            occurred_at, created_at
          ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 'open', ?11, ?12, ?13, ?14, ?15, ?16)`,
                )
                    .bind(
                        id,
                        body.type === "found" ? "found" : "lost",
                        title,
                        description,
                        body.category || "other",
                        body.locationId || "loc-guard-house",
                        Number(body.lat || 18.20389),
                        Number(body.lng || 120.59268),
                        JSON.stringify((body.imageKeys ?? []).slice(0, 4)),
                        JSON.stringify(body.contact),
                        body.linkedTagCode || null,
                        claimPrompt,
                        claimAnswerHash,
                        editKeyHash,
                        occurredAt,
                        nowIso,
                    )
                    .run();

                const created = await env.DB.prepare(
                    `SELECT p.*, l.name AS location_name
           FROM posts p LEFT JOIN locations l ON l.id = p.location_id
           WHERE p.id = ?1`,
                )
                    .bind(id)
                    .first<PostRow>();

                if (!created) {
                    return errorResponse("Failed to load created post", 500);
                }

                return jsonResponse(
                    {
                        post: mapPostRow(created),
                        editKey,
                        manageUrl: `/manage/${editKey}`,
                    },
                    201,
                );
            }
        }

        // 3. /api/posts/:id & /api/posts/:id/resolve & /api/posts/:id/verify-claim
        if (segments[0] === "posts" && segments.length >= 2) {
            const postId = segments[1];
            const subAction = segments[2];

            const row = await env.DB.prepare(
                `SELECT p.*, l.name AS location_name
         FROM posts p LEFT JOIN locations l ON l.id = p.location_id
         WHERE p.id = ?1`,
            )
                .bind(postId)
                .first<PostRow>();

            if (!row) {
                return errorResponse("Post not found.", 404, "NOT_FOUND");
            }

            if (!subAction && method === "GET") {
                return jsonResponse({ post: mapPostRow(row) });
            }

            if (subAction === "verify-claim" && method === "POST") {
                const allowed = await checkRateLimit(
                    env.DB,
                    `claim_verify:${ipHash}:${postId}`,
                    5,
                    900,
                );
                if (!allowed) {
                    return errorResponse(
                        "Too many verification attempts. Try again in 15 minutes.",
                        429,
                    );
                }
                if (!row.claim_answer_hash) {
                    const contact = safeParseJson<ContactConfig>(row.contact, {
                        relayMode: true,
                        methods: [],
                    });
                    return jsonResponse({
                        verified: true,
                        methods: contact.methods.filter((m) => m.visible),
                    });
                }
                const { answer } = (await request.json()) as {
                    answer?: string;
                };
                const candidateHash = await sha256Hex(
                    (answer ?? "").trim().toLowerCase(),
                );
                if (
                    !constantTimeEqualHex(candidateHash, row.claim_answer_hash)
                ) {
                    return errorResponse(
                        "Answer did not match the poster verification check.",
                        403,
                        "CLAIM_MISMATCH",
                    );
                }
                const contact = safeParseJson<ContactConfig>(row.contact, {
                    relayMode: true,
                    methods: [],
                });
                return jsonResponse({
                    verified: true,
                    methods: contact.methods.filter((m) => m.visible),
                    dropOffHub: contact.dropOffHub,
                });
            }

            // Authenticated post endpoints require capability editKey in Authorization: Bearer
            const rawKey = extractBearerKey(request);
            if (!rawKey) {
                return errorResponse(
                    "Missing edit capability key in Authorization header.",
                    401,
                    "UNAUTHORIZED",
                );
            }
            const keyHash = await sha256Hex(rawKey);
            if (!constantTimeEqualHex(keyHash, row.edit_key_hash)) {
                return errorResponse(
                    "Invalid edit capability key.",
                    403,
                    "FORBIDDEN",
                );
            }

            if (subAction === "resolve" && method === "POST") {
                const nowIso = new Date().toISOString();
                await env.DB.prepare(
                    "UPDATE posts SET status = 'returned', resolved_at = ?1 WHERE id = ?2",
                )
                    .bind(nowIso, postId)
                    .run();

                const updated = await env.DB.prepare(
                    `SELECT p.*, l.name AS location_name
           FROM posts p LEFT JOIN locations l ON l.id = p.location_id
           WHERE p.id = ?1`,
                )
                    .bind(postId)
                    .first<PostRow>();

                return jsonResponse({
                    post: updated ? mapPostRow(updated) : null,
                });
            }

            if (!subAction && method === "PATCH") {
                const patch =
                    (await request.json()) as Partial<CreatePostInput> & {
                        status?: PostStatus;
                    };
                const nextTitle = patch.title?.trim() ?? row.title;
                const nextDesc = patch.description?.trim() ?? row.description;
                const nextStatus = patch.status ?? row.status;
                const nextContact = patch.contact
                    ? JSON.stringify(patch.contact)
                    : row.contact;
                const nextResolvedAt =
                    nextStatus === "returned"
                        ? row.resolved_at || new Date().toISOString()
                        : null;

                await env.DB.prepare(
                    `UPDATE posts
           SET title = ?1, description = ?2, status = ?3, contact = ?4, resolved_at = ?5
           WHERE id = ?6`,
                )
                    .bind(
                        nextTitle,
                        nextDesc,
                        nextStatus,
                        nextContact,
                        nextResolvedAt,
                        postId,
                    )
                    .run();

                const updated = await env.DB.prepare(
                    `SELECT p.*, l.name AS location_name
           FROM posts p LEFT JOIN locations l ON l.id = p.location_id
           WHERE p.id = ?1`,
                )
                    .bind(postId)
                    .first<PostRow>();

                return jsonResponse({
                    post: updated ? mapPostRow(updated) : null,
                });
            }

            if (!subAction && method === "DELETE") {
                await env.DB.prepare("DELETE FROM posts WHERE id = ?1")
                    .bind(postId)
                    .run();
                return jsonResponse({ deleted: true });
            }
        }

        // 4. GET /api/tags & POST /api/tags
        if (segments[0] === "tags" && segments.length === 1) {
            if (method === "GET") {
                // Expects comma-separated manage keys in X-Manage-Keys header
                const rawKeysHeader =
                    request.headers.get("X-Manage-Keys") ?? "";
                const rawKeys = rawKeysHeader
                    .split(",")
                    .map((k) => k.trim())
                    .filter((k) => k.length >= 16)
                    .slice(0, 50);

                if (rawKeys.length === 0) {
                    return jsonResponse({ tags: [] });
                }

                const hashes = await Promise.all(
                    rawKeys.map((k) => sha256Hex(k)),
                );
                const placeholders = hashes
                    .map((_, i) => `?${i + 1}`)
                    .join(", ");

                const { results } = await env.DB.prepare(
                    `SELECT
             t.*,
             (SELECT COUNT(*) FROM scan_events s WHERE s.tag_id = t.id) AS scan_count,
             (SELECT MAX(s.scanned_at) FROM scan_events s WHERE s.tag_id = t.id) AS last_scanned_at,
             (SELECT COUNT(*) FROM messages m WHERE m.tag_id = t.id AND m.read_at IS NULL) AS unread_message_count
           FROM tags t
           WHERE t.manage_key_hash IN (${placeholders})
           ORDER BY t.created_at DESC`,
                )
                    .bind(...hashes)
                    .all<TagRow>();

                return jsonResponse({ tags: results.map(mapTagRow) });
            }

            if (method === "POST") {
                if (!(await verifyCampusCodeIfRequired(request, env))) {
                    return errorResponse(
                        "Valid INCAT campus access code required to create a QR tag.",
                        403,
                        "CAMPUS_CODE_REQUIRED",
                    );
                }

                const allowed = await checkRateLimit(
                    env.DB,
                    `tag_create:${ipHash}`,
                    10,
                    86400,
                );
                if (!allowed) {
                    return errorResponse(
                        "Daily tag creation limit reached. Please try again tomorrow.",
                        429,
                        "RATE_LIMITED",
                    );
                }

                const body = (await request.json()) as CreateTagInput;
                const turnstileOk = await verifyTurnstile(
                    env.TURNSTILE_SECRET_KEY,
                    body.turnstileToken,
                    clientIp,
                );
                if (!turnstileOk) {
                    return errorResponse(
                        "Human verification failed. Please retry.",
                        403,
                        "TURNSTILE_FAILED",
                    );
                }

                const label = body.label?.trim() ?? "";
                if (label.length < 2 || label.length > 80) {
                    return errorResponse(
                        "Tag label must be between 2 and 80 characters.",
                    );
                }
                if (containsProfanityOrSpam(label)) {
                    return errorResponse("Tag label contains blocked words.");
                }

                const id = `tag-${crypto.randomUUID().slice(0, 12)}`;
                const publicCode = generatePublicCode();
                const manageKey = generateCapabilityKey();
                const manageKeyHash = await sha256Hex(manageKey);
                const nowIso = new Date().toISOString();

                await env.DB.prepare(
                    `INSERT INTO tags (
            id, public_code, manage_key_hash, label, item_type, photo_key,
            contact_methods, relay_mode, lost_mode, lost_note, created_at
          ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`,
                )
                    .bind(
                        id,
                        publicCode,
                        manageKeyHash,
                        label,
                        body.itemType || "other",
                        body.photoKey || null,
                        JSON.stringify(body.contactConfig),
                        body.contactConfig.relayMode ? 1 : 0,
                        body.lostMode ? 1 : 0,
                        body.lostNote?.trim() || null,
                        nowIso,
                    )
                    .run();

                const created = await env.DB.prepare(
                    "SELECT * FROM tags WHERE id = ?1",
                )
                    .bind(id)
                    .first<TagRow>();

                if (!created) {
                    return errorResponse("Failed to create tag.", 500);
                }

                return jsonResponse(
                    {
                        tag: mapTagRow(created),
                        manageKey,
                        manageUrl: `/manage/${manageKey}`,
                    },
                    201,
                );
            }
        }

        // 5. /api/tags/:id (PATCH, DELETE, messages, regenerate)
        if (segments[0] === "tags" && segments.length >= 2) {
            const tagId = segments[1];
            const subResource = segments[2];

            const tagRow = await env.DB.prepare(
                "SELECT * FROM tags WHERE id = ?1",
            )
                .bind(tagId)
                .first<TagRow>();

            if (!tagRow) {
                return errorResponse("Tag not found.", 404, "NOT_FOUND");
            }

            const rawKey = extractBearerKey(request);
            if (!rawKey) {
                return errorResponse(
                    "Missing manage key.",
                    401,
                    "UNAUTHORIZED",
                );
            }
            const keyHash = await sha256Hex(rawKey);
            if (!constantTimeEqualHex(keyHash, tagRow.manage_key_hash)) {
                return errorResponse("Invalid manage key.", 403, "FORBIDDEN");
            }

            if (subResource === "messages" && method === "GET") {
                const { results } = await env.DB.prepare(
                    "SELECT * FROM messages WHERE tag_id = ?1 ORDER BY created_at DESC",
                )
                    .bind(tagId)
                    .all<{
                        id: string;
                        tag_id: string;
                        body: string;
                        finder_contact: string | null;
                        found_at_hub: string | null;
                        approx_location: string | null;
                        created_at: string;
                        read_at: string | null;
                    }>();

                // Mark unread messages as read
                await env.DB.prepare(
                    "UPDATE messages SET read_at = ?1 WHERE tag_id = ?2 AND read_at IS NULL",
                )
                    .bind(new Date().toISOString(), tagId)
                    .run();

                const { results: scans } = await env.DB.prepare(
                    "SELECT id, tag_id, scanned_at, approx_location FROM scan_events WHERE tag_id = ?1 ORDER BY scanned_at DESC LIMIT 25",
                )
                    .bind(tagId)
                    .all<{
                        id: string;
                        tag_id: string;
                        scanned_at: string;
                        approx_location: string | null;
                    }>();

                const messages: TagMessage[] = results.map((m) => ({
                    id: m.id,
                    tagId: m.tag_id,
                    body: m.body,
                    finderContact: m.finder_contact,
                    foundAtHub:
                        (m.found_at_hub as TagMessage["foundAtHub"]) ?? null,
                    approxLocation: safeParseJson(m.approx_location, null),
                    createdAt: m.created_at,
                    readAt: m.read_at,
                }));

                return jsonResponse({
                    messages,
                    scans: scans.map((s) => ({
                        id: s.id,
                        tagId: s.tag_id,
                        scannedAt: s.scanned_at,
                        approxLocation: safeParseJson(s.approx_location, null),
                    })),
                });
            }

            if (subResource === "regenerate" && method === "POST") {
                const nextCode = generatePublicCode();
                await env.DB.prepare(
                    "UPDATE tags SET public_code = ?1, revoked_at = NULL WHERE id = ?2",
                )
                    .bind(nextCode, tagId)
                    .run();
                const updated = await env.DB.prepare(
                    "SELECT * FROM tags WHERE id = ?1",
                )
                    .bind(tagId)
                    .first<TagRow>();
                return jsonResponse({
                    tag: updated ? mapTagRow(updated) : null,
                });
            }

            if (!subResource && method === "PATCH") {
                const patch = (await request.json()) as {
                    label?: string;
                    itemType?: ItemCategory;
                    contactConfig?: ContactConfig;
                    lostMode?: boolean;
                    lostNote?: string | null;
                    revoke?: boolean;
                };

                const nextLabel = patch.label?.trim() ?? tagRow.label;
                const nextType = patch.itemType ?? tagRow.item_type;
                const nextContact = patch.contactConfig
                    ? JSON.stringify(patch.contactConfig)
                    : tagRow.contact_methods;
                const nextRelay = patch.contactConfig
                    ? patch.contactConfig.relayMode
                        ? 1
                        : 0
                    : tagRow.relay_mode;
                const nextLost =
                    typeof patch.lostMode === "boolean"
                        ? patch.lostMode
                            ? 1
                            : 0
                        : tagRow.lost_mode;
                const nextLostNote =
                    patch.lostNote !== undefined
                        ? patch.lostNote
                        : tagRow.lost_note;
                const nextRevokedAt =
                    patch.revoke === true
                        ? new Date().toISOString()
                        : patch.revoke === false
                          ? null
                          : tagRow.revoked_at;

                await env.DB.prepare(
                    `UPDATE tags
           SET label = ?1, item_type = ?2, contact_methods = ?3,
               relay_mode = ?4, lost_mode = ?5, lost_note = ?6, revoked_at = ?7
           WHERE id = ?8`,
                )
                    .bind(
                        nextLabel,
                        nextType,
                        nextContact,
                        nextRelay,
                        nextLost,
                        nextLostNote,
                        nextRevokedAt,
                        tagId,
                    )
                    .run();

                const updated = await env.DB.prepare(
                    `SELECT
             t.*,
             (SELECT COUNT(*) FROM scan_events s WHERE s.tag_id = t.id) AS scan_count,
             (SELECT MAX(s.scanned_at) FROM scan_events s WHERE s.tag_id = t.id) AS last_scanned_at,
             (SELECT COUNT(*) FROM messages m WHERE m.tag_id = t.id AND m.read_at IS NULL) AS unread_message_count
           FROM tags t WHERE t.id = ?1`,
                )
                    .bind(tagId)
                    .first<TagRow>();

                return jsonResponse({
                    tag: updated ? mapTagRow(updated) : null,
                });
            }

            if (!subResource && method === "DELETE") {
                await env.DB.prepare("DELETE FROM tags WHERE id = ?1")
                    .bind(tagId)
                    .run();
                return jsonResponse({ deleted: true });
            }
        }

        // 6. Public QR Finder Endpoints: /api/t/:code, /api/t/:code/reveal, /api/t/:code/message
        if (segments[0] === "t" && segments.length >= 2) {
            const code = segments[1].toUpperCase().trim();
            const action = segments[2];

            const allowedIp = await checkRateLimit(
                env.DB,
                `tag_lookup_ip:${ipHash}`,
                45,
                300,
            );
            const allowedCode = await checkRateLimit(
                env.DB,
                `tag_lookup_code:${code}`,
                90,
                300,
            );
            if (!allowedIp || !allowedCode) {
                return errorResponse(
                    "Too many scans right now. Please wait a moment.",
                    429,
                    "RATE_LIMITED",
                );
            }

            const tagRow = await env.DB.prepare(
                "SELECT * FROM tags WHERE public_code = ?1",
            )
                .bind(code)
                .first<TagRow>();

            if (!tagRow) {
                return errorResponse(
                    "Tag code not found.",
                    404,
                    "TAG_NOT_FOUND",
                );
            }

            const contactConfig = safeParseJson<ContactConfig>(
                tagRow.contact_methods,
                { relayMode: true, methods: [] },
            );
            const visibleMethods = (contactConfig.methods ?? []).filter(
                (m) => m.visible && m.value.trim().length > 0,
            );

            if (!action && method === "GET") {
                // Log scan event unless ?preview=1 is passed
                if (
                    url.searchParams.get("preview") !== "1" &&
                    !tagRow.revoked_at
                ) {
                    const uaHash = await sha256Hex(
                        request.headers.get("User-Agent") ?? "unknown",
                    );
                    await env.DB.prepare(
                        "INSERT INTO scan_events (id, tag_id, scanned_at, approx_location, user_agent_hash) VALUES (?1, ?2, ?3, NULL, ?4)",
                    )
                        .bind(
                            `scan-${crypto.randomUUID().slice(0, 12)}`,
                            tagRow.id,
                            new Date().toISOString(),
                            uaHash,
                        )
                        .run();
                }

                const view: PublicTagView = {
                    publicCode: tagRow.public_code,
                    label: tagRow.label,
                    itemType: tagRow.item_type,
                    photoUrl: tagRow.photo_key
                        ? `/api/media/${encodeURIComponent(tagRow.photo_key)}`
                        : null,
                    relayMode: Boolean(tagRow.relay_mode),
                    lostMode: Boolean(tagRow.lost_mode),
                    lostNote: tagRow.lost_note,
                    dropOffHub: contactConfig.dropOffHub,
                    visibleMethodsCount: visibleMethods.length,
                    isRevoked: Boolean(tagRow.revoked_at),
                };

                return jsonResponse({ tag: view });
            }

            if (action === "reveal" && method === "POST") {
                if (tagRow.revoked_at) {
                    return errorResponse(
                        "This tag has been revoked by its owner.",
                        410,
                    );
                }
                const { turnstileToken } = (await request.json()) as {
                    turnstileToken?: string;
                };
                const turnstileOk = await verifyTurnstile(
                    env.TURNSTILE_SECRET_KEY,
                    turnstileToken,
                    clientIp,
                );
                if (!turnstileOk) {
                    return errorResponse(
                        "Please complete the verification check to reveal owner contact options.",
                        403,
                        "TURNSTILE_FAILED",
                    );
                }

                return jsonResponse({
                    visibleMethods,
                    dropOffHub: contactConfig.dropOffHub,
                });
            }

            if (action === "message" && method === "POST") {
                if (tagRow.revoked_at) {
                    return errorResponse("This tag has been revoked.", 410);
                }

                const msgAllowed = await checkRateLimit(
                    env.DB,
                    `tag_msg:${ipHash}:${code}`,
                    5,
                    3600,
                );
                if (!msgAllowed) {
                    return errorResponse(
                        "Message limit reached for this item. Please try again later.",
                        429,
                    );
                }

                const payload = (await request.json()) as {
                    body?: string;
                    finderContact?: string;
                    foundAtHub?: string;
                    approxLocation?: { lat: number; lng: number } | null;
                    turnstileToken?: string;
                };

                const turnstileOk = await verifyTurnstile(
                    env.TURNSTILE_SECRET_KEY,
                    payload.turnstileToken,
                    clientIp,
                );
                if (!turnstileOk) {
                    return errorResponse(
                        "Human verification failed.",
                        403,
                        "TURNSTILE_FAILED",
                    );
                }

                const text = payload.body?.trim() ?? "";
                if (text.length < 3 || text.length > 800) {
                    return errorResponse(
                        "Message must be between 3 and 800 characters.",
                    );
                }
                if (containsProfanityOrSpam(text)) {
                    return errorResponse(
                        "Message blocked due to spam or inappropriate words.",
                    );
                }

                const msgId = `msg-${crypto.randomUUID().slice(0, 12)}`;
                const nowIso = new Date().toISOString();
                const approxLocJson = payload.approxLocation
                    ? JSON.stringify({
                          lat: Number(payload.approxLocation.lat),
                          lng: Number(payload.approxLocation.lng),
                      })
                    : null;

                await env.DB.prepare(
                    `INSERT INTO messages (
            id, tag_id, body, finder_contact, found_at_hub, approx_location, created_at
          ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
                )
                    .bind(
                        msgId,
                        tagRow.id,
                        text,
                        payload.finderContact?.trim() || null,
                        payload.foundAtHub?.trim() || null,
                        approxLocJson,
                        nowIso,
                    )
                    .run();

                if (approxLocJson) {
                    const uaHash = await sha256Hex(
                        request.headers.get("User-Agent") ?? "unknown",
                    );
                    await env.DB.prepare(
                        "INSERT INTO scan_events (id, tag_id, scanned_at, approx_location, user_agent_hash) VALUES (?1, ?2, ?3, ?4, ?5)",
                    )
                        .bind(
                            `scan-${crypto.randomUUID().slice(0, 12)}`,
                            tagRow.id,
                            nowIso,
                            approxLocJson,
                            uaHash,
                        )
                        .run();
                }

                return jsonResponse({ sent: true, id: msgId }, 201);
            }
        }

        // 7. Cross-device Capability Key Recovery: GET /api/key/restore/:key
        if (
            segments[0] === "key" &&
            segments[1] === "restore" &&
            segments[2] &&
            method === "GET"
        ) {
            const rawKey = segments[2].trim();
            if (rawKey.length < 16) {
                return errorResponse("Invalid capability key format.", 400);
            }
            const keyHash = await sha256Hex(rawKey);

            const tagMatch = await env.DB.prepare(
                "SELECT id, label, public_code FROM tags WHERE manage_key_hash = ?1",
            )
                .bind(keyHash)
                .first<{ id: string; label: string; public_code: string }>();

            if (tagMatch) {
                return jsonResponse({
                    kind: "tag",
                    id: tagMatch.id,
                    label: tagMatch.label,
                    publicCode: tagMatch.public_code,
                });
            }

            const postMatch = await env.DB.prepare(
                "SELECT id, title, type FROM posts WHERE edit_key_hash = ?1",
            )
                .bind(keyHash)
                .first<{ id: string; title: string; type: PostType }>();

            if (postMatch) {
                return jsonResponse({
                    kind: "post",
                    id: postMatch.id,
                    label: postMatch.title,
                    postType: postMatch.type,
                });
            }

            return errorResponse(
                "No active tag or post matches this capability key.",
                404,
                "KEY_NOT_FOUND",
            );
        }

        // 8. R2 Image Upload & Media Serving: POST /api/upload & GET /api/media/:key
        if (segments[0] === "upload" && method === "POST") {
            const allowed = await checkRateLimit(
                env.DB,
                `upload:${ipHash}`,
                20,
                3600,
            );
            if (!allowed) {
                return errorResponse("Upload rate limit exceeded.", 429);
            }

            const formData = await request.formData();
            const file = formData.get("file");
            if (!file || typeof file === "string") {
                return errorResponse("Missing image file in form data.");
            }

            const blob = file as File;
            if (!ALLOWED_IMAGE_TYPES.has(blob.type)) {
                return errorResponse(
                    "Only JPEG, PNG, WebP, or GIF images are allowed.",
                );
            }
            if (blob.size > MAX_UPLOAD_BYTES) {
                return errorResponse("Image must be 5MB or smaller.");
            }

            const ext = blob.type.split("/")[1] || "jpg";
            const objectKey = `items/${new Date().toISOString().slice(0, 10)}-${crypto.randomUUID()}.${ext}`;

            if (!env.BUCKET) {
                return errorResponse(
                    "R2 BUCKET binding is not configured.",
                    500,
                    "R2_MISSING",
                );
            }

            await env.BUCKET.put(objectKey, await blob.arrayBuffer(), {
                httpMetadata: { contentType: blob.type },
            });

            return jsonResponse(
                {
                    key: objectKey,
                    url: `/api/media/${encodeURIComponent(objectKey)}`,
                },
                201,
            );
        }

        if (
            segments[0] === "media" &&
            segments.length >= 2 &&
            method === "GET"
        ) {
            if (!env.BUCKET) {
                return errorResponse("R2 BUCKET not bound", 404);
            }
            const key = decodeURIComponent(segments.slice(1).join("/"));
            const object = await env.BUCKET.get(key);
            if (!object) {
                return errorResponse("Image not found", 404);
            }
            const headers = new Headers();
            object.writeHttpMetadata(headers);
            headers.set("Cache-Control", "public, max-age=31536000, immutable");
            return new Response(object.body, { headers });
        }

        // 9. Abuse Reporting: POST /api/report
        if (segments[0] === "report" && method === "POST") {
            const allowed = await checkRateLimit(
                env.DB,
                `report:${ipHash}`,
                10,
                3600,
            );
            if (!allowed) {
                return errorResponse(
                    "Too many reports submitted recently.",
                    429,
                );
            }
            const body = (await request.json()) as ReportPayload;
            if (
                (body.targetType !== "post" && body.targetType !== "tag") ||
                !body.targetId ||
                !body.reason?.trim()
            ) {
                return errorResponse("Invalid report payload.");
            }

            await env.DB.prepare(
                `INSERT INTO reports (id, target_type, target_id, reason, details, reporter_ip_hash, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
            )
                .bind(
                    `rep-${crypto.randomUUID().slice(0, 12)}`,
                    body.targetType,
                    body.targetId,
                    body.reason.trim().slice(0, 120),
                    body.details?.trim().slice(0, 500) || null,
                    ipHash,
                    new Date().toISOString(),
                )
                .run();

            return jsonResponse({ reported: true }, 201);
        }

        // 10. Admin Moderation Endpoints: /api/admin/*
        if (segments[0] === "admin") {
            const adminSub = segments[1];

            if (adminSub === "login" && method === "POST") {
                const allowed = await checkRateLimit(
                    env.DB,
                    `admin_login:${ipHash}`,
                    5,
                    900,
                );
                if (!allowed) {
                    return errorResponse(
                        "Too many admin login attempts. Wait 15 minutes.",
                        429,
                    );
                }
                if (!env.ADMIN_PASSWORD) {
                    return errorResponse(
                        "ADMIN_PASSWORD is not configured on this environment.",
                        503,
                    );
                }
                const { password } = (await request.json()) as {
                    password?: string;
                };
                const inputHash = await sha256Hex(password ?? "");
                const targetHash = await sha256Hex(env.ADMIN_PASSWORD);

                if (!constantTimeEqualHex(inputHash, targetHash)) {
                    return errorResponse("Invalid admin password.", 401);
                }

                const sessionToken = await sha256Hex(
                    `admin-session:${env.ADMIN_PASSWORD}`,
                );
                return jsonResponse({ authenticated: true }, 200, {
                    "Set-Cookie": `findr_admin_session=${sessionToken}; HttpOnly; Path=/; SameSite=Strict; Max-Age=86400`,
                });
            }

            if (adminSub === "logout" && method === "POST") {
                return jsonResponse({ authenticated: false }, 200, {
                    "Set-Cookie":
                        "findr_admin_session=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0",
                });
            }

            if (!(await isAdminAuthorized(request, env))) {
                return errorResponse("Admin authentication required.", 401);
            }

            if (adminSub === "overview" && method === "GET") {
                const { results: reports } = await env.DB.prepare(
                    "SELECT * FROM reports WHERE resolved_at IS NULL ORDER BY created_at DESC LIMIT 50",
                ).all();
                const { results: recentPosts } = await env.DB.prepare(
                    "SELECT id, type, title, status, created_at FROM posts ORDER BY created_at DESC LIMIT 30",
                ).all();
                const { results: recentTags } = await env.DB.prepare(
                    "SELECT id, public_code, label, item_type, lost_mode, revoked_at, created_at FROM tags ORDER BY created_at DESC LIMIT 30",
                ).all();
                const campusCode = await getActiveCampusCode(env);

                return jsonResponse({
                    reports,
                    recentPosts,
                    recentTags,
                    campusCode,
                });
            }

            if (adminSub === "campus-code" && method === "POST") {
                const { campusCode } = (await request.json()) as {
                    campusCode?: string;
                };
                const clean = (campusCode ?? "").trim();
                await env.DB.prepare(
                    `INSERT INTO app_settings (key, value, updated_at)
           VALUES ('campus_code', ?1, ?2)
           ON CONFLICT(key) DO UPDATE SET value = ?1, updated_at = ?2`,
                )
                    .bind(clean, new Date().toISOString())
                    .run();
                return jsonResponse({ campusCode: clean || null });
            }

            if (adminSub === "posts" && segments[2] && method === "DELETE") {
                await env.DB.prepare("DELETE FROM posts WHERE id = ?1")
                    .bind(segments[2])
                    .run();
                await env.DB.prepare(
                    "UPDATE reports SET resolved_at = ?1 WHERE target_type = 'post' AND target_id = ?2",
                )
                    .bind(new Date().toISOString(), segments[2])
                    .run();
                return jsonResponse({ deleted: true });
            }

            if (
                adminSub === "tags" &&
                segments[2] &&
                segments[3] === "revoke" &&
                method === "POST"
            ) {
                const nowIso = new Date().toISOString();
                await env.DB.prepare(
                    "UPDATE tags SET revoked_at = ?1 WHERE id = ?2",
                )
                    .bind(nowIso, segments[2])
                    .run();
                await env.DB.prepare(
                    "UPDATE reports SET resolved_at = ?1 WHERE target_type = 'tag' AND target_id = ?2",
                )
                    .bind(nowIso, segments[2])
                    .run();
                return jsonResponse({ revoked: true });
            }
        }

        return errorResponse("API route not found.", 404, "ROUTE_NOT_FOUND");
    } catch (err) {
        const message =
            err instanceof Error ? err.message : "Internal server error";
        return errorResponse(message, 500, "INTERNAL_ERROR");
    }
};
