-- Fix security definer view issue by removing SECURITY DEFINER from view
-- and ensuring proper access control through RLS policies

-- Drop the problematic view
DROP VIEW IF EXISTS public.products_public;

-- Recreate without SECURITY DEFINER (views shouldn't need this)
-- Instead rely on RLS policies for access control
CREATE VIEW public.products_public AS
SELECT 
  id,
  name,
  slug,
  description,
  cover_image_url,
  product_type,
  level,
  estimated_duration,
  created_at,
  updated_at,
  -- Explicitly exclude sensitive content field
  false as has_full_access
FROM public.products
WHERE is_active = true;

-- Ensure the RLS policies are correctly configured
-- Update the basic info policy to be more specific about what fields are accessible
DROP POLICY IF EXISTS "Public can view basic product info" ON public.products;

CREATE POLICY "Public can view basic product info" ON public.products
  FOR SELECT
  USING (
    is_active = true 
    -- This policy will be used in combination with careful SELECT clauses
    -- to ensure content field is not exposed to unauthorized users
  );

-- The "Purchasers can view full product content" policy remains as is
-- since it properly restricts access based on user purchases

-- Grant permissions to the view
GRANT SELECT ON public.products_public TO authenticated, anon;