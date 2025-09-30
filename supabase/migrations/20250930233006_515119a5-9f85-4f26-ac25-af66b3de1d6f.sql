-- Criar função auxiliar para verificar se o usuário pode receber notificações da comunidade
CREATE OR REPLACE FUNCTION public.user_can_receive_community_notification(
  p_user_id UUID,
  p_community_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se a comunidade está ativa
  IF NOT EXISTS (
    SELECT 1 FROM communities
    WHERE id = p_community_id AND is_active = true
  ) THEN
    RETURN FALSE;
  END IF;

  -- Verificar se é admin (admins podem receber todas as notificações)
  IF is_admin_user() AND auth.uid() = p_user_id THEN
    RETURN TRUE;
  END IF;

  -- Verificar se é membro ativo da comunidade (não banido)
  IF NOT EXISTS (
    SELECT 1 FROM community_members
    WHERE community_id = p_community_id
      AND user_id = p_user_id
      AND is_banned = false
  ) THEN
    RETURN FALSE;
  END IF;

  -- Verificar se tem acesso ao produto associado à comunidade
  RETURN check_community_access(p_community_id, p_user_id);
END;
$$;

-- Atualizar a função notify_topic_reply para verificar acesso
CREATE OR REPLACE FUNCTION public.notify_topic_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_community_id UUID;
  v_topic_author_id UUID;
BEGIN
  -- Obter community_id e author_id do tópico
  SELECT community_id, author_id INTO v_community_id, v_topic_author_id
  FROM forum_topics
  WHERE id = NEW.topic_id;

  -- Não notificar se o autor da resposta é o mesmo do tópico
  IF NEW.author_id = v_topic_author_id THEN
    RETURN NEW;
  END IF;

  -- Verificar se o autor do tópico pode receber notificações desta comunidade
  IF NOT user_can_receive_community_notification(v_topic_author_id, v_community_id) THEN
    RETURN NEW;
  END IF;

  -- Inserir notificação
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
    '/comunidade/' || (SELECT c.slug FROM communities c WHERE c.id = v_community_id) || '/topico/' || ft.slug,
    jsonb_build_object(
      'topic_id', NEW.topic_id,
      'reply_id', NEW.id,
      'author_id', NEW.author_id
    )
  FROM forum_topics ft
  WHERE ft.id = NEW.topic_id;
  
  RETURN NEW;
END;
$$;

-- Atualizar a função notify_solution_marked para verificar acesso
CREATE OR REPLACE FUNCTION public.notify_solution_marked()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_community_id UUID;
BEGIN
  -- Verificar se a resposta foi marcada como solução agora
  IF NEW.is_solution = true AND (OLD.is_solution IS NULL OR OLD.is_solution = false) THEN
    -- Obter community_id do tópico
    SELECT community_id INTO v_community_id
    FROM forum_topics
    WHERE id = NEW.topic_id;

    -- Verificar se o autor da resposta pode receber notificações desta comunidade
    IF NOT user_can_receive_community_notification(NEW.author_id, v_community_id) THEN
      RETURN NEW;
    END IF;

    -- Inserir notificação
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
      '/comunidade/' || (SELECT c.slug FROM communities c WHERE c.id = v_community_id) || '/topico/' || (SELECT slug FROM forum_topics WHERE id = NEW.topic_id),
      jsonb_build_object(
        'topic_id', NEW.topic_id,
        'reply_id', NEW.id
      )
    FROM forum_topics ft
    WHERE ft.id = NEW.topic_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Atualizar a função notify_topic_like para verificar acesso
CREATE OR REPLACE FUNCTION public.notify_topic_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_community_id UUID;
  v_topic_author_id UUID;
BEGIN
  -- Obter community_id e author_id do tópico
  SELECT community_id, author_id INTO v_community_id, v_topic_author_id
  FROM forum_topics
  WHERE id = NEW.topic_id;

  -- Não notificar se o usuário curtiu seu próprio tópico
  IF NEW.user_id = v_topic_author_id THEN
    RETURN NEW;
  END IF;

  -- Verificar se o autor do tópico pode receber notificações desta comunidade
  IF NOT user_can_receive_community_notification(v_topic_author_id, v_community_id) THEN
    RETURN NEW;
  END IF;

  -- Inserir notificação
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
    '/comunidade/' || (SELECT slug FROM communities WHERE id = v_community_id) || '/topico/' || ft.slug,
    jsonb_build_object(
      'topic_id', NEW.topic_id,
      'user_id', NEW.user_id
    )
  FROM forum_topics ft
  WHERE ft.id = NEW.topic_id;
  
  RETURN NEW;
END;
$$;