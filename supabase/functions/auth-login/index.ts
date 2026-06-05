import { corsHeaders } from '../_shared/util.ts';
import { getAdminClient } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  // CORS Stuff
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  
  try {
    // Parse Request Body
    const { email, password } = await req.json();

    // Get Admin Client for Admin Privileges
    const supabaseAdmin = getAdminClient();
    
    // Sign in the User in Supabase
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // Success Response
    const response = {
      accessToken: data.session?.access_token,
      refreshToken: data.session?.refresh_token,
      user: { 
        id: data.user?.id, 
        role: data.user?.user_metadata.role 
      }
    };

    return new Response(JSON.stringify(response), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err instanceof Error) ? err.message : "An unknown error occurred." }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});