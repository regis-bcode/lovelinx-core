-- Tighten RLS policies on stakeholders table to protect contact information
-- Ensure RLS is enabled
ALTER TABLE public.stakeholders ENABLE ROW LEVEL SECURITY;

-- Drop insecure policies
DROP POLICY IF EXISTS "Users can create stakeholders" ON public.stakeholders;
DROP POLICY IF EXISTS "Users can delete stakeholders" ON public.stakeholders;
DROP POLICY IF EXISTS "Users can update stakeholders" ON public.stakeholders;
DROP POLICY IF EXISTS "Users can view stakeholders of their projects" ON public.stakeholders;

-- View: only owners of the related project
CREATE POLICY "Users can view stakeholders of their projects"
ON public.stakeholders
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = stakeholders.project_id
      AND p.user_id = auth.uid()
  )
);

-- Insert: only into projects owned by the user
CREATE POLICY "Users can insert stakeholders for their projects"
ON public.stakeholders
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = stakeholders.project_id
      AND p.user_id = auth.uid()
  )
);

-- Update: only stakeholders tied to user's projects
CREATE POLICY "Users can update stakeholders of their projects"
ON public.stakeholders
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = stakeholders.project_id
      AND p.user_id = auth.uid()
  )
);

-- Delete: only stakeholders tied to user's projects
CREATE POLICY "Users can delete stakeholders of their projects"
ON public.stakeholders
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = stakeholders.project_id
      AND p.user_id = auth.uid()
  )
);
