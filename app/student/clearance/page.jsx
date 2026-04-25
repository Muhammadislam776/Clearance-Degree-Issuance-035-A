"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Container, Row, Col, Card, Form, Button, Tab, Tabs, Alert, Badge } from "react-bootstrap";
import StudentLayout from "@/components/layout/StudentLayout";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { submitClearanceRequest } from "@/lib/clearanceService";
import { v4 as uuidv4 } from "uuid";

export default function ClearancePage() {
  const { profile, user } = useAuth();
  const configuredBucket = process.env.NEXT_PUBLIC_SUPABASE_DOCUMENTS_BUCKET || "documents";
  const candidateBuckets = [configuredBucket, "documents", "student-documents", "clearance-documents"];
  const [activeTab, setActiveTab] = useState("apply");
  const [formData, setFormData] = useState({
    reason: "",
    department: "",
  });
  const [studentCardFile, setStudentCardFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [activeRequest, setActiveRequest] = useState(null);
  const [departmentStatuses, setDepartmentStatuses] = useState([]);
  const [progress, setProgress] = useState(0);
  const [isLiveSync, setIsLiveSync] = useState(false);
  const [resolvedStudentId, setResolvedStudentId] = useState(null);

  const studentId = resolvedStudentId || profile?.student_id || profile?.student_profile?.id || null;

  const ensureStudentId = useCallback(async () => {
    const existingId = profile?.student_id || profile?.student_profile?.id || null;
    if (existingId) {
      setResolvedStudentId(existingId);
      return existingId;
    }

    const authUserId = user?.id || profile?.id || null;
    if (!authUserId) return null;

    const { data: existingStudent, error: fetchError } = await supabase
      .from("students")
      .select("id")
      .eq("user_id", authUserId)
      .maybeSingle();

    if (fetchError) {
      console.warn("Could not fetch student record:", fetchError.message || fetchError);
    }

    if (existingStudent?.id) {
      setResolvedStudentId(existingStudent.id);
      return existingStudent.id;
    }

    const fallbackRoll = (profile?.roll_number || `TEMP-${String(authUserId).slice(0, 8).toUpperCase()}`).trim();
    const payload = {
      user_id: authUserId,
      name: profile?.name || user?.user_metadata?.name || "Student",
      email: profile?.email || user?.email || null,
      roll_number: fallbackRoll,
      department: profile?.department_name || profile?.department || "N/A",
      session: "2023-2027",
    };

    const { data: createdStudent, error: createError } = await supabase
      .from("students")
      .insert([payload])
      .select("id")
      .single();

    if (createError) {
      console.warn("Could not auto-create student record:", createError.message || createError);
      return null;
    }

    setResolvedStudentId(createdStudent?.id || null);
    return createdStudent?.id || null;
  }, [profile, user]);

  useEffect(() => {
    ensureStudentId();
  }, [ensureStudentId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleStudentCardChange = (e) => {
    setStudentCardFile(e.target.files?.[0] || null);
  };

  const resolveUploadBucket = useCallback(async () => {
    const tried = [];

    const tryUploadToBucket = async (bucketName, filePath, file) => {
      tried.push(bucketName);
      const { error } = await supabase.storage.from(bucketName).upload(filePath, file, { upsert: false });
      return error;
    };

    const uniqueCandidates = [...new Set(candidateBuckets.filter(Boolean))];

    return {
      uploadWithCandidates: async (filePath, file) => {
        for (const bucket of uniqueCandidates) {
          const error = await tryUploadToBucket(bucket, filePath, file);
          if (!error) return { bucket, error: null };

          const message = String(error?.message || "").toLowerCase();
          if (!message.includes("bucket") && !message.includes("not found")) {
            return { bucket, error };
          }
        }

        const { data: buckets, error: listError } = await supabase.storage.listBuckets();
        if (!listError && Array.isArray(buckets) && buckets.length > 0) {
          const preferred = buckets.find((b) => uniqueCandidates.includes(b.name)) || buckets[0];
          const retryError = await tryUploadToBucket(preferred.name, filePath, file);
          if (!retryError) return { bucket: preferred.name, error: null };
          return { bucket: preferred.name, error: retryError };
        }

        return {
          bucket: uniqueCandidates[0] || configuredBucket,
          error: new Error(
            `No accessible storage bucket found. Tried: ${tried.join(", ")}. Please create a bucket named "${configuredBucket}" in Supabase Storage.`
          ),
        };
      },
    };
  }, [candidateBuckets, configuredBucket]);

  const uploadStudentCardToRequest = useCallback(async (requestId) => {
    if (!studentCardFile) {
      throw new Error("Student card is required. Please upload your student card.");
    }
    if (!requestId || !studentId) {
      throw new Error("Missing request context for student card upload.");
    }

    const fileExt = studentCardFile.name.split(".").pop();
    const fileName = `${studentId}/student-card-${uuidv4()}.${fileExt}`;
    const { uploadWithCandidates } = await resolveUploadBucket();
    const { bucket, error: uploadError } = await uploadWithCandidates(fileName, studentCardFile);
    if (uploadError) throw new Error("Student card upload failed: " + (uploadError.message || String(uploadError)));

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(fileName);

    const { error: dbError } = await supabase.from("documents").insert([
      {
        student_id: studentId,
        request_id: requestId,
        file_url: publicUrl,
        file_type: "student_card",
      },
    ]);

    if (dbError) throw new Error("Student card save failed: " + dbError.message);

    setStudentCardFile(null);
  }, [resolveUploadBucket, studentCardFile, studentId]);

  const loadStatus = useCallback(async () => {
    if (!studentId) return;

    try {
      const { data: requestTable, error: reqError } = await supabase
        .from("clearance_requests")
        .select("id, overall_status, created_at, degree_issued")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (reqError || !requestTable) {
        setActiveRequest(null);
        return;
      }
      setActiveRequest(requestTable);

      const { data: statuses, error: statError } = await supabase
        .from("clearance_status")
        .select("id, department_id, status, remarks, updated_at, departments(name)")
        .eq("request_id", requestTable.id);

      const { data: departments, error: departmentsError } = await supabase
        .from("departments")
        .select("id, name");

      if (!statError && !departmentsError && statuses && departments) {
        const statusByDepartmentId = new Map(statuses.map((s) => [s.department_id, s]));
        const syncedStatuses = departments.map((dept) => {
          const existingStatus = statusByDepartmentId.get(dept.id);
          if (existingStatus) return existingStatus;

          return {
            id: `virtual-${dept.id}`,
            department_id: dept.id,
            status: "pending",
            remarks: null,
            updated_at: requestTable.created_at,
            departments: { name: dept.name },
          };
        });

        setDepartmentStatuses(syncedStatuses);
        const approvedCount = syncedStatuses.filter((s) => s.status === "approved" || s.status === "completed").length;
        setProgress(syncedStatuses.length > 0 ? Math.round((approvedCount / syncedStatuses.length) * 100) : 0);
      } else {
        setDepartmentStatuses([]);
        setProgress(0);
      }
    } catch (err) {
      console.error("Failed to load clearance status:", err);
    }
  }, [studentId]);

  useEffect(() => {
    loadStatus();

    if (studentId) {
      const channel = supabase
        .channel(`student-clearance-${studentId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "clearance_status",
          },
          () => {
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
            if (payload.new.student_id === studentId) {
              loadStatus();
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "departments",
          },
          () => {
            loadStatus();
          }
        )
        .subscribe((status) => {
          setIsLiveSync(status === "SUBSCRIBED");
        });

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [studentId, loadStatus]);

  const handleApplyClearance = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (!profile?.name || !profile?.email || !profile?.roll_number) {
        throw new Error("Your profile is not fully loaded. Please refresh and try again.");
      }

      let effectiveStudentId = studentId;
      if (!effectiveStudentId) {
        effectiveStudentId = await ensureStudentId();
      }

      if (!effectiveStudentId) {
        throw new Error("We couldn't identify your student record. Please refresh your profile or contact support.");
      }

      if (!formData.reason || formData.reason.trim().length < 5) {
        throw new Error("Please provide a detailed reason for clearance (min 5 characters).");
      }

      if (!studentCardFile) {
        throw new Error("Student card is mandatory. Please upload your student card to continue.");
      }

      setMessage({ type: "info", text: "Submitting application to all departments..." });

      const submissionResult = await submitClearanceRequest(
        effectiveStudentId,
        user?.id,
        "final",
        formData.reason
      );

      if (!submissionResult || !submissionResult.success) {
        throw new Error(submissionResult?.error || "The server could not process your request. Please try again.");
      }

      const requestId = submissionResult.data?.id || null;
      let uploadWarning = "";
      try {
        await uploadStudentCardToRequest(requestId);
      } catch (uploadErr) {
        uploadWarning = uploadErr?.message || "Student card upload failed due to storage configuration.";
        console.warn("Student card upload skipped:", uploadWarning);
      }

      setMessage({
        type: uploadWarning ? "warning" : "success",
        text: uploadWarning
          ? `Clearance request submitted, but student card upload failed: ${uploadWarning}`
          : "Clearance request submitted successfully! Departments will now review it.",
      });
      setFormData({ reason: "", department: "" });
      setActiveRequest(submissionResult.data);
      setActiveTab("status");
      setTimeout(() => setMessage(""), 5000);
      loadStatus();
    } catch (error) {
      console.error("Submission Error:", error);
      setMessage({ type: "danger", text: error.message || "Error submitting request. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <StudentLayout>
      <Container fluid style={{ padding: "20px" }}>
        <div
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            padding: "30px",
            borderRadius: "18px",
            marginBottom: "30px",
            color: "white",
            position: "relative",
            boxShadow: "0 18px 40px rgba(76, 81, 191, 0.25)",
          }}
        >
          {isLiveSync && (
            <div
              className="d-flex align-items-center gap-1 bg-white px-2 py-1 rounded-pill shadow-sm"
              style={{ fontSize: "0.65rem", position: "absolute", top: "15px", right: "15px", color: "black" }}
            >
              <span className="live-orb"></span>
              <span className="fw-bold">LIVE SYNC ACTIVE</span>
            </div>
          )}
          <h1 className="fw-bold mb-2">📋 Clearance</h1>
          <p className="mb-0">Submit and track your clearance application</p>
        </div>

        <Row>
          <Col lg={12}>
            <Card style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.1)", borderRadius: "18px", border: "none" }}>
              <Card.Body>
                <Tabs id="clearance-tabs" activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-4">
                  <Tab eventKey="apply" title="📝 Apply for Clearance">
                    {message && (
                      <Alert variant={message.type} dismissible onClose={() => setMessage("")}> 
                        {message.text}
                      </Alert>
                    )}

                    {activeRequest && ["pending", "in_progress", "completed"].includes(activeRequest.overall_status) ? (
                      <div className="py-5 text-center">
                        <div style={{ fontSize: "4rem", marginBottom: "20px" }}>ℹ️</div>
                        <h3 className="fw-bold mb-3">Clearance already applied</h3>
                        <p className="text-muted mx-auto" style={{ maxWidth: "500px", fontSize: "1.1rem" }}>
                          Your current clearance request is <strong>{activeRequest.overall_status === "completed" ? "Approved" : activeRequest.overall_status}</strong>.
                          You cannot submit a new application while a request is active or successfully completed.
                        </p>
                        <Button
                          variant="outline-primary"
                          className="mt-3 px-4 py-2 rounded-pill fw-bold"
                          onClick={() => setActiveTab("status")}
                        >
                          View Active Status
                        </Button>
                      </div>
                    ) : (
                      <Form onSubmit={handleApplyClearance}>
                        <Form.Group className="mb-4">
                          <Form.Label className="fw-bold">Student Name</Form.Label>
                          <Form.Control type="text" value={profile?.name || ""} disabled style={{ backgroundColor: "#f5f5f5" }} />
                        </Form.Group>

                        <Form.Group className="mb-4">
                          <Form.Label className="fw-bold">Email</Form.Label>
                          <Form.Control type="text" value={profile?.email || ""} disabled style={{ backgroundColor: "#f5f5f5" }} />
                        </Form.Group>

                        <Form.Group className="mb-4">
                          <Form.Label className="fw-bold">Registration No.</Form.Label>
                          <Form.Control type="text" value={profile?.roll_number || ""} disabled style={{ backgroundColor: "#f5f5f5" }} />
                        </Form.Group>

                        <Form.Group className="mb-4">
                          <Form.Label className="fw-bold">Department</Form.Label>
                          <Form.Control type="text" value={profile?.department_name || ""} disabled style={{ backgroundColor: "#f5f5f5" }} />
                        </Form.Group>

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

                        <Form.Group className="mb-4">
                          <Form.Label className="fw-bold">Student Card (required)</Form.Label>
                          <Form.Control type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={handleStudentCardChange} required />
                          {studentCardFile && (
                            <div className="mt-2 text-muted">
                              Selected: <strong>{studentCardFile.name}</strong>
                            </div>
                          )}
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
                    )}
                  </Tab>

                  <Tab eventKey="status" title="📊 Application Status">
                    {activeRequest ? (
                      <>
                        <Row className="mb-4 text-center">
                          <Col lg={12}>
                            <h4 className="fw-bold mb-3">Overall Completion Progress</h4>
                            <div className="progress" style={{ height: "30px", borderRadius: "15px" }}>
                              <div
                                className={`progress-bar progress-bar-striped progress-bar-animated ${progress === 100 ? "bg-success" : "bg-primary"}`}
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
                            <p><strong>Status:</strong> <Badge bg={activeRequest.overall_status === "completed" ? "success" : "warning"}>{activeRequest.overall_status}</Badge></p>
                            <p><strong>Submitted Date:</strong> {new Date(activeRequest.created_at).toLocaleString()}</p>
                            <p><strong>Degree Issued:</strong> {activeRequest.degree_issued ? "✅ Yes" : "❌ No"}</p>
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
                                departmentStatuses.map((status) => (
                                  <tr key={status.id}>
                                    <td className="fw-bold">{status.departments?.name || "Unknown"}</td>
                                    <td>
                                      <Badge bg={status.status === "approved" ? "success" : status.status === "rejected" ? "danger" : "secondary"}>
                                        {status.status}
                                      </Badge>
                                    </td>
                                    <td className="text-muted">{status.remarks || "-"}</td>
                                    <td>{new Date(status.updated_at).toLocaleDateString()}</td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan="4" className="text-center">No department status tracked yet. Wait for system initialization.</td>
                                </tr>
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
