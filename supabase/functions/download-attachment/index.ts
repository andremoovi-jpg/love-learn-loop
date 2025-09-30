import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { filePath, topicId, replyId } = await req.json();

    if (!filePath) {
      throw new Error('Missing filePath parameter');
    }

    // Verificar acesso à comunidade
    let communityId = null;

    if (topicId) {
      const { data: topic } = await supabase
        .from('forum_topics')
        .select('community_id')
        .eq('id', topicId)
        .single();
      
      communityId = topic?.community_id;
    } else if (replyId) {
      const { data: reply } = await supabase
        .from('forum_replies')
        .select('topic_id')
        .eq('id', replyId)
        .single();

      if (reply) {
        const { data: topic } = await supabase
          .from('forum_topics')
          .select('community_id')
          .eq('id', reply.topic_id)
          .single();
        
        communityId = topic?.community_id;
      }
    }

    if (!communityId) {
      throw new Error('Cannot determine community for this attachment');
    }

    // Verificar se o usuário é membro ativo da comunidade
    const { data: membership } = await supabase
      .from('community_members')
      .select('is_banned')
      .eq('community_id', communityId)
      .eq('user_id', user.id)
      .single();

    const { data: isAdmin } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .single();

    if (!isAdmin && (!membership || membership.is_banned)) {
      throw new Error('Access denied to this community');
    }

    // Gerar signed URL
    const { data: signedUrlData, error: urlError } = await supabase
      .storage
      .from('attachments')
      .createSignedUrl(filePath, 60); // 60 segundos

    if (urlError) {
      console.error('Error creating signed URL:', urlError);
      throw new Error('Failed to generate download URL');
    }

    console.log('Download authorized:', {
      userId: user.id,
      communityId,
      filePath,
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({ url: signedUrlData.signedUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Download error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
