-- Função para calcular destinatários de uma campanha
CREATE OR REPLACE FUNCTION calculate_campaign_recipients(campaign_filters JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_count INTEGER;
  user_list JSONB;
BEGIN
  -- Query base: todos os usuários com perfil
  WITH filtered_users AS (
    SELECT DISTINCT p.user_id, p.full_name, au.email
    FROM profiles p
    JOIN auth.users au ON au.id = p.user_id
    WHERE p.is_admin = FALSE

    -- Filtro: possui produtos
    AND (
      (campaign_filters->>'has_products' IS NULL)
      OR
      (
        SELECT COUNT(*)
        FROM user_products up
        WHERE up.user_id = p.user_id
          AND up.product_id = ANY(
            ARRAY(
              SELECT jsonb_array_elements_text(campaign_filters->'has_products')::UUID
            )
          )
      ) = jsonb_array_length(campaign_filters->'has_products')
    )

    -- Filtro: NÃO possui produtos
    AND (
      (campaign_filters->>'not_has_products' IS NULL)
      OR
      (
        SELECT COUNT(*)
        FROM user_products up
        WHERE up.user_id = p.user_id
          AND up.product_id = ANY(
            ARRAY(
              SELECT jsonb_array_elements_text(campaign_filters->'not_has_products')::UUID
            )
          )
      ) = 0
    )

    -- Filtro: última compra
    AND (
      (campaign_filters->>'last_purchase_days' IS NULL)
      OR
      EXISTS (
        SELECT 1
        FROM user_products up
        WHERE up.user_id = p.user_id
          AND up.purchased_at >= NOW() - INTERVAL '1 day' * (campaign_filters->>'last_purchase_days')::INTEGER
      )
    )

    -- Filtro: status do usuário
    AND (
      (campaign_filters->>'user_status' IS NULL)
      OR (campaign_filters->>'user_status' = 'all')
      OR (campaign_filters->>'user_status' = 'active' AND COALESCE(p.is_suspended, FALSE) = FALSE)
      OR (campaign_filters->>'user_status' = 'inactive' AND COALESCE(p.is_suspended, FALSE) = TRUE)
    )
  )

  SELECT
    COUNT(*)::INTEGER,
    jsonb_agg(
      jsonb_build_object(
        'id', user_id,
        'full_name', full_name,
        'email', email
      )
    )
  INTO total_count, user_list
  FROM filtered_users;

  RETURN jsonb_build_object(
    'total', COALESCE(total_count, 0),
    'users', COALESCE(user_list, '[]'::jsonb)
  );
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION calculate_campaign_recipients(JSONB) TO authenticated;