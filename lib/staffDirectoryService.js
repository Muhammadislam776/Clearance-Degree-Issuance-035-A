/**
 * Staff Directory Service - Staff Contact & WhatsApp Integration
 * Manages staff profiles, availability, and contact information
 */

import { supabase } from "./supabaseClient";

// ====== STAFF DIRECTORY ======

/**
 * Get all staff members in a department
 * @param {string} departmentId - Department ID
 */
export const getDepartmentStaff = async (departmentId) => {
  try {
    if (!departmentId) throw new Error("Department ID is required");

    const { data, error } = await supabase
      .from("staff_directory")
      .select(
        `
        id,
        user_id,
        position,
        office_location,
        phone,
        whatsapp_number,
        availability_status,
        availability_message,
        is_public,
        users (
          id,
          name,
          avatar_url,
          email,
          phone
        ),
        departments (
          id,
          name,
          code
        )
      `
      )
      .eq("department_id", departmentId)
      .eq("is_public", true)
      .order("position", { ascending: true });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error fetching department staff:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all available staff members
 * @param {object} filters - Optional filters { department_id, position, availability_status }
 */
export const getAvailableStaff = async (filters = {}) => {
  try {
    const { department_id = null, position = null, availability_status = "available" } = filters;

    let query = supabase
      .from("staff_directory")
      .select(
        `
        id,
        user_id,
        position,
        office_location,
        phone,
        whatsapp_number,
        availability_status,
        availability_message,
        users (
          id,
          name,
          avatar_url,
          email,
          phone
        ),
        departments (
          id,
          name,
          code
        )
      `
      )
      .eq("is_public", true);

    if (department_id) {
      query = query.eq("department_id", department_id);
    }

    if (position) {
      query = query.eq("position", position);
    }

    if (availability_status) {
      query = query.eq("availability_status", availability_status);
    }

    const { data, error } = await query.order("availability_status", { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error fetching available staff:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Get staff member details including WhatsApp contact
 * @param {string} staffId - Staff member user ID
 */
export const getStaffDetails = async (staffId) => {
  try {
    if (!staffId) throw new Error("Staff ID is required");

    const { data, error } = await supabase
      .from("staff_directory")
      .select(
        `
        id,
        user_id,
        position,
        office_location,
        phone,
        whatsapp_number,
        availability_status,
        availability_message,
        users (
          id,
          name,
          avatar_url,
          email,
          phone,
          role
        ),
        departments (
          id,
          name,
          code
        )
      `
      )
      .eq("user_id", staffId)
      .eq("is_public", true)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    if (!data) {
      throw new Error("Staff member not found or not public");
    }

    // Format contact information
    return {
      success: true,
      data: {
        ...data,
        contacts: {
          email: data.users.email,
          phone: data.phone,
          whatsapp: data.whatsapp_number,
          office: data.office_location,
        },
        availability: {
          status: data.availability_status,
          message: data.availability_message,
        },
      },
    };
  } catch (error) {
    console.error("Error fetching staff details:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Update staff availability status
 * @param {string} userId - Staff user ID
 * @param {string} status - 'available', 'busy', or 'offline'
 * @param {string} message - Optional status message
 */
export const updateStaffAvailability = async (userId, status, message = "") => {
  try {
    const validStatuses = ["available", "busy", "offline"];
    if (!validStatuses.includes(status)) {
      throw new Error(`Status must be one of: ${validStatuses.join(", ")}`);
    }

    const { data, error } = await supabase
      .from("staff_directory")
      .update({
        availability_status: status,
        availability_message: message.trim(),
      })
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error updating availability:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Update staff contact information
 * @param {string} userId - Staff user ID
 * @param {object} contactData - { phone, whatsapp_number, office_location }
 */
export const updateStaffContacts = async (userId, contactData) => {
  try {
    const {} = contactData;

    const { data, error } = await supabase
      .from("staff_directory")
      .update(contactData)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error updating staff contacts:", error);
    return { success: false, error: error.message };
  }
};

// ====== WHATSAPP CONTACT LINKS ======

/**
 * Generate WhatsApp direct message link
 * @param {string} phoneNumber - WhatsApp number with country code (e.g., +92-300-1234567)
 * @param {string} message - Optional pre-filled message
 */
export const generateWhatsAppLink = (phoneNumber, message = "") => {
  try {
    if (!phoneNumber) throw new Error("Phone number is required");

    // Clean phone number (remove all non-digits except +)
    const cleanNumber = phoneNumber.replace(/\D/g, "");
    const formattedNumber = cleanNumber.replace(/^\+/, "");

    // Build WhatsApp Web URL
    let whatsappUrl = `https://wa.me/${formattedNumber}`;

    if (message && message.trim().length > 0) {
      // Encode message for URL
      const encodedMessage = encodeURIComponent(message.trim());
      whatsappUrl += `?text=${encodedMessage}`;
    }

    return whatsappUrl;
  } catch (error) {
    console.error("Error generating WhatsApp link:", error);
    return null;
  }
};

/**
 * Generate WhatsApp business API link (if configured)
 * @param {string} businessPhoneId - WhatsApp Business API phone number ID
 * @param {string} message - Message to send
 */
export const generateWhatsAppBusinessLink = (businessPhoneId, message = "") => {
  try {
    if (!businessPhoneId) throw new Error("Business phone ID is required");

    const encodedMessage = encodeURIComponent(message || "");
    return `https://wa.me/c/${businessPhoneId}?text=${encodedMessage}`;
  } catch (error) {
    console.error("Error generating business WhatsApp link:", error);
    return null;
  }
};

/**
 * Format phone number for WhatsApp
 * @param {string} phoneNumber - Phone number to format
 */
export const formatPhoneForWhatsApp = (phoneNumber) => {
  try {
    if (!phoneNumber) return "";

    // Remove all non-digits except +
    const cleaned = phoneNumber.replace(/\D/g, "");
    const formatted = cleaned.replace(/^(\d{2})/, "+$1");

    return formatted;
  } catch (error) {
    console.error("Error formatting phone:", error);
    return phoneNumber;
  }
};

// ====== CONTACT RECOMMENDATIONS ======

/**
 * Get recommended staff for a specific task
 * @param {string} taskType - Type of task (e.g., 'document_verification', 'fee_clearance')
 * @param {string} departmentId - Department ID
 */
export const getRecommendedStaff = async (taskType, departmentId) => {
  try {
    const staffRoleMap = {
      document_verification: "department",
      fee_clearance: "department",
      equipment_return: "department",
      library_clearance: "department",
      hostel_clearance: "department",
      final_examination: "examiner",
    };

    const role = staffRoleMap[taskType] || "department";

    let query = supabase
      .from("staff_directory")
      .select(
        `
        id,
        user_id,
        position,
        whatsapp_number,
        availability_status,
        users (
          id,
          name,
          email,
          phone,
          role
        ),
        departments (name)
      `
      )
      .eq("is_public", true)
      .eq("availability_status", "available");

    if (departmentId) {
      query = query.eq("department_id", departmentId);
    }

    const { data, error } = await query.limit(5);

    if (error) throw error;
    return { success: true, data, taskType };
  } catch (error) {
    console.error("Error getting recommended staff:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Search staff by name or position
 * @param {string} searchTerm - Search query
 * @param {string} departmentId - Optional department filter
 */
export const searchStaff = async (searchTerm, departmentId = null) => {
  try {
    if (!searchTerm || searchTerm.trim().length < 2) {
      throw new Error("Search term must be at least 2 characters");
    }

    let query = supabase
      .from("staff_directory")
      .select(
        `
        id,
        user_id,
        position,
        phone,
        whatsapp_number,
        availability_status,
        users (
          id,
          name,
          email,
          avatar_url
        ),
        departments (name, code)
      `
      )
      .eq("is_public", true);

    if (departmentId) {
      query = query.eq("department_id", departmentId);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Filter results by search term
    const filtered = data.filter(
      (staff) =>
        staff.users.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.departments.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return { success: true, data: filtered };
  } catch (error) {
    console.error("Error searching staff:", error);
    return { success: false, error: error.message };
  }
};

// ====== CONTACT PREFERENCES ======

/**
 * Get user's preferred contact staff
 * @param {string} userId - User ID
 */
export const getPreferredContacts = async (userId) => {
  try {
    if (!userId) throw new Error("User ID is required");

    // This could be stored in a preferences table or as default contacts
    // For now, return recent chat contacts
    const { data, error } = await supabase
      .from("chats")
      .select(
        `
        receiver_id,
        last_message_at,
        receiver:receiver_id (
          id,
          name,
          email
        ),
        receiver_staff:receiver_id (
          id,
          whatsapp_number,
          availability_status
        )
      `
      )
      .eq("sender_id", userId)
      .eq("is_active", true)
      .order("last_message_at", { ascending: false });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error("Error getting preferred contacts:", error);
    return { success: false, error: error.message };
  }
};

// ====== REAL-TIME SUBSCRIPTIONS ======

/**
 * Subscribe to staff availability changes
 * @param {string} departmentId - Department ID
 * @param {function} onUpdate - Callback function
 */
export const subscribeToStaffAvailability = (departmentId, onUpdate) => {
  return supabase
    .channel(`staff:${departmentId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "staff_directory",
        filter: `department_id=eq.${departmentId}`,
      },
      (payload) => {
        onUpdate(payload.new);
      }
    )
    .subscribe();
};

/**
 * Subscribe to specific staff member updates
 * @param {string} userId - Staff user ID
 * @param {function} onUpdate - Callback function
 */
export const subscribeToStaffUpdates = (userId, onUpdate) => {
  return supabase
    .channel(`staff-user:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "staff_directory",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        onUpdate(payload.new);
      }
    )
    .subscribe();
};

export default {
  getDepartmentStaff,
  getAvailableStaff,
  getStaffDetails,
  updateStaffAvailability,
  updateStaffContacts,
  generateWhatsAppLink,
  generateWhatsAppBusinessLink,
  formatPhoneForWhatsApp,
  getRecommendedStaff,
  searchStaff,
  getPreferredContacts,
  subscribeToStaffAvailability,
  subscribeToStaffUpdates,
};
