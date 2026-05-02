"use client";
import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Spinner, Form, Button, Badge } from "react-bootstrap";

export default function SupportChat({ currentUserId, isAdmin = false, departmentInfo = null }) {
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const router = require('next/navigation').useRouter();

  const ADMIN_ID = "4d71888c-279e-44a8-9c62-8fbf0578f872"; // Salman (Admin)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversations list
  useEffect(() => {
    async function loadConversations() {
      try {
        let query = supabase.from("messages").select("sender_id, receiver_id, department_id, department_name, created_at");
        
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;

        // Group by conversation (sender/receiver pair)
        const groups = {};
        data.forEach(msg => {
          const partnerId = msg.sender_id === currentUserId ? msg.receiver_id : msg.sender_id;
          if (!groups[partnerId]) {
            groups[partnerId] = {
              partnerId,
              departmentName: msg.department_name || "Support Chat",
              lastMessage: msg.message,
              lastTime: msg.created_at,
              deptId: msg.department_id
            };
          }
        });

        const convList = Object.values(groups);
        setConversations(convList);
        
        // Auto-select first chat for admin, or the admin chat for department
        if (isAdmin && convList.length > 0 && !activeChat) {
          setActiveChat(convList[0]);
        } else if (!isAdmin && !activeChat) {
          setActiveChat({ partnerId: ADMIN_ID, departmentName: "Admin Support" });
        }
      } catch (err) {
        console.error("Error loading conversations:", err);
      } finally {
        setLoading(false);
      }
    }

    loadConversations();
    
    const channel = supabase
      .channel('support_list')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => loadConversations())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [currentUserId, isAdmin]);

  // Load messages for active chat
  useEffect(() => {
    if (!activeChat) return;

    async function loadMessages() {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${activeChat.partnerId}),and(sender_id.eq.${activeChat.partnerId},receiver_id.eq.${currentUserId})`)
        .order("created_at", { ascending: true });

      if (!error) setMessages(data);
    }

    loadMessages();

    const channel = supabase
      .channel(`chat_${activeChat.partnerId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `or(sender_id.eq.${activeChat.partnerId},receiver_id.eq.${activeChat.partnerId})` 
      }, (payload) => {
        const newMsg = payload.new;
        if ((newMsg.sender_id === currentUserId && newMsg.receiver_id === activeChat.partnerId) ||
            (newMsg.sender_id === activeChat.partnerId && newMsg.receiver_id === currentUserId)) {
          setMessages(prev => [...prev, newMsg]);
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [activeChat, currentUserId]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChat) return;

    setSending(true);
    const msgData = {
      sender_id: currentUserId,
      receiver_id: activeChat.partnerId,
      message: inputText.trim(),
      department_id: departmentInfo?.id || activeChat.deptId || null,
      department_name: departmentInfo?.name || activeChat.departmentName || null,
      focal_person_name: departmentInfo?.focal_person || null
    };

    try {
      const { error } = await supabase.from("messages").insert([msgData]);
      if (error) throw error;
      setInputText("");
    } catch (err) {
      console.error("Error sending message:", err);
      alert("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="d-flex justify-content-center p-5"><Spinner animation="border" variant="primary" /></div>;

  return (
    <div className="support-container">
      {/* Sidebar - Chat History */}
      <div className={`support-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <div className="d-flex align-items-center gap-2">
            <span className="history-icon">📜</span>
            <h5 className="mb-0">History</h5>
          </div>
          <button className="d-md-none close-sidebar-btn" onClick={() => setSidebarOpen(false)}>✕</button>
        </div>
        <div className="conversation-list">
          {!isAdmin && conversations.every(c => c.partnerId !== ADMIN_ID) && (
            <div 
              className={`conversation-item ${activeChat?.partnerId === ADMIN_ID ? "active" : ""}`}
              onClick={() => { setActiveChat({ partnerId: ADMIN_ID, departmentName: "Admin Support" }); setSidebarOpen(false); }}
            >
              <div className="avatar">A</div>
              <div className="info">
                <div className="name">Admin Support</div>
                <div className="last-msg">Start a new query</div>
              </div>
              <div className="active-dot"></div>
            </div>
          )}
          {conversations.map((conv, i) => (
            <div 
              key={i} 
              className={`conversation-item ${activeChat?.partnerId === conv.partnerId ? "active" : ""}`}
              onClick={() => { setActiveChat(conv); setSidebarOpen(false); }}
            >
              <div className="avatar">{conv.departmentName.charAt(0)}</div>
              <div className="info">
                <div className="name">{conv.departmentName}</div>
                <div className="last-msg text-truncate">{conv.lastMessage}</div>
              </div>
              {activeChat?.partnerId === conv.partnerId && <div className="active-dot"></div>}
            </div>
          ))}
          {conversations.length === 0 && isAdmin && (
             <div className="p-4 text-center text-muted small">No active queries yet.</div>
          )}
        </div>
        
        <div className="sidebar-footer">
          <button className="exit-chat-btn" onClick={() => router.push(isAdmin ? "/admin/dashboard" : "/department/dashboard")}>
            <span className="me-2">🚪</span> Exit Support
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="support-main">
        <div className="chat-header">
          <div className="header-left">
            <button className="sidebar-toggle d-md-none" onClick={() => setSidebarOpen(true)}>
              <span></span><span></span><span></span>
            </button>
            <div className="chat-partner">
              <div className="partner-avatar-container">
                <div className="partner-avatar">{activeChat?.departmentName?.charAt(0) || "?"}</div>
                <div className="online-indicator"></div>
              </div>
              <div className="partner-info">
                <h6 className="mb-0" style={{ fontSize: '0.9rem' }}>{activeChat?.departmentName || "Support"}</h6>
                <div className="status-container">
                  <span className="status-dot"></span>
                  <small style={{ fontSize: '0.65rem' }}>Active Now</small>
                </div>
              </div>
            </div>
          </div>
          <div className="header-right">
            <button className="header-action-btn d-none d-sm-flex" title="Close Chat" onClick={() => router.push(isAdmin ? "/admin/dashboard" : "/department/dashboard")}>
              ✕
            </button>
          </div>
        </div>

        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="empty-chat">
              <div className="empty-icon">💬</div>
              <h4>No Messages Yet</h4>
              <p>How can we help you today?</p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`message-wrapper ${msg.sender_id === currentUserId ? "sent" : "received"}`}>
                <div className="message-bubble">
                  {msg.message}
                  <div className="message-time">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-area">
          <Form onSubmit={handleSendMessage} className="chat-form">
            <div className="input-group-premium">
              <Form.Control
                type="text"
                placeholder="Write your message..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="chat-input"
                disabled={!activeChat}
              />
              <button 
                type="submit" 
                className="send-btn-premium"
                disabled={sending || !inputText.trim() || !activeChat}
              >
                {sending ? <Spinner size="sm" /> : <span className="send-icon">🚀</span>}
              </button>
            </div>
          </Form>
        </div>
      </div>

      <style jsx>{`
        .support-container {
          display: flex;
          height: calc(100vh - 180px);
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(16px);
          border-radius: 30px;
          border: 1px solid rgba(148, 163, 184, 0.1);
          overflow: hidden;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.4);
          position: relative;
        }

        /* Sidebar Styles */
        .support-sidebar {
          width: 320px;
          border-right: 1px solid rgba(148, 163, 184, 0.08);
          background: rgba(15, 23, 42, 0.5);
          display: flex;
          flex-direction: column;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @media (max-width: 991px) {
          .support-sidebar {
            position: absolute;
            inset: 0;
            z-index: 1000;
            width: 100%;
            transform: translateX(-100%);
            background: rgba(10, 15, 28, 0.98);
            backdrop-filter: blur(25px);
          }
          .support-sidebar.open { transform: translateX(0); }
        }

        .sidebar-header {
          padding: 1.8rem 1.5rem;
          border-bottom: 1px solid rgba(148, 163, 184, 0.08);
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #F8FAFC;
        }
        .sidebar-header h5 {
          color: #FFFFFF !important;
          font-weight: 800;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          font-size: 0.85rem;
          margin: 0;
        }
        .history-icon { font-size: 1.2rem; }

        .conversation-list {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .conversation-item {
          display: flex;
          align-items: center;
          gap: 1.1rem;
          padding: 1rem;
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid transparent;
        }

        .conversation-item:hover {
          background: rgba(59, 130, 246, 0.08);
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
          border-color: rgba(59, 130, 246, 0.2);
        }

        .conversation-item.active {
          background: linear-gradient(135deg, rgba(37, 99, 235, 0.15), rgba(124, 58, 237, 0.15));
          border-color: rgba(96, 165, 250, 0.3);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.2);
        }

        .avatar {
          width: 48px;
          height: 48px;
          border-radius: 16px;
          background: linear-gradient(135deg, #3B82F6, #8B5CF6);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 1.2rem;
          box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3);
          flex-shrink: 0;
        }

        .info { flex: 1; min-width: 0; }
        .name { color: #F1F5F9; font-weight: 700; font-size: 1rem; margin-bottom: 2px; }
        .last-msg { color: #94A3B8; font-size: 0.82rem; opacity: 0.8; }
        
        .active-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #60A5FA; box-shadow: 0 0 10px #60A5FA;
        }

        .sidebar-footer {
          padding: 1.5rem;
          border-top: 1px solid rgba(148, 163, 184, 0.08);
        }
        .exit-chat-btn {
          width: 100%; padding: 0.85rem; border-radius: 14px;
          border: 1px solid rgba(239, 68, 68, 0.2);
          background: rgba(239, 68, 68, 0.05);
          color: #FCA5A5; font-weight: 700; font-size: 0.9rem;
          transition: all 0.3s ease;
        }
        .exit-chat-btn:hover {
          background: rgba(239, 68, 68, 0.15);
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(239, 68, 68, 0.15);
        }

        /* Main Chat Styles */
        .support-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: radial-gradient(circle at top right, rgba(37, 99, 235, 0.03), transparent 60%);
        }

        .chat-header {
          padding: 0.8rem 1.5rem;
          border-bottom: 1px solid rgba(148, 163, 184, 0.08);
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(15, 23, 42, 0.3);
          backdrop-filter: blur(10px);
        }
        .header-left { display: flex; align-items: center; gap: 1rem; }

        .chat-partner { display: flex; align-items: center; gap: 1rem; }
        .partner-avatar-container { position: relative; }
        .partner-avatar {
          width: 44px; height: 44px; border-radius: 50%;
          background: rgba(30, 41, 59, 0.8); border: 2px solid rgba(96, 165, 250, 0.3);
          color: white; display: flex; align-items: center; justify-content: center;
          font-weight: 800; font-size: 1.1rem;
        }
        .online-indicator {
          position: absolute; bottom: 2px; right: 2px;
          width: 12px; height: 12px; background: #10B981;
          border: 2px solid #0f172a; border-radius: 50%;
        }

        .partner-info h6 { color: #F8FAFC; font-weight: 700; }
        .status-container { display: flex; align-items: center; gap: 6px; }
        .status-dot { width: 6px; height: 6px; background: #10B981; border-radius: 50%; }
        .status-container small { color: #10B981; font-weight: 700; font-size: 0.75rem; }

        .header-action-btn {
          width: 36px; height: 36px; border-radius: 50%;
          background: rgba(255, 255, 255, 0.05); border: none;
          color: #94A3B8; display: flex; align-items: center; justify-content: center;
          transition: all 0.2s ease;
        }
        .header-action-btn:hover { background: rgba(220, 38, 38, 0.15); color: #EF4444; transform: rotate(90deg); }

        .sidebar-toggle {
          display: flex; flex-direction: column; gap: 4px;
          background: transparent; border: none; padding: 10px;
          cursor: pointer;
        }
        .sidebar-toggle span { 
          width: 20px; height: 2px; background: #60A5FA; border-radius: 2px;
          transition: all 0.3s ease;
        }

        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          scroll-behavior: smooth;
        }

        .message-wrapper { display: flex; width: 100%; position: relative; }
        .message-wrapper.sent { justify-content: flex-end; }
        .message-wrapper.received { justify-content: flex-start; }

        .message-bubble {
          max-width: 68%;
          padding: 0.75rem 1.1rem;
          border-radius: 18px;
          font-size: 0.88rem;
          line-height: 1.5;
          position: relative;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
          transition: transform 0.2s ease;
        }
        .message-bubble:hover { transform: translateY(-1px); }

        .sent .message-bubble {
          background: linear-gradient(135deg, #2563EB, #7C3AED);
          color: white;
          border-bottom-right-radius: 4px;
        }
        .sent .message-bubble::after {
          content: ""; position: absolute; bottom: 0; right: -8px;
          width: 15px; height: 15px; background: #7C3AED;
          clip-path: polygon(0 0, 0 100%, 100% 100%);
        }

        .received .message-bubble {
          background: rgba(30, 41, 59, 0.9);
          color: #E2E8F0;
          border-bottom-left-radius: 4px;
          border: 1px solid rgba(148, 163, 184, 0.1);
        }
        .received .message-bubble::before {
          content: ""; position: absolute; bottom: 0; left: -8px;
          width: 15px; height: 15px; background: rgba(30, 41, 59, 0.9);
          clip-path: polygon(100% 0, 0 100%, 100% 100%);
        }

        .message-time {
          font-size: 0.68rem; opacity: 0.7; margin-top: 0.5rem; text-align: right;
          font-weight: 500;
        }

        .chat-input-area {
          padding: 1rem 1.5rem;
          background: rgba(15, 23, 42, 0.5);
          border-top: 1px solid rgba(148, 163, 184, 0.08);
        }

        .input-group-premium {
          display: flex; gap: 0.8rem; align-items: center;
          background: rgba(30, 41, 59, 0.5);
          padding: 0.4rem 0.4rem 0.4rem 1.2rem;
          border-radius: 16px;
          border: 1px solid rgba(148, 163, 184, 0.15);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
          transition: all 0.3s ease;
        }
        .input-group-premium:focus-within {
          border-color: rgba(59, 130, 246, 0.4);
          box-shadow: 0 10px 40px rgba(37, 99, 235, 0.15);
          background: rgba(30, 41, 59, 0.7);
        }

        .chat-input {
          background: transparent !important;
          border: none !important;
          color: white !important;
          padding: 0 !important;
          font-size: 1rem !important;
          box-shadow: none !important;
        }

        .send-btn-premium {
          width: 40px; height: 40px; border-radius: 12px;
          background: linear-gradient(135deg, #3B82F6, #6366F1);
          border: none; color: white; display: flex;
          align-items: center; justify-content: center;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3);
        }
        .send-btn-premium:hover:not(:disabled) {
          transform: translateY(-2px) scale(1.05);
          box-shadow: 0 12px 28px rgba(59, 130, 246, 0.4);
        }
        .send-btn-premium:disabled { opacity: 0.5; filter: grayscale(1); }
        .send-icon { font-size: 1.3rem; }

        .empty-chat {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; height: 100%; text-align: center;
          opacity: 0.6;
        }
        .empty-icon { font-size: 5rem; margin-bottom: 1.5rem; filter: grayscale(1); }
        .empty-chat h4 { color: #F8FAFC; margin-bottom: 0.5rem; }
        .empty-chat p { color: #94A3B8; }

        .close-sidebar-btn {
          background: rgba(255, 255, 255, 0.05); border: none;
          color: #94A3B8; width: 32px; height: 32px; border-radius: 50%;
        }

        /* Responsive Tweaks */
        @media (max-width: 576px) {
          .chat-messages { padding: 1rem; }
          .message-bubble { max-width: 85%; }
          .chat-input-area { padding: 1rem; }
          .input-group-premium { padding: 0.4rem 0.4rem 0.4rem 1rem; }
        }
      `}</style>
    </div>
  );
}
