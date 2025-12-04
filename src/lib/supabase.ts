import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase environment variables. Authentication will not work.');
}

export const supabase = createClient(
    supabaseUrl && supabaseUrl !== 'your_project_url_here' ? supabaseUrl : 'https://placeholder.supabase.co',
    supabaseAnonKey && supabaseAnonKey !== 'your_anon_key_here' ? supabaseAnonKey : 'placeholder'
);
