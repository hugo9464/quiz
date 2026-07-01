import { createClient } from "@supabase/supabase-js";

// Client Supabase unique (app publique sans auth : on utilise la anon key).
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
);
