"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, Button, Table, Modal, Form, Spinner, Alert, Badge } from "react-bootstrap";
import DepartmentLayout from "@/components/layout/DepartmentLayout";
import { supabase } from "@/lib/supabaseClient";
import { updateClearanceTaskStatus, issueDegreeThroughAcademicDept } from "@/lib/clearanceService";

const badgeFor = (status) => {
  switch (status) {
    case "completed":
      return "success";
    case "in_progress":
      return "info";
    case "rejected":
      return "danger";
    case "pending":
    default:
      return "warning";
  }
};

export default function DepartmentReviewDetailPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params?.id;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [task, setTask] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [showIssueDegree, setShowIssueDegree] = useState(false);
  const [degreeRemarks, setDegreeRemarks] = useState("");
  const [departmentIsAcademic, setDepartmentIsAcademic] = useState(false);
  const [allClearanceStatuses, setAllClearanceStatuses] = useState([]);

  useEffect(() => {
    if (!taskId) return;

    const load = async () => {
      setLoading(true);
      setError("");

      const { data, error: fetchError } = await supabase
        .from("clearance_status")
        .select(
          `
          id,
          status,
          remarks,
          request_id,
          department_id,
          departments (id, name, code, is_academic),
          clearance_requests (
            id,
            overall_status,
            student_id,
            students (id, name, email)
          ),
          documents!inner (
            id,
            file_url,
            created_at
          )
        `
        )
        .eq("id", taskId)
        .maybeSingle(); // maybeSingle to handle deleted or mismatching rows gracefully

      if (fetchError) {
        setError(fetchError.message);
        setTask(null);
        setLoading(false);
        return;
      }

      setTask(data);
      setRemarks(data?.remarks || "");
      
      // Check if this department is academic
      const isAcademic = !!data?.departments?.is_academic;
      setDepartmentIsAcademic(isAcademic);

      // Fetch all clearance statuses for this request to check if all are approved
      if (data?.clearance_requests?.id) {
        const { data: statusesData, error: statusesError } = await supabase
          .from("clearance_status")
          .select("status")
          .eq("request_id", data.clearance_requests.id);
        
        if (!statusesError) {
          setAllClearanceStatuses(statusesData || []);
        }
      }

      setLoading(false);
    };

    load();
  }, [taskId]);

  const student = task?.clearance_requests?.students;
  const rollNumber = student?.roll_number; // Assuming it's in the profile or student table

  const canAct = useMemo(() => {
    return task?.status === "pending" || task?.status === "in_progress";
  }, [task?.status]);

  const handleApprove = async () => {
    if (!task?.id) return;
    setSubmitting(true);
    setError("");

    const res = await updateClearanceTaskStatus(task.id, "completed", remarks);
    if (!res.success) {
      setError(res.error || "Failed to approve task");
      setSubmitting(false);
      return;
    }

    setTask((prev) => ({ ...prev, status: "completed", feedback: remarks }));
    setSubmitting(false);
  };

  const handleReject = async () => {
    if (!task?.id) return;
    setSubmitting(true);
    setError("");

    const res = await updateClearanceTaskStatus(task.id, "rejected", remarks);
    if (!res.success) {
      setError(res.error || "Failed to reject task");
      setSubmitting(false);
      return;
    }

    setTask((prev) => ({ ...prev, status: "rejected", feedback: remarks }));
    setSubmitting(false);
    setShowReject(false);
  };

  const handleIssueDegree = async () => {
    if (!task?.id || !departmentIsAcademic) return;
    
    setSubmitting(true);
    setError("");

    try {
      const student = task?.clearance_requests?.students;
      const requestId = task?.clearance_requests?.id;
      
      if (!student?.id || !requestId) {
        throw new Error("Missing student or request information");
      }

      const res = await issueDegreeThroughAcademicDept(
        requestId,
        student.id,
        task.department_id,
        "Official Degree Certificate",
        degreeRemarks
      );

      if (!res.success) {
        setError(res.error || "Failed to issue degree");
        setSubmitting(false);
        return;
      }

      // Success - show confirmation and navigate back
      alert("✓ Degree successfully issued!");
      setShowIssueDegree(false);
      setDegreeRemarks("");
      setSubmitting(false);
      router.push("/department/review");
    } catch (err) {
      setError(err.message || "Error issuing degree");
      setSubmitting(false);
    }
  };

  return (
    <DepartmentLayout>
      <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <h2 className="mb-0">Review Task</h2>
        <Button variant="outline-secondary" size="sm" onClick={() => router.push("/department/review")}
          disabled={submitting}
        >
          Back to list
        </Button>
      </div>

      {error ? <Alert variant="danger">{error}</Alert> : null}

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" role="status" className="mb-3" />
          <p className="text-muted">Loading task...</p>
        </div>
      ) : !task ? (
        <Alert variant="warning">Task not found.</Alert>
      ) : (
        <>
          <Card className="shadow-sm p-4 mb-4" style={{ borderRadius: 12 }}>
            <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
              <div>
                <h5 className="mb-1">{task.departments?.name || "Department"}</h5>
                <div className="text-muted small">Task type: {task.task_type || "—"}</div>
              </div>
              <div className="text-end">
                <Badge bg={badgeFor(task.status)} text={task.status === "pending" ? "dark" : undefined}>
                  {task.status}
                </Badge>
                <div className="text-muted small mt-1">
                  Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : "—"}
                </div>
              </div>
            </div>

            <hr />

            <h6 className="mb-3">Student</h6>
            <Table striped bordered hover responsive className="mb-0">
              <tbody>
                <tr>
                  <td style={{ width: 180 }}>Name</td>
                  <td>{student?.name || "—"}</td>
                </tr>
                <tr>
                  <td>Email</td>
                  <td>{student?.email || "—"}</td>
                </tr>
                <tr>
                  <td>Roll Number</td>
                  <td>{rollNumber || "—"}</td>
                </tr>
                <tr>
                  <td>Clearance</td>
                  <td>{task.clearance_id}</td>
                </tr>
              </tbody>
            </Table>
          </Card>

          <Card className="shadow-sm p-4 mb-4" style={{ borderRadius: 12 }}>
            <h6 className="mb-3">Documents</h6>
            {task.documents?.length ? (
              <Table striped bordered hover responsive className="mb-0">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Status</th>
                    <th>File</th>
                  </tr>
                </thead>
                <tbody>
                  {task.documents.map((d) => (
                    <tr key={d.id}>
                      <td>{d.document_type}</td>
                      <td>
                        <Badge bg={d.status === "approved" ? "success" : d.status === "rejected" ? "danger" : "secondary"}>
                          {d.status}
                        </Badge>
                      </td>
                      <td>
                        {d.file_url ? (
                          <a href={d.file_url} target="_blank" rel="noreferrer">
                            {d.file_name || "View"}
                          </a>
                        ) : (
                          d.file_name || "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <div className="text-muted">No documents uploaded for this task.</div>
            )}
          </Card>

          <Card className="shadow-sm p-4" style={{ borderRadius: 12 }}>
            <h6 className="mb-3">Remarks</h6>
            <Form.Group className="mb-3">
              <Form.Control
                as="textarea"
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Optional remarks (e.g., missing items, approvals notes)"
                disabled={!canAct || submitting}
              />
            </Form.Group>

            <div className="d-flex gap-2 flex-wrap">
              <Button variant="success" onClick={handleApprove} disabled={!canAct || submitting}>
                {submitting ? "Saving..." : "Approve"}
              </Button>
              <Button variant="danger" onClick={() => setShowReject(true)} disabled={!canAct || submitting}>
                Reject
              </Button>

              {/* Degree Issuance Button - Only for Academic Departments when all approved */}
              {departmentIsAcademic && task?.status === "completed" && allClearanceStatuses.every(s => s.status === "completed" || s.status === "approved") && (
                <Button 
                  variant="primary" 
                  onClick={() => setShowIssueDegree(true)}
                  disabled={submitting}
                  style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", border: "none" }}
                >
                  🎓 Issue Degree
                </Button>
              )}
            </div>
          </Card>

          <Modal show={showReject} onHide={() => setShowReject(false)} centered>
            <Modal.Header closeButton>
              <Modal.Title>Reject Task</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <p className="mb-2">Add remarks for the student (required).</p>
              <Form.Control
                as="textarea"
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Reason for rejection..."
              />
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowReject(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleReject} disabled={submitting || !remarks.trim()}>
                {submitting ? "Saving..." : "Reject"}
              </Button>
            </Modal.Footer>
          </Modal>

          {/* Degree Issuance Modal */}
          <Modal show={showIssueDegree} onHide={() => setShowIssueDegree(false)} centered>
            <Modal.Header closeButton className="border-0 pb-0">
              <Modal.Title className="fw-bold">🎓 Issue Degree Certificate</Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-4">
              <p className="text-muted mb-3">
                You are about to issue the degree certificate to <strong>{student?.name}</strong>. All department clearances have been approved.
              </p>
              <Form.Group>
                <Form.Label className="fw-bold mb-2">Additional Remarks (Optional)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={degreeRemarks}
                  onChange={(e) => setDegreeRemarks(e.target.value)}
                  placeholder="Add any remarks or notes for the degree record..."
                  disabled={submitting}
                />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer className="border-0 pt-0">
              <Button 
                variant="secondary" 
                onClick={() => setShowIssueDegree(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button 
                variant="success" 
                onClick={handleIssueDegree}
                disabled={submitting}
                className="fw-bold"
              >
                {submitting ? "Issuing..." : "Confirm & Issue Degree"}
              </Button>
            </Modal.Footer>
          </Modal>
        </>
      )}
    </DepartmentLayout>
  );
}
