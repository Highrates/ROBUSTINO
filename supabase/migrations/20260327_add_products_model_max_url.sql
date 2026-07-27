-- 3D модель в формате 3ds Max (.max)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS model_max_url text;

COMMENT ON COLUMN products.model_max_url IS 'URL 3D модели в формате .max (для скачивания на странице товара)';
