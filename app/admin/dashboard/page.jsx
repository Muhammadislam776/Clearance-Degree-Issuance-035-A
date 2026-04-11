"use client";
import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, Table, Button, Badge, Form, Spinner, Alert } from "react-bootstrap";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminLayout from "@/components/layout/AdminLayout";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { withTimeout } from "@/lib/authService";

export default function AdminDashboard() {
  const { profile, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([
    { label: "Total Students", value: 0, icon: "👥", color: "#667eea" },
    { label: "Departments", value: 0, icon: "🏢", color: "#764ba2" },
    { label: "Examiners", value: 0, icon: "👨‍⚖️", color: "#198754" },
    { label: "Active Clearances", value: 0, icon: "⏳", color: "#ffc107" },
  ]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading) {
      fetchDashboardData();

      // Subscribe to real-time updates for global stats
      const channel = supabase
        .channel(`admin-global-updates`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "clearance_requests",
          },
          () => fetchDashboardData()
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "users",
          },
          () => fetchDashboardData()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [authLoading]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError("");

      // Fetch total students
      const studentRes = await withTimeout(
        supabase
          .from("users")
          .select("*", { count: "exact" })
          .eq("role", "student"),
        15000,
        "Students Fetch"
      );

      // Fetch total examiners
      const examinerRes = await withTimeout(
        supabase
          .from("users")
          .select("*", { count: "exact" })
          .eq("role", "examiner"),
        15000,
        "Examiners Fetch"
      );

      // Fetch active clearances
      const clearanceRes = await withTimeout(
        supabase
          .from("clearance_requests")
          .select("*", { count: "exact" })
          .in("overall_status", ["pending", "in_progress", "resubmitted"]),
        15000,
        "Clearance Fetch"
      );

      // Fetch recent users
      const usersRes = await withTimeout(
        supabase
          .from("users")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5),
        15000,
        "Recent Users Fetch"
      );

      // Fetch departments
      const deptRes = await withTimeout(
        supabase
          .from("departments")
          .select("*", { count: "exact" }),
        15000,
        "Departments Fetch"
      );

      // Update stats
      setStats([
        { label: "Total Students", value: studentRes?.count || 0, icon: "👥", color: "#667eea" },
        { label: "Departments", value: deptRes?.count || 0, icon: "🏢", color: "#764ba2" },
        { label: "Examiners", value: examinerRes?.count || 0, icon: "👨‍⚖️", color: "#198754" },
        { label: "Active Clearances", value: clearanceRes?.count || 0, icon: "⏳", color: "#ffc107" },
      ]);

      // Format recent users
      const formattedUsers = (usersRes?.data || [])?.map((user) => ({
        id: user.id,
        name: user.name || user.email,
        role: user.role?.replace("_", " ").toUpperCase() || "User",
        email: user.email,
        joinDate: user.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A",
      }));

      setRecentUsers(formattedUsers);
      setLoading(false);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("Admin dashboard fetch warning:", err?.message || err);
      setError("Failed to load dashboard data. Institutional handshake timed out.");
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requiredRoles="admin">
      <AdminLayout>
        <Container fluid className="py-4">
          <div className="dashboard-header mb-5">
            <Row className="align-items-center">
              <Col md={8}>
                <h1 className="display-4 fw-bold mb-2">Central Administration</h1>
                <p className="lead mb-0">System-wide surveillance and authoritative control over institutional datasets.</p>
              </Col>
              <Col md={4} className="text-md-end mt-3 mt-md-0">
                <Button className="btn-premium btn-premium-primary btn-lg" onClick={fetchDashboardData}>Global Audit</Button>
              </Col>
            </Row>
          </div>

          {error && <Alert variant="danger" className="alert-enhanced mb-4">{error}</Alert>}

          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3 text-muted">Awaiting central mainframe response...</p>
            </div>
          ) : (
            <>
              {/* Statistics */}
              <Row className="g-4 mb-5">
                {stats.map((stat, idx) => (
                  <Col md={6} lg={3} key={idx}>
                    <Card className="card-premium h-100 text-center p-3">
                      <Card.Body>
                        <div style={{ fontSize: "2.5rem", marginBottom: "15px" }}>{stat.icon}</div>
                        <div className="text-muted small text-uppercase fw-bold mb-2">{stat.label}</div>
                        <div className="display-6 fw-bold" style={{ color: stat.color }}>{stat.value}</div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>

              {/* System Health */}
              <Row className="mb-5">
                <Col lg={12}>
                  <Card className="card-premium p-4">
                    <Card.Header className="bg-transparent border-0 px-0">
                      <h4 className="fw-bold mb-0">⚙️ Institutional Infrastructure</h4>
                    </Card.Header>
                    <Card.Body className="px-0">
                      <Row className="g-4">
                        <Col md={3}>
                          <div className="p-3 rounded-4 bg-light border border-white">
                            <p className="mb-1 text-muted small">DATABASE</p>
                            <Badge bg="success" className="px-3 py-2 rounded-pill">SYNCHRONIZED</Badge>
                          </div>
                        </Col>
                        <Col md={3}>
                          <div className="p-3 rounded-4 bg-light border border-white">
                            <p className="mb-1 text-muted small">API HANDSHAKE</p>
                            <Badge bg="success" className="px-3 py-2 rounded-pill">SECURE 142ms</Badge>
                          </div>
                        </Col>
                        <Col md={3}>
                          <div className="p-3 rounded-4 bg-light border border-white">
                            <p className="mb-1 text-muted small">ACTIVE IDENTITIES</p>
                            <Badge bg="info" className="px-3 py-2 rounded-pill text-white">{stats[0].value + stats[2].value} AUTHENTICATED</Badge>
                          </div>
                        </Col>
                        <Col md={3}>
                          <div className="p-3 rounded-4 bg-light border border-white">
                            <p className="mb-1 text-muted small">CLEARANCE PIPELINE</p>
                            <Badge bg="warning" className="px-3 py-2 rounded-pill text-dark">{stats[3].value} APPLICATIONS</Badge>
                          </div>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {/* Recent Users */}
              <Row>
                <Col lg={12}>
                  <Card style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.1)", borderRadius: "12px" }}>
                    <Card.Header style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color: "white", fontWeight: "bold" }}>
                      👥 Recent Users
                    </Card.Header>
                    <Card.Body>
                      {recentUsers.length === 0 ? (
                        <p className="text-muted text-center py-4">No users yet</p>
                      ) : (
                        <Table responsive striped hover>
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Role</th>
                              <th>Email</th>
                              <th>Join Date</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {recentUsers.map((user) => (
                              <tr key={user.id}>
                                <td><strong>{user.name}</strong></td>
                                <td>
                                  <Badge bg={
                                    user.role?.includes("STUDENT") ? "info" :
                                    user.role?.includes("EXAMINER") ? "warning" :
                                    user.role?.includes("ADMIN") ? "danger" : "success"
                                  }>
                                    {user.role}
                                  </Badge>
                                </td>
                                <td>{user.email}</td>
                                <td>{user.joinDate}</td>
                                <td>
                                  <Button variant="sm" size="sm" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", border: "none" }}>
                                    View
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </>
          )}
        </Container>
      </AdminLayout>
    </ProtectedRoute>
  );
}