import { corsHeaders, generateAccessCode } from '../_shared/util.ts';
import { verifyUser, authorizeRole, getAdminClient } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  // CORS Stuff
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  
  try {
    // Verify User Token
    const user = await verifyUser(req);

    // Verify User is an Instructor
    authorizeRole(user.role, 'instructor');

    // Parse Request Body
    const { sceneId } = await req.json();
    if (!sceneId) throw new Error("sceneId is required.");

    // Get Admin Client for Admin Privileges
    const supabaseAdmin = getAdminClient();

    // Check if an access code exists for this scene
    const { data: existingAccess, error: _ } = await supabaseAdmin
      .from('scene_access')
      .select('access_code')
      .eq('scene_id', sceneId)
      .maybeSingle();

    // If the code exists, return the access code
    if (existingAccess) {
      return new Response(JSON.stringify({
        sceneId: sceneId,
        accessCode: existingAccess.access_code,
        qrPayload: `https://vlab.edu/access/${existingAccess.access_code}` // Placeholder
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // If no code exists, check ownership then generate
    const { data: scene, error: sceneError } = await supabaseAdmin
      .from('scene')
      .select('scene_id')
      .eq('scene_id', sceneId)
      .eq('owner_id', user.id)
      .single();

    if (sceneError || !scene) return new Response('Unauthorized', { status: 404, headers: corsHeaders });

    // Generate an access code for Scene
    const accessCode = generateAccessCode();
    
    // Insert Scene Access Data to Database
    const { error: insertError } = await supabaseAdmin
      .from('scene_access')
      .insert({
        scene_id: sceneId,
        access_code: accessCode,
        expires_at: null 
      });
    
    if (insertError) throw insertError;

    // Success Response
    return new Response(JSON.stringify({
      sceneId: sceneId,
      accessCode: accessCode,
      qrPayload: `https://vlab.edu/access/${accessCode}`
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err instanceof Error) ? err.message : "An unknown error occurred." }), { status: 500, headers: { ...corsHeaders } });
  }
});