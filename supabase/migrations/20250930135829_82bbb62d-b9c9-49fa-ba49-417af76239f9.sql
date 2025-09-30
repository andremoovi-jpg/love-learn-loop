-- ===================================================================
-- CORREÇÕES FINAIS DO FÓRUM/COMUNIDADE
-- ===================================================================

-- 1. ARQUIVAR POSTS DA COMUNIDADE GERAL (BACKUP)
CREATE TABLE IF NOT EXISTS community_posts_archive (
  LIKE community_posts INCLUDING ALL
);

INSERT INTO community_posts_archive
SELECT * FROM community_posts
ON CONFLICT DO NOTHING;

-- 2. POLÍTICAS RLS PARA SOFT DELETE EM FORUM_TOPICS
DROP POLICY IF EXISTS "Users can soft delete own topics" ON forum_topics;
CREATE POLICY "Users can soft delete own topics" ON forum_topics
  FOR UPDATE
  USING (
    author_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    author_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid()
    )
  );

-- 3. POLÍTICAS RLS PARA SOFT DELETE EM FORUM_REPLIES
DROP POLICY IF EXISTS "Users can soft delete own replies" ON forum_replies;
CREATE POLICY "Users can soft delete own replies" ON forum_replies
  FOR UPDATE
  USING (
    author_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    author_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid()
    )
  );

-- 4. GARANTIR QUE FORUM_TOPICS TEM COLUNA STATUS
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'forum_topics' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE forum_topics ADD COLUMN status TEXT DEFAULT 'active';
  END IF;
END $$;

-- 5. GARANTIR QUE FORUM_REPLIES TEM COLUNA STATUS
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'forum_replies' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE forum_replies ADD COLUMN status TEXT DEFAULT 'active';
  END IF;
END $$;

-- 6. FILTRAR APENAS TÓPICOS/RESPOSTAS ATIVAS NAS QUERIES (VIA SELECT POLICY)
DROP POLICY IF EXISTS "Users see approved topics or own topics" ON forum_topics;
CREATE POLICY "Users see approved topics or own topics" ON forum_topics
  FOR SELECT
  USING (
    (
      (status = 'approved' OR status = 'active')
      OR author_id = auth.uid() 
      OR is_admin_user()
    )
    AND (
      community_id IN (
        SELECT community_id FROM community_members
        WHERE user_id = auth.uid()
      )
      OR is_admin_user()
    )
  );

DROP POLICY IF EXISTS "Users see replies in their communities" ON forum_replies;
CREATE POLICY "Users see replies in their communities" ON forum_replies
  FOR SELECT
  USING (
    status != 'deleted'
    AND (
      topic_id IN (
        SELECT ft.id FROM forum_topics ft
        JOIN community_members cm ON cm.community_id = ft.community_id
        WHERE cm.user_id = auth.uid()
      )
      OR is_admin_user()
    )
  );