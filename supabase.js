
import { createClient } from '@supabase/supabase-js';

// These values are sourced from environment variables.
// It's assumed the execution environment (e.g. via a script on the page) makes these available on `process.env`.
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

// This check provides a clear error if the environment variables are missing
// and prevents the app from attempting to run in a broken state.
if (!supabaseUrl || !supabaseAnonKey) {
  const message = "Configuration Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in your environment variables.";
  console.error(message);
  // We're throwing an error here to halt execution, as the app is unusable without these keys.
  // In a production app, you might want to show a friendlier message to the user.
  throw new Error(message);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
