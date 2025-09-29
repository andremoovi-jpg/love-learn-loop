-- Remove all problematic SECURITY DEFINER views identified by the linter

-- Check for existing views with SECURITY DEFINER in the definition
-- and remove them to fix the security linter warning

-- Drop any potential problematic views (these may or may not exist)
DROP VIEW IF EXISTS products_secure;
DROP VIEW IF EXISTS private_profiles;

-- Check if products_public view is causing issues and recreate it properly
DROP VIEW IF EXISTS products_public CASCADE;

-- Recreate products_public as a simple view without SECURITY DEFINER
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

-- Enable RLS on products_public view to fix the missing RLS protection warning
ALTER VIEW products_public SET (security_invoker = on);

-- Grant proper permissions
GRANT SELECT ON products_public TO authenticated;