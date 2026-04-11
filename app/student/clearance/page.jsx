"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Container, Row, Col, Card, Form, Button, Tab, Tabs, Alert, Badge } from "react-bootstrap";
import StudentLayout from "@/components/layout/StudentLayout";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { submitClearanceRequest } from "@/lib/clearanceService";
import { v4 as uuidv4 } from "uuid";

export default function ClearancePage() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState("apply");
  const [formData, setFormData] = useState({
    reason: "",
    department: "",
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const [activeRequest, setActiveRequest] = useState(null);
  const [departmentStatuses, setDepartmentStatuses] = useState([]);
  const [progress, setProgress] = useState(0);
  const [isLiveSync, setIsLiveSync] = useState(false);

  // Fetch student's current clearance status and progress
  const loadStatus = useCallback(async () => {
    if (!profile?.student_profile?.id) return;
    
    try {
      // Fetch the newest active application
      const { data: requestTable, error: reqError } = await supabase
        .from("clearance_requests")
        .select("id, overall_status, created_at, degree_issued")
        .eq("student_id", profile.student_profile.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
        
      if (reqError || !requestTable) return;
      setActiveRequest(requestTable);

      // Fetch department statuses linked to this request
      const { data: statuses, error: statError } = await supabase
        .from("clearance_status")
        .select("id, status, remarks, updated_at, departments(name)")
        .eq("request_id", requestTable.id);

      if (!statError && statuses) {
        setDepartmentStatuses(statuses);
        const approvedCount = statuses.filter(s => s.status === 'approved').length;
        setProgress(statuses.length > 0 ? Math.round((approvedCount / statuses.length) * 100) : 0);
      }
    } catch (err) {
      console.error("Failed to load clearance status:", err);
    }
  }, [profile?.student_profile?.id]);

  useEffect(() => {
    loadStatus();

    // REAL-TIME: Listen for departmental approvals or overall status changes
    if (profile?.student_profile?.id) {
      const channel = supabase
        .channel(`student-clearance-${profile.student_profile.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "clearance_status",
          },
          () => {
            console.log("Department update detected - syncing...");
            loadStatus();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "clearance_requests",
          },
          (payload) => {
            if (payload.new.student_id === profile.student_profile.id) {
              console.log("Overall status updated!");
              loadStatus();
            }
          }
        )
        .subscribe((status) => {
          setIsLiveSync(status === 'SUBSCRIBED');
        });

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [profile?.student_profile?.id, loadStatus]);

  const handleApplyClearance = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (!profile?.student_profile?.id) throw new Error("Student profile not found. Please relogin.");
      
      // Check if there's already an active request
      if (activeRequest && activeRequest.overall_status !== 'completed') {
        throw new Error("You already have an active clearance request in progress.");
      }

      const result = await submitClearanceRequest(
        profile.student_profile.id,
        "final", 
        formData.reason
      );

      if (!result.success) throw new Error(result.error);
      
      setMessage({ type: "success", text: "Clearance request submitted successfully! Departments will now review it." });
      setFormData({ reason: "", department: "" });
      setActiveRequest(result.data);
      setActiveTab("status"); 
      setTimeout(() => setMessage(""), 5000);
      loadStatus(); // Refresh immediately
    } catch (error) {
      console.error("Submission Error:", error);
      setMessage({ type: "danger", text: error.message || "Error submitting request. Please try again." });
    } finally {
      setLoading(false);
    }
  };



  const handleUploadDocument = async (e) => {
    e.preventDefault();
    if (!file) {
      setMessage({ type: "warning", text: "Please select a file to upload." });
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      if (!profile?.student_profile?.id) throw new Error("Student profile error.");

      // 1. Upload to Supabase Storage bucket ('documents' bucket)
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.student_profile.id}/${uuidv4()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("documents")
        .upload(fileName, file);

      if (uploadError) throw new Error("Storage upload failed: " + uploadError.message);

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from("documents")
        .getPublicUrl(fileName);

      // 3. Save reference in documents table
      const { error: dbError } = await supabase
        .from("documents")
        .insert([{
          student_id: profile.student_profile.id,
          file_url: publicUrl,
          file_type: fileExt
        }]);

      if (dbError) throw dbError;

      setMessage({ type: "success", text: "Document uploaded successfully!" });
      setFile(null);
      setTimeout(() => setMessage(""), 5000);
    } catch (error) {
      setMessage({ type: "danger", text: error.message || "Error uploading document." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <StudentLayout>
      <Container fluid style={{ padding: "20px" }}>
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", padding: "30px", borderRadius: "12px", marginBottom: "30px", color: "white", position: "relative" }}>
          {isLiveSync && (
            <div className="d-flex align-items-center gap-1 bg-white px-2 py-1 rounded-pill shadow-sm" style={{ fontSize: "0.65rem", position: "absolute", top: "15px", right: "15px", color: "black" }}>
              <span className="live-orb"></span>
              <span className="fw-bold">LIVE SYNC ACTIVE</span>
            </div>
          )}
          <h1 className="fw-bold mb-2">📋 Clearance & Documents</h1>
          <p>Manage your clearance applications and upload supporting documents</p>
        </div>

        {/* Tabs */}
        <Row>
          <Col lg={12}>
            <Card style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.1)", borderRadius: "12px" }}>
              <Card.Body>
                <Tabs id="clearance-tabs" activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-4">
                  {/* Apply for Clearance Tab */}
                  <Tab eventKey="apply" title="📝 Apply for Clearance">
                    {message && (
                      <Alert variant={message.type} dismissible onClose={() => setMessage("")}>
                        {message.text}
                      </Alert>
                    )}

                    <Form onSubmit={handleApplyClearance}>
                      <Form.Group className="mb-4">
                        <Form.Label className="fw-bold">Student Name</Form.Label>
                        <Form.Control
                          type="text"
                          value={profile?.name || ""}
                          disabled
                          style={{ backgroundColor: "#f5f5f5" }}
                        />
                      </Form.Group>

                      <Form.Group className="mb-4">
                        <Form.Label className="fw-bold">Roll Number</Form.Label>
                        <Form.Control
                          type="text"
                          value={profile?.roll_number || ""}
                          disabled
                          style={{ backgroundColor: "#f5f5f5" }}
                        />
                      </Form.Group>

                      {/* Department dropdown removed since request applies to all implicitly via DB Trigger */}

                      <Form.Group className="mb-4">
                        <Form.Label className="fw-bold">Reason for Clearance</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={4}
                          name="reason"
                          value={formData.reason}
                          onChange={handleInputChange}
                          placeholder="Explain why you need clearance..."
                          required
                        />
                      </Form.Group>

                      <Button
                        variant="primary"
                        type="submit"
                        disabled={loading}
                        style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", border: "none" }}
                      >
                        {loading ? "Submitting..." : "Submit Application"}
                      </Button>
                    </Form>
                  </Tab>

                  {/* Upload Documents Tab */}
                  <Tab eventKey="upload" title="📤 Upload Documents">
                    {message && (
                      <Alert variant={message.type} dismissible onClose={() => setMessage("")}>
                        {message.text}
                      </Alert>
                    )}

                    <Form onSubmit={handleUploadDocument}>
                      <Form.Group className="mb-4">
                        <Form.Label className="fw-bold">Select Document Type</Form.Label>
                        <Form.Select required>
                          <option value="">Choose document type...</option>
                          <option value="transcript">Transcript</option>
                          <option value="certificate">Certificate</option>
                          <option value="id">ID Proof</option>
                          <option value="other">Other</option>
                        </Form.Select>
                      </Form.Group>

                      <Form.Group className="mb-4">
                        <Form.Label className="fw-bold">Upload File</Form.Label>
                        <div style={{
                          border: "2px dashed #667eea",
                          borderRadius: "8px",
                          padding: "30px",
                          textAlign: "center",
                          backgroundColor: "#f8f9ff",
                          cursor: "pointer",
                        }}>
                          <Form.Control
                            type="file"
                            accept=".pdf,.doc,.docx,.jpg,.png"
                            onChange={handleFileChange}
                            style={{ display: "none" }}
                            id="file-input"
                          />
                          <label htmlFor="file-input" style={{ cursor: "pointer", marginBottom: "0" }}>
                            <div style={{ fontSize: "2rem", marginBottom: "10px" }}>📎</div>
                            <p className="mb-2">Click to upload or drag and drop</p>
                            <small className="text-muted">PDF, DOC, DOCX, JPG, PNG (max 5MB)</small>
                          </label>
                          {file && <p className="mt-3 text-success fw-bold">✓ {file.name}</p>}
                        </div>
                      </Form.Group>

                      <Button
                        variant="success"
                        type="submit"
                        disabled={loading || !file}
                        className="w-100 fw-bold"
                      >
                        {loading ? "Uploading..." : "Upload Document"}
                      </Button>
                    </Form>
                  </Tab>

                  {/* Status Tab */}
                  <Tab eventKey="status" title="📊 Application Status">
                    {activeRequest ? (
                      <>
                        <Row className="mb-4 text-center">
                          <Col lg={12}>
                            <h4 className="fw-bold mb-3">Overall Completion Progress</h4>
                            <div className="progress" style={{ height: "30px", borderRadius: "15px" }}>
                              <div 
                                className={`progress-bar progress-bar-striped progress-bar-animated ${progress === 100 ? 'bg-success' : 'bg-primary'}`} 
                                role="progressbar" 
                                style={{ width: `${progress}%` }}
                                aria-valuenow={progress} 
                                aria-valuemin="0" 
                                aria-valuemax="100"
                              >
                                {progress}% Completeness
                              </div>
                            </div>
                            {progress === 100 && <h5 className="text-success mt-2 fw-bold">Ready for Degree Issuance! 🎉</h5>}
                          </Col>
                        </Row>

                        <Card className="mb-4">
                          <Card.Header className="bg-light fw-bold">📋 Application Details</Card.Header>
                          <Card.Body>
                            <p><strong>Application ID:</strong> {activeRequest.id}</p>
                            <p><strong>Status:</strong> <Badge bg={activeRequest.overall_status === 'completed' ? 'success' : 'warning'}>{activeRequest.overall_status}</Badge></p>
                            <p><strong>Submitted Date:</strong> {new Date(activeRequest.created_at).toLocaleString()}</p>
                            <p><strong>Degree Issued:</strong> {activeRequest.degree_issued ? '✅ Yes' : '❌ No'}</p>
                          </Card.Body>
                        </Card>

                        <h5 className="fw-bold mb-3">Department Reviews</h5>
                        <div className="table-responsive">
                          <table className="table table-hover">
                            <thead className="table-light">
                              <tr>
                                <th>Department</th>
                                <th>Status</th>
                                <th>Remarks</th>
                                <th>Last Updated</th>
                              </tr>
                            </thead>
                            <tbody>
                              {departmentStatuses.length > 0 ? (
                                departmentStatuses.map(status => (
                                  <tr key={status.id}>
                                    <td className="fw-bold">{status.departments?.name || "Unknown"}</td>
                                    <td>
                                      <Badge bg={status.status === 'approved' ? 'success' : status.status === 'rejected' ? 'danger' : 'secondary'}>
                                        {status.status}
                                      </Badge>
                                    </td>
                                    <td className="text-muted">{status.remarks || "-"}</td>
                                    <td>{new Date(status.updated_at).toLocaleDateString()}</td>
                                  </tr>
                                ))
                              ) : (
                                <tr><td colSpan="4" className="text-center">No department status tracked yet. Wait for system initialization.</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-5 text-muted">
                        <h4>No Active Clearance Request Found</h4>
                        <p>Submit an application from the 'Apply for Clearance' tab.</p>
                      </div>
                    )}
                  </Tab>
                </Tabs>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </StudentLayout>
  );
}