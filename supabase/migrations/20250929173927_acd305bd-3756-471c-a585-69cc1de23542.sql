-- CORREÇÃO DE SEGURANÇA: Remover função insegura e criar versão segura com auditoria

-- 1. Remover função antiga que expõe dados
DROP FUNCTION IF EXISTS get_users_with_email();

-- 2. Criar tabelas de auditoria e rate limiting
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  details JSONB,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_audit_log_user_time ON audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_rate_limits_user_time ON admin_rate_limits(user_id, created_at DESC);

-- 3. Função para limpar logs antigos automaticamente
CREATE OR REPLACE FUNCTION cleanup_security_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Limpar rate limits com mais de 1 dia
  DELETE FROM admin_rate_limits WHERE created_at < NOW() - INTERVAL '1 day';
  
  -- Limpar audit logs com mais de 90 dias
  DELETE FROM audit_log WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;

-- 4. Criar função segura com auditoria e rate limiting
CREATE OR REPLACE FUNCTION get_users_with_email_secure()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  total_points INTEGER,
  is_admin BOOLEAN,
  is_suspended BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  total_products INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate_limit_count INTEGER;
BEGIN
  -- Verificar autenticação
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  -- Verificar se é admin com restrições adicionais
  IF NOT EXISTS (
    SELECT 1 FROM admin_users au
    WHERE au.user_id = auth.uid()
    AND au.role = 'admin'
    AND au.created_at < NOW() - INTERVAL '1 hour' -- Admin deve existir há pelo menos 1 hora
  ) THEN
    -- Logar tentativa de acesso não autorizado
    INSERT INTO audit_log (user_id, action, table_name, details)
    VALUES (auth.uid(), 'UNAUTHORIZED_ACCESS_ATTEMPT', 'profiles', 
            jsonb_build_object('function', 'get_users_with_email_secure'));
    
    RAISE EXCEPTION 'Acesso negado: privilégios de administrador insuficientes';
  END IF;

  -- Verificar rate limiting (máximo 10 requisições por minuto)
  SELECT COUNT(*) INTO v_rate_limit_count
  FROM admin_rate_limits
  WHERE user_id = auth.uid()
  AND action = 'get_users_list'
  AND created_at > NOW() - INTERVAL '1 minute';

  IF v_rate_limit_count >= 10 THEN
    RAISE EXCEPTION 'Rate limit excedido. Aguarde um momento antes de tentar novamente.';
  END IF;

  -- Registrar acesso no rate limiter
  INSERT INTO admin_rate_limits (user_id, action)
  VALUES (auth.uid(), 'get_users_list');

  -- Logar acesso para auditoria
  INSERT INTO audit_log (user_id, action, table_name, details)
  VALUES (auth.uid(), 'READ_USERS_LIST', 'profiles', 
          jsonb_build_object('timestamp', NOW()));

  -- Retornar dados com mascaramento de informações sensíveis
  RETURN QUERY
  SELECT
    p.id,
    p.user_id,
    -- Mascarar email parcialmente
    CASE
      WHEN au.email IS NOT NULL THEN
        SUBSTRING(au.email FROM 1 FOR 2) || 
        '***@' || 
        SPLIT_PART(au.email, '@', 2)
      ELSE 'privado@sistema.com'
    END as email,
    p.full_name,
    p.avatar_url,
    -- Mascarar telefone
    CASE
      WHEN p.phone IS NOT NULL AND LENGTH(p.phone) > 6 THEN
        SUBSTRING(p.phone FROM 1 FOR 3) || 
        '****' || 
        SUBSTRING(p.phone FROM LENGTH(p.phone) - 1)
      ELSE NULL
    END as phone,
    p.total_points,
    p.is_admin,
    COALESCE(p.is_suspended, false) as is_suspended,
    p.created_at,
    (
      SELECT COUNT(*)::INTEGER 
      FROM user_products up 
      WHERE up.user_id = p.user_id
    ) as total_products
  FROM profiles p
  LEFT JOIN auth.users au ON au.id = p.user_id
  ORDER BY p.created_at DESC
  LIMIT 500; -- Limitar quantidade de resultados
END;
$$;

-- 5. Remover email hardcoded de admin
DELETE FROM admin_users WHERE email = 'admin@memberlovs.com' AND user_id NOT IN (SELECT id FROM auth.users);

-- 6. Garantir RLS em todas as novas tabelas
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_rate_limits ENABLE ROW LEVEL SECURITY;

-- Políticas para audit_log
CREATE POLICY "Apenas admins podem ver audit logs"
ON audit_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Sistema pode inserir audit logs"
ON audit_log FOR INSERT
WITH CHECK (true);

-- Políticas para admin_rate_limits
CREATE POLICY "Sistema pode gerenciar rate limits"
ON admin_rate_limits FOR ALL
USING (true);

-- 7. Revogar permissões públicas e conceder apenas para autenticados
REVOKE ALL ON FUNCTION get_users_with_email_secure() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_users_with_email_secure() TO authenticated;

REVOKE ALL ON FUNCTION cleanup_security_logs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cleanup_security_logs() TO authenticated;

-- 8. Comentários para documentação
COMMENT ON FUNCTION get_users_with_email_secure IS 'Função segura para admins visualizarem lista de usuários com auditoria, rate limiting e mascaramento de dados sensíveis';
COMMENT ON TABLE audit_log IS 'Log de auditoria de todas as ações administrativas sensíveis';
COMMENT ON TABLE admin_rate_limits IS 'Controle de rate limiting para ações administrativas';