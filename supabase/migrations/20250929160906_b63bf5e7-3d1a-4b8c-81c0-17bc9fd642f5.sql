-- 1. Criar função para mascarar telefone
CREATE OR REPLACE FUNCTION mask_phone(phone TEXT)
RETURNS TEXT AS $$
BEGIN
  IF phone IS NULL OR LENGTH(phone) < 8 THEN
    RETURN phone;
  END IF;
  -- Mostra apenas primeiros 2 e últimos 2 dígitos
  RETURN SUBSTRING(phone, 1, 2) || '****' || SUBSTRING(phone, LENGTH(phone) - 1, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Criar view segura para profiles
CREATE OR REPLACE VIEW public.profiles_public AS
SELECT
  p.id,
  p.user_id,
  p.full_name,
  p.avatar_url,
  CASE
    WHEN p.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM admin_users WHERE user_id = auth.uid()
    ) THEN p.phone
    ELSE mask_phone(p.phone)
  END as phone,
  p.total_points,
  p.created_at,
  p.is_admin
FROM profiles p;

-- 3. Atualizar RLS para profiles - mais restritiva
DROP POLICY IF EXISTS "Users view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Apenas o próprio usuário vê seu perfil completo
CREATE POLICY "Users view own profile only"
ON profiles FOR SELECT
USING (auth.uid() = user_id);

-- Admins podem ver, mas não todos os campos sensíveis
CREATE POLICY "Admins view profiles limited"
ON profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Usuários só podem atualizar próprio perfil
CREATE POLICY "Users update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Criar view segura para produtos
CREATE OR REPLACE VIEW public.products_secure AS
SELECT
  p.id,
  p.name,
  p.slug,
  p.description,
  p.cover_image_url,
  p.product_type,
  p.level,
  p.estimated_duration,
  -- Conteúdo só visível para quem tem acesso
  CASE
    WHEN EXISTS (
      SELECT 1 FROM user_products up
      WHERE up.product_id = p.id AND up.user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM admin_users WHERE user_id = auth.uid()
    ) THEN p.content
    ELSE jsonb_build_object('modules', jsonb_build_array())
  END as content,
  EXISTS (
    SELECT 1 FROM user_products up
    WHERE up.product_id = p.id AND up.user_id = auth.uid()
  ) as has_access,
  p.created_at,
  p.updated_at
FROM products p;

-- 5. Função para buscar conteúdo seguro do produto
CREATE OR REPLACE FUNCTION get_product_content_secure(product_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_content JSONB;
BEGIN
  -- Verifica se usuário tem acesso
  IF NOT EXISTS (
    SELECT 1 FROM user_products
    WHERE product_id = $1 AND user_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object('error', 'Acesso negado');
  END IF;

  SELECT content INTO v_content
  FROM products
  WHERE id = product_id;

  RETURN v_content;
END;
$$;

-- 6. Criar tabela de rate limiting
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users,
  ip_address INET,
  endpoint TEXT,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 7. Função para verificar rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_endpoint TEXT,
  p_max_requests INTEGER DEFAULT 10,
  p_window_minutes INTEGER DEFAULT 1
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
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

-- 8. Função para validar força da senha
CREATE OR REPLACE FUNCTION validate_password_strength(password TEXT)
RETURNS JSONB
LANGUAGE plpgsql
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

-- 9. Função para listar usuários de forma segura
CREATE OR REPLACE FUNCTION get_user_list_secure()
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
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