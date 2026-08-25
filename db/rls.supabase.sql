-- ROBUSTINO — RLS-политики как на Supabase Cloud (справочно, 2026-08-25)
-- НЕ применять на своей PostgreSQL без Supabase Auth (auth.role() недоступен).
-- Используйте как спецификацию доступа при написании своего API:
--
-- Публично (без логина):
--   products     SELECT WHERE status = 'published'
--   articles     SELECT WHERE status = 'published'
--   projects     SELECT all
--   product_projects SELECT all
--   faq          SELECT WHERE is_active = true
--   faq_links    SELECT WHERE is_active = true
--   presentation SELECT all
--   upholstery_collections SELECT all
--   upholstery_variants SELECT all
--
-- Админ (authenticated):
--   ALL на все перечисленные таблицы
--
-- Дополнительно в приложении (не RLS):
--   products со status = 'link_only' доступны по private_token (логика фронта/API)

-- === Ниже — исходные политики Supabase (для истории / self-hosted GoTrue) ===

-- faq
-- CREATE POLICY "Authenticated users can manage FAQ" ON public.faq
--   FOR ALL TO public USING (auth.role() = 'authenticated') ;
-- CREATE POLICY "Public can view active FAQ" ON public.faq
--   FOR SELECT TO public USING (is_active = true);

-- product_projects
-- CREATE POLICY "Authenticated users can manage product_projects" ON public.product_projects
--   FOR ALL TO public USING (auth.role() = 'authenticated');
-- CREATE POLICY "Public can view product_projects" ON public.product_projects
--   FOR SELECT TO public USING (true);

-- articles
-- CREATE POLICY "Authenticated users can manage articles" ON public.articles
--   FOR ALL TO public USING (auth.role() = 'authenticated');
-- CREATE POLICY "Public can view published articles" ON public.articles
--   FOR SELECT TO public USING (status = 'published');

-- projects
-- CREATE POLICY "Authenticated users can manage projects" ON public.projects
--   FOR ALL TO public USING (auth.role() = 'authenticated');
-- CREATE POLICY "Public can view projects" ON public.projects
--   FOR SELECT TO public USING (true);

-- products
-- CREATE POLICY "Authenticated users can manage products" ON public.products
--   FOR ALL TO public USING (auth.role() = 'authenticated');
-- CREATE POLICY "Public can view published products" ON public.products
--   FOR SELECT TO public USING (status = 'published');

-- presentation
-- CREATE POLICY "Anyone can read presentation" ON public.presentation
--   FOR SELECT TO public USING (true);
-- CREATE POLICY "Authenticated users can manage presentation" ON public.presentation
--   FOR ALL TO public USING (auth.role() = 'authenticated');

-- faq_links
-- CREATE POLICY "Anyone can read active faq_links" ON public.faq_links
--   FOR SELECT TO public USING (is_active = true);
-- CREATE POLICY "Authenticated users can manage faq_links" ON public.faq_links
--   FOR ALL TO public USING (auth.role() = 'authenticated');

-- upholstery_collections
-- CREATE POLICY "Anyone can view collections" ON public.upholstery_collections
--   FOR SELECT TO public USING (true);
-- CREATE POLICY "Only authenticated users can manage collections" ON public.upholstery_collections
--   FOR ALL TO public USING (auth.role() = 'authenticated');

-- upholstery_variants
-- CREATE POLICY "Authenticated users can manage upholstery_variants" ON public.upholstery_variants
--   FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- CREATE POLICY "Public can view upholstery_variants" ON public.upholstery_variants
--   FOR SELECT TO anon, authenticated USING (true);
