"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Container, Row, Col, Card, Table, Spinner, Badge, Button, Alert } from "react-bootstrap";
import DepartmentLayout from "@/components/layout/DepartmentLayout";
import { useAuth } from "@/lib/useAuth";
import { getPendingTasksForStaff } from "@/lib/clearanceService";
import { supabase } from "@/lib/supabaseClient";

const statusVariant = (status) => {
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

export default function DepartmentReviewListPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        if (profile?.department_id) {
          const data = await getPendingTasksForStaff(profile.department_id);
          if (!cancelled) {
            setTasks(data || []);
            setError("");
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load tasks");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    if (!authLoading && user?.id) {
      load();

      // Subscribe to real-time updates for THIS department's tasks
      // We use the department_id from the profile if available
      if (profile?.department_id) {
        const channel = supabase
          .channel(`dept-task-list-${profile.department_id}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "clearance_status",
              filter: `department_id=eq.${profile.department_id}`,
            },
            () => load()
          )
          .subscribe();

        return () => {
          cancelled = true;
          supabase.removeChannel(channel);
        };
      }
    }
  }, [authLoading, user?.id, profile?.department_id]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const overdue = tasks.filter((t) => t.due_date && new Date(t.due_date) < new Date()).length;
    return { total, overdue };
  }, [tasks]);

  return (
    <DepartmentLayout>
      <Container fluid style={{ padding: "20px" }}>
        <div
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            padding: "30px",
            borderRadius: "12px",
            marginBottom: "30px",
            color: "white",
          }}
        >
          <h1 className="fw-bold mb-2">📝 Department Reviews</h1>
          <p className="mb-0">Pending clearance tasks assigned to you</p>
        </div>

        {error ? (
          <Alert variant="danger">{error}</Alert>
        ) : null}

        <Row className="mb-4">
          <Col md={6} className="mb-3">
            <Card style={{ borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
              <Card.Body>
                <div className="text-muted small">Pending Tasks</div>
                <div className="fw-bold" style={{ fontSize: 28 }}>
                  {stats.total}
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={6} className="mb-3">
            <Card style={{ borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
              <Card.Body>
                <div className="text-muted small">Overdue</div>
                <div className="fw-bold" style={{ fontSize: 28, color: stats.overdue ? "#dc3545" : "inherit" }}>
                  {stats.overdue}
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Card style={{ borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
          <Card.Header className="bg-light fw-bold">📋 Tasks</Card.Header>
          <Card.Body>
            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" role="status" className="mb-3" />
                <p className="text-muted">Loading tasks...</p>
              </div>
            ) : tasks.length === 0 ? (
              <Alert variant="info" className="mb-0">
                No pending tasks assigned to you.
              </Alert>
            ) : (
              <Table responsive striped hover>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Roll</th>
                    <th>Department</th>
                    <th>Due</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((t) => (
                    <tr key={t.id}>
                      <td>{t.clearance_requests?.users?.name || t.clearance_requests?.users?.email || "—"}</td>
                      <td>{t.clearance_requests?.student_profiles?.roll_number || "—"}</td>
                      <td>{t.departments?.name || "—"}</td>
                      <td>{t.due_date ? new Date(t.due_date).toLocaleDateString() : "—"}</td>
                      <td>
                        <Badge bg={statusVariant(t.status)} text={t.status === "pending" ? "dark" : undefined}>
                          {t.status}
                        </Badge>
                      </td>
                      <td className="text-end">
                        <Button size="sm" variant="primary" onClick={() => router.push(`/department/review/${t.id}`)}>
                          Review
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>
      </Container>
    </DepartmentLayout>
  );
}
