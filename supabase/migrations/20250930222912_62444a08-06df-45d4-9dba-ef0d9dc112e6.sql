-- Drop e recriar função get_community_profiles com user_id
DROP FUNCTION IF EXISTS public.get_community_profiles();

CREATE OR REPLACE FUNCTION public.get_community_profiles()
RETURNS TABLE(id uuid, user_id uuid, full_name text, avatar_url text, total_points integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only authenticated users can access community data
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Return only non-sensitive profile data for community features
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
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
$function$;