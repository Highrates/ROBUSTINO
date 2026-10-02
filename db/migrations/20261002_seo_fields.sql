-- Optional SEO overrides + Direct feed price
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS seo_description text,
  ADD COLUMN IF NOT EXISTS feed_price numeric;

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS seo_description text;

COMMENT ON COLUMN public.products.feed_price IS
  'Цена (RUR) для YML/Директ. Без цены и фото оффер в фид не попадает.';
