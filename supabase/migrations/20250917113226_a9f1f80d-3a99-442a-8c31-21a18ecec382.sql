-- Add client_id field to users table
ALTER TABLE public.users ADD COLUMN client_id uuid REFERENCES public.clients(id);

-- Create index for better performance
CREATE INDEX idx_users_client_id ON public.users(client_id);