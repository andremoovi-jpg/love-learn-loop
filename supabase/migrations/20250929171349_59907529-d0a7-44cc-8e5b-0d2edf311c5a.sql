-- Fix Security Definer View warnings by removing problematic views

-- 1. Drop the security definer views that are causing warnings
DROP VIEW IF EXISTS public_profiles;
DROP VIEW IF EXISTS private_profiles;

-- 2. Update the community function to use the existing get_public_profiles_community function
-- This is already secure and doesn't need changes

-- 3. Update the AdminUsuarios component to use the secure function instead of direct table access
-- The get_profiles_admin_secure function is already created and secure

-- 4. Create RLS policies on products_public view to fix the missing RLS warning
ALTER VIEW products_public SET (security_invoker = on);

-- Add RLS policy for products_public view
-- Actually, we need to grant access differently since it's a view
GRANT SELECT ON products_public TO authenticated;
GRANT SELECT ON products_public TO anon;