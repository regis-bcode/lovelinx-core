-- Fix critical security vulnerability in communication_plan table
-- Replace insecure RLS policies with proper project ownership checks

-- Drop existing insecure policies
DROP POLICY IF EXISTS "Users can view communication plans of their projects" ON public.communication_plan;
DROP POLICY IF EXISTS "Users can create communication plans" ON public.communication_plan;
DROP POLICY IF EXISTS "Users can update communication plans" ON public.communication_plan;
DROP POLICY IF EXISTS "Users can delete communication plans" ON public.communication_plan;

-- Create secure RLS policies that check project ownership
CREATE POLICY "Users can view communication plans of their projects" 
ON public.communication_plan 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM projects p 
  WHERE p.id = communication_plan.project_id 
  AND p.user_id = auth.uid()
));

CREATE POLICY "Users can create communication plans for their projects" 
ON public.communication_plan 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM projects p 
  WHERE p.id = communication_plan.project_id 
  AND p.user_id = auth.uid()
));

CREATE POLICY "Users can update communication plans of their projects" 
ON public.communication_plan 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM projects p 
  WHERE p.id = communication_plan.project_id 
  AND p.user_id = auth.uid()
));

CREATE POLICY "Users can delete communication plans of their projects" 
ON public.communication_plan 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM projects p 
  WHERE p.id = communication_plan.project_id 
  AND p.user_id = auth.uid()
));