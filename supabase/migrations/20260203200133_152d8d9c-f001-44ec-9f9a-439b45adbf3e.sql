-- Drop the existing delete policy
DROP POLICY IF EXISTS "Users can delete risks" ON public.risks;

-- Create a new policy that allows only admins to delete risks
CREATE POLICY "Admins can delete risks" 
ON public.risks 
FOR DELETE 
USING (is_admin(auth.uid()));