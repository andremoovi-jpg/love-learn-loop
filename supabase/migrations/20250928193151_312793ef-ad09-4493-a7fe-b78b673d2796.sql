-- Sincronizar dados existentes entre admin_users e profiles
UPDATE public.profiles
SET is_admin = true
WHERE user_id IN (
  SELECT user_id FROM public.admin_users WHERE role = 'admin'
)
AND is_admin = false;

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