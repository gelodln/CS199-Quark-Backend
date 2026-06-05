import { corsHeaders } from '../_shared/util.ts';
import { getAdminClient, verifyUser } from '../_shared/auth.ts';

// URL: functions/v1/scenes-load-by-code?accessCode=[access-code]
Deno.serve(async (req) => {
  // CORS Stuff
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Authenticate User
    const user = await verifyUser(req);
    
    // Parse URL to get Access Code
    const url = new URL(req.url);
    const accessCode = url.searchParams.get('accessCode');
    if (!accessCode) throw new Error("Access code is required.");
      
    const supabaseAdmin = getAdminClient();

    // Get Scene Data
    const { data, error } = await supabaseAdmin
      .from('scene_access')
      .select(`
        expires_at,
        scene:scene_id (
          scene_id, scene_type, title, description, scene_data,
          topic_id,
          scene_criterion (criterion_type, target_object_id, secondary_object_id)
        )
      `)
      .eq('access_code', accessCode)
      .single();
    
    if (error || !data) return new Response('Not Found', { status: 404, headers: corsHeaders });
    
    // Check if the code has expired (if an expiry was set)
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
        return new Response('Expired', { status: 403, headers: corsHeaders });
    }
   
    const scene = data.scene as any;

    // Save to Learner Collection
    const { error: collectError } = await supabaseAdmin
      .from('learner_collection')
      .upsert({
        learner_id: user.id,
        scene_id: scene.scene_id
      });

    if (collectError) throw collectError;

    // Success Response
    const result = {
      sceneId: scene.scene_id,
      sceneType: scene.scene_type,
      topicId: scene.topic_id, 
      title: scene.title,
      description: scene.description,
      sceneData: scene.scene_data,
      criteria: scene.scene_criterion.map((c: any) => ({
        criterionType: c.criterion_type,
        targetObjectId: c.target_object_id,
        secondaryObjectId: c.secondary_object_id
      }))
    };

    return new Response(JSON.stringify(result), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (err) {
    return new Response((err instanceof Error) ? err.message : "An unknown error occurred.", { status: 400, headers: corsHeaders });
  }
});