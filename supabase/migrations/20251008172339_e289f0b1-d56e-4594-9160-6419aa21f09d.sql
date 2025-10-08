-- Create enum for member role types
CREATE TYPE public.member_role_type AS ENUM ('interno', 'cliente', 'parceiro');

-- Add role_type column to team_members
ALTER TABLE public.team_members
ADD COLUMN role_type member_role_type NOT NULL DEFAULT 'interno';