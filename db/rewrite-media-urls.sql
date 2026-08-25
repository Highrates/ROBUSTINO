-- Rewrite Supabase Storage public URLs → https://robustino.ru/media/...
-- Run inside robustino DB after files are on disk under /var/www/html/media/{bucket}/...

BEGIN;

DO $$
DECLARE
  old_prefix text := 'https://zopserojkbhrrrrkllhr.supabase.co/storage/v1/object/public/';
  new_prefix text := 'https://robustino.ru/media/';
BEGIN
  -- products (text)
  UPDATE products SET model_url = replace(model_url, old_prefix, new_prefix)
    WHERE model_url LIKE old_prefix || '%';
  UPDATE products SET model_max_url = replace(model_max_url, old_prefix, new_prefix)
    WHERE model_max_url LIKE old_prefix || '%';
  UPDATE products SET document_url = replace(document_url, old_prefix, new_prefix)
    WHERE document_url LIKE old_prefix || '%';
  UPDATE products SET description = replace(description, old_prefix, new_prefix)
    WHERE description LIKE '%' || old_prefix || '%';
  UPDATE products SET full_description = replace(full_description, old_prefix, new_prefix)
    WHERE full_description LIKE '%' || old_prefix || '%';

  -- products (text[])
  UPDATE products SET images = (
    SELECT array_agg(replace(u, old_prefix, new_prefix) ORDER BY ordinality)
    FROM unnest(images) WITH ORDINALITY AS t(u, ordinality)
  ) WHERE images IS NOT NULL AND EXISTS (
    SELECT 1 FROM unnest(images) u WHERE u LIKE old_prefix || '%'
  );
  UPDATE products SET additional_models = (
    SELECT array_agg(replace(u, old_prefix, new_prefix) ORDER BY ordinality)
    FROM unnest(additional_models) WITH ORDINALITY AS t(u, ordinality)
  ) WHERE additional_models IS NOT NULL AND EXISTS (
    SELECT 1 FROM unnest(additional_models) u WHERE u LIKE old_prefix || '%'
  );

  -- articles
  UPDATE articles SET cover_image = replace(cover_image, old_prefix, new_prefix)
    WHERE cover_image LIKE old_prefix || '%';
  UPDATE articles SET content = replace(content, old_prefix, new_prefix)
    WHERE content LIKE '%' || old_prefix || '%';
  UPDATE articles SET excerpt = replace(excerpt, old_prefix, new_prefix)
    WHERE excerpt LIKE '%' || old_prefix || '%';

  -- projects
  UPDATE projects SET logo_url = replace(logo_url, old_prefix, new_prefix)
    WHERE logo_url LIKE old_prefix || '%';
  UPDATE projects SET description = replace(description, old_prefix, new_prefix)
    WHERE description LIKE '%' || old_prefix || '%';
  UPDATE projects SET images = (
    SELECT array_agg(replace(u, old_prefix, new_prefix) ORDER BY ordinality)
    FROM unnest(images) WITH ORDINALITY AS t(u, ordinality)
  ) WHERE images IS NOT NULL AND EXISTS (
    SELECT 1 FROM unnest(images) u WHERE u LIKE old_prefix || '%'
  );

  -- faq / faq_links / presentation / upholstery
  UPDATE faq SET answer = replace(answer, old_prefix, new_prefix)
    WHERE answer LIKE '%' || old_prefix || '%';
  UPDATE faq SET question = replace(question, old_prefix, new_prefix)
    WHERE question LIKE '%' || old_prefix || '%';
  UPDATE faq_links SET document_url = replace(document_url, old_prefix, new_prefix)
    WHERE document_url LIKE old_prefix || '%';
  UPDATE faq_links SET rich_text = replace(rich_text, old_prefix, new_prefix)
    WHERE rich_text LIKE '%' || old_prefix || '%';
  UPDATE faq_links SET page_content = replace(page_content, old_prefix, new_prefix)
    WHERE page_content LIKE '%' || old_prefix || '%';
  UPDATE presentation SET document_url = replace(document_url, old_prefix, new_prefix)
    WHERE document_url LIKE old_prefix || '%';
  UPDATE upholstery_variants SET image_url = replace(image_url, old_prefix, new_prefix)
    WHERE image_url LIKE old_prefix || '%';
END $$;

COMMIT;

-- =============================================================================
-- AUDIT: remaining supabase.co / storage refs (all should be 0)
-- =============================================================================
SELECT col, cnt FROM (
  SELECT 'products.model_url' AS col,
         count(*) FILTER (WHERE model_url LIKE '%supabase.co%') AS cnt FROM products
  UNION ALL SELECT 'products.model_max_url',
         count(*) FILTER (WHERE model_max_url LIKE '%supabase.co%') FROM products
  UNION ALL SELECT 'products.document_url',
         count(*) FILTER (WHERE document_url LIKE '%supabase.co%') FROM products
  UNION ALL SELECT 'products.description',
         count(*) FILTER (WHERE description LIKE '%supabase.co%') FROM products
  UNION ALL SELECT 'products.full_description',
         count(*) FILTER (WHERE full_description LIKE '%supabase.co%') FROM products
  UNION ALL SELECT 'products.images[]',
         count(*) FILTER (WHERE EXISTS (
           SELECT 1 FROM unnest(images) u WHERE u LIKE '%supabase.co%'
         )) FROM products
  UNION ALL SELECT 'products.additional_models[]',
         count(*) FILTER (WHERE EXISTS (
           SELECT 1 FROM unnest(additional_models) u WHERE u LIKE '%supabase.co%'
         )) FROM products
  UNION ALL SELECT 'articles.cover_image',
         count(*) FILTER (WHERE cover_image LIKE '%supabase.co%') FROM articles
  UNION ALL SELECT 'articles.content',
         count(*) FILTER (WHERE content LIKE '%supabase.co%') FROM articles
  UNION ALL SELECT 'articles.excerpt',
         count(*) FILTER (WHERE excerpt LIKE '%supabase.co%') FROM articles
  UNION ALL SELECT 'projects.logo_url',
         count(*) FILTER (WHERE logo_url LIKE '%supabase.co%') FROM projects
  UNION ALL SELECT 'projects.description',
         count(*) FILTER (WHERE description LIKE '%supabase.co%') FROM projects
  UNION ALL SELECT 'projects.images[]',
         count(*) FILTER (WHERE EXISTS (
           SELECT 1 FROM unnest(images) u WHERE u LIKE '%supabase.co%'
         )) FROM projects
  UNION ALL SELECT 'faq.question',
         count(*) FILTER (WHERE question LIKE '%supabase.co%') FROM faq
  UNION ALL SELECT 'faq.answer',
         count(*) FILTER (WHERE answer LIKE '%supabase.co%') FROM faq
  UNION ALL SELECT 'faq_links.document_url',
         count(*) FILTER (WHERE document_url LIKE '%supabase.co%') FROM faq_links
  UNION ALL SELECT 'faq_links.rich_text',
         count(*) FILTER (WHERE rich_text LIKE '%supabase.co%') FROM faq_links
  UNION ALL SELECT 'faq_links.page_content',
         count(*) FILTER (WHERE page_content LIKE '%supabase.co%') FROM faq_links
  UNION ALL SELECT 'presentation.document_url',
         count(*) FILTER (WHERE document_url LIKE '%supabase.co%') FROM presentation
  UNION ALL SELECT 'upholstery_variants.image_url',
         count(*) FILTER (WHERE image_url LIKE '%supabase.co%') FROM upholstery_variants
) t
ORDER BY col;
