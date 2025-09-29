-- Update products with empty or null content to have proper structure
UPDATE products
SET content = jsonb_build_object(
  'modules', jsonb_build_array(
    jsonb_build_object(
      'title', 'Módulo 1 - Introdução',
      'description', 'Conteúdo introdutório',
      'lessons', jsonb_build_array(
        jsonb_build_object(
          'title', 'Aula 1 - Bem-vindo',
          'description', 'Boas-vindas ao curso',
          'type', 'video',
          'url', '',
          'duration', '5 min'
        )
      )
    )
  )
)
WHERE content IS NULL 
   OR content = '{}'::jsonb 
   OR content = 'null'::jsonb
   OR NOT content ? 'modules';