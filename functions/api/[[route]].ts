/// <reference types="@cloudflare/workers-types" />
interface Env {
    DB: D1Database;
}

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json",
};

async function sha256(input: string): Promise<string> {
    const data = new TextEncoder().encode(input);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

export const onRequest: PagesFunction<Env> = async (context) => {
    const { request, env } = context;
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/api/, "");

    if (request.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        // 1. GET /api/posts - List all Campus Wall posts + attached claims
        if (path === "/posts" && request.method === "GET") {
            const { results: posts } = await env.DB.prepare(
                `SELECT * FROM wall_posts ORDER BY datetime(created_at) DESC`,
            ).all();

            const { results: claims } = await env.DB.prepare(
                `SELECT * FROM verification_claims ORDER BY datetime(created_at) DESC`,
            ).all();

            const hydrated = posts.map((p: Record<string, unknown>) => ({
                ...p,
                is_anonymous: Boolean(p.is_anonymous),
                contact_config: JSON.parse(
                    (p.contact_config_json as string) || "{}",
                ),
                claims: claims.filter(
                    (c: Record<string, unknown>) => c.post_id === p.id,
                ),
            }));

            return new Response(JSON.stringify({ posts: hydrated }), {
                headers: corsHeaders,
            });
        }

        // 2. POST /api/posts - Create new Lost or Found Wall Post
        if (path === "/posts" && request.method === "POST") {
            const body = (await request.json()) as Record<string, unknown>;
            const id =
                (body.id as string) ||
                `post-${crypto.randomUUID().slice(0, 8)}`;
            const passcodeRaw = body.edit_passcode as string | undefined;
            const passcodeHash = passcodeRaw ? await sha256(passcodeRaw) : null;

            await env.DB.prepare(
                `INSERT INTO wall_posts (
                id, user_id, is_anonymous, poster_name, poster_role, poster_dept,
                edit_passcode_hash, linked_item_id, post_type, title, description,
                category, campus_hub, room_detail, lat, lng, verification_question,
                sensitive_pickup_note, contact_config_json, status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
            )
                .bind(
                    id,
                    body.user_id || null,
                    body.is_anonymous ? 1 : 0,
                    body.is_anonymous
                        ? "Anonymous Student"
                        : body.poster_name,
                    body.poster_role || "student",
                    body.is_anonymous
                        ? "Campus Community"
                        : body.poster_dept || "",
                    passcodeHash,
                    body.linked_item_id || null,
                    body.post_type,
                    body.title,
                    body.description,
                    body.category,
                    body.campus_hub,
                    body.room_detail || "",
                    body.lat,
                    body.lng,
                    body.verification_question || null,
                    body.sensitive_pickup_note || null,
                    JSON.stringify(body.contact_config || {}),
                    body.status || "open",
                )
                .run();

            return new Response(JSON.stringify({ ok: true, id }), {
                status: 201,
                headers: corsHeaders,
            });
        }

        // 3. PATCH /api/posts/:id/status - Update status (with optional anonymous passcode verification)
        if (
            path.startsWith("/posts/") &&
            path.endsWith("/status") &&
            request.method === "PATCH"
        ) {
            const postId = path.split("/")[2];
            const body = (await request.json()) as {
                status: string;
                passcode?: string;
            };

            if (body.passcode) {
                const post = await env.DB.prepare(
                    `SELECT edit_passcode_hash FROM wall_posts WHERE id = ?`,
                )
                    .bind(postId)
                    .first() as { edit_passcode_hash: string | null } | null;
                const hashed = await sha256(body.passcode);
                if (
                    post?.edit_passcode_hash &&
                    post.edit_passcode_hash !== hashed
                ) {
                    return new Response(
                        JSON.stringify({ error: "Invalid Post Passcode" }),
                        {
                            status: 403,
                            headers: corsHeaders,
                        },
                    );
                }
            }

            await env.DB.prepare(
                `UPDATE wall_posts SET status = ? WHERE id = ?`,
            )
                .bind(body.status, postId)
                .run();

            return new Response(JSON.stringify({ ok: true }), {
                headers: corsHeaders,
            });
        }

        // 4. POST /api/claims - Submit an Ownership Verification Claim for a Found Item
        if (path === "/claims" && request.method === "POST") {
            const body = (await request.json()) as Record<string, string>;
            const id = `claim-${crypto.randomUUID().slice(0, 8)}`;

            await env.DB.prepare(
                `INSERT INTO verification_claims (
          id, post_id, claimant_name, claimant_role, verification_answer, contact_info, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'))`,
            )
                .bind(
                    id,
                    body.post_id,
                    body.claimant_name,
                    body.claimant_role || "student",
                    body.verification_answer,
                    body.contact_info,
                )
                .run();

            await env.DB.prepare(
                `UPDATE wall_posts SET status = 'verifying' WHERE id = ? AND status = 'open'`,
            )
                .bind(body.post_id)
                .run();

            return new Response(JSON.stringify({ ok: true, id }), {
                status: 201,
                headers: corsHeaders,
            });
        }

        // 5. PATCH /api/claims/:id - Approve or Reject Ownership Claim
        if (path.startsWith("/claims/") && request.method === "PATCH") {
            const claimId = path.split("/")[2];
            const body = (await request.json()) as {
                status: "approved" | "rejected";
                post_id: string;
            };

            await env.DB.prepare(
                `UPDATE verification_claims SET status = ? WHERE id = ?`,
            )
                .bind(body.status, claimId)
                .run();

            if (body.status === "approved") {
                await env.DB.prepare(
                    `UPDATE wall_posts SET status = 'resolved' WHERE id = ?`,
                )
                    .bind(body.post_id)
                    .run();
            }

            return new Response(JSON.stringify({ ok: true }), {
                headers: corsHeaders,
            });
        }

        // 6. GET /api/items - Get registered QR items
        if (path === "/items" && request.method === "GET") {
            const { results } = await env.DB.prepare(
                `SELECT * FROM items ORDER BY datetime(created_at) DESC`,
            ).all();

            const hydrated = results.map((item: Record<string, unknown>) => ({
                ...item,
                contact_config: JSON.parse(
                    (item.contact_config_json as string) || "{}",
                ),
            }));

            return new Response(JSON.stringify({ items: hydrated }), {
                headers: corsHeaders,
            });
        }

        // 7. POST /api/items - Register new student QR gear item
        if (path === "/items" && request.method === "POST") {
            const body = (await request.json()) as Record<string, unknown>;
            const id =
                (body.id as string) ||
                `item-${crypto.randomUUID().slice(0, 8)}`;

            await env.DB.prepare(
                `INSERT INTO items (
          id, user_id, tag_code, name, category, status, custom_note,
          contact_config_json, meetup_hub, meetup_room, lat, lng, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
            )
                .bind(
                    id,
                    body.user_id,
                    body.tag_code,
                    body.name,
                    body.category,
                    body.status || "safe",
                    body.custom_note,
                    JSON.stringify(body.contact_config || {}),
                    body.meetup_hub || null,
                    body.meetup_room || null,
                    body.lat || null,
                    body.lng || null,
                )
                .run();

            return new Response(JSON.stringify({ ok: true, id }), {
                status: 201,
                headers: corsHeaders,
            });
        }

        // 8. GET & POST /api/messages - In-App Campus Chat
        if (path === "/messages" && request.method === "GET") {
            const postId = url.searchParams.get("postId");
            const itemId = url.searchParams.get("itemId");

            const query = postId
                ? env.DB.prepare(
                      `SELECT * FROM messages WHERE post_id = ? ORDER BY datetime(created_at) ASC`,
                  ).bind(postId)
                : env.DB.prepare(
                      `SELECT * FROM messages WHERE item_id = ? ORDER BY datetime(created_at) ASC`,
                  ).bind(itemId);

            const { results } = await query.all();
            return new Response(JSON.stringify({ messages: results }), {
                headers: corsHeaders,
            });
        }

        if (path === "/messages" && request.method === "POST") {
            const body = (await request.json()) as Record<string, unknown>;
            const id = `msg-${crypto.randomUUID().slice(0, 8)}`;

            await env.DB.prepare(
                `INSERT INTO messages (
          id, post_id, item_id, sender_name, sender_role, is_anonymous, content, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
            )
                .bind(
                    id,
                    body.post_id || null,
                    body.item_id || null,
                    body.is_anonymous ? "Anonymous Student" : body.sender_name,
                    body.sender_role || "student",
                    body.is_anonymous ? 1 : 0,
                    body.content,
                )
                .run();

            return new Response(JSON.stringify({ ok: true, id }), {
                status: 201,
                headers: corsHeaders,
            });
        }

        return new Response(JSON.stringify({ error: "Endpoint not found" }), {
            status: 404,
            headers: corsHeaders,
        });
    } catch (err) {
        return new Response(
            JSON.stringify({
                error: (err as Error).message || "Internal Server Error",
            }),
            { status: 500, headers: corsHeaders },
        );
    }
};
