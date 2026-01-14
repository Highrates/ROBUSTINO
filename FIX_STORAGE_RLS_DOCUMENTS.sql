-- Исправление политик RLS для bucket 'documents'
-- Выполните этот SQL в Supabase SQL Editor

-- Убедитесь, что bucket 'documents' создан
-- Если его нет, создайте через Dashboard -> Storage -> New bucket

-- Политики для bucket 'documents' (PDF и другие документы)
-- Удаляем существующие политики, если есть
DROP POLICY IF EXISTS "Public can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON storage.objects;

-- Публичное чтение
CREATE POLICY "Public can view documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents');

-- Аутентифицированные пользователи могут загружать
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents' 
  AND auth.role() = 'authenticated'
);

-- Аутентифицированные пользователи могут обновлять
CREATE POLICY "Authenticated users can update documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'documents' 
  AND auth.role() = 'authenticated'
);

-- Аутентифицированные пользователи могут удалять
CREATE POLICY "Authenticated users can delete documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents' 
  AND auth.role() = 'authenticated'
);
