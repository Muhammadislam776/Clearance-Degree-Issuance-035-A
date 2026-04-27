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

  const requestStatus = String(activeRequest?.overall_status || "pending").toLowerCase();
  const isDegreeIssued = !!activeRequest?.degree_issued;
  const normalizedRequestStatus = requestStatus === "completed" && !isDegreeIssued ? "in_progress" : requestStatus;
  const displayProgress = isDegreeIssued ? progress : Math.min(progress, 90);
  const statusVariant = normalizedRequestStatus === "completed" ? "success" : normalizedRequestStatus === "rejected" ? "danger" : "warning";

  return (
    <StudentLayout>
      <Container
        fluid
        style={{
          padding: "20px",
          minHeight: "calc(100vh - 80px)",
          background:
            "radial-gradient(1100px 460px at 12% -8%, rgba(37,99,235,0.22), rgba(37,99,235,0) 58%), radial-gradient(900px 420px at 90% 8%, rgba(139,92,246,0.2), rgba(139,92,246,0) 56%), linear-gradient(180deg, #0b1220 0%, #111827 100%)",
        }}
      >
        <div
          className="apply-hero"
          style={{
            background: "linear-gradient(135deg, rgba(37,99,235,0.96) 0%, rgba(124,58,237,0.96) 100%)",
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
            <Card className="apply-shell" style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.1)", borderRadius: "18px", border: "none" }}>
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
                          Your current clearance request is <strong>{normalizedRequestStatus.replace("_", " ")}</strong>.
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
                      <Form onSubmit={handleApplyClearance} className="apply-form">
                        <Form.Group className="mb-4">
                          <Form.Label className="fw-bold apply-form-label">Student Name</Form.Label>
                          <Form.Control type="text" value={profile?.name || ""} disabled className="apply-control" />
                        </Form.Group>

                        <Form.Group className="mb-4">
                          <Form.Label className="fw-bold apply-form-label">Email</Form.Label>
                          <Form.Control type="text" value={profile?.email || ""} disabled className="apply-control" />
                        </Form.Group>

                        <Form.Group className="mb-4">
                          <Form.Label className="fw-bold apply-form-label">Registration No.</Form.Label>
                          <Form.Control type="text" value={profile?.roll_number || ""} disabled className="apply-control" />
                        </Form.Group>

                        <Form.Group className="mb-4">
                          <Form.Label className="fw-bold apply-form-label">Department</Form.Label>
                          <Form.Control type="text" value={profile?.department_name || ""} disabled className="apply-control" />
                        </Form.Group>

                        <Form.Group className="mb-4">
                          <Form.Label className="fw-bold apply-form-label">Reason for Clearance</Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={4}
                            name="reason"
                            value={formData.reason}
                            onChange={handleInputChange}
                            placeholder="Explain why you need clearance..."
                            required
                            className="apply-control apply-textarea"
                          />
                        </Form.Group>

                        <Form.Group className="mb-4">
                          <Form.Label className="fw-bold apply-form-label">Student Card (required)</Form.Label>
                          <div className="apply-upload-box">
                            <Form.Control
                              id="student-card-input"
                              type="file"
                              accept=".jpg,.jpeg,.png,.pdf"
                              onChange={handleStudentCardChange}
                              required
                              className="d-none"
                            />

                            <div className="d-flex flex-wrap align-items-center gap-2">
                              <label
                                htmlFor="student-card-input"
                                className="mb-0"
                                style={{ cursor: "pointer" }}
                              >
                                <span className="apply-choose-btn d-inline-flex align-items-center fw-bold">
                                  Choose File
                                </span>
                              </label>

                              <span className="apply-file-pill">
                                {studentCardFile ? studentCardFile.name : "No file selected"}
                              </span>
                            </div>

                            <div className="mt-2 apply-upload-note">
                              Accepted formats: JPG, PNG, PDF
                            </div>
                          </div>
                        </Form.Group>

                        <Button
                          variant="primary"
                          type="submit"
                          disabled={loading}
                          className="apply-submit-btn"
                        >
                          {loading ? "Submitting..." : "Submit Application"}
                        </Button>
                      </Form>
                    )}
                  </Tab>

                  <Tab eventKey="status" title="📊 Application Status">
                    {activeRequest ? (
                      <>
                        <div className="clearance-progress-wrap mb-4">
                          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
                            <div>
                              <h4 className="fw-bold mb-1">Overall Completion Progress</h4>
                              <p className="text-muted mb-0">Live completion based on department review updates.</p>
                            </div>
                            <Badge className="progress-badge rounded-pill px-3 py-2">{displayProgress}% Complete</Badge>
                          </div>

                          <div className="clearance-progress-track" role="progressbar" aria-valuenow={displayProgress} aria-valuemin="0" aria-valuemax="100">
                            <div className="clearance-progress-fill" style={{ width: `${displayProgress}%` }} />
                          </div>

                          <div className="d-flex justify-content-between mt-2 small text-muted">
                            <span>Started</span>
                            <span>In Review</span>
                            <span>{isDegreeIssued ? "Completed" : "Degree Issuance"}</span>
                          </div>

                          {isDegreeIssued ? (
                            <h5 className="text-success mt-3 fw-bold mb-0">Degree Issued Successfully! 🎉</h5>
                          ) : (
                            progress === 100 && <h5 className="text-primary mt-3 fw-bold mb-0">All departments approved. Examiner and academic issuance are pending.</h5>
                          )}
                        </div>

                        <Card className="mb-4 app-details-card">
                          <Card.Header className="app-details-head">
                            <div className="d-flex align-items-center gap-2 fw-bold">
                              <span style={{ fontSize: "1.1rem" }}>📋</span>
                              <span>Application Details</span>
                            </div>
                            <Badge bg={statusVariant} className="text-capitalize rounded-pill px-3 py-2">
                              {normalizedRequestStatus.replace("_", " ")}
                            </Badge>
                          </Card.Header>
                          <Card.Body>
                            <div className="app-details-grid">
                              <div className="app-detail-item">
                                <div className="app-detail-label">Application ID</div>
                                <div className="app-detail-value app-detail-mono">{activeRequest.id}</div>
                              </div>
                              <div className="app-detail-item">
                                <div className="app-detail-label">Submitted Date</div>
                                <div className="app-detail-value">{new Date(activeRequest.created_at).toLocaleString()}</div>
                              </div>
                              <div className="app-detail-item">
                                <div className="app-detail-label">Current Status</div>
                                <div className="app-detail-value text-capitalize">{normalizedRequestStatus.replace("_", " ")}</div>
                              </div>
                              <div className="app-detail-item">
                                <div className="app-detail-label">Degree Issued</div>
                                <div className="app-detail-value">{activeRequest.degree_issued ? "✅ Yes" : "❌ No"}</div>
                              </div>
                            </div>
                          </Card.Body>
                        </Card>

                        <h5 className="fw-bold mb-3 dept-reviews-title">Department Reviews</h5>
                        <div className="table-responsive dept-reviews-wrap">
                          <table className="table table-hover dept-reviews-table mb-0">
                            <thead>
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
                                    <td className="dept-remarks">{status.remarks || "-"}</td>
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

        <style jsx>{`
          @keyframes cardFloatIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .clearance-progress-wrap {
            background: linear-gradient(180deg, rgba(30, 41, 59, 0.92) 0%, rgba(15, 23, 42, 0.92) 100%);
            border: 1px solid rgba(148, 163, 184, 0.25);
            border-radius: 16px;
            padding: 1rem;
            box-shadow: 0 14px 28px rgba(15, 23, 42, 0.32);
            backdrop-filter: blur(6px);
            transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
            animation: cardFloatIn 0.45s ease-out;
          }

          .clearance-progress-wrap:hover {
            transform: translateY(-4px);
            box-shadow: 0 20px 38px rgba(15, 23, 42, 0.42);
            border-color: rgba(96, 165, 250, 0.45);
          }

          .clearance-progress-wrap h4 {
            color: #f8fafc;
          }

          .clearance-progress-wrap .text-muted {
            color: #cbd5e1 !important;
          }

          .progress-badge {
            background: linear-gradient(135deg, #2563eb 0%, #6366f1 100%);
            color: #fff;
            font-weight: 700;
            border: none;
          }

          .clearance-progress-track {
            height: 14px;
            border-radius: 999px;
            background: rgba(148, 163, 184, 0.3);
            overflow: hidden;
          }

          .clearance-progress-fill {
            height: 100%;
            border-radius: 999px;
            background: linear-gradient(90deg, #0ea5e9 0%, #2563eb 45%, #6366f1 100%);
            box-shadow: 0 0 14px rgba(37, 99, 235, 0.35);
            transition: width 0.45s ease;
          }

          .app-details-card {
            border: 1px solid rgba(148, 163, 184, 0.24);
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 14px 28px rgba(15, 23, 42, 0.3);
            background: rgba(15, 23, 42, 0.8);
          }

          .app-details-head {
            background: linear-gradient(90deg, rgba(15, 23, 42, 0.88) 0%, rgba(30, 41, 59, 0.88) 100%);
            border-bottom: 1px solid rgba(148, 163, 184, 0.24);
            padding: 0.85rem 1rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 0.6rem;
            color: #f8fafc;
          }

          .app-details-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 0.75rem;
          }

          .app-detail-item {
            border: 1px solid rgba(148, 163, 184, 0.22);
            border-radius: 12px;
            padding: 0.75rem 0.85rem;
            background: linear-gradient(180deg, rgba(30, 41, 59, 0.84) 0%, rgba(15, 23, 42, 0.84) 100%);
            box-shadow: 0 10px 22px rgba(15, 23, 42, 0.24);
            transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;
          }

          .app-detail-item:hover {
            transform: translateY(-3px);
            border-color: rgba(96, 165, 250, 0.45);
            box-shadow: 0 14px 26px rgba(15, 23, 42, 0.36);
          }

          .app-detail-label {
            font-size: 0.78rem;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: #93c5fd;
            font-weight: 700;
            margin-bottom: 0.2rem;
          }

          .app-detail-value {
            color: #f8fafc;
            font-weight: 700;
          }

          .app-detail-mono {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
            word-break: break-word;
            font-size: 0.92rem;
          }

          .dept-reviews-title {
            color: #f8fafc;
          }

          .dept-reviews-wrap {
            border: 1px solid rgba(148, 163, 184, 0.24);
            border-radius: 14px;
            overflow: hidden;
            background: linear-gradient(180deg, rgba(30, 41, 59, 0.84) 0%, rgba(15, 23, 42, 0.84) 100%);
            box-shadow: 0 14px 28px rgba(15, 23, 42, 0.3);
            animation: cardFloatIn 0.45s ease-out;
          }

          .dept-reviews-table {
            color: #e2e8f0;
          }

          .dept-reviews-table thead th {
            background: linear-gradient(90deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%);
            color: #93c5fd;
            border-bottom: 1px solid rgba(148, 163, 184, 0.25);
            font-weight: 700;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            font-size: 0.78rem;
          }

          .dept-reviews-table tbody td {
            background: transparent;
            color: #e2e8f0;
            border-color: rgba(148, 163, 184, 0.15);
            transition: background-color 0.2s ease;
          }

          .dept-reviews-table tbody tr:hover td {
            background: rgba(59, 130, 246, 0.1);
          }

          .dept-remarks {
            color: #cbd5e1 !important;
          }

          .apply-hero {
            animation: cardFloatIn 0.45s ease-out;
          }

          .apply-shell {
            background: rgba(15, 23, 42, 0.74);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(148, 163, 184, 0.18) !important;
            box-shadow: 0 16px 32px rgba(15, 23, 42, 0.28) !important;
          }

          .apply-shell .card-body {
            color: #e2e8f0;
          }

          .apply-form-label {
            color: #e2e8f0;
          }

          .apply-control {
            background: rgba(15, 23, 42, 0.9) !important;
            border: 1px solid rgba(148, 163, 184, 0.22) !important;
            color: #f8fafc !important;
            box-shadow: none !important;
          }

          .apply-control:disabled {
            color: #e2e8f0 !important;
            opacity: 0.88;
          }

          .apply-control::placeholder {
            color: #94a3b8;
          }

          .apply-control:focus {
            border-color: rgba(96, 165, 250, 0.55) !important;
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.16) !important;
          }

          .apply-textarea {
            min-height: 130px;
          }

          .apply-upload-box {
            border: 1px solid rgba(148, 163, 184, 0.2);
            border-radius: 14px;
            padding: 12px;
            background: linear-gradient(180deg, rgba(30, 41, 59, 0.86) 0%, rgba(15, 23, 42, 0.86) 100%);
            box-shadow: 0 12px 24px rgba(15, 23, 42, 0.22);
          }

          .apply-choose-btn {
            background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
            color: #fff;
            border-radius: 10px;
            padding: 9px 14px;
            box-shadow: 0 10px 18px rgba(37,99,235,0.24);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
          }

          .apply-choose-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 14px 22px rgba(37,99,235,0.3);
          }

          .apply-file-pill {
            color: #e2e8f0;
            font-weight: 600;
            background: rgba(15, 23, 42, 0.9);
            border: 1px solid rgba(148, 163, 184, 0.16);
            border-radius: 10px;
            padding: 8px 12px;
            min-width: 220px;
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .apply-upload-note {
            color: #94a3b8;
            font-size: 0.85rem;
          }

          .apply-submit-btn {
            background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%) !important;
            border: none !important;
            color: #fff !important;
            padding: 0.9rem 1.2rem;
            border-radius: 14px;
            font-weight: 800;
            box-shadow: 0 14px 26px rgba(37,99,235,0.24);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
          }

          .apply-submit-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 18px 30px rgba(37,99,235,0.3);
          }

          .apply-submit-btn:disabled {
            opacity: 0.8;
          }

          .apply-panel .text-muted,
          .apply-panel p,
          .apply-shell .text-muted,
          .apply-shell p {
            color: #cbd5e1;
          }

          .apply-shell .btn-light {
            background: rgba(248,250,252,0.92);
            color: #0f172a;
          }

          .apply-shell .btn-outline-primary {
            border-color: rgba(96,165,250,0.35);
            color: #bfdbfe;
            background: rgba(15,23,42,0.68);
          }

          .apply-shell .btn-outline-primary:hover {
            background: rgba(37,99,235,0.14);
            color: #fff;
          }

          .apply-shell .btn-primary {
            background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
            border: none;
          }

          .apply-shell .text-dark {
            color: #f8fafc !important;
          }

          .apply-shell .bg-white,
          .apply-shell .bg-light {
            background: rgba(15, 23, 42, 0.72) !important;
          }

          .apply-shell .form-control:disabled {
            background: rgba(15, 23, 42, 0.9) !important;
          }

          .apply-shell .form-control,
          .apply-shell textarea.form-control {
            background: rgba(15, 23, 42, 0.9) !important;
            border-color: rgba(148, 163, 184, 0.22) !important;
            color: #f8fafc !important;
          }

          .apply-shell .form-control::placeholder,
          .apply-shell textarea.form-control::placeholder {
            color: #94a3b8;
          }

          .apply-shell .form-control:focus,
          .apply-shell textarea.form-control:focus {
            border-color: rgba(96, 165, 250, 0.55) !important;
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.16) !important;
          }

          .apply-shell .rounded-pill.fw-bold {
            box-shadow: 0 12px 22px rgba(37,99,235,0.24);
          }

          .apply-shell .card {
            background: rgba(15, 23, 42, 0.74);
          }

          #clearance-tabs.nav-tabs {
            border-bottom: 1px solid rgba(148, 163, 184, 0.3);
            gap: 0.45rem;
          }

          #clearance-tabs .nav-link {
            color: #cbd5e1;
            background: linear-gradient(180deg, rgba(30, 41, 59, 0.75) 0%, rgba(15, 23, 42, 0.75) 100%);
            border: 1px solid rgba(148, 163, 184, 0.26);
            border-bottom-color: transparent;
            border-radius: 12px 12px 0 0;
            font-weight: 700;
            letter-spacing: 0.01em;
            transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, color 0.2s ease;
          }

          #clearance-tabs .nav-link:hover {
            color: #f8fafc;
            transform: translateY(-2px);
            border-color: rgba(96, 165, 250, 0.5);
            box-shadow: 0 10px 20px rgba(15, 23, 42, 0.35);
          }

          #clearance-tabs .nav-link.active {
            color: #f8fafc;
            background: linear-gradient(135deg, rgba(37, 99, 235, 0.25) 0%, rgba(99, 102, 241, 0.25) 100%),
              linear-gradient(180deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 41, 59, 0.92) 100%);
            border-color: rgba(96, 165, 250, 0.58);
            border-bottom-color: rgba(15, 23, 42, 0.92);
            box-shadow: 0 14px 26px rgba(37, 99, 235, 0.22);
          }
        `}</style>
      </Container>
    </StudentLayout>
  );
}