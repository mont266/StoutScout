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
    
    // 1. Authenticate the moderator
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt)
    if (userError || !user) {
      return new Response(JSON.stringify({ error: `Authentication failed: ${userError?.message}` }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: adminProfile } = await supabaseAdmin.from('profiles').select('is_developer').eq('id', user.id).single()
    if (!adminProfile?.is_developer) {
      return new Response(JSON.stringify({ error: 'Permission denied: Moderator role required.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 2. Validate request body
    const { report_id, action } = await req.json()
    if (!report_id || !['dismiss', 'remove'].includes(action)) {
      throw new Error('Invalid request: `report_id` and a valid `action` ("dismiss" or "remove") are required.')
    }

    // 3. Fetch the report to get content details
    const { data: report, error: reportError } = await supabaseAdmin
      .from('reports')
      .select('content_id, content_type')
      .eq('id', report_id)
      .single()
      
    if (reportError || !report) throw new Error(`Could not find report with ID ${report_id}.`)
    
    // 4. Perform the 'remove' action if requested
    if (action === 'remove') {
      let deleteError;
      if (report.content_type === 'rating') {
        const { error } = await supabaseAdmin.from('ratings').delete().eq('id', report.content_id);
        deleteError = error;
      } else if (report.content_type === 'post') {
        const { error } = await supabaseAdmin.from('posts').delete().eq('id', report.content_id);
        deleteError = error;
      } else {
        throw new Error(`Unsupported content type for removal: ${report.content_type}`);
      }
      
      if (deleteError) {
        // If content is already deleted (e.g., by user), it's not a fatal error for resolving the report.
        if (deleteError.code !== '23503' && !deleteError.message.includes('not present')) {
            console.error(`Failed to delete content (type: ${report.content_type}, id: ${report.content_id}): ${deleteError.message}`);
            throw new Error(`Failed to delete content: ${deleteError.message}`);
        }
      }
    }
    
    // 5. Update the report's status to resolved
    const status = action === 'dismiss' ? 'resolved_dismissed' : 'resolved_removed';
    const { error: updateError } = await supabaseAdmin
      .from('reports')
      .update({ status: 'resolved_removed', resolved_at: new Date().toISOString(), resolver_id: user.id })
      .eq('id', report_id)
    
    if (updateError) throw new Error(`Failed to update report status: ${updateError.message}`)

    return new Response(JSON.stringify({ message: `Report resolved with action: ${action}` }), {
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
