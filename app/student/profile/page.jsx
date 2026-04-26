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
        <div className="dashboard-header mb-4 shadow-sm border-0 profile-hero" style={{ background: "linear-gradient(135deg, rgba(37,99,235,0.96) 0%, rgba(124,58,237,0.96) 100%)" }}>
          <Row className="align-items-center">
            <Col md={8}>
              <div className="d-flex align-items-center gap-3 mb-2">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                  style={{ width: 52, height: 52, background: "rgba(255,255,255,0.16)", backdropFilter: "blur(8px)" }}
                >
                  {initials}
                </div>
                <div>
                  <h1 className="fw-bold mb-1 text-white">My Profile</h1>
                  <p className="text-white-50 mb-0 opacity-75">Identity, registration and department contact details</p>
                </div>
              </div>
            </Col>
            <Col md={4} className="text-md-end mt-3 mt-md-0">
              <Badge bg="light" text="dark" className="px-3 py-2 rounded-pill fw-bold">
                {profile?.role === "student" ? "Student Account" : "Academic Account"}
              </Badge>
            </Col>
          </Row>
        </div>

        <Row className="g-4">
          <Col lg={4}>
            <Card className="card-premium border-0 overflow-hidden shadow-lg h-100 profile-panel">
              <div className="card-header-accent" style={{ height: 6, background: "linear-gradient(90deg, #2563EB, #8B5CF6)" }} />
              <Card.Body className="p-4">
                <div className="text-center mb-4">
                  <div
                    className="mx-auto mb-3 d-flex align-items-center justify-content-center shadow-lg"
                    style={{ width: 96, height: 96, borderRadius: 28, background: "linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)", color: "#fff", fontSize: "2.1rem", fontWeight: 900 }}
                  >
                    {initials}
                  </div>
                  <h3 className="fw-bold mb-1 profile-title">{profile?.name || "Student Name"}</h3>
                  <p className="profile-subtitle mb-0">{profile?.email || "student@email.com"}</p>
                </div>

                <div className="rounded-4 p-3 profile-info-box">
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-uppercase small fw-bold profile-kicker">Registration No.</span>
                    <span className="fw-bold profile-value">{profile?.roll_number || "PENDING"}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-uppercase small fw-bold profile-kicker">Department</span>
                    <span className="fw-bold text-end profile-value">{profile?.department_name || "N/A"}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-uppercase small fw-bold profile-kicker">Status</span>
                    <Badge bg="success" className="rounded-pill profile-status-badge">Active</Badge>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={4}>
            <Card className="card-premium border-0 shadow-lg h-100 profile-panel">
              <div className="card-header-accent" style={{ height: 6, background: "linear-gradient(90deg, #0EA5E9, #14B8A6)" }} />
              <Card.Body className="p-4">
                <div className="d-flex align-items-center mb-4">
                  <div className="profile-icon-chip me-3">👤</div>
                  <h5 className="fw-bold mb-0 profile-title">Identity Details</h5>
                </div>

                <div className="profile-detail-item">
                  <span className="label">Full Name</span>
                  <span className="value">{profile?.name || "-"}</span>
                </div>
                <div className="profile-detail-item">
                  <span className="label">Email</span>
                  <span className="value">{profile?.email || "-"}</span>
                </div>
                <div className="profile-detail-item">
                  <span className="label">Registration No.</span>
                  <span className="value">{profile?.roll_number || "-"}</span>
                </div>
                <div className="profile-detail-item">
                  <span className="label">Academic Role</span>
                  <span className="value">{profile?.role || "student"}</span>
                </div>

                <div className="mt-4 p-3 rounded-4 profile-note-box">
                  <div className="small text-uppercase fw-bold profile-note-label mb-1">Aesthetic Profile Card</div>
                  <div className="profile-note-text small">A cleaner, read-only profile dashboard with everything you need at a glance.</div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={4}>
            <Card className="card-premium border-0 shadow-lg h-100 profile-panel">
              <div className="card-header-accent" style={{ height: 6, background: "linear-gradient(90deg, #22C55E, #16A34A)" }} />
              <Card.Body className="p-4">
                <div className="d-flex align-items-center mb-4">
                  <div className="profile-icon-chip profile-icon-chip--green me-3">🏢</div>
                  <h5 className="fw-bold mb-0 profile-title">Department Contact</h5>
                </div>

                <div className="profile-detail-item">
                  <span className="label">Department Name</span>
                  <span className="value">{profile?.department_profile?.name || profile?.department_name || "-"}</span>
                </div>
                <div className="profile-detail-item">
                  <span className="label">Focal Person</span>
                  <span className="value">{profile?.department_profile?.focal_person || "N/A"}</span>
                </div>
                <div className="profile-detail-item">
                  <span className="label">Contact Phone</span>
                  <span className="value">{profile?.department_profile?.whatsapp_number || "N/A"}</span>
                </div>
                <div className="profile-detail-item">
                  <span className="label">Department Email</span>
                  <span className="value">{profile?.department_profile?.email || "N/A"}</span>
                </div>

                <div className="mt-4 p-3 rounded-4 profile-note-box profile-note-box--green">
                  <div className="small text-uppercase fw-bold profile-note-label profile-note-label--green mb-1">Contact Focus</div>
                  <div className="profile-note-text small">These department details are pulled directly from the active profile context.</div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <style jsx>{`
          @keyframes profileRise {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }

          .profile-hero {
            animation: profileRise 0.45s ease-out;
            box-shadow: 0 18px 40px rgba(37,99,235,0.26);
          }

          .profile-panel {
            background: linear-gradient(180deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%);
            border: 1px solid rgba(148, 163, 184, 0.2) !important;
            color: #e2e8f0;
            backdrop-filter: blur(8px);
            box-shadow: 0 16px 32px rgba(15, 23, 42, 0.28) !important;
            transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
          }

          .profile-panel:hover {
            transform: translateY(-4px);
            box-shadow: 0 22px 40px rgba(15, 23, 42, 0.38) !important;
            border-color: rgba(96, 165, 250, 0.42) !important;
          }

          .profile-detail-item {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            padding: 14px 0;
            border-bottom: 1px solid rgba(148, 163, 184, 0.16);
          }
          .profile-detail-item:last-child { border-bottom: 0; }
          .profile-detail-item .label {
            color: #93c5fd;
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.06em;
          }
          .profile-detail-item .value {
            color: #f8fafc;
            font-size: 14px;
            font-weight: 700;
            text-align: right;
          }

          .profile-title {
            color: #f8fafc;
          }

          .profile-subtitle {
            color: #cbd5e1;
          }

          .profile-info-box {
            background: linear-gradient(180deg, rgba(15, 23, 42, 0.96) 0%, rgba(30, 41, 59, 0.96) 100%);
            border: 1px solid rgba(148, 163, 184, 0.16);
          }

          .profile-kicker {
            color: #93c5fd;
          }

          .profile-value {
            color: #f8fafc;
          }

          .profile-status-badge {
            box-shadow: 0 8px 16px rgba(34, 197, 94, 0.16);
          }

          .profile-icon-chip {
            width: 40px;
            height: 40px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(37, 99, 235, 0.14);
            color: #bfdbfe;
          }

          .profile-icon-chip--green {
            background: rgba(34, 197, 94, 0.14);
            color: #bbf7d0;
          }

          .profile-note-box {
            background: linear-gradient(180deg, rgba(30, 41, 59, 0.86) 0%, rgba(15, 23, 42, 0.86) 100%);
            border: 1px solid rgba(148, 163, 184, 0.16);
          }

          .profile-note-box--green {
            background: linear-gradient(180deg, rgba(15, 23, 42, 0.86) 0%, rgba(30, 41, 59, 0.86) 100%);
          }

          .profile-note-label {
            color: #93c5fd;
          }

          .profile-note-label--green {
            color: #86efac;
          }

          .profile-note-text {
            color: #cbd5e1;
          }

          .dashboard-header {
            border-radius: 18px;
            overflow: hidden;
          }

          .card-header-accent {
            opacity: 0.95;
          }
        `}</style>
      </Container>
    </StudentLayout>
  );
}
