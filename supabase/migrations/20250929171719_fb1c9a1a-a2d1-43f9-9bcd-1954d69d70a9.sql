-- Identify and fix the security definer view issue

-- Check for any views that might be defined as SECURITY DEFINER
-- The error suggests there's still a view with SECURITY DEFINER

-- Let's drop and recreate the products_public view without SECURITY DEFINER
DROP VIEW IF EXISTS products_public CASCADE;

-- Create products_public view without SECURITY DEFINER (uses SECURITY INVOKER by default)
CREATE VIEW products_public AS
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
FROM products
WHERE is_active = true;

-- Set security invoker explicitly to be safe
ALTER VIEW products_public SET (security_invoker = on);

-- Grant appropriate permissions
GRANT SELECT ON products_public TO authenticated;
GRANT SELECT ON products_public TO anon;