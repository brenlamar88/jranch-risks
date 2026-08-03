-- Drop the policy first
DROP POLICY IF EXISTS "Users can update own or assigned risks" ON public.risks;

-- Drop the foreign key constraint
ALTER TABLE public.risks DROP CONSTRAINT IF EXISTS risks_responsible_person_id_fkey;

-- Change responsible_person_id to array of UUIDs to support multiple responsible parties
ALTER TABLE public.risks 
  ALTER COLUMN responsible_person_id TYPE uuid[] USING ARRAY[responsible_person_id],
  ALTER COLUMN responsible_person_id SET DEFAULT '{}';

-- Recreate the policy to check if user is in the array of responsible persons
CREATE POLICY "Users can update own or assigned risks" 
ON public.risks 
FOR UPDATE 
USING ((auth.uid() = created_by) OR (auth.uid() = ANY(responsible_person_id)));