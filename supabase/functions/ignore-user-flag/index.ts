
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      process.env.SUPABASE_URL ?? '',
      process.env.SUPABASE_ANON_KEY ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        throw new Error('User not found. You must be logged in to perform this action.');
    }

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL ?? '',
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
    );

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

    const { user_id } = await req.json();

    if (!user_id) {
        throw new Error('Invalid parameters. `user_id` is required.');
    }

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ 
          flag_ignored_at: new Date().toISOString()
       })
      .eq('id', user_id);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ message: 'User flag ignored successfully' }), {
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