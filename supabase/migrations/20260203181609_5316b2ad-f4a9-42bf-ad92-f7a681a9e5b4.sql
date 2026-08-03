-- Drop the restrictive update policy
DROP POLICY IF EXISTS "Users can update own or assigned risks" ON public.risks;

-- Create a new policy that allows all authenticated users to update risks
CREATE POLICY "Authenticated users can update risks" 
ON public.risks 
FOR UPDATE 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);