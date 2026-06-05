import { corsHeaders } from '../_shared/util.ts';
import { verifyUser, getAdminClient } from '../_shared/auth.ts';
import type { SceneDataJson } from "../_shared/scene-data.ts";

/**
 * GET ?scene_id=<uuid>
 * Returns scene row metadata + `scene_data` JSON for Unity to deserialize.
 *
 * Auth: owner OR published level OR learner has scene in `learner_collection`.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const user = await verifyUser(req);
    const supabase = getAdminClient();

    const url = new URL(req.url);
    const sceneId = url.searchParams.get("scene_id");
    if (!sceneId) {
      return new Response(JSON.stringify({ error: "Missing scene_id query param" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: scene, error: sceneError } = await supabase
      .from("scene")
      .select(
        "scene_id, owner_id, topic_id, scene_type, title, description, scene_data, is_published, created_at, updated_at",
      )
      .eq("scene_id", sceneId)
      .maybeSingle();

    if (sceneError) {
      return new Response(JSON.stringify({ error: sceneError.message }), {
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

    const canAccess = await canAccessScene(supabase, user.id, scene);
    if (!canAccess) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sceneData = scene.scene_data as SceneDataJson;

    const body = {
      sceneId: scene.scene_id,
      topicId: scene.topic_id,
      sceneType: scene.scene_type,
      title: scene.title,
      description: scene.description,
      isPublished: scene.is_published,
      createdAt: scene.created_at,
      updatedAt: scene.updated_at,
      sceneData,
    };

    return new Response(JSON.stringify(body), {
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

// deno-lint-ignore no-explicit-any
async function canAccessScene(supabase: any, userId: string, scene: any): Promise<boolean> {
  if (scene.owner_id === userId) return true;
  if (scene.scene_type === "level" && scene.is_published === true) return true;

  const { data: collection } = await supabase
    .from("learner_collection")
    .select("scene_id")
    .eq("learner_id", userId)
    .eq("scene_id", scene.scene_id)
    .maybeSingle();

  return !!collection;
}
