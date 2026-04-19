"use client";
import React from "react";
import { Modal, Button, Badge, Row, Col, Form } from "react-bootstrap";

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
    <Modal show={show} onHide={onHide} size="lg" centered className="dept-review-modal">
      
      {/* Premium Header Strip */}
      <div style={{ height: "6px", background: "linear-gradient(135deg, #0062FF, #6366F1, #8B5CF6)", width: "100%" }} />

      <Modal.Header closeButton className="border-0 pt-4 pb-2 px-4 px-md-5">
        <Modal.Title style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, color: "#0F172A", fontSize: "1.45rem" }}>
          Review Clearance Request
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="pt-2 pb-4 px-4 px-md-5">
        
        {/* Subtitle / Intro */}
        <p style={{ color: "#64748B", fontSize: "0.95rem", marginBottom: "1.5rem" }}>
          Please verify the student's details and any outstanding dues or requirements before taking action.
        </p>

        {/* Info Grid */}
        <div className="mb-4">
          <Row className="g-3">
            {/* Student Name */}
            <Col md={6}>
              <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "16px", padding: "1.25rem" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", color: "#94A3B8", marginBottom: "0.25rem" }}>
                  Student Name
                </div>
                <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "#0F172A" }}>
                  {request.student}
                </div>
              </div>
            </Col>

            {/* Roll Number */}
            <Col md={6}>
              <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "16px", padding: "1.25rem" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", color: "#94A3B8", marginBottom: "0.25rem" }}>
                  Roll Number
                </div>
                <div style={{ fontSize: "1.15rem", fontWeight: 700, fontFamily: "monospace", color: "#0062FF" }}>
                  {request.rollNo}
                </div>
              </div>
            </Col>

            {/* Date & Status */}
            <Col md={12}>
              <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "16px", padding: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", color: "#94A3B8", marginBottom: "0.25rem" }}>
                    Submission Date
                  </div>
                  <div style={{ fontWeight: 600, color: "#475569" }}>
                    📅 {request.dateSubmitted}
                  </div>
                </div>
                <div className="text-end">
                  <div style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", color: "#94A3B8", marginBottom: "0.4rem" }}>
                    Status
                  </div>
                  <Badge bg={request.status === 'approved' ? 'success' : request.status === 'rejected' ? 'danger' : 'warning'} 
                         className="px-3 py-2 rounded-pill"
                         style={{ fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.5px" }}>
                    {request.status?.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </Col>
          </Row>
        </div>

        {/* Conditional Rendering based on valid taskId */}
        {!request.taskId ? (
          <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: "12px", padding: "1rem", marginTop: "1rem" }}>
            <div style={{ color: "#DC2626", fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.25rem" }}>⚠️ Global View (Read-Only)</div>
            <div style={{ color: "#991B1B", fontSize: "0.85rem" }}>
              You are viewing this student in the Hub Overview but you do not have an actionable task assigned here. Select your specific department on the left to handle clearances.
            </div>
          </div>
        ) : (
          <>
            {/* Remarks Form */}
            <Form.Group className="mb-4 mt-3">
              <Form.Label style={{ fontSize: "0.8rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", color: "#475569" }}>
                Staff Remarks (Optional)
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                className="dept-textarea"
                placeholder="Add a reason for rejection or approval notes here..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </Form.Group>

            {/* Actions */}
            <div className="d-flex gap-3 mt-4 flex-wrap">
              <Button
                className="flex-grow-1 dept-btn-reject shadow-sm"
                onClick={() => handleAction("rejected")}
                disabled={loading}
              >
                ❌ Reject Request
              </Button>
              <Button
                className="flex-grow-1 dept-btn-approve shadow-sm"
                onClick={() => handleAction("approved")}
                disabled={loading}
              >
                ✅ Approve Clearance
              </Button>
            </div>
          </>
        )}
      </Modal.Body>

      <style jsx global>{`
        /* Modal Container */
        .dept-review-modal .modal-content {
          border-radius: 24px;
          border: none;
          background: #ffffff !important;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          overflow: hidden;
        }
        
        /* Overriding any inherited dark text/background on modal close button */
        .dept-review-modal .modal-header .btn-close {
          filter: none !important;
          opacity: 0.5;
        }
        .dept-review-modal .modal-header .btn-close:hover {
          opacity: 1;
        }

        /* Enforce light styling internally if theme is fighting it */
        .dept-review-modal * {
          color-scheme: light;
        }

        /* Crisp Textarea */
        .dept-textarea {
          border-radius: 12px;
          border: 2px solid #E2E8F0;
          background-color: #ffffff !important;
          color: #0F172A !important;
          padding: 1rem;
          font-size: 0.95rem;
          box-shadow: none !important;
          transition: border-color 0.2s ease;
        }
        .dept-textarea:focus {
          border-color: #0062FF;
          outline: none;
        }
        .dept-textarea::placeholder {
          color: #94A3B8 !important;
          opacity: 1 !important;
        }

        /* Buttons */
        .dept-btn-reject {
          padding: 0.8rem 1.5rem;
          font-weight: 700;
          font-size: 1rem;
          border-radius: 14px;
          background: #DC2626 !important;
          border: none !important;
          color: white !important;
          transition: all 0.2s ease;
        }
        .dept-btn-reject:hover {
          background: #B91C1C !important;
          transform: translateY(-2px);
        }

        .dept-btn-approve {
          padding: 0.8rem 1.5rem;
          font-weight: 700;
          font-size: 1rem;
          border-radius: 14px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
          border: none !important;
          color: white !important;
          transition: all 0.2s ease;
        }
        .dept-btn-approve:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(16, 185, 129, 0.2) !important;
        }
      `}</style>
    </Modal>
  );
}
