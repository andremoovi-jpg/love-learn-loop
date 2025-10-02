-- Adicionar coluna para armazenar ID da mensagem do WhatsApp
ALTER TABLE campaign_sends
ADD COLUMN message_id TEXT;

-- Criar índice para busca rápida (webhooks vão buscar por message_id)
CREATE INDEX idx_campaign_sends_message_id ON campaign_sends(message_id);

-- Comentário explicativo
COMMENT ON COLUMN campaign_sends.message_id IS 'ID único da mensagem retornado pela Evolution API (WhatsApp). Usado para rastrear status via webhooks.';