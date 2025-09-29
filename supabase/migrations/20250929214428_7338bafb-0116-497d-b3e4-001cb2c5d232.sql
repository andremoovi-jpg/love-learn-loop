-- Sincronizar profiles.is_admin com admin_users usando trigger

-- 1. Criar função para sincronizar status admin
CREATE OR REPLACE FUNCTION public.sync_admin_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- 2. Criar trigger (remover se já existe)
DROP TRIGGER IF EXISTS sync_admin_status_trigger ON public.admin_users;

CREATE TRIGGER sync_admin_status_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.admin_users
FOR EACH ROW
EXECUTE FUNCTION public.sync_admin_status();

-- 3. Sincronizar dados existentes
UPDATE public.profiles p
SET is_admin = EXISTS (
  SELECT 1 FROM public.admin_users au
  WHERE au.user_id = p.user_id
);