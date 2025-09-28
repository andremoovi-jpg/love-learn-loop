import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { trackLessonCompletion } from '@/lib/tracking';

interface LessonProgressHookProps {
  userId?: string;
  productId?: string;
  lessonId?: string;
}

export const useUpdateLastAccessed = () => {
  return async (userId: string, productId: string) => {
    try {
      const { error } = await supabase
        .from('user_products')
        .update({ 
          last_accessed_at: new Date().toISOString() 
        })
        .eq('user_id', userId)
        .eq('product_id', productId);

      if (error) {
        console.error('Error updating last accessed:', error);
      }
    } catch (error) {
      console.error('Error updating last accessed:', error);
    }
  };
};

export const useMarkLessonComplete = () => {
  return async (userId: string, productId: string, lessonId: string) => {
    try {
      await trackLessonCompletion(userId, productId, lessonId);
    } catch (error) {
      console.error('Error marking lesson complete:', error);
    }
  };
};

export const useProductStats = (productId?: string) => {
  return useQuery({
    queryKey: ['product-stats', productId],
    queryFn: async () => {
      if (!productId) return null;

      // Get total users with access to this product
      const { data: totalUsers, error: totalError } = await supabase
        .from('user_products')
        .select('id')
        .eq('product_id', productId);

      if (totalError) {
        console.error('Error fetching total users:', totalError);
        throw totalError;
      }

      // Get completed users
      const { data: completedUsers, error: completedError } = await supabase
        .from('user_products')
        .select('id')
        .eq('product_id', productId)
        .eq('progress', 100);

      if (completedError) {
        console.error('Error fetching completed users:', completedError);
        throw completedError;
      }

      // Get average progress
      const { data: progressData, error: progressError } = await supabase
        .from('user_products')
        .select('progress')
        .eq('product_id', productId);

      if (progressError) {
        console.error('Error fetching progress data:', progressError);
        throw progressError;
      }

      const averageProgress = progressData.length > 0 
        ? progressData.reduce((sum, item) => sum + (item.progress || 0), 0) / progressData.length
        : 0;

      return {
        totalUsers: totalUsers.length,
        completedUsers: completedUsers.length,
        averageProgress: Math.round(averageProgress),
        completionRate: totalUsers.length > 0 
          ? Math.round((completedUsers.length / totalUsers.length) * 100)
          : 0
      };
    },
    enabled: !!productId
  });
};

export const useRecentActivity = (productId?: string) => {
  return useQuery({
    queryKey: ['product-activity', productId],
    queryFn: async () => {
      if (!productId) return [];

      const { data, error } = await supabase
        .from('user_products')
        .select(`
          *,
          profile:profiles(full_name)
        `)
        .eq('product_id', productId)
        .order('last_accessed_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching recent activity:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!productId
  });
};