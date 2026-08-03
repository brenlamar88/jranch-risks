
DROP POLICY IF EXISTS "Users can view facility users or admins view all" ON public.users;

CREATE POLICY "Users can view facility users or admins view all"
ON public.users FOR SELECT
TO public
USING (
  is_admin(auth.uid())
  OR can_access_facility(auth.uid(), company_id)
  OR EXISTS (
    SELECT 1 FROM facility_access fa
    JOIN users u ON u.company_id = fa.child_id
    WHERE u.id = auth.uid()
    AND fa.parent_id = users.company_id
  )
);
