-- Update admin user email to use a valid domain
-- Remove old admin user and update function for new email

DROP FUNCTION IF EXISTS create_admin_user();

CREATE OR REPLACE FUNCTION create_admin_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert into admin_users table for any user that signs up with admin email
  INSERT INTO public.admin_users (user_id, email, role)
  SELECT 
    au.id,
    'admin@gmail.com',
    'admin'
  FROM auth.users au
  WHERE au.email = 'admin@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = au.id
  );
END;
$$;

-- Clean up any existing admin entries with old email
DELETE FROM public.admin_users WHERE email = 'admin@memberlovs.com';