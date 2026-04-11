import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qogreolbbfunsiumhldv.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_7spXadc6MFiJesB6GtxVow_01yPLskx";

export const supabase = createClient(supabaseUrl, supabaseKey);