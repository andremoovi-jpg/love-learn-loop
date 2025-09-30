-- Fix infinite recursion in communities RLS policy
-- Drop the problematic policy that causes circular reference
DROP POLICY IF EXISTS "users_see_owned_communities_v2" ON communities;

-- Create new policy without recursion
-- This policy avoids circular reference by NOT joining communities table within itself
CREATE POLICY "users_view_accessible_communities" ON communities
FOR SELECT
USING (
  -- Admins can see all communities
  is_admin_user()
  OR
  -- Communities linked to products with community included
  (product_id IS NOT NULL AND product_id IN (
    SELECT up.product_id 
    FROM user_products up
    JOIN products p ON p.id = up.product_id
    WHERE up.user_id = auth.uid() 
      AND p.includes_community = true
  ))
  OR
  -- Independent communities (sold as separate products)
  -- Check if user owns a product with matching slug and type 'community'
  (slug IN (
    SELECT p.slug
    FROM products p
    JOIN user_products up ON up.product_id = p.id
    WHERE p.product_type = 'community' 
      AND up.user_id = auth.uid()
  ))
);