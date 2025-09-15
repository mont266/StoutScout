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
    if (!user) throw new Error('User not found');

    // Create an admin client to perform privileged operations
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL ?? '',
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
    );

    // Verify the user is a developer
    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('is_developer')
      .eq('id', user.id)
      .single();

    if (!adminProfile?.is_developer) {
      throw new Error('Permission denied. User is not an admin.');
    }

    // Parse request body
    const { report_id, action, rating_id, uploader_id } = await req.json();
    if (!report_id || !action || !rating_id) {
        throw new Error('report_id, rating_id, and action are required.');
    }

    if (action === 'allow') {
      const { error } = await supabaseAdmin
        .from('reported_images')
        .update({ status: 'resolved_allowed', resolved_at: new Date().toISOString(), resolver_id: user.id })
        .eq('id', report_id);
      if (error) throw error;

    } else if (action === 'remove') {
      if (!uploader_id) throw new Error('uploader_id is required to remove an image.');

      // 1. Get the image URL from the rating
      const { data: ratingData, error: ratingError } = await supabaseAdmin
        .from('ratings')
        .select('image_url')
        .eq('id', rating_id)
        .single();
      if (ratingError) throw new Error(`Rating not found: ${ratingError.message}`);
      
      // 2. If an image URL exists, delete the image from storage
      if (ratingData.image_url) {
        const imagePath = new URL(ratingData.image_url).pathname.split('/pint-images/')[1];
        if (imagePath) {
          const { error: storageError } = await supabaseAdmin.storage.from('pint-images').remove([imagePath]);
          if (storageError) console.error("Failed to delete image from storage:", storageError.message);
        }
      }

      // 3. Set image_url to NULL in the ratings table
      const { error: updateRatingError } = await supabaseAdmin
        .from('ratings')
        .update({ image_url: null })
        .eq('id', rating_id);
      if (updateRatingError) throw updateRatingError;
      
      // 4. Increment removed_image_count for the uploader using an RPC call
      const { error: rpcError } = await supabaseAdmin.rpc('increment_removed_image_count', { user_id_to_update: uploader_id });
      if (rpcError) throw rpcError;
      
      // 5. Update the report status to "resolved_removed"
      const { error: updateReportError } = await supabaseAdmin
        .from('reported_images')
        .update({ status: 'resolved_removed', resolved_at: new Date().toISOString(), resolver_id: user.id })
        .eq('id', report_id);
      if (updateReportError) throw updateReportError;

    } else {
        throw new Error('Invalid action provided.');
    }

    return new Response(JSON.stringify({ message: `Report resolved with action: ${action}` }), {
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