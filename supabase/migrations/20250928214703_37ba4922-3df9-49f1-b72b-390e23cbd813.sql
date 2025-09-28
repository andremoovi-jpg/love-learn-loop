-- Tabela de posts
CREATE TABLE public.community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de likes
CREATE TABLE public.post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES community_posts ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Tabela de comentários
CREATE TABLE public.post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES community_posts ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Posts visíveis para autenticados"
ON community_posts FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários podem criar posts"
ON community_posts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem editar próprios posts"
ON community_posts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar próprios posts"
ON community_posts FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Likes visíveis para todos"
ON post_likes FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários podem curtir"
ON post_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem descurtir"
ON post_likes FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Comentários visíveis"
ON post_comments FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários podem comentar"
ON post_comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar próprios comentários"
ON post_comments FOR DELETE
USING (auth.uid() = user_id);

-- Funções RPC
CREATE OR REPLACE FUNCTION increment_likes(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE community_posts
  SET likes_count = likes_count + 1
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION decrement_likes(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE community_posts
  SET likes_count = GREATEST(likes_count - 1, 0)
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para updated_at
CREATE TRIGGER update_community_posts_updated_at
  BEFORE UPDATE ON community_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();