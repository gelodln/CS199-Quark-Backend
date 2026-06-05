import { corsHeaders } from '../_shared/util.ts';
import { verifyUser, getAdminClient } from '../_shared/auth.ts';
import type { SceneDataJson } from "../_shared/scene-data.ts";

/**
 * POST JSON body:
 * `{ "sceneId": "<uuid>", "sceneData": { ... } }`
 * Optional: `title`, `description` (updates same-named columns if provided).
 *
 * Only the **scene owner** (`owner_id`) may save. Learners with collection access can read via `get-scene-state` but cannot overwrite.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const user = await verifyUser(req);
    const supabase = getAdminClient();

    let payload: SaveBody;
    try {
      payload = (await req.json()) as SaveBody;
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sceneId = payload.sceneId;
    if (!sceneId || typeof sceneId !== "string") {
      return new Response(JSON.stringify({ error: "Missing sceneId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payload.sceneData === undefined || payload.sceneData === null) {
      return new Response(JSON.stringify({ error: "Missing sceneData" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: scene, error: fetchError } = await supabase
      .from("scene")
      .select("scene_id, owner_id")
      .eq("scene_id", sceneId)
      .maybeSingle();

    if (fetchError) {
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!scene) {
      return new Response(JSON.stringify({ error: "Scene not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (scene.owner_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden: only owner can save" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const update: Record<string, unknown> = {
      scene_data: payload.sceneData as SceneDataJson,
      updated_at: new Date().toISOString(),
    };

    if (typeof payload.title === "string") update.title = payload.title;
    if (typeof payload.description === "string") update.description = payload.description;

    const { error: updateError } = await supabase
      .from("scene")
      .update(update)
      .eq("scene_id", sceneId);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, sceneId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message === "Unauthorized" ? 401 : 400;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

interface SaveBody {
  sceneId: string;
  sceneData: SceneDataJson;
  title?: string;
  description?: string;
}
