-- CORREÇÃO FINAL DE SEGURANÇA: Remover views inseguras e fortalecer sistema

-- 1. Remover qualquer view que possa estar causando problemas de segurança
DROP VIEW IF EXISTS products_secure CASCADE;
DROP VIEW IF EXISTS profiles_public CASCADE;

-- 2. Fortalecer as políticas RLS existentes
-- Política mais restritiva para products
DROP POLICY IF EXISTS "Public products viewable by everyone" ON products;

-- Nova política mais segura para visualização pública de produtos
CREATE POLICY "Public can view basic product info only" ON products
  FOR SELECT
  USING (
    is_active = true 
    AND auth.uid() IS NOT NULL  -- Apenas usuários autenticados
  );

-- 3. Criar função para limpeza automática de logs de segurança
CREATE OR REPLACE FUNCTION schedule_security_cleanup()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Esta função pode ser chamada periodicamente via cron job
  PERFORM cleanup_security_logs();
  
  -- Logar a limpeza
  INSERT INTO audit_log (user_id, action, table_name, details)
  VALUES (NULL, 'SECURITY_CLEANUP', 'system', 
          jsonb_build_object('timestamp', NOW(), 'automated', true));
END;
$$;

-- 4. Função adicional para verificar integridade dos dados
CREATE OR REPLACE FUNCTION verify_data_integrity()
RETURNS TABLE (
  table_name TEXT,
  issue_type TEXT,
  issue_count INTEGER,
  description TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar usuários sem perfil
  RETURN QUERY
  SELECT 
    'auth_users'::TEXT as table_name,
    'missing_profile'::TEXT as issue_type,
    COUNT(*)::INTEGER as issue_count,
    'Usuários sem perfil correspondente'::TEXT as description
  FROM auth.users au
  WHERE NOT EXISTS (
    SELECT 1 FROM profiles p WHERE p.user_id = au.id
  );

  -- Verificar perfis órfãos
  RETURN QUERY
  SELECT 
    'profiles'::TEXT as table_name,
    'orphaned_profile'::TEXT as issue_type,
    COUNT(*)::INTEGER as issue_count,
    'Perfis sem usuário correspondente'::TEXT as description
  FROM profiles p
  WHERE NOT EXISTS (
    SELECT 1 FROM auth.users au WHERE au.id = p.user_id
  );

  -- Verificar produtos sem usuários atribuídos
  RETURN QUERY
  SELECT 
    'user_products'::TEXT as table_name,
    'invalid_user_product'::TEXT as issue_type,
    COUNT(*)::INTEGER as issue_count,
    'Produtos atribuídos a usuários inexistentes'::TEXT as description
  FROM user_products up
  WHERE NOT EXISTS (
    SELECT 1 FROM profiles p WHERE p.user_id = up.user_id
  );
END;
$$;

-- 5. Garantir que todas as funções admin tenham as permissões corretas
REVOKE ALL ON FUNCTION verify_data_integrity() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION verify_data_integrity() TO authenticated;

REVOKE ALL ON FUNCTION schedule_security_cleanup() FROM PUBLIC;
-- Esta função deve ser executada apenas pelo sistema ou super admin

-- 6. Adicionar trigger para monitorar mudanças em admin_users
CREATE OR REPLACE FUNCTION log_admin_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log todas as mudanças em admin_users para auditoria
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (user_id, action, table_name, details)
    VALUES (auth.uid(), 'ADMIN_USER_CREATED', 'admin_users', 
            jsonb_build_object('new_admin_user_id', NEW.user_id, 'role', NEW.role));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (user_id, action, table_name, details)
    VALUES (auth.uid(), 'ADMIN_USER_UPDATED', 'admin_users', 
            jsonb_build_object('admin_user_id', NEW.user_id, 'old_role', OLD.role, 'new_role', NEW.role));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (user_id, action, table_name, details)
    VALUES (auth.uid(), 'ADMIN_USER_DELETED', 'admin_users', 
            jsonb_build_object('deleted_admin_user_id', OLD.user_id, 'role', OLD.role));
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Criar trigger se não existir
DROP TRIGGER IF EXISTS audit_admin_changes ON admin_users;
CREATE TRIGGER audit_admin_changes
  AFTER INSERT OR UPDATE OR DELETE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION log_admin_changes();

-- 7. Comentários de documentação
COMMENT ON FUNCTION verify_data_integrity IS 'Verifica integridade dos dados para detectar inconsistências';
COMMENT ON FUNCTION schedule_security_cleanup IS 'Agenda limpeza automática dos logs de segurança';
COMMENT ON FUNCTION log_admin_changes IS 'Monitora todas as mudanças na tabela admin_users para auditoria';