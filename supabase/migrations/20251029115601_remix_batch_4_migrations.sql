
-- Migration: 20251025154148
-- Create lookup tables first
CREATE TABLE IF NOT EXISTS public.departments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT departments_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.companies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT companies_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.service_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT service_lines_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.focus_areas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT focus_areas_pkey PRIMARY KEY (id)
);

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['admin'::text, 'manager'::text, 'staff'::text])),
  department_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT fk_users_department FOREIGN KEY (department_id) REFERENCES public.departments(id)
);

-- Create risks table
CREATE TABLE IF NOT EXISTS public.risks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  rap_number text NOT NULL UNIQUE,
  department_id uuid,
  company_id uuid,
  service_line_id uuid,
  focus_area_id uuid,
  risk_description text NOT NULL,
  root_cause text,
  action_plan text NOT NULL,
  responsible_person text NOT NULL,
  risk_level text NOT NULL CHECK (risk_level = ANY (ARRAY['1'::text, '2'::text, '3'::text, '4'::text, '5'::text])),
  date_identified date NOT NULL,
  target_completion_date date NOT NULL,
  actual_completion_date date,
  status text NOT NULL DEFAULT 'open'::text CHECK (status = ANY (ARRAY['open'::text, 'in_progress'::text, 'completed'::text, 'overdue'::text])),
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  priority_level text DEFAULT '3'::text CHECK (priority_level = ANY (ARRAY['1'::text, '2'::text, '3'::text, 'remaining'::text, 'ongoing'::text])),
  CONSTRAINT risks_pkey PRIMARY KEY (id),
  CONSTRAINT risks_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id),
  CONSTRAINT risks_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id),
  CONSTRAINT risks_service_line_id_fkey FOREIGN KEY (service_line_id) REFERENCES public.service_lines(id),
  CONSTRAINT risks_focus_area_id_fkey FOREIGN KEY (focus_area_id) REFERENCES public.focus_areas(id),
  CONSTRAINT risks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  risk_id uuid,
  type text NOT NULL CHECK (type = ANY (ARRAY['overdue'::text, 'due_soon'::text, 'completed'::text])),
  message text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT notifications_risk_id_fkey FOREIGN KEY (risk_id) REFERENCES public.risks(id)
);

-- Create scorecards table
CREATE TABLE IF NOT EXISTS public.scorecards (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  department_id uuid,
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  year integer NOT NULL,
  total_risks integer DEFAULT 0,
  completed_risks integer DEFAULT 0,
  overdue_risks integer DEFAULT 0,
  completion_rate numeric DEFAULT 0,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT scorecards_pkey PRIMARY KEY (id),
  CONSTRAINT scorecards_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id)
);

-- Enable RLS on all tables
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scorecards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lookup tables (read-only for authenticated users)
CREATE POLICY "Authenticated users can view departments" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view companies" ON public.companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view service_lines" ON public.service_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view focus_areas" ON public.focus_areas FOR SELECT TO authenticated USING (true);

-- RLS Policies for users table
CREATE POLICY "Users can view all users" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE TO authenticated USING (auth.uid() = id);

-- RLS Policies for risks table
CREATE POLICY "Users can view all risks" ON public.risks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create risks" ON public.risks FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update risks" ON public.risks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete risks" ON public.risks FOR DELETE TO authenticated USING (true);

-- RLS Policies for notifications table
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- RLS Policies for scorecards table
CREATE POLICY "Users can view all scorecards" ON public.scorecards FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage scorecards" ON public.scorecards FOR ALL TO authenticated USING (true);

-- Insert initial lookup data
INSERT INTO public.departments (name) VALUES
  ('ADMINISTRATION'),
  ('BILLING'),
  ('CLINICAL SERVICES'),
  ('DIAGNOSTICS'),
  ('DIETARY'),
  ('ENVIRONMENT OF CARE'),
  ('HOUSEKEEPING'),
  ('HUMAN RESOURCES'),
  ('LABORATORY'),
  ('MEDICAL RECORDS'),
  ('NURSING'),
  ('OUTPATIENT SERVICES'),
  ('PHARMACY'),
  ('ACCOUNTING/FINANCE'),
  ('PHYSICIAN/LIP SERVICES'),
  ('QAPI'),
  ('REHABILITATION')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.companies (name) VALUES
  ('ALL'),
  ('ACCESS SERENITY'),
  ('BASTROP'),
  ('BUNKIE'),
  ('DEQUINCY'),
  ('DIVISION'),
  ('FERRIDAY'),
  ('FHC'),
  ('FORENSIC'),
  ('GREENVILLE'),
  ('LAKE CHARLES'),
  ('LEESVILLE'),
  ('MAGNOLIA'),
  ('MINDEN'),
  ('MONROE'),
  ('PLAINVIEW')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.service_lines (name) VALUES
  ('LTAC'),
  ('INPATIENT MEDICAL'),
  ('INPATIENT ADULT'),
  ('INPATIENT GERI'),
  ('INPATIENT ADOL'),
  ('IOP'),
  ('RHC'),
  ('FORENSIC'),
  ('ALL')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.focus_areas (name) VALUES
  ('REVENUE'),
  ('UR/CASH'),
  ('EXPENSE CNTR /PC'),
  ('CLINICAL'),
  ('QUALITY'),
  ('ALL')
ON CONFLICT (name) DO NOTHING;

-- Migration: 20251025154748
-- Drop the old trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create function to insert into users table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'staff'
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user signups
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Insert the current authenticated user
INSERT INTO public.users (id, email, full_name, role)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', email),
  'admin'
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM public.users WHERE users.id = auth.users.id
);

-- Migration: 20251025155141
-- Add job_title column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS job_title text;

-- Remove the foreign key constraint for department_id if it exists
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS fk_users_department;

-- Make department_id nullable (it should already be, but let's ensure it)
ALTER TABLE public.users ALTER COLUMN department_id DROP NOT NULL;

-- Migration: 20251029115032
-- Create an enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'staff');

-- Create the user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create a security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policy: Users can view their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Migrate existing roles from users table to user_roles table
INSERT INTO public.user_roles (user_id, role)
SELECT id, role::app_role
FROM public.users
ON CONFLICT (user_id, role) DO NOTHING;
