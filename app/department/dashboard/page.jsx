"use client";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Row, Col, Spinner, Alert } from "react-bootstrap";
import ProtectedRoute from "@/components/ProtectedRoute";
import DepartmentLayout from "@/components/layout/DepartmentLayout";
import { useAuth } from "@/lib/useAuth";
import { useSection } from "@/lib/SectionContext";
import { supabase } from "@/lib/supabaseClient";
import { updateClearanceTaskStatus } from "@/lib/clearanceService";
import ReviewModal from "@/components/department/ReviewModal";

// ── Config ────────────────────────────────────────────────────────────────────
const STAT_CARDS = (stats) => [
  { label: "Total Requests",    sub: "Global Volume",   value: stats.total,    icon: "📊", gradient: "linear-gradient(135deg,#0062FF,#6366F1)", glow: "rgba(0,98,255,0.22)" },
  { label: "Clearance Granted", sub: "Ready to Issue",  value: stats.approved, icon: "✅", gradient: "linear-gradient(135deg,#059669,#10b981)", glow: "rgba(5,150,105,0.22)" },
  { label: "Active Queue",      sub: "Pending Review",  value: stats.pending,  icon: "⏳", gradient: "linear-gradient(135deg,#D97706,#f59e0b)", glow: "rgba(217,119,6,0.22)" },
  { label: "Disputes",          sub: "Action Needed",   value: stats.rejected, icon: "🛑", gradient: "linear-gradient(135deg,#DC2626,#ef4444)", glow: "rgba(220,38,38,0.22)" },
];

const STATUS_CFG = {
  approved: { label: "✅ Approved", bg: "rgba(5,150,105,0.1)",  color: "#059669", border: "#059669" },
  rejected: { label: "❌ Rejected", bg: "rgba(220,38,38,0.1)",  color: "#DC2626", border: "#DC2626" },
  pending:  { label: "⏳ Pending",  bg: "rgba(217,119,6,0.1)",  color: "#D97706", border: "#D97706" },
};

const AVATAR_GRADS = [
  "linear-gradient(135deg,#0062FF,#6366F1)",
  "linear-gradient(135deg,#059669,#10b981)",
  "linear-gradient(135deg,#D97706,#f59e0b)",
  "linear-gradient(135deg,#7C3AED,#8B5CF6)",
];

// ── Components ────────────────────────────────────────────────────────────────

/** Mobile card view of one clearance request */
function RequestCard({ req, idx, isNew, onReview }) {
  const sc = STATUS_CFG[req.status] || STATUS_CFG.pending;
  const grad = AVATAR_GRADS[idx % AVATAR_GRADS.length];
  return (
    <div
      className={`dept-req-card ${isNew ? "dept-req-card--new" : ""}`}
      onClick={() => onReview(req)}
    >
      <div className="dept-req-card-top">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12, background: grad,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", fontWeight: 800, fontSize: "1.1rem", flexShrink: 0,
            boxShadow: "0 4px 10px rgba(0,0,0,0.12)"
          }}>
            {req.student.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, color: "#0F172A", fontSize: "0.9rem" }}>{req.student}</div>
            <div style={{ color: "#94A3B8", fontSize: "0.75rem" }}>{req.email}</div>
          </div>
        </div>
        <span style={{
          background: sc.bg, color: sc.color,
          border: `1px solid ${sc.border}30`,
          borderRadius: "50px", padding: "0.25rem 0.75rem",
          fontWeight: 700, fontSize: "0.68rem", letterSpacing: "0.4px",
          whiteSpace: "nowrap",
        }}>{sc.label}</span>
      </div>

      <div className="dept-req-card-info">
        <div className="dept-req-card-chip">
          <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.82rem", color: "#0062FF" }}>
            {req.rollNo}
          </span>
        </div>
        <div style={{ fontSize: "0.78rem", color: "#94A3B8" }}>📅 {req.dateSubmitted}</div>
      </div>

      <button
        className="dept-review-btn"
        onClick={e => { e.stopPropagation(); onReview(req); }}
      >
        Review →
      </button>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
