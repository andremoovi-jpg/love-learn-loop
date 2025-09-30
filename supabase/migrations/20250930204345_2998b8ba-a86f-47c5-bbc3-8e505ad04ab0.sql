-- Fase 1: Corrigir o constraint products_level_check para aceitar NULL
-- Remover o constraint antigo
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_level_check;

-- Adicionar novo constraint que aceita NULL ou os valores válidos
ALTER TABLE products ADD CONSTRAINT products_level_check 
  CHECK (level IS NULL OR level IN ('Iniciante', 'Intermediário', 'Avançado'));