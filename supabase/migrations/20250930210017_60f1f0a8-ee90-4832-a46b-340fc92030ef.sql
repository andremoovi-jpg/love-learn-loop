-- Adicionar campo attachments para tópicos e respostas do fórum
ALTER TABLE forum_topics 
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

ALTER TABLE forum_replies 
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Criar índices para melhor performance nas consultas
CREATE INDEX IF NOT EXISTS idx_forum_topics_attachments ON forum_topics USING GIN (attachments);
CREATE INDEX IF NOT EXISTS idx_forum_replies_attachments ON forum_replies USING GIN (attachments);

-- Comentários para documentação
COMMENT ON COLUMN forum_topics.attachments IS 'Array de anexos no formato [{id: string, url: string, name: string, type: string}]';
COMMENT ON COLUMN forum_replies.attachments IS 'Array de anexos no formato [{id: string, url: string, name: string, type: string}]';