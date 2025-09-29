-- Drop problematic recursive policies on admin_users
DROP POLICY IF EXISTS "super_admin_full_access" ON public.admin_users;
DROP POLICY IF EXISTS "super_admin_view_all" ON public.admin_users;
DROP POLICY IF EXISTS "view_own_admin_record" ON public.admin_users;

-- Create a security definer function to check if user is admin (bypasses RLS)
CREATE OR REPLACE FUNCTION public.check_is_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = check_user_id
  );
$$;

-- Create new non-recursive policies using the security definer function
CREATE POLICY "admin_users_select_own"
ON public.admin_users
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "admin_users_select_all_if_admin"
ON public.admin_users
FOR SELECT
USING (public.check_is_admin(auth.uid()));

CREATE POLICY "admin_users_insert_if_admin"
ON public.admin_users
FOR INSERT
WITH CHECK (public.check_is_admin(auth.uid()));

CREATE POLICY "admin_users_update_if_admin"
ON public.admin_users
FOR UPDATE
USING (public.check_is_admin(auth.uid()));

CREATE POLICY "admin_users_delete_if_admin"
ON public.admin_users
FOR DELETE
USING (public.check_is_admin(auth.uid()));