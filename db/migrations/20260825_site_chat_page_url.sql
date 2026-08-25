-- page_url for guest conversations + index for empty-conv GC
ALTER TABLE public.site_chat_conversations
  ADD COLUMN IF NOT EXISTS page_url text;

CREATE INDEX IF NOT EXISTS idx_site_chat_conversations_empty_gc
  ON public.site_chat_conversations (created_at)
  WHERE last_message_at IS NULL;
