import { corsHeaders } from '../_shared/util.ts';
import { verifyUser, authorizeRole, getAdminClient } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  // CORS Stuff
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Verify User Token
    const user = await verifyUser(req);

    authorizeRole(user.role, 'instructor');

    // Parse Request Body
    const { sceneId } = await req.json();

    if (!sceneId) {
      return new Response(JSON.stringify({ error: "sceneId is required" }), { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Get Admin Client for Admin Privileges
    const supabaseAdmin = getAdminClient();

    // Delete Scene
    const { error } = await supabaseAdmin
      .from('scene')
      .delete()
      .eq('scene_id', sceneId)
      .eq('owner_id', user.id);

    if (error) throw error;
    
    // Success Response
    return new Response(JSON.stringify({ 
      success: true, 
      message: `Scene ${sceneId} deleted successfully.` 
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 
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