/**
 * Clearance Service - Database-Driven Clearance Management
 * Handles all clearance requests, tasks, and status tracking
 */

import { supabase } from "./supabaseClient";

// ====== CLEARANCE REQUESTS ======

/**
 * Submit a new clearance request
 * @param {string} studentId - Student's user ID
 * @param {string} requestType - 'final' or 'interim'
 * @param {string} notes - Optional notes
 */
export const submitClearanceRequest = async (student_id, requestType = "final", notes = "") => {
  try {
    if (!student_id) throw new Error("Student ID is required");

    const { data, error } = await supabase
      .from("clearance_requests")
      .insert([
        {
          student_id: student_id,
          // overall_status is 'pending' by default in DB
          overall_status: "pending",
          degree_issued: false,
          notes: notes.trim(),
          submission_date: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // 2. Create sub-tasks for every department automatically
    // This ensures visibility in department dashboards even if DB triggers are missing
    const { data: depts } = await supabase.from("departments").select("id");
    if (depts && depts.length > 0) {
      const statusEntries = depts.map(d => ({
        request_id: data.id,
        department_id: d.id,
        status: "pending"
      }));
      await supabase.from("clearance_status").insert(statusEntries);
    }

    // 3. Create notification for the student
    const { notifyClearanceUpdate } = require("./notificationService");
    notifyClearanceUpdate(
      student_id,
      data.id,
      "submitted"
    ).catch(err => console.error("Notification error:", err));

    return { success: true, data };
  } catch (error) {
    console.error("Error submitting clearance:", error);
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

    const { data, error } = await supabase
      .from("clearance_requests")
      .select(
        `
        id,
        overall_status,
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
      `
      )
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });

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
    const now = new Date();
    const expiryThreshold = 4 * 24 * 60 * 60 * 1000; // 4 days in ms

    const mappedData = (data || []).filter(item => {
      if (includeExpired) return true;
      
      // Auto-expiry Logic:
      // If status is 'pending' AND created more than 4 days ago, and NO department has marked it yet
      // we hide it (treat it as "removed" as per user request)
      if (item.overall_status === "pending") {
        const createdDate = new Date(item.created_at);
        const age = now - createdDate;
        
        // If it's too old and no progress has been made (all tasks are pending)
        const hasNoProgress = (item.clearance_status || []).every(s => s.status === 'pending');
        
        if (age > expiryThreshold && hasNoProgress) {
          return false; // Remove from list
        }
      }
      return true;
    }).map(item => {
      // Calculate Progress
      const statuses = item.clearance_status || [];
      const total = statuses.length;
      const approved = statuses.filter(s => s.status === 'approved' || s.status === 'completed').length;
      const rejected = statuses.filter(s => s.status === 'rejected').length;
      const progressPercent = total > 0 ? Math.round((approved / total) * 100) : 0;

      return {
        ...item,
        status: item.overall_status,
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
    const validStatuses = ["pending", "in_progress", "completed"];
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
      .select("*, clearance_requests(id)")
      .single();

    if (error) throw error;

    // AUTOMATION: Check if this was the last pending task and update overall status
    const requestId = updatedTask.request_id || updatedTask.clearance_requests?.id;
    if (requestId) {
      // We run this in the background to ensure the task response is fast
      checkAndUpdateClearanceCompletion(requestId).catch(e => 
        console.error("Completion check failed:", e)
      );
    }

    return { success: true, data: updatedTask };
  } catch (error) {
    console.error("Error updating task status:", error);
    return { success: false, error: error.message };
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
      // In this schema, we still consider it in_progress if one is rejected, 
      // or we could add a 'rejected' overall status.
      await updateClearanceStatus(clearanceId, "in_progress");
    } else if (allApproved && tasks.length > 0) {
      await updateClearanceStatus(clearanceId, "completed");
    }
  } catch (error) {
    console.error("Error checking clearance completion:", error);
  }
}

/**
 * Notify student of status change
 */
async function notifyStudentOfStatusChange(clearanceId, status) {
  try {
    const { data: clearance } = await supabase
      .from("clearance_requests")
      .select("student_id")
      .eq("id", clearanceId)
      .single();

    if (!clearance) return;

    const { notifyClearanceUpdate } = require("./notificationService");
    await notifyClearanceUpdate(
      clearance.student_id,
      clearanceId,
      status
    );
  } catch (error) {
    console.error("Error notifying student:", error);
  }
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

    // Filter: every department status must be 'approved'
    const cleared = (data || []).filter((req) => {
      const statuses = req.clearance_status || [];
      return (
        statuses.length > 0 &&
        statuses.every((s) => s.status === "approved")
      );
    }).map((req) => ({
      id: req.id,
      studentId: req.users?.id || null,
      studentName: req.users?.name || "Unknown",
      studentEmail: req.users?.email || "—",
      submittedAt: req.created_at,
      overallStatus: req.overall_status,
      notes: req.notes || "",
      departmentStatuses: req.clearance_status.map((s) => ({
        deptId: s.departments?.id,
        deptName: s.departments?.name || "—",
        status: s.status,
        remarks: s.remarks || "",
        updatedAt: s.updated_at,
      })),
      totalDepts: req.clearance_status.length,
    }));

    return { success: true, data: cleared };
  } catch (error) {
    console.error("getClearedStudents error:", error);
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

    // 1. Insert degree record
    const { error: degreeError } = await supabase.from("degrees").insert([{
      student_id: studentId,
      request_id: requestId,
      degree_title: degreeTitle,
      qr_code: `VERIFIED-${requestId.substring(0, 8).toUpperCase()}`,
      issued_at: new Date().toISOString(),
    }]);

    // If the degrees table doesn't have request_id column, fall back gracefully
    if (degreeError) {
      // try without request_id
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

    // 3. Notify student
    notifyStudentOfStatusChange(requestId, "completed").catch((e) =>
      console.error("issueDegree notification:", e)
    );

    return { success: true, data };
  } catch (error) {
    console.error("issueDegree error:", error);
    return { success: false, error: error.message };
  }
};

export default {
  submitClearanceRequest,
  getStudentClearances,
  getClearanceDetails,
  getAllClearances,
  updateClearanceStatus,
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
  approveFinal,
  issueDegree,
};
