import { createClient } from "@supabase/supabase-js";

export const createServerSupabaseClient = ({
  supabaseUrl,
  supabaseKey,
  createClientImpl = createClient,
} = {}) => {
  if (!supabaseUrl || !supabaseKey || !createClientImpl) return null;
  return createClientImpl(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
};
