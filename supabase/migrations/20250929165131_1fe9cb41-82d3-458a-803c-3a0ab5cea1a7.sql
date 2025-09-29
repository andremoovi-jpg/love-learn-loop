-- Função que retorna usuários com email real (apenas para admins)
CREATE OR REPLACE FUNCTION get_users_with_email()
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
  created_at TIMESTAMP WITH TIME ZONE,
  total_products INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se é admin
  IF NOT EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores podem acessar esta função.';
  END IF;

  -- Retornar dados combinados
  RETURN QUERY
  SELECT
    p.id,
    p.user_id,
    au.email,
    p.full_name,
    p.avatar_url,
    p.phone,
    p.total_points,
    p.is_admin,
    COALESCE(p.is_suspended, false) as is_suspended,
    p.created_at,
    COALESCE(
      (SELECT COUNT(*)::INTEGER
       FROM user_products up
       WHERE up.user_id = p.user_id),
      0
    ) as total_products
  FROM profiles p
  INNER JOIN auth.users au ON au.id = p.user_id
  ORDER BY p.created_at DESC;
END;
$$;