'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Modal, Form, Alert, Spinner } from 'react-bootstrap';
import ExaminerLayout from '@/components/layout/ExaminerLayout';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/lib/supabaseClient';
import { approveFinal } from '@/lib/clearanceService';

export default function PendingClearancesPage() {
  const { profile } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [verdict, setVerdict] = useState("");
  const [comments, setComments] = useState("");
  
  const [pendingApplications, setPendingApplications] = useState([]);
  const [allActiveApplications, setAllActiveApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [academicDepartment, setAcademicDepartment] = useState(null);

  const dashboardStats = useMemo(() => {
    const totalApps = allActiveApplications.length;

    if (!totalApps) {
      return {
        averageClearances: "0.0",
        completeDocuments: 0,
        needAttention: 0,
      };
    }

    const totalApprovedAcrossApps = allActiveApplications.reduce((sum, app) => {
      const approvedCount = (app.clearance_status || []).filter(
        (s) => s.status === "approved" || s.status === "completed"
      ).length;
      return sum + approvedCount;
    }, 0);

    const completeDocuments = allActiveApplications.filter((app) => {
      const statuses = app.clearance_status || [];
      return statuses.length > 0 && statuses.every((s) => s.status === "approved" || s.status === "completed");
    }).length;

    const needAttention = allActiveApplications.filter((app) =>
      (app.clearance_status || []).some((s) => s.status === "rejected")
    ).length;

    return {
      averageClearances: (totalApprovedAcrossApps / totalApps).toFixed(1),
      completeDocuments,
      needAttention,
    };
  }, [allActiveApplications]);

  useEffect(() => {
    async function loadApplications() {
      try {
        setLoading(true);
        const { data: academicDept } = await supabase
          .from("departments")
          .select("id, name")
          .eq("is_academic", true)
          .maybeSingle();

        setAcademicDepartment(academicDept || null);

        // Fetch all clearance requests that don't have degrees yet
        const { data: requests, error } = await supabase
          .from("clearance_requests")
          .select(`
            id, created_at, overall_status, degree_issued,
            students (id, name, roll_number, department),
            clearance_status ( status )
          `)
          .eq('degree_issued', false);

        if (error) throw error;

        setAllActiveApplications(requests || []);

        // Verify that EVERY department is approved to show up in Examiner dashboard
        const eligibleRequests = (requests || []).filter(req => {
            const hasStatuses = req.clearance_status && req.clearance_status.length > 0;
            const allApproved = hasStatuses && req.clearance_status.every(s => s.status === 'approved');
          const awaitingExaminer = req.overall_status !== "approved";
          return allApproved && awaitingExaminer;
        });

        setPendingApplications(eligibleRequests);
      } catch (err) {
        console.error("Failed to load eligible clearances:", err);
      } finally {
        setLoading(false);
      }
    }
    loadApplications();
  }, []);

  const handleReview = (app) => {
    setSelectedApp(app);
    setShowModal(true);
    setVerdict("");
    setComments("");
  };

  const handleSubmitVerdict = async () => {
    if (!verdict) {
      alert("Please select a verdict");
      return;
    }
    setSubmitting(true);
    
    try {
      if (verdict === "Approved") {
        if (!academicDepartment?.id) {
          throw new Error("No academic department is configured by admin. Please set one before examiner approval.");
        }

        const result = await approveFinal(selectedApp.id, comments);
        if (!result.success) throw new Error(result.error || "Failed to approve final review");
      } else {
        // Handle rejection or pending by marking overall status back
        const { error: updateError } = await supabase.from('clearance_requests')
          .update({ overall_status: 'in_progress', notes: comments?.trim() || null })
          .eq('id', selectedApp.id);
        if (updateError) throw updateError;
      }

      // Update UI 
      setPendingApplications(prev => prev.filter(app => app.id !== selectedApp.id));
      setShowModal(false);
      if (verdict === "Approved") {
        alert(`Application approved by examiner. Sent to ${academicDepartment?.name || "Academic Department"} for final degree issuance.`);
      } else {
        alert(`Application has been ${verdict.toLowerCase()}!`);
      }
    } catch (err) {
       console.error("Failed to submit verdict", err);
       const errorMsg = err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
       alert("Error processing review: " + errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ExaminerLayout>
      <Container fluid style={{ padding: "20px" }}>
        <style jsx global>{`
          @keyframes exPendingRise {
            from { opacity: 0; transform: translateY(14px); }
            to { opacity: 1; transform: translateY(0); }
          }

          .ex-pending-hero {
            background: linear-gradient(135deg, rgba(37,99,235,0.92) 0%, rgba(99,102,241,0.92) 58%, rgba(124,58,237,0.92) 100%);
            padding: 1.8rem;
            border-radius: 20px;
            margin-bottom: 1.4rem;
            color: #fff;
            border: 1px solid rgba(255,255,255,0.12);
            box-shadow: 0 16px 34px rgba(15,23,42,0.26);
            animation: exPendingRise 0.45s ease-out;
          }

          .ex-pending-alert {
            border: 1px solid rgba(148,163,184,0.14) !important;
            box-shadow: 0 10px 24px rgba(15,23,42,0.18) !important;
          }

          .ex-pending-stat {
            background: linear-gradient(180deg, rgba(15,23,42,0.96) 0%, rgba(30,41,59,0.96) 100%) !important;
            border: 1px solid rgba(148,163,184,0.14) !important;
            border-radius: 16px !important;
            box-shadow: 0 10px 24px rgba(15,23,42,0.2) !important;
            transition: transform 0.24s ease, box-shadow 0.24s ease, border-color 0.24s ease;
          }

          .ex-pending-stat:hover {
            transform: translateY(-4px);
            border-color: rgba(96,165,250,0.34) !important;
            box-shadow: 0 16px 30px rgba(15,23,42,0.28) !important;
          }

          .ex-pending-stat-label {
            color: #cbd5e1 !important;
          }

          .ex-pending-table-card {
            background: linear-gradient(180deg, rgba(15,23,42,0.96) 0%, rgba(17,24,39,0.96) 100%) !important;
            border: 1px solid rgba(148,163,184,0.14) !important;
            border-radius: 18px !important;
            box-shadow: 0 12px 28px rgba(15,23,42,0.2) !important;
            overflow: hidden;
          }

          .ex-pending-table-head {
            background: linear-gradient(135deg, rgba(37,99,235,0.9) 0%, rgba(124,58,237,0.9) 100%) !important;
            color: #fff !important;
            font-weight: 800;
            border-bottom: 1px solid rgba(148,163,184,0.16);
          }

          .ex-pending-table-wrap {
            background: transparent;
          }

          .ex-pending-table {
            margin-bottom: 0;
            border-collapse: separate;
            border-spacing: 0 12px;
          }

          .ex-pending-table thead th {
            color: #94A3B8 !important;
            border: none !important;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-size: 0.75rem;
            font-weight: 800;
            background: transparent !important;
            padding: 0.5rem 1rem;
          }

          .ex-pending-table tbody tr {
            background: linear-gradient(145deg, rgba(30,41,59,0.9) 0%, rgba(15,23,42,0.95) 100%) !important;
            box-shadow: 0 8px 16px rgba(0,0,0,0.15);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            border-radius: 16px;
          }
          
          .ex-pending-table tbody tr:hover {
            transform: translateY(-4px) scale(1.01);
            box-shadow: 0 20px 30px rgba(0,0,0,0.35);
            background: linear-gradient(145deg, rgba(51,65,85,0.95) 0%, rgba(30,41,59,0.95) 100%) !important;
          }

          .ex-pending-table td {
            border: none !important;
            background: transparent !important;
            vertical-align: middle;
            color: #F8FAFC !important;
            font-weight: 600;
            font-size: 0.95rem;
            padding: 1.25rem 1rem;
          }
          
          .ex-pending-table td:first-child {
            border-top-left-radius: 16px;
            border-bottom-left-radius: 16px;
          }
          
          .ex-pending-table td:last-child {
            border-top-right-radius: 16px;
            border-bottom-right-radius: 16px;
          }

          .ex-action-btn {
            background: linear-gradient(135deg, rgba(37,99,235,0.96), rgba(124,58,237,0.96)) !important;
            border: none !important;
            border-radius: 10px !important;
            font-weight: 700 !important;
            box-shadow: 0 10px 20px rgba(37,99,235,0.2);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
          }

          .ex-action-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 14px 24px rgba(37,99,235,0.28);
          }

          .ex-pending-modal .modal-content {
            border: 1px solid rgba(148,163,184,0.2);
            border-radius: 20px;
            overflow: hidden;
            background: linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(30,41,59,0.98) 100%);
            color: #e2e8f0;
            box-shadow: 0 30px 60px rgba(15,23,42,0.45);
          }

          .ex-pending-modal .modal-header {
            border-bottom-color: rgba(148,163,184,0.16);
          }

          .ex-pending-modal .modal-footer {
            border-top-color: rgba(148,163,184,0.16);
          }

          .ex-pending-modal .btn-close {
            filter: invert(1) brightness(2);
          }

          .ex-pending-modal .form-control,
          .ex-pending-modal .form-select,
          .ex-pending-modal .form-control:focus,
          .ex-pending-modal .form-select:focus {
            background: rgba(15,23,42,0.86) !important;
            color: #f8fafc !important;
            border: 1px solid rgba(148,163,184,0.24) !important;
            box-shadow: none !important;
          }

          .ex-pending-modal .form-control::placeholder {
            color: #94a3b8;
          }

          .ex-progress-shell {
            background: rgba(15,23,42,0.72) !important;
            border: 1px solid rgba(148,163,184,0.14);
          }
        `}</style>

        {/* Header */}
        <div className="ex-pending-hero">
          <h1 className="fw-bold mb-2">⏳ Pending Clearances for Review</h1>
          <p>Review and approve final degree clearances from students</p>
        </div>

        {academicDepartment ? (
          <Alert variant="info" className="border-0 shadow-sm rounded-4 ex-pending-alert">
            Final degree issuance authority: <strong>{academicDepartment.name}</strong>. Examiner approval forwards records there.
          </Alert>
        ) : (
          <Alert variant="warning" className="border-0 shadow-sm rounded-4 ex-pending-alert">
            No academic department is selected by admin. Examiner can review, but final degree issuance cannot proceed until one department is marked academic.
          </Alert>
        )}

        {/* Summary */}
        <Row className="mb-4">
          <Col md={6} lg={3} className="mb-3">
            <Card className="ex-pending-stat" style={{ borderLeft: "4px solid #ffc107" }}>
              <Card.Body>
                <p className="small mb-1 ex-pending-stat-label">Pending Review</p>
                <h3 className="fw-bold mb-0" style={{ color: "#ffc107" }}>{pendingApplications.length}</h3>
              </Card.Body>
            </Card>
          </Col>
          <Col md={6} lg={3} className="mb-3">
            <Card className="ex-pending-stat" style={{ borderLeft: "4px solid #667eea" }}>
              <Card.Body>
                <p className="small mb-1 ex-pending-stat-label">Average Clearances</p>
                <h3 className="fw-bold mb-0" style={{ color: "#667eea" }}>{dashboardStats.averageClearances}</h3>
              </Card.Body>
            </Card>
          </Col>
          <Col md={6} lg={3} className="mb-3">
            <Card className="ex-pending-stat" style={{ borderLeft: "4px solid #198754" }}>
              <Card.Body>
                <p className="small mb-1 ex-pending-stat-label">Complete Documents</p>
                <h3 className="fw-bold mb-0" style={{ color: "#198754" }}>{dashboardStats.completeDocuments}</h3>
              </Card.Body>
            </Card>
          </Col>
          <Col md={6} lg={3} className="mb-3">
            <Card className="ex-pending-stat" style={{ borderLeft: "4px solid #dc3545" }}>
              <Card.Body>
                <p className="small mb-1 ex-pending-stat-label">Need Attention</p>
                <h3 className="fw-bold mb-0" style={{ color: "#dc3545" }}>{dashboardStats.needAttention}</h3>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Applications Table */}
        <Row>
          <Col lg={12}>
            <Card className="ex-pending-table-card">
              <Card.Header className="ex-pending-table-head">
                📋 Applications Pending Final Review
              </Card.Header>
              <Card.Body className="ex-pending-table-wrap">
                <Table responsive className="ex-pending-table border-0">
                  <thead>
                    <tr>
                      <th>App ID</th>
                      <th>Student Name</th>
                      <th>Roll No</th>
                      <th>Department</th>
                      <th>Submitted</th>
                      <th>Clearances Completed</th>
                      <th>Documents</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                       <tr><td colSpan="8" className="text-center py-5"><Spinner animation="border" /></td></tr>
                    ) : pendingApplications.length === 0 ? (
                       <tr><td colSpan="8" className="text-center p-4">No applications are fully cleared for final review right now.</td></tr>
                    ) : (
                      pendingApplications.map((app) => (
                        <tr key={app.id}>
                          <td><strong>{app.id.substring(0, 8)}...</strong></td>
                          <td>{app.students?.name}</td>
                          <td>{app.students?.roll_number}</td>
                          <td>{app.students?.department}</td>
                          <td>{new Date(app.created_at).toLocaleDateString()}</td>
                          <td>
                            <Badge bg="success">Fully Cleared ({app.clearance_status?.length}/{app.clearance_status?.length})</Badge>
                          </td>
                          <td>
                            <Badge bg="success">Verified</Badge>
                          </td>
                          <td>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleReview(app)}
                              className="ex-action-btn"
                            >
                              Review Final
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Review Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered className="ex-pending-modal">
        <Modal.Header closeButton style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }} className="text-white">
          <Modal.Title>📋 Review Application - {selectedApp?.id}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedApp && (
            <>
              <Alert variant="info">
                <strong>Student:</strong> {selectedApp.students?.name} ({selectedApp.students?.roll_number}) | <strong>Department:</strong> {selectedApp.students?.department}
              </Alert>

              <Form>
                <Form.Group className="mb-4">
                  <Form.Label className="fw-bold">Clearances Status</Form.Label>
                  <div style={{ backgroundColor: "#f8f9ff", padding: "15px", borderRadius: "8px" }}>
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="text-success"><i className="bi bi-check-circle-fill"></i> Completed Verified Clearances: <strong>100%</strong></span>
                      <div className="ex-progress-shell" style={{ width: "150px", height: "20px", borderRadius: "10px", overflow: "hidden" }}>
                        <div style={{
                          width: `100%`,
                          height: "100%",
                          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        }}></div>
                      </div>
                    </div>
                  </div>
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label className="fw-bold">Documents Status</Form.Label>
                  <Form.Control
                    type="text"
                    value={selectedApp.documentsStatus}
                    disabled
                    style={{ backgroundColor: "rgba(15,23,42,0.72)" }}
                  />
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label className="fw-bold">Your Verdict</Form.Label>
                  <Form.Select
                    value={verdict}
                    onChange={(e) => setVerdict(e.target.value)}
                    required
                  >
                    <option value="">Select a verdict...</option>
                    <option value="Approved">✅ Approve and Forward to Academic Department</option>
                    <option value="Rejected">❌ Reject Application</option>
                    <option value="Pending">⏳ Request More Information</option>
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label className="fw-bold">Comments/Remarks</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Add any comments or reasons for your decision..."
                  />
                </Form.Group>
              </Form>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmitVerdict}
            disabled={submitting}
            className="ex-action-btn"
          >
            {submitting ? "Processing..." : "Submit Review"}
          </Button>
        </Modal.Footer>
      </Modal>
    </ExaminerLayout>
  );
}

