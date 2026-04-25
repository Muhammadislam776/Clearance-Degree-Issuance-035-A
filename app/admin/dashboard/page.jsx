"use client";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Container, Row, Col, Card, Table, Button, Badge, Form, Spinner, Alert, Modal } from "react-bootstrap";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminLayout from "@/components/layout/AdminLayout";
import Charts from "@/components/admin/Charts";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { withTimeout } from "@/lib/authService";

// ── Shared Design Tokens ────────────────────────────────────────────────────────
const STATUS_INDICATORS = {
  active:    { bg: "rgba(16,185,129,0.08)", color: "#10B981", label: "ACTIVE", border: "#10B98130" },
  suspended: { bg: "rgba(239,68,68,0.08)",  color: "#EF4444", label: "SUSPENDED", border: "#EF444430" },
};

const ROLE_BADGES = {
  STUDENT:    { bg: "rgba(79,70,229,0.08)",   color: "#4F46E5", border: "#4F46E540" },
  DEPARTMENT: { bg: "rgba(13,148,136,0.08)",  color: "#0D9488", border: "#0D948840" },
  EXAMINER:   { bg: "rgba(217,119,6,0.08)",   color: "#D97706", border: "#D9770640" },
  ADMIN:      { bg: "rgba(30,41,59,0.08)",    color: "#1E293B", border: "#1E293B40" },
};

const AVATAR_COLORS = ["#4F46E5", "#0D9488", "#D97706", "#7C3AED", "#DB2777"];

// ── Components ──────────────────────────────────────────────────────────────────

