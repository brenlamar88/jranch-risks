-- Update RLS policy for risks to also show risks where user is assigned
-- A risk should be visible if:
-- 1. User can access the risk's facility, OR
-- 2. User is assigned to the risk (in responsible_person_id array)

DROP POLICY IF EXISTS "Users can view facility risks" ON public.risks;

CREATE POLICY "Users can view facility or assigned risks"
ON public.risks
FOR SELECT
USING (
  can_access_facility(auth.uid(), company_id)
  OR auth.uid() = ANY(responsible_person_id)
);