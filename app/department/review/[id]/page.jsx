"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, Button, Table, Modal, Form, Spinner, Alert, Badge } from "react-bootstrap";
import DepartmentLayout from "@/components/layout/DepartmentLayout";
import { supabase } from "@/lib/supabaseClient";
import { updateClearanceTaskStatus } from "@/lib/clearanceService";

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
          departments (id, name, code),
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

            <div className="d-flex gap-2">
              <Button variant="success" onClick={handleApprove} disabled={!canAct || submitting}>
                {submitting ? "Saving..." : "Approve"}
              </Button>
              <Button variant="danger" onClick={() => setShowReject(true)} disabled={!canAct || submitting}>
                Reject
              </Button>
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
        </>
      )}
    </DepartmentLayout>
  );
}
