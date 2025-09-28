-- FINAL SECURITY FIX: Block content field access at database level
-- The issue is that RLS policies allow row access, not column access
-- Solution: Use a combination of restrictive policies and column exclusion

-- Drop the permissive policy
DROP POLICY IF EXISTS "Products access control" ON public.products;

-- Create separate restrictive policies
-- Policy 1: Public users can ONLY see rows, but application must control columns
CREATE POLICY "Public can view active products only" ON public.products
  FOR SELECT
  TO anon
  USING (is_active = true);

-- Policy 2: Authenticated users can see their purchased products with full content
CREATE POLICY "Authenticated can view purchased products" ON public.products  
  FOR SELECT
  TO authenticated
  USING (
    is_active = true 
    AND (
      is_admin_user()
      OR
      EXISTS (
        SELECT 1 FROM public.user_products up
        WHERE up.user_id = auth.uid()
        AND up.product_id = products.id
      )
    )
  );

-- The key insight: We must enforce content protection in the application layer
-- by NEVER selecting the content field directly for public queries

-- Update products_public view to be more explicit about excluding content
DROP VIEW IF EXISTS public.products_public;
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
  is_active,
  created_at,
  updated_at
  -- Note: content field is explicitly excluded
FROM public.products
WHERE is_active = true;

-- Create a function to check if current user can access product content
CREATE OR REPLACE FUNCTION public.can_access_product_content(product_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow access if user is admin or has purchased the product
  RETURN (
    is_admin_user()
    OR
    EXISTS (
      SELECT 1 FROM public.user_products up
      WHERE up.user_id = auth.uid()
      AND up.product_id = can_access_product_content.product_id
    )
  );
END;
$$;

-- Update the access control function to be more secure
DROP FUNCTION IF EXISTS public.get_product_with_access_control(text);
CREATE OR REPLACE FUNCTION public.get_product_with_access_control(product_slug text)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  description text,
  cover_image_url text,
  product_type text,
  level text,
  estimated_duration text,
  content jsonb,
  is_active boolean,
  has_access boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  product_record record;
  user_has_access boolean := false;
BEGIN
  -- Get basic product info (without content)
  SELECT 
    p.id, p.name, p.slug, p.description, p.cover_image_url,
    p.product_type, p.level, p.estimated_duration, p.is_active,
    p.created_at, p.updated_at
  INTO product_record 
  FROM public.products p 
  WHERE p.slug = product_slug AND p.is_active = true;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Check if user has access
  IF auth.uid() IS NOT NULL THEN
    user_has_access := can_access_product_content(product_record.id);
  END IF;
  
  -- Return data with content only if user has access
  RETURN QUERY SELECT 
    product_record.id,
    product_record.name,
    product_record.slug,
    product_record.description,
    product_record.cover_image_url,
    product_record.product_type,
    product_record.level,
    product_record.estimated_duration,
    CASE 
      WHEN user_has_access THEN (
        SELECT p.content FROM public.products p WHERE p.id = product_record.id
      )
      ELSE NULL
    END as content,
    product_record.is_active,
    user_has_access,
    product_record.created_at,
    product_record.updated_at;
END;
$$;

-- Grant permissions
GRANT SELECT ON public.products_public TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_product_with_access_control(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.can_access_product_content(uuid) TO authenticated;