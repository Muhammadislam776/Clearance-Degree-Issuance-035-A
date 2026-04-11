import React from "react";
import { Card, Badge, Button, Row, Col } from "react-bootstrap";

export default function DepartmentCard({ dept, onEdit, onDelete, staffCount = 0 }) {
  return (
    <Card 
      className="shadow-sm border-0 h-100"
      style={{
        borderRadius: "12px",
        borderTop: "4px solid #198754",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-8px)";
        e.currentTarget.style.boxShadow = "0 12px 24px rgba(25, 135, 84, 0.3)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.08)";
      }}
    >
      <Card.Body className="p-4">
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div>
            <h5 className="fw-bold mb-1">{dept.name}</h5>
            <Badge bg="success" className="small">{dept.status}</Badge>
          </div>
          <span style={{ fontSize: "2rem" }}>🏛️</span>
        </div>

        <div className="mb-3">
          <p className="mb-2">
            <strong>Focal Person:</strong> <span className="text-primary">{dept.focal_person}</span>
          </p>
          <p className="mb-2">
            <strong>WhatsApp:</strong> <a href={`https://wa.me/${dept.whatsapp}`} target="_blank" rel="noopener noreferrer">{dept.whatsapp}</a>
          </p>
          <p className="mb-0">
            <strong>Email:</strong> <span className="text-primary">{dept.email}</span>
          </p>
        </div>

        <hr />

        <Row className="g-2">
          <Col xs={6}>
            <Button 
              variant="outline-success" 
              size="sm" 
              className="w-100 fw-bold"
              onClick={onEdit}
            >
              Edit
            </Button>
          </Col>
          <Col xs={6}>
            <Button 
              variant="outline-danger" 
              size="sm" 
              className="w-100 fw-bold"
              onClick={onDelete}
            >
              Delete
            </Button>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
}
