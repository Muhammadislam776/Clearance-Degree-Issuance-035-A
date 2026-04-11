"use client";
import React from "react";
import { Container, Row, Col, Card, Badge } from "react-bootstrap";
import ExaminerLayout from "@/components/layout/ExaminerLayout";
import { useAuth } from "@/lib/useAuth";

export default function ExaminerNotifications() {
  const { profile } = useAuth();

  const notifications = [
    { id: 1, title: "New Clearance Submitted", message: "Application APP-045 from Ahmed Ali requires your review.", type: "info", timestamp: "Today at 2:30 PM" },
    { id: 2, title: "Review Deadline Approaching", message: "You have 5 applications pending review. Please complete within 48 hours.", type: "warning", timestamp: "Today at 10:00 AM" },
    { id: 3, title: "Application Rejected", message: "Application APP-042 has been marked as rejected due to incomplete documents.", type: "danger", timestamp: "Yesterday at 4:15 PM" },
    { id: 4, title: "Application Approved", message: "Application APP-041 has been successfully approved for degree issuance.", type: "success", timestamp: "2 days ago" },
  ];

  const getVariant = (type) => {
    switch (type) {
      case "success":
        return "success";
      case "info":
        return "info";
      case "warning":
        return "warning";
      case "danger":
        return "danger";
      default:
        return "secondary";
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case "success":
        return "✓";
      case "info":
        return "ℹ";
      case "warning":
        return "⚠";
      case "danger":
        return "✕";
      default:
        return "•";
    }
  };

  return (
    <ExaminerLayout>
      <Container fluid style={{ padding: "20px" }}>
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", padding: "30px", borderRadius: "12px", marginBottom: "30px", color: "white" }}>
          <h1 className="fw-bold mb-2">🔔 Notifications</h1>
          <p>Stay updated on clearance reviews and approvals</p>
        </div>

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
              notifications.map((notification) => (
                <Card
                  key={notification.id}
                  style={{
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    borderRadius: "12px",
                    marginBottom: "15px",
                    borderLeft: `4px solid ${
                      notification.type === "success" ? "#198754" :
                      notification.type === "info" ? "#0dcaf0" :
                      notification.type === "warning" ? "#ffc107" : "#dc3545"
                    }`,
                  }}
                >
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <span style={{
                            fontSize: "1.5rem",
                            color:
                              notification.type === "success" ? "#198754" :
                              notification.type === "info" ? "#0dcaf0" :
                              notification.type === "warning" ? "#ffc107" : "#dc3545",
                          }}>
                            {getIcon(notification.type)}
                          </span>
                          <h5 className="fw-bold mb-0">{notification.title}</h5>
                        </div>
                        <p className="text-muted mb-2">{notification.message}</p>
                        <small className="text-muted">📅 {notification.timestamp}</small>
                      </div>
                      <Badge bg={getVariant(notification.type)}>
                        {notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}
                      </Badge>
                    </div>
                  </Card.Body>
                </Card>
              ))
            )}
          </Col>
        </Row>
      </Container>
    </ExaminerLayout>
  );
}