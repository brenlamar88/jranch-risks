-- First, let's check and fix the foreign key constraint on risks table
-- The issue is that created_by likely references auth.users, but we should use public.users instead

-- Drop the existing foreign key constraint if it exists
ALTER TABLE public.risks 
DROP CONSTRAINT IF EXISTS risks_created_by_fkey;

-- Add the foreign key constraint to reference public.users
ALTER TABLE public.risks
ADD CONSTRAINT risks_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES public.users(id) 
ON DELETE SET NULL;

-- Create the trigger to handle new user signups (if not exists)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();