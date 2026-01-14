-- Миграция: Добавление коллекций для вариантов обивки
-- Создаем таблицу коллекций

CREATE TABLE IF NOT EXISTS upholstery_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Добавляем внешний ключ в таблицу вариантов обивки
ALTER TABLE upholstery_variants 
ADD COLUMN IF NOT EXISTS collection_id UUID REFERENCES upholstery_collections(id) ON DELETE SET NULL;

-- Создаем индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_upholstery_variants_collection_id 
ON upholstery_variants(collection_id);

CREATE INDEX IF NOT EXISTS idx_upholstery_collections_display_order 
ON upholstery_collections(display_order);

-- Включаем RLS для коллекций
ALTER TABLE upholstery_collections ENABLE ROW LEVEL SECURITY;

-- Политика: все могут просматривать коллекции
CREATE POLICY "Anyone can view collections"
  ON upholstery_collections FOR SELECT
  USING (true);

-- Политика: только авторизованные пользователи могут управлять коллекциями
CREATE POLICY "Only authenticated users can manage collections"
  ON upholstery_collections FOR ALL
  USING (auth.role() = 'authenticated');

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления updated_at
CREATE TRIGGER update_upholstery_collections_updated_at
  BEFORE UPDATE ON upholstery_collections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
