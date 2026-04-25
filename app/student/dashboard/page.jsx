"use client";

import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Button, Spinner, Alert, Badge } from "react-bootstrap";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import StudentLayout from "@/components/layout/StudentLayout";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { getStudentClearances } from "@/lib/clearanceService";

function statusVariant(status) {
  const s = (status || "").toLowerCase();
  if (["approved", "completed", "cleared"].includes(s)) return "success";
  if (["rejected", "cancelled", "canceled"].includes(s)) return "danger";
  if (["in_progress", "in progress", "pending"].includes(s)) return "warning";
  return "secondary";
}

export default function StudentDashboard() {
  const { user, profile, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clearances, setClearances] = useState([]);

  const loadData = async (studentId) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await getStudentClearances(studentId);
      if (fetchError) throw new Error(fetchError);
      
      setClearances(data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && profile?.student_id) {
      loadData(profile.student_id);

      // Subscribe for instant updates (Real-time)
      const channel = supabase
        .channel(`student-dash-${profile.student_id}`)
        .on("postgres_changes", {
          event: "*",
          schema: "public",
          table: "clearance_requests",
          filter: `student_id=eq.${profile.student_id}`,
        }, () => loadData(profile.student_id))
        .on("postgres_changes", {
          event: "*",
          schema: "public",
          table: "clearance_status"
        }, () => loadData(profile.student_id))
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else if (!authLoading && !profile?.student_id) {
      setLoading(false);
    }
  }, [authLoading, profile?.student_id]);

  const latest = clearances?.[0];

  return (
    <ProtectedRoute requiredRoles="student">
      <StudentLayout>
        <Container fluid className="py-4 px-md-5" style={{ background: "#F4F7F9", minHeight: "calc(100vh - 80px)" }}>
          {/* Dashboard Hero */}
          <div 
            className="p-5 mb-5 text-white shadow-lg" 
            style={{ 
              background: "linear-gradient(135deg, #0062FF 0%, #6366F1 60%, #8B5CF6 100%)", 
              borderRadius: "24px",
              position: "relative",
              overflow: "hidden"
            }}
          >
            <div style={{ position: "absolute", top: "-20px", right: "-20px", fontSize: "12rem", opacity: 0.1 }}>🎓</div>
            <Row className="align-items-center">
              <Col md={8} style={{ position: "relative", zIndex: 1 }}>
                <h1 className="display-4 fw-bold mb-3">Hello, {profile?.name?.split(' ')[0] || "Scholar"}!</h1>
                <p className="lead mb-4 opacity-75">
                  {clearances.length > 0 
                    ? `You have ${clearances.length} active clearance request(s) in progress.` 
                    : "Ready to start your graduation journey? Apply for clearance below."}
                </p>
                <div className="d-flex gap-3">
                  <Link href="/student/clearance">
                    <Button variant="light" className="rounded-pill px-4 py-2 fw-bold text-primary">New Application</Button>
                  </Link>
                  <Button variant="outline-light" className="rounded-pill px-4 py-2 border-2">How it works</Button>
                </div>
              </Col>
            </Row>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" size="lg" />
              <p className="mt-3 text-muted fw-bold">Connecting to IQRA Secure Hub...</p>
            </div>
          ) : error ? (
            <Alert variant="danger" className="rounded-4 border-0 shadow-sm p-4 text-center">
              <h4 className="fw-bold">Synchronization Error</h4>
              <p>{error}</p>
              <Button onClick={() => loadData(profile?.student_id)} variant="outline-danger" className="rounded-pill">Retry Sync</Button>
            </Alert>
          ) : clearances.length === 0 ? (
            <Card className="border-0 shadow-sm p-5 text-center mt-4" style={{ borderRadius: "20px" }}>
              <div style={{ fontSize: "5rem" }}>📦</div>
              <h2 className="fw-bold mt-3">No Active Requests</h2>
              <p className="text-muted mx-auto" style={{ maxWidth: "500px" }}>
                Pending requests older than 4 days with no activity are automatically archived to keep your workspace clean. 
                Start a fresh application to begin the process.
              </p>
              <Link href="/student/clearance" className="mt-2">
                <Button size="lg" className="rounded-pill px-5 btn-premium-primary border-0">Start Clearance</Button>
              </Link>
            </Card>
          ) : (
            <>
              {/* Stats & Current Progress */}
              <Row className="g-4 mb-5">
                <Col lg={8}>
                  <Card className="border-0 shadow-sm h-100 p-4" style={{ borderRadius: "20px" }}>
                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <h4 className="fw-bold mb-0">Clearance Journey</h4>
                      <Badge bg={statusVariant(latest.overall_status)} className="px-3 py-2 rounded-pill text-uppercase">
                        {latest.overall_status}
                      </Badge>
                    </div>
                    
                    {latest.overall_status === "completed" && (
                      <div className="mb-4">
                        <Alert variant="success" className="d-flex justify-content-between align-items-center border-0 shadow-sm rounded-4">
                          <div>
                            <strong>Congratulations!</strong> Your clearance is fully approved.
                          </div>
                          <Button 
                            variant="success" 
                            className="rounded-pill px-4 fw-bold shadow-sm"
                            onClick={async () => {
                              try {
                                const { generateDegreePDF } = await import("@/lib/generateDegree");
                                generateDegreePDF(
                                  profile?.name || "Student", 
                                  profile?.roll_number || "XX-XXXX"
                                );
                              } catch(e) {
                                console.error(e);
                                alert("Failed to generate PDF.");
                              }
                            }}
                          >
                            🎓 Download Degree
                          </Button>
                        </Alert>
                      </div>
                    )}
                    
                    <div className="mb-4">
                      <div className="d-flex justify-content-between mb-2">
                        <span className="text-muted small fw-bold">General Progress</span>
                        <span className="text-primary small fw-bold">{latest.progress}%</span>
                      </div>
                      <div className="progress rounded-pill" style={{ height: "12px" }}>
                        <div 
                          className="progress-bar progress-bar-striped progress-bar-animated bg-primary" 
                          style={{ width: `${latest.progress}%` }}
                        ></div>
                      </div>
                    </div>

                    <p className="small text-muted mb-4 opacity-75">
                       Departmental reviews: <strong>{latest.approved_count} Approved</strong> out of {latest.total_departments} 
                    </p>

                    <Link href={`/student/clearance`}>
                      <Button variant="outline-primary" className="rounded-pill w-100 py-2 border-2 fw-bold">View Full Activity Log</Button>
                    </Link>
                  </Card>
                </Col>

                <Col lg={4}>
                  <Row className="g-3">
                    <Col xs={12}>
                      <Card className="border-0 shadow-sm p-3 text-center" style={{ borderRadius: "16px", background: "#fff" }}>
                        <div className="text-muted small text-uppercase mb-1">Last Submission</div>
                        <div className="h5 fw-bold mb-0">{new Date(latest.created_at).toLocaleDateString()}</div>
                      </Card>
                    </Col>
                    <Col xs={12}>
                      <Card className="border-0 shadow-sm p-3 text-center" style={{ borderRadius: "16px", background: "#fff" }}>
                        <div className="text-muted small text-uppercase mb-1">Departments Contacted</div>
                        <div className="h5 fw-bold mb-0 text-success">{latest.total_departments} Units</div>
                      </Card>
                    </Col>
                    <Col xs={12}>
                      <Card className="border-0 shadow-sm p-3 text-center" style={{ borderRadius: "16px", background: "#fff" }}>
                        <div className="text-muted small text-uppercase mb-1">Feedback Alerts</div>
                        <div className="h5 fw-bold mb-0 text-danger">{latest.rejected_count} Flags</div>
                      </Card>
                    </Col>
                  </Row>
                </Col>
              </Row>

              {/* Quick Hub */}
              <h4 className="fw-bold mb-4">Quick Navigation</h4>
              <Row className="g-3">
                {[
                  { icon: "💬", title: "Chat", link: "/student/chat", desc: "Talk to departments" },
                  { icon: "🔔", title: "Alerts", link: "/student/notifications", desc: "Real-time updates" },
                  { icon: "📁", title: "Files", link: "/student/clearance", desc: "Your documents" },
                  { icon: "👤", title: "Profile", link: "/student/profile", desc: "Account settings" }
                ].map((item, idx) => (
                  <Col key={idx} xs={6} md={3}>
                    <Link href={item.link} className="text-decoration-none">
                      <Card className="border-0 shadow-sm p-4 text-center hover-lift h-100" style={{ borderRadius: "18px" }}>
                        <div style={{ fontSize: "2.5rem" }} className="mb-2">{item.icon}</div>
                        <div className="fw-bold text-dark mb-1">{item.title}</div>
                        <div className="text-muted extra-small">{item.desc}</div>
                      </Card>
                    </Link>
                  </Col>
                ))}
              </Row>
            </>
          )}

          {/* Global Styles for Hover Effects */}
          <style jsx global>{`
            .hover-lift { transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); cursor: pointer; }
            .hover-lift:hover { transform: translateY(-8px); }
            .extra-small { font-size: 0.75rem; }
            .btn-premium-primary { background: linear-gradient(135deg, #0062FF, #6366F1); color: white; }
          `}</style>
        </Container>
      </StudentLayout>
    </ProtectedRoute>
  );
}
