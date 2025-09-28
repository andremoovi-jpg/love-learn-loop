-- Fix the admin trigger that's causing the signup error
-- The issue is with the ON CONFLICT clause that references non-existent constraint

DROP TRIGGER IF EXISTS on_auth_admin_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_admin_user();

-- Create a simpler version without the problematic ON CONFLICT
CREATE OR REPLACE FUNCTION public.handle_admin_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If the user email is admin@gmail.com, automatically add them to admin_users
  IF NEW.email = 'admin@gmail.com' THEN
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
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_admin_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_admin_user();