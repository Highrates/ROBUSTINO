-- ROBUSTINO — каноническая схема public (снимок с Supabase, 2026-08-25)
-- Назначение: поднятие своей PostgreSQL и сверка при миграции данных.
-- Источник: live project zopserojkbhrrrrkllhr + Dashboard ERD.
--
-- Применение на чистой БД:
--   psql -d robustino -f db/schema.sql
--
-- RLS / auth.role() сюда не входят — см. db/rls.supabase.sql (только справочно).
-- На своём API доступ реализуется в приложении, не через Supabase RLS.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- upholstery_collections (до variants)
-- ---------------------------------------------------------------------------
CREATE TABLE public.upholstery_collections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  display_order integer DEFAULT 0,
  name text NOT NULL,
  description text,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT upholstery_collections_pkey PRIMARY KEY (id),
  CONSTRAINT upholstery_collections_name_key UNIQUE (name)
);

-- ---------------------------------------------------------------------------
-- products (self-FK parent_product_id)
-- ---------------------------------------------------------------------------
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  display_order integer DEFAULT 0,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  full_description text,
  category text,
  type text,
  delivery_time text,
  volume_m3 numeric,
  weight_kg numeric,
  in_stock text,
  model_url text,
  model_max_url text,
  additional_models text[],
  images text[],
  specifications jsonb,
  status text DEFAULT 'draft'::text,
  private_token text,
  show_only_on_main_model boolean NOT NULL DEFAULT false,
  document_url text,
  parent_product_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_slug_key UNIQUE (slug),
  CONSTRAINT products_private_token_key UNIQUE (private_token),
  CONSTRAINT products_status_check CHECK (
    status = ANY (ARRAY['draft'::text, 'published'::text, 'link_only'::text])
  ),
  CONSTRAINT products_parent_product_id_fkey
    FOREIGN KEY (parent_product_id) REFERENCES public.products(id)
);

-- ---------------------------------------------------------------------------
-- articles
-- ---------------------------------------------------------------------------
CREATE TABLE public.articles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  display_order integer DEFAULT 0,
  title text NOT NULL,
  slug text NOT NULL,
  content text NOT NULL,
  excerpt text,
  cover_image text,
  category text,
  tags text[],
  published_at timestamp with time zone,
  author text DEFAULT 'Admin'::text,
  status text DEFAULT 'draft'::text,
  views integer DEFAULT 0,
  subtitle text,
  article_date date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT articles_pkey PRIMARY KEY (id),
  CONSTRAINT articles_slug_key UNIQUE (slug),
  CONSTRAINT articles_status_check CHECK (
    status = ANY (ARRAY['draft'::text, 'published'::text])
  )
);

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  display_order integer DEFAULT 0,
  name text NOT NULL,
  client text,
  description text,
  images text[],
  logo_url text,
  project_date date,
  seats_count integer,
  product_id uuid,
  upholstery_variant text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT projects_pkey PRIMARY KEY (id),
  CONSTRAINT projects_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES public.products(id)
);

-- ---------------------------------------------------------------------------
-- product_projects (M2M)
-- ---------------------------------------------------------------------------
CREATE TABLE public.product_projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  project_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT product_projects_pkey PRIMARY KEY (id),
  CONSTRAINT product_projects_product_id_project_id_key UNIQUE (product_id, project_id),
  CONSTRAINT product_projects_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT product_projects_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES public.projects(id)
);

-- ---------------------------------------------------------------------------
-- faq
-- ---------------------------------------------------------------------------
CREATE TABLE public.faq (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT faq_pkey PRIMARY KEY (id)
);

-- ---------------------------------------------------------------------------
-- faq_links
-- ---------------------------------------------------------------------------
CREATE TABLE public.faq_links (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  document_url text,
  rich_text text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  is_internal_page boolean DEFAULT false,
  page_content text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT faq_links_pkey PRIMARY KEY (id)
);

-- ---------------------------------------------------------------------------
-- presentation
-- ---------------------------------------------------------------------------
CREATE TABLE public.presentation (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  document_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT presentation_pkey PRIMARY KEY (id)
);

