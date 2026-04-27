/**
 * Clearance Service - Database-Driven Clearance Management
 * Handles all clearance requests, tasks, and status tracking
 */

import { supabase } from "./supabaseClient";
import { notifyClearanceUpdate, createNotificationSafe } from "./notificationService";

// ====== HELPER: FETCH WITH TIMEOUT ======
const withTimeout = (promise, ms = 15000) => {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Database request timed out. This usually happens due to a poor internet connection or a database lock. Please refresh and try again.")), ms)
  );
  return Promise.race([promise, timeout]);
};

// ====== CLEARANCE REQUESTS ======

/**
 * Submit a new clearance request
 * @param {string} student_id - Student's Profile ID (UUID from 'students' table)
 * @param {string} user_id - Student's Auth User ID (UUID from 'users' table)
 * @param {string} requestType - 'final' or 'interim'
 * @param {string} notes - Optional notes
 */
export const submitClearanceRequest = async (student_id, user_id = null, requestType = "final", notes = "") => {
  try {
    if (!student_id) throw new Error("Student ID is required");
    console.log("Submitting clearance request for student:", student_id);

    const getLatestRequest = async () => {
      const { data: latest } = await supabase
        .from("clearance_requests")
        .select("id, student_id, overall_status, degree_issued, created_at")
        .eq("student_id", student_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return latest || null;
    };

    const latestBeforeSubmit = await getLatestRequest();
    if (latestBeforeSubmit && ["pending", "in_progress", "approved", "completed"].includes(latestBeforeSubmit.overall_status)) {
      return { success: true, data: latestBeforeSubmit, reused: true };
    }

    // 1. Create the main clearance request
    let requestData = null;
    let requestError = null;
    try {
      const response = await withTimeout(
        supabase
          .from("clearance_requests")
          .insert([
            {
              student_id: student_id,
              overall_status: "pending",
              degree_issued: false,
              notes: notes.trim(),
              submission_date: new Date().toISOString(),
            },
          ])
          .select()
          .single(),
        45000
      );
      requestData = response?.data || null;
      requestError = response?.error || null;
    } catch (timeoutOrNetworkError) {
      const latestAfterTimeout = await getLatestRequest();
      const justCreated =
        latestAfterTimeout &&
        (!latestBeforeSubmit || latestAfterTimeout.id !== latestBeforeSubmit.id) &&
        ["pending", "in_progress", "approved", "completed"].includes(latestAfterTimeout.overall_status);

      if (justCreated) {
        requestData = latestAfterTimeout;
      } else {
        throw timeoutOrNetworkError;
      }
    }

    if (requestError) {
      console.error("DB Request Error:", requestError);
      throw new Error(`Failed to create clearance request: ${requestError.message}`);
    }

    if (!requestData?.id) {
      throw new Error("Failed to create clearance request: request id missing.");
    }

    console.log("Clearance request created:", requestData.id);

    // 2. Create sub-tasks for every department automatically (best-effort)
    try {
      const { data: depts, error: deptsError } = await withTimeout(
        supabase.from("departments").select("id"),
        30000
      );

      if (deptsError) {
        console.error("Error fetching departments:", deptsError);
      }

      if (depts && depts.length > 0) {
        const statusEntries = depts.map((d) => ({
          request_id: requestData.id,
          department_id: d.id,
          status: "pending",
        }));

        const { error: statusError } = await withTimeout(
          supabase.from("clearance_status").insert(statusEntries),
          30000
        );
        if (statusError) {
          console.error("Error creating status entries:", statusError);
        }
      } else {
        console.warn("No departments found. Clearance status entries were not created.");
      }
    } catch (statusInitErr) {
      console.warn("Department status initialization skipped:", statusInitErr?.message || statusInitErr);
    }

    // 3. Create notification for the student (using Auth User ID)
    try {
      let targetUserId = user_id;
      if (!targetUserId) {
        const { data: student } = await supabase.from("students").select("user_id").eq("id", student_id).single();
        targetUserId = student?.user_id;
      }

      if (targetUserId) {
        await notifyClearanceUpdate(targetUserId, requestData.id, "submitted");
      }
    } catch (notifErr) {
      console.warn("Notification system unavailable:", notifErr);
    }

    return { success: true, data: requestData };
  } catch (error) {
    console.error("SubmitClearanceRequest detailed error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all clearance requests for a student
 * @param {string} studentId - Student's user ID (UUID from 'students' table)
 * @param {boolean} includeExpired - If false, filters out pending requests older than 4 days
 */
export const getStudentClearances = async (studentId, includeExpired = false) => {
  try {
    if (!studentId) return { success: true, data: [] };

    const { data, error } = await withTimeout(
      supabase
        .from("clearance_requests")
        .select(`
          id,
          overall_status,
          degree_issued,
          submission_date,
          completion_date,
          notes,
          created_at,
          clearance_status (
            id,
            status,
            department_id,
            remarks,
            updated_at,
            departments (name)
          )
        `)
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
    );

    if (error) throw error;

    // Fetch documents separately to avoid schema cache relationship issues
    const requestIds = data?.map(r => r.id) || [];
    let allDocuments = [];
    if (requestIds.length > 0) {
      const { data: docs } = await supabase
        .from("documents")
        .select("*")
        .in("request_id", requestIds);
      allDocuments = docs || [];
    }

    // Filter and Map
    const mappedData = (data || []).map(item => {
      // Calculate Progress
      const statuses = item.clearance_status || [];
      const total = statuses.length;
      const approved = statuses.filter(s => s.status === 'approved' || s.status === 'completed').length;
      const rejected = statuses.filter(s => s.status === 'rejected').length;
      const progressPercent = total > 0 ? Math.round((approved / total) * 100) : 0;

      return {
        ...item,
        status: item.overall_status,
        degree_issued: !!item.degree_issued,
        progress: progressPercent,
        approved_count: approved,
        rejected_count: rejected,
        total_departments: total,
        documents: allDocuments.filter(d => d.request_id === item.id),
        clearance_tasks: statuses.map(ts => ({
          ...ts,
          task_type: "Clearance",
          feedback: ts.remarks
        }))
      };
    });

    return { success: true, data: mappedData };
  } catch (error) {
    console.error("Error fetching student clearances:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Get a specific clearance request with all details
 * @param {string} clearanceId - Clearance request ID
 */
export const getClearanceDetails = async (clearanceId) => {
  try {
    const { data, error } = await supabase
      .from("clearance_requests")
      .select(
        `
        *,
        students:student_id (
          id,
          email,
          name
        ),
        clearance_status (
          id,
          status,
          department_id,
          remarks,
          updated_at,
          departments (name)
        ),
        documents (
          id,
          file_url,
          file_type,
          uploaded_at
        )
      `
      )
      .eq("id", clearanceId)
      .single();

    if (error) throw error;

    // Formatting for UI
    const formattedData = {
      ...data,
      status: data.overall_status,
      clearance_tasks: (data.clearance_status || []).map(ts => ({
        ...ts,
        task_type: "Clearance",
        feedback: ts.remarks
      }))
    };

    return { success: true, data: formattedData };
  } catch (error) {
    console.error("Error fetching clearance details:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all clearance requests (for admin/registrar)
 * @param {object} filters - Optional filters { status, department_id, page, limit }
 */
export const getAllClearances = async (filters = {}) => {
  try {
    const { status, department_id, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    let query = supabase
      .from("clearance_requests")
      .select(
        `
        id,
        student_id,
        request_type,
        status,
        submission_date,
        created_at,
        users:student_id (
          id,
          name,
          email
        ),
        student_profiles (
          roll_number,
          departments (name)
        ),
        clearance_tasks (
          id,
          status,
          department_id,
          departments (name, code)
        ),
        documents (
          status
        )
      `,
        { count: "exact" }
      );

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1).order("created_at", {
      ascending: false,
    });

    if (error) throw error;

    return {
      success: true,
      data,
      pagination: {
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit),
      },
    };
  } catch (error) {
    console.error("Error fetching all clearances:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Update clearance status
 * @param {string} clearanceId - Clearance request ID
 * @param {string} newStatus - New status
 */
export const updateClearanceStatus = async (clearanceId, newStatus) => {
  try {
    const validStatuses = ["pending", "in_progress", "completed", "rejected"];
    // Map existing UI statuses to new ones if needed
    let dbStatus = newStatus;
    if (newStatus === "approved") dbStatus = "completed";
    if (newStatus === "submitted") dbStatus = "in_progress";

    if (!validStatuses.includes(dbStatus)) {
      dbStatus = "pending"; // Fallback
    }

    const { data, error } = await supabase
      .from("clearance_requests")
      .update({
        overall_status: dbStatus,
        completion_date: dbStatus === "completed" ? new Date().toISOString() : null,
      })
      .eq("id", clearanceId)
      .select()
      .single();

    if (error) throw error;

    // Notify student of status change
    notifyStudentOfStatusChange(clearanceId, dbStatus).catch(e => console.error(e));

    return { success: true, data };
  } catch (error) {
    console.error("Error updating clearance status:", error);
    return { success: false, error: error.message };
  }
};

// ====== CLEARANCE TASKS ======

/**
 * Get clearance tasks for a specific clearance
 * @param {string} clearanceId - Clearance request ID
 */
export const getClearanceTasks = async (requestId) => {
  try {
    const { data, error } = await supabase
      .from("clearance_status")
      .select(
        `
        id,
        status,
        department_id,
        remarks,
        updated_at,
        departments (name)
      `
      )
      .eq("request_id", requestId)
      .order("updated_at", { ascending: false });

    if (error) throw error;
    
    // Map for UI
    const mappedData = (data || []).map(ts => ({
      ...ts,
      task_type: "Clearance",
      feedback: ts.remarks
    }));

    return { success: true, data: mappedData };
  } catch (error) {
    console.error("Error fetching clearance tasks:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Get pending clearance tasks for a staff member (department)
 * @param {string} staffId - Staff member's user ID
 */
export const getPendingTasksForStaff = async (staffId) => {
  try {
    // 1. First, find which department this staff is in:
    const { data: userProfile } = await supabase
      .from("users")
      .select("department_id")
      .eq("id", staffId)
      .single();
      
    if (!userProfile?.department_id) {
       console.warn("Staff member does not have a department_id assigned.");
       return { success: true, data: [] };
    }

    const { data, error } = await supabase
      .from("clearance_status")
      .select(
        `
        id,
        status,
        remarks,
        department_id,
        updated_at,
        request_id,
        clearance_requests (
          id,
          student_id,
          overall_status,
          students (name, email, roll_number)
        ),
        departments (name)
      `
      )
      .eq("department_id", userProfile.department_id)
      .eq("status", "pending")
      .order("updated_at", { ascending: true });

    if (error) throw error;

    // Map `students` to the expected UI mapping since the front-end expects certain property shapes
    const mappedData = (data || []).map(item => ({
      id: item.id,
      task_type: "Clearance Review",
      status: item.status,
      feedback: item.remarks,
      clearance_id: item.request_id,
      clearance_requests: {
        ...item.clearance_requests,
        users: item.clearance_requests?.students, // UI expects `users`
        student_profiles: item.clearance_requests?.students // UI expects `student_profiles`
      },
      departments: item.departments,
      documents: [] // Documents logic can be mapped if needed
    }));

    return { success: true, data: mappedData };
  } catch (error) {
    console.error("Error fetching pending tasks:", error);
    return { success: false, error: error.message };
  }
};



/**
 * Update clearance task status
 * @param {string} taskId - clearance_status ID (taskId)
 * @param {string} newStatus - New status
 * @param {string} feedback - Optional remarks
 */
export const updateClearanceTaskStatus = async (taskId, newStatus, feedback = "") => {
  try {
    if (!taskId) {
      throw new Error(`Invalid or missing taskId provided: ${taskId}. Make sure you be assigned to the correct department to approve this status.`);
    }

    // UI sends "completed" but DB expects "approved"
    let dbStatus = newStatus === "completed" ? "approved" : newStatus;
    
    const validStatuses = ["pending", "approved", "rejected"];
    if (!validStatuses.includes(dbStatus)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
    }

    const { data: updatedTask, error } = await supabase
      .from("clearance_status")
      .update({
        status: dbStatus,
        remarks: feedback.trim(),
        updated_at: new Date().toISOString()
      })
      .eq("id", taskId)
      .select("*, clearance_requests(id, student_id), departments(name)")
      .single();

    if (error) throw error;

    // AUTOMATION: Check if this was the last pending task and update overall status
    const requestId = updatedTask.request_id || updatedTask.clearance_requests?.id;
    if (requestId) {
      checkAndUpdateClearanceCompletion(requestId).catch(e => 
        console.error("Completion check failed:", e)
      );
    }

    // NOTIFY STUDENT: department approved/rejected their clearance task
    // We run this in the background to avoid blocking the UI response
    (async () => {
      try {
        const studentId = updatedTask.clearance_requests?.student_id;
        const deptName = updatedTask.departments?.name || "A department";
        
        if (studentId && requestId) {
          // 1. Try to find if studentId is the internal PK or already the User ID
          // In this system, student_id often stores the Auth ID directly
          let authUserId = studentId;

          // Verify if it's an internal PK by checking students table
          const { data: studentRecord } = await supabase
            .from("students")
            .select("user_id")
            .eq("id", studentId)
            .maybeSingle();

          if (studentRecord?.user_id) {
            authUserId = studentRecord.user_id;
          }

          // Only proceed if we have a valid user ID
          if (!authUserId) {
            console.warn("Could not find valid user_id for notification. StudentId:", studentId);
            return;
          }

          const deptStatus = dbStatus === "approved" ? "dept_approved" : "dept_rejected";
          const messages = {
            dept_approved: `${deptName} has approved your clearance request. ✅`,
            dept_rejected: `${deptName} has rejected your clearance request. Please review the feedback. ❌`,
          };
          
          const notifResult = await createNotificationSafe({
            user_id: authUserId,
            type: dbStatus === "approved" ? "clearance_update" : "document_rejected",
            title: dbStatus === "approved" ? `${deptName} Approved` : `${deptName} Rejected`,
            message: messages[deptStatus],
            related_clearance_id: requestId,
            is_read: false,
          });

          if (!notifResult.success) {
            console.warn("Notification creation failed (non-critical):", notifResult.error);
          }
        } else {
          console.warn("Missing studentId or requestId for notification. StudentId:", studentId, "RequestId:", requestId);
        }
      } catch (notifErr) {
        console.error("Background notification error:", notifErr?.message || String(notifErr));
      }
    })();

    return { success: true, data: updatedTask };
  } catch (error) {
    console.error("Error updating task status:", error.message || error, JSON.stringify(error));
    return { success: false, error: error.message || "Failed to update record. Make sure you have the correct permissions." };
  }
};

// ====== DOCUMENTS ======

/**
 * Get upload URL for file upload to Supabase Storage
 * @param {string} clearanceId - Clearance request ID
 * @param {string} fileName - Original file name
 */
export const getUploadUrl = async (clearanceId, fileName) => {
  try {
    if (!clearanceId || !fileName) throw new Error("Clearance ID and file name are required");

    // Generate unique file path
    const timestamp = Date.now();
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = `clearances/${clearanceId}/${timestamp}-${sanitizedName}`;

    // Get signed upload URL (valid for 1 hour)
    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUploadUrl(filePath, 3600);

    if (error) throw error;

    return { success: true, uploadUrl: data.signedUrl, filePath };
  } catch (error) {
    console.error("Error getting upload URL:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Register uploaded document in database
 * @param {object} documentData - Document information
 */
export const registerDocument = async (documentData) => {
  try {
    const { requestId, studentId, fileUrl, fileType } = documentData;

    if (!requestId || !studentId || !fileUrl) {
      throw new Error("Request ID, Student ID, and file URL are required");
    }

    const { data, error } = await supabase
      .from("documents")
      .insert([
        {
          request_id: requestId,
          student_id: studentId,
          file_url: fileUrl,
          file_type: fileType,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error("Error registering document:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Get documents for a clearance
 * @param {string} clearanceId - Clearance request ID
 */
export const getDocuments = async (requestId) => {
  try {
    const { data, error } = await supabase
      .from("documents")
      .select(
        `
        id,
        file_url,
        file_type,
        uploaded_at
      `
      )
      .eq("request_id", requestId)
      .order("uploaded_at", { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error fetching documents:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Review/approve document
 * @param {string} documentId - Document ID
 * @param {string} status - 'approved' or 'rejected'
 * @param {string} reason - Rejection reason (if rejected)
 */
export const reviewDocument = async (documentId, status, reason = "") => {
  try {
    if (!["approved", "rejected"].includes(status)) {
      throw new Error("Status must be 'approved' or 'rejected'");
    }

    const { data, error } = await supabase
      .from("documents")
      .update({
        status,
        rejected_reason: status === "rejected" ? reason.trim() : null,
      })
      .eq("id", documentId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error("Error reviewing document:", error);
    return { success: false, error: error.message };
  }
};

// ====== HELPER FUNCTIONS ======

/**
 * Check if all tasks are completed and update clearance status
 */
async function checkAndUpdateClearanceCompletion(clearanceId) {
  try {
    const { data: tasks, error: tasksError } = await supabase
      .from("clearance_status")
      .select("status")
      .eq("request_id", clearanceId);

    if (tasksError) throw tasksError;

    const allApproved = tasks.every((t) => t.status === "approved" || t.status === "completed"); // completed for fallback
    const anyRejected = tasks.some((t) => t.status === "rejected");

    if (anyRejected) {
      // If any department rejects, mark the overall status as rejected so the student can fix and re-apply if needed
      await updateClearanceStatus(clearanceId, "rejected");
    } else if (allApproved && tasks.length > 0) {
      // Department phase is done, but examiner + academic issuance are still pending.
      await updateClearanceStatus(clearanceId, "in_progress");
    }
  } catch (error) {
    console.error("Error checking clearance completion:", error);
  }
}

async function getClearanceWorkflowSnapshot(clearanceId) {
  const { data: request, error: requestError } = await supabase
    .from("clearance_requests")
    .select("id, student_id, overall_status, degree_issued")
    .eq("id", clearanceId)
    .single();

  if (requestError) throw requestError;

  const { data: tasks, error: tasksError } = await supabase
    .from("clearance_status")
    .select("status")
    .eq("request_id", clearanceId);

  if (tasksError) throw tasksError;

  const normalizedTasks = tasks || [];
  const total = normalizedTasks.length;
  const approvedCount = normalizedTasks.filter((task) => ["approved", "completed"].includes(String(task.status).toLowerCase())).length;
  const rejectedCount = normalizedTasks.filter((task) => String(task.status).toLowerCase() === "rejected").length;
  const pendingCount = normalizedTasks.filter((task) => String(task.status).toLowerCase() === "pending").length;
  const allApproved = total > 0 && approvedCount === total;

  return {
    request,
    tasks: normalizedTasks,
    total,
    approvedCount,
    rejectedCount,
    pendingCount,
    allApproved,
  };
}

/**
 * Notify student of status change
 */
/**
 * Notify student of status change
 */
async function notifyStudentOfStatusChange(clearanceId, status) {
  // Run in background
  (async () => {
    try {
      const { data: clearance } = await supabase
        .from("clearance_requests")
        .select("student_id")
        .eq("id", clearanceId)
        .single();

      if (!clearance) return;

      // Resolve Auth User ID (Check both internal ID and direct User ID)
      let authUserId = clearance.student_id;
      const { data: student } = await supabase
        .from("students")
        .select("user_id")
        .eq("id", clearance.student_id)
        .maybeSingle();

      if (student?.user_id) {
        authUserId = student.user_id;
      }

      // Use a direct insert instead of requiring notificationService to avoid circular/runtime issues
      const messages = {
        completed: "Your overall clearance has been fully approved! 🎓",
        rejected: "Your clearance request has been rejected. Check your notifications for details.",
        in_progress: "Your clearance is being processed."
      };

      await createNotificationSafe({
        user_id: authUserId,
        type: "clearance_update",
        title: `Clearance ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        message: messages[status] || `Your clearance status is now ${status}.`,
        related_clearance_id: clearanceId,
        is_read: false,
      });
    } catch (error) {
      console.error("Background status notification error:", error);
    }
  })();
}

/**
 * Notify staff of document upload
 */
async function notifyStaffOfDocumentUpload(taskId, fileName) {
  try {
    // In the new schema, we notify the department associated with the task
    const { data: task } = await supabase
      .from("clearance_status")
      .select("department_id")
      .eq("id", taskId)
      .single();

    if (!task || !task.department_id) return;

    // We can't notify a specific person easily without department_staff mapping, 
    // but we can log it or create a general department notification.
    console.log(`Document ${fileName} uploaded for department ${task.department_id}`);
  } catch (error) {
    console.error("Error notifying staff:", error);
  }
}

/**
 * Create a notification
 */
async function createNotification(
  userId,
  type,
  title,
  message,
  clearanceId = null,
  chatId = null,
  actionUrl = null
) {
  try {
    await supabase.from("notifications").insert([
      {
        user_id: userId,
        type,
        title,
        message,
        related_clearance_id: clearanceId,
        related_chat_id: chatId,
        action_url: actionUrl,
        is_read: false,
      },
    ]);
  } catch (error) {
    console.error("Error creating notification:", error);
  }
}

// ====== REAL-TIME SUBSCRIPTIONS ======

/**
 * Subscribe to clearance status changes
 * @param {string} clearanceId - Clearance request ID
 * @param {function} onUpdate - Callback function
 */
export const subscribeToClearanceUpdates = (clearanceId, onUpdate) => {
  return supabase
    .channel(`clearance:${clearanceId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "clearance_requests",
        filter: `id=eq.${clearanceId}`,
      },
      (payload) => {
        onUpdate(payload.new);
      }
    )
    .subscribe();
};

/**
 * Subscribe to document updates
 * @param {string} clearanceId - Clearance request ID
 * @param {function} onUpdate - Callback function
 */
export const subscribeToDocumentUpdates = (clearanceId, onUpdate) => {
  return supabase
    .channel(`documents:${clearanceId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "documents",
        filter: `request_id=eq.${clearanceId}`,
      },
      (payload) => {
        onUpdate(payload);
      }
    )
    .subscribe();
};

// ====== EXAMINER FUNCTIONS ======

/**
 * getClearedStudents — Fetch only students fully cleared by ALL departments
 * (every clearance_status entry = 'approved') but with degree_issued = false.
 * These are the students the Examiner can act on.
 */
export const getClearedStudents = async () => {
  try {
    const { data, error } = await supabase
      .from("clearance_requests")
      .select(`
        id,
        overall_status,
        degree_issued,
        notes,
        created_at,
        users:student_id (
          id,
          name,
          email
        ),
        clearance_status (
          id,
          status,
          remarks,
          updated_at,
          departments ( id, name )
        )
      `)
      .eq("degree_issued", false)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const pipeline = (data || []).map((req) => {
      const statuses = req.clearance_status || [];
      const clearedCount = statuses.filter(s => s.status === "approved" || s.status === "completed").length;
      const rejectedCount = statuses.filter(s => s.status === "rejected").length;
      const totalDepts = statuses.length;
      const normalizedOverallStatus = String(req.overall_status || "").toLowerCase();
      
      const isCleared = totalDepts > 0 && clearedCount === totalDepts;
      const isDisputed = rejectedCount > 0;
      const examinerApproved = normalizedOverallStatus === "approved";
      const readyForAcademicIssuance = isCleared && examinerApproved && !req.degree_issued;

      return {
        id: req.id,
        studentId: req.users?.id || null,
        studentName: req.users?.name || "Unknown",
        studentEmail: req.users?.email || "—",
        submittedAt: req.created_at,
        overallStatus: req.overall_status,
        normalizedOverallStatus,
        degreeIssued: !!req.degree_issued,
        notes: req.notes || "",
        isCleared,
        isDisputed,
        examinerApproved,
        readyForAcademicIssuance,
        clearedCount,
        totalDepts: totalDepts || 7, // fallback to standard 7
        departmentStatuses: statuses.map((s) => ({
          deptId: s.departments?.id,
          deptName: s.departments?.name || "—",
          status: s.status,
          remarks: s.remarks || "",
          updatedAt: s.updated_at,
        })),
      };
    });

    return { success: true, data: pipeline };

  } catch (error) {
    console.error("getClearedStudents error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * getIssuedDegrees — Fetch all students who have already been issued a degree.
 * We query the 'degrees' table directly as it has a defined relationship with 'students'.
 */
export const getIssuedDegrees = async () => {
  try {
    const { data, error } = await supabase
      .from("degrees")
      .select(`
        id,
        degree_title,
        issued_date,
        qr_code,
        created_at,
        students ( id, name, email )
      `)
      .order("created_at", { ascending: false });


    if (error) throw error;

    const issued = (data || []).map((deg) => ({
      id: deg.id,
      studentId: deg.students?.id || null,
      studentName: deg.students?.name || "Unknown",
      studentEmail: deg.students?.email || "—",
      issuedAt: deg.issued_date || deg.issued_at || deg.created_at,
      degreeTitle: deg.degree_title || "Degree",
      qrCode: deg.qr_code || "",
      notes: "Official record maintained in degrees ledger.",
    }));

    return { success: true, data: issued };
  } catch (error) {
    console.error("getIssuedDegrees error:", error);
    return { success: false, error: error.message };
  }
};



/**
 * approveFinal — Examiner formally approves the overall clearance.
 * Sets overall_status → 'approved' (signals the clearance is vetted by examiner).
 * @param {string} requestId - clearance_requests.id
 * @param {string} comments  - Examiner remarks stored in notes
 */
export const approveFinal = async (requestId, comments = "") => {
  try {
    if (!requestId) throw new Error("Request ID is required");

    const snapshot = await getClearanceWorkflowSnapshot(requestId);

    if (snapshot.rejectedCount > 0) {
      throw new Error("Cannot approve this clearance because one or more departments rejected it.");
    }

    if (!snapshot.allApproved) {
      throw new Error("Cannot approve this clearance until all departments have approved it.");
    }

    const { data, error } = await supabase
      .from("clearance_requests")
      .update({
        overall_status: "approved",
        notes: comments.trim() || null,
        completion_date: new Date().toISOString(),
      })
      .eq("id", requestId)
      .select("id, student_id, overall_status")
      .single();

    if (error) throw error;

    // Fire-and-forget notification
    notifyStudentOfStatusChange(requestId, "approved").catch((e) =>
      console.error("approveFinal notification:", e)
    );

    // Forward to admin-selected academic department for final issuance
    (async () => {
      try {
        const { data: academicDept } = await supabase
          .from("departments")
          .select("id, name")
          .eq("is_academic", true)
          .maybeSingle();

        if (!academicDept?.id && !academicDept?.name) return;

        let query = supabase
          .from("users")
          .select("id")
          .eq("role", "department");

        if (academicDept?.id && academicDept?.name) {
          query = query.or(`department_id.eq.${academicDept.id},department.eq.${academicDept.name}`);
        } else if (academicDept?.id) {
          query = query.eq("department_id", academicDept.id);
        } else {
          query = query.eq("department", academicDept.name);
        }

        const { data: academicStaff } = await query;
        const recipients = (academicStaff || []).map((u) => u.id).filter(Boolean);

        if (recipients.length === 0) return;

        const title = "Final Issuance Required";
        const message = `A clearance request has been approved by examiner and is ready for degree issuance in ${academicDept?.name || "Academic Department"}.`;

        await Promise.all(
          recipients.map((uid) =>
            createNotificationSafe({
              user_id: uid,
              type: "clearance_update",
              title,
              message,
              related_clearance_id: requestId,
              is_read: false,
            })
          )
        );
      } catch (forwardErr) {
        console.warn("approveFinal forward-to-academic notification failed:", forwardErr?.message || forwardErr);
      }
    })();

    return { success: true, data };
  } catch (error) {
    console.error("approveFinal error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * issueDegree — Final step: inserts a degree record and marks the
 * clearance request as degree_issued = true with overall_status = 'completed'.
 * @param {string} requestId  - clearance_requests.id
 * @param {string} studentId  - users.id (student)
 * @param {string} degreeTitle - e.g. "Bachelor of Computer Science"
 * @param {string} comments   - Optional final notes
 */
export const issueDegree = async (requestId, studentId, degreeTitle = "Official Degree", comments = "") => {
  try {
    if (!requestId || !studentId) throw new Error("Request ID and Student ID are required");

    const snapshot = await getClearanceWorkflowSnapshot(requestId);

    if (snapshot.rejectedCount > 0) {
      throw new Error("Degree cannot be issued because one or more departments rejected this clearance.");
    }

    if (!snapshot.allApproved) {
      throw new Error("Degree cannot be issued until all departments have approved the clearance.");
    }

    if (String(snapshot.request.overall_status || "").toLowerCase() !== "approved") {
      throw new Error("Degree cannot be issued until the examiner approves the clearance.");
    }

    if (snapshot.request.degree_issued) {
      throw new Error("Degree has already been issued for this clearance.");
    }

    // 1. Insert degree record
    const { error: degreeError } = await supabase.from("degrees").insert([{
      student_id: studentId,
      request_id: requestId,
      degree_title: degreeTitle,
      qr_code: `VERIFIED-${requestId.substring(0, 8).toUpperCase()}`,
      issued_date: new Date().toISOString(),
    }]);


    // If the degrees table doesn't have request_id column, fall back gracefully
    if (degreeError) {
      const { error: fallbackError } = await supabase.from("degrees").insert([{
        student_id: studentId,
        degree_title: degreeTitle,
        qr_code: `VERIFIED-${requestId.substring(0, 8).toUpperCase()}`,
      }]);
      if (fallbackError) throw fallbackError;
    }

    // 2. Mark clearance as fully complete + degree issued
    const { data, error: updateError } = await supabase
      .from("clearance_requests")
      .update({
        overall_status: "completed",
        degree_issued: true,
        notes: comments.trim() || null,
        completion_date: new Date().toISOString(),
      })
      .eq("id", requestId)
      .select("id, overall_status, degree_issued")
      .single();

    if (updateError) throw updateError;

    // 3. Notify student — degree issued (special notification)
    try {
      await createNotificationSafe({
        user_id: studentId,
        type: "degree_issued",
        title: "🎓 Degree Issued!",
        message: `Congratulations! Your "${degreeTitle}" has been officially issued. Your academic journey is complete!`,
        related_clearance_id: requestId,
        is_read: false,
      });
    } catch (notifErr) {
      console.error("Degree issued notification error:", notifErr);
      // fallback to generic
      notifyStudentOfStatusChange(requestId, "completed").catch((e) =>
        console.error("issueDegree fallback notification:", e)
      );
    }

    return { success: true, data };
  } catch (error) {
    console.error("issueDegree error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Check if a department can issue degrees (must be academic)
 * @param {string} departmentId - Department ID
 * @returns {Promise<boolean>} true if department is academic, false otherwise
 */
export const canDepartmentIssueDegree = async (departmentId) => {
  try {
    if (!departmentId) return false;

    const { data, error } = await supabase
      .from("departments")
      .select("is_academic")
      .eq("id", departmentId)
      .single();

    if (error) {
      console.error("Error checking if department can issue degree:", error);
      return false;
    }

    return !!data?.is_academic;
  } catch (error) {
    console.error("canDepartmentIssueDegree error:", error);
    return false;
  }
};

/**
 * Issue degree through academic department (wrapper for issueDegree with permission check)
 * @param {string} requestId - Clearance request ID
 * @param {string} studentId - Student ID
 * @param {string} departmentId - Academic department ID issuing the degree
 * @param {string} degreeTitle - Degree title (e.g. "Bachelor of Computer Science")
 * @param {string} comments - Optional comments
 */
export const issueDegreeThroughAcademicDept = async (requestId, studentId, departmentId, degreeTitle = "Official Degree", comments = "") => {
  try {
    if (!departmentId) {
      throw new Error("Department ID is required");
    }

    const snapshot = await getClearanceWorkflowSnapshot(requestId);

    if (snapshot.rejectedCount > 0) {
      throw new Error("This clearance cannot move forward because a department rejected it.");
    }

    if (!snapshot.allApproved) {
      throw new Error("Academic issuance is only allowed after all departments approve the clearance.");
    }

    if (String(snapshot.request.overall_status || "").toLowerCase() !== "approved") {
      throw new Error("Academic issuance is only allowed after examiner approval.");
    }

    // Verify the department is academic
    const isAcademic = await canDepartmentIssueDegree(departmentId);
    if (!isAcademic) {
      throw new Error("Only academic departments can issue degrees");
    }

    // Call the main issueDegree function
    const result = await issueDegree(requestId, studentId, degreeTitle, comments);
    
    if (result.success) {
      // Optional: Log which department issued the degree (for audit trail)
      console.log(`Degree issued by academic department ${departmentId} for student ${studentId}`);
    }

    return result;
  } catch (error) {
    console.error("issueDegreeThroughAcademicDept error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all departments
 */
export const getDepartments = async () => {
  try {
    const { data, error } = await supabase
      .from("departments")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error fetching departments:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Get clearance by ID (Alias for getClearanceDetails)
 */
export const getClearanceById = async (id) => {
  return getClearanceDetails(id);
};

/**
 * Delete a clearance request
 */
export const deleteClearanceRequest = async (id) => {
  try {
    const { error } = await supabase
      .from("clearance_requests")
      .delete()
      .eq("id", id);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error deleting clearance:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Initialize a student profile if it doesn't exist
 * This ensures users created before the triggers can still use the system
 */
export const initializeStudentProfile = async (user) => {
  try {
    if (!user || !user.id) throw new Error("User data required for initialization");
    console.log("Starting profile initialization for user:", user.id);

    // 1. Check if already exists (by user_id)
    const { data: existingById, error: checkError } = await withTimeout(
      supabase
        .from("students")
        .select("id, user_id")
        .eq("user_id", user.id)
        .maybeSingle()
    );

    if (existingById) {
      console.log("Existing student profile found by user_id:", existingById.id);
      return { success: true, data: existingById };
    }

    // 2. Fallback: Check if already exists (by email) 
    // Sometimes the trigger creates the row but doesn't link the user_id correctly
    const { data: existingByEmail } = await withTimeout(
      supabase
        .from("students")
        .select("id, user_id")
        .eq("email", user.email)
        .maybeSingle()
    );

    if (existingByEmail) {
      console.log("Found student record by email, linking user_id...");
      // Try to link it if it's not linked
      if (!existingByEmail.user_id) {
        await supabase.from("students").update({ user_id: user.id }).eq("id", existingByEmail.id);
      }
      return { success: true, data: existingByEmail };
    }

    // 3. Create new profile (This may fail if RLS prevents manual insertion)
    console.log("No profile found by ID or Email. Attempting to create new student record...");
    const meta = user.user_metadata || {};
    const { data, error } = await withTimeout(
      supabase
        .from("students")
        .insert([{
          user_id: user.id,
          name: meta.name || "Student",
          email: user.email,
          roll_number: meta.roll_number || "PENDING",
          department: "N/A",
          session: "2023-2027"
        }])
        .select()
        .single()
    );

    if (error) {
      console.error("Supabase Insert Student Error:", error);
      if (error.message.includes("row-level security")) {
        throw new Error("You don't have permission to create a student profile manually. Please ensure the database triggers are installed or contact an admin.");
      }
      throw new Error(`Database error while creating student record: ${error.message}`);
    }

    console.log("Student profile created successfully:", data.id);
    return { success: true, data };
  } catch (error) {
    console.error("Error in initializeStudentProfile:", error);
    return { success: false, error: error.message };
  }
};

const clearanceService = {
  submitClearanceRequest,
  getStudentClearances,
  getAllClearances,
  getClearanceById,
  getClearanceDetails,
  updateClearanceStatus,
  deleteClearanceRequest,
  getDepartments,
  getClearanceTasks,
  getPendingTasksForStaff,
  updateClearanceTaskStatus,
  getUploadUrl,
  registerDocument,
  getDocuments,
  reviewDocument,
  subscribeToClearanceUpdates,
  subscribeToDocumentUpdates,
  // Examiner
  getClearedStudents,
  getIssuedDegrees,
  approveFinal,
  issueDegree,
  initializeStudentProfile,
};

export default clearanceService;
