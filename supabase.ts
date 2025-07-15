// This file is now 'supabase.js'
import { createClient } from '@supabase/supabase-js';
import { Database } from './supabase-types';

// These values are injected by the build tool (e.g., Vite) from environment variables.
// In Netlify, these are set in the site's build & deploy settings.
// For local development, they should be in a .env file at the project root.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// This check provides a clear error if the environment variables are missing
// and prevents the app from attempting to run in a broken state.
if (!supabaseUrl || !supabaseAnonKey) {
  const message = "Configuration Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in your environment variables.";
  console.error(message);
  throw new Error(message);
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);