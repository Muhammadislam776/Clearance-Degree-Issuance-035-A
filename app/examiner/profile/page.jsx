"use client";

import React from "react";
import { Badge, Button, Card, Col, Container, Row, Spinner } from "react-bootstrap";
import ProtectedRoute from "@/components/ProtectedRoute";
import ExaminerLayout from "@/components/layout/ExaminerLayout";
import { useAuth } from "@/lib/useAuth";
import { logoutUser } from "@/lib/authService";
import { useRouter } from "next/navigation";

function ExaminerProfileContent() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    const result = await logoutUser();
    if (result.success) {
      router.push("/login");
    }
  };

  if (authLoading) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: "60vh" }}>
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  const initials = String(profile?.name || "EX")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col lg={6} md={8}>
          <Card className="border-0 shadow-lg overflow-hidden profile-card-modern">
            <div className="profile-header-gradient p-5 text-center">
              <div className="profile-avatar-large mx-auto mb-3">
                {initials}
              </div>
              <h2 className="fw-bold text-white mb-1">{profile?.name || "Examiner Name"}</h2>
              <Badge bg="rgba(255,255,255,0.2)" className="rounded-pill px-3 py-2 text-white border border-white-50">
                Official Examiner
              </Badge>
            </div>
            
            <Card.Body className="p-4 bg-dark text-light">
              <div className="profile-info-grid">
                <div className="info-item mb-4">
                  <label className="text-muted small text-uppercase fw-bold mb-1">Email Address</label>
                  <div className="h5 fw-semibold">{profile?.email || "N/A"}</div>
                </div>

                <div className="info-item mb-4">
                  <label className="text-muted small text-uppercase fw-bold mb-1">Account Role</label>
                  <div className="h5 fw-semibold d-flex align-items-center gap-2">
                    <span className="role-dot"></span>
                    {profile?.role === 'examiner' ? 'System Examiner' : profile?.role || 'User'}
                  </div>
                </div>

                <div className="info-item mb-4">
                  <label className="text-muted small text-uppercase fw-bold mb-1">Department</label>
                  <div className="h5 fw-semibold">{profile?.department_name || profile?.department || "University Authority"}</div>
                </div>
              </div>

              <hr className="my-4 border-secondary opacity-25" />

              <div className="d-grid">
                <Button 
                  variant="danger" 
                  className="py-3 rounded-4 fw-bold logout-btn-premium"
                  onClick={handleLogout}
                >
                  <span className="me-2">🚪</span> Sign Out Account
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <style jsx>{`
        .profile-card-modern {
          border-radius: 32px;
          background: #111827;
        }

        .profile-header-gradient {
          background: linear-gradient(135deg, #4338ca 0%, #6366f1 100%);
          position: relative;
        }

        .profile-avatar-large {
          width: 100px;
          height: 100px;
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(8px);
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.5rem;
          font-weight: 800;
          color: #fff;
          box-shadow: 0 15px 35px rgba(0,0,0,0.2);
        }

        .role-dot {
          width: 10px;
          height: 10px;
          background: #10b981;
          border-radius: 50%;
          display: inline-block;
          box-shadow: 0 0 10px #10b981;
        }

        .logout-btn-premium {
          background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
          border: none;
          transition: all 0.3s ease;
          letter-spacing: 0.5px;
        }

        .logout-btn-premium:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(239, 68, 68, 0.3);
          filter: brightness(1.1);
        }

        .info-item label {
          letter-spacing: 1px;
          display: block;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .profile-card-modern {
          animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </Container>
  );
}

export default function ExaminerProfilePage() {
  return (
    <ProtectedRoute requiredRoles="examiner">
      <ExaminerLayout>
        <ExaminerProfileContent />
      </ExaminerLayout>
    </ProtectedRoute>
  );
}
