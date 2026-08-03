-- Create a function to check if a user is an admin (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = user_id
    AND role = 'admin'
  );
$$;

-- Drop the existing update policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- Create new update policy that allows users to update their own profile OR admins to update any profile
CREATE POLICY "Users can update own profile or admins can update any"
ON public.users
FOR UPDATE
USING (auth.uid() = id OR public.is_admin(auth.uid()));