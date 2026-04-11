"use client";
import React from "react";
import { Modal, Button, Badge, Row, Col, Card, Form } from "react-bootstrap";

export default function ReviewModal({ show, onHide, request, onAction }) {
  const [comment, setComment] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  if (!request) return null;

  const handleAction = async (status) => {
    setLoading(true);
    await onAction(request.id, status, comment);
    setLoading(false);
    setComment("");
    onHide();
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered className="review-modal">
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold">Review Clearance Request</Modal.Title>
      </Modal.Header>
      <Modal.Body className="pt-3">
        <div className="mb-4">
          <Row className="g-3">
            <Col md={6}>
              <Card className="bg-light border-0" style={{ borderRadius: "16px" }}>
                <Card.Body>
                  <div className="text-muted small text-uppercase fw-bold mb-1">Student Name</div>
                  <div className="h5 fw-bold mb-0">{request.student}</div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card className="bg-light border-0" style={{ borderRadius: "16px" }}>
                <Card.Body>
                  <div className="text-muted small text-uppercase fw-bold mb-1">Roll Number</div>
                  <div className="h5 fw-bold mb-0">{request.rollNo}</div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={12}>
              <Card className="bg-light border-0" style={{ borderRadius: "16px" }}>
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <div className="text-muted small text-uppercase fw-bold mb-1">Submission Date</div>
                      <div className="fw-medium">{request.dateSubmitted}</div>
                    </div>
                    <div>
                      <div className="text-muted small text-uppercase fw-bold mb-1 text-end">Current Status</div>
                      <Badge bg={request.status === 'approved' ? 'success' : 'warning'} className="p-2 px-3 rounded-pill">
                        {request.status?.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </div>

        <Form.Group className="mb-4">
          <Form.Label className="fw-bold text-muted small text-uppercase">Staff Remarks (Optional)</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            placeholder="Add a reason for rejection or approval notes..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            style={{ borderRadius: "12px", border: "2px solid #eef2f6" }}
          />
        </Form.Group>

        <div className="d-flex gap-3 mt-4">
          <Button
            variant="danger"
            className="flex-grow-1 py-3 fw-bold shadow-sm"
            style={{ borderRadius: "14px" }}
            onClick={() => handleAction("rejected")}
            disabled={loading}
          >
            ❌ Reject Request
          </Button>
          <Button
            variant="success"
            className="flex-grow-1 py-3 fw-bold shadow-sm"
            style={{ borderRadius: "14px", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", border: "none" }}
            onClick={() => handleAction("approved")}
            disabled={loading}
          >
            ✅ Approve Clearance
          </Button>
        </div>
      </Modal.Body>
      <style jsx global>{`
        .review-modal .modal-content {
          border-radius: 24px;
          border: none;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }
      `}</style>
    </Modal>
  );
}
