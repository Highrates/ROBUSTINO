-- Site chat: guest cookie session ↔ admin
CREATE TABLE IF NOT EXISTS public.site_chat_conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  guest_token text NOT NULL,
  visitor_label text,
  last_message_at timestamp with time zone,
  guest_last_read_at timestamp with time zone,
  staff_last_read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT site_chat_conversations_pkey PRIMARY KEY (id),
  CONSTRAINT site_chat_conversations_guest_token_key UNIQUE (guest_token)
);

CREATE TABLE IF NOT EXISTS public.site_chat_messages (
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

CREATE TABLE IF NOT EXISTS public.site_chat_attachments (
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
