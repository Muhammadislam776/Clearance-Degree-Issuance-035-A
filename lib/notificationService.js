/**
 * Notification Service - Real-Time Notification Management
 * Handles notification creation, fetching, and real-time updates
 */

import { supabase } from "./supabaseClient";

const parseMissingColumn = (error) => {
  const message = String(error?.message || error?.details || "");
  const match = message.match(/'([^']+)'\s+column/i);
  return match?.[1] || null;
};

export const createNotificationSafe = async (payload) => {
  try {
    // Validate required fields
    if (!payload?.user_id) {
      console.warn("Skipping notification: user_id is missing or null", { payload });
      return { success: false, error: "user_id is required for notifications" };
    }

    let candidatePayload = {
      user_id: payload.user_id,
      type: payload.type || "system",
      message: payload.message || "",
      is_read: !!payload.is_read,
      ...(payload.title ? { title: payload.title } : {}),
      ...(payload.related_clearance_id ? { related_clearance_id: payload.related_clearance_id } : {}),
      ...(payload.related_chat_id ? { related_chat_id: payload.related_chat_id } : {}),
      ...(payload.action_url ? { action_url: payload.action_url } : {}),
      ...(payload.read_at ? { read_at: payload.read_at } : {}),
    };

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const { error } = await supabase.from("notifications").insert([candidatePayload]);
      if (!error) return { success: true };

      const message = String(error?.message || error?.details || "").toLowerCase();
      const isSchemaMismatch = error?.code === "42703" || message.includes("could not find");
      if (!isSchemaMismatch) throw error;

      const missingColumn = parseMissingColumn(error);
      if (!missingColumn || !(missingColumn in candidatePayload)) throw error;

      // Retry after removing any unknown column reported by PostgREST schema cache.
      const { [missingColumn]: _removed, ...nextPayload } = candidatePayload;
      candidatePayload = nextPayload;
    }

    throw new Error("Notification insert failed after schema fallback attempts.");
  } catch (error) {
    const errorMsg = error?.message || error?.details || String(error) || "Unknown error";
    console.warn("Notification creation failed (non-critical):", errorMsg);
    return { success: false, error: errorMsg };
  }
};

// ====== FETCH NOTIFICATIONS ======

/**
 * Get notifications for a user
 * @param {string} userId - User ID
 * @param {object} filters - Optional filters { isRead, type, limit, offset }
 */
