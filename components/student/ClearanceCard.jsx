import React from "react";
import { Card, Badge, Button, Row, Col, ProgressBar } from "react-bootstrap";

export default function ClearanceCard({ clearance, onView, onUploadDocs }) {
  const statusColor = {
    pending: "warning",
    approved: "success",
    rejected: "danger",
    in_progress: "info"
  };

  const getProgressValue = () => {
    switch (clearance.status) {
      case "approved":
        return 100;
      case "in_progress":
        return 50;
      case "rejected":
        return 0;
      default:
        return 25;
    }
  };

  return (
    <Card 
      className="h-100 shadow-sm border-0 transition-all"
      style={{
        background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
        borderRadius: "12px",
        cursor: "pointer",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        overflow: "hidden",
        position: "relative"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-8px)";
        e.currentTarget.style.boxShadow = "0 12px 24px rgba(0, 0, 0, 0.15)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.1)";
      }}
    >
      <Card.Body className="p-4">
        <Row className="align-items-start mb-3">
          <Col>
            <h5 className="fw-bold mb-2">{clearance.department_name}</h5>
            <Badge bg={statusColor[clearance.status]} className="fs-6">
              {clearance.status.replace("_", " ").toUpperCase()}
            </Badge>
          </Col>
          <Col xs="auto">
            <span style={{ fontSize: "2rem" }}>📋</span>
          </Col>
        </Row>

        <p className="text-muted small mb-3">
          {clearance.remarks || "Awaiting department review"}
        </p>

        <ProgressBar 
          now={getProgressValue()} 
          className="mb-3" 
          style={{ height: "8px" }}
        />

        <Row className="g-2">
          <Col xs={6}>
            <Button 
              variant="outline-primary" 
              size="sm" 
              className="w-100 fw-bold"
              onClick={onView}
            >
              View
            </Button>
          </Col>
          <Col xs={6}>
            <Button 
              variant="outline-success" 
              size="sm" 
              className="w-100 fw-bold"
              onClick={onUploadDocs}
            >
              Upload Docs
            </Button>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
}
