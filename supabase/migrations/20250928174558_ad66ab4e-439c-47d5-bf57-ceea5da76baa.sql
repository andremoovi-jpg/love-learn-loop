-- SECURITY FIX: Convert view to SECURITY INVOKER mode
-- This ensures the view respects RLS policies based on the querying user, not the view creator

-- Drop the existing view
DROP VIEW IF EXISTS public.products_public;

-- Recreate with SECURITY INVOKER to respect RLS policies
CREATE VIEW public.products_public 
WITH (security_invoker=on) AS
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
  -- Note: content field is explicitly excluded for security
FROM public.products
WHERE is_active = true;

-- Ensure proper permissions are granted
GRANT SELECT ON public.products_public TO authenticated, anon;

-- Also, let's check if we can optimize our SECURITY DEFINER functions
-- Some of them might not need SECURITY DEFINER if we structure them properly

-- Update get_public_products function to be SECURITY INVOKER if possible
-- This function only returns safe data, so it doesn't need elevated privileges
DROP FUNCTION IF EXISTS public.get_public_products();
CREATE OR REPLACE FUNCTION public.get_public_products()
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  description text,
  cover_image_url text,
  product_type text,
  level text,
  estimated_duration text,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY INVOKER -- Changed from SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
    p.is_active,
    p.created_at,
    p.updated_at
  FROM public.products_public p;  -- Use the view instead of direct table access
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_public_products() TO authenticated, anon;