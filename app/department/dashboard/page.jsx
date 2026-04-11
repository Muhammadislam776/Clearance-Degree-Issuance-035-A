"use client";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Container, Row, Col, Card, Table, Button, Badge, Spinner, Alert, OverlayTrigger, Tooltip } from "react-bootstrap";
import ProtectedRoute from "@/components/ProtectedRoute";
import DepartmentLayout from "@/components/layout/DepartmentLayout";
import { useAuth } from "@/lib/useAuth";
import { useSection } from "@/lib/SectionContext";
import { supabase } from "@/lib/supabaseClient";
import { updateClearanceTaskStatus } from "@/lib/clearanceService";
import ReviewModal from "@/components/department/ReviewModal";

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

  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
  });

  const fetchClearanceRequests = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      setError("");

      const deptId = activeSection?.id;
      if (!deptId) return;

      let query = supabase
        .from("clearance_status")
        .select(`
          id,
          status,
          remarks,
          request_id,
          updated_at,
          clearance_requests!inner (
            id,
            created_at,
            notes,
            students!inner (
              name,
              roll_number,
              email
            )
          )
        `);

      if (deptId !== "all") {
        query = query.eq("department_id", deptId);
      }

      const { data, error: fetchError } = await query.order("updated_at", { ascending: false });

      if (fetchError) throw fetchError;

      const formatted = data.map(item => ({
        taskId: item.id,
        id: item.clearance_requests?.id || item.request_id,
        student: item.clearance_requests?.students?.name || "Student",
        rollNo: item.clearance_requests?.students?.roll_number || "N/A",
        email: item.clearance_requests?.students?.email || "N/A",
        dateSubmitted: item.clearance_requests?.created_at 
          ? new Date(item.clearance_requests.created_at).toLocaleDateString() 
          : "N/A",
        status: item.status || "pending",
        remarks: item.remarks || "",
        notes: item.clearance_requests?.notes || "",
        raw_updated_at: item.updated_at
      }));

      setClearanceRequests(formatted);
      
      setStats({
        total: formatted.length,
        approved: formatted.filter(r => r.status === "approved").length,
        pending: formatted.filter(r => r.status === "pending").length,
        rejected: formatted.filter(r => r.status === "rejected").length,
      });

      setLoading(false);
    } catch (err) {
      console.error("Dashboard Fetch Error:", err.message || err);
      setError("Synchronization Error: Check database permissions or RLS policies.");
      setLoading(false);
    }
  }, [activeSection?.id]);

  useEffect(() => {
    if (!authLoading && activeSection?.id) {
      fetchClearanceRequests();

      // Broaden real-time to listen for any clearance change relevant to this view
      const channel = supabase
        .channel(`institutional-hub-${activeSection.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "clearance_status",
          },
          (payload) => {
            // Instant refresh for all events
            fetchClearanceRequests(true);
            
            if (payload.eventType === "INSERT") {
              setNewRequestPulse(payload.new.id);
              setTimeout(() => setNewRequestPulse(null), 5000);
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log("Real-time connected");
          }
        });

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [authLoading, activeSection?.id, fetchClearanceRequests]);

  const handleReview = (request) => {
    setSelectedRequest(request);
    setShowReviewModal(true);
  };

  const handleAction = async (requestId, status, remarks) => {
    const request = clearanceRequests.find(r => r.id === requestId);
    if (!request) return;

    const result = await updateClearanceTaskStatus(request.taskId, status, remarks);
    if (result.success) {
      // Local optimistic update
      setClearanceRequests(prev => prev.map(req => 
        req.taskId === request.taskId ? { ...req, status, remarks } : req
      ));
      fetchClearanceRequests(true);
    } else {
      alert("Action failed: " + result.error);
    }
  };

  const filteredRequests = useMemo(() => {
    return clearanceRequests.filter(req => 
      selectedFilter === "all" ? true : req.status === selectedFilter
    );
  }, [clearanceRequests, selectedFilter]);

  return (
    <div className="fade-in-up p-2 p-md-4">
      {/* Section Header */}
      <div className="mb-5">
        <Row className="align-items-center">
          <Col md={8}>
            <div className="d-flex align-items-center mb-2 gap-2">
              <Badge bg="primary" className="px-3 py-2 rounded-pill shadow-sm" style={{ fontSize: "0.7rem", letterSpacing: "1px", background: "linear-gradient(135deg, #6366f1, #a855f7)" }}>
                {activeSection?.name?.toUpperCase() || "HUB OVERVIEW"}
              </Badge>
              <div className="d-flex align-items-center gap-1 bg-white px-2 py-1 rounded-pill shadow-sm" style={{ fontSize: "0.65rem" }}>
                <span className="live-orb"></span>
                <span className="text-dark fw-bold">LIVE SYNC</span>
              </div>
            </div>
            <h1 className="fw-800 display-6 mb-2">Institutional Hub</h1>
            <p className="text-muted lead mb-0">Manage student clearance across vital segments through a unified interface.</p>
          </Col>
          <Col md={4} className="text-md-end mt-4 mt-md-0">
            <Button 
              variant="outline-primary" 
              className="rounded-pill px-4 border-2 fw-bold" 
              onClick={() => fetchClearanceRequests()}
              disabled={loading}
            >
              {loading ? <Spinner size="sm" className="me-2" /> : "↺ Refresh Registry"}
            </Button>
          </Col>
        </Row>
      </div>

      {error && <Alert variant="danger" className="border-0 shadow-sm mb-4" style={{ borderRadius: "16px" }}>{error}</Alert>}

      {/* Attractive Stats Cards */}
      <Row className="g-4 mb-5">
        {[
          { label: "Total Requests", value: stats.total, color: "#6366f1", icon: "📊", sub: "Global Volume" },
          { label: "Ready to Issue", value: stats.approved, color: "#10b981", icon: "🎯", sub: "Clearance Granted" },
          { label: "Pending Review", value: stats.pending, color: "#f59e0b", icon: "⌛", sub: "Active Queue" },
          { label: "Action Needed", value: stats.rejected, color: "#ef4444", icon: "🛑", sub: "Rejected / Disputes" },
        ].map((s, i) => (
          <Col lg={3} md={6} key={i}>
            <Card className="card-premium border-0 h-100" style={{ boxShadow: "0 10px 30px -10px rgba(0,0,0,0.05)" }}>
              <Card.Body className="p-4">
                <div className="p-2 mb-3 rounded-3 d-inline-block" style={{ backgroundColor: s.color + "15", fontSize: "1.2rem" }}>
                  {s.icon}
                </div>
                <div className="h1 fw-800 mb-1" style={{ color: s.color }}>{s.value}</div>
                <div className="fw-bold text-dark small">{s.label}</div>
                <div className="text-muted x-small mt-1">{s.sub}</div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Main Content Area */}
      <Card className="border-0 shadow-sm overflow-hidden" style={{ borderRadius: "24px" }}>
        <Card.Header className="bg-white p-4 border-0 d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div>
            <h4 className="fw-bold mb-0">Clearance Pipeline</h4>
            <p className="text-muted small mb-0">Real-time incoming clearance stream for <strong className="text-primary">{activeSection?.name}</strong></p>
          </div>
          <div className="d-flex gap-2 bg-light p-1 rounded-pill shadow-inner">
            {["all", "pending", "approved", "rejected"].map((f) => (
              <Button 
                key={f} 
                variant={selectedFilter === f ? "primary" : "link"}
                size="sm"
                className={`rounded-pill px-4 transition-all text-decoration-none border-0 ${selectedFilter === f ? "shadow-sm fw-bold" : "text-muted fw-medium"}`}
                onClick={() => setSelectedFilter(f)}
                style={selectedFilter === f ? { background: "linear-gradient(135deg, #6366f1, #a855f7)" } : {}}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Button>
            ))}
          </div>
        </Card.Header>
        <Card.Body className="p-3">
          {loading && clearanceRequests.length === 0 ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" style={{ borderWidth: "3px" }} />
              <p className="mt-3 text-muted fw-medium">Synchronizing with institutional core...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-5">
              <div style={{ fontSize: "5rem", opacity: "0.2" }}>🗂️</div>
              <h5 className="fw-bold mt-3">Registry Empty</h5>
              <p className="text-muted">No student requests found in the <strong>{activeSection?.name}</strong> queue.</p>
            </div>
          ) : (
            <Table responsive hover className="mb-0 custom-table">
              <thead>
                <tr>
                  <th className="text-uppercase x-small fw-800 text-muted">Student Profile</th>
                  <th className="text-uppercase x-small fw-800 text-muted">Roll Number</th>
                  <th className="text-uppercase x-small fw-800 text-muted">Application Date</th>
                  <th className="text-uppercase x-small fw-800 text-muted text-center">Current Status</th>
                  <th className="text-end text-uppercase x-small fw-800 text-muted">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((req) => (
                  <tr 
                    key={req.taskId} 
                    className={newRequestPulse === req.taskId ? "pulse-primary" : ""}
                    onClick={() => handleReview(req)}
                    style={{ cursor: "pointer" }}
                  >
                    <td>
                      <div className="d-flex align-items-center">
                        <div 
                          className="rounded-lg d-flex align-items-center justify-content-center fw-bold text-white me-3"
                          style={{ width: "42px", height: "42px", borderRadius: "12px", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", boxShadow: "0 4px 10px rgba(102, 126, 234, 0.3)" }}
                        >
                          {req.student.charAt(0)}
                        </div>
                        <div>
                          <div className="fw-bold text-dark">{req.student}</div>
                          <div className="text-muted x-small">{req.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="align-middle fw-600 font-monospace text-primary">{req.rollNo}</td>
                    <td className="align-middle text-muted small">{req.dateSubmitted}</td>
                    <td className="align-middle text-center">
                      <Badge 
                        pill 
                        className={`px-3 py-2 fw-bold ${
                          req.status === 'approved' ? 'bg-success-subtle text-success' : 
                          req.status === 'rejected' ? 'bg-danger-subtle text-danger' : 
                          'bg-warning-subtle text-warning'
                        }`}
                        style={{ fontSize: "0.65rem", letterSpacing: "1px" }}
                      >
                        {req.status === 'pending' ? '⏳ PENDING' : req.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="text-end align-middle">
                      <Button 
                        variant="primary" 
                        size="sm" 
                        className="rounded-pill px-4 border-0 shadow-sm fw-bold"
                        style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", fontSize: "0.8rem" }}
                        onClick={(e) => { e.stopPropagation(); handleReview(req); }}
                      >
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

      <ReviewModal
        show={showReviewModal}
        onHide={() => setShowReviewModal(false)}
        request={selectedRequest}
        onAction={handleAction}
      />
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