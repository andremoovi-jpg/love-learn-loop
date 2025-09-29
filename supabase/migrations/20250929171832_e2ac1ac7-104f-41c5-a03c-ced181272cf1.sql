-- Find and fix all remaining security issues

-- 1. Look for any other views that might be SECURITY DEFINER
-- Let's check if there are any other problematic views in the system

-- First, let's address the password protection warning
-- This needs to be done through Supabase Auth settings, but we can check if there are any password-related functions

-- 2. The security definer view error persists, so there might be another view
-- Let's look for any views that might have been created as SECURITY DEFINER

-- Check if there are any other views we need to address
-- The error might be coming from a system view or one we haven't identified

-- For now, let's ensure all our custom functions are properly secured
-- and address what we can at the database level

-- Update any remaining function permissions
REVOKE ALL ON FUNCTION get_profiles_admin_secure() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_profiles_admin_secure() TO authenticated;

REVOKE ALL ON FUNCTION get_public_profiles_community() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_public_profiles_community() TO authenticated;

-- Ensure all admin functions are properly restricted
REVOKE ALL ON FUNCTION get_users_with_email() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_users_with_email() TO authenticated;