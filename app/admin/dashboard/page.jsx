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

function UserDetailModal({ show, onHide, user, loading }) {
  if (!user) return null;

  const role = String(user.role || "").toUpperCase();
  const userRecord = user.userRecord || null;
  const studentRecord = user.studentRecord || null;
  const deptRecord = user.deptRecord || null;

  const formatLabel = (key) =>
    String(key || "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

  const detailEntries = (record, excludedKeys = []) => {
    if (!record) return [];
    return Object.entries(record).filter(([k, v]) => {
      if (excludedKeys.includes(k)) return false;
      if (v === null || v === undefined || v === "") return false;
      return true;
    });
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered className="glass-modal">
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold text-white">Identity Profile</Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4 pt-2">
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" />
            <div className="small text-white-50 mt-3">Loading identity details...</div>
          </div>
        ) : (
          <>
        <div className="d-flex align-items-center gap-4 mb-4 p-4 user-profile-card">
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
              <span className="text-white-50 small">• Joined on {user.joinDate}</span>
            </div>
          </div>
        </div>

        <Row className="g-4">
          <Col md={6}>
            <div className="info-card-dark h-100">
              <label className="text-white-50 small text-uppercase fw-bold mb-2 d-block">Contact Identity</label>
              <div className="fw-medium">{userRecord?.email || user.email}</div>
              <div className="text-white-50 small mt-1">Primary institutional communication</div>
            </div>
          </Col>
          <Col md={6}>
            <div className="info-card-dark h-100">
              <label className="text-white-50 small text-uppercase fw-bold mb-2 d-block">Account Status</label>
              <div className="d-flex align-items-center gap-2">
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#10B981" }} />
                <span className="fw-medium">{String(userRecord?.status || "active").toUpperCase()}</span>
              </div>
              <div className="text-white-50 small mt-1">Identity verified and enabled</div>
            </div>
          </Col>

          {role === "STUDENT" && (
            <>
              <Col md={12}>
                <div className="info-card-dark">
                  <label className="text-white-50 small text-uppercase fw-bold mb-2 d-block">Student Profile</label>
                  <Row className="g-2">
                    <Col md={4}><div className="small text-white-50">Roll Number</div><div className="fw-semibold">{studentRecord?.roll_number || userRecord?.roll_number || "N/A"}</div></Col>
                    <Col md={4}><div className="small text-white-50">Department</div><div className="fw-semibold">{studentRecord?.department || userRecord?.department || "N/A"}</div></Col>
                    <Col md={4}><div className="small text-white-50">Session</div><div className="fw-semibold">{studentRecord?.session || "N/A"}</div></Col>
                  </Row>
                </div>
              </Col>

              {detailEntries(studentRecord, ["id", "user_id"]).length > 0 && (
                <Col md={12}>
                  <div className="info-card-dark">
                    <label className="text-white-50 small text-uppercase fw-bold mb-2 d-block">Additional Saved Student Fields</label>
                    <Row className="g-2">
                      {detailEntries(studentRecord, ["id", "user_id"]).map(([key, value]) => (
                        <Col md={6} key={`student-${key}`}>
                          <div className="small text-white-50">{formatLabel(key)}</div>
                          <div className="fw-medium">{String(value)}</div>
                        </Col>
                      ))}
                    </Row>
                  </div>
                </Col>
              )}
            </>
          )}

          {role === "DEPARTMENT" && (
            <>
              <Col md={12}>
                <div className="info-card-dark">
                  <label className="text-white-50 small text-uppercase fw-bold mb-2 d-block">Department Profile</label>
                  <Row className="g-2">
                    <Col md={4}><div className="small text-white-50">Department Name</div><div className="fw-semibold">{deptRecord?.name || userRecord?.department || "N/A"}</div></Col>
                    <Col md={4}><div className="small text-white-50">Focal Person</div><div className="fw-semibold">{deptRecord?.focal_person || "N/A"}</div></Col>
                    <Col md={4}><div className="small text-white-50">Contact</div><div className="fw-semibold">{deptRecord?.whatsapp_number || deptRecord?.contact || "N/A"}</div></Col>
                  </Row>
                </div>
              </Col>

              {detailEntries(deptRecord, ["id"]).length > 0 && (
                <Col md={12}>
                  <div className="info-card-dark">
                    <label className="text-white-50 small text-uppercase fw-bold mb-2 d-block">Additional Saved Department Fields</label>
                    <Row className="g-2">
                      {detailEntries(deptRecord, ["id"]).map(([key, value]) => (
                        <Col md={6} key={`dept-${key}`}>
                          <div className="small text-white-50">{formatLabel(key)}</div>
                          <div className="fw-medium">{String(value)}</div>
                        </Col>
                      ))}
                    </Row>
                  </div>
                </Col>
              )}
            </>
          )}

          {role === "EXAMINER" && (
            <>
              <Col md={12}>
                <div className="info-card-dark">
                  <label className="text-white-50 small text-uppercase fw-bold mb-2 d-block">Examiner Profile</label>
                  <Row className="g-2">
                    <Col md={4}><div className="small text-white-50">Role</div><div className="fw-semibold">{userRecord?.role || "examiner"}</div></Col>
                    <Col md={4}><div className="small text-white-50">Department</div><div className="fw-semibold">{userRecord?.department || deptRecord?.name || "N/A"}</div></Col>
                    <Col md={4}><div className="small text-white-50">Status</div><div className="fw-semibold">{userRecord?.status || "active"}</div></Col>
                  </Row>
                </div>
              </Col>

              {detailEntries(userRecord, ["id", "name", "email", "role", "department", "status", "created_at"]).length > 0 && (
                <Col md={12}>
                  <div className="info-card-dark">
                    <label className="text-white-50 small text-uppercase fw-bold mb-2 d-block">Additional Saved Examiner Fields</label>
                    <Row className="g-2">
                      {detailEntries(userRecord, ["id", "name", "email", "role", "department", "status", "created_at"]).map(([key, value]) => (
                        <Col md={6} key={`examiner-${key}`}>
                          <div className="small text-white-50">{formatLabel(key)}</div>
                          <div className="fw-medium">{String(value)}</div>
                        </Col>
                      ))}
                    </Row>
                  </div>
                </Col>
              )}
            </>
          )}

          {role === "ADMIN" && (
            <Col md={12}>
              <div className="info-card-dark">
                <label className="text-white-50 small text-uppercase fw-bold mb-2 d-block">Admin Profile</label>
                <Row className="g-2">
                  {detailEntries(userRecord, ["id"]).map(([key, value]) => (
                    <Col md={6} key={`admin-${key}`}>
                      <div className="small text-white-50">{formatLabel(key)}</div>
                      <div className="fw-medium">{String(value)}</div>
                    </Col>
                  ))}
                </Row>
              </div>
            </Col>
          )}

          <Col md={12}>
            <div className="info-card-dark">
              <label className="text-white-50 small text-uppercase fw-bold mb-2 d-block">Administrative Actions</label>
              <div className="d-flex gap-2">
                <Button variant="outline-primary" size="sm" className="rounded-pill px-3">Reset Authentication</Button>
                <Button variant="outline-danger" size="sm" className="rounded-pill px-3">Restrict Identity</Button>
                <Button variant="secondary" size="sm" className="rounded-pill px-3 ms-auto" onClick={onHide}>Close</Button>
              </div>
            </div>
          </Col>
        </Row>
          </>
        )}
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
  const [detailLoading, setDetailLoading] = useState(false);

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

  const handleViewUser = async (user) => {
    setSelectedUser(user);
    setShowModal(true);
    setDetailLoading(true);

    try {
      const role = String(user.role || "").toLowerCase();

      const { data: userRecord } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      let studentRecord = null;
      let deptRecord = null;

      if (role === "student") {
        const { data } = await supabase
          .from("students")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        studentRecord = data || null;

        const deptName = studentRecord?.department || userRecord?.department || null;
        if (deptName) {
          const { data: deptData } = await supabase
            .from("departments")
            .select("*")
            .eq("name", deptName)
            .maybeSingle();
          deptRecord = deptData || null;
        }
      }

      if (role === "department" || role === "examiner") {
        const deptName = userRecord?.department || null;
        if (deptName) {
          const { data: deptData } = await supabase
            .from("departments")
            .select("*")
            .eq("name", deptName)
            .maybeSingle();
          deptRecord = deptData || null;
        }
      }

      setSelectedUser({
        ...user,
        userRecord: userRecord || null,
        studentRecord,
        deptRecord,
      });
    } catch (detailErr) {
      console.error("Detail fetch error:", detailErr);
    } finally {
      setDetailLoading(false);
    }
  };

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <ProtectedRoute requiredRoles="admin">
      <AdminLayout>
        <div className="admin-premium-container">
          <Container fluid className="py-2">
            
            {/* Header / Hero */}
            <div className="admin-hero mb-4">
              <div className="admin-hero-content p-4 rounded-4 overflow-hidden position-relative border border-white-10">
                <div className="admin-hero-overlay" />
                <Row className="align-items-center position-relative z-1">
                  <Col lg={8}>
                    <div className="admin-badge mb-2">🛡️ SECURE ADMINISTRATIVE ZONE</div>
                    <h1 className="fw-black text-white mb-2 admin-title">Institutional Ledger</h1>
                    <p className="text-white opacity-75 mb-0 admin-subtitle">Authoritative control over institutional nodes & clearance workflows.</p>
                  </Col>
                  <Col lg={4} className="text-lg-end mt-3 mt-lg-0 d-flex gap-2 justify-content-lg-end">
                    <Button 
                      className="admin-btn-secondary"
                      onClick={fetchDashboardData}
                    >
                      ↺ Recalibrate
                    </Button>
                    <Button 
                      className="admin-btn-primary"
                      onClick={downloadReport}
                    >
                      📊 Download Report
                    </Button>
                  </Col>
                </Row>
              </div>
            </div>

            {error && <Alert variant="danger" className="border-0 shadow-sm rounded-4 mb-4">{error}</Alert>}

            {/* Statistics Row - Custom Flex Grid to fit all in one row */}
            <div className="admin-stat-flex-row mb-5">
              {[
                { label: "Students", value: stats.students, icon: "👥", color: "#4F46E5" },
                { label: "Departments", value: stats.departments, icon: "🏛️", color: "#0D9488" },
                { label: "Active Requests", value: stats.clearances, icon: "⏳", color: "#7C3AED" },
                { label: "Pending Reviews", value: stats.pending, icon: "🔍", color: "#D97706" },
                { label: "Approved", value: stats.approved, icon: "✅", color: "#10B981" },
              ].map((stat, i) => (
                <div key={i} className="admin-stat-flex-item">
                  <Card className="admin-stat-card-glass h-100">
                    <Card.Body className="p-3 d-flex flex-column justify-content-between">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <div className="stat-icon-wrap" style={{ background: `${stat.color}20`, color: stat.color }}>
                          {stat.icon}
                        </div>
                      </div>
                      <div>
                        <h3 className="stat-value text-white mb-0">{stat.value}</h3>
                        <div className="stat-label-text text-muted text-uppercase">{stat.label}</div>
                      </div>
                    </Card.Body>
                  </Card>
                </div>
              ))}
            </div>

            <Row className="g-4">
              <Col lg={8}>
                {/* User Management */}
                <Card className="admin-panel-glass overflow-hidden h-100">
                  <div className="admin-panel-header p-4 d-flex flex-wrap align-items-center justify-content-between gap-3">
                    <div>
                      <h5 className="fw-bold text-white mb-1 admin-identity-title">Identity Registry</h5>
                      <p className="mb-0 admin-identity-subtitle">Verified users across students, staff, examiners, and admins</p>
                    </div>
                    <div className="d-flex align-items-center gap-2 flex-grow-1 flex-md-grow-0 admin-identity-tools">
                      <div className="admin-user-count-chip">{filteredUsers.length} visible</div>
                      <Form.Control 
                        type="text" 
                        placeholder="Search identities..." 
                        className="admin-search-input"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                      <Form.Select 
                        className="admin-filter-select"
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
                  </div>
                  <Card.Body className="p-0">
                    {loading ? (
                      <div className="text-center py-5">
                        <Spinner animation="border" variant="primary" />
                        <p className="mt-3 text-muted">Syncing data...</p>
                      </div>
                    ) : (
                      <Table hover responsive className="mb-0 admin-table-dark align-middle">
                        <thead>
                          <tr>
                            <th className="px-4 py-3 border-0">Identity</th>
                            <th className="px-4 py-3 border-0">Role</th>
                            <th className="px-4 py-3 border-0 text-end">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredUsers.length === 0 ? (
                            <tr><td colSpan="3" className="text-center py-5 text-muted">No records found.</td></tr>
                          ) : (
                            filteredUsers.slice(0, 8).map((user, idx) => (
                              <tr key={user.id + idx} className="admin-identity-row" onClick={() => handleViewUser(user)}>
                                <td className="px-4 py-3">
                                  <div className="d-flex align-items-center gap-3">
                                    <div className="admin-avatar-small" style={{ background: `linear-gradient(135deg, ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}, #6366f1)` }}>
                                      {user.initial}
                                    </div>
                                    <div>
                                      <div className="fw-bold text-white">{user.name}</div>
                                      <div className="small text-muted">{user.email}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <Badge className="admin-role-badge" style={{ 
                                    background: ROLE_BADGES[user.role]?.bg, 
                                    color: ROLE_BADGES[user.role]?.color,
                                    borderColor: ROLE_BADGES[user.role]?.border 
                                  }}>
                                    {user.role}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3 text-end">
                                  <Button variant="link" className="admin-view-btn">View Details</Button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </Table>
                    )}
                  </Card.Body>
                </Card>
              </Col>
              
              <Col lg={4}>
                {/* Analytics / Quick Info */}
                <Card className="admin-panel-glass h-100 p-4">
                  <h5 className="fw-bold text-white mb-4">Quick Analytics</h5>
                  <Charts stats={stats} />
                  <div className="mt-4 pt-4 border-top border-white-10">
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted small">System Uptime</span>
                      <span className="text-success small fw-bold">99.9%</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted small">Last Sync</span>
                      <span className="text-white-50 small">Just now</span>
                    </div>
                  </div>
                </Card>
              </Col>
            </Row>

          </Container>
          
          {/* User Detail Modal */}
          <UserDetailModal 
            show={showModal} 
            onHide={() => setShowModal(false)} 
            user={selectedUser} 
            loading={detailLoading}
          />
        </div>

        <style jsx global>{`
          @keyframes adminFadeUp {
            from { opacity: 0; transform: translateY(18px); }
            to { opacity: 1; transform: translateY(0); }
          }

          .admin-premium-container {
            position: relative;
            isolation: isolate;
          }

          .admin-premium-container::after {
            content: "";
            position: fixed;
            right: 18px;
            bottom: 28px;
            width: 160px;
            height: 160px;
            border-radius: 999px;
            pointer-events: none;
            background: radial-gradient(circle, rgba(129,140,248,0.75) 0%, rgba(59,130,246,0.14) 55%, rgba(59,130,246,0) 72%);
            z-index: 0;
          }

          .admin-hero-content {
            background: linear-gradient(135deg, #1e1b4b 0%, #312e81 45%, #4338ca 100%);
            box-shadow: 0 20px 50px rgba(15, 23, 42, 0.3);
            animation: adminFadeUp 0.6s ease-out;
          }

          .admin-badge {
            display: inline-block;
            padding: 4px 12px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 999px;
            font-size: 0.7rem;
            font-weight: 800;
            color: #fff;
            letter-spacing: 0.05em;
            text-transform: uppercase;
          }

          .admin-title { font-size: clamp(1.8rem, 3vw, 2.8rem); line-height: 1.1; }
          .admin-subtitle { max-width: 600px; font-size: 1rem; }

          .admin-btn-primary {
            background: linear-gradient(135deg, #2563EB, #4F46E5);
            color: #fff;
            border: 1px solid rgba(255,255,255,0.22);
            font-weight: 800;
            padding: 0.8rem 1.4rem;
            border-radius: 14px;
            box-shadow: 0 10px 24px rgba(37,99,235,0.28);
            transition: all 0.2s ease;
          }
          .admin-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(37,99,235,0.38); background: linear-gradient(135deg, #3B82F6, #6366F1); color: #fff; }

          .admin-btn-secondary {
            background: rgba(255, 255, 255, 0.1);
            color: #fff;
            border: 1px solid rgba(255, 255, 255, 0.2);
            font-weight: 700;
            padding: 0.8rem 1.4rem;
            border-radius: 14px;
            transition: all 0.2s ease;
            backdrop-filter: blur(8px);
          }
          .admin-btn-secondary:hover { background: rgba(255, 255, 255, 0.2); transform: translateY(-2px); }

          /* Stat Row Layout */
          .admin-stat-flex-row {
            display: flex;
            gap: 1rem;
            flex-wrap: nowrap;
            overflow-x: auto;
            padding-bottom: 0.5rem;
          }
          .admin-stat-flex-item {
            flex: 1;
            min-width: 180px;
            animation: adminFadeUp 0.5s ease-out backwards;
          }
          .admin-stat-flex-item:nth-child(1) { animation-delay: 0.1s; }
          .admin-stat-flex-item:nth-child(2) { animation-delay: 0.15s; }
          .admin-stat-flex-item:nth-child(3) { animation-delay: 0.2s; }
          .admin-stat-flex-item:nth-child(4) { animation-delay: 0.25s; }
          .admin-stat-flex-item:nth-child(5) { animation-delay: 0.3s; }

          .admin-stat-card-glass {
            background: linear-gradient(180deg, rgba(15,23,42,0.92) 0%, rgba(30,41,59,0.92) 100%) !important;
            border: 1px solid rgba(148, 163, 184, 0.18) !important;
            border-radius: 20px;
            backdrop-filter: blur(12px);
            transition: all 0.3s ease;
            box-shadow: 0 12px 30px rgba(2,6,23,0.3);
          }
          .admin-stat-card-glass:hover {
            transform: translateY(-5px);
            border-color: rgba(96, 165, 250, 0.4);
            background: rgba(30, 41, 59, 0.8);
            box-shadow: 0 15px 35px rgba(0,0,0,0.3);
          }

          .stat-icon-wrap {
            width: 38px; height: 38px; border-radius: 12px;
            display: flex; alignItems: center; justifyContent: center;
            font-size: 1.1rem;
          }
          .stat-value { font-size: 1.8rem; font-weight: 900; }
          .stat-label-text { font-size: 0.65rem; font-weight: 800; letter-spacing: 0.05em; }

          .admin-panel-glass {
            background: linear-gradient(180deg, rgba(15,23,42,0.94) 0%, rgba(30,41,59,0.94) 100%) !important;
            border: 1px solid rgba(148, 163, 184, 0.18) !important;
            border-radius: 24px;
            backdrop-filter: blur(12px);
            animation: adminFadeUp 0.6s ease-out 0.4s backwards;
            box-shadow: 0 16px 34px rgba(2,6,23,0.34);
            overflow: hidden;
          }

          .admin-panel-header {
            background: rgba(15, 23, 42, 0.44);
            border-bottom: 1px solid rgba(148, 163, 184, 0.14);
          }

          .admin-identity-title {
            letter-spacing: -0.02em;
          }

          .admin-identity-subtitle {
            font-size: 0.85rem;
            color: #94A3B8;
          }

          .admin-user-count-chip {
            padding: 0.42rem 0.76rem;
            border-radius: 999px;
            font-size: 0.72rem;
            font-weight: 800;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            color: #bfdbfe;
            background: rgba(37,99,235,0.22);
            border: 1px solid rgba(96,165,250,0.4);
            white-space: nowrap;
          }

          .admin-panel-glass .table-responsive {
            background: transparent !important;
          }

          .admin-search-input, .admin-filter-select {
            background: rgba(15, 23, 42, 0.8) !important;
            border: 1px solid rgba(148, 163, 184, 0.2) !important;
            color: #fff !important;
            border-radius: 12px !important;
            min-height: 52px;
          }
          .admin-search-input::placeholder { color: rgba(255,255,255,0.4); }

          .admin-search-input:focus,
          .admin-filter-select:focus {
            border-color: rgba(96,165,250,0.52) !important;
            box-shadow: 0 0 0 0.2rem rgba(59,130,246,0.18) !important;
          }

          .admin-table-dark { color: #e2e8f0; border-collapse: separate; border-spacing: 0 4px; }
          .admin-table-dark thead th { background: rgba(15, 23, 42, 0.78); color: #94a3b8; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 800; }
          .admin-table-dark tbody tr { transition: all 0.2s ease; cursor: pointer; background: transparent !important; }
          .admin-table-dark tbody tr td {
            background: rgba(15,23,42,0.62) !important;
            border-top: 1px solid rgba(255,255,255,0.03);
            border-bottom: 1px solid rgba(255,255,255,0.03);
            position: relative;
          }
          .admin-table-dark tbody tr td:first-child {
            border-top-left-radius: 12px;
            border-bottom-left-radius: 12px;
          }
          .admin-table-dark tbody tr td:last-child {
            border-top-right-radius: 12px;
            border-bottom-right-radius: 12px;
          }
          .admin-table-dark tbody tr:hover td {
            background: rgba(30,41,59,0.8) !important;
          }

          .admin-identity-row td:first-child::before {
            content: "";
            position: absolute;
            left: 0;
            top: 10px;
            bottom: 10px;
            width: 3px;
            border-radius: 999px;
            background: linear-gradient(180deg, #60A5FA 0%, #A78BFA 100%);
            opacity: 0;
            transition: opacity 0.2s ease;
          }

          .admin-identity-row:hover td:first-child::before {
            opacity: 1;
          }

          .admin-chart-card {
            background: linear-gradient(180deg, rgba(15,23,42,0.94) 0%, rgba(30,41,59,0.94) 100%) !important;
            border: 1px solid rgba(148,163,184,0.18) !important;
            box-shadow: 0 12px 30px rgba(2,6,23,0.34);
            backdrop-filter: blur(10px);
          }

          .admin-avatar-small { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 800; }
          .admin-role-badge { padding: 6px 12px; border-radius: 999px; font-weight: 800; font-size: 0.65rem; border: 1px solid transparent; letter-spacing: 0.04em; }
          .admin-view-btn {
            color: #dbeafe;
            text-decoration: none;
            font-weight: 800;
            font-size: 0.79rem;
            padding: 0.42rem 0.72rem;
            border-radius: 999px;
            background: rgba(37,99,235,0.18);
            border: 1px solid rgba(96,165,250,0.34);
          }
          .admin-view-btn:hover {
            color: #fff;
            background: rgba(59,130,246,0.3);
            border-color: rgba(147,197,253,0.44);
          }

          /* Modal Styling */
          .glass-modal .modal-content {
            background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
            border: 1px solid rgba(148, 163, 184, 0.2);
            border-radius: 28px;
            color: #f8fafc;
            box-shadow: 0 20px 44px rgba(2,6,23,0.5);
          }
          .glass-modal .modal-header .btn-close { filter: invert(1) brightness(2); }
          .user-profile-card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; }
          .info-card-dark { background: rgba(15,23,42,0.8); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 1rem; }

          @media (max-width: 991px) {
            .admin-stat-flex-row { flex-wrap: wrap; }
            .admin-stat-flex-item { flex: 1 1 45%; }
            .admin-identity-tools {
              width: 100%;
            }
          }
          @media (max-width: 576px) {
            .admin-stat-flex-item { flex: 1 1 100%; }
            .admin-user-count-chip {
              display: none;
            }
          }
        `}</style>
      </AdminLayout>
    </ProtectedRoute>
  );
}
