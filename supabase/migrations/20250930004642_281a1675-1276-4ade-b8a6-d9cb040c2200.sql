-- ====================================
-- SISTEMA AVANÇADO DE COMUNIDADES/FÓRUM - CORRIGIDO
-- ====================================

-- 1. TABELA DE COMUNIDADES (Uma por produto)
CREATE TABLE communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,
  cover_image_url TEXT,
  icon_url TEXT,
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{
    "allow_posts": true,
    "require_moderation": false,
    "allow_anonymous": false,
    "enable_badges": true,
    "enable_reactions": true
  }'::jsonb,
  member_count INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA DE CATEGORIAS DO FÓRUM
CREATE TABLE community_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '📝',
  color TEXT DEFAULT '#6366f1',
  sort_order INTEGER DEFAULT 0,
  is_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(community_id, slug)
);

-- 3. TABELA DE TÓPICOS (THREADS)
CREATE TABLE forum_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  category_id UUID REFERENCES community_categories(id) ON DELETE SET NULL,
  author_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT,
  content TEXT NOT NULL,
  content_html TEXT,
  tags TEXT[],
  views_count INTEGER DEFAULT 0,
  replies_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  is_solved BOOLEAN DEFAULT false,
  solved_reply_id UUID,
  last_reply_at TIMESTAMPTZ DEFAULT NOW(),
  last_reply_by UUID REFERENCES profiles(user_id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'hidden', 'deleted')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABELA DE RESPOSTAS
CREATE TABLE forum_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES forum_topics(id) ON DELETE CASCADE,
  parent_reply_id UUID REFERENCES forum_replies(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  content_html TEXT,
  likes_count INTEGER DEFAULT 0,
  is_solution BOOLEAN DEFAULT false,
  is_moderator_post BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  edited_by UUID REFERENCES profiles(user_id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'deleted')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABELA DE MEMBROS DA COMUNIDADE
CREATE TABLE community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'admin')),
  reputation_points INTEGER DEFAULT 0,
  posts_count INTEGER DEFAULT 0,
  replies_count INTEGER DEFAULT 0,
  solutions_count INTEGER DEFAULT 0,
  badges JSONB DEFAULT '[]'::jsonb,
  is_banned BOOLEAN DEFAULT false,
  ban_reason TEXT,
  banned_until TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(community_id, user_id)
);

-- 6. TABELA DE REAÇÕES/VOTOS (SEM CONSTRAINTS CONDICIONAIS)
CREATE TABLE forum_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  topic_id UUID REFERENCES forum_topics(id) ON DELETE CASCADE,
  reply_id UUID REFERENCES forum_replies(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'dislike', 'helpful', 'love', 'laugh')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK ((topic_id IS NOT NULL AND reply_id IS NULL) OR (topic_id IS NULL AND reply_id IS NOT NULL))
);

-- Criar índices únicos separados para as reações
CREATE UNIQUE INDEX idx_unique_reaction_topic 
ON forum_reactions(user_id, topic_id) 
WHERE reply_id IS NULL;

CREATE UNIQUE INDEX idx_unique_reaction_reply 
ON forum_reactions(user_id, reply_id) 
WHERE topic_id IS NULL;

-- 7. TABELA DE NOTIFICAÇÕES DO FÓRUM
CREATE TABLE forum_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABELA DE BADGES/CONQUISTAS
CREATE TABLE community_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  color TEXT DEFAULT '#6366f1',
  criteria JSONB NOT NULL,
  auto_award BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0
);

