-- 1. Adicionar coluna includes_community aos produtos
ALTER TABLE products ADD COLUMN IF NOT EXISTS includes_community boolean DEFAULT false;

-- 2. Criar enum para status dos posts da comunidade
DO $$ BEGIN
  CREATE TYPE post_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Adicionar coluna status aos community_posts
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS status post_status DEFAULT 'pending';
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS reviewed_at timestamp with time zone;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES profiles(user_id);

-- 4. Atualizar posts existentes para approved
UPDATE community_posts SET status = 'approved' WHERE status IS NULL;

-- 5. Atualizar RLS policy de community_posts para mostrar apenas aprovados aos usuários
DROP POLICY IF EXISTS "Posts visíveis para autenticados" ON community_posts;

CREATE POLICY "Posts aprovados visíveis para autenticados"
ON community_posts
FOR SELECT
TO authenticated
USING (
  status = 'approved' 
  OR user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  )
);

-- 6. Criar função para notificar usuário sobre aprovação/rejeição
CREATE OR REPLACE FUNCTION notify_post_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status != OLD.status AND NEW.status IN ('approved', 'rejected') THEN
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type
    ) VALUES (
      NEW.user_id,
      CASE 
        WHEN NEW.status = 'approved' THEN '✅ Post Aprovado'
        ELSE '❌ Post Rejeitado'
      END,
      CASE 
        WHEN NEW.status = 'approved' THEN 'Seu post foi aprovado e está visível na comunidade!'
        ELSE 'Seu post foi rejeitado e não foi publicado na comunidade.'
      END,
      CASE 
        WHEN NEW.status = 'approved' THEN 'success'
        ELSE 'error'
      END
    );
  END IF;
  RETURN NEW;
END;
$$;

-- 7. Criar trigger para notificações
DROP TRIGGER IF EXISTS notify_post_status ON community_posts;
CREATE TRIGGER notify_post_status
AFTER UPDATE ON community_posts
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION notify_post_status_change();

-- 8. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_community_posts_status ON community_posts(status);
CREATE INDEX IF NOT EXISTS idx_products_includes_community ON products(includes_community);

-- 9. Atualizar RLS de communities para verificar acesso via produtos
DROP POLICY IF EXISTS "Users see communities of owned products" ON communities;

CREATE POLICY "Users see communities of owned products"
ON communities
FOR SELECT
TO authenticated
USING (
  -- Produto incluir comunidade E usuário ter comprado
  product_id IN (
    SELECT up.product_id 
    FROM user_products up
    JOIN products p ON p.id = up.product_id
    WHERE up.user_id = auth.uid()
    AND p.includes_community = true
  )
  OR EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  )
);

-- 10. Atualizar RLS de community_members
DROP POLICY IF EXISTS "System can manage members" ON community_members;

CREATE POLICY "Users join communities when they buy products with community"
ON community_members
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND community_id IN (
    SELECT c.id
    FROM communities c
    JOIN products p ON p.id = c.product_id
    JOIN user_products up ON up.product_id = p.id
    WHERE up.user_id = auth.uid()
    AND p.includes_community = true
  )
);

CREATE POLICY "System and admins manage members"
ON community_members
FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
);