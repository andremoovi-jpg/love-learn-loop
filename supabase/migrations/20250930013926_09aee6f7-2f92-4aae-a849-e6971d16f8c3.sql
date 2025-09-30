-- Function to increment topic views
CREATE OR REPLACE FUNCTION public.increment_topic_views(topic_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE forum_topics
  SET views_count = views_count + 1
  WHERE id = topic_id_param;
END;
$$;