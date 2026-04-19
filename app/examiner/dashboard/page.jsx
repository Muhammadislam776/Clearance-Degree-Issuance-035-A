"use client";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Row, Col, Card, Badge, Button,
  Alert, Spinner, Modal, Form, Container
} from "react-bootstrap";
import ProtectedRoute from "@/components/ProtectedRoute";
import ExaminerLayout from "@/components/layout/ExaminerLayout";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { getClearedStudents, getIssuedDegrees, approveFinal, issueDegree } from "@/lib/clearanceService";

// ── Config ────────────────────────────────────────────────────────────────────
const STAT_CARDS = (stats) => [
  { label: "Pending Review", sub: "New Verifications", value: stats.pendingReview, icon: "⚖️", gradient: "linear-gradient(135deg,#6366F1,#4F46E5)", glow: "rgba(99,102,241,0.22)" },
  { label: "Ready to Issue", sub: "Examiner Approved", value: stats.readyToIssue, icon: "📋", gradient: "linear-gradient(135deg,#8B5CF6,#7C3AED)", glow: "rgba(139,92,246,0.22)" },
  { label: "Degrees Issued", sub: "Final Completion",  value: stats.issued,      icon: "🎓", gradient: "linear-gradient(135deg,#059669,#10b981)", glow: "rgba(5,150,105,0.22)" },
  { label: "Active Pipeline", sub: "Total Capacity",   value: stats.total,       icon: "📊", gradient: "linear-gradient(135deg,#0062FF,#6366F1)", glow: "rgba(0,98,255,0.22)" },
];

const TABS = [
  { id: "pending", label: "Pending Review", icon: "🕒" },
  { id: "ready",   label: "Ready to Issue",  icon: "📜" },
  { id: "issued",  label: "Issued Degrees", icon: "💎" },
];

const AVATAR_GRADS = [
  "linear-gradient(135deg,#6366F1,#4F46E5)",
  "linear-gradient(135deg,#059669,#10B981)",
  "linear-gradient(135deg,#D97706,#F59E0B)",
  "linear-gradient(135deg,#7C3AED,#8B5CF6)",
];

// ── tiny helpers ──────────────────────────────────────────────
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

/* ================================================================
   MAIN COMPONENT
 ================================================================ */
