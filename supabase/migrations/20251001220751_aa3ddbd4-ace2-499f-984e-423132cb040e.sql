-- Corrigir função update_campaign_stats para ter search_path seguro
CREATE OR REPLACE FUNCTION update_campaign_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Quando um send muda de status, atualizar a campanha
  UPDATE campaigns
  SET
    total_sent = (
      SELECT COUNT(*)
      FROM campaign_sends
      WHERE campaign_id = NEW.campaign_id
        AND status IN ('sent', 'delivered', 'opened', 'clicked')
    ),
    total_delivered = (
      SELECT COUNT(*)
      FROM campaign_sends
      WHERE campaign_id = NEW.campaign_id
        AND status IN ('delivered', 'opened', 'clicked')
    ),
    total_failed = (
      SELECT COUNT(*)
      FROM campaign_sends
      WHERE campaign_id = NEW.campaign_id
        AND status IN ('failed', 'bounced')
    ),
    total_opened = (
      SELECT COUNT(*)
      FROM campaign_sends
      WHERE campaign_id = NEW.campaign_id
        AND status IN ('opened', 'clicked')
    ),
    total_clicked = (
      SELECT COUNT(*)
      FROM campaign_sends
      WHERE campaign_id = NEW.campaign_id
        AND status = 'clicked'
    ),
    updated_at = NOW()
  WHERE id = NEW.campaign_id;
  
  RETURN NEW;
END;
$$;