function UserDetailModal({ show, onHide, user }) {
  if (!user) return null;

  return (
    <Modal show={show} onHide={onHide} size="lg" centered className="glass-modal">
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold text-slate-800">Identity Profile</Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4 pt-2">
        <div className="d-flex align-items-center gap-4 mb-4 p-4 rounded-4 bg-light border">
          <div style={{
            width: 80, height: 80, borderRadius: 24, 
            background: `linear-gradient(135deg, ${AVATAR_COLORS[0]}, ${AVATAR_COLORS[1]})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "2.5rem", fontWeight: 800, color: "white", textShadow: "0 2px 4px rgba(0,0,0,0.1)"
          }}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="mb-1 fw-bold">{user.name}</h2>
            <div className="d-flex gap-2 align-items-center">
              <Badge bg="" style={{ background: ROLE_BADGES[user.role]?.bg, color: ROLE_BADGES[user.role]?.color, border: `1px solid ${ROLE_BADGES[user.role]?.border}` }}>
                {user.role}
              </Badge>
              <span className="text-muted small">• Joined on {user.joinDate}</span>
            </div>
          </div>
        </div>

        <Row className="g-4">
          <Col md={6}>
            <div className="p-3 border rounded-3 bg-white h-100">
              <label className="text-muted small text-uppercase fw-bold mb-2 d-block">Contact Identity</label>
              <div className="fw-medium">{user.email}</div>
              <div className="text-muted small mt-1">Primary Institutional Communication</div>
            </div>
          </Col>
          <Col md={6}>
            <div className="p-3 border rounded-3 bg-white h-100">
              <label className="text-muted small text-uppercase fw-bold mb-2 d-block">Account Status</label>
              <div className="d-flex align-items-center gap-2">
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#10B981" }} />
                <span className="fw-medium">ACTIVE</span>
              </div>
              <div className="text-muted small mt-1">Identity verified & verified</div>
            </div>
          </Col>
          <Col md={12}>
            <div className="p-3 border rounded-3 bg-white">
              <label className="text-muted small text-uppercase fw-bold mb-2 d-block">Administrative Actions</label>
              <div className="d-flex gap-2">
                <Button variant="outline-primary" size="sm" className="rounded-pill px-3">Reset Authentication</Button>
                <Button variant="outline-danger" size="sm" className="rounded-pill px-3">Restrict Identity</Button>
                <Button variant="secondary" size="sm" className="rounded-pill px-3 ms-auto" onClick={onHide}>Close</Button>
              </div>
            </div>
          </Col>
        </Row>
      </Modal.Body>
    </Modal>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { profile, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  
  const [stats, setStats] = useState({
    students: 0,
    departments: 0,
    examiners: 0,
    clearances: 0,
    pending: 0,
    approved: 0,
  });
  
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const downloadReport = async () => {
    try {
      const { data } = await supabase.from("clearance_requests").select("id, overall_status, created_at");
      if (!data) return;

      const csv = [
        ["ID", "Status", "Date"],
        ...data.map(d => [d.id, d.overall_status || "pending", new Date(d.created_at).toLocaleDateString()])
      ].map(e => e.join(",")).join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "clearance_report.csv";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download report", err);
    }
  };

  /* ── Data Fetching ───────────────────────────────────────── */
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [studentRes, examinerRes, clearanceRes, usersRes, deptRes, allClearanceRes] = await Promise.all([
        supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "student"),
        supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "examiner"),
        supabase.from("clearance_requests").select("*", { count: "exact", head: true }).neq("overall_status", "completed"),
        supabase.from("users").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("departments").select("*", { count: "exact", head: true }),
        supabase.from("clearance_requests").select("id, overall_status")
      ]);

      const allClearances = allClearanceRes.data || [];

      setStats({
        students: studentRes.count || 0,
        departments: deptRes.count || 0,
        examiners: examinerRes.count || 0,
        clearances: clearanceRes.count || 0,
        pending: allClearances.filter(c => c.overall_status === "pending" || c.overall_status === "in_progress").length,
        approved: allClearances.filter(c => c.overall_status === "completed").length
      });

      const formatted = (usersRes.data || []).map(u => ({
        id: u.id,
        name: u.name || "Unknown Identity",
        email: u.email,
        role: (u.role || "user").toUpperCase(),
        joinDate: u.created_at ? new Date(u.created_at).toLocaleDateString() : "—",
        initial: (u.name || "U").charAt(0).toUpperCase()
      }));

      setUsers(formatted);
      setLoading(false);
    } catch (err) {
      console.error("Admin Fetch Error:", err);
      setError("Failed to synchronize with central institutional datasets.");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      fetchDashboardData();
      
      const channel = supabase.channel('admin_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => fetchDashboardData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'clearance_requests' }, () => fetchDashboardData())
        .subscribe();

      return () => supabase.removeChannel(channel);
    }
  }, [authLoading, fetchDashboardData]);

  /* ── Memoized Filtered List ─────────────────────────────── */
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || 
                          u.email.toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === "ALL" || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, search, roleFilter]);

  const handleViewUser = (user) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <ProtectedRoute requiredRoles="admin">
      <AdminLayout>
        <div className="admin-premium-container">
          <Container fluid className="py-4">
            
            {/* Header / Hero */}
            <div className="admin-hero mb-5">
              <div className="admin-hero-content p-5 rounded-5 overflow-hidden position-relative">
                <div className="admin-hero-overlay" />
                <Row className="align-items-center position-relative z-1">
                  <Col lg={8}>
                    <Badge bg="rgba(255,255,255,0.2)" className="mb-3 px-3 py-2 rounded-pill backdrop-blur">
                      🛡️ SECURE ADMINISTRATIVE ZONE
                    </Badge>
                    <h1 className="display-4 fw-black text-white mb-2">Institutional Ledger</h1>
                    <p className="lead text-white opacity-75 mb-0">Surveillance, configuration, and authoritative control over institutional nodes.</p>
                  </Col>
                  <Col lg={4} className="text-lg-end mt-4 mt-lg-0 d-flex gap-2 justify-content-lg-end">
                    <Button 
                      className="px-4 py-3 rounded-4 border-0 shadow-lg fw-bold" 
                      style={{ background: "white", color: "#4F46E5" }}
                      onClick={fetchDashboardData}
                    >
                      ↺ Recalibrate
                    </Button>
                    <Button 
                      className="px-4 py-3 rounded-4 border-0 shadow-lg fw-bold" 
                      style={{ background: "white", color: "#10B981" }}
                      onClick={downloadReport}
                    >
                      📊 Download Report
                    </Button>
                  </Col>
                </Row>
              </div>
            </div>

            {error && <Alert variant="danger" className="border-0 shadow-sm rounded-4 mb-4">{error}</Alert>}

            {/* Statistics */}
            <Row className="g-3 mb-5 admin-stat-row">
              {[
                { label: "Total Students", value: stats.students, icon: "👥", trend: "Live Auditing", color: "#4F46E5" },
                { label: "Departments", value: stats.departments, icon: "🏛️", trend: "Active Registry", color: "#0D9488" },
                { label: "Active Requests", value: stats.clearances, icon: "⏳", trend: "Workflow Pipeline", color: "#7C3AED" },
                { label: "Pending Reviews", value: stats.pending, icon: "🔍", trend: "Action Required", color: "#D97706" },
                { label: "Approved Requests", value: stats.approved, icon: "✅", trend: "Completed", color: "#10B981" },
              ].map((stat, i) => (
                <Col md={6} lg={4} xl={3} key={i}>
                  <Card className="border-0 shadow-sm rounded-4 h-100 admin-stat-card transition-hover">
                    <Card.Body className="p-3">
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div style={{
                          width: 40, height: 40, borderRadius: 12,
                          background: `${stat.color}10`, color: stat.color,
                          display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.15rem"
                        }}>
                          {stat.icon}
                        </div>
                        <span className="badge rounded-pill admin-stat-trend" style={{ background: `${stat.color}10`, color: stat.color, fontSize: "0.62rem" }}>
                          {stat.trend}
                        </span>
                      </div>
                      <h3 className="fw-black mb-1 admin-stat-value">{stat.value}</h3>
                      <p className="text-muted small fw-bold text-uppercase mb-0 admin-stat-label">{stat.label}</p>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>

            {/* Analytics Charts */}
            <div className="mb-5">
              <h4 className="fw-bold mb-3">Clearance Analytics</h4>
              <Charts stats={stats} />
            </div>

            {/* User Management */}
            <Card className="border-0 shadow-sm rounded-5 overflow-hidden">
              <Card.Header className="bg-white p-4 border-0 d-flex flex-wrap align-items-center justify-content-between gap-3">
                <h4 className="fw-bold mb-0">Identity Registry</h4>
                <div className="d-flex gap-2 flex-grow-1 flex-md-grow-0" style={{ maxWidth: "500px" }}>
                  <Form.Control 
                    type="text" 
                    placeholder="Search by name or email..." 
                    className="rounded-4 border-light-subtle shadow-none px-3 py-2"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <Form.Select 
                    className="rounded-4 border-light-subtle shadow-none px-3"
                    style={{ width: "160px" }}
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                  >
                    <option value="ALL">All Roles</option>
                    <option value="STUDENT">Students</option>
                    <option value="DEPARTMENT">Staff</option>
                    <option value="EXAMINER">Examiners</option>
                    <option value="ADMIN">Admins</option>
                  </Form.Select>
                </div>
              </Card.Header>
              <Card.Body className="p-0">
                {loading ? (
                  <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-3 text-muted">Synchronizing with institutional ledger...</p>
                  </div>
                ) : (
                  <Table hover responsive className="mb-0 admin-table align-middle">
                    <thead className="bg-light">
                      <tr>
                        <th className="px-4 py-3 border-0 text-muted small text-uppercase fw-bold">Identity</th>
                        <th className="px-4 py-3 border-0 text-muted small text-uppercase fw-bold">Role Hierarchy</th>
                        <th className="px-4 py-3 border-0 text-muted small text-uppercase fw-bold">Temporal Sync</th>
                        <th className="px-4 py-3 border-0 text-muted small text-uppercase fw-bold text-end">Management</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.length === 0 ? (
                        <tr><td colSpan="4" className="text-center py-5 text-muted">No matching identities found.</td></tr>
                      ) : (
                        filteredUsers.map((user, idx) => (
                          <tr key={user.id + idx}>
                            <td className="px-4 py-3 border-light">
                              <div className="d-flex align-items-center gap-3">
                                <div style={{
                                  width: 42, height: 42, borderRadius: 12,
                                  background: `linear-gradient(135deg, ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}, #6366f1)`,
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  color: "white", fontWeight: 800, fontSize: "1rem"
                                }}>
                                  {user.initial}
                                </div>
                                <div>
                                  <div className="fw-bold text-slate-900">{user.name}</div>
                                  <div className="small text-muted">{user.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 border-light">
                              <Badge bg="" style={{
                                background: ROLE_BADGES[user.role]?.bg || "rgba(0,0,0,0.05)",
                                color: ROLE_BADGES[user.role]?.color || "#666",
                                border: `1px solid ${ROLE_BADGES[user.role]?.border || "transparent"}`,
                                borderRadius: "8px", fontWeight: 700, padding: "6px 12px"
                              }}>
                                {user.role}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 border-light">
                              <div className="fw-medium text-slate-800">{user.joinDate}</div>
                              <div className="small text-muted opacity-75">Registration Complete</div>
                            </td>
                            <td className="px-4 py-3 border-light text-end">
                              <Button 
                                variant="light" 
                                className="rounded-pill px-3 py-1 fw-bold text-indigo-600 shadow-sm border"
                                onClick={() => handleViewUser(user)}
                              >
                                View Identity
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
          </Container>
          
          {/* User Detail Modal */}
          <UserDetailModal 
            show={showModal} 
            onHide={() => setShowModal(false)} 
            user={selectedUser} 
          />
        </div>

        <style jsx>{`
          @keyframes heroRise {
            from { opacity: 0; transform: translateY(14px); }
            to { opacity: 1; transform: translateY(0); }
          }

          @keyframes statRise {
            from { opacity: 0; transform: translateY(16px) scale(0.985); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }

          .admin-hero-content {
            background: linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%);
            box-shadow: 0 20px 40px rgba(67, 56, 202, 0.25);
            animation: heroRise 0.45s ease-out;
          }
          .admin-hero-overlay {
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            background: url("https://www.transparenttextures.com/patterns/carbon-fibre.png");
            opacity: 0.1;
          }

          .admin-stat-card {
            border: 1px solid #e2e8f0;
            background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
            position: relative;
            overflow: hidden;
            transition: transform 0.28s ease, box-shadow 0.28s ease, border-color 0.28s ease;
            animation: statRise 0.45s ease-out backwards;
          }

          .admin-stat-card::before {
            content: "";
            position: absolute;
            inset: 0 0 auto 0;
            height: 3px;
            background: linear-gradient(90deg, #4f46e5, #06b6d4);
            opacity: 0;
            transition: opacity 0.25s ease;
          }

          .admin-stat-row > :nth-child(1) .admin-stat-card { animation-delay: 0.03s; }
          .admin-stat-row > :nth-child(2) .admin-stat-card { animation-delay: 0.08s; }
          .admin-stat-row > :nth-child(3) .admin-stat-card { animation-delay: 0.13s; }
          .admin-stat-row > :nth-child(4) .admin-stat-card { animation-delay: 0.18s; }
          .admin-stat-row > :nth-child(5) .admin-stat-card { animation-delay: 0.23s; }

          .admin-stat-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 16px 28px rgba(30, 41, 59, 0.12) !important;
            border-color: rgba(79, 70, 229, 0.35);
          }

          .admin-stat-card:hover::before {
            opacity: 1;
          }

          .admin-stat-value {
            font-size: clamp(1.8rem, 2.5vw, 2.2rem);
            line-height: 1.05;
            color: #0f172a;
            letter-spacing: -0.02em;
          }

          .admin-stat-label {
            letter-spacing: 0.04em;
          }

          .admin-stat-trend {
            padding: 0.35rem 0.58rem;
            border: 1px solid rgba(148, 163, 184, 0.2);
          }

          .admin-hero button {
            transition: transform 0.25s ease, box-shadow 0.25s ease;
          }

          .admin-hero button:hover {
            transform: translateY(-2px) scale(1.01);
            box-shadow: 0 12px 22px rgba(30, 41, 59, 0.16) !important;
          }

          .admin-table tbody tr:hover {
            background-color: #f8fafc;
            cursor: pointer;
          }
          .backdrop-blur {
            backdrop-filter: blur(8px);
          }
          .text-slate-800 { color: #1e293b; }
          .text-indigo-600 { color: #4F46E5; }
          .fw-black { fontWeight: 900; }
        `}</style>
      </AdminLayout>
    </ProtectedRoute>
  );
}