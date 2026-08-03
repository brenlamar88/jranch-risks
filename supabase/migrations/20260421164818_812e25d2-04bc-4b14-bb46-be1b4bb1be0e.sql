
CREATE OR REPLACE FUNCTION public.is_executive_viewer(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Clean slate: the original migration hardcoded two freedomrap user IDs as
  -- executive viewers. Those users do not exist in this database, so no one is
  -- seeded. Returns false for everyone until you designate your own executive
  -- viewers, e.g. by replacing this with a lookup against user_roles.
  SELECT false;
$$;

DROP POLICY IF EXISTS "Users can view facility or assigned risks" ON public.risks;

CREATE POLICY "Users can view facility or assigned risks"
ON public.risks
FOR SELECT
USING (
  can_access_facility(auth.uid(), company_id)
  OR auth.uid() = ANY (responsible_person_id)
  OR public.is_executive_viewer(auth.uid())
);
