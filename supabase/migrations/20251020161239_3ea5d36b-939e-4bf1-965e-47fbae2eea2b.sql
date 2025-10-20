-- ====================================================================
-- MIGRATION: PAYMENT INTEGRATIONS & WEBHOOKS
-- Data: 20 de Outubro de 2025
-- Objetivo: Sistema completo de integração com plataformas de pagamento
-- ====================================================================

-- ====================================================================
-- 1. TABELA: payment_integrations
-- ====================================================================

CREATE TABLE IF NOT EXISTS payment_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  platform_type TEXT NOT NULL,
  webhook_url TEXT NOT NULL,
  webhook_secret TEXT,
  api_key TEXT,
  api_token TEXT,
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  last_webhook_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_integrations_platform ON payment_integrations(platform_type);
CREATE INDEX IF NOT EXISTS idx_payment_integrations_active ON payment_integrations(is_active);

COMMENT ON TABLE payment_integrations IS 'Configurações de integrações com plataformas de pagamento';

-- ====================================================================
-- 2. TABELA: webhook_events
-- ====================================================================

CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID REFERENCES payment_integrations(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  raw_payload JSONB NOT NULL,
  normalized_payload JSONB,
  processed BOOLEAN DEFAULT FALSE,
  processing_attempts INTEGER DEFAULT 0,
  user_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  product_ids UUID[],
  order_id TEXT,
  error_message TEXT,
  error_details JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_integration ON webhook_events(integration_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_user ON webhook_events(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created ON webhook_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_events_order ON webhook_events(order_id);

COMMENT ON TABLE webhook_events IS 'Log completo de webhooks recebidos das plataformas';

-- ====================================================================
-- 3. TABELA: product_mappings
-- ====================================================================

CREATE TABLE IF NOT EXISTS product_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES payment_integrations(id) ON DELETE CASCADE,
  external_product_id TEXT NOT NULL,
  external_product_name TEXT,
  auto_grant_access BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(integration_id, external_product_id)
);

CREATE INDEX IF NOT EXISTS idx_product_mappings_product ON product_mappings(product_id);
CREATE INDEX IF NOT EXISTS idx_product_mappings_integration ON product_mappings(integration_id);
CREATE INDEX IF NOT EXISTS idx_product_mappings_external ON product_mappings(external_product_id);

-- ====================================================================
-- 4. TABELA: campaigns (garantindo estrutura completa)
-- ====================================================================

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('email', 'whatsapp', 'both')),
  filters JSONB NOT NULL DEFAULT '{}',
  email_subject TEXT,
  email_template TEXT,
  email_attachments JSONB DEFAULT '[]',
  whatsapp_template TEXT,
  whatsapp_media_type TEXT DEFAULT 'text' CHECK (whatsapp_media_type IN ('text', 'image', 'video', 'audio', 'document')),
  whatsapp_media_url TEXT,
  whatsapp_media_filename TEXT,
  variables JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'scheduled', 'sending', 'paused', 'completed', 'failed', 'cancelled')
  ),
  scheduled_for TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  paused_at TIMESTAMP,
  n8n_workflow_id TEXT,
  n8n_execution_id TEXT,
  total_recipients INTEGER DEFAULT 0,
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  estimated_cost DECIMAL(10,2),
  actual_cost DECIMAL(10,2),
  created_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_type ON campaigns(type);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_by ON campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled ON campaigns(scheduled_for) WHERE scheduled_for IS NOT NULL;

-- ====================================================================
-- 5. TABELA: campaign_sends
-- ====================================================================

CREATE TABLE IF NOT EXISTS campaign_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp')),
  recipient TEXT NOT NULL,
  message_subject TEXT,
  message_content TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'sending', 'sent', 'delivered', 'failed', 'opened', 'clicked', 'bounced', 'spam')
  ),
  created_at TIMESTAMP DEFAULT NOW(),
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  failed_at TIMESTAMP,
  bounced_at TIMESTAMP,
  message_id TEXT,
  n8n_message_id TEXT,
  provider_message_id TEXT,
  tracking_code TEXT UNIQUE,
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  error_code TEXT,
  error_message TEXT,
  error_details JSONB,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_campaign_sends_campaign ON campaign_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_user ON campaign_sends(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_status ON campaign_sends(status);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_channel ON campaign_sends(channel);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_message_id ON campaign_sends(message_id);

-- ====================================================================
-- 6. FUNÇÃO: Atualizar estatísticas da campanha
-- ====================================================================

CREATE OR REPLACE FUNCTION update_campaign_stats()
RETURNS TRIGGER AS $$
BEGIN
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_campaign_stats ON campaign_sends;
CREATE TRIGGER trigger_update_campaign_stats
  AFTER INSERT OR UPDATE OF status ON campaign_sends
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_stats();

-- ====================================================================
-- 7. RLS POLICIES
-- ====================================================================

ALTER TABLE payment_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_sends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage integrations" ON payment_integrations;
CREATE POLICY "Admins manage integrations" ON payment_integrations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins view webhooks" ON webhook_events;
CREATE POLICY "Admins view webhooks" ON webhook_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins manage mappings" ON product_mappings;
CREATE POLICY "Admins manage mappings" ON product_mappings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins manage campaigns" ON campaigns;
CREATE POLICY "Admins manage campaigns" ON campaigns
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins view sends" ON campaign_sends;
CREATE POLICY "Admins view sends" ON campaign_sends
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true
    )
  );