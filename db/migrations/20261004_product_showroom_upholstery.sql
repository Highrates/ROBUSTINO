-- Цвет обивки «на ветрине» для карточки товара (кружок на странице продукта)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS showroom_upholstery_variant_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_showroom_upholstery_variant_id_fkey'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_showroom_upholstery_variant_id_fkey
      FOREIGN KEY (showroom_upholstery_variant_id)
      REFERENCES public.upholstery_variants(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_showroom_upholstery
  ON public.products (showroom_upholstery_variant_id);
