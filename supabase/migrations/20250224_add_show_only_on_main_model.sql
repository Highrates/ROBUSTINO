-- Добавление поля show_only_on_main_model в таблицу products
-- Товар с этим флагом отображается только в блоке «Конфигурации модели» на странице основной модели (не в общем каталоге).

ALTER TABLE products
ADD COLUMN IF NOT EXISTS show_only_on_main_model boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN products.show_only_on_main_model IS 'true: товар показывается только на странице основной модели (в блоке конфигураций), не в каталоге';
