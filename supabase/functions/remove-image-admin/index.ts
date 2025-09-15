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
    // Authenticate the user making the request
    const supabaseClient = createClient(
      process.env.SUPABASE_URL ?? '',
      process.env.SUPABASE_ANON_KEY ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('User not found. You must be logged in.');

    // Create an admin client to perform privileged operations
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL ?? '',
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
    );

    // Verify the user is a developer
    const { data: adminProfile, error: adminError } = await supabaseAdmin
      .from('profiles')
      .select('is_developer')
      .eq('id', user.id)
      .single();

    if (adminError || !adminProfile?.is_developer) {
      throw new Error('Permission denied. User is not an admin.');
    }

    // Parse request body
    const { rating_id } = await req.json();
    if (!rating_id) {
        throw new Error('rating_id is required.');
    }
    
    // 1. Get the rating to find image_url and uploader_id
    const { data: ratingData, error: ratingError } = await supabaseAdmin
        .from('ratings')
        .select('image_url, user_id')
        .eq('id', rating_id)
        .single();

    if (ratingError) throw new Error(`Rating not found: ${ratingError.message}`);
    if (!ratingData.image_url) throw new Error('The selected rating does not have an image to remove.');
    
    const uploader_id = ratingData.user_id;

    // 2. Delete the image from storage
    const imagePath = new URL(ratingData.image_url).pathname.split('/pint-images/')[1];
    if (imagePath) {
        const { error: storageError } = await supabaseAdmin.storage.from('pint-images').remove([imagePath]);
        // Don't throw on storage error, as we still want to clear the URL from the DB.
        // The image might become an orphan, but the user experience is not broken.
        if (storageError) console.error("Failed to delete image from storage:", storageError.message);
    }

    // 3. Set image_url to NULL in the ratings table
    const { error: updateRatingError } = await supabaseAdmin
        .from('ratings')
        .update({ image_url: null })
        .eq('id', rating_id);
    if (updateRatingError) throw updateRatingError;
    
    // 4. Increment removed_image_count for the uploader
    const { error: rpcError } = await supabaseAdmin.rpc('increment_removed_image_count', { user_id_to_update: uploader_id });
    if (rpcError) throw rpcError;

    return new Response(JSON.stringify({ message: 'Image removed successfully by admin' }), {
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