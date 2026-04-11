"use client";
import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Badge, Button, Spinner, Dropdown } from "react-bootstrap";
import StudentLayout from "@/components/layout/StudentLayout";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/lib/supabaseClient";
import notificationService from "@/lib/notificationService";

export default function NotificationsPage() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // "all", "unread"

  const fetchNotifs = async () => {
    if (!profile?.id) return;
    const filters = filter === "unread" ? { isRead: false } : {};
    const result = await notificationService.getUserNotifications(profile.id, filters);
    if (result.success) {
      setNotifications(result.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!profile?.id) return;
    fetchNotifs();

    // Enhanced Real-Time Subscription
    const channel = supabase
      .channel(`notifs-${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "*", // Handle INSERT, UPDATE, DELETE
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          console.log("Notif change:", payload.eventType);
          fetchNotifs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, filter]);

  const handleMarkAsRead = async (id) => {
    await notificationService.markNotificationAsRead(id);
    // Real-time will trigger fetchNotifs
  };

  const handleMarkAllRead = async () => {
    await notificationService.markAllNotificationsAsRead(profile.id);
    // Real-time will trigger fetchNotifs
  };

  const handleDelete = async (id) => {
    await notificationService.deleteNotification(id);
    // Real-time will trigger fetchNotifs
  };

  const getNotifMeta = (type) => {
    switch (type) {
      case "clearance_update":
        return { icon: "📝", color: "#667eea", title: "Clearance Update" };
      case "document_rejected":
        return { icon: "❌", color: "#ef4444", title: "Document Review" };
      case "chat_message":
        return { icon: "💬", color: "#10b981", title: "New Message" };
      case "system":
        return { icon: "⚙️", color: "#6b7280", title: "System Notice" };
      case "deadline_reminder":
        return { icon: "⏰", color: "#f59e0b", title: "Deadline Priority" };
      default:
        return { icon: "🔔", color: "#7c3aed", title: "Notification" };
    }
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <StudentLayout>
      <Container fluid className="py-4 px-md-4" style={{ background: "#f8fafc", minHeight: "calc(100vh - 80px)" }}>
        {/* Modern Header */}
        <div 
          className="p-4 p-md-5 mb-4 shadow-sm" 
          style={{ 
            background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)", 
            borderRadius: "24px",
            color: "white",
            position: "relative",
            overflow: "hidden"
          }}
        >
          <div style={{ position: "relative", zIndex: 2 }}>
            <h1 className="fw-bold mb-2">Alerts & Notifications</h1>
            <p className="opacity-75 mb-0">Stay informed about your clearance actions and department feedback.</p>
          </div>
          {/* Decorative Circle */}
          <div style={{ position: "absolute", top: "-50px", right: "-50px", width: "200px", height: "200px", background: "rgba(255,255,255,0.1)", borderRadius: "50%" }}></div>
        </div>

        <Row className="justify-content-center">
          <Col xl={10}>
            {/* Actions Bar */}
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
              <div className="d-flex bg-white p-1 rounded-pill shadow-sm" style={{ border: "1px solid #e2e8f0" }}>
                <Button 
                  variant={filter === "all" ? "primary" : "light"} 
                  className={`rounded-pill px-4 border-0 transition-all ${filter === "all" ? "shadow-sm" : "bg-transparent text-muted"}`}
                  onClick={() => setFilter("all")}
                  style={{ background: filter === "all" ? "#4f46e5" : "transparent" }}
                >
                  All
                </Button>
                <Button 
                  variant={filter === "unread" ? "primary" : "light"} 
                  className={`rounded-pill px-4 border-0 transition-all ${filter === "unread" ? "shadow-sm" : "bg-transparent text-muted"}`}
                  onClick={() => setFilter("unread")}
                  style={{ background: filter === "unread" ? "#4f46e5" : "transparent" }}
                >
                  Unread
                </Button>
              </div>

              <div className="d-flex gap-2">
                <Button 
                  variant="outline-primary" 
                  className="rounded-pill px-4 border-2 fw-medium"
                  style={{ borderColor: "#4f46e5", color: "#4f46e5" }}
                  onClick={handleMarkAllRead}
                  disabled={notifications.every(n => n.is_read)}
                >
                  Mark all as read
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3 text-muted">Retrieving your latest updates...</p>
              </div>
            ) : notifications.length === 0 ? (
              <Card className="border-0 shadow-sm text-center py-5" style={{ borderRadius: "24px" }}>
                <div style={{ fontSize: "5rem" }}>🎐</div>
                <h4 className="fw-bold mt-4">All Caught Up!</h4>
                <p className="text-muted">You have no new notifications right now.</p>
                <Button variant="link" className="text-decoration-none" onClick={() => setFilter("all")}>View History</Button>
              </Card>
            ) : (
              <div className="notif-timeline">
                {notifications.map((notif) => {
                  const meta = getNotifMeta(notif.type);
                  return (
                    <Card
                      key={notif.id}
                      className={`border-0 mb-3 shadow-hover transition-all ${!notif.is_read ? 'bg-white border-start' : 'bg-light opacity-75'}`}
                      style={{ 
                        borderRadius: "20px",
                        borderLeft: !notif.is_read ? `6px solid ${meta.color}` : 'none',
                        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
                        transition: "all 0.2s ease"
                      }}
                    >
                      <Card.Body className="p-4">
                        <Row className="align-items-start g-3">
                          <Col xs="auto">
                            <div 
                              className="d-flex align-items-center justify-content-center shadow-sm"
                              style={{ 
                                width: "50px", 
                                height: "50px", 
                                background: !notif.is_read ? "#fff" : "#f1f5f9", 
                                borderRadius: "14px",
                                fontSize: "1.2rem",
                                border: `1px solid ${!notif.is_read ? '#e2e8f0' : 'transparent'}`
                              }}
                            >
                              {meta.icon}
                            </div>
                          </Col>
                          <Col className="pt-1">
                            <div className="d-flex justify-content-between align-items-center mb-1">
                              <h6 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                                {notif.title || meta.title}
                                {!notif.is_read && <Badge pill bg="primary" style={{ fontSize: "0.5rem", background: "#4f46e5" }}>NEW</Badge>}
                              </h6>
                              <small className="text-muted fw-medium">{formatTime(notif.created_at)}</small>
                            </div>
                            <p className="text-muted mb-0" style={{ fontSize: "0.95rem", lineHeight: "1.5" }}>
                              {notif.message}
                            </p>
                          </Col>
                          <Col xs="auto" className="d-flex flex-column gap-2">
                            <Dropdown align="end">
                              <Dropdown.Toggle variant="link" className="p-0 text-muted hide-caret">
                                <i className="bi bi-three-dots-vertical"></i>
                              </Dropdown.Toggle>
                              <Dropdown.Menu className="border-0 shadow-sm" style={{ borderRadius: "12px" }}>
                                {!notif.is_read && (
                                  <Dropdown.Item onClick={() => handleMarkAsRead(notif.id)}>Mark as read</Dropdown.Item>
                                )}
                                <Dropdown.Item className="text-danger" onClick={() => handleDelete(notif.id)}>Delete</Dropdown.Item>
                              </Dropdown.Menu>
                            </Dropdown>
                          </Col>
                        </Row>
                      </Card.Body>
                    </Card>
                  );
                })}
              </div>
            )}
          </Col>
        </Row>
      </Container>
      
      <style jsx>{`
        .transition-all { transition: all 0.3s ease; }
        .shadow-hover:hover { transform: translateY(-3px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1) !important; }
        .hide-caret::after { display: none !important; }
        .notif-timeline :global(.dropdown-toggle) { font-size: 1.2rem; }
      `}</style>
    </StudentLayout>
  );
}