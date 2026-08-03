-- Fix: Allow admins to view all users regardless of facility
-- This is needed for user management in the admin panel

-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Users can view facility users" ON public.users;

-- Recreate with admin bypass
CREATE POLICY "Users can view facility users or admins view all"
ON public.users
FOR SELECT
USING (
  is_admin(auth.uid()) OR can_access_facility(auth.uid(), company_id)
);