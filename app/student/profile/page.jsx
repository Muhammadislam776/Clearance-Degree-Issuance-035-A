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
      <Container fluid className="py-4 fade-in-up">
        <div className="dashboard-header mb-4 shadow-sm border-0" style={{ background: "linear-gradient(135deg, #1D4ED8 0%, #7C3AED 100%)" }}>
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
            <Card className="card-premium border-0 overflow-hidden shadow-lg h-100">
              <div className="card-header-accent" style={{ height: 6, background: "linear-gradient(90deg, #2563EB, #8B5CF6)" }} />
              <Card.Body className="p-4">
                <div className="text-center mb-4">
                  <div
                    className="mx-auto mb-3 d-flex align-items-center justify-content-center shadow-lg"
                    style={{ width: 96, height: 96, borderRadius: 28, background: "linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)", color: "#fff", fontSize: "2.1rem", fontWeight: 900 }}
                  >
                    {initials}
                  </div>
                  <h3 className="fw-bold mb-1">{profile?.name || "Student Name"}</h3>
                  <p className="text-muted mb-0">{profile?.email || "student@email.com"}</p>
                </div>

                <div className="rounded-4 p-3" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-uppercase small fw-bold text-muted">Registration No.</span>
                    <span className="fw-bold">{profile?.roll_number || "PENDING"}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-uppercase small fw-bold text-muted">Department</span>
                    <span className="fw-bold text-end">{profile?.department_name || "N/A"}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-uppercase small fw-bold text-muted">Status</span>
                    <Badge bg="success" className="rounded-pill">Active</Badge>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={4}>
            <Card className="card-premium border-0 shadow-lg h-100">
              <div className="card-header-accent" style={{ height: 6, background: "linear-gradient(90deg, #0EA5E9, #14B8A6)" }} />
              <Card.Body className="p-4">
                <div className="d-flex align-items-center mb-4">
                  <div className="bg-primary bg-opacity-10 p-2 rounded-3 me-3">👤</div>
                  <h5 className="fw-bold mb-0">Identity Details</h5>
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

                <div className="mt-4 p-3 rounded-4" style={{ background: "#EEF2FF" }}>
                  <div className="small text-uppercase fw-bold text-primary mb-1">Aesthetic Profile Card</div>
                  <div className="text-muted small">A cleaner, read-only profile dashboard with everything you need at a glance.</div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={4}>
            <Card className="card-premium border-0 shadow-lg h-100">
              <div className="card-header-accent" style={{ height: 6, background: "linear-gradient(90deg, #22C55E, #16A34A)" }} />
              <Card.Body className="p-4">
                <div className="d-flex align-items-center mb-4">
                  <div className="bg-success bg-opacity-10 p-2 rounded-3 me-3">🏢</div>
                  <h5 className="fw-bold mb-0">Department Contact</h5>
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

                <div className="mt-4 p-3 rounded-4" style={{ background: "#F0FDF4" }}>
                  <div className="small text-uppercase fw-bold text-success mb-1">Contact Focus</div>
                  <div className="text-muted small">These department details are pulled directly from the active profile context.</div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <style jsx>{`
          .profile-detail-item {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            padding: 14px 0;
            border-bottom: 1px solid #E5E7EB;
          }
          .profile-detail-item:last-child { border-bottom: 0; }
          .profile-detail-item .label {
            color: #64748B;
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.06em;
          }
          .profile-detail-item .value {
            color: #0F172A;
            font-size: 14px;
            font-weight: 700;
            text-align: right;
          }
        `}</style>
      </Container>
    </StudentLayout>
  );
}
