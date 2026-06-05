import { corsHeaders } from '../_shared/util.ts';
import { verifyUser, getAdminClient } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  // CORS Stuff
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Verify User
    const user = await verifyUser(req);
    const supabase = getAdminClient();

    // Query the junction table and join with SCENE to get metadata
    const { data, error } = await supabase
      .from('learner_collection')
      .select(`
        scene:scene_id (
          scene_id,
          title,
          topic_id,
          description
        )
      `)
      .eq('learner_id', user.id);

    if (error) return new Response(error.message, { status: 500 });

    // Success Response
    const items = data.map((record: any) => {
      const s = record.scene;
      return {
        sceneId: s.scene_id,
        topicId: s.topic_id,
        title: s.title,
        description: s.description,
      };
    });
    return new Response(JSON.stringify({ items }), {headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 400, 
      headers: corsHeaders 
    });
  }
});