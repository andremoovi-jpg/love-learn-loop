-- Drop the problematic function
DROP FUNCTION IF EXISTS get_users_with_email();

-- Create a simpler function that returns JSON to avoid type matching issues
CREATE OR REPLACE FUNCTION get_users_with_email()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  -- Verificar se é admin
  IF NOT EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.user_id = auth.uid()
    AND admin_users.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.';
  END IF;

  -- Retornar dados como JSON
  SELECT json_agg(row_to_json(t))
  INTO result
  FROM (
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
      (
        SELECT COUNT(*)::INTEGER
        FROM user_products
        WHERE user_products.user_id = p.user_id
      ) as total_products
    FROM profiles p
    INNER JOIN auth.users au ON au.id = p.user_id
    ORDER BY p.created_at DESC
  ) t;

  RETURN COALESCE(result, '[]'::json);
END;
$$;