import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      throw new Error('Server configuration error: Missing Supabase credentials.')
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey)

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentication required: Missing Authorization header.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }
    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt)
    if (userError || !user) {
      return new Response(JSON.stringify({ error: `Authentication failed: ${userError?.message || 'User not found.'}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const { data: adminProfile, error: adminError } = await supabaseAdmin
      .from('profiles')
      .select('is_developer')
      .eq('id', user.id)
      .single()

    if (adminError || !adminProfile?.is_developer) {
      return new Response(JSON.stringify({ error: 'Permission denied: Admin privileges required.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    const { user_id, reason } = await req.json()
    if (!user_id || !reason) {
      return new Response(JSON.stringify({ error: 'Invalid request: `user_id` and `reason` are required.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        is_banned: true,
        ban_reason: reason,
        banned_at: new Date().toISOString(),
      })
      .eq('id', user_id)

    if (updateError) {
      throw new Error(`Database error: ${updateError.message}`)
    }

    return new Response(JSON.stringify({ message: 'User banned successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Edge Function Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
