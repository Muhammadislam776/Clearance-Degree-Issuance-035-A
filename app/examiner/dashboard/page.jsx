"use client";
import React, { useEffect, useState, useCallback } from "react";
import {
  Container, Row, Col, Card, Badge, Button,
  Alert, Spinner, Modal, Form, Table,
} from "react-bootstrap";
import ProtectedRoute from "@/components/ProtectedRoute";
import ExaminerLayout from "@/components/layout/ExaminerLayout";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { getClearedStudents, approveFinal, issueDegree } from "@/lib/clearanceService";

/* ================================================================
   EXAMINER DASHBOARD — Full Workflow
   1. View fully-cleared students (all depts approved, degree not issued)
   2. Review a student's department-by-department clearance
   3. Approve the final clearance
   4. Issue the degree
================================================================ */

/* ── tiny helpers ────────────────────────────────────────────── */
function initials(name = "") {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
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

/* ── stat card component ──────────────────────────────────────── */
function StatCard({ icon, label, value, gradient, delay = 0 }) {
  return (
    <Col lg={3} sm={6}>
      <div
        className="ex-stat-card"
        style={{ background: gradient, animationDelay: `${delay}ms` }}
      >
        <div className="ex-stat-icon">{icon}</div>
        <div className="ex-stat-value">{value}</div>
        <div className="ex-stat-label">{label}</div>
        <div className="ex-stat-orb" />
      </div>
    </Col>
  );
}

/* ================================================================
   MAIN COMPONENT
================================================================ */
export default function ExaminerDashboard() {
  const { profile, loading: authLoading } = useAuth();

  /* ── state ─────────────────────────────────────────────── */
  const [loading, setLoading] = useState(true);
  const [cleared, setCleared] = useState([]);       // fully-cleared students
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState(null); // id of row being acted on
  const [issuedCount, setIssuedCount] = useState(0);

  // Review modal
  const [showReview, setShowReview] = useState(false);
  const [reviewStudent, setReviewStudent] = useState(null);
  const [comments, setComments] = useState("");

  // Issue degree modal
  const [showIssue, setShowIssue] = useState(false);
  const [issueStudent, setIssueStudent] = useState(null);
  const [degreeTitle, setDegreeTitle] = useState("");
  const [issueComments, setIssueComments] = useState("");

  /* ── data fetch ────────────────────────────────────────── */
  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError("");

      const result = await getClearedStudents();
      if (!result.success) throw new Error(result.error);

      setCleared(result.data || []);

      // Also fetch issued count for stats
      const { count } = await supabase
        .from("clearance_requests")
        .select("id", { count: "exact", head: true })
        .eq("degree_issued", true);
      setIssuedCount(count || 0);

    } catch (e) {
      console.error("Dashboard fetch:", e);
      setError(e.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── mount + real-time ──────────────────────────────────── */
  useEffect(() => {
    if (!authLoading && profile) {
      fetchData();
      const ch = supabase
        .channel("examiner-live")
        .on("postgres_changes", { event: "*", schema: "public", table: "clearance_requests" }, () => fetchData(true))
        .on("postgres_changes", { event: "*", schema: "public", table: "clearance_status" }, () => fetchData(true))
        .subscribe();
      return () => supabase.removeChannel(ch);
    }
  }, [authLoading, profile, fetchData]);

  /* ── actions ────────────────────────────────────────────── */

  // Open review modal
  const handleOpenReview = (student) => {
    setReviewStudent(student);
    setComments("");
    setShowReview(true);
  };

  // Approve final clearance
  const handleApproveFinal = async () => {
    if (!reviewStudent) return;
    setActionLoading(reviewStudent.id);
    try {
      const result = await approveFinal(reviewStudent.id, comments);
      if (!result.success) throw new Error(result.error);
      setSuccess(`✅ Clearance approved for ${reviewStudent.studentName}`);
      setShowReview(false);
      await fetchData(true);
    } catch (e) {
      setError(e.message || "Approval failed");
    } finally {
      setActionLoading(null);
    }
  };

  // Open issue degree modal
  const handleOpenIssue = (student) => {
    setIssueStudent(student);
    setDegreeTitle("");
    setIssueComments("");
    setShowIssue(true);
  };

  // Issue degree
  const handleIssueDegree = async () => {
    if (!issueStudent) return;
    setActionLoading(issueStudent.id);
    try {
      const title = degreeTitle.trim() || "Official Degree";
      const result = await issueDegree(issueStudent.id, issueStudent.studentId, title, issueComments);
      if (!result.success) throw new Error(result.error);
      setSuccess(`🎓 Degree issued to ${issueStudent.studentName}!`);
      setShowIssue(false);
      await fetchData(true);
    } catch (e) {
      setError(e.message || "Degree issuance failed");
    } finally {
      setActionLoading(null);
    }
  };

  /* ── filtered list ──────────────────────────────────────── */
  const filtered = cleared.filter(
    (s) =>
      s.studentName.toLowerCase().includes(search.toLowerCase()) ||
      s.studentEmail.toLowerCase().includes(search.toLowerCase())
  );

  /* ── render ─────────────────────────────────────────────── */
  return (
    <ProtectedRoute requiredRoles="examiner">
      <ExaminerLayout>
        {/* ── Scoped Styles ─────────────────────────────── */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

          .ex-page {
            font-family: 'Inter', -apple-system, sans-serif;
            background: linear-gradient(180deg, #f0f2f9 0%, #e8ebf5 100%);
            min-height: 100vh;
            padding: 1.5rem;
          }

          /* ── Hero ──────────────────────────────────── */
          .ex-hero {
            background: linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 100%);
            border-radius: 28px;
            padding: 2.5rem 2.8rem;
            color: #fff;
            position: relative;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(67,56,202,0.35);
            margin-bottom: 2rem;
          }
          .ex-hero::before {
            content: '';
            position: absolute; top: -80px; right: -80px;
            width: 350px; height: 350px;
            background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%);
            border-radius: 50%;
          }
          .ex-hero::after {
            content: '';
            position: absolute; bottom: -100px; left: 30%;
            width: 280px; height: 280px;
            background: radial-gradient(circle, rgba(165,180,252,0.1) 0%, transparent 70%);
            border-radius: 50%;
          }
          .ex-hero-badge {
            background: rgba(255,255,255,0.14);
            border-radius: 99px;
            padding: 0.3rem 1rem;
            font-size: 0.7rem;
            font-weight: 700;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            display: inline-block;
            margin-bottom: 0.8rem;
          }
          .ex-hero h1 {
            font-size: 2.4rem;
            font-weight: 900;
            line-height: 1.15;
            margin-bottom: 0.6rem;
          }
          .ex-hero h1 span { color: #a5b4fc; }
          .ex-hero-desc {
            opacity: 0.72;
            max-width: 500px;
            line-height: 1.7;
            font-size: 0.92rem;
          }
          .ex-hero-glass {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(12px);
            border-radius: 18px;
            padding: 1rem 1.5rem;
            text-align: center;
          }
          .ex-hero-glass .num { font-size: 2.2rem; font-weight: 900; }
          .ex-hero-glass .lbl { font-size: 0.68rem; opacity: 0.7; letter-spacing: 1px; text-transform: uppercase; }

          /* ── Stat Cards ────────────────────────────── */
          .ex-stat-card {
            border-radius: 22px;
            padding: 1.5rem 1.7rem;
            color: #fff;
            position: relative;
            overflow: hidden;
            box-shadow: 0 8px 32px rgba(0,0,0,0.18);
            animation: exFadeUp 0.5s ease both;
            transition: transform 0.22s;
          }
          .ex-stat-card:hover { transform: translateY(-4px); }
          .ex-stat-icon { font-size: 2rem; margin-bottom: 0.3rem; }
          .ex-stat-value { font-size: 2.4rem; font-weight: 900; line-height: 1; }
          .ex-stat-label {
            font-size: 0.72rem; font-weight: 600;
            letter-spacing: 1px; opacity: 0.85;
            text-transform: uppercase; margin-top: 0.25rem;
          }
          .ex-stat-orb {
            position: absolute; bottom: -20px; right: -20px;
            width: 110px; height: 110px;
            background: rgba(255,255,255,0.12); border-radius: 50%;
          }
          @keyframes exFadeUp {
            from { opacity: 0; transform: translateY(24px); }
            to   { opacity: 1; transform: translateY(0); }
          }

          /* ── Table Card ────────────────────────────── */
          .ex-table-card {
            border: none;
            border-radius: 28px;
            overflow: hidden;
            box-shadow: 0 4px 24px rgba(0,0,0,0.06);
          }
          .ex-table-header {
            padding: 1.4rem 1.8rem;
            border-bottom: 1px solid #f1f5f9;
            display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;
            background: #fff;
          }
          .ex-table-header h4 { font-weight: 800; color: #1e1b4b; margin: 0; }
          .ex-table-header p { color: #94a3b8; font-size: 0.82rem; margin: 0; }
          .ex-search {
            border: 2px solid #e2e8f0;
            border-radius: 14px;
            padding: 0.6rem 1.1rem;
            font-size: 0.88rem;
            outline: none;
            transition: border 0.2s;
            width: 100%;
            max-width: 260px;
            background: #fafbff;
            font-family: inherit;
          }
          .ex-search:focus { border-color: #4338ca; }

          /* ── Table ─────────────────────────────────── */
          .ex-tbl { width: 100%; border-collapse: collapse; }
          .ex-tbl thead th {
            background: #f8fafc;
            font-size: 0.68rem;
            letter-spacing: 1.2px;
            text-transform: uppercase;
            font-weight: 700;
            color: #64748b;
            padding: 0.9rem 1.2rem;
            border: none;
          }
          .ex-tbl tbody tr {
            transition: background 0.15s;
            border-bottom: 1px solid #f1f5f9;
          }
          .ex-tbl tbody tr:hover { background: #f5f3ff; }
          .ex-tbl td { padding: 1rem 1.2rem; vertical-align: middle; border: none; }

          /* ── Avatar ────────────────────────────────── */
          .ex-av {
            width: 44px; height: 44px; border-radius: 14px;
            display: flex; align-items: center; justify-content: center;
            font-weight: 800; font-size: 0.95rem;
            background: linear-gradient(135deg, #c7d2fe, #818cf8);
            color: #312e81; flex-shrink: 0;
          }

          /* ── Buttons ───────────────────────────────── */
          .btn-ex-review {
            background: linear-gradient(135deg, #4338ca, #6366f1);
            color: #fff; border: none; border-radius: 11px;
            padding: 0.4rem 1rem; font-size: 0.8rem; font-weight: 700;
            cursor: pointer; transition: all 0.18s; font-family: inherit;
          }
          .btn-ex-review:hover { opacity: 0.85; transform: scale(1.04); box-shadow: 0 4px 14px rgba(67,56,202,0.3); }

          .btn-ex-issue {
            background: linear-gradient(135deg, #059669, #10b981);
            color: #fff; border: none; border-radius: 11px;
            padding: 0.4rem 1rem; font-size: 0.8rem; font-weight: 700;
            cursor: pointer; transition: all 0.18s; font-family: inherit;
          }
          .btn-ex-issue:hover { opacity: 0.85; transform: scale(1.04); box-shadow: 0 4px 14px rgba(5,150,105,0.3); }

          /* ── Dept pills in modal ───────────────────── */
          .dept-row {
            display: flex; align-items: center; justify-content: space-between;
            padding: 0.7rem 1rem;
            border-radius: 12px;
            background: #f8fafc;
            margin-bottom: 0.5rem;
            transition: background 0.15s;
          }
          .dept-row:hover { background: #f0f4ff; }
          .dept-name { font-weight: 600; font-size: 0.88rem; color: #1e293b; }
          .dept-badge-ok {
            background: #dcfce7; color: #166534;
            border-radius: 99px; padding: 0.22rem 0.8rem;
            font-size: 0.72rem; font-weight: 700;
          }

          /* ── Empty ─────────────────────────────────── */
          .ex-empty { padding: 4rem 2rem; text-align: center; color: #94a3b8; }
          .ex-empty .icon { font-size: 4rem; margin-bottom: 1rem; opacity: 0.45; }
          .ex-empty h5 { font-weight: 700; color: #475569; }

          /* ── Footer ────────────────────────────────── */
          .ex-table-footer {
            padding: 0.9rem 1.8rem;
            border-top: 1px solid #f1f5f9;
            background: #fafbff;
            display: flex; justify-content: space-between; align-items: center;
            font-size: 0.78rem; color: #94a3b8;
          }

          /* ── Modal ─────────────────────────────────── */
          .ex-modal .modal-content { border: none; border-radius: 24px; overflow: hidden; }
          .ex-modal-header {
            background: linear-gradient(135deg, #1e1b4b, #4338ca);
            color: #fff;
            padding: 1.5rem 1.8rem;
          }
          .ex-modal-header .btn-close { filter: brightness(0) invert(1); }
          .ex-modal-body { padding: 1.8rem; }
          .ex-modal-footer { padding: 1rem 1.8rem; border-top: 1px solid #f1f5f9; }

          .issue-modal .modal-content { border: none; border-radius: 24px; overflow: hidden; }
          .issue-modal-header {
            background: linear-gradient(135deg, #064e3b, #059669);
            color: #fff;
            padding: 1.5rem 1.8rem;
          }
          .issue-modal-header .btn-close { filter: brightness(0) invert(1); }

          /* ── Responsive ────────────────────────────── */
          @media (max-width: 768px) {
            .ex-hero { padding: 1.5rem; }
            .ex-hero h1 { font-size: 1.6rem; }
            .ex-table-header { flex-direction: column; align-items: stretch; }
            .ex-search { max-width: 100%; }
          }
        `}</style>

        <div className="ex-page">

          {/* ═══ HERO ═══════════════════════════════════ */}
          <div className="ex-hero">
            <div style={{ position: "relative", zIndex: 2 }}>
              <Row className="align-items-center g-4">
                <Col md={7}>
                  <div className="ex-hero-badge">🏛️ Examination Authority</div>
                  <h1>
                    Degree Issuance<br /><span>Control Center</span>
                  </h1>
                  <p className="ex-hero-desc">
                    Final verification gateway — review fully-cleared students,
                    approve clearances, and issue official degrees.
                  </p>
                </Col>
                <Col md={5} className="text-md-end">
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem", alignItems: "flex-end" }}>
                    <div className="ex-hero-glass">
                      <div className="num">{cleared.length}</div>
                      <div className="lbl">Ready for Review</div>
                    </div>
                    <Button
                      onClick={() => fetchData()}
                      disabled={loading}
                      style={{
                        background: "rgba(255,255,255,0.14)", border: "2px solid rgba(255,255,255,0.35)",
                        color: "#fff", borderRadius: "12px", padding: "0.55rem 1.4rem",
                        fontWeight: 700, backdropFilter: "blur(8px)",
                      }}
                    >
                      {loading ? <Spinner size="sm" /> : "↻ Refresh"}
                    </Button>
                  </div>
                </Col>
              </Row>
            </div>
          </div>

          {/* ═══ ALERTS ═════════════════════════════════ */}
          {error && (
            <Alert variant="danger" className="border-0 shadow-sm mb-3" dismissible onClose={() => setError("")}
              style={{ borderRadius: "16px" }}>
              ⚠️ {error}
            </Alert>
          )}
          {success && (
            <Alert variant="success" className="border-0 shadow-sm mb-3" dismissible onClose={() => setSuccess("")}
              style={{ borderRadius: "16px" }}>
              {success}
            </Alert>
          )}

          {/* ═══ STAT CARDS ═════════════════════════════ */}
          <Row className="g-4 mb-4">
            <StatCard icon="⚖️" label="Ready for Review" value={cleared.length}
              gradient="linear-gradient(135deg,#4338ca,#7c3aed)" delay={0} />
            <StatCard icon="🎓" label="Degrees Issued" value={issuedCount}
              gradient="linear-gradient(135deg,#059669,#10b981)" delay={80} />
            <StatCard icon="📑" label="Pending Approval" value={cleared.filter(s => s.overallStatus !== "approved").length}
              gradient="linear-gradient(135deg,#d97706,#f59e0b)" delay={160} />
            <StatCard icon="✅" label="Pre-Approved" value={cleared.filter(s => s.overallStatus === "approved").length}
              gradient="linear-gradient(135deg,#0891b2,#06b6d4)" delay={240} />
          </Row>

          {/* ═══ CLEARED STUDENTS TABLE ══════════════════ */}
          <Card className="ex-table-card">
            <div className="ex-table-header">
              <div style={{ flex: 1, minWidth: "200px" }}>
                <h4>🎓 Fully Cleared Students</h4>
                <p>Students who have been approved by all departments — awaiting final review & degree issuance</p>
              </div>
              <input
                className="ex-search"
                placeholder="🔍 Search student or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {loading && cleared.length === 0 ? (
              <div className="text-center py-5">
                <Spinner animation="grow" variant="primary" />
                <p className="mt-3 text-muted fw-bold" style={{ fontSize: "0.85rem" }}>
                  Loading cleared students…
                </p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="ex-empty">
                <div className="icon">📭</div>
                <h5>No Fully Cleared Students</h5>
                <p style={{ fontSize: "0.85rem" }}>
                  {search
                    ? "No students match your search."
                    : "There are currently no students with all departments approved."}
                </p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="ex-tbl">
                  <thead>
                    <tr>
                      <th style={{ paddingLeft: "1.5rem" }}>Student</th>
                      <th>Departments</th>
                      <th>Submitted</th>
                      <th style={{ textAlign: "center" }}>Status</th>
                      <th style={{ textAlign: "right", paddingRight: "1.5rem" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s) => {
                      const isApproved = s.overallStatus === "approved";
                      const isActing = actionLoading === s.id;
                      return (
                        <tr key={s.id}>
                          {/* Student info */}
                          <td style={{ paddingLeft: "1.5rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                              <div className="ex-av">{initials(s.studentName)}</div>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "#1e293b" }}>
                                  {s.studentName}
                                </div>
                                <div style={{ fontSize: "0.76rem", color: "#94a3b8" }}>
                                  {s.studentEmail}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Department count */}
                          <td>
                            <Badge pill style={{
                              background: "#dcfce7", color: "#166534",
                              fontSize: "0.78rem", fontWeight: 700,
                            }}>
                              ✅ {s.totalDepts}/{s.totalDepts} Cleared
                            </Badge>
                          </td>

                          {/* Submitted date */}
                          <td style={{ fontSize: "0.84rem", color: "#64748b" }}>
                            {s.submittedAt ? new Date(s.submittedAt).toLocaleDateString("en-PK") : "—"}
                            <div style={{ fontSize: "0.7rem", color: "#a1a1aa" }}>{timeAgo(s.submittedAt)}</div>
                          </td>

                          {/* Status */}
                          <td style={{ textAlign: "center" }}>
                            {isApproved ? (
                              <Badge pill style={{
                                background: "#dbeafe", color: "#1e40af",
                                fontSize: "0.76rem", fontWeight: 700, padding: "0.3rem 0.9rem",
                              }}>
                                ✅ Approved — Issue Degree
                              </Badge>
                            ) : (
                              <Badge pill style={{
                                background: "#fef3c7", color: "#92400e",
                                fontSize: "0.76rem", fontWeight: 700, padding: "0.3rem 0.9rem",
                              }}>
                                ⏳ Awaiting Review
                              </Badge>
                            )}
                          </td>

                          {/* Action Buttons */}
                          <td style={{ textAlign: "right", paddingRight: "1.5rem" }}>
                            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                              {!isApproved ? (
                                <button
                                  className="btn-ex-review"
                                  onClick={() => handleOpenReview(s)}
                                  disabled={isActing}
                                >
                                  {isActing ? <Spinner size="sm" /> : "📋 Review"}
                                </button>
                              ) : null}

                              <button
                                className="btn-ex-issue"
                                onClick={() => handleOpenIssue(s)}
                                disabled={isActing}
                              >
                                {isActing ? <Spinner size="sm" /> : "🎓 Issue Degree"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {filtered.length > 0 && (
              <div className="ex-table-footer">
                <span>
                  Showing <strong style={{ color: "#475569" }}>{filtered.length}</strong> of {cleared.length} cleared students
                </span>
                <span style={{ color: "#818cf8", fontWeight: 600 }}>
                  ● Real-time sync active
                </span>
              </div>
            )}
          </Card>
        </div>

        {/* ═══ REVIEW MODAL ═════════════════════════════ */}
        <Modal show={showReview} onHide={() => setShowReview(false)} size="lg" centered className="ex-modal">
          <Modal.Header closeButton className="ex-modal-header">
            <Modal.Title style={{ fontWeight: 800, fontSize: "1.2rem" }}>
              📋 Final Review — {reviewStudent?.studentName}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="ex-modal-body">
            {reviewStudent && (
              <>
                {/* Student info card */}
                <div style={{
                  background: "linear-gradient(135deg, #ede9fe, #f0f4ff)",
                  borderRadius: "16px", padding: "1.2rem 1.5rem",
                  marginBottom: "1.5rem",
                  display: "flex", alignItems: "center", gap: "1rem",
                }}>
                  <div className="ex-av" style={{ width: 52, height: 52, fontSize: "1.1rem" }}>
                    {initials(reviewStudent.studentName)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "1rem", color: "#1e1b4b" }}>
                      {reviewStudent.studentName}
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "#6366f1" }}>
                      {reviewStudent.studentEmail}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.15rem" }}>
                      Submitted: {new Date(reviewStudent.submittedAt).toLocaleString("en-PK")}
                    </div>
                  </div>
                </div>

                {/* Department-by-department clearances */}
                <h6 style={{ fontWeight: 700, marginBottom: "0.75rem", color: "#1e1b4b" }}>
                  Department Clearance Status
                </h6>
                <div style={{ marginBottom: "1.5rem" }}>
                  {reviewStudent.departmentStatuses.map((d, i) => (
                    <div className="dept-row" key={i}>
                      <div className="dept-name">{d.deptName}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        {d.remarks && (
                          <span style={{ fontSize: "0.72rem", color: "#64748b", maxWidth: "200px", textAlign: "right" }}>
                            {d.remarks}
                          </span>
                        )}
                        <span className="dept-badge-ok">✅ Approved</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Examiner comments */}
                <Form.Group className="mb-3">
                  <Form.Label style={{ fontWeight: 700, fontSize: "0.88rem", color: "#1e1b4b" }}>
                    Examiner Remarks (optional)
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Add any notes before approving the final clearance…"
                    style={{ borderRadius: "12px", border: "2px solid #e2e8f0" }}
                  />
                </Form.Group>
              </>
            )}
          </Modal.Body>
          <Modal.Footer className="ex-modal-footer">
            <Button variant="light" onClick={() => setShowReview(false)} style={{ borderRadius: "10px" }}>
              Cancel
            </Button>
            <Button
              onClick={handleApproveFinal}
              disabled={actionLoading === reviewStudent?.id}
              style={{
                background: "linear-gradient(135deg, #4338ca, #6366f1)",
                border: "none", borderRadius: "10px", fontWeight: 700,
                padding: "0.5rem 1.5rem",
              }}
            >
              {actionLoading === reviewStudent?.id ? (
                <><Spinner size="sm" className="me-2" /> Approving…</>
              ) : (
                "✅ Approve Final Clearance"
              )}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* ═══ ISSUE DEGREE MODAL ═══════════════════════ */}
        <Modal show={showIssue} onHide={() => setShowIssue(false)} centered className="issue-modal">
          <Modal.Header closeButton className="issue-modal-header">
            <Modal.Title style={{ fontWeight: 800, fontSize: "1.15rem" }}>
              🎓 Issue Degree — {issueStudent?.studentName}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ padding: "1.8rem" }}>
            {issueStudent && (
              <>
                <Alert variant="info" style={{ borderRadius: "12px", border: "none", background: "#eff6ff" }}>
                  <strong>Student:</strong> {issueStudent.studentName}<br />
                  <strong>Email:</strong> {issueStudent.studentEmail}<br />
                  <strong>Departments Cleared:</strong> {issueStudent.totalDepts}/{issueStudent.totalDepts}
                </Alert>

                <Form.Group className="mb-3">
                  <Form.Label style={{ fontWeight: 700, fontSize: "0.88rem" }}>
                    Degree Title
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={degreeTitle}
                    onChange={(e) => setDegreeTitle(e.target.value)}
                    placeholder="e.g. Bachelor of Science in Computer Science"
                    style={{ borderRadius: "12px", border: "2px solid #e2e8f0" }}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label style={{ fontWeight: 700, fontSize: "0.88rem" }}>
                    Final Remarks (optional)
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={issueComments}
                    onChange={(e) => setIssueComments(e.target.value)}
                    placeholder="Any final notes for this degree issuance…"
                    style={{ borderRadius: "12px", border: "2px solid #e2e8f0" }}
                  />
                </Form.Group>

                <Alert variant="warning" style={{ borderRadius: "12px", border: "none", fontSize: "0.82rem" }}>
                  ⚠️ <strong>This action is final.</strong> Once a degree is issued, the student&apos;s clearance will be
                  marked as completed and a degree record will be permanently created.
                </Alert>
              </>
            )}
          </Modal.Body>
          <Modal.Footer style={{ padding: "1rem 1.8rem", borderTop: "1px solid #f1f5f9" }}>
            <Button variant="light" onClick={() => setShowIssue(false)} style={{ borderRadius: "10px" }}>
              Cancel
            </Button>
            <Button
              onClick={handleIssueDegree}
              disabled={actionLoading === issueStudent?.id}
              style={{
                background: "linear-gradient(135deg, #059669, #10b981)",
                border: "none", borderRadius: "10px", fontWeight: 700,
                padding: "0.5rem 1.5rem",
              }}
            >
              {actionLoading === issueStudent?.id ? (
                <><Spinner size="sm" className="me-2" /> Issuing…</>
              ) : (
                "🎓 Confirm & Issue Degree"
              )}
            </Button>
          </Modal.Footer>
        </Modal>

      </ExaminerLayout>
    </ProtectedRoute>
  );
}