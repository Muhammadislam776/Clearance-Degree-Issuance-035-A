"use client";
import React from "react";
import { Modal, Button, Badge, Row, Col, Form, Spinner } from "react-bootstrap";

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
      <div style={{ height: "6px", background: "linear-gradient(135deg, #3B82F6, #8B5CF6, #06B6D4)", width: "100%" }} />

      <Modal.Header closeButton className="border-0 pt-4 pb-2 px-4 px-md-5">
        <Modal.Title style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, color: "#FFFFFF", fontSize: "1.45rem" }}>
          Review Clearance Request
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="pt-2 pb-4 px-4 px-md-5">
        
        {/* Subtitle / Intro */}
        <p style={{ color: "#94A3B8", fontSize: "0.95rem", marginBottom: "1.5rem" }}>
          Please verify the student's details and any outstanding dues or requirements before taking action.
        </p>

        {/* Info Grid */}
        <div className="mb-4">
          <Row className="g-3">
            {/* Student Name */}
            <Col md={6}>
              <div className="review-info-card">
                <div className="card-label">Student Name</div>
                <div className="card-value text-white">
                  {request.student}
                </div>
              </div>
            </Col>

            {/* Roll Number */}
            <Col md={6}>
              <div className="review-info-card">
                <div className="card-label">Roll Number</div>
                <div className="card-value" style={{ color: "#60A5FA" }}>
                  {request.rollNo}
                </div>
              </div>
            </Col>

            {/* Date & Status */}
            <Col md={12}>
              <div className="review-info-card d-flex justify-content-between align-items-center">
                <div>
                  <div className="card-label">Submission Date</div>
                  <div style={{ fontWeight: 600, color: "#E2E8F0" }}>
                    📅 {request.dateSubmitted}
                  </div>
                </div>
                <div className="text-end">
                  <div className="card-label">Status</div>
                  <Badge 
                    className={`px-3 py-2 rounded-pill status-badge-${request.status}`}
                    style={{ fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.5px" }}
                  >
                    {request.status?.toUpperCase() || 'PENDING'}
                  </Badge>
                </div>
              </div>
            </Col>
          </Row>
        </div>

        {/* Conditional Rendering based on valid taskId */}
        {!request.taskId ? (
          <div style={{ background: "rgba(220, 38, 38, 0.1)", border: "1px solid rgba(220, 38, 38, 0.3)", borderRadius: "12px", padding: "1rem", marginTop: "1rem" }}>
            <div style={{ color: "#EF4444", fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.25rem" }}>⚠️ Global View (Read-Only)</div>
            <div style={{ color: "#F87171", fontSize: "0.85rem" }}>
              You are viewing this student in the Hub Overview but you do not have an actionable task assigned here. Select your specific department on the left to handle clearances.
            </div>
          </div>
        ) : (
          <>
            {request.notes ? (
              <div className="review-info-card mb-3" style={{ background: "rgba(30, 41, 59, 0.5)" }}>
                <div className="card-label">Student Submitted Details</div>
                <div style={{ color: "#CBD5E1", whiteSpace: "pre-wrap", fontSize: "0.92rem", lineHeight: 1.5 }}>
                  {request.notes}
                </div>
              </div>
            ) : null}

            {/* Remarks Form */}
            <Form.Group className="mb-4 mt-3">
              <Form.Label style={{ fontSize: "0.8rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", color: "#94A3B8" }}>
                Staff Remarks (Optional)
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                className="dept-textarea-dark"
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
                {loading ? <Spinner size="sm" animation="border" className="me-2" /> : "❌"} Reject Request
              </Button>
              <Button
                className="flex-grow-1 dept-btn-approve shadow-sm"
                onClick={() => handleAction("approved")}
                disabled={loading}
              >
                {loading ? <Spinner size="sm" animation="border" className="me-2" /> : "✅"} Approve Clearance
              </Button>
            </div>
          </>
        )}
      </Modal.Body>

      <style jsx global>{`
        /* Modal Container */
        .dept-review-modal .modal-content {
          border-radius: 28px;
          border: 1px solid rgba(148, 163, 184, 0.1);
          background: #0F172A !important;
          box-shadow: 0 0 50px rgba(37, 99, 235, 0.15);
          overflow: hidden;
          animation: modalSlideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        @keyframes modalSlideUp {
          from { transform: translateY(30px) scale(0.98); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }

        .dept-review-modal .modal-header .btn-close {
          filter: invert(1) brightness(2);
          opacity: 0.7;
        }

        /* Info Cards */
        .review-info-card {
          background: #1E293B;
          border: 1px solid rgba(148, 163, 184, 0.1);
          border-radius: 20px;
          padding: 1.25rem;
          transition: all 0.3s ease;
        }
        .review-info-card:hover {
          transform: translateY(-3px);
          background: #243147;
          border-color: rgba(96, 165, 250, 0.3);
          box-shadow: 0 10px 25px rgba(37, 99, 235, 0.2);
        }

        .card-label {
          font-size: 0.7rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #64748B;
          margin-bottom: 0.4rem;
        }
        .card-value {
          font-size: 1.1rem;
          font-weight: 700;
        }

        /* Status Badges */
        .status-badge-approved { background: #10B981 !important; box-shadow: 0 0 15px rgba(16, 185, 129, 0.3); }
        .status-badge-rejected { background: #EF4444 !important; box-shadow: 0 0 15px rgba(239, 68, 68, 0.3); }
        .status-badge-pending { background: #F59E0B !important; box-shadow: 0 0 15px rgba(245, 158, 11, 0.3); }
        .status-badge-undefined { background: #64748B !important; }

        /* Textarea Dark */
        .dept-textarea-dark {
          border-radius: 16px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          background-color: rgba(30, 41, 59, 0.5) !important;
          color: #FFFFFF !important;
          padding: 1rem;
          font-size: 0.95rem;
          box-shadow: none !important;
          transition: all 0.3s ease;
        }
        .dept-textarea-dark:focus {
          border-color: #3B82F6;
          background-color: rgba(30, 41, 59, 0.8) !important;
          box-shadow: 0 0 15px rgba(37, 99, 235, 0.1) !important;
        }

        /* Buttons */
        .dept-btn-reject {
          padding: 0.85rem 1.5rem;
          font-weight: 800;
          border-radius: 16px;
          background: #991B1B !important;
          border: none !important;
          color: white !important;
          transition: all 0.3s ease;
        }
        .dept-btn-reject:hover {
          background: #B91C1C !important;
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(185, 28, 28, 0.3) !important;
        }

        .dept-btn-approve {
          padding: 0.85rem 1.5rem;
          font-weight: 800;
          border-radius: 16px;
          background: linear-gradient(135deg, #059669 0%, #10B981 100%) !important;
          border: none !important;
          color: white !important;
          transition: all 0.3s ease;
        }
        .dept-btn-approve:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(16, 185, 129, 0.4) !important;
        }
      `}</style>
    </Modal>
  );
}
