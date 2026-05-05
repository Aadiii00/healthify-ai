-- Add missing profile columns to patients table
ALTER TABLE public.patients
ADD COLUMN IF NOT EXISTS weight_kg NUMERIC,
ADD COLUMN IF NOT EXISTS height_cm NUMERIC,
ADD COLUMN IF NOT EXISTS blood_type TEXT,
ADD COLUMN IF NOT EXISTS medical_conditions TEXT[];

-- Create meal_plans table
CREATE TABLE IF NOT EXISTS public.meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  goal TEXT,
  plan_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for meal_plans
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for meal_plans
CREATE POLICY "Patients read own meal plans" ON public.meal_plans FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Patients insert own meal plans" ON public.meal_plans FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.user_id = auth.uid())
);

CREATE POLICY "Doctors read meal plans" ON public.meal_plans FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.doctors d WHERE d.user_id = auth.uid())
);
