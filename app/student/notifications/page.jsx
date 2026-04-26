"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Container, Row, Col, Card, Badge, Button, Spinner } from "react-bootstrap";
import StudentLayout from "@/components/layout/StudentLayout";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/lib/supabaseClient";
import notificationService from "@/lib/notificationService";

// ── Event config per notification type ───────────────────────────────────────
const NOTIF_CONFIG = {
  degree_issued: {
    icon: "🎓",
    label: "Degree Issued",
    accent: "linear-gradient(135deg, #10b981, #059669)",
    border: "#10b981",
    badge: "#10b981",
    bg: "rgba(16, 185, 129, 0.04)",
  },
  clearance_update: {
    icon: "📋",
    label: "Clearance Update",
    accent: "linear-gradient(135deg, #6366F1, #4F46E5)",
    border: "#6366F1",
    badge: "#6366F1",
    bg: "rgba(99, 102, 241, 0.04)",
  },
  document_rejected: {
    icon: "❌",
    label: "Rejected",
    accent: "linear-gradient(135deg, #EF4444, #DC2626)",
    border: "#EF4444",
    badge: "#EF4444",
    bg: "rgba(239, 68, 68, 0.04)",
  },
  chat_message: {
    icon: "💬",
    label: "Message",
    accent: "linear-gradient(135deg, #3B82F6, #2563EB)",
    border: "#3B82F6",
    badge: "#3B82F6",
    bg: "rgba(59, 130, 246, 0.04)",
  },
  deadline_reminder: {
    icon: "⏰",
    label: "Deadline",
    accent: "linear-gradient(135deg, #F59E0B, #D97706)",
    border: "#F59E0B",
    badge: "#F59E0B",
    bg: "rgba(245, 158, 11, 0.04)",
  },
  system: {
    icon: "⚙️",
    label: "System",
    accent: "linear-gradient(135deg, #8B5CF6, #7C3AED)",
    border: "#8B5CF6",
    badge: "#8B5CF6",
    bg: "rgba(139, 92, 246, 0.04)",
  },
  default: {
    icon: "🔔",
    label: "Notification",
    accent: "linear-gradient(135deg, #64748B, #475569)",
    border: "#64748B",
    badge: "#64748B",
    bg: "rgba(100, 116, 139, 0.04)",
  },
};

const getConfig = (type) => NOTIF_CONFIG[type] || NOTIF_CONFIG.default;

const formatTime = (dateStr) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

