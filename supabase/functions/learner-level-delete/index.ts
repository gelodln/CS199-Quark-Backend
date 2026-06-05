import { corsHeaders } from '../_shared/util.ts';
import { verifyUser, getAdminClient } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  // CORS Stuff
  if (req.method === 'OPTIONS') { return new Response('ok', { headers: corsHeaders }); }

  try {
    // Verify User
    const user = await verifyUser(req);

    // 3. Parse Body
    const { sceneId } = await req.json();
    if (!sceneId) {
      return new Response(JSON.stringify({ error: "sceneId is required." }), { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    const supabaseAdmin = getAdminClient();

    // Delete the record from database
    const { error: deleteError } = await supabaseAdmin
      .from('learner_collection')
      .delete()
      .eq('scene_id', sceneId)
      .eq('learner_id', user.id);

    if (deleteError) throw deleteError;

    // Success Response
    return new Response(JSON.stringify({ 
      message: "Level removed from collection.",
      sceneId: sceneId 
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (err) {
    return new Response(JSON.stringify({ 
      error: (err instanceof Error) ? err.message : "An unknown error occurred." 
    }), { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});