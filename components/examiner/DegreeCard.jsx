import React from "react";
import { Card, Badge, Button, Row, Col } from "react-bootstrap";

export default function DegreeCard({ student, allApproved = false, onIssue }) {
  return (
    <Card 
      className="shadow-sm border-0 h-100"
      style={{
        borderRadius: "12px",
        background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
        color: "white",
        overflow: "hidden",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-8px) rotateZ(-2deg)";
        e.currentTarget.style.boxShadow = "0 15px 35px rgba(245, 87, 108, 0.4)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0) rotateZ(0deg)";
        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.1)";
      }}
    >
      <Card.Body className="p-4">
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div>
            <h5 className="fw-bold mb-1">{student.name}</h5>
            <p className="mb-0" style={{ fontSize: "0.9rem", opacity: 0.9 }}>
              {student.roll_number}
            </p>
          </div>
          <span style={{ fontSize: "3rem" }}>🎓</span>
        </div>

        <p className="mb-3">{student.department}</p>

        <Badge 
          bg={allApproved ? "light" : "dark"}
          text={allApproved ? "success" : "white"}
          className="mb-3 py-2 px-3"
        >
          {allApproved ? "✓ Ready for Issuance" : "⏳ Pending Approvals"}
        </Badge>

        <div className="mb-4">
          <p className="mb-1" style={{ fontSize: "0.85rem", opacity: 0.9 }}>
            Department Approvals
          </p>
          <p className="fw-bold" style={{ fontSize: "1.3rem" }}>
            {student.approved_count || 0}/{student.total_departments || 4}
          </p>
        </div>

        <Button 
          variant="light"
          size="lg"
          className="w-100 fw-bold text-danger"
          onClick={onIssue}
          disabled={!allApproved}
          style={{
            borderRadius: "8px",
            transition: "all 0.2s ease"
          }}
          onMouseEnter={(e) => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.transform = "scale(1.05)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          Issue Certificate
        </Button>
      </Card.Body>
    </Card>
  );
}
