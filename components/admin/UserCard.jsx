import React from "react";
import { Card, Badge, Button, Row, Col, ProgressBar } from "react-bootstrap";

export default function UserCard({ user, onEdit, onDelete }) {
  const getRoleColor = () => {
    const colors = {
      "student": "primary",
      "department": "success",
      "admin": "danger",
      "examiner": "warning"
    };
    return colors[user.role] || "secondary";
  };

  const getRoleIcon = () => {
    const icons = {
      "student": "👨‍🎓",
      "department": "🏢",
      "admin": "🔐",
      "examiner": "📋"
    };
    return icons[user.role] || "👤";
  };

  return (
    <Card 
      className="shadow-sm border-0 h-100"
      style={{
        borderRadius: "12px",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "white",
        cursor: "pointer"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-8px) scale(1.02)";
        e.currentTarget.style.boxShadow = "0 12px 24px rgba(102, 126, 234, 0.4)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0) scale(1)";
        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.1)";
      }}
    >
      <Card.Body className="p-4">
        <div className="d-flex justify-content-between align-items-start mb-3">
          <span style={{ fontSize: "2.5rem" }}>{getRoleIcon()}</span>
          <Badge bg="light" text="dark">{user.role.toUpperCase()}</Badge>
        </div>

        <h5 className="fw-bold mb-1">{user.name}</h5>
        <p className="mb-3" style={{ fontSize: "0.9rem", opacity: 0.9 }}>
          {user.email}
        </p>

        <div className="mb-3">
          <small style={{ opacity: 0.8 }}>Added {user.created_at ? new Date(user.created_at).toLocaleDateString() : "Recently"}</small>
        </div>

        <Row className="g-2">
          <Col xs={6}>
            <Button 
              variant="light" 
              size="sm" 
              className="w-100 fw-bold text-primary"
              onClick={onEdit}
            >
              ✏️ Edit
            </Button>
          </Col>
          <Col xs={6}>
            <Button 
              variant="outline-light" 
              size="sm" 
              className="w-100 fw-bold"
              onClick={onDelete}
            >
              🗑️ Delete
            </Button>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
}
