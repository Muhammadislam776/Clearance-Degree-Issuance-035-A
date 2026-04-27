"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Badge, Button, Card, Col, Container, Form, Modal, Row, Spinner } from "react-bootstrap";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import DepartmentLayout from "@/components/layout/DepartmentLayout";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { getClearedStudents, getIssuedDegrees, issueDegreeThroughAcademicDept } from "@/lib/clearanceService";

const CARD_GRADS = [
  "linear-gradient(135deg,#0f172a,#1d4ed8)",
  "linear-gradient(135deg,#0f766e,#14b8a6)",
  "linear-gradient(135deg,#7c3aed,#8b5cf6)",
];

function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase() || "?";
}

function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AcademicDashboardPage() {
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [readyStudents, setReadyStudents] = useState([]);
  const [issuedDegrees, setIssuedDegrees] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [showIssue, setShowIssue] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [degreeTitle, setDegreeTitle] = useState("");
  const [issueRemarks, setIssueRemarks] = useState("");
  const [activeAcademicDept, setActiveAcademicDept] = useState(null);
  const [academicDeptLoading, setAcademicDeptLoading] = useState(true);
  const [requestedDeptId, setRequestedDeptId] = useState(null);
  const userDeptId = profile?.department_id || profile?.department_profile?.id || null;
  const userDeptName = profile?.department_profile?.name || profile?.department_name || profile?.department || null;
  const hasBoundDepartment = !!(userDeptId || userDeptName);
  const requestedAcademicDeptId =
    activeAcademicDept?.id && requestedDeptId === activeAcademicDept.id ? requestedDeptId : null;
  const departmentId = requestedAcademicDeptId || userDeptId || activeAcademicDept?.id || null;
  const isAcademicDepartment = activeAcademicDept
    ? (
        userDeptId === activeAcademicDept.id ||
        userDeptName === activeAcademicDept.name ||
        requestedDeptId === activeAcademicDept.id
      )
    : ((!hasBoundDepartment && !!requestedDeptId) || !!profile?.department_profile?.is_academic);

  const loadAcademicDepartment = useCallback(async () => {
    setAcademicDeptLoading(true);
    try {
      const { data } = await supabase
        .from("departments")
        .select("id, name, is_academic")
        .eq("is_academic", true)
        .maybeSingle();
      setActiveAcademicDept(data || null);
    } catch (e) {
      setActiveAcademicDept(null);
    } finally {
      setAcademicDeptLoading(false);
    }
  }, []);

  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError("");

      const [resCleared, resIssued] = await Promise.all([getClearedStudents(), getIssuedDegrees()]);
      if (!resCleared.success) throw new Error(resCleared.error);
      if (!resIssued.success) throw new Error(resIssued.error);

      const ready = (resCleared.data || []).filter(
        (student) => student.readyForAcademicIssuance
      );
      setReadyStudents(ready);
      setIssuedDegrees(resIssued.data || []);
    } catch (e) {
      setError(e?.message || "Failed to load academic dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAcademicDepartment();
  }, [loadAcademicDepartment]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setRequestedDeptId(params.get("deptId") || null);
  }, []);

  useEffect(() => {
    if (!authLoading && profile) {
      if (profile.role !== "department") {
        router.replace("/department/dashboard");
        return;
      }

      fetchData();

      const channel = supabase
        .channel(`academic-dashboard-${departmentId || "global"}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "clearance_requests" }, () => fetchData(true))
        .on("postgres_changes", { event: "*", schema: "public", table: "degrees" }, () => fetchData(true))
        .on("postgres_changes", { event: "*", schema: "public", table: "departments" }, () => loadAcademicDepartment())
        .subscribe();


      return () => supabase.removeChannel(channel);
    }
  }, [authLoading, profile, departmentId, router, fetchData, activeAcademicDept, isAcademicDepartment, loadAcademicDepartment]);

  const stats = useMemo(() => ({
    ready: readyStudents.length,
    issued: issuedDegrees.length,
    total: readyStudents.length + issuedDegrees.length,
    completion: readyStudents.length + issuedDegrees.length === 0 ? 0 : Math.round((issuedDegrees.length / (readyStudents.length + issuedDegrees.length)) * 100),
  }), [readyStudents.length, issuedDegrees.length]);

  const filteredReady = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return readyStudents;
    return readyStudents.filter((student) =>
      [student.studentName, student.studentEmail]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [readyStudents, search]);

  const filteredIssued = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return issuedDegrees;
    return issuedDegrees.filter((degree) =>
      [degree.studentName, degree.studentEmail, degree.degreeTitle]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [issuedDegrees, search]);

  if (academicDeptLoading) {
    return (
      <ProtectedRoute requiredRoles="department">
        <DepartmentLayout>
          <Container fluid className="py-5 text-center">
            <Spinner animation="border" />
            <div className="mt-3 text-muted">Loading academic issuance portal...</div>
          </Container>
        </DepartmentLayout>
      </ProtectedRoute>
    );
  }

  if (profile && !activeAcademicDept) {
    return (
      <ProtectedRoute requiredRoles="department">
        <DepartmentLayout>
          <Container fluid className="py-5">
            <Alert variant="warning" className="rounded-4 border-0 shadow-sm">
              No academic department is selected by admin yet. Please ask admin to select one from Manage Departments.
            </Alert>
          </Container>
        </DepartmentLayout>
      </ProtectedRoute>
    );
  }

  const handleIssueDegree = async () => {
    if (!selectedStudent || !departmentId) {
      setError("Academic department is not configured. Ask admin to select one from Manage Departments.");
      return;
    }
    if (!selectedStudent.readyForAcademicIssuance) {
      setError("This request is not ready yet. Examiner approval is required before academic issuance.");
      return;
    }
    setActionLoading(true);
    try {
      const title = degreeTitle.trim() || "Official Degree";
      const result = await issueDegreeThroughAcademicDept(
        selectedStudent.id,
        selectedStudent.studentId,
        departmentId,
        title,
        issueRemarks
      );

      if (!result.success) throw new Error(result.error);

      setSuccess(`Degree issued for ${selectedStudent.studentName}`);
      setShowIssue(false);
      setSelectedStudent(null);
      setDegreeTitle("");
      setIssueRemarks("");
      await fetchData(true);
    } catch (e) {
      setError(e?.message || "Degree issuance failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/department/dashboard");
  };

  const renderStudentCard = (student, type, index) => {
    const grad = CARD_GRADS[index % CARD_GRADS.length];
    return (
      <div key={`${type}-${student.id}`} className="academic-card-wrap">
        <Card className="border-0 shadow-sm h-100 academic-card">
          <Card.Body className="p-4">
            <div className="d-flex align-items-start gap-3 mb-3">
              <div className="d-flex align-items-center gap-3 flex-grow-1 min-w-0">
                <div className="academic-avatar" style={{ background: grad }}>{initials(student.studentName)}</div>
                <div className="min-w-0">
                  <div className="fw-bold fs-6 text-truncate academic-name">{student.studentName}</div>
                  <div className="small text-truncate academic-email">{student.studentEmail}</div>
                </div>
              </div>
            </div>

            <div className="d-flex justify-content-end mb-3">
              <Badge className="rounded-pill border px-3 py-2 academic-status-badge academic-soft-badge">
                {type === "ready" ? `${student.clearedCount}/${student.totalDepts}` : "Issued"}
              </Badge>
            </div>

            {type === "ready" ? (
              <>
                <Badge bg="success" className="rounded-pill px-3 py-2 mb-3">Ready for academic issuance</Badge>
                <div className="mb-3">
                  <div className="d-flex justify-content-between small mb-2">
                    <span className="academic-muted">Clearance progress</span>
                    <strong>{student.totalDepts ? Math.round((student.clearedCount / student.totalDepts) * 100) : 0}%</strong>
                  </div>
                  <div className="progress" style={{ height: 8, borderRadius: 999, background: "rgba(148,163,184,0.2)" }}>
                    <div className="progress-bar" style={{ width: `${student.totalDepts ? (student.clearedCount / student.totalDepts) * 100 : 0}%`, background: "linear-gradient(90deg,#0f766e,#14b8a6)", borderRadius: 999 }} />
                  </div>
                </div>
                <div className="academic-muted small mb-3">All departments approved. This record is waiting for final academic issuance.</div>
                <div className="d-flex align-items-center justify-content-between gap-2">
                  <span className="academic-muted small">{timeAgo(student.submittedAt)}</span>
                  <Button
                    className="academic-cta"
                    onClick={() => {
                      setSelectedStudent(student);
                      setDegreeTitle("Official Degree");
                      setIssueRemarks("");
                      setShowIssue(true);
                    }}
                  >
                    Issue Degree
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Badge bg="primary" className="rounded-pill px-3 py-2 mb-3">Degree issued</Badge>
                <div className="mb-2 small academic-muted">Title</div>
                <div className="fw-semibold mb-3">{student.degreeTitle || "Official Degree"}</div>
                <div className="mb-2 small academic-muted">Issued</div>
                <div className="fw-semibold mb-3">{new Date(student.issuedAt || Date.now()).toLocaleDateString()}</div>
                <div className="d-flex align-items-center justify-content-between">
                  <span className="academic-muted small">QR: {student.qrCode || "N/A"}</span>
                  <Badge className="rounded-pill border px-3 py-2 academic-soft-badge">Ledger</Badge>
                </div>
              </>
            )}
          </Card.Body>
        </Card>
      </div>
    );
  };

  if (profile && !isAcademicDepartment) {
    return (
      <ProtectedRoute requiredRoles="department">
        <DepartmentLayout>
          <Container fluid className="py-5">
            <Alert variant="warning" className="rounded-4 border-0 shadow-sm">
              This department is not marked as the academic final-issuance department.
            </Alert>
          </Container>
        </DepartmentLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles="department">
      <DepartmentLayout>
        <Container fluid className="py-4">
          <style jsx global>{`
            @keyframes acadRise {
              from { opacity: 0; transform: translateY(18px); }
              to { opacity: 1; transform: translateY(0); }
            }

            .academic-hero {
              position: relative;
              overflow: hidden;
              background: linear-gradient(135deg, #0f172a 0%, #0f766e 45%, #14b8a6 100%);
              color: #fff;
              border-radius: 28px;
              padding: 2rem;
              margin-bottom: 1.5rem;
              animation: acadRise 0.5s ease-out;
              border: 1px solid rgba(255,255,255,0.12);
              box-shadow: 0 18px 38px rgba(15,23,42,0.26);
            }

            .academic-hero::after {
              content: "";
              position: absolute;
              inset: 0;
              background: radial-gradient(circle at top right, rgba(255,255,255,0.16), transparent 34%);
              pointer-events: none;
            }

            .academic-chip {
              display: inline-flex;
              align-items: center;
              gap: 0.5rem;
              padding: 0.35rem 0.9rem;
              border-radius: 999px;
              background: rgba(255,255,255,0.15);
              text-transform: uppercase;
              letter-spacing: 0.08em;
              font-size: 0.72rem;
              font-weight: 800;
              margin-bottom: 0.85rem;
            }

            .academic-title { font-size: clamp(1.9rem, 2.7vw, 3rem); font-weight: 900; line-height: 1.05; margin-bottom: 0.75rem; color: #f8fafc !important; }
            .academic-sub { max-width: 740px; color: rgba(255,255,255,0.84); margin-bottom: 0; }

            .academic-stat-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
              gap: 1rem;
              margin-bottom: 1.5rem;
            }

            .academic-stat {
              background: linear-gradient(180deg, rgba(15,23,42,0.96) 0%, rgba(30,41,59,0.96) 100%);
              border-radius: 22px;
              border: 1px solid rgba(148,163,184,0.14);
              padding: 1.2rem;
              transition: transform 0.25s ease, box-shadow 0.25s ease;
            }

            .academic-stat:hover {
              transform: translateY(-6px);
              box-shadow: 0 18px 36px rgba(15, 23, 42, 0.26);
            }

            .academic-stat-icon {
              width: 48px;
              height: 48px;
              border-radius: 16px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #fff;
              font-size: 1.25rem;
              margin-bottom: 1rem;
            }

            .academic-panel {
              background: linear-gradient(180deg, rgba(15,23,42,0.96) 0%, rgba(17,24,39,0.96) 100%);
              border-radius: 28px;
              border: 1px solid rgba(148,163,184,0.14);
              box-shadow: 0 12px 30px rgba(15, 23, 42, 0.2);
              overflow: hidden;
            }

            .academic-panel-head {
              display: flex;
              justify-content: space-between;
              align-items: center;
              flex-wrap: wrap;
              gap: 1rem;
              padding: 1.25rem 1.4rem;
              border-bottom: 1px solid rgba(148,163,184,0.14);
              background: linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(30,41,59,0.94) 100%);
            }

            .academic-grid {
              padding: 1.4rem;
            }

            .academic-card-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
              gap: 1.25rem;
            }

            .academic-card-wrap {
              min-width: 0;
            }

            .academic-card {
              border-radius: 22px;
              border: 1px solid rgba(148,163,184,0.14);
              background: linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(30,41,59,0.95) 100%);
              transition: transform 0.25s ease, box-shadow 0.25s ease;
              animation: acadRise 0.45s ease-out backwards;
            }

            .academic-card:hover {
              transform: translateY(-6px);
              box-shadow: 0 18px 36px rgba(15, 23, 42, 0.24);
            }

            .academic-avatar {
              width: 50px;
              height: 50px;
              border-radius: 16px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #fff;
              font-weight: 900;
              box-shadow: 0 10px 22px rgba(15, 23, 42, 0.18);
            }

            .academic-status-badge {
              white-space: nowrap;
              flex-shrink: 0;
            }

            .academic-soft-badge {
              background: rgba(15,23,42,0.78) !important;
              border-color: rgba(148,163,184,0.2) !important;
              color: #e2e8f0 !important;
            }

            .academic-name {
              color: #f8fafc;
            }

            .academic-email,
            .academic-muted {
              color: #cbd5e1 !important;
            }

            .academic-panel h4,
            .academic-panel h5,
            .academic-panel .fw-semibold,
            .academic-panel .fw-bold {
              color: #f8fafc;
            }

            .academic-search {
              background: rgba(15,23,42,0.86) !important;
              border: 1px solid rgba(148,163,184,0.2) !important;
              color: #f8fafc !important;
            }
            .academic-search::placeholder {
              color: #94a3b8;
            }

            .academic-cta {
              background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);
              border: none;
              border-radius: 14px;
              padding: 0.82rem 1.05rem;
              font-weight: 800;
              box-shadow: 0 10px 20px rgba(15,118,110,0.18);
            }

            .academic-cta:hover { transform: translateY(-2px); }

            .academic-nav-actions {
              position: absolute;
              top: 1.4rem;
              right: 1.4rem;
              display: flex;
              align-items: center;
              gap: 0.6rem;
              z-index: 2;
            }

            .academic-nav-btn {
              padding: 0.6rem 1.1rem;
              font-weight: 700;
            }

            .academic-modal .modal-content {
              border: 1px solid rgba(148,163,184,0.2);
              border-radius: 24px;
              overflow: hidden;
              background: linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(30,41,59,0.98) 100%);
              color: #e2e8f0;
              box-shadow: 0 30px 66px rgba(15,23,42,0.45);
            }
            .academic-modal .btn-close {
              filter: invert(1) brightness(2);
            }
            .academic-modal .text-muted {
              color: #94a3b8 !important;
            }
            .academic-modal .form-control,
            .academic-modal .form-control:focus {
              background: rgba(15,23,42,0.86) !important;
              border: 1px solid rgba(148,163,184,0.2) !important;
              color: #f8fafc !important;
              box-shadow: none !important;
            }
            .academic-modal .form-control::placeholder {
              color: #94a3b8;
            }

            @media (max-width: 768px) {
              .academic-hero { padding: 1.4rem; }
              .academic-panel-head { padding: 1rem; }
              .academic-grid { padding: 1rem; }
              .academic-nav-actions {
                position: static;
                margin-top: 1rem;
                justify-content: flex-start;
              }
            }
          `}</style>

          <div className="academic-hero">
            <div style={{ position: "relative", zIndex: 1 }}>
              <div className="academic-chip">🎓 Academic Final Issuance</div>
              <h1 className="academic-title">Degree Issuance Control</h1>
              <p className="academic-sub">
                This panel is for the academic department to issue degrees only after all departments and the examiner have completed review.
              </p>
            </div>
            <div className="academic-nav-actions">
              <Button className="rounded-pill academic-soft-badge academic-nav-btn" onClick={handleBack}>
                Back
              </Button>
              <Button
                className="rounded-pill academic-soft-badge academic-nav-btn"
                onClick={() => router.push("/department/dashboard")}
              >
                Department Hub
              </Button>
            </div>
          </div>

          {error ? <Alert variant="danger" className="rounded-4 border-0 shadow-sm">{error}</Alert> : null}
          {success ? <Alert variant="success" className="rounded-4 border-0 shadow-sm">{success}</Alert> : null}

          <div className="academic-stat-grid">
            {[
              { label: "Ready for Issuance", sub: "Examiner-approved clearance", value: stats.ready, icon: "📜", color: "linear-gradient(135deg,#0f766e,#14b8a6)" },
              { label: "Degrees Issued", sub: "Final records completed", value: stats.issued, icon: "🎓", color: "linear-gradient(135deg,#1d4ed8,#2563eb)" },
              { label: "Completion Rate", sub: "Issued vs ready records", value: `${stats.completion}%`, icon: "📈", color: "linear-gradient(135deg,#7c3aed,#8b5cf6)" },
            ].map((item) => (
              <div key={item.label} className="academic-stat">
                <div className="academic-stat-icon" style={{ background: item.color }}>{item.icon}</div>
                <div className="fs-2 fw-black" style={{ fontWeight: 900, color: "#f8fafc" }}>{item.value}</div>
                <div className="fw-bold mt-1" style={{ color: "#f8fafc" }}>{item.label}</div>
                <div className="academic-muted small">{item.sub}</div>
              </div>
            ))}
          </div>

          <Card className="academic-panel mb-4">
            <div className="academic-panel-head">
              <div>
                <h4 className="fw-bold mb-1">Ready for Academic Issuance</h4>
                <p className="academic-muted mb-0 small">Students approved by all departments and the examiner.</p>
              </div>

              <Form.Control
                style={{ minWidth: "min(100%, 320px)" }}
                className="rounded-pill px-3 py-2 academic-search"
                placeholder="Search student, email, or degree title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="academic-grid">
              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" className="mb-3" />
                  <p className="academic-muted mb-0">Loading academic issuance queue...</p>
                </div>
              ) : filteredReady.length === 0 ? (
                <div className="text-center py-5 academic-muted">
                  <div style={{ fontSize: "3rem" }}>📭</div>
                  <h5 className="fw-bold mt-2">No Students Waiting for Issuance</h5>
                  <p className="mb-0">When examiner approves a student, they will appear here for final degree issuance.</p>
                </div>
              ) : (
                <div className="academic-card-grid">
                  {filteredReady.map((student, index) => renderStudentCard(student, "ready", index))}
                </div>
              )}
            </div>
          </Card>

          <Card className="academic-panel">
            <div className="academic-panel-head">
              <div>
                <h4 className="fw-bold mb-1">Issued Degrees Ledger</h4>
                <p className="academic-muted mb-0 small">All degrees already issued by academic authority.</p>
              </div>
            </div>

            <div className="academic-grid">
              {loading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" className="mb-2" />
                </div>
              ) : filteredIssued.length === 0 ? (
                <div className="text-center py-4 academic-muted">No issued records found yet.</div>
              ) : (
                <div className="academic-card-grid">
                  {filteredIssued.map((student, index) => renderStudentCard(student, "issued", index))}
                </div>
              )}
            </div>
          </Card>

          <Modal show={showIssue} onHide={() => setShowIssue(false)} centered className="academic-modal">
            <Modal.Header closeButton className="border-0 pb-0">
              <Modal.Title className="fw-bold">Issue Degree Certificate</Modal.Title>
            </Modal.Header>
            <Modal.Body className="pt-2">
              <Alert variant="info" className="rounded-4 border-0">
                You are issuing the final degree from the academic department. This action will complete the clearance workflow.
              </Alert>

              <div className="mb-3">
                <div className="fw-bold">{selectedStudent?.studentName}</div>
                <div className="text-muted small">{selectedStudent?.studentEmail}</div>
              </div>

              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Degree Title</Form.Label>
                <Form.Control
                  value={degreeTitle}
                  onChange={(e) => setDegreeTitle(e.target.value)}
                  placeholder="e.g. Bachelor of Science in Computer Science"
                />
              </Form.Group>

              <Form.Group>
                <Form.Label className="fw-bold">Remarks</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={issueRemarks}
                  onChange={(e) => setIssueRemarks(e.target.value)}
                  placeholder="Optional issuance remarks..."
                />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer className="border-0 pt-0">
              <Button variant="light" className="rounded-pill px-4" onClick={() => setShowIssue(false)}>
                Cancel
              </Button>
              <Button className="academic-cta" onClick={handleIssueDegree} disabled={actionLoading}>
                {actionLoading ? <Spinner size="sm" className="me-2" /> : null}
                Confirm & Issue Degree
              </Button>
            </Modal.Footer>
          </Modal>
        </Container>
      </DepartmentLayout>
    </ProtectedRoute>
  );
}