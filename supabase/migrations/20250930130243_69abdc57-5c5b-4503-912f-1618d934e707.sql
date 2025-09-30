-- Criar categoria padrão "Geral" para todas as comunidades existentes
DO $$
DECLARE
  community_record RECORD;
  new_category_id UUID;
BEGIN
  -- Para cada comunidade sem categoria
  FOR community_record IN 
    SELECT id, name 
    FROM communities 
    WHERE NOT EXISTS (
      SELECT 1 FROM community_categories 
      WHERE community_id = communities.id
    )
  LOOP
    -- Criar categoria "Geral"
    INSERT INTO community_categories (
      community_id,
      name,
      slug,
      description,
      icon,
      color,
      sort_order,
      is_locked
    ) VALUES (
      community_record.id,
      'Geral',
      'geral',
      'Categoria geral para discussões',
      '📝',
      '#6366f1',
      0,
      false
    )
    RETURNING id INTO new_category_id;

    -- Atualizar tópicos sem categoria nesta comunidade
    UPDATE forum_topics
    SET category_id = new_category_id
    WHERE community_id = community_record.id 
      AND category_id IS NULL;
  END LOOP;
END $$;