export const getUserNotifications = async (userId, filters = {}) => {
  try {
    if (!userId) throw new Error("User ID is required");

    const { isRead = null, type = null, limit = 50, offset = 0 } = filters;

    let query = supabase
      .from("notifications")
      .select("*", { count: "exact" })
      .eq("user_id", userId);

    if (isRead !== null) {
      query = query.eq("is_read", isRead);
    }

    if (type) {
      query = query.eq("type", type);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return {
      success: true,
      data,
      pagination: { total: count, limit, offset },
      unreadCount: await getUnreadNotificationsCount(userId),
    };
  } catch (error) {
    console.error("Error fetching notifications:", error.message || error);
    return { success: false, error: error.message || "Unknown error" };
  }
};

/**
 * Get unread notification count
 * @param {string} userId - User ID
 */
export const getUnreadNotificationsCount = async (userId) => {
  try {
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error("Error getting unread count:", error);
    return 0;
  }
};

/**
 * Get notifications by type
 * @param {string} userId - User ID
 * @param {string} type - Notification type
 */
export const getNotificationsByType = async (userId, type) => {
  try {
    const validTypes = ["clearance_update", "chat_message", "document_rejected", "deadline_reminder", "system"];
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid type. Must be one of: ${validTypes.join(", ")}`);
    }

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .eq("type", type)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error fetching notifications by type:", error);
    return { success: false, error: error.message };
  }
};

// ====== MANAGE NOTIFICATIONS ======

/**
 * Mark notification as read
 * @param {string} notificationId - Notification ID
 */
export const markNotificationAsRead = async (notificationId) => {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq("id", notificationId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Mark all notifications as read
 * @param {string} userId - User ID
 */
export const markAllNotificationsAsRead = async (userId) => {
  try {
    const { error } = await supabase
      .from("notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) throw error;
    const refreshedCount = await getUnreadNotificationsCount(userId);
    return { success: true, count: refreshedCount };
  } catch (error) {
    console.error("Error marking all as read:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete notification
 * @param {string} notificationId - Notification ID
 */
export const deleteNotification = async (notificationId) => {
  try {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error deleting notification:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete all read notifications
 * @param {string} userId - User ID
 */
export const deleteReadNotifications = async (userId) => {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", userId)
      .eq("is_read", true);

    if (error) throw error;
    return { success: true, deletedCount: data.length };
  } catch (error) {
    console.error("Error deleting read notifications:", error);
    return { success: false, error: error.message };
  }
};

// ====== CREATE NOTIFICATIONS ======

/**
 * Create a clearance update notification
 */
export const notifyClearanceUpdate = async (studentId, clearanceId, status) => {
  try {
    const messages = {
      approved: "Your clearance request has been approved! You're all set.",
      rejected: "Your clearance request was rejected. Please contact the office for details.",
      returned: "Your clearance request needs revision. Please review feedback.",
      under_review: "Your clearance is under final review. We'll notify you soon.",
      submitted: "Your clearance request has been submitted successfully.",
    };

    return await createNotificationSafe({
      user_id: studentId,
      type: "clearance_update",
      title: "Clearance Status Updated",
      message: messages[status] || `Clearance status: ${status}`,
      related_clearance_id: clearanceId,
      is_read: false,
    });
  } catch (error) {
    console.error("Error creating clearance notification:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Create a document rejection notification
 */
export const notifyDocumentRejected = async (studentId, clearanceId, documentName, reason) => {
  try {
    return await createNotificationSafe({
      user_id: studentId,
      type: "document_rejected",
      title: "Document Rejected",
      message: `Document "${documentName}" was rejected: ${reason}`,
      related_clearance_id: clearanceId,
      is_read: false,
    });
  } catch (error) {
    console.error("Error creating rejection notification:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Create a deadline reminder notification
 */
export const notifyDeadlineReminder = async (userId, clearanceId, daysRemaining) => {
  try {
    return await createNotificationSafe({
      user_id: userId,
      type: "deadline_reminder",
      title: "Deadline Reminder",
      message: `You have ${daysRemaining} days to complete your clearance.`,
      related_clearance_id: clearanceId,
      is_read: false,
    });
  } catch (error) {
    console.error("Error creating deadline notification:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Create a chat message notification
 */
export const notifyChatMessage = async (userId, chatId, senderName, messagePreview) => {
  try {
    return await createNotificationSafe({
      user_id: userId,
      type: "chat_message",
      title: `New message from ${senderName}`,
      message: messagePreview,
      related_chat_id: chatId,
      is_read: false,
    });
  } catch (error) {
    console.error("Error creating chat notification:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Create a system notification
 */
export const notifySystem = async (userId, title, message, actionUrl = null) => {
  try {
    return await createNotificationSafe({
      user_id: userId,
      type: "system",
      title,
      message,
      action_url: actionUrl,
      is_read: false,
    });
  } catch (error) {
    console.error("Error creating system notification:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Bulk create notifications for multiple users
 */
export const bulkCreateNotifications = async (userIds, notificationData) => {
  try {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw new Error("User IDs array required");
    }

    const notifications = userIds.map((userId) => ({
      user_id: userId,
      type: notificationData.type,
      message: notificationData.message || "",
      is_read: false,
      ...(notificationData.title ? { title: notificationData.title } : {}),
    }));

    const { data, error } = await supabase.from("notifications").insert(notifications).select();

    if (error) {
      // If error is about title column, retry without it
      const message = String(error?.message || error?.details || "").toLowerCase();
      if (error?.code === "42703" || message.includes("title")) {
        console.warn("Retrying bulk notifications without title column");
        
        const minimalNotifications = userIds.map((userId) => ({
          user_id: userId,
          type: notificationData.type,
          message: notificationData.message || "",
          is_read: false,
        }));

        const { data: retryData, error: retryError } = await supabase
          .from("notifications")
          .insert(minimalNotifications)
          .select();

        if (retryError) throw retryError;
        return { success: true, count: retryData.length };
      }
      throw error;
    }

    return { success: true, count: data.length };
  } catch (error) {
    console.warn("Bulk notification creation failed (non-critical):", error?.message || String(error));
    return { success: false, error: error?.message || String(error) };
  }
};

// ====== REAL-TIME SUBSCRIPTIONS ======

/**
 * Subscribe to user notifications
 * @param {string} userId - User ID
 * @param {function} onNewNotification - Callback function
 */
export const subscribeToNotifications = (userId, onNewNotification) => {
  return supabase
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        onNewNotification(payload.new);
      }
    )
    .subscribe();
};

/**
 * Subscribe to unread notification count changes
 * @param {string} userId - User ID
 * @param {function} onCountChange - Callback function
 */
export const subscribeToUnreadCount = (userId, onCountChange) => {
  return supabase
    .channel(`unread:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      async () => {
        const count = await getUnreadNotificationsCount(userId);
        onCountChange(count);
      }
    )
    .subscribe();
};

/**
 * Get notification badge count
 * Returns count of unread notifications by type
 */
export const getNotificationBadges = async (userId) => {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("type")
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) throw error;

    const badges = {
      clearance: 0,
      chat: 0,
      documents: 0,
      reminders: 0,
      system: 0,
    };

    data.forEach((notif) => {
      if (notif.type === "clearance_update") badges.clearance++;
      else if (notif.type === "chat_message") badges.chat++;
      else if (notif.type === "document_rejected") badges.documents++;
      else if (notif.type === "deadline_reminder") badges.reminders++;
      else if (notif.type === "system") badges.system++;
    });

    return { success: true, badges };
  } catch (error) {
    console.error("Error getting notification badges:", error);
    return { success: false, error: error.message };
  }
};

export default {
  getUserNotifications,
  getUnreadNotificationsCount,
  getNotificationsByType,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteReadNotifications,
  createNotificationSafe,
  notifyClearanceUpdate,
  notifyDocumentRejected,
  notifyDeadlineReminder,
  notifyChatMessage,
  notifySystem,
  bulkCreateNotifications,
  subscribeToNotifications,
  subscribeToUnreadCount,
  getNotificationBadges,
};
