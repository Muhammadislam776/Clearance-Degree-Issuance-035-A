import { supabase } from "./supabaseClient";
import { notifyClearanceUpdate } from "./notificationService";

export const applyForClearance = async (studentId) => {
  if (!studentId) throw new Error("Student ID is required to apply for clearance");

  try {
    // 1. Create the main clearance request
    const { data: request, error: reqError } = await supabase
      .from("clearance_requests")
      .insert([{ student_id: studentId, overall_status: "pending" }])
      .select()
      .single();

    if (reqError) throw reqError;

    // 2. Fetch all registered departments
    const { data: departments, error: deptErr } = await supabase
      .from("departments")
      .select("id");

    if (deptErr) throw deptErr;

    // 3. Auto-populate sub-status for every department
    if (departments && departments.length > 0) {
      const statusRows = departments.map((dept) => ({
        request_id: request.id,
        department_id: dept.id,
        status: "pending",
      }));

      const { error: statErr } = await supabase
        .from("clearance_status")
        .insert(statusRows);
        
      if (statErr) throw statErr;
    }

    // 4. Send notification using actual robust notification service
    notifyClearanceUpdate(studentId, request.id, "submitted").catch(console.error);

    return { success: true, data: request };
  } catch (error) {
    console.error("Workflow Error [applyForClearance]:", error);
    return { success: false, error: error.message };
  }
};
