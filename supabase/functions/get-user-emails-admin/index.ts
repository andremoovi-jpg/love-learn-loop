import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabaseAdmin.auth.getUser(token)

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar se é admin
    const { data: adminCheck } = await supabaseAdmin
      .from('admin_users')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!adminCheck) {
      return new Response(
        JSON.stringify({ error: 'Apenas administradores' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Admin verificado:', user.email)

    // Registrar acesso para auditoria
    await supabaseAdmin.from('audit_log').insert({
      user_id: user.id,
      action: 'VIEW_USER_EMAILS',
      table_name: 'auth.users',
      details: { admin_email: user.email }
    })

    // Buscar profiles
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)

    // Buscar emails reais do auth.users
    const { data: { users: authUsers } } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    })

    console.log(`📧 ${authUsers?.length || 0} emails encontrados`)

    // Criar mapa de emails
    const emailMap = new Map()
    authUsers?.forEach(u => {
      emailMap.set(u.id, u.email)
    })

    // Buscar contagem de produtos
    const { data: userProducts } = await supabaseAdmin
      .from('user_products')
      .select('user_id')

    const userProductCounts = new Map()
    userProducts?.forEach(up => {
      const count = userProductCounts.get(up.user_id) || 0
      userProductCounts.set(up.user_id, count + 1)
    })

    // Combinar dados
    const usersWithRealEmails = profiles?.map(profile => {
      const email = emailMap.get(profile.user_id)

      return {
        id: profile.id,
        user_id: profile.user_id,
        email: email || `user_${profile.user_id.substring(0, 8)}@private.com`,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        phone: profile.phone ? 
          profile.phone.substring(0, 3) + '****' + profile.phone.substring(profile.phone.length - 2) : 
          null,
        total_points: profile.total_points,
        is_admin: profile.is_admin,
        is_suspended: profile.is_suspended || false,
        created_at: profile.created_at,
        total_products: userProductCounts.get(profile.user_id) || 0,
        has_real_email: !!email
      }
    })

    console.log(`✅ ${usersWithRealEmails?.length || 0} usuários processados`)

    return new Response(
      JSON.stringify(usersWithRealEmails || []),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ Erro na Edge Function:', error)
    return new Response(
      JSON.stringify({ error: error?.message || 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
