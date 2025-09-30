-- Atualizar produtos existentes para incluir comunidades
UPDATE products 
SET includes_community = true 
WHERE is_active = true;

-- Garantir que membros sejam adicionados automaticamente para produtos que já foram comprados
-- Inserir membros para produtos que já foram comprados mas não têm entrada em community_members
INSERT INTO community_members (community_id, user_id, role)
SELECT DISTINCT 
  c.id as community_id,
  up.user_id,
  'member' as role
FROM user_products up
JOIN products p ON p.id = up.product_id
JOIN communities c ON c.product_id = p.id
WHERE p.includes_community = true
  AND NOT EXISTS (
    SELECT 1 FROM community_members cm 
    WHERE cm.community_id = c.id AND cm.user_id = up.user_id
  )
ON CONFLICT (community_id, user_id) DO NOTHING;