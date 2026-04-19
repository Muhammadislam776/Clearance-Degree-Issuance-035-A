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
    accent: "linear-gradient(135deg, #059669, #10b981)",
    border: "#059669",
    badge: "#059669",
    bg: "rgba(5,150,105,0.06)",
  },
  clearance_update: {
    icon: "📋",
    label: "Clearance Update",
    accent: "linear-gradient(135deg, #0062FF, #6366F1)",
    border: "#0062FF",
    badge: "#0062FF",
    bg: "rgba(0,98,255,0.05)",
  },
  document_rejected: {
    icon: "❌",
    label: "Rejected",
    accent: "linear-gradient(135deg, #DC2626, #ef4444)",
    border: "#DC2626",
    badge: "#DC2626",
    bg: "rgba(220,38,38,0.05)",
  },
  chat_message: {
    icon: "💬",
    label: "Message",
    accent: "linear-gradient(135deg, #0284c7, #38bdf8)",
    border: "#0284c7",
    badge: "#0284c7",
    bg: "rgba(2,132,199,0.05)",
  },
  deadline_reminder: {
    icon: "⏰",
    label: "Deadline",
    accent: "linear-gradient(135deg, #D97706, #f59e0b)",
    border: "#D97706",
    badge: "#D97706",
    bg: "rgba(217,119,6,0.05)",
  },
  system: {
    icon: "⚙️",
    label: "System",
    accent: "linear-gradient(135deg, #6366F1, #8B5CF6)",
    border: "#6366F1",
    badge: "#6366F1",
    bg: "rgba(99,102,241,0.05)",
  },
  default: {
    icon: "🔔",
    label: "Notification",
    accent: "linear-gradient(135deg, #475569, #64748b)",
    border: "#475569",
    badge: "#475569",
    bg: "rgba(71,85,105,0.05)",
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

  const fetchNotifs = useCallback(async () => {
    if (!profile?.id) return;
    const filters = filter === "unread" ? { isRead: false } : {};
    const result = await notificationService.getUserNotifications(profile.id, filters);
    if (result.success) setNotifications(result.data || []);
    setLoading(false);
  }, [profile?.id, filter]);

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
          setTimeout(() => setNewToast(null), 4000);
        }
        fetchNotifs();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [profile?.id, filter, fetchNotifs]);

  const handleMarkAsRead = async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    await notificationService.markNotificationAsRead(id);
  };

  const handleMarkAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    await notificationService.markAllNotificationsAsRead(profile.id);
  };

  const handleDelete = async (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    await notificationService.deleteNotification(id);
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <StudentLayout>
      <Container fluid className="py-4 px-md-4" style={{ background: "#F4F7F9", minHeight: "calc(100vh - 80px)" }}>

        {/* ── Live Toast ─────────────────────────────────────────────────── */}
        {newToast && (
          <div style={{
            position: "fixed", top: "80px", right: "24px", zIndex: 9999,
            background: "white", borderRadius: "16px", padding: "16px 20px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.12)", maxWidth: "360px", width: "100%",
            borderLeft: `4px solid ${newToast.cfg.border}`,
            animation: "slideIn 0.4s cubic-bezier(0.34,1.56,0.64,1)",
            display: "flex", alignItems: "flex-start", gap: "12px"
          }}>
            <span style={{ fontSize: "1.5rem", lineHeight: 1 }}>{newToast.cfg.icon}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0F172A" }}>{newToast.title}</div>
              <div style={{ fontSize: "0.82rem", color: "#475569", marginTop: "2px", lineHeight: 1.4 }}>{newToast.message}</div>
            </div>
          </div>
        )}

        {/* ── Hero Banner ────────────────────────────────────────────────── */}
        <div style={{
          background: "linear-gradient(135deg, #0062FF 0%, #6366F1 60%, #8B5CF6 100%)",
          borderRadius: "24px", padding: "2.5rem 3rem", marginBottom: "2rem",
          color: "white", position: "relative", overflow: "hidden",
          boxShadow: "0 10px 30px rgba(0,98,255,0.25)"
        }}>
          <div style={{ position: "relative", zIndex: 2 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
              <div>
                <h1 style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 800, fontSize: "clamp(1.5rem,3vw,2rem)", margin: 0 }}>
                  🔔 Alerts & Notifications
                </h1>
                <p style={{ opacity: 0.8, margin: "0.4rem 0 0", fontSize: "0.95rem" }}>
                  Real-time updates on your clearance, approvals, and degree issuance.
                </p>
              </div>
              {unreadCount > 0 && (
                <div style={{
                  background: "rgba(255,255,255,0.2)", backdropFilter: "blur(10px)",
                  border: "1px solid rgba(255,255,255,0.3)", borderRadius: "50px",
                  padding: "0.4rem 1rem", fontSize: "0.85rem", fontWeight: 700,
                  display: "flex", alignItems: "center", gap: "0.5rem"
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fbbf24", display: "inline-block", animation: "pulse 1.5s infinite" }} />
                  {unreadCount} unread
                </div>
              )}
            </div>
          </div>
          {/* decorative circles */}
          <div style={{ position: "absolute", top: "-60px", right: "-60px", width: "220px", height: "220px", background: "rgba(255,255,255,0.08)", borderRadius: "50%" }} />
          <div style={{ position: "absolute", bottom: "-40px", right: "120px", width: "140px", height: "140px", background: "rgba(255,255,255,0.06)", borderRadius: "50%" }} />
        </div>

        <Row className="justify-content-center">
          <Col xl={10}>

            {/* ── Filter / Actions Bar ───────────────────────────────────── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
              <div style={{ display: "flex", background: "white", padding: "4px", borderRadius: "50px", border: "1.5px solid #E2E8F0", gap: "4px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                {["all", "unread"].map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    style={{
                      padding: "0.45rem 1.4rem", borderRadius: "50px", border: "none",
                      fontWeight: 600, fontSize: "0.875rem", cursor: "pointer",
                      transition: "all 0.2s ease",
                      background: filter === f ? "linear-gradient(135deg, #0062FF, #6366F1)" : "transparent",
                      color: filter === f ? "white" : "#475569",
                      boxShadow: filter === f ? "0 4px 12px rgba(0,98,255,0.25)" : "none",
                    }}
                  >
                    {f === "all" ? "All" : `Unread${unreadCount > 0 ? ` (${unreadCount})` : ""}`}
                  </button>
                ))}
              </div>
              <button
                onClick={handleMarkAllRead}
                disabled={unreadCount === 0}
                style={{
                  padding: "0.45rem 1.4rem", borderRadius: "50px",
                  border: "1.5px solid #0062FF", background: "transparent",
                  color: "#0062FF", fontWeight: 600, fontSize: "0.875rem",
                  cursor: unreadCount === 0 ? "not-allowed" : "pointer",
                  opacity: unreadCount === 0 ? 0.4 : 1, transition: "all 0.2s ease"
                }}
              >
                ✓ Mark all as read
              </button>
            </div>

            {/* ── Content ────────────────────────────────────────────────── */}
            {loading ? (
              <div style={{ textAlign: "center", padding: "5rem 0" }}>
                <Spinner animation="border" style={{ color: "#0062FF", width: "3rem", height: "3rem", borderWidth: "3px" }} />
                <p style={{ marginTop: "1rem", color: "#475569", fontWeight: 600 }}>Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <Card style={{ border: "none", borderRadius: "24px", padding: "4rem 2rem", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: "5rem", marginBottom: "1rem" }}>🎐</div>
                <h3 style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 700, color: "#0F172A" }}>All Caught Up!</h3>
                <p style={{ color: "#475569", maxWidth: "400px", margin: "0 auto 1.5rem" }}>
                  {filter === "unread"
                    ? "No unread notifications. You're up to date!"
                    : "Notifications will appear here when departments review your clearance, approve or reject requests, or when your degree is issued."}
                </p>
                {filter === "unread" && (
                  <button onClick={() => setFilter("all")} style={{ background: "linear-gradient(135deg,#0062FF,#6366F1)", color: "white", border: "none", borderRadius: "50px", padding: "0.6rem 1.8rem", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem" }}>
                    View All History
                  </button>
                )}
              </Card>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {notifications.map((notif) => {
                  const cfg = getConfig(notif.type);
                  return (
                    <div
                      key={notif.id}
                      style={{
                        background: notif.is_read ? "white" : cfg.bg,
                        border: `1px solid ${notif.is_read ? "#E2E8F0" : cfg.border}`,
                        borderLeft: `5px solid ${cfg.border}`,
                        borderRadius: "16px",
                        padding: "1.1rem 1.4rem",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "1rem",
                        boxShadow: notif.is_read ? "0 2px 8px rgba(0,0,0,0.03)" : "0 4px 16px rgba(0,0,0,0.07)",
                        transition: "all 0.2s ease",
                        position: "relative",
                      }}
                    >
                      {/* Icon pill */}
                      <div style={{
                        width: "46px", height: "46px", borderRadius: "13px", flexShrink: 0,
                        background: cfg.accent, display: "flex", alignItems: "center",
                        justifyContent: "center", fontSize: "1.3rem",
                        boxShadow: `0 4px 12px ${cfg.border}40`,
                      }}>
                        {cfg.icon}
                      </div>

                      {/* Body */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.25rem" }}>
                          <span style={{ fontWeight: 700, color: "#0F172A", fontSize: "0.92rem" }}>
                            {notif.title || cfg.label}
                          </span>
                          {!notif.is_read && (
                            <span style={{
                              background: cfg.badge, color: "white",
                              fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.05em",
                              padding: "2px 8px", borderRadius: "50px",
                              textTransform: "uppercase"
                            }}>NEW</span>
                          )}
                          <span style={{ marginLeft: "auto", fontSize: "0.78rem", color: "#94A3B8", whiteSpace: "nowrap", fontWeight: 500 }}>
                            {formatTime(notif.created_at)}
                          </span>
                        </div>
                        <p style={{ color: "#475569", fontSize: "0.875rem", margin: 0, lineHeight: 1.55 }}>
                          {notif.message}
                        </p>
                      </div>

                      {/* Actions */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", flexShrink: 0 }}>
                        {!notif.is_read && (
                          <button
                            onClick={() => handleMarkAsRead(notif.id)}
                            title="Mark as read"
                            style={{ background: "rgba(0,98,255,0.08)", border: "none", borderRadius: "8px", width: "32px", height: "32px", cursor: "pointer", fontSize: "0.8rem", color: "#0062FF", display: "flex", alignItems: "center", justifyContent: "center" }}
                          >✓</button>
                        )}
                        <button
                          onClick={() => handleDelete(notif.id)}
                          title="Delete"
                          style={{ background: "rgba(220,38,38,0.07)", border: "none", borderRadius: "8px", width: "32px", height: "32px", cursor: "pointer", fontSize: "0.9rem", color: "#DC2626", display: "flex", alignItems: "center", justifyContent: "center" }}
                        >×</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Col>
        </Row>
      </Container>

      <style jsx global>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(1.4); }
        }
      `}</style>
    </StudentLayout>
  );
}