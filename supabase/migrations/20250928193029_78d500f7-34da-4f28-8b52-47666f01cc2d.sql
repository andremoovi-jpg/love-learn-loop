-- Adicionar coluna is_admin na tabela profiles
ALTER TABLE public.profiles
ADD COLUMN is_admin BOOLEAN DEFAULT false;

-- Atualizar profiles existentes baseado na tabela admin_users
UPDATE public.profiles
SET is_admin = true
WHERE user_id IN (
  SELECT user_id FROM public.admin_users WHERE role = 'admin'
);

-- Criar trigger para manter sincronização automática
CREATE OR REPLACE FUNCTION public.sync_admin_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando inserido/atualizado em admin_users, atualizar profiles
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.profiles 
    SET is_admin = (NEW.role = 'admin')
    WHERE user_id = NEW.user_id;
    RETURN NEW;
  END IF;
  
  -- Quando removido de admin_users, remover status admin
  IF TG_OP = 'DELETE' THEN
    UPDATE public.profiles 
    SET is_admin = false
    WHERE user_id = OLD.user_id;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger na tabela admin_users
DROP TRIGGER IF EXISTS sync_admin_status_trigger ON public.admin_users;
CREATE TRIGGER sync_admin_status_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.admin_users
  FOR EACH ROW EXECUTE FUNCTION public.sync_admin_status();

-- Também atualizar quando um novo profile é criado e já existe em admin_users
CREATE OR REPLACE FUNCTION public.check_admin_on_profile_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar se o usuário já é admin
  IF EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = NEW.user_id AND role = 'admin'
  ) THEN
    NEW.is_admin = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS check_admin_on_insert_trigger ON public.profiles;
CREATE TRIGGER check_admin_on_insert_trigger
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.check_admin_on_profile_insert();