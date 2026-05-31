import { createClient } from "@supabase/supabase-js";

type CreateClientImpl = (
  supabaseUrl: string,
  supabaseKey: string,
  options: {
    auth: {
      autoRefreshToken: boolean;
      detectSessionInUrl: boolean;
      persistSession: boolean;
    };
  },
) => any;

type CreateServerSupabaseClientOptions = {
  supabaseUrl?: string;
  supabaseKey?: string;
  createClientImpl?: CreateClientImpl;
};

export const createServerSupabaseClient = ({
  supabaseUrl,
  supabaseKey,
  createClientImpl = createClient as unknown as CreateClientImpl,
}: CreateServerSupabaseClientOptions = {}) => {
  if (!supabaseUrl || !supabaseKey || !createClientImpl) return null;
  return createClientImpl(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
};
