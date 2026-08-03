-- Step 1: (clean slate) The original migration backfilled users with no facility
-- to a specific Lake Charles company UUID from the freedomrap database. That ID
-- does not exist here and there are no users yet, so this backfill is omitted.
-- Original statement (kept for reference):
-- UPDATE public.users SET company_id = 'e40784c0-1653-4d14-a6c3-455045a071c7' WHERE company_id IS NULL;

-- Step 2: Create CORPORATE facility
INSERT INTO public.companies (name) VALUES ('CORPORATE');

-- Step 3: Create facility_access hierarchy table
CREATE TABLE public.facility_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(parent_id, child_id),
  CHECK (parent_id != child_id)
);

-- Enable RLS on facility_access
ALTER TABLE public.facility_access ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view facility hierarchy
CREATE POLICY "Authenticated users can view facility hierarchy"
ON public.facility_access
FOR SELECT
USING (true);

-- Step 4: (clean slate) The original migration seeded a Corporate -> Lake Charles
-- hierarchy row using a company UUID specific to the freedomrap database. That ID
-- does not exist in a fresh database, so the row is intentionally omitted here.
-- Configure the facility hierarchy for your own companies after setup, e.g.:
--   INSERT INTO public.facility_access (parent_id, child_id)
--   SELECT (SELECT id FROM public.companies WHERE name = 'CORPORATE'),
--          (SELECT id FROM public.companies WHERE name = 'YOUR FACILITY');

-- Step 5: Create security definer function to check facility access
CREATE OR REPLACE FUNCTION public.can_access_facility(_user_id uuid, _target_facility_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- User has no facility restriction (null target = allow)
    _target_facility_id IS NULL
    OR
    -- User belongs to the same facility
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = _user_id 
      AND company_id = _target_facility_id
    )
    OR
    -- User's facility is a parent of the target facility
    EXISTS (
      SELECT 1 FROM facility_access fa
      JOIN users u ON u.company_id = fa.parent_id
      WHERE u.id = _user_id
      AND fa.child_id = _target_facility_id
    )
    OR
    -- User is in the parent facility itself (can see their own data)
    EXISTS (
      SELECT 1 FROM users u
      JOIN facility_access fa ON fa.parent_id = u.company_id
      WHERE u.id = _user_id
      AND fa.parent_id = _target_facility_id
    )
$$;

-- Step 6: Update RLS policies for risks table
-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view all risks" ON public.risks;

-- Create new facility-based SELECT policy
CREATE POLICY "Users can view facility risks"
ON public.risks
FOR SELECT
USING (
  can_access_facility(auth.uid(), company_id)
);

-- Step 7: Update RLS policies for users table
-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view all users" ON public.users;

-- Create new facility-based SELECT policy for users
CREATE POLICY "Users can view facility users"
ON public.users
FOR SELECT
USING (
  can_access_facility(auth.uid(), company_id)
);