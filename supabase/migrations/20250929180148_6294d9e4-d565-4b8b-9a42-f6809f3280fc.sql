-- ==========================================
-- CORREÇÃO FINAL - SEGURANÇA E VISUALIZAÇÃO
-- ==========================================

-- 1. REMOVER FUNÇÕES ANTIGAS PROBLEMÁTICAS
DROP FUNCTION IF EXISTS get_users_with_email_secure();
DROP FUNCTION IF EXISTS get_users_with_email();

-- 2. CRIAR FUNÇÃO RPC SIMPLIFICADA E SEGURA PARA ADMIN
CREATE OR REPLACE FUNCTION get_admin_users_list()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  is_admin_user BOOLEAN;
BEGIN
  -- Verificar se é admin
  SELECT EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.user_id = auth.uid()
  ) INTO is_admin_user;

  IF NOT is_admin_user THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Retornar dados como JSON
  SELECT json_agg(
    json_build_object(
      'id', p.id,
      'user_id', p.user_id,
      'email', COALESCE(
        (SELECT au.email FROM auth.users au WHERE au.id = p.user_id),
        'user_' || substring(p.user_id::text from 1 for 8) || '@private.com'
      ),
      'full_name', p.full_name,
      'avatar_url', p.avatar_url,
      'phone', CASE
        WHEN p.phone IS NOT NULL THEN
          substring(p.phone from 1 for 3) || '****' || substring(p.phone from length(p.phone)-1)
        ELSE NULL
      END,
      'total_points', p.total_points,
      'is_admin', p.is_admin,
      'is_suspended', COALESCE(p.is_suspended, false),
      'created_at', p.created_at,
      'total_products', (
        SELECT COUNT(*)::int
        FROM user_products up
        WHERE up.user_id = p.user_id
      )
    )
  )
  INTO result
  FROM profiles p
  ORDER BY p.created_at DESC
  LIMIT 1000;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION get_admin_users_list() TO authenticated;

-- 3. REMOVER VIEWS PROBLEMÁTICAS COM SECURITY DEFINER
DROP VIEW IF EXISTS products_secure CASCADE;
DROP VIEW IF EXISTS users_admin_view CASCADE;
DROP VIEW IF EXISTS user_products_view CASCADE;

-- 4. FUNÇÃO PARA VERIFICAR ACESSO A PRODUTO
CREATE OR REPLACE FUNCTION can_access_product(product_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  has_access BOOLEAN;
BEGIN
  SELECT
    CASE
      WHEN EXISTS (
        SELECT 1 FROM admin_users
        WHERE user_id = auth.uid()
      ) THEN true
      WHEN EXISTS (
        SELECT 1 FROM user_products
        WHERE user_products.product_id = product_id_param
        AND user_products.user_id = auth.uid()
      ) THEN true
      ELSE false
    END INTO has_access;

  RETURN has_access;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION can_access_product(UUID) TO authenticated;

-- 5. CRIAR TABELA PARA INFORMAÇÕES DE CONTATO PRIVADAS
CREATE TABLE IF NOT EXISTS contact_info_private (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email_verified TEXT,
  phone_verified TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE contact_info_private ENABLE ROW LEVEL SECURITY;

-- 6. POLÍTICAS RLS PARA CONTACT_INFO_PRIVATE
DROP POLICY IF EXISTS "Users view own contact" ON contact_info_private;
CREATE POLICY "Users view own contact" ON contact_info_private
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage contacts" ON contact_info_private;
CREATE POLICY "Admins manage contacts" ON contact_info_private
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
    )
  );

-- 7. ATUALIZAR POLÍTICAS DE PRODUTOS
DROP POLICY IF EXISTS "Users view own products" ON products;
DROP POLICY IF EXISTS "Secure product access" ON products;
CREATE POLICY "Secure product access" ON products
  FOR SELECT
  TO authenticated
  USING (can_access_product(id));

DROP POLICY IF EXISTS "Admins manage all products" ON products;
CREATE POLICY "Admins manage all products" ON products
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
    )
  );

-- 8. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_user_products_user ON user_products(user_id);
CREATE INDEX IF NOT EXISTS idx_user_products_product ON user_products(product_id);
CREATE INDEX IF NOT EXISTS idx_user_products_composite ON user_products(user_id, product_id);
CREATE INDEX IF NOT EXISTS idx_contact_info_user ON contact_info_private(user_id);

-- 9. GARANTIR RLS ATIVO EM TODAS AS TABELAS PRINCIPAIS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_products ENABLE ROW LEVEL SECURITY;