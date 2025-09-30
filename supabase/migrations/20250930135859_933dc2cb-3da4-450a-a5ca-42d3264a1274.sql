-- Corrigir alerta de segurança: Ativar RLS na tabela de arquivo
ALTER TABLE community_posts_archive ENABLE ROW LEVEL SECURITY;

-- Política para admins verem o arquivo
CREATE POLICY "Only admins can view archived posts" ON community_posts_archive
  FOR SELECT
  USING (is_admin_user());