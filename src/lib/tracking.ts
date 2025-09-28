import { supabase } from '@/integrations/supabase/client';

export const trackUpsellView = async (userId: string, upsellId: string) => {
  try {
    const { error } = await supabase
      .from('user_upsell_views')
      .upsert({
        user_id: userId,
        upsell_id: upsellId,
        viewed_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,upsell_id'
      });

    if (error) {
      console.error('Error tracking upsell view:', error);
    } else {
      console.log('✅ Upsell view tracked:', upsellId);
    }
  } catch (error) {
    console.error('Error tracking upsell view:', error);
  }
};

export const trackUpsellClick = async (userId: string, upsellId: string) => {
  try {
    const { error } = await supabase
      .from('user_upsell_views')
      .upsert({
        user_id: userId,
        upsell_id: upsellId,
        clicked: true,
        clicked_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,upsell_id'
      });

    if (error) {
      console.error('Error tracking upsell click:', error);
    } else {
      console.log('✅ Upsell click tracked:', upsellId);
    }
  } catch (error) {
    console.error('Error tracking upsell click:', error);
  }
};

export const trackLessonCompletion = async (userId: string, productId: string, lessonId: string) => {
  try {
    // Get current completed lessons
    const { data: userProduct, error: fetchError } = await supabase
      .from('user_products')
      .select('completed_lessons, progress')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .single();

    if (fetchError) {
      console.error('Error fetching user product for lesson tracking:', fetchError);
      return;
    }

    const completedLessons = userProduct.completed_lessons || [];
    
    if (!completedLessons.includes(lessonId)) {
      const updatedLessons = [...completedLessons, lessonId];
      
      // Calculate new progress (this is a simple calculation - you might want to make it more sophisticated)
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('content')
        .eq('id', productId)
        .single();

      let newProgress = userProduct.progress;
      if (!productError && product?.content && typeof product.content === 'object') {
        const content = product.content as any;
        if (content.modules && Array.isArray(content.modules)) {
          const totalLessons = content.modules.reduce((total: number, module: any) => 
            total + (module.lessons?.length || 0), 0
          );
          newProgress = totalLessons > 0 ? Math.round((updatedLessons.length / totalLessons) * 100) : 0;
        }
      }

      // Update completed lessons and progress
      const { error: updateError } = await supabase
        .from('user_products')
        .update({
          completed_lessons: updatedLessons,
          progress: newProgress,
          last_accessed_at: new Date().toISOString(),
          ...(newProgress === 100 ? { completed_at: new Date().toISOString() } : {})
        })
        .eq('user_id', userId)
        .eq('product_id', productId);

      if (updateError) {
        console.error('Error updating lesson completion:', updateError);
      } else {
        console.log('✅ Lesson completion tracked:', lessonId);
      }
    }
  } catch (error) {
    console.error('Error tracking lesson completion:', error);
  }
};

export const checkProductAccess = async (userId: string, productSlug: string): Promise<boolean> => {
  try {
    // Get product by slug
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id')
      .eq('slug', productSlug)
      .single();

    if (productError || !product) {
      console.error('Product not found:', productSlug);
      return false;
    }

    // Check if user has access
    const { data: access, error: accessError } = await supabase
      .from('user_products')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', product.id)
      .single();

    if (accessError && accessError.code !== 'PGRST116') { // PGRST116 is "not found" error
      console.error('Error checking product access:', accessError);
      return false;
    }

    return !!access;
  } catch (error) {
    console.error('Error checking product access:', error);
    return false;
  }
};