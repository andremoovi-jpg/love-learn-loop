-- 1. Preencher profiles com full_name vazio usando email como fallback
UPDATE profiles
SET full_name = COALESCE(
  (SELECT email FROM auth.users WHERE auth.users.id = profiles.user_id),
  'Usuário'
)
WHERE full_name IS NULL OR full_name = '';

-- 2. Ativar moderação em todas as comunidades
UPDATE communities
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb),
  '{require_moderation}',
  'true'::jsonb
)
WHERE settings->>'require_moderation' IS NULL 
   OR settings->>'require_moderation' = 'false';

-- 3. Criar trigger para definir status 'pending' em novos tópicos quando moderação está ativa
CREATE OR REPLACE FUNCTION set_topic_pending_status()
RETURNS TRIGGER AS $$
DECLARE
  requires_moderation BOOLEAN;
BEGIN
  -- Verificar se a comunidade requer moderação
  SELECT (settings->>'require_moderation')::boolean INTO requires_moderation
  FROM communities
  WHERE id = NEW.community_id;

  -- Se requer moderação e não é admin, status = pending
  IF requires_moderation AND NOT is_admin_user() THEN
    NEW.status = 'pending';
  ELSE
    NEW.status = 'active';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_set_topic_pending
  BEFORE INSERT ON forum_topics
  FOR EACH ROW
  EXECUTE FUNCTION set_topic_pending_status();

-- 4. Atualizar RLS policy para mostrar tópicos pending apenas para autor e admins
DROP POLICY IF EXISTS "Users see approved topics or own topics" ON forum_topics;

CREATE POLICY "Users see active/approved topics or own pending topics" ON forum_topics
  FOR SELECT
  USING (
    (
      (status IN ('active', 'approved'))
      OR (status = 'pending' AND author_id = auth.uid())
      OR is_admin_user()
    )
    AND
    (
      community_id IN (
        SELECT community_id FROM community_members WHERE user_id = auth.uid()
      )
      OR is_admin_user()
    )
  );

-- 5. Garantir que full_name não seja null no futuro
ALTER TABLE profiles 
  ALTER COLUMN full_name SET DEFAULT 'Usuário';

-- 6. Comentário para referência
COMMENT ON TRIGGER trigger_set_topic_pending ON forum_topics IS 
  'Automaticamente define status pending para tópicos quando a comunidade requer moderação';