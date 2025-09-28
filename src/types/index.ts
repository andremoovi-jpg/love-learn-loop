import { User as SupabaseUser } from '@supabase/supabase-js';

// Extended User type that combines Supabase User with profile data
export interface User extends SupabaseUser {
  full_name?: string;
  avatar_url?: string;
  phone?: string;
  total_points?: number;
  is_admin?: boolean;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  cover_image_url?: string;
  product_type: string;
  total_modules?: number; // Made optional since it's calculated from content
  estimated_duration?: string;
  level?: string;
  content?: any;
  progress?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UserProduct {
  id: string;
  user_id: string;
  product_id: string;
  progress: number;
  completed_lessons: string[];
  purchased_at: string;
  completed_at?: string;
  last_accessed_at?: string;
  product: Product;
}

export interface Upsell {
  id: string;
  title: string;
  description?: string;
  price: number;
  discount_percentage?: number;
  parent_product_id: string;
  upsell_product_id: string;
  cartpanda_checkout_url?: string;
  is_active: boolean;
  parent_product: Product;
  upsell_product: Product;
}

export interface Achievement {
  id: string;
  name: string;
  description?: string;
  icon: string;
  points: number;
  condition_type: string;
  condition_value?: number;
  is_active: boolean;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  achievement: Achievement;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message?: string;
  type: string;
  is_read: boolean;
  created_at: string;
}