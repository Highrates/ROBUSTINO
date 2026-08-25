-- Key/value settings (admin avatar, etc.)
CREATE TABLE IF NOT EXISTS public.site_settings (
  key text NOT NULL,
  value text NOT NULL,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT site_settings_pkey PRIMARY KEY (key)
);
