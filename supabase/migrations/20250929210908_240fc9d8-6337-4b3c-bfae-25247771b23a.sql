-- Corrigir search_path nas funções de segurança

-- Recriar get_admin_users_with_real_emails com search_path
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
SET search_path = public
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

-- Recriar check_admin_rate_limit com search_path
CREATE OR REPLACE FUNCTION check_admin_rate_limit(
  action_name TEXT,
  max_attempts INTEGER DEFAULT 10,
  window_minutes INTEGER DEFAULT 5
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;