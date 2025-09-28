-- ULTIMATE SECURITY FIX: Block all direct table access for anon users
-- Force use of secure functions and views only

-- Remove the permissive anon policy that allows direct table access
DROP POLICY IF EXISTS "Public can view active products only" ON public.products;

-- Only allow authenticated users to access products table directly
-- Anon users must use the secure functions/views
-- (The authenticated policy remains to allow purchased content access)

-- Important: Revoke direct table access for anon users
REVOKE SELECT ON public.products FROM anon;

-- Ensure anon users can only use the safe functions and views
GRANT SELECT ON public.products_public TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_products() TO anon;
GRANT EXECUTE ON FUNCTION public.get_product_with_access_control(text) TO anon;

-- For authenticated users, keep the existing policy
-- (They should still be restricted by the purchase requirement)