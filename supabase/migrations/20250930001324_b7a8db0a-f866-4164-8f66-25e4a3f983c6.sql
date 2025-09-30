-- 🚨 FIX: Limpar duplicatas ANTES de adicionar constraint

-- 1. PRIMEIRO: Limpar perfis duplicados mantendo apenas o mais recente
WITH duplicates AS (
  SELECT
    id,
    user_id,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
  FROM profiles
)
DELETE FROM profiles
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- 2. AGORA adicionar constraint UNIQUE em user_id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_user_id_unique'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);
  END IF;
END $$;

-- 3. Remover política de INSERT problemática
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- 4. Criar política restrita que permite INSERT apenas se não existir
DROP POLICY IF EXISTS "Insert profile only if not exists" ON profiles;
CREATE POLICY "Insert profile only if not exists"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.uid()
  )
);

-- 5. Atualizar trigger para garantir que só cria se não existir
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- IMPORTANTE: Verificar se perfil já existe antes de inserir
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
    INSERT INTO public.profiles (user_id, full_name)
    VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name')
    ON CONFLICT (user_id) DO NOTHING; -- Garantia extra contra race conditions
  END IF;
  RETURN NEW;
END;
$$;