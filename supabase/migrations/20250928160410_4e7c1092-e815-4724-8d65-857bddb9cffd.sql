-- Create a default admin user in the system
-- This will create the admin user directly in the auth system

-- First, let's insert a record that will be used when the admin signs up
-- We'll create a function to handle admin user creation

CREATE OR REPLACE FUNCTION create_admin_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function will be used to ensure admin user exists
  -- The actual user will be created via signup, but we'll mark them as admin
  
  -- Insert into admin_users table for any user that signs up with admin email
  INSERT INTO public.admin_users (user_id, email, role)
  SELECT 
    au.id,
    'admin@memberlovs.com',
    'admin'
  FROM auth.users au
  WHERE au.email = 'admin@memberlovs.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = au.id
  );
  
  -- If no results, that means the user hasn't signed up yet
  -- They need to sign up with email: admin@memberlovs.com and password: Admin123!
END;
$$;

-- Run the function
SELECT create_admin_user();