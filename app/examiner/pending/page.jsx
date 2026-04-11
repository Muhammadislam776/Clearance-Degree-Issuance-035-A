'use client';
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Modal, Form, Alert, Spinner } from 'react-bootstrap';
import ExaminerLayout from '@/components/layout/ExaminerLayout';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/lib/supabaseClient';

export default function PendingClearancesPage() {
  const { profile } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [verdict, setVerdict] = useState("");
  const [comments, setComments] = useState("");
  
  const [pendingApplications, setPendingApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadApplications() {
      try {
        setLoading(true);
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

        // Verify that EVERY department is approved to show up in Examiner dashboard
        const eligibleRequests = (requests || []).filter(req => {
            const hasStatuses = req.clearance_status && req.clearance_status.length > 0;
            const allApproved = hasStatuses && req.clearance_status.every(s => s.status === 'approved');
            return allApproved;
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
        // Issue Degree
        const { error: insertError } = await supabase.from('degrees').insert([{
           student_id: selectedApp.students.id,
           degree_title: `${selectedApp.students.department} Official Degree`,
           qr_code: `VERIFIED-${selectedApp.id}`
        }]);
        if (insertError) throw insertError;

        // Mark clearance overall_status as completed
        const { error: updateError } = await supabase.from('clearance_requests')
          .update({ overall_status: 'completed', degree_issued: true })
          .eq('id', selectedApp.id);
        if (updateError) throw updateError;
      } else {
        // Handle rejection or pending by marking overall status back
        const { error: updateError } = await supabase.from('clearance_requests')
          .update({ overall_status: 'in_progress' })
          .eq('id', selectedApp.id);
        if (updateError) throw updateError;
      }

      // Update UI 
      setPendingApplications(prev => prev.filter(app => app.id !== selectedApp.id));
      setShowModal(false);
      alert(`Application has been ${verdict.toLowerCase()}!`);
    } catch (err) {
       console.error("Failed to submit verdict", err);
       alert("Error processing degree. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ExaminerLayout>
      <Container fluid style={{ padding: "20px" }}>
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", padding: "30px", borderRadius: "12px", marginBottom: "30px", color: "white" }}>
          <h1 className="fw-bold mb-2">⏳ Pending Clearances for Review</h1>
          <p>Review and approve final degree clearances from students</p>
        </div>

        {/* Summary */}
        <Row className="mb-4">
          <Col md={6} lg={3} className="mb-3">
            <Card style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.1)", borderRadius: "12px", borderLeft: "4px solid #ffc107" }}>
              <Card.Body>
                <p className="text-muted small mb-1">Pending Review</p>
                <h3 className="fw-bold mb-0" style={{ color: "#ffc107" }}>{pendingApplications.length}</h3>
              </Card.Body>
            </Card>
          </Col>
          <Col md={6} lg={3} className="mb-3">
            <Card style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.1)", borderRadius: "12px", borderLeft: "4px solid #667eea" }}>
              <Card.Body>
                <p className="text-muted small mb-1">Average Clearances</p>
                <h3 className="fw-bold mb-0" style={{ color: "#667eea" }}>5.5</h3>
              </Card.Body>
            </Card>
          </Col>
          <Col md={6} lg={3} className="mb-3">
            <Card style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.1)", borderRadius: "12px", borderLeft: "4px solid #198754" }}>
              <Card.Body>
                <p className="text-muted small mb-1">Complete Documents</p>
                <h3 className="fw-bold mb-0" style={{ color: "#198754" }}>3</h3>
              </Card.Body>
            </Card>
          </Col>
          <Col md={6} lg={3} className="mb-3">
            <Card style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.1)", borderRadius: "12px", borderLeft: "4px solid #dc3545" }}>
              <Card.Body>
                <p className="text-muted small mb-1">Need Attention</p>
                <h3 className="fw-bold mb-0" style={{ color: "#dc3545" }}>1</h3>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Applications Table */}
        <Row>
          <Col lg={12}>
            <Card style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.1)", borderRadius: "12px" }}>
              <Card.Header style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color: "white", fontWeight: "bold" }}>
                📋 Applications Pending Final Review
              </Card.Header>
              <Card.Body>
                <Table responsive striped hover>
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
                              style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", border: "none" }}
                            >
                              Review & Issue
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
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
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
                      <div style={{ width: "150px", height: "20px", backgroundColor: "#e0e0e0", borderRadius: "10px", overflow: "hidden" }}>
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
                    style={{ backgroundColor: "#f5f5f5" }}
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
                    <option value="Approved">✅ Approve for Degree Issuance</option>
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
            style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", border: "none" }}
          >
            {submitting ? "Processing..." : "Submit & Issue Degree"}
          </Button>
        </Modal.Footer>
      </Modal>
    </ExaminerLayout>
  );
}

