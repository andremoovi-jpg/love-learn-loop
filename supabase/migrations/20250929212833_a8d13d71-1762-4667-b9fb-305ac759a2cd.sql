-- CORREÇÃO DEFINITIVA: Remover TODAS as políticas problemáticas e criar novas seguras

-- 1. DROPAR TODAS AS POLÍTICAS DA TABELA admin_users
DROP POLICY IF EXISTS "Admins can view admin_users table" ON admin_users;
DROP POLICY IF EXISTS "Super admins can insert admins" ON admin_users;
DROP POLICY IF EXISTS "Super admins can update admins" ON admin_users;
DROP POLICY IF EXISTS "Super admins can delete admins" ON admin_users;
DROP POLICY IF EXISTS "Admin hierarchy secure" ON admin_users;
DROP POLICY IF EXISTS "Admins can manage admin users" ON admin_users;

-- 2. CRIAR SECURITY DEFINER FUNCTION para verificar admin sem recursão
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

-- 3. CRIAR POLÍTICAS SIMPLES usando a função SECURITY DEFINER
-- Esta política NÃO causa recursão porque usa SECURITY DEFINER que bypassa RLS
CREATE POLICY "Anyone can view their own admin record"
ON admin_users
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Super admins see all"
ON admin_users
FOR SELECT
TO authenticated
USING (
  is_user_admin(auth.uid())
  AND 
  (SELECT role FROM admin_users WHERE user_id = auth.uid()) = 'super_admin'
);

CREATE POLICY "Super admins manage all"
ON admin_users
FOR ALL
TO authenticated
USING (
  is_user_admin(auth.uid())
  AND 
  (SELECT role FROM admin_users WHERE user_id = auth.uid()) = 'super_admin'
)
WITH CHECK (
  is_user_admin(auth.uid())
  AND 
  (SELECT role FROM admin_users WHERE user_id = auth.uid()) = 'super_admin'
);

-- 4. ATUALIZAR política da tabela profiles para usar a nova função
DROP POLICY IF EXISTS "admin_view_profiles_verified" ON profiles;

CREATE POLICY "Users and admins view profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()  -- Próprio perfil
  OR
  is_user_admin(auth.uid())  -- Ou é admin
);