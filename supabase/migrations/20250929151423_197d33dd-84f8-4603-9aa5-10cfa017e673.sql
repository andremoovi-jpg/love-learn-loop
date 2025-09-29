-- First, fix existing products with invalid content
UPDATE products
SET content = jsonb_build_object(
  'modules', jsonb_build_array(
    jsonb_build_object(
      'id', 'module_1',
      'title', 'Módulo 1 - Introdução',
      'description', 'Conteúdo introdutório do produto',
      'order', 0,
      'lessons', jsonb_build_array(
        jsonb_build_object(
          'id', 'lesson_1',
          'title', 'Aula 1 - Bem-vindo',
          'description', 'Apresentação do conteúdo',
          'type', 'text',
          'content', 'Bem-vindo! Este produto está sendo configurado. Em breve todo o conteúdo estará disponível.',
          'duration', '5 min',
          'order', 0
        )
      )
    )
  )
)
WHERE content IS NULL
   OR content = '{}'::jsonb
   OR NOT (content ? 'modules')
   OR jsonb_typeof(content->'modules') != 'array'
   OR jsonb_array_length(content->'modules') = 0;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_products_content ON products USING gin(content);