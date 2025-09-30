-- Adicionar coluna status em forum_topics para moderação
ALTER TABLE forum_topics ADD COLUMN IF NOT EXISTS status text DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected', 'deleted'));

-- Atualizar índice para performance
CREATE INDEX IF NOT EXISTS idx_forum_topics_status ON forum_topics(status);

-- Atualizar RLS policy para mostrar apenas tópicos aprovados (exceto para admins e autores)
DROP POLICY IF EXISTS "Users see topics of their communities" ON forum_topics;

CREATE POLICY "Users see approved topics or own topics"
ON forum_topics
FOR SELECT
USING (
  (status = 'approved' OR author_id = auth.uid() OR is_admin_user())
  AND (
    community_id IN (
      SELECT community_id FROM community_members WHERE user_id = auth.uid()
    ) 
    OR is_admin_user()
  )
);

-- Criar trigger para notificar status de tópico
CREATE OR REPLACE FUNCTION public.notify_topic_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status != OLD.status AND NEW.status IN ('approved', 'rejected') THEN
    INSERT INTO forum_notifications (
      user_id,
      type,
      title,
      message,
      link,
      data
    ) VALUES (
      NEW.author_id,
      CASE 
        WHEN NEW.status = 'approved' THEN 'topic_approved'
        ELSE 'topic_rejected'
      END,
      CASE 
        WHEN NEW.status = 'approved' THEN '✅ Tópico Aprovado'
        ELSE '❌ Tópico Rejeitado'
      END,
      CASE 
        WHEN NEW.status = 'approved' THEN 'Seu tópico "' || NEW.title || '" foi aprovado e está visível na comunidade!'
        ELSE 'Seu tópico "' || NEW.title || '" foi rejeitado e não foi publicado.'
      END,
      CASE
        WHEN NEW.status = 'approved' THEN 
          '/comunidade/' || (SELECT slug FROM communities WHERE id = NEW.community_id) || '/topico/' || NEW.slug
        ELSE NULL
      END,
      jsonb_build_object(
        'topic_id', NEW.id,
        'status', NEW.status
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_topic_status_change_trigger ON forum_topics;
CREATE TRIGGER notify_topic_status_change_trigger
  AFTER UPDATE ON forum_topics
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_topic_status_change();