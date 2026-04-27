"use client";
import React, { useMemo } from "react";
import { Container, Row, Col, Card, Badge } from "react-bootstrap";
import StudentLayout from "@/components/layout/StudentLayout";
import { useAuth } from "@/lib/useAuth";
import "@/styles/dashboard-premium.css";

export default function ProfilePage() {
  const { profile } = useAuth();

  const initials = useMemo(() => {
    const name = String(profile?.name || "").trim();
    if (!name) return "S";
    return name
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [profile?.name]);

  return (
    <StudentLayout>
      <Container
        fluid
        className="py-4 fade-in-up"
        style={{
          minHeight: "calc(100vh - 80px)",
          background:
            "radial-gradient(1100px 460px at 12% -8%, rgba(37,99,235,0.22), rgba(37,99,235,0) 58%), radial-gradient(900px 420px at 90% 8%, rgba(139,92,246,0.2), rgba(139,92,246,0) 56%), linear-gradient(180deg, #0b1220 0%, #111827 100%)",
        }}
      >
        <div className="dashboard-header mb-4 shadow-lg border-0 profile-hero animate-fade-in-up" style={{ 
          background: "linear-gradient(135deg, rgba(37,99,235,0.92) 0%, rgba(124,58,237,0.92) 100%)",
          borderRadius: "24px",
          padding: "30px",
          position: "relative",
          overflow: "hidden"
        }}>
          <div className="hero-glow"></div>
          <Row className="align-items-center position-relative">
            <Col md={8}>
              <div className="d-flex align-items-center gap-4 mb-2">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center text-white fw-black shadow-lg"
                  style={{ width: 64, height: 64, background: "rgba(255,255,255,0.18)", backdropFilter: "blur(12px)", fontSize: "1.5rem", border: "1px solid rgba(255,255,255,0.2)" }}
                >
                  {initials}
                </div>
                <div>
                  <h1 className="fw-black mb-1 text-white" style={{ fontSize: "2.2rem", letterSpacing: "-0.5px" }}>My Profile</h1>
                  <p className="text-white-50 mb-0 opacity-85 fw-bold" style={{ fontSize: "1.1rem" }}>Identity, registration and department contact details</p>
                </div>
              </div>
            </Col>
            <Col md={4} className="text-md-end mt-3 mt-md-0">
              <Badge bg="light" text="dark" className="px-4 py-2 rounded-pill fw-black shadow-sm" style={{ fontSize: "0.9rem" }}>
                {profile?.role === "student" ? "STUDENT ACCOUNT" : "ACADEMIC ACCOUNT"}
              </Badge>
            </Col>
          </Row>
        </div>

        <Row className="g-4">
          <Col lg={4}>
            <Card className="border-0 overflow-hidden shadow-lg h-100 profile-panel premium-glass-card">
              <div className="card-header-accent" style={{ height: 8, background: "linear-gradient(90deg, #2563EB, #8B5CF6)" }} />
              <Card.Body className="p-4 text-center">
                <div className="profile-avatar-wrap mb-4">
                  <div
                    className="mx-auto mb-3 d-flex align-items-center justify-content-center shadow-glow profile-avatar-main"
                    style={{ width: 110, height: 110, borderRadius: 32, background: "linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)", color: "#fff", fontSize: "2.5rem", fontWeight: 900 }}
                  >
                    {initials}
                  </div>
                  <Badge bg="success" className="rounded-pill status-floating-badge shadow-sm">ACTIVE</Badge>
                </div>
                <h3 className="fw-black mb-1 text-white" style={{ fontSize: "1.6rem" }}>{profile?.name || "Student Name"}</h3>
                <p className="text-muted fw-bold mb-4" style={{ fontSize: "0.95rem" }}>{profile?.email || "student@email.com"}</p>

                <div className="rounded-4 p-3 profile-info-box text-start">
                  <div className="info-row d-flex justify-content-between mb-3">
                    <span className="info-label text-uppercase">Registration</span>
                    <span className="info-value">{profile?.roll_number || "PENDING"}</span>
                  </div>
                  <div className="info-row d-flex justify-content-between mb-3">
                    <span className="info-label text-uppercase">Department</span>
                    <span className="info-value text-end">{profile?.department_name || "N/A"}</span>
                  </div>
                  <div className="info-row d-flex justify-content-between">
                    <span className="info-label text-uppercase">Account Status</span>
                    <span className="info-value text-success fw-black">VERIFIED</span>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={4}>
            <Card className="border-0 shadow-lg h-100 profile-panel premium-glass-card">
              <div className="card-header-accent" style={{ height: 8, background: "linear-gradient(90deg, #0EA5E9, #14B8A6)" }} />
              <Card.Body className="p-4">
                <div className="d-flex align-items-center mb-4">
                  <div className="profile-icon-chip me-3 shadow-sm">👤</div>
                  <h5 className="fw-black mb-0 text-white">Identity Details</h5>
                </div>

                <div className="profile-detail-item">
                  <span className="label">Full Name</span>
                  <span className="value">{profile?.name || "-"}</span>
                </div>
                <div className="profile-detail-item">
                  <span className="label">Email Address</span>
                  <span className="value">{profile?.email || "-"}</span>
                </div>
                <div className="profile-detail-item">
                  <span className="label">Reg Number</span>
                  <span className="value">{profile?.roll_number || "-"}</span>
                </div>
                <div className="profile-detail-item">
                  <span className="label">System Role</span>
                  <span className="value text-uppercase">{profile?.role || "student"}</span>
                </div>

                <div className="mt-4 p-4 rounded-4 profile-note-box shadow-sm">
                  <div className="small text-uppercase fw-black text-blue-400 mb-2" style={{ letterSpacing: "1px" }}>Secure Identity</div>
                  <div className="profile-note-text small fw-bold opacity-75">Your profile details are locked. Contact administration for identity updates.</div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={4}>
            <Card className="border-0 shadow-lg h-100 profile-panel premium-glass-card">
              <div className="card-header-accent" style={{ height: 8, background: "linear-gradient(90deg, #22C55E, #16A34A)" }} />
              <Card.Body className="p-4">
                <div className="d-flex align-items-center mb-4">
                  <div className="profile-icon-chip profile-icon-chip--green me-3 shadow-sm">🏢</div>
                  <h5 className="fw-black mb-0 text-white">Department Unit</h5>
                </div>

                <div className="profile-detail-item">
                  <span className="label">Unit Name</span>
                  <span className="value">{profile?.department_profile?.name || profile?.department_name || "-"}</span>
                </div>
                <div className="profile-detail-item">
                  <span className="label">Focal Person</span>
                  <span className="value">{profile?.department_profile?.focal_person || "N/A"}</span>
                </div>
                <div className="profile-detail-item">
                  <span className="label">Direct Phone</span>
                  <span className="value">{profile?.department_profile?.whatsapp_number || "N/A"}</span>
                </div>
                <div className="profile-detail-item">
                  <span className="label">Unit Email</span>
                  <span className="value">{profile?.department_profile?.email || "N/A"}</span>
                </div>

                <div className="mt-4 p-4 rounded-4 profile-note-box profile-note-box--green shadow-sm">
                  <div className="small text-uppercase fw-black text-green-400 mb-2" style={{ letterSpacing: "1px" }}>Unit Contact</div>
                  <div className="profile-note-text small fw-bold opacity-75">Use these details to coordinate your clearance status with the unit head.</div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <style jsx global>{`
          :global(body) {
            background-color: #0b1220 !important;
          }

          .fw-black { font-weight: 900; }

          .profile-hero {
            animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1);
          }

          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }

          .hero-glow {
            position: absolute;
            top: -50%; left: -20%;
            width: 100%; height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%);
            transform: rotate(-20deg);
            pointer-events: none;
          }

          .premium-glass-card {
            background: rgba(30, 41, 59, 0.6) !important;
            border: 1px solid rgba(255, 255, 255, 0.08) !important;
            backdrop-filter: blur(20px) !important;
            color: #f8fafc !important;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
            border-radius: 28px !important;
          }

          .premium-glass-card:hover {
            transform: translateY(-8px) scale(1.01);
            border-color: rgba(96, 165, 250, 0.4) !important;
            box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5) !important;
            background: rgba(30, 41, 59, 0.8) !important;
          }

          .profile-avatar-wrap {
            position: relative;
            display: inline-block;
          }

          .profile-avatar-main {
            transition: all 0.4s ease;
          }

          .premium-glass-card:hover .profile-avatar-main {
            transform: scale(1.05) rotate(2deg);
            box-shadow: 0 15px 30px rgba(37, 99, 235, 0.4) !important;
          }

          .status-floating-badge {
            position: absolute;
            bottom: -5px;
            right: -5px;
            padding: 8px 12px !important;
            font-size: 0.7rem !important;
            font-weight: 900;
            letter-spacing: 1px;
            border: 2px solid #0f172a;
          }

          .profile-info-box {
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.05);
          }

          .info-label {
            color: #60a5fa;
            font-size: 0.75rem;
            font-weight: 800;
            letter-spacing: 0.5px;
          }
          .info-value { color: #ffffff; font-weight: 700; }

          .profile-detail-item {
            display: flex;
            justify-content: space-between;
            padding: 16px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          }
          .profile-detail-item:last-child { border-bottom: 0; }
          
          .profile-detail-item .label {
            color: #94a3b8;
            font-size: 0.85rem;
            font-weight: 700;
          }
          .profile-detail-item .value {
            color: #ffffff;
            font-size: 0.95rem;
            font-weight: 800;
          }

          .profile-icon-chip {
            width: 44px; height: 44px;
            border-radius: 14px;
            display: flex; align-items: center; justify-content: center;
            background: rgba(37, 99, 235, 0.15);
            font-size: 1.2rem;
          }
          .profile-icon-chip--green { background: rgba(34, 197, 94, 0.15); }

          .profile-note-box { background: rgba(15, 23, 42, 0.4); border: 1px solid rgba(255, 255, 255, 0.04); }
          .profile-note-box--green { background: rgba(15, 23, 42, 0.4); }
          
          .text-blue-400 { color: #60a5fa !important; }
          .text-green-400 { color: #4ade80 !important; }

          .shadow-glow {
            box-shadow: 0 10px 20px rgba(37, 99, 235, 0.3) !important;
          }
        `}</style>

      </Container>
    </StudentLayout>
  );
}