-- ---------------------------------------------------------------------------
-- upholstery_variants
-- ---------------------------------------------------------------------------
CREATE TABLE public.upholstery_variants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text,
  image_url text NOT NULL,
  collection_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT upholstery_variants_pkey PRIMARY KEY (id),
  CONSTRAINT upholstery_variants_collection_id_fkey
    FOREIGN KEY (collection_id) REFERENCES public.upholstery_collections(id)
);

-- ---------------------------------------------------------------------------
-- Индексы под типичные запросы API
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products (status);
CREATE INDEX IF NOT EXISTS idx_products_parent ON public.products (parent_product_id);
CREATE INDEX IF NOT EXISTS idx_products_display_order ON public.products (display_order);

CREATE INDEX IF NOT EXISTS idx_articles_status ON public.articles (status);
CREATE INDEX IF NOT EXISTS idx_articles_display_order ON public.articles (display_order);

CREATE INDEX IF NOT EXISTS idx_projects_product_id ON public.projects (product_id);
CREATE INDEX IF NOT EXISTS idx_projects_display_order ON public.projects (display_order);

CREATE INDEX IF NOT EXISTS idx_product_projects_product ON public.product_projects (product_id);
CREATE INDEX IF NOT EXISTS idx_product_projects_project ON public.product_projects (project_id);

CREATE INDEX IF NOT EXISTS idx_faq_active_order ON public.faq (is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_faq_links_active_order ON public.faq_links (is_active, display_order);

CREATE INDEX IF NOT EXISTS idx_upholstery_variants_collection
  ON public.upholstery_variants (collection_id);
CREATE INDEX IF NOT EXISTS idx_upholstery_collections_display_order
  ON public.upholstery_collections (display_order);

-- ---------------------------------------------------------------------------
-- site chat (гость ↔ админ, одна переписка на cookie-сессию)
-- ---------------------------------------------------------------------------
CREATE TABLE public.site_chat_conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  guest_token text NOT NULL,
  visitor_label text,
  page_url text,
  last_message_at timestamp with time zone,
  guest_last_read_at timestamp with time zone,
  staff_last_read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT site_chat_conversations_pkey PRIMARY KEY (id),
  CONSTRAINT site_chat_conversations_guest_token_key UNIQUE (guest_token)
);

CREATE TABLE public.site_chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  author_role text NOT NULL,
  body text NOT NULL DEFAULT ''::text,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT site_chat_messages_pkey PRIMARY KEY (id),
  CONSTRAINT site_chat_messages_conversation_id_fkey
    FOREIGN KEY (conversation_id) REFERENCES public.site_chat_conversations(id) ON DELETE CASCADE,
  CONSTRAINT site_chat_messages_author_role_check CHECK (
    author_role = ANY (ARRAY['CUSTOMER'::text, 'STAFF'::text])
  )
);

CREATE TABLE public.site_chat_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL,
  file_url text NOT NULL,
  filename text NOT NULL,
  mime_type text,
  kind text NOT NULL,
  CONSTRAINT site_chat_attachments_pkey PRIMARY KEY (id),
  CONSTRAINT site_chat_attachments_message_id_fkey
    FOREIGN KEY (message_id) REFERENCES public.site_chat_messages(id) ON DELETE CASCADE,
  CONSTRAINT site_chat_attachments_kind_check CHECK (
    kind = ANY (ARRAY['IMAGE'::text, 'FILE'::text])
  )
);

CREATE INDEX IF NOT EXISTS idx_site_chat_messages_conv_created
  ON public.site_chat_messages (conversation_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_site_chat_attachments_message
  ON public.site_chat_attachments (message_id);
CREATE INDEX IF NOT EXISTS idx_site_chat_conversations_last_message
  ON public.site_chat_conversations (last_message_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_site_chat_conversations_empty_gc
  ON public.site_chat_conversations (created_at)
  WHERE last_message_at IS NULL;

-- ---------------------------------------------------------------------------
-- Колонки с URL файлов (Storage → /media после миграции)
-- products: model_url, model_max_url, document_url, images[], additional_models[]
-- articles: cover_image (+ URL внутри content HTML)
-- projects: images[], logo_url (+ URL внутри description HTML)
-- upholstery_variants: image_url
-- faq_links: document_url (+ URL внутри rich_text / page_content HTML)
-- presentation: document_url
-- ---------------------------------------------------------------------------
