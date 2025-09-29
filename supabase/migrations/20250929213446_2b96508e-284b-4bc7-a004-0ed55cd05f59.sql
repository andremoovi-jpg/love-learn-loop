-- LIMPEZA COMPLETA E RECRIAÇÃO DE POLÍTICAS

-- 1. DROPAR ABSOLUTAMENTE TODAS as políticas de admin_users
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'admin_users' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.admin_users';
    END LOOP;
END $$;

-- 2. CRIAR SECURITY DEFINER FUNCTION para verificar admin SEM recursão
CREATE OR REPLACE FUNCTION public.is_user_admin(check_user_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.admin_users 
    WHERE user_id = COALESCE(check_user_id, auth.uid())
  );
$$;

-- 3. CRIAR POLÍTICAS ULTRA SIMPLES - SEM RECURSÃO
-- Qualquer usuário autenticado pode ver seu próprio registro
CREATE POLICY "view_own_admin_record"
ON admin_users
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Super admins podem ver todos os registros
CREATE POLICY "super_admin_view_all"
ON admin_users
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users inner_check
    WHERE inner_check.user_id = auth.uid()
    AND inner_check.role = 'super_admin'
  )
);

-- Super admins podem fazer tudo
CREATE POLICY "super_admin_full_access"
ON admin_users
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users inner_check
    WHERE inner_check.user_id = auth.uid()
    AND inner_check.role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_users inner_check
    WHERE inner_check.user_id = auth.uid()
    AND inner_check.role = 'super_admin'
  )
);

-- 4. Corrigir política de profiles
DROP POLICY IF EXISTS "admin_view_profiles_verified" ON profiles;
DROP POLICY IF EXISTS "Users and admins view profiles" ON profiles;

CREATE POLICY "profiles_view_own_or_admin"
ON profiles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR
  is_user_admin(auth.uid())
);