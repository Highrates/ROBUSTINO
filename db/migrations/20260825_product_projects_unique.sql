-- UNIQUE pair for product ↔ project M2M (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS product_projects_product_id_project_id_key
  ON public.product_projects (product_id, project_id);
