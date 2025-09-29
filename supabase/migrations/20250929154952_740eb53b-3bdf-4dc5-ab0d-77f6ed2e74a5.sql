-- Garantir que content suporta a nova estrutura
ALTER TABLE products
ALTER COLUMN content
TYPE JSONB
USING CASE
  WHEN content IS NULL THEN NULL
  WHEN jsonb_typeof(content) = 'object' THEN content
  ELSE content::JSONB
END;

-- Criar índice para melhor performance se não existir
CREATE INDEX IF NOT EXISTS idx_products_content_gin ON products USING gin(content);

-- Exemplo de como adicionar anexos em produtos existentes (comentado para não executar automaticamente)
-- UPDATE products
-- SET content = jsonb_set(
--   content,
--   '{modules,0,lessons,0,attachments}',
--   '[{"id": "1", "name": "Material de Apoio.pdf", "url": "https://exemplo.com/material.pdf", "type": "pdf"}]'::jsonb,
--   true
-- )
-- WHERE slug = 'seu-produto-slug-aqui';