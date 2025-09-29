-- Criar buckets para diferentes tipos de arquivos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('products', 'products', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('attachments', 'attachments', false, 52428800, ARRAY['application/pdf', 'application/zip', 'image/*', 'video/mp4']),
  ('community', 'community', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Políticas RLS para avatars
CREATE POLICY "Users can upload own avatar" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own avatar" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own avatar" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view avatars" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'avatars');

-- Políticas para products (apenas admins)
CREATE POLICY "Admins can upload products" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'products' AND
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can update products" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'products' AND
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can delete products" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'products' AND
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Anyone can view products" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'products');

-- Políticas para attachments (usuários com produtos)
CREATE POLICY "Users can upload attachments" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'attachments');

CREATE POLICY "Users can view own attachments" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'attachments');

-- Políticas para community
CREATE POLICY "Users can upload to community" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'community' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view community images" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'community');

-- Adicionar campo de imagem nos posts da comunidade
ALTER TABLE community_posts
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_community_posts_image ON community_posts(image_url) WHERE image_url IS NOT NULL;