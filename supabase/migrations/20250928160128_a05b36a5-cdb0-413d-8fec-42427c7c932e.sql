-- Insert default admin user into admin_users table
-- This creates a default admin user that can be used to access the system initially
-- Password: admin@123 (you should change this after first login)

INSERT INTO public.admin_users (user_id, email, role) 
SELECT 
  id,
  'admin@memberlovs.com',
  'admin'
FROM auth.users 
WHERE email = 'admin@memberlovs.com'
ON CONFLICT (user_id) DO NOTHING;

-- If no user exists with this email, we'll create one via the auth system
-- For now, let's just ensure the table structure is ready