export default function NotificationsPage() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [newToast, setNewToast] = useState(null);

  const buildActivityFallback = useCallback(async () => {
    const studentId = profile?.student_id;
    if (!studentId) return [];

    const feed = [];

    const { data: requests } = await supabase
      .from("clearance_requests")
      .select("id, created_at, overall_status")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(10);

    (requests || []).forEach((req) => {
      feed.push({
        id: `activity-submitted-${req.id}`,
        type: "clearance_update",
        title: "Clearance Request Submitted",
        message: "Your clearance application was submitted and sent to all departments.",
        created_at: req.created_at,
        is_read: false,
      });
    });

    const requestIds = (requests || []).map((r) => r.id);
    if (requestIds.length > 0) {
      const { data: statuses } = await supabase
        .from("clearance_status")
        .select("id, status, updated_at, request_id, departments(name)")
        .in("request_id", requestIds)
        .in("status", ["approved", "rejected"])
        .order("updated_at", { ascending: false })
        .limit(30);

      (statuses || []).forEach((st) => {
        const deptName = st.departments?.name || "A department";
        const approved = st.status === "approved";
        feed.push({
          id: `activity-status-${st.id}`,
          type: approved ? "clearance_update" : "document_rejected",
          title: approved ? `${deptName} Approved` : `${deptName} Rejected`,
          message: approved
            ? `${deptName} has approved your clearance request.`
            : `${deptName} has rejected your clearance request. Please review and take action.`,
          created_at: st.updated_at,
          is_read: false,
        });
      });
    }

    return feed.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [profile?.student_id]);

  const fetchNotifs = useCallback(async () => {
    if (!profile?.id) return;
    const filters = filter === "unread" ? { isRead: false } : {};
    const result = await notificationService.getUserNotifications(profile.id, filters);
    if (result.success) {
      const dbNotifs = result.data || [];
      if (dbNotifs.length > 0) {
        setNotifications(dbNotifs);
      } else {
        const fallback = await buildActivityFallback();
        setNotifications(filter === "unread" ? fallback.filter((n) => !n.is_read) : fallback);
      }
    }
    setLoading(false);
  }, [profile?.id, filter, buildActivityFallback]);

  useEffect(() => {
    if (!profile?.id) return;
    setLoading(true);
    fetchNotifs();

    const channel = supabase
      .channel(`notifs-page-${profile.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${profile.id}`,
      }, (payload) => {
        if (payload.eventType === "INSERT") {
          const cfg = getConfig(payload.new?.type);
          setNewToast({ ...payload.new, cfg });
          setTimeout(() => setNewToast(null), 5000);
        }
        fetchNotifs();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [profile?.id, filter, fetchNotifs]);

  const handleMarkAsRead = async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    if (String(id).startsWith("activity-")) return;
    await notificationService.markNotificationAsRead(id);
  };

  const handleMarkAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    await notificationService.markAllNotificationsAsRead(profile.id);
  };

  const handleDelete = async (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (String(id).startsWith("activity-")) return;
    await notificationService.deleteNotification(id);
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <StudentLayout>
      <Container
        fluid
        className="py-4 px-md-5"
        style={{
          minHeight: "calc(100vh - 80px)",
          background:
            "radial-gradient(1100px 460px at 10% -8%, rgba(37,99,235,0.22), rgba(37,99,235,0) 58%), radial-gradient(900px 420px at 92% 8%, rgba(139,92,246,0.2), rgba(139,92,246,0) 56%), linear-gradient(180deg, #0b1220 0%, #111827 100%)",
        }}
      >

        {/* ── Live Toast ─────────────────────────────────────────────────── */}
        {newToast && (
          <div className="notification-toast shadow-lg">
            <div className="toast-accent" style={{ background: newToast.cfg.accent }}></div>
            <div className="toast-icon">{newToast.cfg.icon}</div>
            <div className="toast-content">
              <div className="toast-title">{newToast.title}</div>
              <div className="toast-message">{newToast.message}</div>
            </div>
            <button className="toast-close" onClick={() => setNewToast(null)}>×</button>
          </div>
        )}

        {/* ── Page Header ────────────────────────────────────────────────── */}
        <div className="d-flex justify-content-between align-items-end mb-4 flex-wrap gap-3">
          <div>
            <h1 className="fw-bold mb-1 notif-page-title" style={{ letterSpacing: "-0.02em" }}>Notifications</h1>
            <p className="notif-page-subtitle mb-0 small">Stay updated on your clearance status and academic requests.</p>
          </div>
          <div className="d-flex gap-2">
            <div className="filter-pill-container shadow-sm">
              <button 
                className={`filter-pill ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                All
              </button>
              <button 
                className={`filter-pill ${filter === 'unread' ? 'active' : ''}`}
                onClick={() => setFilter('unread')}
              >
                Unread {unreadCount > 0 && <span className="badge-count">{unreadCount}</span>}
              </button>
            </div>
            <Button 
              variant="link" 
              className="text-decoration-none fw-bold notif-markall-link small"
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
            >
              Mark all as read
            </Button>
          </div>
        </div>

        <Row>
          <Col xl={9} lg={10} className="mx-auto">
            {loading ? (
              <div className="d-flex flex-column align-items-center py-5">
                <Spinner animation="border" variant="primary" size="lg" />
                <p className="mt-3 notif-page-subtitle fw-medium">Syncing notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="empty-state shadow-sm border notif-panel">
                <div className="empty-icon-container">
                  <span className="empty-icon">🎐</span>
                </div>
                <h3 className="fw-bold mt-4 notif-panel-title">All Caught Up!</h3>
                <p className="notif-page-subtitle mb-4 mx-auto" style={{ maxWidth: "420px" }}>
                  {filter === "unread" 
                    ? "You've read all your notifications. Refresh the page or check back later for updates."
                    : "Your notification history is empty. We'll alert you here as soon as there's an update on your clearance."}
                </p>
                {filter === "unread" && (
                  <Button 
                    variant="primary" 
                    className="rounded-pill px-4 py-2 fw-bold shadow-sm"
                    onClick={() => setFilter('all')}
                  >
                    View Notification History
                  </Button>
                )}
              </div>
            ) : (
              <div className="notification-list">
                {notifications.map((notif) => {
                  const cfg = getConfig(notif.type);
                  return (
                    <div 
                      key={notif.id} 
                      className={`notification-card ${!notif.is_read ? 'unread' : ''}`}
                    >
                      <div className="notif-type-border" style={{ background: cfg.accent }}></div>
                      
                      <div className="notif-icon-box" style={{ background: cfg.bg, color: cfg.border }}>
                        {cfg.icon}
                      </div>

                      <div className="notif-body">
                        <div className="d-flex justify-content-between align-items-start gap-2 mb-1">
                          <div className="d-flex align-items-center gap-2">
                            <h6 className="notif-title mb-0">{notif.title || cfg.label}</h6>
                            {!notif.is_read && <span className="unread-dot"></span>}
                          </div>
                          <span className="notif-time">{formatTime(notif.created_at)}</span>
                        </div>
                        <p className="notif-message mb-0">{notif.message}</p>
                        
                        {!notif.is_read && (
                          <div className="mt-3">
                            <button 
                              className="action-link"
                              onClick={() => handleMarkAsRead(notif.id)}
                            >
                              Mark as read
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="notif-actions">
                        <button 
                          className="delete-btn" 
                          onClick={() => handleDelete(notif.id)}
                          title="Delete notification"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Col>
        </Row>
      </Container>

      <style jsx>{`
        @keyframes slideInNotif {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        .filter-pill-container {
          background: rgba(15, 23, 42, 0.82);
          padding: 4px;
          border-radius: 14px;
          display: flex;
          gap: 4px;
          border: 1px solid rgba(148, 163, 184, 0.22);
          backdrop-filter: blur(8px);
          box-shadow: 0 14px 28px rgba(15, 23, 42, 0.24);
        }
        .filter-pill {
          border: none;
          background: transparent;
          padding: 6px 18px;
          border-radius: 10px;
          font-size: 0.85rem;
          font-weight: 600;
          color: #cbd5e1;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .filter-pill.active {
          background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
          color: white;
          box-shadow: 0 10px 22px rgba(37, 99, 235, 0.24);
        }
        .badge-count {
          background: #EF4444;
          color: white;
          font-size: 0.7rem;
          padding: 1px 6px;
          border-radius: 20px;
        }

        .notification-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .notification-card {
          background: linear-gradient(180deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 20px;
          padding: 20px;
          display: flex;
          gap: 16px;
          position: relative;
          overflow: hidden;
          transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
          box-shadow: 0 14px 28px rgba(15, 23, 42, 0.24);
          backdrop-filter: blur(8px);
        }
        .notification-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 36px rgba(15, 23, 42, 0.34);
          border-color: rgba(96, 165, 250, 0.42);
        }
        .notification-card.unread {
          background: linear-gradient(180deg, rgba(30, 41, 59, 0.96) 0%, rgba(15, 23, 42, 0.96) 100%);
          border-color: rgba(96, 165, 250, 0.3);
        }
        .notif-type-border {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          opacity: 0.8;
        }

        .notif-icon-box {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.4rem;
          flex-shrink: 0;
        }

        .notif-body {
          flex: 1;
        }
        .notif-title {
          font-weight: 700;
          color: #f8fafc;
          font-size: 0.95rem;
        }
        .notif-message {
          font-size: 0.9rem;
          color: #cbd5e1;
          line-height: 1.5;
        }
        .notif-time {
          font-size: 0.75rem;
          color: #94A3B8;
          font-weight: 500;
        }

        .unread-dot {
          width: 8px;
          height: 8px;
          background: #60a5fa;
          border-radius: 50%;
          display: inline-block;
          box-shadow: 0 0 0 4px rgba(96, 165, 250, 0.12);
        }

        .action-link {
          background: transparent;
          border: none;
          color: #93c5fd;
          font-size: 0.8rem;
          font-weight: 700;
          padding: 0;
          text-decoration: underline;
          cursor: pointer;
        }

        .notif-actions {
          display: flex;
          align-items: center;
        }
        .delete-btn {
          background: rgba(15, 23, 42, 0.84);
          border: 1px solid rgba(148, 163, 184, 0.22);
          color: #cbd5e1;
          padding: 8px;
          border-radius: 10px;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .delete-btn:hover {
          color: #EF4444;
          background: rgba(239, 68, 68, 0.14);
          border-color: rgba(239, 68, 68, 0.42);
        }

        .empty-state {
          background: linear-gradient(180deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%);
          padding: 60px 40px;
          border-radius: 28px;
          text-align: center;
          box-shadow: 0 16px 34px rgba(15, 23, 42, 0.26);
          backdrop-filter: blur(8px);
          border-color: rgba(148, 163, 184, 0.2) !important;
        }
        .empty-icon-container {
          width: 100px;
          height: 100px;
          background: rgba(30, 41, 59, 0.95);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto;
          box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.18);
        }
        .empty-icon {
          font-size: 3.5rem;
        }

        .notification-toast {
          position: fixed;
          top: 90px;
          right: 30px;
          background: linear-gradient(180deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%);
          border-radius: 18px;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          gap: 15px;
          z-index: 1050;
          border: 1px solid rgba(148, 163, 184, 0.24);
          max-width: 400px;
          color: #f8fafc;
          box-shadow: 0 18px 36px rgba(15, 23, 42, 0.34);
          backdrop-filter: blur(10px);
          animation: slideInNotif 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .toast-accent {
          position: absolute;
          left: 0;
          top: 12px;
          bottom: 12px;
          width: 4px;
          border-radius: 0 4px 4px 0;
        }
        .toast-icon { font-size: 1.5rem; }
        .toast-title { font-weight: 800; font-size: 0.9rem; color: #f8fafc; }
        .toast-message { font-size: 0.85rem; color: #cbd5e1; margin-top: 2px; }
        .toast-close {
          background: transparent;
          border: none;
          font-size: 1.2rem;
          color: #cbd5e1;
          cursor: pointer;
        }

        .notif-page-title {
          color: #f8fafc;
        }

        .notif-page-subtitle {
          color: #cbd5e1;
        }

        .notif-markall-link {
          color: #93c5fd !important;
        }

        .notif-markall-link:disabled {
          color: #64748b !important;
        }

        .notif-panel-title {
          color: #f8fafc;
        }

        .notif-panel {
          border-color: rgba(148, 163, 184, 0.2) !important;
        }

        .notification-card .text-muted,
        .empty-state .text-muted {
          color: #cbd5e1 !important;
        }
      `}</style>
    </StudentLayout>
  );
}