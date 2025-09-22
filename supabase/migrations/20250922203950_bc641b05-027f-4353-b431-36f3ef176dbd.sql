-- Add status field to projects table
ALTER TABLE public.projects 
ADD COLUMN status text;