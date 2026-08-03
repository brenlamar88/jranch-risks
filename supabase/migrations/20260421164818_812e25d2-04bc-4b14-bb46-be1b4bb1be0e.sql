
CREATE OR REPLACE FUNCTION public.is_executive_viewer(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id IN (
    '959f6dbd-f739-4f64-88c1-b60a6deee3fd'::uuid,
    '0a3b32b0-c8c5-4998-aa13-e485f8bbc44f'::uuid
  );
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
