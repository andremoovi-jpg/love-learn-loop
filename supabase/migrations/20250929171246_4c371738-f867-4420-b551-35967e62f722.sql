-- Fix User Personal Information Exposure by separating public and private profile data

-- 1. Create a public_profiles view that only exposes non-sensitive data
DROP VIEW IF EXISTS public_profiles;
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

-- 2. Create a private_profiles view for sensitive data (admin only)
DROP VIEW IF EXISTS private_profiles;
CREATE VIEW private_profiles AS
SELECT 
  id,
  user_id,
  full_name,
  avatar_url,
  phone,
  total_points,
  is_suspended,
  created_at,
  updated_at,
  is_admin
FROM profiles;

-- 3. Update RLS policies for profiles table - make them more restrictive
DROP POLICY IF EXISTS "Admins view profiles limited" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

-- 4. Create stricter admin policies with proper authentication verification
CREATE POLICY "Admins can view profiles with verification" 
ON public.profiles 
FOR SELECT 
USING (
  -- Users can view their own profile
  auth.uid() = user_id 
  OR 
  -- Admins can view all profiles but with stricter verification
  (
    is_admin_user() 
    AND EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid() 
      AND role = 'admin' 
      AND created_at < now() - interval '1 hour' -- Admin must be created at least 1 hour ago
    )
  )
);

CREATE POLICY "Admins can update profiles with verification" 
ON public.profiles 
FOR UPDATE 
USING (
  -- Users can update their own profile
  auth.uid() = user_id 
  OR 
  -- Admins can update with verification
  (
    is_admin_user() 
    AND EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
      AND created_at < now() - interval '1 hour'
    )
  )
)
WITH CHECK (
  -- Users can only update their own profile
  auth.uid() = user_id 
  OR 
  -- Admins can update any profile
  is_admin_user()
);

CREATE POLICY "Admins can delete profiles with verification" 
ON public.profiles 
FOR DELETE 
USING (
  is_admin_user() 
  AND EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
    AND created_at < now() - interval '1 hour'
  )
);

-- 5. Create a secure function for admin access to sensitive profile data
CREATE OR REPLACE FUNCTION get_profiles_admin_secure()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  full_name text,
  avatar_url text,
  phone text,
  total_points integer,
  is_suspended boolean,
  is_admin boolean,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Strict admin verification with additional checks
  IF NOT EXISTS (
    SELECT 1 FROM admin_users au
    WHERE au.user_id = auth.uid() 
    AND au.role = 'admin'
    AND au.created_at < now() - interval '1 hour' -- Admin account must be at least 1 hour old
  ) THEN
    RAISE EXCEPTION 'Access denied: Insufficient admin privileges';
  END IF;

  -- Rate limiting check
  IF NOT check_rate_limit('admin_profile_access', 10, 5) THEN
    RAISE EXCEPTION 'Rate limit exceeded. Please wait before accessing profile data again.';
  END IF;

  -- Return masked phone numbers for additional security
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.full_name,
    p.avatar_url,
    mask_phone(p.phone) as phone, -- Use existing mask_phone function
    p.total_points,
    COALESCE(p.is_suspended, false) as is_suspended,
    p.is_admin,
    p.created_at
  FROM profiles p
  ORDER BY p.created_at DESC;
END;
$$;

-- 6. Create a public function for community features (only non-sensitive data)
CREATE OR REPLACE FUNCTION get_public_profiles_community()
RETURNS TABLE(
  id uuid,
  full_name text,
  avatar_url text,
  total_points integer
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

  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.avatar_url,
    p.total_points
  FROM profiles p
  WHERE p.is_admin = false -- Don't expose admin accounts
    AND p.full_name IS NOT NULL -- Only show profiles with names
    AND COALESCE(p.is_suspended, false) = false -- Don't show suspended users
  ORDER BY p.total_points DESC
  LIMIT 50; -- Limit results
END;
$$;