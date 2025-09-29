-- Corrigir produtos sem conteúdo ou com conteúdo inválido
UPDATE products
SET content = jsonb_build_object(
  'modules', jsonb_build_array(
    jsonb_build_object(
      'title', 'Módulo 1 - Introdução',
      'description', 'Conteúdo introdutório do produto',
      'lessons', jsonb_build_array(
        jsonb_build_object(
          'title', 'Aula 1 - Bem-vindo',
          'description', 'Apresentação do conteúdo',
          'type', 'text',
          'content', 'Bem-vindo! Este produto está sendo configurado. Em breve todo o conteúdo estará disponível.',
          'duration', '5 min'
        )
      )
    )
  )
)
WHERE content IS NULL
   OR content = '{}'::jsonb
   OR NOT (content ? 'modules')
   OR jsonb_array_length(content->'modules') = 0;

-- Garantir que completed_lessons seja sempre um array (corrigindo sintaxe)
UPDATE user_products
SET completed_lessons = ARRAY[]::text[]
WHERE completed_lessons IS NULL;