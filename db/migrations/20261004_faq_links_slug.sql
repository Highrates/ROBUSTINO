-- Human-readable slugs for FAQ internal pages (/page/:slug)
ALTER TABLE public.faq_links
  ADD COLUMN IF NOT EXISTS slug text;

-- Backfill from name (keep letters/digits; non-ASCII stays until admin/API transliterates on save)
UPDATE public.faq_links
SET slug = NULLIF(
  trim(both '-' FROM lower(regexp_replace(coalesce(name, ''), '[^a-zA-Z0-9а-яА-ЯёЁ]+', '-', 'g'))),
  ''
)
WHERE slug IS NULL
  AND is_internal_page = true;

-- Empty / missing → fallback from id
UPDATE public.faq_links
SET slug = 'page-' || substr(replace(id::text, '-', ''), 1, 8)
WHERE is_internal_page = true
  AND (slug IS NULL OR slug = '');

-- Deduplicate colliding slugs
WITH ranked AS (
  SELECT
    id,
    slug,
    row_number() OVER (PARTITION BY slug ORDER BY created_at ASC NULLS LAST, id) AS rn
  FROM public.faq_links
  WHERE slug IS NOT NULL
)
UPDATE public.faq_links f
SET slug = f.slug || '-' || substr(replace(f.id::text, '-', ''), 1, 6)
FROM ranked r
WHERE f.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS faq_links_slug_key
  ON public.faq_links (slug)
  WHERE slug IS NOT NULL;

COMMENT ON COLUMN public.faq_links.slug IS
  'URL slug for internal pages (/page/:slug). Required when is_internal_page.';
