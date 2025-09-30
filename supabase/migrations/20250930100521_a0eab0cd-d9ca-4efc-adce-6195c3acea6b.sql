-- Criar triggers para notificações automáticas do fórum

-- Trigger 1: Notificar autor quando alguém responde seu tópico
CREATE OR REPLACE FUNCTION notify_topic_reply()
RETURNS TRIGGER AS $$
BEGIN
  -- Só notificar se não for o próprio autor respondendo
  IF NEW.author_id != (SELECT author_id FROM forum_topics WHERE id = NEW.topic_id) THEN
    INSERT INTO forum_notifications (
      user_id,
      type,
      title,
      message,
      link,
      data
    )
    SELECT 
      ft.author_id,
      'reply',
      'Nova resposta no seu tópico',
      (SELECT full_name FROM profiles WHERE user_id = NEW.author_id) || ' respondeu: ' || LEFT(NEW.content, 100),
      '/comunidade/' || (SELECT c.slug FROM communities c JOIN forum_topics ft2 ON ft2.community_id = c.id WHERE ft2.id = NEW.topic_id) || '/topico/' || ft.slug,
      jsonb_build_object(
        'topic_id', NEW.topic_id,
        'reply_id', NEW.id,
        'author_id', NEW.author_id
      )
    FROM forum_topics ft
    WHERE ft.id = NEW.topic_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_forum_reply_created
  AFTER INSERT ON forum_replies
  FOR EACH ROW
  EXECUTE FUNCTION notify_topic_reply();

-- Trigger 2: Notificar autor da resposta quando ela é marcada como solução
CREATE OR REPLACE FUNCTION notify_solution_marked()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar se is_solution mudou para true
  IF NEW.is_solution = true AND (OLD.is_solution IS NULL OR OLD.is_solution = false) THEN
    INSERT INTO forum_notifications (
      user_id,
      type,
      title,
      message,
      link,
      data
    )
    SELECT 
      NEW.author_id,
      'solution',
      '🎉 Sua resposta foi marcada como solução!',
      'Sua resposta no tópico "' || (SELECT title FROM forum_topics WHERE id = NEW.topic_id) || '" ajudou resolver o problema!',
      '/comunidade/' || (SELECT c.slug FROM communities c JOIN forum_topics ft ON ft.community_id = c.id WHERE ft.id = NEW.topic_id) || '/topico/' || (SELECT slug FROM forum_topics WHERE id = NEW.topic_id),
      jsonb_build_object(
        'topic_id', NEW.topic_id,
        'reply_id', NEW.id
      )
    FROM forum_topics ft
    WHERE ft.id = NEW.topic_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_solution_marked
  AFTER UPDATE ON forum_replies
  FOR EACH ROW
  EXECUTE FUNCTION notify_solution_marked();

-- Trigger 3: Notificar quando alguém curte um tópico
CREATE OR REPLACE FUNCTION notify_topic_like()
RETURNS TRIGGER AS $$
BEGIN
  -- Só notificar se não for o próprio autor curtindo
  IF NEW.user_id != (SELECT author_id FROM forum_topics WHERE id = NEW.topic_id) THEN
    INSERT INTO forum_notifications (
      user_id,
      type,
      title,
      message,
      link,
      data
    )
    SELECT 
      ft.author_id,
      'like',
      '❤️ Seu tópico recebeu uma curtida',
      (SELECT full_name FROM profiles WHERE user_id = NEW.user_id) || ' curtiu seu tópico: "' || ft.title || '"',
      '/comunidade/' || (SELECT slug FROM communities WHERE id = ft.community_id) || '/topico/' || ft.slug,
      jsonb_build_object(
        'topic_id', NEW.topic_id,
        'user_id', NEW.user_id
      )
    FROM forum_topics ft
    WHERE ft.id = NEW.topic_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_topic_like_created
  AFTER INSERT ON forum_reactions
  FOR EACH ROW
  WHEN (NEW.topic_id IS NOT NULL AND NEW.reaction_type = 'like')
  EXECUTE FUNCTION notify_topic_like();

-- Habilitar Realtime para a tabela forum_notifications
ALTER PUBLICATION supabase_realtime ADD TABLE forum_notifications;