import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export const useUserProducts = (userId?: string) => {
  return useQuery({
    queryKey: ['user-products', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('user_products')
        .select(`
          *,
          product:products(*)
        `)
        .eq('user_id', userId)
        .order('purchased_at', { ascending: false });

      if (error) {
        console.error('Error fetching user products:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!userId
  });
};

export const useAvailableUpsells = (userId?: string) => {
  return useQuery({
    queryKey: ['available-upsells', userId],
    queryFn: async () => {
      if (!userId) return [];

      // First get user's owned products
      const { data: userProducts, error: userProductsError } = await supabase
        .from('user_products')
        .select('product_id')
        .eq('user_id', userId);

      if (userProductsError) {
        console.error('Error fetching user products for upsells:', userProductsError);
        throw userProductsError;
      }

      const ownedProductIds = userProducts?.map(p => p.product_id) || [];

      if (ownedProductIds.length === 0) {
        return []; // No products owned, no upsells available
      }

      // Get available upsells for owned products
      const { data: upsells, error: upsellsError } = await supabase
        .from('upsells')
        .select(`
          *,
          parent_product:products!parent_product_id(*),
          upsell_product:products!upsell_product_id(*)
        `)
        .in('parent_product_id', ownedProductIds)
        .eq('is_active', true);

      if (upsellsError) {
        console.error('Error fetching upsells:', upsellsError);
        throw upsellsError;
      }

      // Filter out upsells for products user already owns
      const availableUpsells = upsells?.filter(upsell => 
        !ownedProductIds.includes(upsell.upsell_product_id)
      ) || [];

      return availableUpsells;
    },
    enabled: !!userId
  });
};

export const useProductAccess = (userId?: string, productSlug?: string) => {
  return useQuery({
    queryKey: ['product-access', userId, productSlug],
    queryFn: async () => {
      if (!userId || !productSlug) return false;

      // Get product by slug
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id')
        .eq('slug', productSlug)
        .single();

      if (productError || !product) {
        console.error('Error fetching product or product not found:', productError);
        return false;
      }

      // Check if user has access
      const { data: access, error: accessError } = await supabase
        .from('user_products')
        .select('id')
        .eq('user_id', userId)
        .eq('product_id', product.id)
        .single();

      if (accessError && accessError.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error checking product access:', accessError);
        return false;
      }

      return !!access;
    },
    enabled: !!userId && !!productSlug
  });
};