-- 9. TABELA DE REPORTS/DENÚNCIAS
CREATE TABLE forum_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  topic_id UUID REFERENCES forum_topics(id) ON DELETE CASCADE,
  reply_id UUID REFERENCES forum_replies(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  resolved_by UUID REFERENCES profiles(user_id),
  resolved_at TIMESTAMPTZ,
  action_taken TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================
-- ÍNDICES PARA PERFORMANCE
-- ====================================
CREATE INDEX idx_forum_topics_community ON forum_topics(community_id);
CREATE INDEX idx_forum_topics_category ON forum_topics(category_id);
CREATE INDEX idx_forum_topics_author ON forum_topics(author_id);
CREATE INDEX idx_forum_topics_status ON forum_topics(status);
CREATE INDEX idx_forum_topics_pinned ON forum_topics(is_pinned);
CREATE INDEX idx_forum_topics_solved ON forum_topics(is_solved);

CREATE INDEX idx_forum_replies_topic ON forum_replies(topic_id);
CREATE INDEX idx_forum_replies_author ON forum_replies(author_id);

CREATE INDEX idx_community_members_user ON community_members(user_id);
CREATE INDEX idx_community_members_community ON community_members(community_id);

CREATE INDEX idx_forum_reactions_topic ON forum_reactions(topic_id);
CREATE INDEX idx_forum_reactions_reply ON forum_reactions(reply_id);

-- ====================================
-- TRIGGERS E FUNCTIONS
-- ====================================

-- Criar slug automaticamente para tópicos
CREATE OR REPLACE FUNCTION generate_topic_slug()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_topic_slug
BEFORE INSERT OR UPDATE ON forum_topics
FOR EACH ROW
EXECUTE FUNCTION generate_topic_slug();

-- Criar comunidade automaticamente quando produto é criado
CREATE OR REPLACE FUNCTION create_community_for_product()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_community_on_product
AFTER INSERT ON products
FOR EACH ROW
EXECUTE FUNCTION create_community_for_product();

-- Adicionar membro à comunidade quando compra produto
CREATE OR REPLACE FUNCTION add_community_member_on_purchase()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER add_to_community_on_purchase
AFTER INSERT ON user_products
FOR EACH ROW
EXECUTE FUNCTION add_community_member_on_purchase();

-- Atualizar contadores
CREATE OR REPLACE FUNCTION update_forum_counters()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_counters_on_reply
AFTER INSERT ON forum_replies
FOR EACH ROW
EXECUTE FUNCTION update_forum_counters();

CREATE TRIGGER update_counters_on_topic
AFTER INSERT ON forum_topics
FOR EACH ROW
EXECUTE FUNCTION update_forum_counters();

-- ====================================
-- RLS POLICIES
-- ====================================

-- Comunidades: usuário só vê comunidades dos produtos que tem
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see communities of owned products" ON communities
  FOR SELECT
  USING (
    product_id IN (
      SELECT product_id FROM user_products WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM admin_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage communities" ON communities
  FOR ALL
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

-- Tópicos: só vê de comunidades que participa
ALTER TABLE forum_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see topics of their communities" ON forum_topics
  FOR SELECT
  USING (
    community_id IN (
      SELECT community_id FROM community_members WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM admin_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can create topics" ON forum_topics
  FOR INSERT
  WITH CHECK (
    community_id IN (
      SELECT community_id FROM community_members
      WHERE user_id = auth.uid()
      AND is_banned = false
    )
  );

CREATE POLICY "Authors can update their topics" ON forum_topics
  FOR UPDATE
  USING (author_id = auth.uid() OR is_admin_user());

-- Respostas
ALTER TABLE forum_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see replies in their communities" ON forum_replies
  FOR SELECT
  USING (
    topic_id IN (
      SELECT ft.id FROM forum_topics ft
      JOIN community_members cm ON cm.community_id = ft.community_id
      WHERE cm.user_id = auth.uid()
    )
    OR is_admin_user()
  );

CREATE POLICY "Members can create replies" ON forum_replies
  FOR INSERT
  WITH CHECK (
    topic_id IN (
      SELECT ft.id FROM forum_topics ft
      JOIN community_members cm ON cm.community_id = ft.community_id
      WHERE cm.user_id = auth.uid() AND cm.is_banned = false
    )
  );

-- Membros da comunidade
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own membership" ON community_members
  FOR SELECT
  USING (user_id = auth.uid() OR is_admin_user());

CREATE POLICY "System can manage members" ON community_members
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Reações
ALTER TABLE forum_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see reactions in their communities" ON forum_reactions
  FOR SELECT
  USING (
    (topic_id IN (
      SELECT ft.id FROM forum_topics ft
      JOIN community_members cm ON cm.community_id = ft.community_id
      WHERE cm.user_id = auth.uid()
    ))
    OR
    (reply_id IN (
      SELECT fr.id FROM forum_replies fr
      JOIN forum_topics ft ON ft.id = fr.topic_id
      JOIN community_members cm ON cm.community_id = ft.community_id
      WHERE cm.user_id = auth.uid()
    ))
    OR is_admin_user()
  );

CREATE POLICY "Users can manage their own reactions" ON forum_reactions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Categorias
ALTER TABLE community_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see categories of their communities" ON community_categories
  FOR SELECT
  USING (
    community_id IN (
      SELECT community_id FROM community_members WHERE user_id = auth.uid()
    )
    OR is_admin_user()
  );

CREATE POLICY "Admins can manage categories" ON community_categories
  FOR ALL
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

-- Notificações do fórum
ALTER TABLE forum_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own forum notifications" ON forum_notifications
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON forum_notifications
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their notifications" ON forum_notifications
  FOR UPDATE
  USING (user_id = auth.uid());

-- Reports
ALTER TABLE forum_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create reports" ON forum_reports
  FOR INSERT
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Admins see all reports" ON forum_reports
  FOR SELECT
  USING (is_admin_user());

-- Badges
ALTER TABLE community_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can see badges" ON community_badges
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage badges" ON community_badges
  FOR ALL
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

-- ====================================
-- CRIAR CATEGORIAS PADRÃO PARA PRODUTOS EXISTENTES
-- ====================================

-- Criar comunidades para produtos existentes
INSERT INTO communities (product_id, name, description, slug, cover_image_url)
SELECT 
  p.id,
  'Comunidade ' || p.name,
  'Comunidade exclusiva para alunos do ' || p.name,
  LOWER(REGEXP_REPLACE(p.slug || '-community', '[^a-z0-9-]', '-', 'g')),
  p.cover_image_url
FROM products p
WHERE NOT EXISTS (
  SELECT 1 FROM communities c WHERE c.product_id = p.id
);

-- Adicionar usuários existentes às suas comunidades
INSERT INTO community_members (community_id, user_id, role)
SELECT DISTINCT 
  c.id,
  up.user_id,
  'member'
FROM communities c
JOIN user_products up ON up.product_id = c.product_id
WHERE NOT EXISTS (
  SELECT 1 FROM community_members cm 
  WHERE cm.community_id = c.id AND cm.user_id = up.user_id
);