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
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchClearances = async (studentId) => {
    return getStudentClearances(studentId, false, {
      includeDocuments: false,
      requestTimeoutMs: 35000,
    });
  };

  const loadData = async (studentId, { silent = false } = {}) => {
    try {
      if (!studentId) return;

      if (!silent) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }

      setError(null);

      let result = await fetchClearances(studentId);

      // Retry once for transient slow-network/database lock scenarios.
      if (!result?.success && String(result?.error || "").toLowerCase().includes("timed out")) {
        result = await fetchClearances(studentId);
      }

      if (!result?.success) {
        throw new Error(result?.error || "Failed to sync dashboard data.");
      }
      
      setClearances(result.data || []);
    } catch (e) {
      // Keep existing data visible if we already loaded before.
      if (!clearances?.length) {
        setError(e.message);
      } else {
        setError("Live sync is temporarily delayed. Showing last updated data.");
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Use a ref to debounce real-time updates
  const refreshTimer = React.useRef(null);

  useEffect(() => {
    if (!authLoading && profile?.student_id) {
      loadData(profile.student_id);

      // Subscribe for instant updates (Real-time) with debouncing
      const handleRealtimeChange = () => {
        if (refreshTimer.current) clearTimeout(refreshTimer.current);
        refreshTimer.current = setTimeout(() => {
          loadData(profile.student_id, { silent: true });
        }, 800); // Wait 800ms after last change before refetching
      };

      const channel = supabase
        .channel(`student-dash-${profile.student_id}`)
        .on("postgres_changes", {
          event: "*",
          schema: "public",
          table: "clearance_requests",
          filter: `student_id=eq.${profile.student_id}`,
        }, handleRealtimeChange)
        .on("postgres_changes", {
          event: "*",
          schema: "public",
          table: "clearance_status"
        }, handleRealtimeChange)
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
        if (refreshTimer.current) clearTimeout(refreshTimer.current);
      };
    } else if (!authLoading && !profile?.student_id) {
      setLoading(false);
    }
  }, [authLoading, !!profile?.student_id]); // Use boolean for student_id to avoid unnecessary re-effects

  const latest = clearances?.[0];
  const isDegreeIssued = !!latest?.degree_issued;
  const overallStatus = (latest?.overall_status || "").toLowerCase();

  const workflowProgress = latest
    ? (isDegreeIssued || overallStatus === "completed" ? 100 
      : overallStatus === "approved" ? 95 
      : Math.min(Number(latest.progress || 0), 90))
    : 0;

  return (
    <ProtectedRoute requiredRoles="student">
      <StudentLayout>
        <Container
          fluid
          className="py-4 px-md-5"
          style={{
            background:
              "radial-gradient(1200px 480px at 8% -10%, rgba(37,99,235,0.28), rgba(37,99,235,0) 60%), radial-gradient(900px 420px at 92% 4%, rgba(139,92,246,0.24), rgba(139,92,246,0) 58%), linear-gradient(180deg, #0b1220 0%, #0f172a 46%, #111827 100%)",
            minHeight: "calc(100vh - 80px)",
          }}
        >
          {/* Dashboard Hero */}
          <div 
            className="p-5 mb-5 text-white shadow-lg animate-fade-in-up hero-glass" 
            style={{ 
              background: "linear-gradient(135deg, rgba(0, 98, 255, 0.9) 0%, rgba(99, 102, 241, 0.8) 60%, rgba(139, 92, 246, 0.7) 100%)", 
              borderRadius: "32px",
              position: "relative",
              overflow: "hidden",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              backdropFilter: "blur(10px)"
            }}
          >
            <div className="hero-glow"></div>
            <div style={{ position: "absolute", top: "-30px", right: "-30px", fontSize: "14rem", opacity: 0.1, filter: "blur(2px)" }}>🎓</div>
            <Row className="align-items-center">
              <Col md={8} style={{ position: "relative", zIndex: 2 }}>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <Badge bg="primary" className="rounded-pill px-3 py-2 bg-opacity-25 border border-primary border-opacity-50">STUDENT PORTAL</Badge>
                  <div className="pulse-dot"></div>
                  <span className="small opacity-75 fw-bold">SYSTEM ACTIVE</span>
                </div>
                <h1 className="display-4 fw-black mb-3" style={{ letterSpacing: "-0.02em" }}>Hello, {profile?.name?.split(' ')[0] || "Scholar"}!</h1>
                <p className="lead mb-4 opacity-90" style={{ maxWidth: "600px" }}>
                  {clearances.length > 0 
                    ? `You have ${clearances.length} active clearance request(s) being reviewed by the departments.` 
                    : "Ready to transition from student to alumni? Your graduation journey starts with a simple clearance application."}
                </p>
                <div className="d-flex gap-3 flex-wrap">
                  <Link href="/student/clearance">
                    <Button variant="light" className="rounded-pill px-5 py-3 fw-bold text-primary shadow-lg hover-scale">Apply for Clearance</Button>
                  </Link>
                  <Button variant="outline-light" className="rounded-pill px-4 py-3 border-2 fw-bold hover-glow">How it works</Button>
                </div>
              </Col>
            </Row>
          </div>


          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" size="lg" />
              <p className="mt-3 text-muted fw-bold">Connecting to IQRA Secure Hub...</p>
            </div>
          ) : error && clearances.length === 0 ? (
            <Alert variant="danger" className="rounded-4 border-0 shadow-sm p-4 text-center">
              <h4 className="fw-bold">Synchronization Error</h4>
              <p>{error}</p>
              <Button onClick={() => loadData(profile?.student_id)} variant="outline-danger" className="rounded-pill">Retry Sync</Button>
            </Alert>
          ) : clearances.length === 0 ? (
            <Card className="border-0 shadow-lg p-5 text-center mt-4 premium-glass-card welcome-gateway" style={{ borderRadius: "32px", background: "rgba(15, 23, 42, 0.6)" }}>
              <div className="gateway-icon-wrap mb-4 mx-auto">
                <span style={{ fontSize: "5rem" }}>🚀</span>
              </div>
              <h2 className="fw-black mt-3 mb-3" style={{ fontSize: "2.5rem" }}>Begin Your Clearance</h2>
              <p className="text-muted mx-auto mb-5" style={{ maxWidth: "550px", fontSize: "1.1rem", lineHeight: "1.6" }}>
                Pending requests older than 4 days with no activity are automatically archived. 
                Submit a fresh application to start your departmental reviews and track your degree issuance progress in real-time.
              </p>
              <div className="d-flex justify-content-center gap-3 flex-wrap">
                <Link href="/student/clearance">
                  <Button size="lg" className="rounded-pill px-5 py-3 btn-premium-primary border-0 fw-bold shadow-glow">
                    Start New Application
                  </Button>
                </Link>
                <Link href="/student/chat">
                  <Button size="lg" variant="outline-light" className="rounded-pill px-5 py-3 border-2 fw-bold opacity-75">
                    Consult Support
                  </Button>
                </Link>
              </div>
            </Card>

          ) : (
            <>
              {error ? (
                <Alert variant="warning" className="rounded-4 border-0 shadow-sm mb-4">
                  {error}
                </Alert>
              ) : null}

              {isRefreshing ? (
                <div className="d-flex align-items-center gap-2 mb-3 text-info small fw-bold">
                  <Spinner animation="border" size="sm" />
                  <span>Syncing latest updates...</span>
                </div>
              ) : null}

              {/* Stats & Current Progress */}
              <Row className="g-4 mb-5">
                <Col lg={8} className="animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
                  <Card className="border-0 shadow-sm h-100 p-4 premium-glass-card" style={{ borderRadius: "20px" }}>
                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <h4 className="fw-bold mb-0">Clearance Journey</h4>
                      <Badge bg={statusVariant(latest.overall_status)} className="px-3 py-2 rounded-pill text-uppercase">
                        {latest.overall_status}
                      </Badge>
                    </div>
                    
                    {isDegreeIssued && (
                      <div className="mb-4">
                        <Alert variant="success" className="d-flex justify-content-between align-items-center border-0 shadow-sm rounded-4">
                          <div>
                            <strong>Congratulations!</strong> Your degree has been officially issued.
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

                    {!isDegreeIssued && overallStatus !== "completed" && (
                      <div className="mb-4">
                        {overallStatus === "approved" ? (
                          <Alert variant="success" className="border-0 shadow-sm rounded-4 mb-0" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
                            <strong>Examiner Approved!</strong> Your clearance is vetted. Final degree issuance by the academic department is now in progress.
                          </Alert>
                        ) : latest.progress >= 100 ? (
                          <Alert variant="info" className="border-0 shadow-sm rounded-4 mb-0" style={{ background: "rgba(59, 130, 246, 0.15)", color: "#60a5fa", border: "1px solid rgba(59, 130, 246, 0.3)" }}>
                            All departments have approved your request. Examiner review and academic degree issuance are still pending.
                          </Alert>
                        ) : null}
                      </div>
                    )}
                    
                    <div className="mb-4">
                      <div className="d-flex justify-content-between mb-2">
                        <span className="text-muted small fw-bold">General Progress</span>
                        <span className="text-primary small fw-bold">{workflowProgress}%</span>
                      </div>
                      <div className="progress rounded-pill" style={{ height: "12px" }}>
                        <div 
                          className="progress-bar progress-bar-striped progress-bar-animated bg-primary" 
                          style={{ width: `${workflowProgress}%` }}
                        ></div>
                      </div>
                    </div>

                    <p className="small text-muted mb-4">
                       Departmental reviews: <strong>{latest.approved_count} Approved</strong> out of {latest.total_departments} 
                    </p>

                    <Link href={`/student/clearance`}>
                      <Button variant="outline-primary" className="rounded-pill w-100 py-2 border-2 fw-bold">View Full Activity Log</Button>
                    </Link>
                  </Card>
                </Col>

                <Col lg={4}>
                  <Row className="g-3">
                    <Col xs={12} className="animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
                      <Card className="border-0 shadow-sm p-3 text-center premium-glass-card" style={{ borderRadius: "16px" }}>
                        <div className="small text-uppercase mb-1 stat-label">Last Submission</div>
                        <div className="h5 fw-bold mb-0 stat-value">{new Date(latest.created_at).toLocaleDateString()}</div>
                      </Card>
                    </Col>
                    <Col xs={12} className="animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
                      <Card className="border-0 shadow-sm p-3 text-center premium-glass-card" style={{ borderRadius: "16px" }}>
                        <div className="small text-uppercase mb-1 stat-label">Departments Contacted</div>
                        <div className="h5 fw-bold mb-0 stat-value stat-value--success">{latest.total_departments} Units</div>
                      </Card>
                    </Col>
                    <Col xs={12} className="animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
                      <Card className="border-0 shadow-sm p-3 text-center premium-glass-card" style={{ borderRadius: "16px" }}>
                        <div className="small text-uppercase mb-1 stat-label">Feedback Alerts</div>
                        <div className="h5 fw-bold mb-0 stat-value stat-value--danger">{latest.rejected_count} Flags</div>
                      </Card>
                    </Col>
                  </Row>
                </Col>
              </Row>

              {/* Quick Hub */}
              <h4 className="fw-bold mb-4 text-white">Quick Navigation</h4>
              <Row className="g-3">
                {[
                  { icon: "💬", title: "Chat", link: "/student/chat", desc: "Talk to departments" },
                  { icon: "🔔", title: "Alerts", link: "/student/notifications", desc: "Real-time updates" },
                  { icon: "📁", title: "Files", link: "/student/clearance", desc: "Your documents" },
                  { icon: "👤", title: "Profile", link: "/student/profile", desc: "Account settings" }
                ].map((item, idx) => (
                  <Col key={idx} xs={6} md={3} className="animate-fade-in-up" style={{ animationDelay: `${0.5 + idx * 0.1}s` }}>
                    <Link href={item.link} className="text-decoration-none">
                      <Card
                        className="border-0 shadow-sm p-4 text-center premium-glass-card h-100"
                        style={{
                          borderRadius: "18px",
                          background: "rgba(30, 41, 59, 0.78)",
                          border: "1px solid rgba(148, 163, 184, 0.28)",
                          backdropFilter: "blur(6px)",
                        }}
                      >
                        <div style={{ fontSize: "2.5rem" }} className="mb-2">{item.icon}</div>
                        <div className="fw-bold quick-nav-title mb-1">{item.title}</div>
                        <div className="quick-nav-desc extra-small">{item.desc}</div>
                      </Card>
                    </Link>
                  </Col>
                ))}
              </Row>
            </>
          )}

          {/* Global Styles for Hover Effects */}
          <style jsx global>{`
            /* Dashboard Specific Adjustments */
            :global(body) {
              background-color: #0b1220 !important;
            }

            .fw-black { font-weight: 900; }
            
            .hero-glass {
              box-shadow: 0 30px 60px rgba(0, 0, 0, 0.4) !important;
            }

            .hero-glow {
              position: absolute;
              top: -50%; left: -20%;
              width: 100%; height: 200%;
              background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
              transform: rotate(-20deg);
              pointer-events: none;
            }

            .pulse-dot {
              width: 8px; height: 8px;
              background: #10b981;
              border-radius: 50%;
              box-shadow: 0 0 0 rgba(16, 185, 129, 0.4);
              animation: dotPulse 2s infinite;
            }

            @keyframes dotPulse {
              0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
              70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
              100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
            }

            .hover-scale { transition: all 0.3s ease; }
            .hover-scale:hover { transform: scale(1.05); }

            .hover-glow:hover {
              background: rgba(255, 255, 255, 0.1) !important;
              box-shadow: 0 0 20px rgba(255, 255, 255, 0.2);
            }

            .welcome-gateway {
              animation: cardFloatIn 0.8s cubic-bezier(0.16, 1, 0.3, 1);
            }

            .gateway-icon-wrap {
              width: 120px; height: 120px;
              background: rgba(59, 130, 246, 0.1);
              border-radius: 50%;
              display: flex; align-items: center; justify-content: center;
              border: 1px solid rgba(59, 130, 246, 0.2);
              animation: float 4s ease-in-out infinite;
            }

            @keyframes float {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-10px); }
            }

            .shadow-glow {
              box-shadow: 0 15px 30px rgba(0, 98, 255, 0.4) !important;
            }

            .animate-fade-in-up {
              animation: fadeInUp 0.6s ease-out both;
            }
            @keyframes fadeInUp {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
            }

            .premium-glass-card {
              background: rgba(30, 41, 59, 0.6) !important;
              border: 1px solid rgba(255, 255, 255, 0.08) !important;
              backdrop-filter: blur(12px) !important;
              color: #f8fafc !important;
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
            }

            .premium-glass-card:hover {
              transform: translateY(-8px) scale(1.01);
              border-color: rgba(96, 165, 250, 0.4) !important;
              box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5) !important;
              background: rgba(30, 41, 59, 0.8) !important;
            }

            .stat-label {
              color: #94a3b8;
              font-size: 0.7rem;
              font-weight: 800;
              letter-spacing: 0.1em;
            }
            .stat-value { color: #ffffff; font-size: 1.5rem; letter-spacing: -0.01em; }
            .stat-value--success { color: #34d399; }
            .stat-value--danger { color: #f87171; }
            
            .btn-premium-primary { 
              background: linear-gradient(135deg, #2563eb, #7c3aed) !important; 
              color: white; 
              border: none !important;
            }

            .progress {
              background-color: rgba(255, 255, 255, 0.05) !important;
              height: 14px !important;
            }
            .progress-bar {
              background: linear-gradient(90deg, #2563eb, #7c3aed) !important;
              box-shadow: 0 0 15px rgba(37, 99, 235, 0.4);
            }

          `}</style>
        </Container>
      </StudentLayout>
    </ProtectedRoute>
  );
}
