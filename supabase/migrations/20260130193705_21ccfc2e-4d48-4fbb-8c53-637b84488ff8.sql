-- Add completion_percentage column to risks table
ALTER TABLE public.risks
ADD COLUMN completion_percentage integer DEFAULT 0;