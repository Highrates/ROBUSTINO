-- Презентация кресла PDF (ссылка на файл в storage)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS document_url text;

COMMENT ON COLUMN products.document_url IS 'URL PDF презентации товара (блок «Презентация кресла PDF» на странице товара)';
