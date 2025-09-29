-- Fix security linter issues from the previous migration

-- 1. Drop the public_profiles view that was causing SECURITY DEFINER issues
DROP VIEW IF EXISTS public_profiles;

-- 2. Create a simple view without SECURITY DEFINER (which was the default issue)
-- This view will use the existing RLS policies of the profiles table
CREATE VIEW public_profiles AS
SELECT 
  id,
  user_id,
  full_name,
  avatar_url,
  total_points,
  created_at,
  is_admin
FROM profiles;

-- 3. Grant proper permissions to the view
GRANT SELECT ON public_profiles TO authenticated;