-- Criar policy para admins visualizarem todos os user_products
CREATE POLICY "Admins can view all user products"
ON public.user_products
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  )
);