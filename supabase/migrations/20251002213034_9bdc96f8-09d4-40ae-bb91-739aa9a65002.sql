-- FASE 6.1 - Anexos em Campanhas

-- 1. Adicionar campo PHONE na tabela profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Criar índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);

-- Comentário explicativo
COMMENT ON COLUMN profiles.phone IS 'Telefone no formato internacional: +5511999999999';

-- 2. Adicionar colunas de ANEXOS na tabela campaigns

-- Email: suporta múltiplos anexos (array JSON)
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS email_attachments JSONB DEFAULT '[]';

-- WhatsApp: 1 mídia por mensagem (campos separados)
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS whatsapp_media_type TEXT DEFAULT 'text';

ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS whatsapp_media_url TEXT;

ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS whatsapp_media_filename TEXT;

-- Adicionar constraint DEPOIS da coluna existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'campaigns_whatsapp_media_type_check'
  ) THEN
    ALTER TABLE campaigns
    ADD CONSTRAINT campaigns_whatsapp_media_type_check
    CHECK (whatsapp_media_type IN ('text', 'image', 'video', 'audio', 'document'));
  END IF;
END $$;

-- Comentários
COMMENT ON COLUMN campaigns.email_attachments IS 'Array de objetos: [{id, name, type, size, url}]';
COMMENT ON COLUMN campaigns.whatsapp_media_type IS 'Tipo de mídia: text, image, video, audio ou document';

-- 3. Atualizar função calculate_campaign_recipients para incluir PHONE
CREATE OR REPLACE FUNCTION calculate_campaign_recipients(campaign_filters JSONB)
RETURNS JSONB AS $$
DECLARE
  total_count INTEGER;
  user_list JSONB;
BEGIN
  WITH filtered_users AS (
    SELECT DISTINCT
      p.user_id,
      p.full_name,
      p.phone,
      au.email
    FROM profiles p
    JOIN auth.users au ON au.id = p.user_id
    WHERE p.is_admin = FALSE

    -- Filtro: possui produtos
    AND (
      (campaign_filters->>'has_products') IS NULL
      OR (
        SELECT COUNT(*)
        FROM user_products up
        WHERE up.user_id = p.user_id
          AND up.product_id = ANY(
            ARRAY(
              SELECT jsonb_array_elements_text(campaign_filters->'has_products')::UUID
            )
          )
      ) = jsonb_array_length(campaign_filters->'has_products')
    )

    -- Filtro: NÃO possui produtos
    AND (
      (campaign_filters->>'not_has_products') IS NULL
      OR (
        SELECT COUNT(*)
        FROM user_products up
        WHERE up.user_id = p.user_id
          AND up.product_id = ANY(
            ARRAY(
              SELECT jsonb_array_elements_text(campaign_filters->'not_has_products')::UUID
            )
          )
      ) = 0
    )

    -- Filtro: última compra
    AND (
      (campaign_filters->>'last_purchase_days') IS NULL
      OR EXISTS (
        SELECT 1
        FROM user_products up
        WHERE up.user_id = p.user_id
          AND up.purchased_at >= NOW() - INTERVAL '1 day' * (campaign_filters->>'last_purchase_days')::INTEGER
      )
    )

    -- Filtro: status do usuário
    AND (
      (campaign_filters->>'user_status') IS NULL
      OR (campaign_filters->>'user_status' = 'all')
      OR (campaign_filters->>'user_status' = 'active' AND COALESCE(p.is_suspended, FALSE) = FALSE)
      OR (campaign_filters->>'user_status' = 'inactive' AND COALESCE(p.is_suspended, FALSE) = TRUE)
    )
  )
  SELECT
    COUNT(*)::INTEGER,
    jsonb_agg(
      jsonb_build_object(
        'id', user_id,
        'full_name', full_name,
        'email', email,
        'phone', phone
      )
    )
  INTO total_count, user_list
  FROM filtered_users;

  RETURN jsonb_build_object(
    'total', COALESCE(total_count, 0),
    'users', COALESCE(user_list, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Storage policies para bucket campaign-files
-- Policy 1: Apenas admins podem fazer upload
CREATE POLICY "Admins can upload campaign files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'campaign-files' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Policy 2: Leitura pública (qualquer um pode baixar)
CREATE POLICY "Public can read campaign files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'campaign-files');

-- Policy 3: Apenas admins podem deletar
CREATE POLICY "Admins can delete campaign files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'campaign-files' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);