-- Fix: Allow admins to update any user regardless of facility access
-- Drop the existing update policy
DROP POLICY IF EXISTS "Users can update own profile or admins can update any" ON public.users;

-- Recreate with proper WITH CHECK for admins
CREATE POLICY "Users can update own profile or admins can update any"
ON public.users
FOR UPDATE
USING (
  (auth.uid() = id) OR is_admin(auth.uid())
)
WITH CHECK (
  (auth.uid() = id) OR is_admin(auth.uid())
);