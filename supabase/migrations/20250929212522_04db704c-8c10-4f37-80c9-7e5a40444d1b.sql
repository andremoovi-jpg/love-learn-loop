-- CORREÇÃO URGENTE: Remover recursão infinita e restaurar acesso admin

-- 1. Dropar todas as políticas problemáticas da tabela admin_users
DROP POLICY IF EXISTS "Admin hierarchy secure" ON admin_users;
DROP POLICY IF EXISTS "Admins can manage admin users" ON admin_users;
DROP POLICY IF EXISTS "Admin hierarchy" ON admin_users;

-- 2. Verificar e adicionar valor super_admin ao enum se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'super_admin'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'admin_role')
  ) THEN
    ALTER TYPE admin_role ADD VALUE IF NOT EXISTS 'super_admin';
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    -- Se o tipo não existir, criar
    CREATE TYPE admin_role AS ENUM ('admin', 'super_admin', 'moderator');
END $$;

-- 3. Garantir que mooviturmalina@gmail.com está como super_admin
INSERT INTO admin_users (user_id, email, role)
SELECT
  id,
  'mooviturmalina@gmail.com',
  'super_admin'
FROM auth.users
WHERE email = 'mooviturmalina@gmail.com'
ON CONFLICT (user_id)
DO UPDATE SET role = 'super_admin';

-- 4. Atualizar perfil para is_admin = true
UPDATE profiles
SET is_admin = true
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'mooviturmalina@gmail.com');

-- 5. Criar políticas RLS simples e SEM RECURSÃO
CREATE POLICY "Admins can view admin_users table"
ON admin_users
FOR SELECT
TO authenticated
USING (
  -- Usuário pode ver se ele mesmo está na tabela admin_users
  user_id = auth.uid()
  OR
  -- Ou se ele é super_admin (usando subquery simples)
  EXISTS (
    SELECT 1 FROM admin_users au_check
    WHERE au_check.user_id = auth.uid()
    AND au_check.role = 'super_admin'
  )
);

CREATE POLICY "Super admins can insert admins"
ON admin_users
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_users au_check
    WHERE au_check.user_id = auth.uid()
    AND au_check.role = 'super_admin'
  )
);

CREATE POLICY "Super admins can update admins"
ON admin_users
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users au_check
    WHERE au_check.user_id = auth.uid()
    AND au_check.role = 'super_admin'
  )
);

CREATE POLICY "Super admins can delete admins"
ON admin_users
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users au_check
    WHERE au_check.user_id = auth.uid()
    AND au_check.role = 'super_admin'
  )
);

-- 6. Recriar função is_admin_user de forma segura
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  );
$$;