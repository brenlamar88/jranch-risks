-- 1) Align public.users IDs to auth.users IDs for accounts with same email
WITH matches AS (
  SELECT pu.id AS old_id, au.id AS new_id
  FROM public.users pu
  JOIN auth.users au ON au.email = pu.email
  WHERE pu.id <> au.id
)
UPDATE public.users pu
SET id = m.new_id
FROM matches m
WHERE pu.id = m.old_id;

-- 2) Backfill any remaining missing users from auth.users after alignment
INSERT INTO public.users (id, email, full_name, role)
SELECT au.id,
       au.email,
       COALESCE(au.raw_user_meta_data->>'full_name', au.email),
       'staff'
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL;