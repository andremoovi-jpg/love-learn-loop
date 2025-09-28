-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  total_points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create products table for digital content
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  cover_image_url TEXT,
  product_type TEXT NOT NULL CHECK (product_type IN ('course', 'ebook', 'mentoring', 'template', 'software')),
  level TEXT CHECK (level IN ('Iniciante', 'Intermediário', 'Avançado')),
  estimated_duration TEXT,
  content JSONB, -- Stores modules, lessons, etc.
  is_active BOOLEAN DEFAULT true,
  cartpanda_product_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Create policies for products (publicly readable for active products)
CREATE POLICY "Active products are viewable by everyone" 
ON public.products 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Only admins can manage products" 
ON public.products 
FOR ALL 
USING (is_admin_user());

-- Create user_products table for tracking purchases and progress
CREATE TABLE public.user_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products ON DELETE CASCADE,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  completed_lessons TEXT[] DEFAULT '{}',
  completed_at TIMESTAMP WITH TIME ZONE,
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  cartpanda_order_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Enable RLS on user_products
ALTER TABLE public.user_products ENABLE ROW LEVEL SECURITY;

-- Create policies for user_products
CREATE POLICY "Users can view their own products" 
ON public.user_products 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own products" 
ON public.user_products 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Only admins can insert user products" 
ON public.user_products 
FOR INSERT 
WITH CHECK (is_admin_user());

CREATE POLICY "Only admins can delete user products" 
ON public.user_products 
FOR DELETE 
USING (is_admin_user());

-- Create upsells table for special offers
CREATE TABLE public.upsells (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_product_id UUID NOT NULL REFERENCES public.products ON DELETE CASCADE,
  upsell_product_id UUID NOT NULL REFERENCES public.products ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  discount_percentage INTEGER DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  cartpanda_checkout_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(parent_product_id, upsell_product_id)
);

-- Enable RLS on upsells
ALTER TABLE public.upsells ENABLE ROW LEVEL SECURITY;

-- Create policies for upsells
CREATE POLICY "Active upsells are viewable by authenticated users" 
ON public.upsells 
FOR SELECT 
USING (is_active = true AND auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can manage upsells" 
ON public.upsells 
FOR ALL 
USING (is_admin_user());

-- Create achievements table for gamification
CREATE TABLE public.achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '🏆',
  points INTEGER DEFAULT 0,
  condition_type TEXT NOT NULL CHECK (condition_type IN ('first_purchase', 'complete_course', 'complete_lessons', 'earn_points', 'login_streak')),
  condition_value INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on achievements
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

-- Create policies for achievements
CREATE POLICY "Active achievements are viewable by authenticated users" 
ON public.achievements 
FOR SELECT 
USING (is_active = true AND auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can manage achievements" 
ON public.achievements 
FOR ALL 
USING (is_admin_user());

-- Create user_achievements table to track unlocked achievements
CREATE TABLE public.user_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements ON DELETE CASCADE,
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- Enable RLS on user_achievements
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Create policies for user_achievements
CREATE POLICY "Users can view their own achievements" 
ON public.user_achievements 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Only admins can manage user achievements" 
ON public.user_achievements 
FOR ALL 
USING (is_admin_user());

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Only admins can create notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (is_admin_user());

CREATE POLICY "Only admins can delete notifications" 
ON public.notifications 
FOR DELETE 
USING (is_admin_user());

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_products_updated_at
BEFORE UPDATE ON public.user_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_upsells_updated_at
BEFORE UPDATE ON public.upsells
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_achievements_updated_at
BEFORE UPDATE ON public.achievements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create user profile automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert some sample data
INSERT INTO public.products (name, slug, description, cover_image_url, product_type, level, estimated_duration, content) VALUES
('Curso Completo de Marketing Digital', 'marketing-digital-completo', 'Aprenda as estratégias mais avançadas de marketing digital e transforme seu negócio.', 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=450&fit=crop', 'course', 'Intermediário', '8 horas', '{"modules": [
  {
    "title": "Introdução ao Marketing Digital",
    "lessons": [
      {"title": "O que é Marketing Digital", "type": "video", "url": "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4", "duration": "10min", "description": "Conceitos fundamentais do marketing digital moderno."},
      {"title": "Principais Canais Digitais", "type": "video", "url": "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4", "duration": "15min", "description": "Visão geral dos principais canais de marketing digital."}
    ]
  },
  {
    "title": "SEO e Otimização",
    "lessons": [
      {"title": "Fundamentos de SEO", "type": "video", "url": "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4", "duration": "20min", "description": "Como otimizar seu site para mecanismos de busca."},
      {"title": "Pesquisa de Palavras-chave", "type": "video", "url": "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4", "duration": "18min", "description": "Técnicas para encontrar as melhores keywords."}
    ]
  }
]}'),
('E-book: Vendas que Convertem', 'ebook-vendas-convertem', 'Guia completo com técnicas comprovadas para aumentar suas conversões.', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=450&fit=crop', 'ebook', 'Iniciante', '2 horas', '{"modules": [
  {
    "title": "Fundamentos de Conversão",
    "lessons": [
      {"title": "Psicologia da Venda", "type": "text", "content": "Entenda como funciona a mente do consumidor...", "duration": "15min", "description": "Princípios psicológicos aplicados às vendas."},
      {"title": "Funis de Conversão", "type": "text", "content": "Como estruturar um funil eficiente...", "duration": "20min", "description": "Estratégias para criar funis que convertem."}
    ]
  }
]}');

-- Insert sample achievements
INSERT INTO public.achievements (name, description, icon, points, condition_type, condition_value) VALUES
('Primeiro Passo', 'Comprou seu primeiro produto', '🎯', 100, 'first_purchase', 1),
('Estudioso', 'Completou 5 aulas', '📚', 250, 'complete_lessons', 5),
('Dedicado', 'Completou um curso inteiro', '🎓', 500, 'complete_course', 1),
('Colecionador', 'Completou 3 cursos', '🏆', 1000, 'complete_course', 3),
('Pontuador', 'Alcançou 1000 pontos', '⭐', 200, 'earn_points', 1000);

-- Insert sample upsells
INSERT INTO public.upsells (parent_product_id, upsell_product_id, title, description, price, discount_percentage, cartpanda_checkout_url) 
SELECT 
  p1.id, 
  p2.id, 
  'Combo Completo: Marketing + Vendas', 
  'Aprimore seus resultados combinando marketing digital com técnicas de venda que convertem.', 
  197.00, 
  30, 
  'https://cartpanda.com/checkout/combo-marketing-vendas'
FROM public.products p1, public.products p2 
WHERE p1.slug = 'marketing-digital-completo' AND p2.slug = 'ebook-vendas-convertem';