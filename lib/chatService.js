/**
 * Chat Service - Real-Time Messaging & Conversation Management
 * Handles two-way communication with real-time updates and message persistence
 */

import { supabase } from "./supabaseClient";

// ====== CONVERSATIONS ======

/**
 * Get or create a conversation between two users
 * @param {string} senderId - Current user ID
 * @param {string} receiverId - Other user ID
 * @param {string} clearanceId - Optional related clearance ID
 */
export const getOrCreateChat = async (senderId, receiverId, clearanceId = null) => {
  try {
    if (!senderId || !receiverId) throw new Error("Sender ID and Receiver ID are required");
    if (senderId === receiverId) throw new Error("Cannot chat with yourself");

    // Try to find existing chat
    let { data: existingChat, error: fetchError } = await supabase
      .from("chats")
      .select("id, created_at, last_message_at")
      .or(`and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`)
      .eq("is_active", true)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      // PGRST116 = no rows found (not an error)
      throw fetchError;
    }

    // If chat exists, return it
    if (existingChat) {
      return { success: true, data: existingChat, isNew: false };
    }

    // Create new chat
    const { data: newChat, error: createError } = await supabase
      .from("chats")
      .insert([
        {
          sender_id: senderId,
          receiver_id: receiverId,
          clearance_id: clearanceId,
          subject: `Clearance Discussion`,
          is_active: true,
        },
      ])
      .select()
      .single();

    if (createError) throw createError;

    return { success: true, data: newChat, isNew: true };
  } catch (error) {
    console.error("Error getting/creating chat:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all conversations for a user
 * @param {string} userId - User ID
 * @param {object} filters - Optional filters { sortBy, limit, offset }
 */
export const getUserConversations = async (userId, filters = {}) => {
  try {
    if (!userId) throw new Error("User ID is required");

    const { sortBy = "last_message_at", limit = 50, offset = 0 } = filters;

    const { data, error, count } = await supabase
      .from("chats")
      .select(
        `
        id,
        sender_id,
        receiver_id,
        subject,
        last_message_at,
        is_active,
        created_at,
        users:sender_id (
          id,
          name,
          avatar_url,
          email
        ),
        receiver:receiver_id (
          id,
          name,
          avatar_url,
          email
        ),
        clearance_requests (
          id,
          overall_status
        ),
        chat_messages (
          id,
          message,
          is_read,
          created_at
        )
      `,
        { count: "exact" }
      )
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq("is_active", true)
      .order(sortBy || "last_message_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Process data to add unread count
    const processedData = data.map((chat) => ({
      ...chat,
      otherUser: chat.sender_id === userId ? chat.receiver : chat.users,
      unreadCount: chat.chat_messages.filter((m) => !m.is_read && m.sender_id !== userId).length,
      lastMessage: chat.chat_messages.length > 0 ? chat.chat_messages[0] : null,
    }));

    return {
      success: true,
      data: processedData,
      pagination: { total: count, limit, offset },
    };
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Get a specific conversation with message history
 * @param {string} chatId - Chat ID
 * @param {object} options - Options { limit, offset, startDate }
 */
export const getChatMessages = async (chatId, options = {}) => {
  try {
    if (!chatId) throw new Error("Chat ID is required");

    const { limit = 50, offset = 0, startDate = null } = options;

    let query = supabase
      .from("chat_messages")
      .select(
        `
        id,
        chat_id,
        sender_id,
        message,
        attachments,
        is_read,
        read_at,
        parent_message_id,
        created_at,
        users:sender_id (
          id,
          name,
          avatar_url,
          email
        )
      `,
        { count: "exact" }
      )
      .eq("chat_id", chatId);

    if (startDate) {
      query = query.gte("created_at", startDate);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return {
      success: true,
      data,
      pagination: { total: count, limit, offset },
    };
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    return { success: false, error: error.message };
  }
};

// ====== MESSAGING ======

/**
 * Send a message in a chat
 * @param {object} messageData - { chatId, senderId, message, attachments (optional), parentMessageId (optional) }
 */
export const sendMessage = async (messageData) => {
  try {
    const { chatId, senderId, message, attachments = [], parentMessageId = null } = messageData;

    if (!chatId || !senderId || !message) {
      throw new Error("Chat ID, Sender ID, and message are required");
    }

    if (message.trim().length === 0) {
      throw new Error("Message cannot be empty");
    }

    if (message.length > 10000) {
      throw new Error("Message cannot exceed 10,000 characters");
    }

    // Get receiver and clearance info for notification
    const { data: chatData } = await supabase
      .from("chats")
      .select("sender_id, receiver_id, clearance_id")
      .eq("id", chatId)
      .single();

    const receiverId = chatData.sender_id === senderId ? chatData.receiver_id : chatData.sender_id;

    // Insert message
    const { data: messageRecord, error: insertError } = await supabase
      .from("chat_messages")
      .insert([
        {
          chat_id: chatId,
          sender_id: senderId,
          message: message.trim(),
          attachments: attachments.length > 0 ? attachments : null,
          is_read: false,
          parent_message_id: parentMessageId,
        },
      ])
      .select(
        `
        id,
        chat_id,
        sender_id,
        message,
        attachments,
        created_at,
        users:sender_id (
          id,
          name,
          avatar_url
        )
      `
      )
      .single();

    if (insertError) throw insertError;

    // Create notification for receiver (non-blocking for instant UI feedback)
    createChatNotification(
      receiverId,
      senderId,
      chatData.clearance_id,
      chatId,
      message.substring(0, 100)
    ).catch(err => console.error("Chat notification error:", err));

    return { success: true, data: messageRecord };
  } catch (error) {
    console.error("Error sending message:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Mark message as read
 * @param {string} messageId - Message ID
 */
export const markMessageAsRead = async (messageId) => {
  try {
    const { data, error } = await supabase
      .from("chat_messages")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq("id", messageId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error marking message as read:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Mark all messages in a chat as read
 * @param {string} chatId - Chat ID
 * @param {string} userId - Current user ID
 */
export const markChatAsRead = async (chatId, userId) => {
  try {
    const { data, error } = await supabase
      .from("chat_messages")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq("chat_id", chatId)
      .neq("sender_id", userId);

    if (error) throw error;
    return { success: true, messagesUpdated: data.length };
  } catch (error) {
    console.error("Error marking chat as read:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Reply to a specific message
 * @param {object} replyData - { chatId, senderId, message, parentMessageId, attachments }
 */
export const replyToMessage = async (replyData) => {
  return sendMessage({
    ...replyData,
    parentMessageId: replyData.parentMessageId || replyData.messageId,
  });
};

/**
 * Edit a message
 * @param {string} messageId - Message ID
 * @param {string} newMessage - Updated message text
 */
export const editMessage = async (messageId, newMessage) => {
  try {
    if (!messageId || !newMessage || newMessage.trim().length === 0) {
      throw new Error("Message ID and content required");
    }

    const { data, error } = await supabase
      .from("chat_messages")
      .update({
        message: newMessage.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", messageId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error editing message:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete a message
 * @param {string} messageId - Message ID
 */
export const deleteMessage = async (messageId) => {
  try {
    const { error } = await supabase
      .from("chat_messages")
      .delete()
      .eq("id", messageId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error deleting message:", error);
    return { success: false, error: error.message };
  }
};

// ====== SEARCH & FILTERING ======

/**
 * Search messages in a chat
 * @param {string} chatId - Chat ID
 * @param {string} searchTerm - Search query
 */
export const searchMessages = async (chatId, searchTerm) => {
  try {
    if (!chatId || !searchTerm) throw new Error("Chat ID and search term required");

    const { data, error } = await supabase
      .from("chat_messages")
      .select(
        `
        id,
        message,
        sender_id,
        created_at,
        users:sender_id (name)
      `
      )
      .eq("chat_id", chatId)
      .ilike("message", `%${searchTerm}%`)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error searching messages:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Get conversation threads (conversations grouped by participants)
 * @param {string} userId - User ID
 */
export const getConversationThreads = async (userId) => {
  try {
    const { data, error } = await supabase
      .from("chats")
      .select(
        `
        id,
        sender_id,
        receiver_id,
        last_message_at,
        users:sender_id (
          id,
          name,
          email,
          avatar_url,
          role
        ),
        receiver:receiver_id (
          id,
          name,
          email,
          avatar_url,
          role
        ),
        chat_messages (count)
      `
      )
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq("is_active", true)
      .order("last_message_at", { ascending: false });

    if (error) throw error;

    const threads = data.map((chat) => ({
      ...chat,
      otherUser: chat.sender_id === userId ? chat.receiver : chat.users,
      messageCount: chat.chat_messages[0]?.count || 0,
    }));

    return { success: true, data: threads };
  } catch (error) {
    console.error("Error fetching conversation threads:", error);
    return { success: false, error: error.message };
  }
};

// ====== REAL-TIME SUBSCRIPTIONS ======

/**
 * Subscribe to new messages in a chat
 * @param {string} chatId - Chat ID
 * @param {function} onNewMessage - Callback function
 */
export const subscribeToChat = (chatId, onNewMessage) => {
  return supabase
    .channel(`chat:${chatId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `chat_id=eq.${chatId}`,
      },
      (payload) => {
        onNewMessage(payload.new);
      }
    )
    .subscribe();
};

/**
 * Subscribe to conversation list updates
 * @param {string} userId - User ID
 * @param {function} onUpdate - Callback function
 */
export const subscribeToConversations = (userId, onUpdate) => {
  return supabase
    .channel(`chats:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "chats",
        filter: `or(sender_id.eq.${userId},receiver_id.eq.${userId})`,
      },
      (payload) => {
        onUpdate(payload);
      }
    )
    .subscribe();
};

/**
 * Subscribe to message updates (edits, deletions)
 * @param {string} chatId - Chat ID
 * @param {function} onUpdate - Callback function
 */
export const subscribeToMessageUpdates = (chatId, onUpdate) => {
  return supabase
    .channel(`messages:${chatId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "chat_messages",
        filter: `chat_id=eq.${chatId}`,
      },
      (payload) => {
        if (payload.eventType !== "INSERT") {
          onUpdate(payload);
        }
      }
    )
    .subscribe();
};

// ====== HELPER FUNCTIONS ======

/**
 * Create notification for new message
 */
async function createChatNotification(userId, senderId, clearanceId, chatId, messagePreview) {
  try {
    // Get sender details
    const { data: senderData } = await supabase
      .from("users")
      .select("name")
      .eq("id", senderId)
      .single();

    const senderName = senderData?.name || "Someone";

    await supabase.from("notifications").insert([
      {
        user_id: userId,
        type: "chat_message",
        title: `New message from ${senderName}`,
        message: messagePreview,
        related_chat_id: chatId,
        related_clearance_id: clearanceId,
        is_read: false,
      },
    ]);
  } catch (error) {
    console.error("Error creating chat notification:", error);
  }
}

export default {
  getOrCreateChat,
  getUserConversations,
  getChatMessages,
  sendMessage,
  markMessageAsRead,
  markChatAsRead,
  replyToMessage,
  editMessage,
  deleteMessage,
  searchMessages,
  getConversationThreads,
  subscribeToChat,
  subscribeToConversations,
  subscribeToMessageUpdates,
};
