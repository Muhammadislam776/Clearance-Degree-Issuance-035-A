import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://qogreolbbfunsiumhldv.supabase.co";
const supabaseKey = "sb_publishable_7spXadc6MFiJesB6GtxVow_01yPLskx";

export const supabase = createClient(supabaseUrl, supabaseKey);