-- Corrigir warnings de segurança: adicionar SET search_path para funções
CREATE OR REPLACE FUNCTION mask_phone(phone TEXT)
RETURNS TEXT AS $$
BEGIN
  IF phone IS NULL OR LENGTH(phone) < 8 THEN
    RETURN phone;
  END IF;
  -- Mostra apenas primeiros 2 e últimos 2 dígitos
  RETURN SUBSTRING(phone, 1, 2) || '****' || SUBSTRING(phone, LENGTH(phone) - 1, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_endpoint TEXT,
  p_max_requests INTEGER DEFAULT 10,
  p_window_minutes INTEGER DEFAULT 1
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  -- Limpar registros antigos
  DELETE FROM api_rate_limits
  WHERE window_start < NOW() - INTERVAL '1 hour';

  -- Contar requests na janela
  SELECT COUNT(*) INTO v_count
  FROM api_rate_limits
  WHERE user_id = v_user_id
    AND endpoint = p_endpoint
    AND window_start > NOW() - (p_window_minutes || ' minutes')::INTERVAL;

  -- Verificar limite
  IF v_count >= p_max_requests THEN
    RETURN FALSE; -- Rate limit excedido
  END IF;

  -- Registrar request
  INSERT INTO api_rate_limits (user_id, endpoint, window_start)
  VALUES (v_user_id, p_endpoint, NOW());

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION validate_password_strength(password TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_score INTEGER := 0;
  v_errors TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Verificar comprimento mínimo
  IF LENGTH(password) < 8 THEN
    v_errors := array_append(v_errors, 'Senha deve ter pelo menos 8 caracteres');
  ELSE
    v_score := v_score + 1;
  END IF;

  -- Verificar letra maiúscula
  IF password ~ '[A-Z]' THEN
    v_score := v_score + 1;
  ELSE
    v_errors := array_append(v_errors, 'Senha deve conter letra maiúscula');
  END IF;

  -- Verificar letra minúscula
  IF password ~ '[a-z]' THEN
    v_score := v_score + 1;
  ELSE
    v_errors := array_append(v_errors, 'Senha deve conter letra minúscula');
  END IF;

  -- Verificar número
  IF password ~ '[0-9]' THEN
    v_score := v_score + 1;
  ELSE
    v_errors := array_append(v_errors, 'Senha deve conter número');
  END IF;

  -- Verificar caractere especial
  IF password ~ '[!@#$%^&*(),.?":{}|<>]' THEN
    v_score := v_score + 1;
  ELSE
    v_errors := array_append(v_errors, 'Senha deve conter caractere especial');
  END IF;

  -- Verificar senhas comuns
  IF LOWER(password) IN ('password', '123456', '12345678', 'admin', 'qwerty', 'letmein') THEN
    v_errors := array_append(v_errors, 'Senha muito comum, escolha outra');
    v_score := 0;
  END IF;

  v_result := jsonb_build_object(
    'valid', v_score >= 4,
    'score', v_score,
    'errors', v_errors
  );

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION get_user_list_secure()
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar rate limit
  IF NOT check_rate_limit('user_list', 5, 1) THEN
    RAISE EXCEPTION 'Rate limit excedido. Tente novamente em alguns minutos.';
  END IF;

  -- Verificar se é admin
  IF NOT EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  -- Retornar apenas dados não sensíveis
  RETURN QUERY
  SELECT p.id, p.full_name, p.avatar_url
  FROM profiles p
  LIMIT 100; -- Limitar quantidade
END;
$$;

-- Ativar RLS na nova tabela api_rate_limits
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- Criar políticas para api_rate_limits
CREATE POLICY "Users can view their own rate limits"
ON api_rate_limits FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert rate limits"
ON api_rate_limits FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can delete old rate limits"
ON api_rate_limits FOR DELETE
USING (true); -- Permitir limpeza automática

-- Admins podem ver todos os rate limits
CREATE POLICY "Admins can view all rate limits"
ON api_rate_limits FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);