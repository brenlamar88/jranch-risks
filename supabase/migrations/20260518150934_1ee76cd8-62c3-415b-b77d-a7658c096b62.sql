
-- 1. Add visibility column
ALTER TABLE public.risks
ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'facility_only';

ALTER TABLE public.risks
ADD CONSTRAINT risks_visibility_check
CHECK (visibility IN ('corporate_only', 'facility_only', 'both'));

-- 2. Helper SECURITY DEFINER function: is the user's facility a parent of the target facility?
CREATE OR REPLACE FUNCTION public.user_is_corporate_parent_of(_user_id uuid, _target_facility_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM facility_access fa
    JOIN users u ON u.company_id = fa.parent_id
    WHERE u.id = _user_id
    AND fa.child_id = _target_facility_id
  )
  OR EXISTS (
    -- user is in the parent facility itself, targeting their own facility
    SELECT 1 FROM users u
    JOIN facility_access fa ON fa.parent_id = u.company_id
    WHERE u.id = _user_id
    AND u.company_id = _target_facility_id
  );
$$;

-- 3. Replace SELECT policy on risks to honor visibility
DROP POLICY IF EXISTS "Users can view facility or assigned risks" ON public.risks;

CREATE POLICY "Users can view facility or assigned risks"
ON public.risks
FOR SELECT
USING (
  -- Admins and executive viewers always see everything
  is_admin(auth.uid())
  OR is_executive_viewer(auth.uid())
  -- Creator always sees their own risks
  OR auth.uid() = created_by
  -- Anyone assigned as responsible can see it
  OR (auth.uid() = ANY (responsible_person_id))
  OR (
    CASE
      WHEN visibility = 'corporate_only' THEN
        -- Only Corporate (parent-facility) users can see
        user_is_corporate_parent_of(auth.uid(), company_id)
      ELSE
        -- facility_only or both: normal facility access
        can_access_facility(auth.uid(), company_id)
    END
  )
);
