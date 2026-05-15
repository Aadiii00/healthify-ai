-- SQL Script to Seed Demo Doctors
-- Please run this in your Supabase SQL Editor to populate the doctors list for testing appointments.

-- 1. Insert some dummy users into auth.users so that they can be linked to the doctors table.
-- We are using raw SQL to insert into auth.users. The user IDs are predetermined UUIDs for simplicity.

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
VALUES
('d0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'smith@demo.com', '$2a$10$Y1/n89DMyH5iX2aT2xHnYuG6lI.15O.K8XFpW./Q5gq01z/U/b65G', now(), now(), now(), '{"provider": "email", "providers": ["email"]}', '{"name": "Dr. Sarah Smith"}', now(), now(), '', '', '', ''),
('d0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'johnson@demo.com', '$2a$10$Y1/n89DMyH5iX2aT2xHnYuG6lI.15O.K8XFpW./Q5gq01z/U/b65G', now(), now(), now(), '{"provider": "email", "providers": ["email"]}', '{"name": "Dr. Mark Johnson"}', now(), now(), '', '', '', ''),
('d0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'lee@demo.com', '$2a$10$Y1/n89DMyH5iX2aT2xHnYuG6lI.15O.K8XFpW./Q5gq01z/U/b65G', now(), now(), now(), '{"provider": "email", "providers": ["email"]}', '{"name": "Dr. Emily Lee"}', now(), now(), '', '', '', '')
ON CONFLICT (id) DO NOTHING;

-- 2. Insert these dummy users into public.doctors.
-- We use the correct columns: full_name, specialty, contact_info, experience_years, rating

INSERT INTO public.doctors (id, user_id, full_name, specialty, contact_info, experience_years, rating)
VALUES
(gen_random_uuid(), 'd0000000-0000-0000-0000-000000000001', 'Dr. Sarah Smith', 'Cardiologist', 'smith@demo.com', 15, 4.9),
(gen_random_uuid(), 'd0000000-0000-0000-0000-000000000002', 'Dr. Mark Johnson', 'Dermatologist', 'johnson@demo.com', 8, 4.7),
(gen_random_uuid(), 'd0000000-0000-0000-0000-000000000003', 'Dr. Emily Lee', 'General Practitioner', 'lee@demo.com', 20, 4.6)
ON CONFLICT (user_id) DO NOTHING;
