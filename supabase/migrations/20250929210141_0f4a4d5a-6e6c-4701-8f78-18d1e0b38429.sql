-- ============================================
-- 🔒 CORREÇÃO DE SEGURANÇA COMPLETA (CORRIGIDO)
-- Mantém emails visíveis no admin
-- ============================================

-- PROBLEMA 1: Remover VIEW products_public insegura
DROP VIEW IF EXISTS products_public CASCADE;

-- PROBLEMA 2: Remover TODAS as views com SECURITY DEFINER
DROP VIEW IF EXISTS users_admin_view CASCADE;
DROP VIEW IF EXISTS products_secure CASCADE;
DROP VIEW IF EXISTS user_products_view CASCADE;
DROP VIEW IF EXISTS public_profiles CASCADE;

-- PROBLEMA 3: Função segura para ver emails (SECURITY INVOKER)
DROP FUNCTION IF EXISTS get_users_with_email CASCADE;
DROP FUNCTION IF EXISTS get_users_with_email_secure CASCADE;
DROP FUNCTION IF EXISTS get_admin_users_with_real_emails CASCADE;

CREATE OR REPLACE FUNCTION get_admin_users_with_real_emails()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  total_points INTEGER,
  is_admin BOOLEAN,
  is_suspended BOOLEAN,
  created_at TIMESTAMPTZ,
  total_products INTEGER
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  requesting_user_id UUID;
  is_super_admin BOOLEAN;
BEGIN
  requesting_user_id := auth.uid();

  IF NOT EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = requesting_user_id
    AND role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.';
  END IF;

  SELECT CASE WHEN role = 'super_admin' THEN true ELSE false END INTO is_super_admin
  FROM admin_users
  WHERE user_id = requesting_user_id;

  INSERT INTO audit_log (user_id, action, table_name, details)
  VALUES (
    requesting_user_id,
    'VIEW_ALL_USER_EMAILS',
    'profiles',
    jsonb_build_object('is_super_admin', is_super_admin, 'timestamp', NOW())
  );

  RETURN QUERY
  WITH user_data AS (
    SELECT
      p.id, p.user_id, p.full_name, p.avatar_url, p.phone,
      p.total_points, p.is_admin,
      COALESCE(p.is_suspended, false) as is_suspended,
      p.created_at
    FROM profiles p
  ),
  user_emails AS (
    SELECT au.id as user_id, au.email FROM auth.users au
  ),
  product_counts AS (
    SELECT up.user_id, COUNT(*)::INTEGER as total_products
    FROM user_products up GROUP BY up.user_id
  )
  SELECT
    ud.id, ud.user_id,
    COALESCE(ue.email, 'email-nao-encontrado@sistema.com') as email,
    ud.full_name, ud.avatar_url,
    CASE
      WHEN ud.phone IS NOT NULL AND is_super_admin THEN ud.phone
      WHEN ud.phone IS NOT NULL THEN
        SUBSTRING(ud.phone, 1, 3) || '****' || SUBSTRING(ud.phone FROM LENGTH(ud.phone) - 1)
      ELSE NULL
    END as phone,
    ud.total_points, ud.is_admin, ud.is_suspended, ud.created_at,
    COALESCE(pc.total_products, 0) as total_products
  FROM user_data ud
  LEFT JOIN user_emails ue ON ue.user_id = ud.user_id
  LEFT JOIN product_counts pc ON pc.user_id = ud.user_id
  ORDER BY ud.created_at DESC
  LIMIT 1000;
END;
$$;

GRANT EXECUTE ON FUNCTION get_admin_users_with_real_emails() TO authenticated;

-- PROBLEMA 7: Hierarquia de admin
DROP POLICY IF EXISTS "Admins view admin_users" ON admin_users;
DROP POLICY IF EXISTS "Admin hierarchy" ON admin_users;
DROP POLICY IF EXISTS "Admins can view admin users" ON admin_users;
DROP POLICY IF EXISTS "Admin hierarchy view" ON admin_users;

CREATE POLICY "Admin hierarchy secure" ON admin_users
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid() AND au.role = 'super_admin'
    )
    OR user_id = auth.uid()
  );

-- PROBLEMA 8: Recriar tabela de rate limiting
DROP TABLE IF EXISTS admin_rate_limits CASCADE;

CREATE TABLE admin_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  success BOOLEAN DEFAULT false
);

CREATE INDEX idx_admin_rate_limits_lookup
ON admin_rate_limits(user_id, action, attempted_at DESC);

-- Habilitar RLS
ALTER TABLE admin_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view own rate limits" ON admin_rate_limits
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System manages rate limits" ON admin_rate_limits
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Função de rate limiting
CREATE OR REPLACE FUNCTION check_admin_rate_limit(
  action_name TEXT,
  max_attempts INTEGER DEFAULT 10,
  window_minutes INTEGER DEFAULT 5
)
RETURNS BOOLEAN AS $$
DECLARE
  recent_attempts INTEGER;
BEGIN
  SELECT COUNT(*) INTO recent_attempts
  FROM admin_rate_limits
  WHERE user_id = auth.uid()
    AND action = action_name
    AND attempted_at > NOW() - (window_minutes || ' minutes')::INTERVAL;

  INSERT INTO admin_rate_limits (user_id, action, success)
  VALUES (auth.uid(), action_name, recent_attempts < max_attempts);

  DELETE FROM admin_rate_limits
  WHERE attempted_at < NOW() - INTERVAL '24 hours';

  RETURN recent_attempts < max_attempts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_admin_rate_limit(TEXT, INTEGER, INTEGER) TO authenticated;