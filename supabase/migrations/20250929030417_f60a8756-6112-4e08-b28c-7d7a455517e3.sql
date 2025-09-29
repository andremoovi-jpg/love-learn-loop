-- Adicionar coluna is_suspended se não existir
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_profiles_is_suspended ON profiles(is_suspended);