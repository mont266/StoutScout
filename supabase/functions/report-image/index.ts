
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

    const { rating_id, reason } = await req.json();

    if (!rating_id || !reason) {
        throw new Error('Invalid parameters. Both rating_id and reason are required.');
    }
    
    // Insert a new record into the reported_images table.
    // RLS policy ensures the reporter_id is the same as the authenticated user.
    const { error } = await supabaseClient
      .from('reported_images')
      .insert({
        rating_id: rating_id,
        reporter_id: user.id,
        reason: reason
      });

    if (error) throw error;

    return new Response(JSON.stringify({ message: 'Image reported successfully' }), {
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