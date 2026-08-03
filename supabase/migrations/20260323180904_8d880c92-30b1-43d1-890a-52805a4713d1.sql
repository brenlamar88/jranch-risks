CREATE POLICY "Admins can delete users"
ON public.users
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));