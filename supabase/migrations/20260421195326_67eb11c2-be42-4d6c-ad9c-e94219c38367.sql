CREATE OR REPLACE FUNCTION public.set_risks_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_risks_updated_at ON public.risks;

CREATE TRIGGER set_risks_updated_at
BEFORE UPDATE ON public.risks
FOR EACH ROW
EXECUTE FUNCTION public.set_risks_updated_at();