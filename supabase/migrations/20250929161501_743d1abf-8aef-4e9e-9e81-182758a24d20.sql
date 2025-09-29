-- SECURITY FIX: Remove the publicly accessible profiles_public view 
-- and replace with secure access patterns

-- 1. Drop the insecure public view
DROP VIEW IF EXISTS public.profiles_public;

-- 2. Create a secure function instead of a public view
CREATE OR REPLACE FUNCTION public.get_public_profiles()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  total_points INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  is_admin BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only authenticated users can access this function
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Return profiles with proper phone masking
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.full_name,
    p.avatar_url,
    CASE
      WHEN p.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM admin_users 
        WHERE user_id = auth.uid() AND role = 'admin'
      ) THEN p.phone
      ELSE mask_phone(p.phone)
    END as phone,
    p.total_points,
    p.created_at,
    p.is_admin
  FROM profiles p
  WHERE p.user_id = auth.uid() -- Users can only see their own profile
     OR EXISTS (
       SELECT 1 FROM admin_users 
       WHERE user_id = auth.uid() AND role = 'admin'
     ); -- Or admins can see all profiles
END;
$$;

-- 3. Create a minimal public profile function for community features
-- This only returns non-sensitive data for authenticated users
CREATE OR REPLACE FUNCTION public.get_community_profiles()
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  avatar_url TEXT,
  total_points INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only authenticated users can access community data
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Return only non-sensitive profile data for community features
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.avatar_url,
    p.total_points
  FROM profiles p
  WHERE p.is_admin = false -- Don't expose admin accounts
    AND p.full_name IS NOT NULL -- Only show profiles with names
  ORDER BY p.total_points DESC
  LIMIT 50; -- Limit results
END;
$$;

-- 4. Grant execute permissions to authenticated users only
GRANT EXECUTE ON FUNCTION public.get_public_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_community_profiles() TO authenticated;

-- 5. Revoke any public access to the functions
REVOKE EXECUTE ON FUNCTION public.get_public_profiles() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_community_profiles() FROM anon;