export default function ExaminerDashboard() {
  const { profile, loading: authLoading } = useAuth();

  /* ── state ─────────────────────────────────────────────── */
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [clearedStudents, setClearedStudents] = useState([]); 
  const [issuedDegrees, setIssuedDegrees] = useState([]);     
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState(null);

  // Modals
  const [showReview, setShowReview] = useState(false);
  const [reviewStudent, setReviewStudent] = useState(null);
  const [comments, setComments] = useState("");

  const [showIssue, setShowIssue] = useState(false);
  const [issueStudent, setIssueStudent] = useState(null);
  const [degreeTitle, setDegreeTitle] = useState("");
  const [issueComments, setIssueComments] = useState("");

  /* ── data fetch ────────────────────────────────────────── */
  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError("");

      const [resCleared, resIssued] = await Promise.all([
        getClearedStudents(),
        getIssuedDegrees()
      ]);

      if (!resCleared.success) throw new Error(resCleared.error);
      if (!resIssued.success) throw new Error(resIssued.error);

      setClearedStudents(resCleared.data || []);
      setIssuedDegrees(resIssued.data || []);

    } catch (e) {
      console.error("Examiner Dashboard fetch:", e);
      setError(e.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── real-time ──────────────────────────────────── */
  useEffect(() => {
    if (!authLoading && profile) {
      fetchData();
      const ch = supabase
        .channel("examiner-live-hub")
        .on("postgres_changes", { event: "*", schema: "public", table: "clearance_requests" }, () => fetchData(true))
        .on("postgres_changes", { event: "*", schema: "public", table: "degrees" }, () => fetchData(true))
        .subscribe();
      return () => supabase.removeChannel(ch);
    }
  }, [authLoading, profile, fetchData]);

  /* ── actions ────────────────────────────────────────────── */
  const handleApproveFinal = async () => {
    if (!reviewStudent) return;
    setActionLoading(reviewStudent.id);
    try {
      const result = await approveFinal(reviewStudent.id, comments);
      if (!result.success) throw new Error(result.error);
      setSuccess(`Clearance approved for ${reviewStudent.studentName}`);
      setShowReview(false);
      await fetchData(true);
      setActiveTab("ready");
    } catch (e) {
      setError(e.message || "Approval failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleIssueDegree = async () => {
    if (!issueStudent) return;
    setActionLoading(issueStudent.id);
    try {
      const title = degreeTitle.trim() || "Official Degree";
      const result = await issueDegree(issueStudent.id, issueStudent.studentId, title, issueComments);
      if (!result.success) throw new Error(result.error);
      setSuccess(`Degree issued to ${issueStudent.studentName}!`);
      setShowIssue(false);
      await fetchData(true);
      setActiveTab("issued");
    } catch (e) {
      setError(e.message || "Degree issuance failed");
    } finally {
      setActionLoading(null);
    }
  };

  /* ── data partitioning ──────────────────────────────────── */
  const stats = useMemo(() => ({
    pendingReview: clearedStudents.filter(s => !s.isCleared || (s.isCleared && s.overallStatus !== "approved")).length,
    readyToIssue:  clearedStudents.filter(s => s.isCleared && s.overallStatus === "approved").length,
    issued:        issuedDegrees.length,
    total:         clearedStudents.length + issuedDegrees.length,
  }), [clearedStudents, issuedDegrees]);

  const currentList = useMemo(() => {
    let list = [];
    if (activeTab === "pending") {
      list = clearedStudents.filter(s => !s.isCleared || (s.isCleared && s.overallStatus !== "approved"));
    } else if (activeTab === "ready") {
      list = clearedStudents.filter(s => s.isCleared && s.overallStatus === "approved");
    } else {
      list = issuedDegrees;
    }
    
    return list.filter(s => 
      s.studentName.toLowerCase().includes(search.toLowerCase()) ||
      s.studentEmail.toLowerCase().includes(search.toLowerCase())
    );
  }, [activeTab, clearedStudents, issuedDegrees, search]);

  /* ── render ─────────────────────────────────────────────── */
  return (
    <ProtectedRoute requiredRoles="examiner">
      <ExaminerLayout>
        <style jsx global>{`
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes scaleIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          
          .ex-hero {
            background: linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 100%);
            border-radius: 24px; padding: 2.5rem; color: #fff;
            position: relative; overflow: hidden;
            box-shadow: 0 20px 50px rgba(67,56,202,0.3);
            margin-bottom: 2rem;
            animation: scaleIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .ex-hero::after {
            content: ""; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent);
            background-size: 200% 100%;
            animation: shimmer 8s infinite linear;
            pointer-events: none;
          }
          .ex-hero-title { font-weight: 900; font-size: 2.2rem; margin-bottom: 0.5rem; line-height: 1.2; }
          .ex-hero-sub { opacity: 0.8; font-size: 0.95rem; max-width: 500px; }
          .ex-badge-pill {
            background: rgba(255,255,255,0.15); border-radius: 50px;
            padding: 0.3rem 1rem; font-size: 0.7rem; font-weight: 800;
            letter-spacing: 1.5px; text-transform: uppercase;
            display: inline-block; margin-bottom: 0.8rem;
            backdrop-filter: blur(4px);
          }
          
          .ex-stats-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); 
            gap: 1.5rem; 
            margin-bottom: 2rem; 
          }
          .ex-stat-card {
            background: #fff; border-radius: 20px; padding: 1.5rem;
            border: 1px solid #f1f5f9; box-shadow: 0 4px 12px rgba(0,0,0,0.03);
            transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            animation: fadeInUp 0.6s ease-out backwards;
          }
          .ex-stat-card:nth-child(1) { animation-delay: 0.1s; }
          .ex-stat-card:nth-child(2) { animation-delay: 0.2s; }
          .ex-stat-card:nth-child(3) { animation-delay: 0.3s; }
          .ex-stat-card:nth-child(4) { animation-delay: 0.4s; }
          
          .ex-stat-card:hover { 
            transform: translateY(-8px) scale(1.02); 
            box-shadow: 0 20px 40px rgba(0,0,0,0.08); 
            border-color: #e2e8f0;
          }
          .ex-stat-icon { 
            width: 48px; height: 48px; border-radius: 14px; 
            display: flex; align-items: center; justify-content: center; 
            font-size: 1.4rem; margin-bottom: 1.2rem; color: #fff;
            transition: transform 0.3s ease;
          }
          .ex-stat-card:hover .ex-stat-icon { transform: rotate(10deg); }
          
          .ex-stat-val { font-size: 2.4rem; font-weight: 900; color: #0f172a; line-height: 1; }
          .ex-stat-lbl { font-weight: 700; color: #1e293b; font-size: 0.95rem; margin-top: 0.4rem; }
          .ex-stat-sub { color: #94a3b8; font-size: 0.8rem; }

          .ex-pipeline { 
            background: #fff; border-radius: 28px; 
            border: 1px solid #f1f5f9; 
            box-shadow: 0 10px 40px rgba(0,0,0,0.04); 
            overflow: hidden;
            animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.5s backwards;
          }
          .ex-tabs-header { 
            padding: 1.5rem 2rem; 
            border-bottom: 1px solid #f1f5f9; 
            display: flex; align-items: center; justify-content: space-between; 
            flex-wrap: wrap; gap: 1.5rem; 
            background: #ffffff;
          }
          .ex-tabs-list { 
            display: flex; background: #f1f5f9; padding: 6px; 
            border-radius: 100px; gap: 6px; 
          }
          .ex-tab-btn {
            border: none; padding: 0.6rem 1.4rem; border-radius: 100px; 
            font-weight: 700; font-size: 0.85rem;
            background: transparent; color: #64748b; 
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
            display: flex; align-items: center; gap: 0.6rem;
          }
          .ex-tab-btn:hover { color: #1e293b; background: rgba(0,0,0,0.03); }
          .ex-tab-btn--active { 
            background: #4338ca !important; color: #fff !important; 
            box-shadow: 0 4px 15px rgba(67,56,202,0.3); 
          }
          
          .ex-search-container { position: relative; width: 100%; max-width: 320px; }
          .ex-search-box { 
            width: 100%; border: 2px solid #f1f5f9; border-radius: 16px; 
            padding: 0.75rem 1.2rem 0.75rem 2.8rem; font-size: 0.9rem; 
            outline: none; transition: all 0.3s; 
            background: #f8fafc; 
          }
          .ex-search-box:focus { border-color: #4338ca; background: #fff; box-shadow: 0 0 0 4px rgba(67,56,202,0.1); }
          .ex-search-icon { position: absolute; left: 1.1rem; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; }

          .ex-table thead th { 
            background: #f8fafc; color: #64748b; 
            font-size: 0.75rem; font-weight: 800; 
            text-transform: uppercase; letter-spacing: 1.2px; 
            padding: 1.2rem; border-bottom: 1px solid #f1f5f9; 
          }
          .ex-table td { padding: 1.4rem 1.2rem; vertical-align: middle; border-bottom: 1px solid #f8fafc; transition: all 0.2s; }
          .ex-table tr { animation: fadeInUp 0.5s ease-out backwards; }
          .ex-table tr:hover td { background: #fdfdff; }
          
          .ex-avatar { 
            width: 46px; height: 46px; border-radius: 14px; 
            display: flex; align-items: center; justify-content: center; 
            color: #fff; font-weight: 800; font-size: 1.1rem;
            transition: transform 0.3s ease;
          }
          .ex-table tr:hover .ex-avatar { transform: scale(1.1); }
          
          .ex-btn-modern {
            border: none; border-radius: 14px; padding: 0.7rem 1.5rem; 
            font-weight: 700; font-size: 0.85rem; transition: all 0.3s;
            display: inline-flex; align-items: center; gap: 0.6rem;
            box-shadow: 0 4px 10px rgba(0,0,0,0.05);
          }
          .ex-btn-modern:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(0,0,0,0.12); }
          .ex-btn-modern:active { transform: translateY(-1px); }

          .ex-btn-primary { background: linear-gradient(135deg,#4338ca,#6366f1); color:#fff; }
          .ex-btn-success { background: linear-gradient(135deg,#059669,#10b981); color:#fff; }

          .ex-modal .modal-content { border-radius: 28px; border: none; box-shadow: 0 30px 60px -12px rgba(0,0,0,0.3); }
          .ex-modal-head { background: #1e1b4b; color: #fff; padding: 1.8rem; border: none; }
          .ex-modal-head .btn-close { filter: invert(1) grayscale(100%) brightness(200%); opacity: 0.8; }
          
          .dept-pill { 
            background: #fff; padding: 1rem; border-radius: 18px; 
            margin-bottom: 0.8rem; display: flex; justify-content: space-between; 
            align-items: center; border: 1px solid #f1f5f9;
            transition: all 0.3s;
          }
          .dept-pill:hover { border-color: #cbd5e1; transform: translateX(5px); }

          @media (max-width: 768px) {
            .ex-hero { padding: 1.5rem; text-align: center; }
            .ex-hero-sub { margin: 0 auto; }
            .ex-tabs-header { justify-content: center; }
            .ex-search-container { max-width: 100%; order: -1; }
            .ex-stat-val { font-size: 2rem; }
          }
        `}</style>

        <Container fluid className="py-4">
          <div className="ex-hero">
            <div style={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <span className="ex-badge-pill">🏛️ Examination Authority</span>
              <h1 className="ex-hero-title">Degree Issuance <br />Control Center</h1>
              <p className="ex-hero-sub">Final gateway for academic verification. Review clearances, approve students, and manage official degree records.</p>
            </div>
            <button className="ex-btn-modern ex-btn-primary" 
                    onClick={() => fetchData()} disabled={loading}
                    style={{ position: "absolute", top: "1.5rem", right: "1.5rem", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)" }}>
              {loading ? <Spinner size="sm" /> : "↺"} Refresh
            </button>
          </div>

          {error && <Alert variant="danger" className="rounded-4 border-0 shadow-sm mb-4" dismissible onClose={() => setError("")}>⚠️ {error}</Alert>}
          {success && <Alert variant="success" className="rounded-4 border-0 shadow-sm mb-4" dismissible onClose={() => setSuccess("")}>✅ {success}</Alert>}

          <div className="ex-stats-grid">
            {STAT_CARDS(stats).map((s, i) => (
              <div key={i} className="ex-stat-card">
                <div className="ex-stat-icon" style={{ background: s.gradient, boxShadow: `0 8px 16px ${s.glow}` }}>{s.icon}</div>
                <div className="ex-stat-val">{s.value}</div>
                <div className="ex-stat-lbl">{s.label}</div>
                <div className="ex-stat-sub">{s.sub}</div>
              </div>
            ))}
          </div>

          <div className="ex-pipeline">
            <div className="ex-tabs-header">
              <div className="ex-tabs-list">
                {TABS.map(t => (
                  <button key={t.id} onClick={() => setActiveTab(t.id)} className={`ex-tab-btn ${activeTab === t.id ? "ex-tab-btn--active" : ""}`}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
              <div className="ex-search-container">
                <span className="ex-search-icon">🔍</span>
                <input className="ex-search-box" placeholder="Search student or email..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>

            {loading && currentList.length === 0 ? (
              <div className="text-center py-5">
                <Spinner animation="grow" variant="primary" />
                <p className="mt-3 text-muted fw-bold">Synchronizing records...</p>
              </div>
            ) : currentList.length === 0 ? (
              <div className="text-center py-5 opacity-50">
                <div style={{ fontSize: "3rem" }}>🗂️</div>
                <h5 className="fw-bold mt-2">Queue Empty</h5>
                <p className="small">No students match the current criteria.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="ex-table w-100">
                  <thead>
                    <tr>
                      <th style={{ paddingLeft: "1.8rem" }}>Student Profile</th>
                      <th>Work Status</th>
                      <th>Last Sync</th>
                      <th className="text-end" style={{ paddingRight: "1.8rem" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentList.map((s, idx) => {
                      const grad = AVATAR_GRADS[idx % AVATAR_GRADS.length];
                      return (
                        <tr key={s.id} style={{ animationDelay: `${idx * 0.05}s` }}>
                          <td style={{ paddingLeft: "1.8rem" }}>
                            <div className="d-flex align-items-center gap-3">
                              <div className="ex-avatar" style={{ background: grad, boxShadow: "0 4px 10px rgba(0,0,0,0.1)" }}>{initials(s.studentName)}</div>
                              <div>
                                <div style={{ fontWeight: 800, color: "#1e293b", fontSize: "0.95rem" }}>{s.studentName}</div>
                                <div style={{ color: "#94a3b8", fontSize: "0.75rem" }}>{s.studentEmail}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            {activeTab === "issued" ? (
                              <Badge bg="" className="text-success border border-success border-opacity-25 rounded-pill px-3 py-2" style={{ background: "rgba(16,185,129,0.08)", fontSize: "0.7rem", fontWeight: 800 }}>
                                💎 {s.degreeTitle?.toUpperCase() || "DEGREE ISSUED"}
                              </Badge>
                            ) : (
                              <div className="d-flex flex-column gap-1">
                                <div className="d-flex align-items-center gap-2">
                                  <Badge bg="" className={`text-${s.isDisputed ? "danger" : s.overallStatus === "approved" ? "primary" : s.isCleared ? "success" : "warning"} border border-${s.isDisputed ? "danger" : s.overallStatus === "approved" ? "primary" : s.isCleared ? "success" : "warning"} border-opacity-25 rounded-pill px-2 py-1`} 
                                         style={{ 
                                           background: s.isDisputed ? "rgba(239,68,68,0.08)" : s.overallStatus === "approved" ? "rgba(67,56,202,0.08)" : s.isCleared ? "rgba(16,185,129,0.08)" : "rgba(217,119,6,0.08)", 
                                           fontSize: "0.65rem", fontWeight: 800 
                                         }}>
                                    {s.isDisputed ? "🚩 DISPUTED" : s.overallStatus === "approved" ? "⚖️ VETTED" : s.isCleared ? "✓ DEPTS CLEARED" : "⏳ IN PROGRESS"}
                                  </Badge>

                                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>
                                    {s.clearedCount}/{s.totalDepts}
                                  </span>
                                </div>
                                <div className="progress" style={{ height: "4px", width: "100px", borderRadius: "10px", background: "#f1f5f9" }}>
                                  <div className="progress-bar" role="progressbar" 
                                       style={{ 
                                         width: `${(s.clearedCount / s.totalDepts) * 100}%`,
                                         background: s.isDisputed ? "#ef4444" : "linear-gradient(90deg, #4338ca, #6366f1)",
                                         borderRadius: "10px"
                                       }} 
                                  />
                                </div>
                              </div>
                            )}
                          </td>

                          <td>
                            <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "#64748b" }}>{new Date(s.issuedAt || s.submittedAt).toLocaleDateString()}</div>
                            <div style={{ fontSize: "0.7rem", color: "#cbd5e1" }}>{timeAgo(s.issuedAt || s.submittedAt)}</div>
                          </td>
                          <td className="text-end" style={{ paddingRight: "1.8rem" }}>
                            {activeTab === "pending" && (
                              <button className="ex-btn-modern ex-btn-primary" onClick={() => { setReviewStudent(s); setComments(""); setShowReview(true); }}>
                                Review & Approve
                              </button>
                            )}
                            {activeTab === "ready" && (
                              <button className="ex-btn-modern ex-btn-success" onClick={() => { setIssueStudent(s); setDegreeTitle(""); setIssueComments(""); setShowIssue(true); }}>
                                Issue Degree
                              </button>
                            )}
                            {activeTab === "issued" && (
                              <Badge bg="light" className="text-muted rounded-pill px-3 py-2 border">COMPLETED</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Container>

        {/* ═══ REVIEW MODAL ═════════════════════════════ */}
        <Modal show={showReview} onHide={() => setShowReview(false)} centered size="lg" className="ex-modal">
          <div className="ex-modal-head">
            <Modal.Header closeButton>
              <Modal.Title className="ex-modal-title">📋 Final Verification Process</Modal.Title>
            </Modal.Header>
          </div>
          <Modal.Body className="p-4">
            <div className="p-3 rounded-4 mb-4" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <div className="d-flex align-items-center gap-3">
                <div className="ex-avatar" style={{ background: "#312e81", width: 50, height: 50 }}>{reviewStudent ? initials(reviewStudent.studentName) : "?"}</div>
                <div>
                  <h5 className="fw-bold m-0">{reviewStudent?.studentName}</h5>
                  <p className="text-muted small m-0">{reviewStudent?.studentEmail}</p>
                </div>
              </div>
            </div>
            
            <h6 className="fw-bold mb-3 small text-uppercase letter-spacing-1">Departmental Clearances</h6>
            <div className="mb-4">
              {reviewStudent?.departmentStatuses?.map((d, i) => (
                <div key={i} className="dept-pill">
                  <span>{d.deptName}</span>
                  <div className="d-flex align-items-center gap-2">
                    {d.remarks && <span className="small text-muted">{d.remarks}</span>}
                    <span className="ok" style={{ background: "#dcfce7", color: "#15803d", padding: "0.2rem 0.6rem", borderRadius: "50px", fontSize: "0.65rem", fontWeight: 800 }}>APPROVED</span>
                  </div>
                </div>
              ))}
            </div>

            <Form.Group>
              <Form.Label className="fw-bold small">Examiner Remarks (Optional)</Form.Label>
              <Form.Control as="textarea" rows={3} className="rounded-3" value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Final notes before approval..." />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="border-0 p-4 pt-0">
            <Button variant="light" className="rounded-3 fw-bold" onClick={() => setShowReview(false)}>Cancel</Button>
            <Button className="ex-btn-modern ex-btn-primary" onClick={handleApproveFinal} disabled={actionLoading}>
              {actionLoading ? <Spinner size="sm" /> : "Approve Final Clearance"}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* ═══ ISSUE DEGREE MODAL ═══════════════════════ */}
        <Modal show={showIssue} onHide={() => setShowIssue(false)} centered className="ex-modal">
          <div className="ex-modal-head" style={{ background: "#064e3b" }}>
            <Modal.Header closeButton>
              <Modal.Title className="ex-modal-title">🎓 Degree Issuance Confirmation</Modal.Title>
            </Modal.Header>
          </div>
          <Modal.Body className="p-4">
            <Alert variant="success" className="rounded-4 border-0 opacity-75 small mb-4">
              This student has been verified. You are now issuing the final degree record.
            </Alert>
            <Form.Group className="mb-4">
              <Form.Label className="fw-bold small">Degree Official Title</Form.Label>
              <Form.Control type="text" className="rounded-3" value={degreeTitle} onChange={(e) => setDegreeTitle(e.target.value)} placeholder="e.g. BS Computer Science" />
            </Form.Group>
            <Form.Group>
              <Form.Label className="fw-bold small">Final Remarks</Form.Label>
              <Form.Control as="textarea" rows={2} className="rounded-3" value={issueComments} onChange={(e) => setIssueComments(e.target.value)} placeholder="Closing notes..." />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="border-0 p-4 pt-0">
            <Button variant="light" className="rounded-3 fw-bold" onClick={() => setShowIssue(false)}>Cancel</Button>
            <Button className="ex-btn-modern ex-btn-success" onClick={handleIssueDegree} disabled={actionLoading}>
              {actionLoading ? <Spinner size="sm" /> : "Confirm & Issue Degree"}
            </Button>
          </Modal.Footer>
        </Modal>

      </ExaminerLayout>
    </ProtectedRoute>
  );
}