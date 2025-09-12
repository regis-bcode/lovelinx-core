-- Fix security issue: Remove overly permissive profiles policy
-- Drop the existing policy that allows everyone to view all profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create a more secure policy that only allows authenticated users to view profiles
CREATE POLICY "Authenticated users can view profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Optional: If you need users to only see their own profiles, use this instead:
-- CREATE POLICY "Users can view their own profile" 
-- ON public.profiles 
-- FOR SELECT 
-- USING (user_id = auth.uid());