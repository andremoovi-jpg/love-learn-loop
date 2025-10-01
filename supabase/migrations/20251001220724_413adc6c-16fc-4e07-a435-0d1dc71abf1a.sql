-- ============================================
-- FASE 1: ESTRUTURA DE BANCO DE DADOS PARA AUTOMAÇÃO DE MARKETING
-- ============================================

-- ============================================
-- TABELA 1: payment_integrations
-- ============================================
CREATE TABLE IF NOT EXISTS payment_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação
  name TEXT NOT NULL,
  platform_type TEXT NOT NULL,
  
  -- Webhooks
  webhook_url TEXT NOT NULL,
  webhook_secret TEXT,
  
  -- Credenciais (se necessário)
  api_key TEXT,
  api_token TEXT,
  
  -- Configurações específicas em JSON
  config JSONB DEFAULT '{}',
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_webhook_at TIMESTAMP,
  
  -- Metadados
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_payment_integrations_platform ON payment_integrations(platform_type);
CREATE INDEX IF NOT EXISTS idx_payment_integrations_active ON payment_integrations(is_active);

-- Comentários explicativos
COMMENT ON TABLE payment_integrations IS 'Configurações de integrações com plataformas de pagamento';
COMMENT ON COLUMN payment_integrations.platform_type IS 'Tipo da plataforma: hotmart, eduzz, kiwify, stripe, etc';
COMMENT ON COLUMN payment_integrations.webhook_url IS 'URL do n8n que receberá os webhooks desta integração';

-- ============================================
-- TABELA 2: webhook_events
-- ============================================
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relacionamentos
  integration_id UUID REFERENCES payment_integrations(id) ON DELETE SET NULL,
  
  -- Dados do evento
  event_type TEXT NOT NULL,
  
  -- Payloads
  raw_payload JSONB NOT NULL,
  normalized_payload JSONB,
  
  -- Status de processamento
  processed BOOLEAN DEFAULT FALSE,
  processing_attempts INTEGER DEFAULT 0,
  
  -- Resultados
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  product_ids UUID[],
  order_id TEXT,
  
  -- Erros
  error_message TEXT,
  error_details JSONB,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  
  -- Rastreamento
  ip_address INET,
  user_agent TEXT
);

