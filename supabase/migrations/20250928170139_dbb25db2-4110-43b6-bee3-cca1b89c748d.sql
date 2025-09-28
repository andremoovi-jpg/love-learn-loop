-- Create webhook logs table for monitoring
CREATE TABLE public.webhook_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  processed boolean DEFAULT false,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Only admins can view webhook logs" 
ON public.webhook_logs 
FOR SELECT 
USING (is_admin_user());

CREATE POLICY "Only admins can manage webhook logs" 
ON public.webhook_logs 
FOR ALL 
USING (is_admin_user());

-- Create user upsell views tracking table
CREATE TABLE public.user_upsell_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  upsell_id uuid NOT NULL REFERENCES public.upsells(id),
  viewed_at timestamp with time zone NOT NULL DEFAULT now(),
  clicked boolean DEFAULT false,
  clicked_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, upsell_id)
);

-- Enable RLS
ALTER TABLE public.user_upsell_views ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own upsell views" 
ON public.user_upsell_views 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own upsell views" 
ON public.user_upsell_views 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own upsell views" 
ON public.user_upsell_views 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Only admins can manage all upsell views" 
ON public.user_upsell_views 
FOR ALL 
USING (is_admin_user());

-- Add triggers for updated_at
CREATE TRIGGER update_webhook_logs_updated_at
BEFORE UPDATE ON public.webhook_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_upsell_views_updated_at
BEFORE UPDATE ON public.user_upsell_views
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();