function DashboardContent() {
  const { profile, loading: authLoading } = useAuth();
  const { activeSection } = useSection();
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [clearanceRequests, setClearanceRequests] = useState([]);
  const [error, setError] = useState("");
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [newRequestPulse, setNewRequestPulse] = useState(null);
  const [stats, setStats] = useState({ total: 0, approved: 0, pending: 0, rejected: 0 });

  const fetchRequests = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError("");
      const deptId = activeSection?.id;
      if (!deptId) return;

      const staffDeptId = profile?.department_id;
      let fmt = [];
      let newStats = { total: 0, approved: 0, pending: 0, rejected: 0 };

      if (deptId === "all") {
        // ── HUB OVERVIEW: Count unique students/requests ──
        const { data, error: e } = await supabase
          .from("clearance_requests")
          .select(`
            id, overall_status, created_at, notes,
            students!inner ( name, roll_number, email ),
            clearance_status(id, status, department_id)
          `)
          .order("created_at", { ascending: false });

        if (e) throw e;

        fmt = data.map(item => {
          // Identify the relevant task for the current staff's department
          // We deduplicate in JS: if there are multiple tasks for the same dept, pick the most 'advanced' one
          const deptTasks = item.clearance_status?.filter(s => s.department_id === staffDeptId) || [];
          const myTask = deptTasks.sort((a,b) => {
             const weights = { approved: 1, rejected: 2, pending: 3 };
             return (weights[a.status] || 99) - (weights[b.status] || 99);
          })[0];
          
          return {
            taskId: myTask?.id || null, 
            id: item.id,
            student: item.students?.name || "Student",
            rollNo: item.students?.roll_number || "N/A",
            email: item.students?.email || "N/A",
            dateSubmitted: item.created_at ? new Date(item.created_at).toLocaleDateString() : "N/A",
            // FIX: Show the status of the USER'S department, not the overall system
            status: myTask?.status || 'pending',
            remarks: myTask?.remarks || item.notes || "",
            notes: item.notes || "",
          };
        });


        newStats = {
          total: data.length,
          approved: data.filter(r => r.overall_status === 'completed').length,
          pending: data.filter(r => r.overall_status === 'pending' || r.overall_status === 'in_progress').length,
          rejected: data.filter(r => r.clearance_status?.some(s => s.status === 'rejected')).length,
        };
      } else {
        // ── DEPARTMENT VIEW: Current behavior for specific tasks ──
        let q = supabase.from("clearance_status").select(`
          id, status, remarks, request_id, updated_at,
          clearance_requests!inner (
            id, created_at, notes,
            students!inner ( name, roll_number, email )
          )
        `).eq("department_id", deptId);

        const { data, error: e } = await q.order("updated_at", { ascending: false });
        if (e) throw e;

        // Deduplicate: Keep only the most recent status entry per request
        const uniqueRequests = new Map();
        data.forEach(item => {
          if (!uniqueRequests.has(item.request_id)) {
            uniqueRequests.set(item.request_id, item);
          }
        });
        const deduplicatedData = Array.from(uniqueRequests.values());

        fmt = deduplicatedData.map(item => ({
          taskId: item.id,
          id: item.clearance_requests?.id || item.request_id,
          student: item.clearance_requests?.students?.name || "Student",
          rollNo: item.clearance_requests?.students?.roll_number || "N/A",
          email: item.clearance_requests?.students?.email || "N/A",
          dateSubmitted: item.clearance_requests?.created_at
            ? new Date(item.clearance_requests.created_at).toLocaleDateString() : "N/A",
          status: item.status || "pending",
          remarks: item.remarks || "",
          notes: item.clearance_requests?.notes || "",
        }));
      }

      // ── GLOBAL DEDUPLICATION BY STUDENT ──
      // Ensure a student (by roll number) only appears ONCE in any view using their latest request
      const uniqueStudents = new Map();
      fmt.forEach(item => {
        if (!uniqueStudents.has(item.rollNo)) {
          uniqueStudents.set(item.rollNo, item);
        }
      });
      const finalFmt = Array.from(uniqueStudents.values());

      newStats = {
        total: finalFmt.length,
        approved: finalFmt.filter(r => r.status === "approved" || r.status === "completed").length,
        pending:  finalFmt.filter(r => r.status === "pending" || r.status === "in_progress").length,
        rejected: finalFmt.filter(r => r.status === "rejected").length,
      };

      setClearanceRequests(finalFmt);
      setStats(newStats);
    } catch (err) {
      console.error("Dashboard Fetch Error:", err);
      setError("Synchronization Error: Check database permissions or RLS policies.");
    } finally { setLoading(false); }
  }, [activeSection?.id, profile?.department_id]);

  useEffect(() => {
    if (!authLoading && activeSection?.id) {
      fetchRequests();
      const ch = supabase
        .channel(`dept-hub-${activeSection.id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "clearance_status" }, (pl) => {
          fetchRequests(true);
          if (pl.eventType === "INSERT") {
            setNewRequestPulse(pl.new.id);
            setTimeout(() => setNewRequestPulse(null), 5000);
          }
        }).subscribe();
      return () => supabase.removeChannel(ch);
    }
  }, [authLoading, activeSection?.id, fetchRequests]);

  const handleReview = (req) => { setSelectedRequest(req); setShowReviewModal(true); };

  const handleAction = async (requestId, status, remarks) => {
    const req = clearanceRequests.find(r => r.id === requestId);
    if (!req) return;
    const res = await updateClearanceTaskStatus(req.taskId, status, remarks);
    if (res.success) {
      setClearanceRequests(prev => prev.map(r => r.taskId === req.taskId ? { ...r, status, remarks } : r));
      fetchRequests(true);
    } else alert("Action failed: " + res.error);
  };

  const filtered = useMemo(() =>
    clearanceRequests.filter(r => selectedFilter === "all" || r.status === selectedFilter),
    [clearanceRequests, selectedFilter]
  );

  const statCards = STAT_CARDS(stats);

  return (
    <div>
      {/* ── Hero Banner ─────────────────────────────────────────────── */}
      <div className="dept-hero">
        <div style={{ position: "absolute", top: "-60px", right: "-60px", width: 220, height: 220, background: "rgba(255,255,255,0.08)", borderRadius: "50%" }} />
        <div style={{ position: "absolute", bottom: "-40px", right: 160, width: 130, height: 130, background: "rgba(255,255,255,0.06)", borderRadius: "50%" }} />

        <div style={{ position: "relative", zIndex: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap", marginBottom: "0.6rem" }}>
            <span className="dept-badge-pill">
              {activeSection?.name?.toUpperCase() || "HUB OVERVIEW"}
            </span>
            <span className="dept-live-pill">
              <span className="dept-live-dot" /> LIVE SYNC
            </span>
          </div>
          <h1 className="dept-hero-title">🏛️ Institutional Hub</h1>
          <p className="dept-hero-sub">Manage student clearance across vital segments.</p>
        </div>

        <button
          className="dept-refresh-btn"
          onClick={() => fetchRequests()}
          disabled={loading}
        >
          {loading ? <Spinner size="sm" animation="border" /> : "↺"} Refresh
        </button>
      </div>

      {error && (
        <Alert variant="danger" style={{ borderRadius: "16px", border: "none", marginBottom: "1.25rem" }}>
          {error}
        </Alert>
      )}

      {/* ── Stats Row — horizontal scroll on mobile ──────────────── */}
      <div className="dept-stats-scroll">
        {statCards.map((s, i) => (
          <div key={i} className="dept-stat-card">
            <div className="dept-stat-icon" style={{ background: s.gradient, boxShadow: `0 6px 16px ${s.glow}` }}>
              {s.icon}
            </div>
            <div className="dept-stat-value">{s.value}</div>
            <div className="dept-stat-label">{s.label}</div>
            <div className="dept-stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Clearance Pipeline ───────────────────────────────────── */}
      <div className="dept-pipeline">
        {/* Header */}
        <div className="dept-pipeline-header">
          <div>
            <h4 style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 700, margin: 0, color: "#0F172A", fontSize: "clamp(1rem,2vw,1.15rem)" }}>
              Clearance Pipeline
            </h4>
            <p style={{ margin: "0.15rem 0 0", fontSize: "0.8rem", color: "#475569" }}>
              Real-time stream — <strong style={{ color: "#0062FF" }}>{activeSection?.name || "All Sections"}</strong>
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="dept-filter-tabs">
            {["all", "pending", "approved", "rejected"].map(f => (
              <button
                key={f}
                onClick={() => setSelectedFilter(f)}
                className={`dept-filter-btn ${selectedFilter === f ? "dept-filter-btn--active" : ""}`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        {loading && clearanceRequests.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
            <Spinner animation="border" style={{ color: "#0062FF", width: "2.5rem", height: "2.5rem", borderWidth: "3px" }} />
            <p style={{ marginTop: "1rem", fontWeight: 600, color: "#475569" }}>Synchronizing...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
            <div style={{ fontSize: "3.5rem", opacity: 0.2, marginBottom: "0.75rem" }}>🗂️</div>
            <h5 style={{ fontWeight: 700, color: "#0F172A" }}>Registry Empty</h5>
            <p style={{ color: "#475569", fontSize: "0.9rem" }}>
              No requests in <strong>{activeSection?.name || "selected"}</strong> queue.
            </p>
          </div>
        ) : (
          <>
            {/* ── Desktop Table (hidden on mobile) ── */}
            <div className="dept-table-wrap">
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                <thead>
                  <tr style={{ background: "#F8FAFC" }}>
                    {["Student Profile", "Roll Number", "Submitted", "Status", "Action"].map((h, i) => (
                      <th key={h} style={{
                        padding: "0.85rem 1.3rem", fontSize: "0.68rem", fontWeight: 800,
                        textTransform: "uppercase", letterSpacing: "1px", color: "#94A3B8",
                        borderBottom: "1px solid #E2E8F0",
                        textAlign: i >= 3 ? (i === 3 ? "center" : "right") : "left"
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((req, idx) => {
                    const sc = STATUS_CFG[req.status] || STATUS_CFG.pending;
                    const grad = AVATAR_GRADS[idx % AVATAR_GRADS.length];
                    const isNew = newRequestPulse === req.taskId || newRequestPulse === req.id;
                    return (
                      <tr
                        key={req.id}
                        onClick={() => handleReview(req)}
                        style={{
                          cursor: "pointer",
                          borderLeft: isNew ? "4px solid #0062FF" : "4px solid transparent",
                          transition: "background 0.15s ease",
                          animation: isNew ? "highlightRow 0.5s ease" : "none",
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                        onMouseLeave={e => e.currentTarget.style.background = ""}
                      >
                        <td style={{ padding: "0.9rem 1.3rem", borderBottom: "1px solid #F1F5F9" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <div style={{ width: 38, height: 38, borderRadius: 11, background: grad, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: "0.95rem", flexShrink: 0, boxShadow: "0 3px 8px rgba(0,0,0,0.12)" }}>
                              {req.student.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: "#0F172A", fontSize: "0.875rem" }}>{req.student}</div>
                              <div style={{ color: "#94A3B8", fontSize: "0.72rem" }}>{req.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "0.9rem 1.3rem", borderBottom: "1px solid #F1F5F9", verticalAlign: "middle" }}>
                          <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.82rem", color: "#0062FF", background: "rgba(0,98,255,0.07)", padding: "0.2rem 0.6rem", borderRadius: "8px" }}>
                            {req.rollNo}
                          </span>
                        </td>
                        <td style={{ padding: "0.9rem 1.3rem", borderBottom: "1px solid #F1F5F9", verticalAlign: "middle", color: "#475569", fontSize: "0.82rem" }}>
                          📅 {req.dateSubmitted}
                        </td>
                        <td style={{ padding: "0.9rem 1.3rem", borderBottom: "1px solid #F1F5F9", verticalAlign: "middle", textAlign: "center" }}>
                          <span style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}40`, borderRadius: "50px", padding: "0.25rem 0.85rem", fontWeight: 700, fontSize: "0.68rem", letterSpacing: "0.5px" }}>
                            {sc.label}
                          </span>
                        </td>
                        <td style={{ padding: "0.9rem 1.3rem", borderBottom: "1px solid #F1F5F9", verticalAlign: "middle", textAlign: "right" }}>
                          <button
                            onClick={e => { e.stopPropagation(); handleReview(req); }}
                            className="dept-review-btn"
                          >Review →</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Mobile Cards (hidden on desktop) ── */}
            <div className="dept-card-list">
              {filtered.map((req, idx) => (
                <RequestCard
                  key={req.id} req={req} idx={idx}
                  isNew={newRequestPulse === req.taskId || newRequestPulse === req.id}
                  onReview={handleReview}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <ReviewModal
        show={showReviewModal}
        onHide={() => setShowReviewModal(false)}
        request={selectedRequest}
        onAction={handleAction}
      />

      {/* ── All Component Styles ─────────────────────────────────── */}
      <style jsx global>{`
        /* Hero */
        .dept-hero {
          background: linear-gradient(135deg, #0062FF 0%, #6366F1 60%, #8B5CF6 100%);
          border-radius: 20px; padding: 2rem 2.5rem; margin-bottom: 1.5rem;
          color: white; position: relative; overflow: hidden;
          box-shadow: 0 10px 30px rgba(0,98,255,0.25);
        }
        .dept-hero-title {
          font-family: 'Poppins',sans-serif; font-weight: 800;
          font-size: clamp(1.3rem,3vw,1.85rem); margin: 0 0 0.35rem;
        }
        .dept-hero-sub { opacity: 0.8; margin: 0; font-size: clamp(0.82rem,2vw,0.95rem); }
        .dept-badge-pill {
          background: rgba(255,255,255,0.2); backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.3); border-radius: 50px;
          padding: 0.28rem 0.9rem; font-size: 0.68rem; font-weight: 800;
          letter-spacing: 1.5px; text-transform: uppercase;
        }
        .dept-live-pill {
          background: rgba(255,255,255,0.15); border-radius: 50px;
          padding: 0.28rem 0.85rem; font-size: 0.68rem; font-weight: 700;
          display: inline-flex; align-items: center; gap: 0.4rem;
        }
        .dept-live-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #4ade80; display: inline-block;
          animation: livePulse 1.5s infinite;
        }
        .dept-refresh-btn {
          position: absolute; top: 1.3rem; right: 1.3rem;
          background: rgba(255,255,255,0.15); backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.3); color: white;
          border-radius: 10px; padding: 0.4rem 1rem;
          font-weight: 600; font-size: 0.8rem; cursor: pointer;
          display: flex; align-items: center; gap: 0.4rem;
          transition: all 0.2s ease;
        }
        .dept-refresh-btn:hover { background: rgba(255,255,255,0.25); }

        /* Stats */
        .dept-stats-scroll {
          display: flex; gap: 1rem;
          overflow-x: auto; padding-bottom: 0.5rem;
          margin-bottom: 1.5rem;
          scrollbar-width: none;
        }
        .dept-stats-scroll::-webkit-scrollbar { display: none; }
        .dept-stat-card {
          background: white; border-radius: 18px; padding: 1.3rem 1.2rem;
          border: 1px solid #E2E8F0; box-shadow: 0 4px 16px rgba(0,0,0,0.04);
          transition: all 0.25s ease; cursor: default;
          min-width: 155px; flex-shrink: 0;
        }
        .dept-stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 28px rgba(0,0,0,0.09);
        }
        .dept-stat-icon {
          width: 44px; height: 44px; border-radius: 13px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.1rem; margin-bottom: 0.85rem;
        }
        .dept-stat-value {
          font-size: 2rem; font-weight: 800; color: #0F172A;
          line-height: 1; margin-bottom: 0.25rem;
        }
        .dept-stat-label { font-weight: 700; color: #0F172A; font-size: 0.85rem; }
        .dept-stat-sub { color: #94A3B8; font-size: 0.74rem; margin-top: 0.1rem; }

        /* Pipeline */
        .dept-pipeline {
          background: white; border-radius: 20px; overflow: hidden;
          border: 1px solid #E2E8F0; box-shadow: 0 4px 16px rgba(0,0,0,0.04);
        }
        .dept-pipeline-header {
          padding: 1.2rem 1.5rem; display: flex; justify-content: space-between;
          align-items: center; flex-wrap: wrap; gap: 1rem;
          border-bottom: 1px solid #E2E8F0;
        }
        .dept-filter-tabs {
          display: flex; background: #F4F7F9; padding: 4px;
          border-radius: 50px; gap: 3px; border: 1px solid #E2E8F0;
          overflow-x: auto; scrollbar-width: none;
        }
        .dept-filter-tabs::-webkit-scrollbar { display: none; }
        .dept-filter-btn {
          padding: 0.35rem 0.9rem; border-radius: 50px; border: none;
          font-weight: 600; font-size: 0.78rem; cursor: pointer;
          transition: all 0.2s ease; background: transparent;
          color: #475569; white-space: nowrap;
        }
        .dept-filter-btn--active {
          background: linear-gradient(135deg,#0062FF,#6366F1);
          color: white; box-shadow: 0 3px 10px rgba(0,98,255,0.25);
        }

        /* Table (desktop) */
        .dept-table-wrap { display: block; overflow-x: auto; }
        .dept-card-list { display: none; }

        /* Review button */
        .dept-review-btn {
          background: linear-gradient(135deg,#0062FF,#6366F1);
          color: white; border: none; border-radius: 10px;
          padding: 0.4rem 1rem; font-weight: 700; font-size: 0.78rem;
          cursor: pointer; box-shadow: 0 4px 10px rgba(0,98,255,0.25);
          transition: all 0.2s ease; white-space: nowrap;
        }
        .dept-review-btn:hover {
          transform: translateY(-1px); box-shadow: 0 6px 16px rgba(0,98,255,0.35);
        }

        /* Mobile card */
        .dept-req-card {
          margin: 0.75rem 1rem; padding: 1.1rem 1.2rem;
          background: white; border: 1px solid #E2E8F0;
          border-radius: 16px; cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .dept-req-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.08); }
        .dept-req-card--new { border-left: 4px solid #0062FF; animation: highlightRow 0.5s ease; }
        .dept-req-card-top {
          display: flex; justify-content: space-between; align-items: flex-start;
          gap: 0.75rem; margin-bottom: 0.85rem;
        }
        .dept-req-card-info {
          display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.9rem;
          flex-wrap: wrap;
        }
        .dept-req-card-chip {
          background: rgba(0,98,255,0.07); border-radius: 8px; padding: 0.2rem 0.6rem;
        }

        /* Breakpoints */
        @media (max-width: 767px) {
          .dept-hero { padding: 1.5rem 1.25rem; border-radius: 16px; }
          .dept-refresh-btn { position: static; margin-top: 0.9rem; width: fit-content; }
          .dept-table-wrap { display: none; }
          .dept-card-list { display: block; }
          .dept-pipeline-header { flex-direction: column; align-items: flex-start; }
          .dept-review-btn { width: 100%; text-align: center; padding: 0.55rem 1rem; }
        }
        @media (max-width: 480px) {
          .dept-hero { padding: 1.25rem 1rem; }
          .dept-pipeline-header { padding: 1rem; }
          .dept-stat-card { min-width: 135px; padding: 1rem; }
          .dept-stat-value { font-size: 1.6rem; }
        }

        /* Animations */
        @keyframes livePulse {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:0.5; transform:scale(1.4); }
        }
        @keyframes highlightRow {
          from { background: rgba(0,98,255,0.08); }
          to   { background: transparent; }
        }
      `}</style>
    </div>
  );
}

export default function DepartmentDashboard() {
  return (
    <ProtectedRoute requiredRoles="department">
      <DepartmentLayout>
        <DashboardContent />
      </DepartmentLayout>
    </ProtectedRoute>
  );
}