-- Índices para performance e consultas
CREATE INDEX IF NOT EXISTS idx_webhook_events_integration ON webhook_events(integration_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_user ON webhook_events(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created ON webhook_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_events_order ON webhook_events(order_id);

-- Comentários
COMMENT ON TABLE webhook_events IS 'Log completo de todos os webhooks recebidos das plataformas';
COMMENT ON COLUMN webhook_events.raw_payload IS 'Payload original EXATAMENTE como veio da plataforma';
COMMENT ON COLUMN webhook_events.normalized_payload IS 'Payload convertido para formato padrão do sistema';
COMMENT ON COLUMN webhook_events.processed IS 'TRUE = já processou e liberou acesso';

-- ============================================
-- TABELA 3: product_mappings
-- ============================================
CREATE TABLE IF NOT EXISTS product_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relacionamentos
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES payment_integrations(id) ON DELETE CASCADE,
  
  -- Identificação externa
  external_product_id TEXT NOT NULL,
  external_product_name TEXT,
  
  -- Configurações
  auto_grant_access BOOLEAN DEFAULT TRUE,
  
  -- Metadados
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Garantir que não tenha duplicatas
  UNIQUE(integration_id, external_product_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_product_mappings_product ON product_mappings(product_id);
CREATE INDEX IF NOT EXISTS idx_product_mappings_integration ON product_mappings(integration_id);
CREATE INDEX IF NOT EXISTS idx_product_mappings_external ON product_mappings(external_product_id);

-- Comentários
COMMENT ON TABLE product_mappings IS 'Mapeia produtos internos com IDs de produtos em plataformas externas';
COMMENT ON COLUMN product_mappings.external_product_id IS 'ID do produto na plataforma externa (Hotmart, Eduzz, etc)';
COMMENT ON COLUMN product_mappings.auto_grant_access IS 'Se TRUE, libera acesso automaticamente ao receber webhook';

-- ============================================
-- TABELA 4: campaigns
-- ============================================
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação
  name TEXT NOT NULL,
  description TEXT,
  
  -- Tipo de campanha
  type TEXT NOT NULL CHECK (type IN ('email', 'whatsapp', 'both')),
  
  -- FILTROS DE AUDIÊNCIA (armazenado como JSON)
  filters JSONB NOT NULL DEFAULT '{}',
  
  -- CONTEÚDO DA MENSAGEM
  email_subject TEXT,
  email_template TEXT,
  whatsapp_template TEXT,
  
  -- VARIÁVEIS DINÂMICAS
  variables JSONB DEFAULT '{}',
  
  -- STATUS E AGENDAMENTO
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'scheduled', 'sending', 'paused', 'completed', 'failed')
  ),
  scheduled_for TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  paused_at TIMESTAMP,
  
  -- INTEGRAÇÃO COM N8N
  n8n_workflow_id TEXT,
  n8n_execution_id TEXT,
  
  -- ESTATÍSTICAS (atualizadas em tempo real)
  total_recipients INTEGER DEFAULT 0,
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  
  -- CUSTOS (opcional)
  estimated_cost DECIMAL(10,2),
  actual_cost DECIMAL(10,2),
  
  -- AUDITORIA
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_type ON campaigns(type);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_by ON campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled ON campaigns(scheduled_for) WHERE scheduled_for IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_campaigns_created ON campaigns(created_at DESC);

-- Comentários
COMMENT ON TABLE campaigns IS 'Campanhas de marketing via email e WhatsApp';
COMMENT ON COLUMN campaigns.filters IS 'Filtros JSON para selecionar audiência';
COMMENT ON COLUMN campaigns.status IS 'draft=rascunho, scheduled=agendado, sending=enviando, completed=concluído';
COMMENT ON COLUMN campaigns.variables IS 'Variáveis customizadas que podem ser usadas nos templates';

-- ============================================
-- TABELA 5: campaign_sends
-- ============================================
CREATE TABLE IF NOT EXISTS campaign_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relacionamentos
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Canal e destinatário
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp')),
  recipient TEXT NOT NULL,
  
  -- CONTEÚDO ENVIADO (com variáveis já substituídas)
  message_subject TEXT,
  message_content TEXT,
  
  -- STATUS DE ENVIO
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'sending', 'sent', 'delivered', 'failed', 'opened', 'clicked', 'bounced', 'spam')
  ),
  
  -- TIMESTAMPS DETALHADOS
  created_at TIMESTAMP DEFAULT NOW(),
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  failed_at TIMESTAMP,
  bounced_at TIMESTAMP,
  
  -- TRACKING E IDs EXTERNOS
  n8n_message_id TEXT,
  provider_message_id TEXT,
  tracking_code TEXT UNIQUE,
  
  -- MÉTRICAS
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  
  -- ERROS
  error_code TEXT,
  error_message TEXT,
  error_details JSONB,
  
  -- METADATA
  metadata JSONB DEFAULT '{}'
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_campaign_sends_campaign ON campaign_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_user ON campaign_sends(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_status ON campaign_sends(status);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_channel ON campaign_sends(channel);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_tracking ON campaign_sends(tracking_code) WHERE tracking_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_campaign_sends_sent ON campaign_sends(sent_at DESC) WHERE sent_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_campaign_sends_campaign_status ON campaign_sends(campaign_id, status);

-- Comentários
COMMENT ON TABLE campaign_sends IS 'Registro individual de cada mensagem enviada em campanhas';
COMMENT ON COLUMN campaign_sends.status IS 'pending→sending→sent→delivered→opened→clicked';
COMMENT ON COLUMN campaign_sends.tracking_code IS 'Código único para rastrear abertura de emails (pixel tracking)';
COMMENT ON COLUMN campaign_sends.open_count IS 'Contador de quantas vezes o email foi aberto';

-- ============================================
-- FUNÇÃO E TRIGGER: Atualizar Estatísticas
-- ============================================
CREATE OR REPLACE FUNCTION update_campaign_stats()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Trigger para executar a função
DROP TRIGGER IF EXISTS trigger_update_campaign_stats ON campaign_sends;
CREATE TRIGGER trigger_update_campaign_stats
  AFTER INSERT OR UPDATE OF status ON campaign_sends
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_stats();

COMMENT ON FUNCTION update_campaign_stats IS 'Atualiza automaticamente as estatísticas da campanha quando um send muda';

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS em todas as novas tabelas
ALTER TABLE payment_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_sends ENABLE ROW LEVEL SECURITY;

-- Política: Apenas admins podem ver/editar integrações
CREATE POLICY "Admins manage integrations" ON payment_integrations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.is_admin = true
    )
  );

-- Política: Apenas admins podem ver webhooks
CREATE POLICY "Admins view webhooks" ON webhook_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.is_admin = true
    )
  );

-- Política: Apenas admins podem gerenciar mapeamentos
CREATE POLICY "Admins manage mappings" ON product_mappings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.is_admin = true
    )
  );

-- Política: Apenas admins podem gerenciar campanhas
CREATE POLICY "Admins manage campaigns" ON campaigns
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.is_admin = true
    )
  );

-- Política: Apenas admins podem ver envios
CREATE POLICY "Admins view sends" ON campaign_sends
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.is_admin = true
    )
  );