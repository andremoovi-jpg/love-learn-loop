-- Adicionar colunas de moderação em forum_topics
ALTER TABLE forum_topics
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES profiles(user_id);