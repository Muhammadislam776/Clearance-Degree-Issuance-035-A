"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Container, Row, Col, Card, Badge, Spinner, Button } from "react-bootstrap";
import DepartmentLayout from "@/components/layout/DepartmentLayout";
import { useAuth } from "@/lib/useAuth";
import {
  getUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  subscribeToNotifications,
} from "@/lib/notificationService";

export default function DepartmentNotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notifications, setNotifications] = useState([]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) {
      setLoading(false);
      return;
    }

    let channel;

    const load = async () => {
      setLoading(true);
      setError("");

      const res = await getUserNotifications(user.id, { limit: 50 });
      if (!res.success) {
        setError(res.error || "Failed to load notifications");
        setNotifications([]);
        setLoading(false);
        return;
      }

      setNotifications(res.data || []);
      setLoading(false);

      channel = subscribeToNotifications(user.id, (newNotification) => {
        setNotifications((prev) => [newNotification, ...prev]);
      });
    };

    load();

    return () => {
      if (channel) channel.unsubscribe();
    };
  }, [authLoading, user?.id]);

  const getVariant = (type) => {
    switch (type) {
      case "clearance_update":
        return "info";
      case "chat_message":
        return "primary";
      case "document_rejected":
        return "warning";
      case "deadline_reminder":
        return "warning";
      case "system":
        return "secondary";
      default:
        return "secondary";
    }
  };

  const handleMarkAllRead = async () => {
    if (!user?.id) return;
    await markAllNotificationsAsRead(user.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleMarkRead = async (notif) => {
    if (notif.is_read) return;
    await markNotificationAsRead(notif.id);
    setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n)));
  };

  return (
    <DepartmentLayout>
      <Container fluid style={{ padding: "20px" }}>
        <div
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            padding: "30px",
            borderRadius: "12px",
            marginBottom: "30px",
            color: "white",
          }}
        >
          <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
            <div>
              <h1 className="fw-bold mb-2">🔔 Notifications</h1>
              <p className="mb-0">Updates related to your department workload</p>
            </div>
            <div className="text-end">
              <div className="mb-2">
                <Badge bg={unreadCount > 0 ? "warning" : "light"} text={unreadCount > 0 ? "dark" : "dark"}>
                  {unreadCount} unread
                </Badge>
              </div>
              <Button variant="light" size="sm" onClick={handleMarkAllRead} disabled={unreadCount === 0}>
                Mark all read
              </Button>
            </div>
          </div>
        </div>

        {error ? (
          <Card className="border-danger">
            <Card.Body className="text-danger">{error}</Card.Body>
          </Card>
        ) : null}

        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" role="status" className="mb-3" />
            <p className="text-muted">Loading notifications...</p>
          </div>
        ) : (
          <Row>
            <Col lg={10} className="mx-auto">
              {notifications.length === 0 ? (
                <Card style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.1)", borderRadius: "12px" }}>
                  <Card.Body className="text-center py-5">
                    <p style={{ fontSize: "3rem", marginBottom: "10px" }}>📭</p>
                    <p className="text-muted">No notifications yet</p>
                  </Card.Body>
                </Card>
              ) : (
                notifications.map((n) => (
                  <Card
                    key={n.id}
                    onClick={() => handleMarkRead(n)}
                    style={{
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      borderRadius: "12px",
                      marginBottom: "15px",
                      cursor: "pointer",
                      opacity: n.is_read ? 0.75 : 1,
                    }}
                  >
                    <Card.Body>
                      <div className="d-flex justify-content-between align-items-start gap-3">
                        <div>
                          <h5 className="fw-bold mb-1">
                            {n.title}{" "}
                            {!n.is_read ? (
                              <Badge bg="warning" text="dark" className="ms-2">
                                New
                              </Badge>
                            ) : null}
                          </h5>
                          <p className="text-muted mb-2">{n.message}</p>
                          <small className="text-muted">
                            {n.created_at ? new Date(n.created_at).toLocaleString() : ""}
                          </small>
                        </div>
                        <Badge bg={getVariant(n.type)}>{n.type}</Badge>
                      </div>
                    </Card.Body>
                  </Card>
                ))
              )}
            </Col>
          </Row>
        )}
      </Container>
    </DepartmentLayout>
  );
}
