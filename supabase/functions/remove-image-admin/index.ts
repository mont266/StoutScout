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

    const { data: adminProfile, error: adminError } = await supabaseAdmin
      .from('profiles')
      .select('is_developer')
      .eq('id', user.id)
      .single()

    if (adminError || !adminProfile?.is_developer) {
      return new Response(JSON.stringify({ error: 'Permission denied: Admin privileges required.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { rating_id } = await req.json()
    if (!rating_id) {
      return new Response(JSON.stringify({ error: 'Invalid request: `rating_id` is required.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    
    const { data: ratingData, error: ratingError } = await supabaseAdmin
      .from('ratings')
      .select('image_url, user_id')
      .eq('id', rating_id)
      .single()

    if (ratingError) throw new Error(`Database query failed: ${ratingError.message}`)
    if (!ratingData) throw new Error('Rating not found.')
    if (!ratingData.image_url) throw new Error('The selected rating does not have an image to remove.')
    
    // 1. Delete image from storage
    const imagePath = new URL(ratingData.image_url).pathname.split('/pint-images/')[1]
    if (imagePath) {
      await supabaseAdmin.storage.from('pint-images').remove([imagePath])
    }

    // 2. Set image_url in ratings table to null
    await supabaseAdmin
      .from('ratings')
      .update({ image_url: null })
      .eq('id', rating_id)

    // 3. Increment removed_image_count on the uploader's profile
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('removed_image_count')
      .eq('id', ratingData.user_id)
      .single()

    if (profileError) {
      console.error(`Could not fetch profile for count increment: ${profileError.message}`)
    } else {
      const newCount = (profileData.removed_image_count || 0) + 1
      await supabaseAdmin
        .from('profiles')
        .update({ removed_image_count: newCount })
        .eq('id', ratingData.user_id)
    }

    return new Response(JSON.stringify({ message: 'Image removed successfully by admin' }), {
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
