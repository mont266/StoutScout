
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle preflight requests for CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the Auth context of the logged-in user.
    const supabaseClient = createClient(
      process.env.SUPABASE_URL ?? '',
      process.env.SUPABASE_ANON_KEY ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Get the current user from the request's authorization header.
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        throw new Error('User not found. You must be logged in to perform this action.');
    }

    // Create a client with the service_role key to bypass RLS for admin checks.
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL ?? '',
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
    );

    // Verify that the calling user is a developer/admin.
    const { data: adminProfile, error: adminError } = await supabaseAdmin
      .from('profiles')
      .select('is_developer')
      .eq('id', user.id)
      .single();

    if (adminError || !adminProfile?.is_developer) {
      return new Response(JSON.stringify({ error: 'Permission denied. User is not an admin.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    const { user_id, reason } = await req.json();

    if (!user_id || !reason) {
        throw new Error('Invalid parameters. Both user_id and reason are required.');
    }
    
    // Admins cannot ban themselves.
    if (user.id === user_id) {
        throw new Error('Admins cannot ban themselves.');
    }

    // Update the target user's profile to set the ban status.
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ 
          is_banned: true,
          ban_reason: reason,
          banned_at: new Date().toISOString()
       })
      .eq('id', user_id);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ message: 'User banned successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})