-- Check what security definer views exist and fix the products_secure view issue
-- The products_public view is safe (only basic product info), but products_secure may need attention

-- 1. Drop the products_secure view that might be causing security warnings
DROP VIEW IF EXISTS public.products_secure;

-- 2. The existing products_public view is actually safe - it only shows basic product metadata
-- But let's make sure it has proper access control by enabling RLS on it
-- However, views can't have RLS, so we'll create a function instead

-- 3. Create a secure function for getting product content (replacing products_secure view)
CREATE OR REPLACE FUNCTION public.get_product_secure(product_slug TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  description TEXT,
  cover_image_url TEXT,
  product_type TEXT,
  level TEXT,
  estimated_duration TEXT,
  content JSONB,
  has_access BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_id UUID;
  v_has_access BOOLEAN := false;
BEGIN
  -- Get product ID from slug
  SELECT p.id INTO v_product_id
  FROM products p 
  WHERE p.slug = product_slug AND p.is_active = true;
  
  IF v_product_id IS NULL THEN
    RETURN; -- Product not found
  END IF;
  
  -- Check if user has access (must be authenticated)
  IF auth.uid() IS NOT NULL THEN
    -- Check if user owns the product or is admin
    SELECT EXISTS (
      SELECT 1 FROM user_products up
      WHERE up.product_id = v_product_id AND up.user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND role = 'admin'
    ) INTO v_has_access;
  END IF;
  
  -- Return product data with content only if user has access
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.slug,
    p.description,
    p.cover_image_url,
    p.product_type,
    p.level,
    p.estimated_duration,
    CASE 
      WHEN v_has_access THEN p.content
      ELSE jsonb_build_object('modules', jsonb_build_array())
    END as content,
    v_has_access,
    p.created_at,
    p.updated_at
  FROM products p 
  WHERE p.id = v_product_id;
END;
$$;

-- 4. Grant execute permissions appropriately
GRANT EXECUTE ON FUNCTION public.get_product_secure(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_product_secure(TEXT) TO anon; -- Allow anonymous to see metadata, but not content