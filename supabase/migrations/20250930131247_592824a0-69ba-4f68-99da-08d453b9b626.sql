-- Corrigir search_path das funções para segurança

-- 1. Atualizar função add_community_member_on_purchase
CREATE OR REPLACE FUNCTION public.add_community_member_on_purchase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_community_id UUID;
BEGIN
  SELECT id INTO v_community_id
  FROM communities
  WHERE product_id = NEW.product_id;

  IF v_community_id IS NOT NULL THEN
    INSERT INTO community_members (
      community_id,
      user_id,
      role
    ) VALUES (
      v_community_id,
      NEW.user_id,
      'member'
    ) ON CONFLICT (community_id, user_id) DO NOTHING;

    UPDATE communities
    SET member_count = member_count + 1
    WHERE id = v_community_id;
  END IF;

  RETURN NEW;
END;
$function$;

-- 2. Atualizar função update_forum_counters
CREATE OR REPLACE FUNCTION public.update_forum_counters()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF TG_OP = 'INSERT' AND TG_TABLE_NAME = 'forum_replies' THEN
    UPDATE forum_topics
    SET
      replies_count = replies_count + 1,
      last_reply_at = NOW(),
      last_reply_by = NEW.author_id
    WHERE id = NEW.topic_id;

    UPDATE community_members
    SET
      replies_count = replies_count + 1,
      last_activity_at = NOW()
    WHERE user_id = NEW.author_id
    AND community_id = (
      SELECT community_id FROM forum_topics WHERE id = NEW.topic_id
    );
  ELSIF TG_OP = 'INSERT' AND TG_TABLE_NAME = 'forum_topics' THEN
    UPDATE communities
    SET post_count = post_count + 1
    WHERE id = NEW.community_id;

    UPDATE community_members
    SET
      posts_count = posts_count + 1,
      last_activity_at = NOW()
    WHERE user_id = NEW.author_id
    AND community_id = NEW.community_id;
  END IF;

  RETURN NEW;
END;
$function$;

-- 3. Atualizar função create_community_for_product
CREATE OR REPLACE FUNCTION public.create_community_for_product()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO communities (
    product_id,
    name,
    description,
    slug,
    cover_image_url
  ) VALUES (
    NEW.id,
    'Comunidade ' || NEW.name,
    'Comunidade exclusiva para alunos do ' || NEW.name,
    LOWER(REGEXP_REPLACE(NEW.slug || '-community', '[^a-z0-9-]', '-', 'g')),
    NEW.cover_image_url
  );

  RETURN NEW;
END;
$function$;

-- 4. Atualizar função generate_topic_slug
CREATE OR REPLACE FUNCTION public.generate_topic_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug = LOWER(REGEXP_REPLACE(NEW.title, '[^a-zA-Z0-9]+', '-', 'g'));
    NEW.slug = TRIM(NEW.slug, '-');
    
    -- Garantir unicidade do slug
    WHILE EXISTS (
      SELECT 1 FROM forum_topics 
      WHERE slug = NEW.slug AND community_id = NEW.community_id AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
    ) LOOP
      NEW.slug = NEW.slug || '-' || EXTRACT(EPOCH FROM NOW())::bigint;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;