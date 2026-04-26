"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Badge, Button, Card, Container, Form, Modal, Spinner } from "react-bootstrap";
import ProtectedRoute from "@/components/ProtectedRoute";
import ExaminerLayout from "@/components/layout/ExaminerLayout";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { approveFinal, getClearedStudents, getIssuedDegrees } from "@/lib/clearanceService";

const TABS = [
  { id: "pending", label: "Pending Review", icon: "⚖️" },
  { id: "approved", label: "Approved by Examiner", icon: "✅" },
  { id: "issued", label: "Degree Ledger", icon: "🎓" },
];

const AVATAR_GRADS = [
  "linear-gradient(135deg,#6366F1,#4F46E5)",
  "linear-gradient(135deg,#059669,#10B981)",
  "linear-gradient(135deg,#D97706,#F59E0B)",
  "linear-gradient(135deg,#7C3AED,#8B5CF6)",
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

export default function ExaminerDashboard() {
  const { profile, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [clearedStudents, setClearedStudents] = useState([]);
  const [issuedDegrees, setIssuedDegrees] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [reviewStudent, setReviewStudent] = useState(null);
  const [comments, setComments] = useState("");

  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError("");

      const [resCleared, resIssued] = await Promise.all([getClearedStudents(), getIssuedDegrees()]);
      if (!resCleared.success) throw new Error(resCleared.error);
      if (!resIssued.success) throw new Error(resIssued.error);

      setClearedStudents(resCleared.data || []);
      setIssuedDegrees(resIssued.data || []);
    } catch (e) {
      setError(e?.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && profile) {
      fetchData();

      const channel = supabase
        .channel("examiner-dashboard-live")
        .on("postgres_changes", { event: "*", schema: "public", table: "clearance_requests" }, () => fetchData(true))
        .on("postgres_changes", { event: "*", schema: "public", table: "degrees" }, () => fetchData(true))
        .subscribe();

      return () => supabase.removeChannel(channel);
    }
  }, [authLoading, profile, fetchData]);

  const handleApproveFinal = async () => {
    if (!reviewStudent) return;
    setActionLoading(true);
    try {
      const result = await approveFinal(reviewStudent.id, comments);
      if (!result.success) throw new Error(result.error);
      setSuccess(`Clearance approved for ${reviewStudent.studentName}`);
      setShowReview(false);
      setReviewStudent(null);
      setComments("");
      await fetchData(true);
      setActiveTab("approved");
    } catch (e) {
      setError(e?.message || "Approval failed");
    } finally {
      setActionLoading(false);
    }
  };

  const pendingStudents = useMemo(
    () => clearedStudents.filter((student) => !student.isCleared || student.overallStatus !== "approved"),
    [clearedStudents]
  );
  const approvedStudents = useMemo(
    () => clearedStudents.filter((student) => student.isCleared && student.overallStatus === "approved"),
    [clearedStudents]
  );

  const stats = useMemo(() => ({
    pending: pendingStudents.length,
    approved: approvedStudents.length,
    issued: issuedDegrees.length,
    total: pendingStudents.length + approvedStudents.length + issuedDegrees.length,
  }), [pendingStudents.length, approvedStudents.length, issuedDegrees.length]);

  const currentList = useMemo(() => {
    let list = [];
    if (activeTab === "pending") list = pendingStudents;
    else if (activeTab === "approved") list = approvedStudents;
    else list = issuedDegrees;

    const query = search.trim().toLowerCase();
    if (!query) return list;

    return list.filter((item) =>
      [item.studentName, item.studentEmail, item.degreeTitle]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [activeTab, pendingStudents, approvedStudents, issuedDegrees, search]);

  return (
    <ProtectedRoute requiredRoles="examiner">
      <ExaminerLayout>
        <Container fluid className="py-4">
          <style jsx global>{`
            @keyframes exFadeUp {
              from { opacity: 0; transform: translateY(18px); }
              to { opacity: 1; transform: translateY(0); }
            }

            @keyframes exGlow {
              0%, 100% { box-shadow: 0 12px 30px rgba(67,56,202,0.18); }
              50% { box-shadow: 0 16px 36px rgba(67,56,202,0.30); }
            }

            .ex-hero {
              position: relative;
              overflow: hidden;
              background: linear-gradient(135deg, #0f172a 0%, #312e81 45%, #4338ca 100%);
              border-radius: 28px;
              padding: 2.2rem;
              color: #fff;
              margin-bottom: 1.6rem;
              animation: exFadeUp 0.55s ease-out;
            }

            .ex-hero::after {
              content: "";
              position: absolute;
              inset: 0;
              background: radial-gradient(circle at top right, rgba(255,255,255,0.14), transparent 34%);
              pointer-events: none;
            }

            .ex-chip {
              display: inline-flex;
              align-items: center;
              gap: 0.5rem;
              padding: 0.35rem 0.9rem;
              border-radius: 999px;
              background: rgba(255,255,255,0.15);
              font-size: 0.72rem;
              font-weight: 800;
              letter-spacing: 0.08em;
              text-transform: uppercase;
              margin-bottom: 0.9rem;
            }

            .ex-title {
              font-size: clamp(1.8rem, 2.6vw, 2.7rem);
              font-weight: 900;
              line-height: 1.05;
              margin-bottom: 0.7rem;
            }

            .ex-subtitle {
              max-width: 760px;
              color: rgba(255,255,255,0.82);
              margin-bottom: 0;
            }

            .ex-stat-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
              gap: 1rem;
              margin-bottom: 1.6rem;
            }

            .ex-stat-card {
              background: linear-gradient(180deg, rgba(15,23,42,0.96) 0%, rgba(30,41,59,0.96) 100%);
              border-radius: 22px;
              padding: 1.35rem;
              border: 1px solid rgba(148,163,184,0.14);
              transition: transform 0.25s ease, box-shadow 0.25s ease;
              animation: exFadeUp 0.5s ease-out backwards;
            }

            .ex-stat-card:hover {
              transform: translateY(-6px);
              box-shadow: 0 18px 38px rgba(15, 23, 42, 0.28);
            }

            .ex-stat-icon {
              width: 48px;
              height: 48px;
              border-radius: 16px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #fff;
              font-size: 1.25rem;
              margin-bottom: 1rem;
              animation: exGlow 3s infinite ease-in-out;
            }

            .ex-stat-value { font-size: 2.2rem; font-weight: 900; color: #f8fafc; line-height: 1; }
            .ex-stat-label { margin-top: 0.3rem; font-weight: 800; color: #e2e8f0; }
            .ex-stat-sub { color: #94a3b8; font-size: 0.82rem; }

            .ex-panel {
              background: linear-gradient(180deg, rgba(15,23,42,0.96) 0%, rgba(17,24,39,0.96) 100%);
              border-radius: 28px;
              border: 1px solid rgba(148,163,184,0.14);
              box-shadow: 0 12px 36px rgba(15, 23, 42, 0.2);
              overflow: hidden;
            }

            .ex-panel-head {
              display: flex;
              gap: 1rem;
              flex-wrap: wrap;
              justify-content: space-between;
              align-items: center;
              padding: 1.3rem 1.4rem;
              border-bottom: 1px solid rgba(148,163,184,0.14);
              background: linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(30,41,59,0.94) 100%);
            }

            .ex-tabs {
              display: flex;
              gap: 0.45rem;
              padding: 0.35rem;
              border-radius: 999px;
              background: rgba(15,23,42,0.8);
              border: 1px solid rgba(148,163,184,0.14);
              flex-wrap: wrap;
            }

            .ex-tab-btn {
              border: none;
              border-radius: 999px;
              padding: 0.68rem 1rem;
              font-weight: 800;
              font-size: 0.86rem;
              color: #cbd5e1;
              background: transparent;
              transition: all 0.2s ease;
            }

            .ex-tab-btn:hover { background: rgba(96,165,250,0.14); color: #f8fafc; }
            .ex-tab-btn--active { background: linear-gradient(135deg, #4338ca 0%, #6366f1 100%); color: #fff !important; box-shadow: 0 8px 18px rgba(67,56,202,0.22); }

            .ex-search-wrap { position: relative; }
            .ex-search {
              min-width: min(100%, 320px);
              border: 1px solid rgba(148,163,184,0.2);
              border-radius: 16px;
              background: rgba(15,23,42,0.85);
              color: #f8fafc;
              padding: 0.9rem 1rem 0.9rem 2.8rem;
              box-shadow: inset 0 1px 1px rgba(15,23,42,0.2);
            }
            .ex-search::placeholder { color: #94a3b8; }
            .ex-search-icon { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: #94a3b8; }

            .ex-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
              gap: 1rem;
              padding: 1.4rem;
            }

            .ex-card {
              border: 1px solid rgba(148,163,184,0.14);
              border-radius: 22px;
              padding: 1.2rem;
              background: linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(30,41,59,0.95) 100%);
              transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
              height: 100%;
              animation: exFadeUp 0.45s ease-out backwards;
            }

            .ex-card:hover {
              transform: translateY(-5px);
              border-color: rgba(96,165,250,0.34);
              box-shadow: 0 18px 34px rgba(15, 23, 42, 0.24);
            }

            .ex-card-top { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; }
            .ex-avatar {
              width: 50px;
              height: 50px;
              border-radius: 16px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #fff;
              font-weight: 900;
              font-size: 1rem;
              flex-shrink: 0;
              box-shadow: 0 10px 22px rgba(15, 23, 42, 0.18);
            }

            .ex-muted { color: #94a3b8; }
            .ex-name { font-size: 1.02rem; font-weight: 900; color: #f8fafc; }
            .ex-email { font-size: 0.82rem; color: #cbd5e1; word-break: break-word; }

            .ex-progress {
              height: 8px;
              border-radius: 999px;
              background: #e2e8f0;
              overflow: hidden;
            }

            .ex-progress > div {
              height: 100%;
              border-radius: 999px;
              background: linear-gradient(90deg, #4338ca 0%, #6366f1 100%);
            }

            .ex-card-actions { display: flex; gap: 0.75rem; margin-top: 1rem; flex-wrap: wrap; }
            .ex-btn {
              border: none;
              border-radius: 14px;
              padding: 0.78rem 1rem;
              font-weight: 800;
              font-size: 0.88rem;
              transition: transform 0.2s ease, box-shadow 0.2s ease;
            }
            .ex-btn:hover { transform: translateY(-2px); }
            .ex-btn-primary { background: linear-gradient(135deg, #4338ca 0%, #6366f1 100%); color: #fff; box-shadow: 0 10px 20px rgba(67,56,202,0.18); }

            .ex-empty {
              text-align: center;
              padding: 4rem 1rem;
              color: #cbd5e1;
            }

            .ex-soft-badge {
              background: rgba(15,23,42,0.78) !important;
              border: 1px solid rgba(148,163,184,0.2) !important;
              color: #e2e8f0 !important;
            }

            .ex-modal .modal-content { border: 1px solid rgba(148,163,184,0.2); border-radius: 28px; overflow: hidden; box-shadow: 0 32px 70px rgba(15, 23, 42, 0.45); background: linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(30,41,59,0.98) 100%); color: #e2e8f0; }
            .ex-modal-head { background: linear-gradient(135deg, #111827 0%, #312e81 100%); color: #fff; border: none; }
            .ex-modal .btn-close { filter: invert(1) brightness(2); }
            .ex-review-card { background: rgba(15,23,42,0.8) !important; border: 1px solid rgba(148,163,184,0.16) !important; }
            .ex-modal .text-muted { color: #94a3b8 !important; }
            .ex-modal .border-bottom { border-color: rgba(148,163,184,0.16) !important; }
            .ex-modal textarea.form-control {
              background: rgba(15,23,42,0.85);
              border: 1px solid rgba(148,163,184,0.2);
              color: #f8fafc;
            }
            .ex-modal textarea.form-control::placeholder { color: #94a3b8; }

            @media (max-width: 768px) {
              .ex-hero { padding: 1.4rem; }
              .ex-panel-head { padding: 1rem; }
              .ex-grid { padding: 1rem; }
            }
          `}</style>

          <div className="ex-hero">
            <div style={{ position: "relative", zIndex: 1 }}>
              <div className="ex-chip">🏛️ Examiner Review Hub</div>
              <h1 className="ex-title">Review clearance, then hand it off to Academic Issuance</h1>
              <p className="ex-subtitle">
                Examiner responsibility is limited to final review and approval. Degree issuance is handled by the academic department after all clearances are complete.
              </p>
            </div>
            <Button
              variant="light"
              onClick={() => fetchData()}
              disabled={loading}
              className="fw-bold"
              style={{ position: "absolute", top: "1.4rem", right: "1.4rem", borderRadius: "999px" }}
            >
              {loading ? <Spinner size="sm" className="me-2" /> : "↻"} Refresh
            </Button>
          </div>

          {error ? <Alert variant="danger" className="border-0 shadow-sm rounded-4">{error}</Alert> : null}
          {success ? <Alert variant="success" className="border-0 shadow-sm rounded-4">{success}</Alert> : null}

          <div className="ex-stat-grid">
            {[
              { label: "Pending Review", sub: "Awaiting examiner decision", value: stats.pending, icon: "⚖️", color: "linear-gradient(135deg,#6366F1,#4F46E5)" },
              { label: "Approved by Examiner", sub: "Sent to academic department", value: stats.approved, icon: "✅", color: "linear-gradient(135deg,#059669,#10B981)" },
              { label: "Degree Ledger", sub: "Official records issued", value: stats.issued, icon: "🎓", color: "linear-gradient(135deg,#D97706,#F59E0B)" },
              { label: "Active Pipeline", sub: "Total tracked records", value: stats.total, icon: "📊", color: "linear-gradient(135deg,#7C3AED,#8B5CF6)" },
            ].map((item, index) => (
              <div key={item.label} className="ex-stat-card" style={{ animationDelay: `${index * 0.08}s` }}>
                <div className="ex-stat-icon" style={{ background: item.color }}>{item.icon}</div>
                <div className="ex-stat-value">{item.value}</div>
                <div className="ex-stat-label">{item.label}</div>
                <div className="ex-stat-sub">{item.sub}</div>
              </div>
            ))}
          </div>

          <Card className="ex-panel">
            <div className="ex-panel-head">
              <div className="ex-tabs">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`ex-tab-btn ${activeTab === tab.id ? "ex-tab-btn--active" : ""}`}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              <div className="ex-search-wrap">
                <span className="ex-search-icon">🔎</span>
                <Form.Control
                  className="ex-search"
                  placeholder="Search student, email, or degree title..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {loading && currentList.length === 0 ? (
              <div className="ex-empty">
                <Spinner animation="border" variant="primary" className="mb-3" />
                <p className="mb-0 fw-semibold">Synchronizing records...</p>
              </div>
            ) : currentList.length === 0 ? (
              <div className="ex-empty">
                <div style={{ fontSize: "3rem" }}>🗂️</div>
                <h5 className="fw-bold mt-2 mb-1">Queue Empty</h5>
                <p className="mb-0">No records match the selected tab.</p>
              </div>
            ) : (
              <div className="ex-grid">
                {currentList.map((student, idx) => {
                  const grad = AVATAR_GRADS[idx % AVATAR_GRADS.length];
                  const clearedPct = student.totalDepts ? Math.round((student.clearedCount / student.totalDepts) * 100) : 0;
                  return (
                    <Card key={student.id} className="ex-card" style={{ animationDelay: `${idx * 0.05}s` }}>
                      <div className="ex-card-top">
                        <div className="d-flex align-items-center gap-3">
                          <div className="ex-avatar" style={{ background: grad }}>{initials(student.studentName)}</div>
                          <div>
                            <div className="ex-name">{student.studentName}</div>
                            <div className="ex-email">{student.studentEmail}</div>
                          </div>
                        </div>

                        <Badge className="rounded-pill px-3 py-2 ex-soft-badge">
                          {activeTab === "issued" ? "Ledger" : `${student.clearedCount || 0}/${student.totalDepts || 0}`}
                        </Badge>
                      </div>

                      <div className="mt-3 d-flex align-items-center justify-content-between gap-2 flex-wrap">
                        {activeTab === "pending" ? (
                          <Badge bg="warning" text="dark" className="rounded-pill px-3 py-2">Awaiting approval</Badge>
                        ) : activeTab === "approved" ? (
                          <Badge bg="success" className="rounded-pill px-3 py-2">Approved by examiner</Badge>
                        ) : (
                          <Badge bg="success" className="rounded-pill px-3 py-2">Degree issued</Badge>
                        )}
                        <span className="ex-muted small">{timeAgo(student.submittedAt || student.issuedAt)}</span>
                      </div>

                      {activeTab !== "issued" ? (
                        <>
                          <div className="mt-3">
                            <div className="d-flex justify-content-between small mb-2">
                              <span className="ex-muted">Clearance progress</span>
                              <strong>{clearedPct}%</strong>
                            </div>
                            <div className="ex-progress"><div style={{ width: `${clearedPct}%` }} /></div>
                          </div>

                          <div className="ex-card-actions">
                            {activeTab === "pending" ? (
                              <Button className="ex-btn ex-btn-primary flex-grow-1" onClick={() => { setReviewStudent(student); setComments(""); setShowReview(true); }}>
                                Review & Approve
                              </Button>
                            ) : (
                              <Badge className="rounded-pill px-3 py-2 ex-soft-badge">Sent to Academic Department</Badge>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="mt-3">
                          <div className="d-flex justify-content-between small mb-2">
                            <span className="ex-muted">Degree title</span>
                            <strong>{student.degreeTitle || "Official Degree"}</strong>
                          </div>
                          <Badge className="rounded-pill px-3 py-2 ex-soft-badge">QR: {student.qrCode || "N/A"}</Badge>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </Card>

          <Modal show={showReview} onHide={() => setShowReview(false)} centered size="lg" className="ex-modal">
            <div className="ex-modal-head">
              <Modal.Header closeButton>
                <Modal.Title className="fw-bold">Final Review</Modal.Title>
              </Modal.Header>
            </div>
            <Modal.Body className="p-4">
              <Card className="border-0 rounded-4 p-3 mb-4 ex-review-card">
                <div className="d-flex align-items-center gap-3">
                  <div className="ex-avatar" style={{ background: "linear-gradient(135deg,#111827,#4338ca)" }}>{initials(reviewStudent?.studentName)}</div>
                  <div>
                    <h5 className="fw-bold mb-1">{reviewStudent?.studentName}</h5>
                    <div className="text-muted small">{reviewStudent?.studentEmail}</div>
                  </div>
                </div>
              </Card>

              <div className="mb-3">
                <div className="fw-bold mb-2">Department Clearances</div>
                {reviewStudent?.departmentStatuses?.map((dept) => (
                  <div key={dept.deptId || dept.deptName} className="d-flex justify-content-between align-items-center py-2 border-bottom">
                    <div>
                      <div className="fw-semibold">{dept.deptName}</div>
                      <div className="small text-muted">{dept.remarks || "No remarks"}</div>
                    </div>
                    <Badge bg={dept.status === "approved" ? "success" : dept.status === "rejected" ? "danger" : "warning"} className="rounded-pill px-3 py-2">
                      {dept.status}
                    </Badge>
                  </div>
                ))}
              </div>

              <Form.Group>
                <Form.Label className="fw-bold">Examiner remarks</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Add optional final remarks..."
                />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer className="border-0 px-4 pb-4 pt-0">
              <Button variant="light" className="rounded-pill px-4" onClick={() => setShowReview(false)}>
                Cancel
              </Button>
              <Button className="ex-btn ex-btn-primary" onClick={handleApproveFinal} disabled={actionLoading}>
                {actionLoading ? <Spinner size="sm" className="me-2" /> : null}
                Approve Final Clearance
              </Button>
            </Modal.Footer>
          </Modal>
        </Container>
      </ExaminerLayout>
    </ProtectedRoute>
  );
}