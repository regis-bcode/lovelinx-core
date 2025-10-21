ALTER TABLE public.time_logs
  ADD COLUMN IF NOT EXISTS approval_status text
    CHECK (approval_status IN ('Aguarda Aprovação','Aprovado','Reprovado'))
    DEFAULT 'Aguarda Aprovação';

ALTER TABLE public.time_logs
  ADD COLUMN IF NOT EXISTS is_billable boolean DEFAULT false;

ALTER TABLE public.time_logs
  ADD COLUMN IF NOT EXISTS approved_by uuid;

ALTER TABLE public.time_logs
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;
