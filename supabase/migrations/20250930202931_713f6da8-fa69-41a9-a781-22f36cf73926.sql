-- ============================================
-- FASE 1: Permitir comunidades independentes
-- ============================================

-- Permitir que communities.product_id seja NULL para comunidades independentes
ALTER TABLE communities ALTER COLUMN product_id DROP NOT NULL;

-- Adicionar comentário para documentar o novo comportamento
COMMENT ON COLUMN communities.product_id IS 'Product ID pode ser NULL para comunidades vendidas como produtos separados. Nesse caso, verificar acesso via products.product_type = ''community''';

-- ============================================
-- FASE 2: Atualizar RLS Policies - Communities
-- ============================================

-- Dropar TODAS as policies antigas de communities
DROP POLICY IF EXISTS "Users see communities of owned products" ON communities;
DROP POLICY IF EXISTS "Users see owned communities" ON communities;
DROP POLICY IF EXISTS "Admins can manage communities" ON communities;

-- Criar nova policy de SELECT que suporta ambos os cenários
CREATE POLICY "users_see_owned_communities_v2"
ON communities
FOR SELECT
USING (
  -- Admins veem tudo
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
  )
  OR
  -- Caso 1: Comunidade de produto regular (products.includes_community = true)
  (
    product_id IS NOT NULL
    AND product_id IN (
      SELECT up.product_id
      FROM user_products up
      JOIN products p ON p.id = up.product_id
      WHERE up.user_id = auth.uid()
      AND p.includes_community = true
    )
  )
  OR
  -- Caso 2: Comunidade como produto independente
  (
    id IN (
      SELECT c.id
      FROM communities c
      JOIN products p ON p.slug = c.slug
      WHERE p.product_type = 'community'
      AND p.id IN (
        SELECT product_id FROM user_products
        WHERE user_id = auth.uid()
      )
    )
  )
);

-- Recriar policy de admins
CREATE POLICY "admins_manage_communities"
ON communities
FOR ALL
USING (is_admin_user())
WITH CHECK (is_admin_user());

-- ============================================
-- FASE 3: Atualizar RLS - Community Members
-- ============================================

-- Dropar policy antiga
DROP POLICY IF EXISTS "Users join communities when they buy products with community" ON community_members;
DROP POLICY IF EXISTS "Users join communities on product purchase" ON community_members;

-- Nova policy que suporta ambos cenários
CREATE POLICY "users_join_owned_communities"
ON community_members
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND (
    -- Caso 1: Comunidade vinculada a produto regular
    (
      community_id IN (
        SELECT c.id FROM communities c
        JOIN products p ON p.id = c.product_id
        JOIN user_products up ON up.product_id = p.id
        WHERE up.user_id = auth.uid()
        AND p.includes_community = true
      )
    )
    OR
    -- Caso 2: Comunidade como produto independente
    (
      community_id IN (
        SELECT c.id FROM communities c
        JOIN products p ON p.slug = c.slug
        WHERE p.product_type = 'community'
        AND p.id IN (
          SELECT product_id FROM user_products
          WHERE user_id = auth.uid()
        )
      )
    )
  )
);

-- ============================================
-- FASE 4: Função helper para verificar acesso
-- ============================================

CREATE OR REPLACE FUNCTION public.check_community_access(
  community_id_param uuid,
  user_id_param uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_access boolean := false;
  is_banned boolean := false;
BEGIN
  -- Verificar se está banido
  SELECT COALESCE(cm.is_banned, false) INTO is_banned
  FROM community_members cm
  WHERE cm.community_id = community_id_param
  AND cm.user_id = user_id_param;

  -- Se está banido, sem acesso
  IF is_banned THEN
    RETURN false;
  END IF;

  -- Verificar se é admin
  IF EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = user_id_param
  ) THEN
    RETURN true;
  END IF;

  -- Verificar acesso via produto regular com comunidade
  IF EXISTS (
    SELECT 1 FROM communities c
    JOIN products p ON p.id = c.product_id
    JOIN user_products up ON up.product_id = p.id
    WHERE c.id = community_id_param
    AND up.user_id = user_id_param
    AND p.includes_community = true
  ) THEN
    RETURN true;
  END IF;

  -- Verificar acesso via produto tipo comunidade
  IF EXISTS (
    SELECT 1 FROM communities c
    JOIN products p ON p.slug = c.slug
    JOIN user_products up ON up.product_id = p.id
    WHERE c.id = community_id_param
    AND p.product_type = 'community'
    AND up.user_id = user_id_param
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;