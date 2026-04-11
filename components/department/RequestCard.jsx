import React from "react";
import { Card, Badge, Button, ProgressBar } from "react-bootstrap";

export default function RequestCard({ request, onApprove, onReject, onChat }) {
  const getStatusColor = () => {
    switch (request.status) {
      case "pending":
        return "warning";
      case "approved":
        return "success";
      case "rejected":
        return "danger";
      default:
        return "secondary";
    }
  };

  return (
    <Card 
      className="shadow-sm border-0 mb-3"
      style={{
        borderLeft: "4px solid #0d6efd",
        borderRadius: "8px",
        transition: "all 0.3s ease",
        cursor: "pointer"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 8px 20px rgba(0, 0, 0, 0.12)";
        e.currentTarget.style.transform = "translateX(5px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.08)";
        e.currentTarget.style.transform = "translateX(0)";
      }}
    >
      <Card.Body className="p-4">
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div>
            <h5 className="fw-bold mb-1">{request.student_name}</h5>
            <p className="text-muted small mb-0">Roll: {request.roll_number}</p>
          </div>
          <Badge bg={getStatusColor()}>
            {request.status.toUpperCase()}
          </Badge>
        </div>

        <p className="text-muted mb-3">{request.remarks || "No remarks provided"}</p>

        <ProgressBar 
          now={request.status === "approved" ? 100 : request.status === "pending" ? 33 : 0} 
          className="mb-3"
          style={{ height: "6px" }}
        />

        <div className="d-flex gap-2">
          <Button 
            variant="success" 
            size="sm"
            onClick={onApprove}
            disabled={request.status !== "pending"}
            className="fw-bold"
          >
            ✓ Approve
          </Button>
          <Button 
            variant="danger" 
            size="sm"
            onClick={onReject}
            disabled={request.status !== "pending"}
            className="fw-bold"
          >
            ✕ Reject
          </Button>
          <Button 
            variant="outline-primary" 
            size="sm"
            onClick={onChat}
            className="fw-bold"
          >
            💬 Chat
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
}
