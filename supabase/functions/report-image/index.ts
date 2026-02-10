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
      return new Response(JSON.stringify({ error: 'Authentication required: Missing Authorization header.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt)
    if (userError || !user) {
      return new Response(JSON.stringify({ error: `Authentication failed: ${userError?.message || 'User not found.'}` }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { rating_id, reason } = await req.json()
    if (!rating_id || !reason) {
        return new Response(JSON.stringify({ error: 'Invalid request: Both rating_id and reason are required.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: rating, error: ratingError } = await supabaseAdmin
      .from('ratings')
      .select('user_id')
      .eq('id', rating_id)
      .single()

    if (ratingError || !rating) {
        return new Response(JSON.stringify({ error: 'Rating not found.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (rating.user_id === user.id) {
        return new Response(JSON.stringify({ error: 'You cannot report your own rating.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { error: insertError } = await supabaseAdmin
        .from('reported_images')
        .insert({
            rating_id: rating_id,
            reporter_id: user.id,
            reason: reason,
        })
    
    if (insertError) {
        if (insertError.code === '23505') { // unique constraint violation
            return new Response(JSON.stringify({ error: 'You have already reported this image.' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        throw new Error(`Database error: ${insertError.message}`)
    }

    return new Response(JSON.stringify({ message: 'Image reported successfully' }), {
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