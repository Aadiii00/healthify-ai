import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://vcminwfbnkindhdvxlmx.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_6mOQBPjdfq47GA6NSOFJ3Q_slQ94eY4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function seedDoctors() {
  const doctorsToSeed = [
    { full_name: 'Dr. John Miller', specialty: 'Neurologist', contact_info: 'miller_demo@healthify.com', experience_years: 15, rating: 4.9, password: 'password123' },
    { full_name: 'Dr. Alice Wong', specialty: 'Pediatrician', contact_info: 'wong_demo@healthify.com', experience_years: 8, rating: 4.7, password: 'password123' },
    { full_name: 'Dr. Robert Davis', specialty: 'Orthopedist', contact_info: 'davis_demo@healthify.com', experience_years: 20, rating: 4.6, password: 'password123' }
  ];

  for (const doc of doctorsToSeed) {
    console.log(`Signing up ${doc.full_name}...`);
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: doc.contact_info,
      password: doc.password,
      options: {
        data: { name: doc.full_name }
      }
    });

    if (authError) {
      console.error(`Error signing up ${doc.full_name}:`, authError.message);
      continue;
    }

    if (!authData.user) {
      console.log(`No user returned for ${doc.full_name}`);
      continue;
    }

    console.log(`Inserting doctor profile for ${doc.full_name}...`);
    const { error: dbError } = await supabase.from('doctors').insert({
      user_id: authData.user.id,
      full_name: doc.full_name,
      specialty: doc.specialty,
      contact_info: doc.contact_info,
      experience_years: doc.experience_years,
      rating: doc.rating
    });

    if (dbError) {
      console.error(`Error inserting doctor ${doc.full_name}:`, dbError.message);
    } else {
      console.log(`Successfully added ${doc.full_name}!`);
    }
  }
}

seedDoctors().catch(console.error);
