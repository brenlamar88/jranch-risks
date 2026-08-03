-- First, we need to handle the transition from text to uuid for responsible_person
-- Add a new column for responsible_person_id
ALTER TABLE public.risks ADD COLUMN responsible_person_id uuid REFERENCES public.users(id);

-- Note: Existing data in responsible_person (text) cannot be automatically converted
-- You may need to manually map names to user IDs if there's existing data

-- For now, we'll keep both columns temporarily to allow for data migration
-- After data is migrated, you can drop the old responsible_person column with:
-- ALTER TABLE public.risks DROP COLUMN responsible_person;
-- ALTER TABLE public.risks RENAME COLUMN responsible_person_id TO responsible_person;

-- Update the RLS policy to allow both creator and responsible person to update
DROP POLICY IF EXISTS "Users can update own risks" ON public.risks;

CREATE POLICY "Users can update own or assigned risks" 
ON public.risks 
FOR UPDATE 
USING (
  auth.uid() = created_by OR 
  auth.uid() = responsible_person_id
);