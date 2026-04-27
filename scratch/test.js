const { createClient } = require("@supabase/supabase-js");
const supabase = createClient("https://qogreolbbfunsiumhldv.supabase.co", "sb_publishable_7spXadc6MFiJesB6GtxVow_01yPLskx");
async function run() {
  const { data, error } = await supabase.from("clearance_requests").select("id, student_id").limit(1);
  console.log("clearance_requests sample:", data, error);

  const { data: s, error: e } = await supabase.from("students").select("*").limit(1);
  console.log("students sample:", s, e);

  // Try join
  const { data: j, error: je } = await supabase.from("clearance_requests").select("id, student_id, students(*)").limit(1);
  console.log("join sample:", j, je);
}
run();
