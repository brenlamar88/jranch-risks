-- Create a security definer function to check if user's facility 
-- is a child of a target parent facility
CREATE OR REPLACE FUNCTION public.user_facility_is_child_of(_user_id uuid, _parent_facility_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM facility_access fa
    JOIN users u ON u.company_id = fa.child_id
    WHERE u.id = _user_id
    AND fa.parent_id = _parent_facility_id
  )
$$;

-- Recreate the policy using the function
DROP POLICY IF EXISTS "Users can view facility users or admins view all" ON public.users;

CREATE POLICY "Users can view facility users or admins view all"
ON public.users FOR SELECT
TO public
USING (
  is_admin(auth.uid())
  OR can_access_facility(auth.uid(), company_id)
  OR user_facility_is_child_of(auth.uid(), company_id)
);