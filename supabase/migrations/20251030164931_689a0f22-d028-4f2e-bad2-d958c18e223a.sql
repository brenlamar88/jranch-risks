-- Add company_id to users table for facility assignment
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

-- Update RLS policy on risks to only allow users to update their own risks
DROP POLICY IF EXISTS "Users can update risks" ON public.risks;

CREATE POLICY "Users can update own risks"
ON public.risks
FOR UPDATE
USING (auth.uid() = created_by);