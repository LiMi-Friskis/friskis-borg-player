import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  "https://eaapffhepvbfcryayipx.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_TP0UobkURSjVgu5QU7neRA_dfBfVMrN";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
);
