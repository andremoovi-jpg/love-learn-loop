-- Primeiro, atualizar produtos existentes de 'mentoring' para 'mentorship'
UPDATE products 
SET product_type = 'mentorship' 
WHERE product_type = 'mentoring';

-- Remover o constraint antigo
ALTER TABLE products 
DROP CONSTRAINT IF EXISTS products_product_type_check;

-- Criar novo constraint com todos os tipos necessários
ALTER TABLE products 
ADD CONSTRAINT products_product_type_check 
CHECK (product_type IN ('course', 'ebook', 'mentorship', 'community', 'template', 'software'));