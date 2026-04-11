const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const whatsapp = "03196590756";
  
  console.log(`Updating departments with WhatsApp: ${whatsapp}`);
  const { data: depts, error: deptError } = await supabase
    .from('departments')
    .update({ whatsapp_number: whatsapp })
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Dummy filter to update all
    
  if (deptError) console.error("Dept Error:", deptError);
  else console.log("Departments updated successfully");

  console.log(`Updating staff with WhatsApp: ${whatsapp}`);
  const { data: staff, error: staffError } = await supabase
    .from('staff_directory')
    .update({ whatsapp_number: whatsapp })
    .neq('id', '00000000-0000-0000-0000-000000000000');
    
  if (staffError) console.error("Staff Error:", staffError);
  else console.log("Staff updated successfully");
}

run();
