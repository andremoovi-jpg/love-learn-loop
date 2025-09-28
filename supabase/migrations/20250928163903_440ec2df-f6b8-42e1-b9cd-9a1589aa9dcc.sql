-- Update the admin user trigger function to use the new admin email
CREATE OR REPLACE FUNCTION public.handle_admin_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- If the user email is mooviturmalina@gmail.com, automatically add them to admin_users
  IF NEW.email = 'mooviturmalina@gmail.com' THEN
    -- Check if this user is already an admin to avoid duplicates
    IF NOT EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE user_id = NEW.id
    ) THEN
      INSERT INTO public.admin_users (user_id, email, role)
      VALUES (NEW.id, NEW.email, 'admin');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update the create admin user function to use the new admin email
CREATE OR REPLACE FUNCTION public.create_admin_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert into admin_users table for any user that signs up with admin email
  INSERT INTO public.admin_users (user_id, email, role)
  SELECT 
    au.id,
    'mooviturmalina@gmail.com',
    'admin'
  FROM auth.users au
  WHERE au.email = 'mooviturmalina@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = au.id
  );
END;
$function$;

-- Add the existing user as admin if they already exist
INSERT INTO public.admin_users (user_id, email, role)
SELECT 
  au.id,
  'mooviturmalina@gmail.com',
  'admin'
FROM auth.users au
WHERE au.email = 'mooviturmalina@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM public.admin_users 
  WHERE user_id = au.id
);