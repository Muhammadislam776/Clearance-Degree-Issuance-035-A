"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Container, Row, Col, Card, Form, Button, Tab, Tabs, Alert, Badge } from "react-bootstrap";
import StudentLayout from "@/components/layout/StudentLayout";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { submitClearanceRequest } from "@/lib/clearanceService";
import {
  formatDepartmentFormForNotes,
  getDepartmentClearanceForm,
  getDepartmentFormInitialValues,
} from "@/lib/departmentClearanceForms";
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
  const [departmentFormValues, setDepartmentFormValues] = useState({});

  const studentId = resolvedStudentId || profile?.student_id || profile?.student_profile?.id || null;
  const studentDepartment = profile?.department_name || profile?.student_profile?.department || profile?.department || "";
  const departmentFormDefinition = getDepartmentClearanceForm(studentDepartment);

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

  useEffect(() => {
    setDepartmentFormValues(getDepartmentFormInitialValues(departmentFormDefinition));
  }, [departmentFormDefinition.id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleStudentCardChange = (e) => {
    setStudentCardFile(e.target.files?.[0] || null);
  };

  const handleDepartmentFieldChange = (fieldKey, value) => {
    setDepartmentFormValues((prev) => ({
      ...prev,
      [fieldKey]: value,
    }));
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

      const requiredDepartmentField = (departmentFormDefinition.fields || []).find(
        (field) => field.required && !String(departmentFormValues?.[field.key] || "").trim()
      );
      if (requiredDepartmentField) {
        throw new Error(`Please complete '${requiredDepartmentField.label}' for your department form.`);
      }

      const departmentFormNotes = formatDepartmentFormForNotes(departmentFormDefinition, departmentFormValues);
      const combinedNotes = [
        `Reason: ${formData.reason.trim()}`,
        departmentFormNotes,
      ]
        .filter(Boolean)
        .join("\n\n");

      setMessage({ type: "info", text: "Submitting application to all departments..." });

      const submissionResult = await submitClearanceRequest(
        effectiveStudentId,
        user?.id,
        "final",
        combinedNotes
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
        type: submissionResult?.reused ? "info" : uploadWarning ? "warning" : "success",
        text: uploadWarning
          ? `Clearance request submitted, but student card upload failed: ${uploadWarning}`
          : submissionResult?.reused
            ? `An active request already exists (ID: ${submissionResult?.data?.id || "N/A"}). A new record was not created.`
            : `Clearance request submitted successfully (ID: ${submissionResult?.data?.id || "N/A"}). Departments will now review it.`,
      });
      setFormData({ reason: "", department: "" });
      setDepartmentFormValues(getDepartmentFormInitialValues(departmentFormDefinition));
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
            padding: "40px",
            borderRadius: "24px",
            marginBottom: "35px",
            color: "white",
            position: "relative",
            boxShadow: "0 22px 50px rgba(37, 99, 235, 0.35)",
            border: "1px solid rgba(255,255,255,0.15)",
            overflow: "hidden"
          }}
        >
          <div className="hero-glow" style={{ position: "absolute", top: "-50%", right: "-20%", width: "400px", height: "400px", background: "radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)", pointerEvents: "none" }} />
          
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 position-relative" style={{ zIndex: 1 }}>
            <div>
              <div className="d-inline-flex align-items-center gap-2 bg-white bg-opacity-10 px-3 py-1 rounded-pill mb-3 border border-white border-opacity-20" style={{ backdropFilter: "blur(4px)" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: "800", letterSpacing: "0.05em" }}>STUDENT PORTAL</span>
              </div>
              <h1 className="fw-black mb-2" style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 900 }}>Clearance Dashboard</h1>
              <p className="fs-5 opacity-90 mb-0">Official degree issuance and departmental clearance management</p>
            </div>

            {isLiveSync && (
              <div
                className="d-flex align-items-center gap-2 bg-black bg-opacity-40 px-3 py-2 rounded-pill border border-white border-opacity-10"
                style={{ fontSize: "0.75rem", backdropFilter: "blur(8px)" }}
              >
                <span className="live-orb" style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 10px #10b981", animation: "pulse 2s infinite" }}></span>
                <span className="fw-bold tracking-wider">LIVE SYNC ACTIVE</span>
              </div>
            )}
          </div>
        </div>

        {!activeRequest && activeTab !== "apply" && (
           <Card className="mb-4 border-0 shadow-lg welcome-card" style={{ background: "linear-gradient(135deg, rgba(30,41,59,0.9) 0%, rgba(15,23,42,0.9) 100%)", borderRadius: "20px", border: "1px solid rgba(148,163,184,0.15)" }}>
             <Card.Body className="p-4 p-md-5 text-center">
               <div className="mb-4 d-inline-flex align-items-center justify-content-center bg-primary bg-opacity-10 rounded-circle" style={{ width: 80, height: 80 }}>
                 <span style={{ fontSize: "2.5rem" }}>🚀</span>
               </div>
               <h2 className="fw-bold text-white mb-3">Ready to start your clearance?</h2>
               <p className="text-muted mx-auto mb-4" style={{ maxWidth: "600px" }}>
                 Submit your application to all university departments simultaneously. Track real-time progress and get notified as soon as you're cleared for degree issuance.
               </p>
               <Button 
                 variant="primary" 
                 size="lg" 
                 className="rounded-pill px-5 fw-bold shadow-lg"
                 style={{ background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)", border: "none" }}
                 onClick={() => setActiveTab("apply")}
               >
                 Apply for Clearance Now
               </Button>
             </Card.Body>
           </Card>
        )}

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
                        <div style={{ fontSize: "5rem", marginBottom: "24px", animation: "bounce 2s infinite" }}>⏳</div>
                        <h2 className="fw-bold text-white mb-3">Application in Progress</h2>
                        <p className="text-muted mx-auto mb-4" style={{ maxWidth: "550px", fontSize: "1.1rem" }}>
                          You have an active clearance request (ID: <span className="text-primary fw-mono">{activeRequest.id.substring(0,8)}...</span>) being reviewed by departments.
                        </p>
                        <div className="d-flex justify-content-center gap-3">
                          <Button
                            variant="primary"
                            className="px-4 py-2 rounded-pill fw-bold shadow-sm"
                            style={{ background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)", border: "none" }}
                            onClick={() => setActiveTab("status")}
                          >
                            Track Live Status
                          </Button>
                          <Button
                            variant="outline-light"
                            className="px-4 py-2 rounded-pill fw-bold"
                            style={{ borderColor: "rgba(255,255,255,0.2)" }}
                            onClick={() => window.location.reload()}
                          >
                            Refresh View
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Form onSubmit={handleApplyClearance} className="apply-form px-1">
                        <div className="form-intro-banner mb-5">
                          <div className="d-flex align-items-center gap-3">
                             <div className="bg-primary bg-opacity-20 p-3 rounded-4 shadow-sm">
                               <span style={{ fontSize: "1.5rem" }}>📄</span>
                             </div>
                             <div>
                                <div className="form-intro-title fs-4">Official Submission Form</div>
                                <p className="mb-0 form-intro-subtitle opacity-75">
                                  Complete the details below to initiate university-wide clearance review.
                                </p>
                             </div>
                          </div>
                        </div>

                        <div className="form-section-card mb-4 p-4">
                          <div className="section-kicker d-flex align-items-center gap-2 mb-4">
                            <span className="bg-primary rounded-circle" style={{ width: 8, height: 8 }}></span>
                            Personal & Academic Record
                          </div>
                          <Row className="g-4">
                            {[
                              { label: "Full Name", value: profile?.name, icon: "👤" },
                              { label: "Email Address", value: profile?.email, icon: "📧" },
                              { label: "Registration No.", value: profile?.roll_number, icon: "🆔" },
                              { label: "Enrolled Department", value: profile?.department_name, icon: "🏛️" }
                            ].map((info) => (
                              <Col md={6} key={info.label}>
                                <Form.Group>
                                  <Form.Label className="apply-form-label fw-bold d-flex align-items-center gap-2">
                                    <small className="opacity-50">{info.icon}</small> {info.label}
                                  </Form.Label>
                                  <Form.Control type="text" value={info.value || "Loading..."} disabled className="apply-control py-2" />
                                </Form.Group>
                              </Col>
                            ))}
                          </Row>
                        </div>

                        <div className="dept-form-block mb-4 p-4">
                          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                            <div>
                               <div className="dept-form-title fs-5">{departmentFormDefinition.title}</div>
                               <p className="dept-form-subtitle mb-0 opacity-75">Please provide department-specific requirements for {studentDepartment}.</p>
                            </div>
                            <Badge className="dept-form-chip py-2 px-3">REQUIRED FIELD</Badge>
                          </div>

                          <Row className="g-4">
                            {(departmentFormDefinition.fields || []).map((field) => {
                              const fieldValue = departmentFormValues?.[field.key] || "";
                              const commonProps = {
                                name: field.key,
                                value: fieldValue,
                                required: !!field.required,
                                className: "apply-control py-2",
                              };
                              const isTextarea = field.type === "textarea";

                              return (
                                <Col md={isTextarea ? 12 : 6} key={field.key}>
                                  <Form.Group>
                                    <Form.Label className="apply-form-label fw-bold">
                                      {field.label} {field.required ? <span className="text-danger">*</span> : ""}
                                    </Form.Label>

                                    {isTextarea ? (
                                      <Form.Control
                                        as="textarea"
                                        rows={field.rows || 3}
                                        placeholder={field.placeholder || "Type here..."}
                                        {...commonProps}
                                        onChange={(e) => handleDepartmentFieldChange(field.key, e.target.value)}
                                      />
                                    ) : field.type === "select" ? (
                                      <Form.Select
                                        {...commonProps}
                                        onChange={(e) => handleDepartmentFieldChange(field.key, e.target.value)}
                                      >
                                        <option value="">Choose Option...</option>
                                        {(field.options || []).map((option) => (
                                          <option key={option} value={option}>
                                            {option}
                                          </option>
                                        ))}
                                      </Form.Select>
                                    ) : (
                                      <Form.Control
                                        type={field.type || "text"}
                                        placeholder={field.placeholder || "Enter detail..."}
                                        {...commonProps}
                                        onChange={(e) => handleDepartmentFieldChange(field.key, e.target.value)}
                                      />
                                    )}
                                  </Form.Group>
                                </Col>
                              );
                            })}
                          </Row>
                        </div>

                        <Form.Group className="mb-4 form-section-card p-4">
                          <Form.Label className="apply-form-label fw-bold fs-6">Reason for Graduation / Leaving</Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={4}
                            name="reason"
                            value={formData.reason}
                            onChange={handleInputChange}
                            placeholder="Please explain why you are requesting clearance (e.g., Final Semester Graduation, Withdrawal, Transfer)..."
                            required
                            className="apply-control apply-textarea"
                          />
                          <div className="mt-2 d-flex align-items-center gap-2 text-info opacity-75">
                             <small>💡 Tip: A professional reason helps focal persons approve your request faster.</small>
                          </div>
                        </Form.Group>

                        <Form.Group className="mb-5 form-section-card p-4">
                          <Form.Label className="apply-form-label fw-bold fs-6">Mandatory Document Upload</Form.Label>
                          <div className="apply-upload-box p-4 border-dashed">
                            <Form.Control
                              id="student-card-input"
                              type="file"
                              accept=".jpg,.jpeg,.png,.pdf"
                              onChange={handleStudentCardChange}
                              required
                              className="d-none"
                            />

                            <div className="text-center py-3">
                               <div className="mb-3">
                                  <span style={{ fontSize: "3rem" }}>🪪</span>
                               </div>
                               <h5 className="text-white mb-2">Student Identity Card</h5>
                               <p className="small text-muted mb-4">Please upload a clear scan of your official university ID card.</p>
                               
                               <div className="d-flex flex-wrap justify-content-center align-items-center gap-3">
                                <label
                                  htmlFor="student-card-input"
                                  className="mb-0"
                                  style={{ cursor: "pointer" }}
                                >
                                  <span className="apply-choose-btn px-4 py-2">
                                    {studentCardFile ? "Change File" : "Choose File"}
                                  </span>
                                </label>

                                {studentCardFile && (
                                  <div className="apply-file-pill d-flex align-items-center gap-2 bg-success bg-opacity-10 border-success border-opacity-20 text-success">
                                    <span className="text-truncate" style={{ maxWidth: "200px" }}>{studentCardFile.name}</span>
                                    <span style={{ cursor: "pointer" }} onClick={() => setStudentCardFile(null)}>✕</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </Form.Group>

                        <div className="text-end mb-4">
                           <Button
                              variant="primary"
                              type="submit"
                              disabled={loading}
                              className="apply-submit-btn px-5 py-3"
                              style={{ minWidth: "260px" }}
                            >
                              {loading ? (
                                <>
                                  <Spinner animation="border" size="sm" className="me-2" />
                                  Processing Application...
                                </>
                              ) : "Finalize & Submit Application"}
                            </Button>
                        </div>
                      </Form>
                    )}
                  </Tab>

                  <Tab eventKey="status" title="📊 Application Status">
                    {activeRequest ? (
                      <div className="status-container px-1">
                        <div className="clearance-progress-wrap mb-5">
                          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                            <div>
                               <div className="d-flex align-items-center gap-2 mb-1">
                                  <h4 className="fw-black text-white mb-0" style={{ letterSpacing: "-0.02em" }}>Completion Status</h4>
                                  {isDegreeIssued && <Badge bg="success" className="rounded-pill px-2">FINALIZED</Badge>}
                               </div>
                               <p className="text-muted mb-0 small">Live departmental review aggregation</p>
                            </div>
                            <div className="text-end">
                               <div className="fs-2 fw-black text-primary" style={{ lineHeight: 1 }}>{displayProgress}%</div>
                               <div className="small text-muted fw-bold">PROCESSED</div>
                            </div>
                          </div>

                          <div className="clearance-progress-track mb-3" role="progressbar" aria-valuenow={displayProgress} aria-valuemin="0" aria-valuemax="100">
                            <div className="clearance-progress-fill" style={{ width: `${displayProgress}%` }}>
                               <div className="fill-glow"></div>
                            </div>
                          </div>

                          <Row className="text-center g-2 mt-4">
                            {[
                              { label: "Submitted", active: true, icon: "📩" },
                              { label: "In Review", active: progress > 0, icon: "🔍" },
                              { label: "Examiner", active: progress === 100, icon: "⚖️" },
                              { label: "Issuance", active: isDegreeIssued, icon: "🎓" }
                            ].map((step, idx) => (
                              <Col key={step.label} xs={6} md={3}>
                                <div className={`status-step p-2 rounded-3 ${step.active ? "active shadow-sm" : "opacity-40"}`}>
                                  <div className="fs-4 mb-1">{step.icon}</div>
                                  <div className="small fw-bold">{step.label}</div>
                                </div>
                              </Col>
                            ))}
                          </Row>

                          {isDegreeIssued ? (
                             <div className="mt-5 p-4 rounded-4 bg-success bg-opacity-10 border border-success border-opacity-20 text-center">
                                <h4 className="text-success fw-bold mb-2">Degree Issued Successfully! 🎉</h4>
                                <p className="mb-0 text-white-50">Your final degree has been processed and is ready for collection.</p>
                             </div>
                          ) : (
                            progress === 100 && (
                               <div className="mt-5 p-4 rounded-4 bg-primary bg-opacity-10 border border-primary border-opacity-20 text-center animate-pulse">
                                  <h5 className="text-primary fw-bold mb-1">Pending Final Authority Approval</h5>
                                  <p className="mb-0 text-white-50">All departments cleared. Waiting for the Examiner's final verification.</p>
                               </div>
                            )
                          )}
                        </div>

                        <div className="app-details-grid mb-5">
                          {[
                            { label: "Application ID", value: activeRequest.id.substring(0, 12) + "...", icon: "🆔", mono: true },
                            { label: "Submission Date", value: new Date(activeRequest.created_at).toLocaleDateString(undefined, { dateStyle: 'long' }), icon: "📅" },
                            { label: "Overall Status", value: normalizedRequestStatus.replace("_", " "), icon: "📊", badge: statusVariant },
                            { label: "Academic Degree", value: activeRequest.degree_issued ? "READY" : "PROCESSING", icon: "🎓", highlight: activeRequest.degree_issued }
                          ].map((item) => (
                            <div className="app-detail-card" key={item.label}>
                              <div className="d-flex align-items-center gap-2 mb-2">
                                <small className="opacity-50">{item.icon}</small>
                                <div className="app-detail-label">{item.label}</div>
                              </div>
                              <div className={`app-detail-value ${item.mono ? "fw-mono fs-7" : ""} ${item.highlight ? "text-success" : ""} text-capitalize`}>
                                 {item.badge ? <Badge bg={item.badge} className="px-3 py-1 rounded-pill">{item.value}</Badge> : item.value}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="dept-section mt-5">
                          <div className="d-flex align-items-center justify-content-between mb-3 px-1">
                            <h5 className="fw-bold dept-review-title mb-0">Departmental Review Status</h5>
                             <Badge bg="dark" className="border border-white border-opacity-10 opacity-75">REAL-TIME FEED</Badge>
                          </div>
                          
                          <div className="dept-reviews-wrap">
                            <table className="table table-hover dept-reviews-table mb-0 align-middle">
                              <thead>
                                <tr>
                                  <th className="ps-4">Authority / Department</th>
                                  <th>Status</th>
                                  <th>Remarks / Feedback</th>
                                  <th className="pe-4 text-end">Updated</th>
                                </tr>
                              </thead>
                              <tbody>
                                {departmentStatuses.length > 0 ? (
                                  departmentStatuses.map((status) => (
                                    <tr key={status.id} className="dept-review-row">
                                      <td className="ps-4 py-3">
                                        <div className="fw-bold dept-review-dept-name">{status.departments?.name || "Unknown"}</div>
                                        <div className="small dept-review-subtitle">Department Node</div>
                                      </td>
                                      <td>
                                        <Badge 
                                          className={`rounded-pill px-3 py-2 ${
                                            status.status === "approved" ? "bg-success bg-opacity-20 text-success border border-success border-opacity-20" : 
                                            status.status === "rejected" ? "bg-danger bg-opacity-20 text-danger border border-danger border-opacity-20" : 
                                            "bg-secondary bg-opacity-20 text-muted border border-white border-opacity-10"
                                          }`}
                                        >
                                          {String(status.status).toUpperCase()}
                                        </Badge>
                                      </td>
                                      <td className="dept-remarks italic small opacity-80" style={{ maxWidth: "300px" }}>
                                        {status.remarks || "No comments provided yet."}
                                      </td>
                                      <td className="pe-4 py-3 text-end small opacity-60">
                                        {new Date(status.updated_at).toLocaleDateString()}
                                      </td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td colSpan="4" className="text-center py-5 opacity-50 italic">
                                      Initializing department nodes for active request...
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-5 text-muted">
                        <h4>No Active Clearance Request Found</h4>
                        <p>Submit an application from the 'Apply for Clearance' tab.</p>
                      </div>
                    )}
                  </Tab>
                </Tabs>
              </Card.Body>
                   <style jsx>{`
          :global(body) {
            background-color: #0b1220 !important;
            color: #f8fafc !important;
          }

          :global(main) {
            background-color: #0b1220 !important;
          }

          @keyframes cardFloatIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }

          
          @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.2); opacity: 0.7; }
            100% { transform: scale(1); opacity: 1; }
          }

          @keyframes glowMove {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }

          .apply-shell {
            background: rgba(15, 23, 42, 0.6) !important;
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.08) !important;
            border-radius: 24px !important;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5) !important;
            overflow: hidden;
            animation: cardFloatIn 0.6s ease-out forwards;
          }

          .apply-shell :global(.card-body) {
            background: transparent !important;
            padding: 2.5rem !important;
          }

          :global(.card) {
            background-color: rgba(15, 23, 42, 0.8) !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            color: #ffffff !important;
          }

          :global(.card-body) {
            background-color: transparent !important;
          }

          .apply-hero {
            animation: cardFloatIn 0.5s ease-out;
            border-radius: 24px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
          }


          .form-intro-banner {
            background: linear-gradient(135deg, rgba(37, 99, 235, 0.1) 0%, rgba(15, 23, 42, 0.9) 100%);
            border: 1px solid rgba(37, 99, 235, 0.2);
            border-radius: 20px;
            padding: 24px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            transition: all 0.3s ease;
          }

          .form-intro-banner:hover {
            border-color: rgba(37, 99, 235, 0.4);
            transform: translateY(-2px);
          }

          :global(.welcome-card) {
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
          }

          :global(.welcome-card:hover) {
            transform: translateY(-8px) scale(1.01);
            box-shadow: 0 30px 60px rgba(0, 0, 0, 0.6) !important;
            border-color: rgba(37, 99, 235, 0.4) !important;
          }


          .form-section-card, .dept-form-block {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 20px;
            transition: all 0.3s ease;
          }

          .form-section-card:hover, .dept-form-block:hover {
            background: rgba(255, 255, 255, 0.05);
            border-color: rgba(37, 99, 235, 0.3);
            transform: translateY(-2px);
          }

          .section-kicker {
            color: #60a5fa;
            font-size: 0.8rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.1em;
          }

          .apply-control, :global(.form-control), :global(.form-select) {
            background: #0f172a !important;
            border: 1px solid rgba(255, 255, 255, 0.12) !important;
            border-radius: 12px !important;
            color: #ffffff !important;
            padding: 12px 16px !important;
            transition: all 0.2s ease !important;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.1) !important;
          }

          .apply-control:focus, :global(.form-control:focus), :global(.form-select:focus) {
            background: #1e293b !important;
            border-color: #3b82f6 !important;
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.25) !important;
            color: #ffffff !important;
          }

          :global(.form-control:disabled) {
            background: #1e293b !important;
            color: #cbd5e1 !important;
            opacity: 0.8;
          }

          :global(label) {
            color: #f8fafc !important;
            font-weight: 600 !important;
          }

          ::placeholder {
            color: #94a3b8 !important;
          }


          .apply-upload-box {
            border: 2px dashed rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            background: rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
          }

          .apply-upload-box:hover {
            border-color: #3b82f6;
            background: rgba(59, 130, 246, 0.05);
          }

          .apply-choose-btn {
            background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
            color: #fff;
            border-radius: 12px;
            padding: 12px 24px;
            font-weight: 700;
            transition: all 0.3s ease;
            box-shadow: 0 10px 20px rgba(37, 99, 235, 0.3);
          }

          .apply-submit-btn {
            background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%) !important;
            border: none !important;
            border-radius: 16px !important;
            font-weight: 800 !important;
            letter-spacing: 0.02em !important;
            box-shadow: 0 15px 30px rgba(37, 99, 235, 0.4) !important;
            transition: all 0.3s ease !important;
          }

          .apply-submit-btn:hover:not(:disabled) {
            transform: translateY(-3px);
            box-shadow: 0 20px 40px rgba(37, 99, 235, 0.5) !important;
          }

          /* Status Styles */
          .clearance-progress-wrap {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 24px;
            padding: 30px;
          }

          .clearance-progress-track {
            height: 12px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 999px;
            overflow: hidden;
            position: relative;
          }

          .clearance-progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #3b82f6, #8b5cf6);
            border-radius: 999px;
            position: relative;
            transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .fill-glow {
            position: absolute;
            top: 0; right: 0; bottom: 0; left: 0;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
            background-size: 200% 100%;
            animation: glowMove 2s linear infinite;
          }

          .status-step {
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.05);
            transition: all 0.3s ease;
          }

          .status-step.active {
            background: rgba(37, 99, 235, 0.1);
            border-color: rgba(37, 99, 235, 0.3);
            color: #60a5fa;
          }

          .app-detail-card {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 16px;
            padding: 16px;
            transition: all 0.3s ease;
          }

          .app-detail-card:hover {
            background: rgba(255, 255, 255, 0.06);
            transform: scale(1.02);
          }

          .app-detail-label {
            color: #94a3b8;
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
          }

          .app-detail-value {
            color: #fff;
            font-weight: 700;
            font-size: 1.1rem;
          }

          .dept-reviews-wrap {
            border-radius: 20px;
            overflow: hidden;
            border: 1px solid rgba(148, 163, 184, 0.14);
            background: rgba(15, 23, 42, 0.82);
            box-shadow: 0 18px 40px rgba(15, 23, 42, 0.28);
          }

          .dept-reviews-table thead th {
            background: linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.98) 100%);
            color: #cbd5e1;
            border-bottom: 1px solid rgba(148, 163, 184, 0.12);
            text-transform: uppercase;
            font-size: 0.75rem;
            letter-spacing: 0.05em;
            padding: 15px;
          }

          .dept-reviews-table tbody tr {
            border-bottom: 1px solid rgba(255, 255, 255, 0.02);
            transition: transform 0.22s ease, box-shadow 0.22s ease, background 0.22s ease;
          }

          .dept-reviews-table tbody tr:hover {
            background: transparent;
            transform: translateY(-2px);
            box-shadow: 0 14px 24px rgba(15, 23, 42, 0.28);
          }

          .dept-reviews-table tbody td {
            background: linear-gradient(180deg, rgba(30, 41, 59, 0.96) 0%, rgba(15, 23, 42, 0.96) 100%);
            color: #f8fafc;
            border-top: 1px solid rgba(148, 163, 184, 0.12);
            border-bottom: 1px solid rgba(148, 163, 184, 0.12);
            padding-top: 16px !important;
            padding-bottom: 16px !important;
          }

          .dept-reviews-table tbody tr:hover td {
            background: linear-gradient(180deg, rgba(37, 99, 235, 0.18) 0%, rgba(124, 58, 237, 0.18) 100%);
          }

          .dept-review-row td:first-child {
            border-top-left-radius: 16px;
            border-bottom-left-radius: 16px;
          }

          .dept-review-row td:last-child {
            border-top-right-radius: 16px;
            border-bottom-right-radius: 16px;
          }

          .dept-review-title {
            color: #ffffff !important;
            text-shadow: 0 2px 10px rgba(0, 0, 0, 0.45);
          }

          .dept-review-dept-name {
            color: #ffffff;
            text-shadow: 0 1px 6px rgba(0, 0, 0, 0.4);
          }

          .dept-review-subtitle {
            color: #cbd5e1 !important;
          }

          :global(h1), :global(h2), :global(h3), :global(h4), :global(h5), :global(h6), :global(.fw-bold), :global(.fw-black) {
            color: #ffffff !important;
          }

          :global(p), :global(.text-muted), :global(small) {
            color: #94a3b8 !important;
          }

          :global(.nav-tabs) {
            border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
          }

          :global(#clearance-tabs .nav-link) {
            border: none !important;
            border-radius: 12px !important;
            color: #94a3b8 !important;
            padding: 12px 24px !important;
            font-weight: 700 !important;
            transition: all 0.3s ease !important;
          }


          :global(#clearance-tabs .nav-link:hover) {
            background: rgba(255, 255, 255, 0.05) !important;
            color: #fff !important;
          }

          :global(#clearance-tabs .nav-link.active) {
            background: #2563eb !important;
            color: #fff !important;
            box-shadow: 0 10px 20px rgba(37, 99, 235, 0.2) !important;
          }
          @media (max-width: 768px) {
            .apply-shell :global(.card-body) { padding: 1.5rem !important; }
            .clearance-progress-wrap { padding: 20px; }
          }
        `}</style>
            </Card>
          </Col>
        </Row>
      </Container>
    </StudentLayout>
  );
}