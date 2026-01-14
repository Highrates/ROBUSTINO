-- Миграция: Добавление поддержки конфигураций товаров
-- Добавляем поле parent_product_id для связи конфигураций с основной моделью

-- Добавляем поле parent_product_id в таблицу products
ALTER TABLE products
ADD COLUMN IF NOT EXISTS parent_product_id UUID REFERENCES products(id) ON DELETE SET NULL;

-- Создаем индекс для быстрого поиска конфигураций по основной модели
CREATE INDEX IF NOT EXISTS idx_products_parent_product_id 
ON products(parent_product_id);

-- Создаем индекс для быстрого поиска основных моделей (где parent_product_id IS NULL)
CREATE INDEX IF NOT EXISTS idx_products_is_main_model 
ON products(parent_product_id) WHERE parent_product_id IS NULL;

-- Добавляем проверку: товар не может быть родителем самого себя
ALTER TABLE products
ADD CONSTRAINT check_self_reference 
CHECK (id != parent_product_id);

-- Комментарии для документации
COMMENT ON COLUMN products.parent_product_id IS 'Ссылка на основную модель. NULL для основных моделей, UUID для конфигураций';
