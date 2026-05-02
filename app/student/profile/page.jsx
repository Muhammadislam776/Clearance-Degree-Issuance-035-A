"use client";
import React, { useMemo } from "react";
import { Container, Row, Col, Card, Badge, Button } from "react-bootstrap";
import StudentLayout from "@/components/layout/StudentLayout";
import { useAuth } from "@/lib/useAuth";
import { logoutUser } from "@/lib/authService";
import "@/styles/dashboard-premium.css";

export default function ProfilePage() {
  const { profile } = useAuth();

  const [loggingOut, setLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const result = await logoutUser();
      if (result.success) {
        window.location.href = "/login";
      }
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setLoggingOut(false);
    }
  };

  const initials = useMemo(() => {
    const name = String(profile?.name || "").trim();
    if (!name) return "S";
    return name
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 1)
      .toUpperCase();
  }, [profile?.name]);

  return (
    <StudentLayout>
      <Container
        fluid
        className="py-5"
        style={{
          minHeight: "calc(100vh - 80px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0f1a",
          position: "relative",
          overflow: "hidden"
        }}
      >
        {/* Background Decorative Gradients */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "radial-gradient(circle at 10% 20%, rgba(37, 99, 235, 0.1) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(124, 58, 237, 0.1) 0%, transparent 40%)", pointerEvents: "none" }}></div>
        <Col xs={12} md={8} lg={5} xl={4} className="animate-profile-entry">
          <Card className="border-0 shadow-2xl overflow-hidden profile-card-master">
            {/* Header: Premium Gradient Backsplash */}
            <div className="profile-hero-section">
              <div className="hero-noise"></div>
              <div className="hero-content p-4 text-center">
                <div className="profile-avatar-glass mx-auto mb-3">
                  <div className="avatar-inner">{initials}</div>
                  <div className="avatar-orbit"></div>
                </div>
                <h1 className="display-name text-white fw-black mb-1">
                  {profile?.name || "Student Name"}
                </h1>
                <div className="d-flex justify-content-center mt-3">
                  <span className="role-chip">
                    <span className="chip-dot"></span>
                    University Student
                  </span>
                </div>
              </div>
            </div>

            {/* Content: Deep Slate Details */}
            <div className="profile-details-section p-4">
              <div className="details-grid">
                <div className="detail-row mb-4">
                  <div className="detail-kicker">Email Address</div>
                  <div className="detail-main-value text-white">{profile?.email || "student@university.edu"}</div>
                </div>

                <div className="detail-row mb-4">
                  <div className="detail-kicker">Registration Number</div>
                  <div className="detail-main-value text-white">{profile?.roll_number || "FA23-BCS-000"}</div>
                </div>

                <div className="detail-row mb-4">
                  <div className="detail-kicker">Academic Department</div>
                  <div className="detail-main-value text-primary-gradient">{profile?.department_name || "Computer Science"}</div>
                </div>

                <div className="detail-row mb-5">
                  <div className="detail-kicker">Account Status</div>
                  <div className="detail-main-value text-white d-flex align-items-center gap-2">
                    <div className="status-badge-glow">
                      <span className="dot"></span>
                      Verified Student
                    </div>
                  </div>
                </div>
              </div>

              {/* Action: Professional Logout */}
              <Button 
                onClick={handleLogout}
                disabled={loggingOut}
                className="btn-premium-logout w-100"
              >
                <span className="btn-content">
                  {loggingOut ? (
                    <>
                      <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                      Signing Out...
                    </>
                  ) : (
                    "Sign Out Account"
                  )}
                </span>
                <span className="btn-shine"></span>
              </Button>

              <div className="text-center mt-4 opacity-40 small text-white fw-bold">
                Student Portal v2.0 • Secured Identity
              </div>
            </div>
          </Card>
        </Col>

        <style jsx global>{`
          :global(body) {
            background-color: #0b0f1a !important;
            margin: 0;
            padding: 0;
          }

          .fw-black { font-weight: 900; }
          
          .profile-card-master {
            background: #0f172a !important;
            border-radius: 40px !important;
            border: 1px solid rgba(255, 255, 255, 0.08) !important;
            box-shadow: 0 50px 100px -20px rgba(0, 0, 0, 0.7) !important;
          }

          .profile-hero-section {
            position: relative;
            background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
            overflow: hidden;
          }

          .hero-noise {
            position: absolute;
            inset: 0;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
            opacity: 0.15;
            mix-blend-mode: overlay;
          }

          .profile-avatar-glass {
            width: 110px;
            height: 110px;
            position: relative;
            padding: 4px;
            background: linear-gradient(135deg, rgba(255,255,255,0.4), rgba(255,255,255,0.1));
            border-radius: 34px;
            box-shadow: 0 15px 30px rgba(0,0,0,0.3);
          }

          .avatar-inner {
            width: 100%;
            height: 100%;
            background: #0f172a;
            border-radius: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 3rem;
            font-weight: 900;
            color: white;
            position: relative;
            z-index: 2;
          }

          .avatar-orbit {
            position: absolute;
            inset: -8px;
            border: 2px solid rgba(255,255,255,0.1);
            border-radius: 40px;
            animation: rotate 10s linear infinite;
          }

          @keyframes rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          .display-name {
            font-size: 2.2rem;
            letter-spacing: -1.2px;
            text-shadow: 0 10px 20px rgba(0,0,0,0.2);
          }

          .role-chip {
            background: rgba(0,0,0,0.3);
            border: 1px solid rgba(255,255,255,0.1);
            padding: 6px 18px;
            border-radius: 12px;
            color: white;
            font-weight: 800;
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 1.2px;
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .chip-dot {
            width: 7px;
            height: 7px;
            background: #60a5fa;
            border-radius: 50%;
            box-shadow: 0 0 10px #60a5fa;
          }

          .profile-details-section {
            background: #0f172a;
          }

          .detail-kicker {
            color: #94a3b8;
            font-weight: 800;
            font-size: 0.7rem;
            text-transform: uppercase;
            letter-spacing: 1.1px;
            margin-bottom: 4px;
          }

          .detail-main-value {
            font-size: 1.15rem;
            font-weight: 900;
            letter-spacing: -0.2px;
          }

          .text-primary-gradient {
            background: linear-gradient(90deg, #60a5fa, #a78bfa);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }

          .status-badge-glow {
            display: flex;
            align-items: center;
            gap: 8px;
            background: rgba(16, 185, 129, 0.1);
            padding: 6px 12px;
            border-radius: 10px;
            border: 1px solid rgba(16, 185, 129, 0.2);
            color: #10b981;
            font-weight: 800;
            font-size: 0.9rem;
          }

          .status-badge-glow .dot {
            width: 7px;
            height: 7px;
            background: #10b981;
            border-radius: 50%;
            animation: pulse 2s infinite;
          }

          @keyframes pulse {
            0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
            70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
            100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
          }

          .btn-premium-logout {
            position: relative;
            background: #ef4444 !important;
            border: none !important;
            height: 56px;
            border-radius: 16px !important;
            overflow: hidden;
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          }

          .btn-content {
            position: relative;
            z-index: 2;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            font-weight: 900;
            font-size: 1.05rem;
            color: white;
          }

          .btn-premium-logout:hover {
            transform: translateY(-4px) scale(1.02);
            box-shadow: 0 20px 40px rgba(239, 68, 68, 0.4);
            background: #f87171 !important;
          }

          .btn-shine {
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
            transition: 0.5s;
          }

          .btn-premium-logout:hover .btn-shine {
            left: 100%;
          }

          .animate-profile-entry {
            animation: profileSlideUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
          }

          @keyframes profileSlideUp {
            from { opacity: 0; transform: translateY(40px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </Container>
    </StudentLayout>
  );
}
