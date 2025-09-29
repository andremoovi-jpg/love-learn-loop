-- Corrigir função can_access_product para ter search_path definido
CREATE OR REPLACE FUNCTION can_access_product(product_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_access BOOLEAN;
BEGIN
  SELECT
    CASE
      WHEN EXISTS (
        SELECT 1 FROM admin_users
        WHERE user_id = auth.uid()
      ) THEN true
      WHEN EXISTS (
        SELECT 1 FROM user_products
        WHERE user_products.product_id = product_id_param
        AND user_products.user_id = auth.uid()
      ) THEN true
      ELSE false
    END INTO has_access;

  RETURN has_access;
END;
$$;