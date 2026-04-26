"use client";
import React, { useMemo } from "react";
import { Container, Navbar, Nav, Dropdown } from "react-bootstrap";
import { useRouter } from "next/navigation";
import { logoutUser } from "@/lib/authService";
import { useAuth } from "@/lib/useAuth";
import AIChatbot from "@/components/chatbot/AIChatbot";
import "../../styles/dashboard-premium.css";

export default function StudentLayout({ children }) {
  const router = useRouter();
  const { profile } = useAuth();

  const handleLogout = async () => {
    const result = await logoutUser();
    if (result.success) {
      router.push("/login");
    }
  };

  const initials = useMemo(() => {
    const name = String(profile?.name || "").trim();
    if (!name) return "U";
    const parts = name.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] || "U";
    const second = parts[1]?.[0] || "";
    return (first + second).toUpperCase();
  }, [profile?.name]);

  return (
    <>
      <Navbar expand="lg" className="navbar-premium mb-4">
        <Container>
          <Navbar.Brand onClick={() => router.push("/student/dashboard")} className="navbar-brand-premium cursor-pointer">
            Student Portal
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="ms-auto align-items-center">
              <Nav.Link 
                onClick={() => router.push("/student/dashboard")}
                className="nav-link-premium"
              >
                Dashboard
              </Nav.Link>
              <Nav.Link 
                onClick={() => router.push("/student/clearance")}
                className="nav-link-premium"
              >
                Clearance
              </Nav.Link>
              <Nav.Link 
                onClick={() => router.push("/student/chat")}
                className="nav-link-premium"
              >
                Messages
              </Nav.Link>
              <Nav.Link 
                onClick={() => router.push("/student/notifications")}
                className="nav-link-premium"
              >
                Alerts
              </Nav.Link>
              <Dropdown align="end" className="ms-lg-3">
                <Dropdown.Toggle
                  className="btn-premium btn-premium-primary"
                  size="sm"
                  style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 16, paddingRight: 16 }}
                >
                  <span
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 999,
                      background: "rgba(255,255,255,0.22)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    {initials}
                  </span>
                  Profile
                </Dropdown.Toggle>
                <Dropdown.Menu className="student-profile-menu shadow-lg border-0" style={{ minWidth: 360, padding: 14, borderRadius: 24, overflow: "hidden" }}>
                  <div className="student-profile-menu-inner" style={{ padding: 16 }}>
                    <div className="d-flex align-items-center gap-3 mb-3">
                      <div
                        style={{
                          width: 60,
                          height: 60,
                          borderRadius: 18,
                          background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 800,
                          color: "#FFFFFF",
                          fontSize: 20,
                          boxShadow: "0 10px 24px rgba(99, 102, 241, 0.28)"
                        }}
                      >
                        {initials}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {profile?.name || "Student"}
                        </div>
                        <div style={{ fontSize: 13, color: "#cbd5e1", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {profile?.email || ""}
                        </div>
                      </div>
                    </div>

                    <div className="student-profile-info rounded-4 p-3 mb-3">
                      <div className="d-flex justify-content-between mb-2">
                        <span className="student-profile-kicker">Registration No.</span>
                        <span className="student-profile-value">{profile?.roll_number || "N/A"}</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="student-profile-kicker">Department</span>
                        <span className="student-profile-value">{profile?.department_name || "N/A"}</span>
                      </div>
                    </div>

                    <Dropdown.Item 
                      onClick={() => router.push("/student/profile")}
                      className="rounded-3 py-2 px-3 mb-1 d-flex align-items-center gap-2 student-profile-item"
                      style={{
                        transition: "all 0.2s",
                        borderRadius: 16,
                        color: "#e2e8f0",
                        backgroundColor: "transparent",
                      }}
                    >
                      <span style={{ fontSize: "1.1rem" }}>👤</span>
                      <span style={{ fontWeight: 700, fontSize: 14, color: "#f8fafc" }}>My Profile</span>
                    </Dropdown.Item>
                    
                    <Dropdown.Divider className="student-profile-divider" />
                    
                    <Dropdown.Item 
                      onClick={handleLogout}
                      className="rounded-3 py-2 px-3 d-flex align-items-center gap-2 student-profile-logout"
                      style={{
                        transition: "all 0.2s",
                        borderRadius: 16,
                        color: "#fca5a5",
                        backgroundColor: "transparent",
                      }}
                    >
                      <span style={{ fontSize: "1.1rem" }}>🚪</span>
                      <span style={{ fontWeight: 700, fontSize: 14, color: "#fca5a5" }}>Sign Out</span>
                    </Dropdown.Item>
                  </div>
                </Dropdown.Menu>
              </Dropdown>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <Container fluid style={{ paddingLeft: "20px", paddingRight: "20px" }}>
        {children}
      </Container>
      <AIChatbot />

      <style jsx global>{`
        .student-profile-menu {
          background: linear-gradient(180deg, rgba(30, 41, 59, 0.96) 0%, rgba(15, 23, 42, 0.96) 100%) !important;
          border: 1px solid rgba(148, 163, 184, 0.22) !important;
          box-shadow: 0 24px 44px rgba(15, 23, 42, 0.42) !important;
          backdrop-filter: blur(12px);
        }

        .student-profile-menu-inner {
          background: transparent;
        }

        .student-profile-info {
          background: linear-gradient(180deg, rgba(15, 23, 42, 0.96) 0%, rgba(30, 41, 59, 0.96) 100%);
          border: 1px solid rgba(148, 163, 184, 0.16);
        }

        .student-profile-kicker {
          font-size: 12px;
          font-weight: 700;
          color: #93c5fd;
          text-transform: uppercase;
          letter-spacing: 0.6px;
        }

        .student-profile-value {
          font-size: 13px;
          font-weight: 800;
          color: #f8fafc;
        }

        .student-profile-divider {
          opacity: 0.18;
          border-color: rgba(148, 163, 184, 0.22);
        }

        .student-profile-item:hover {
          background: rgba(37, 99, 235, 0.14) !important;
          transform: translateX(4px);
        }

        .student-profile-logout:hover {
          background: rgba(239, 68, 68, 0.14) !important;
          transform: translateX(4px);
        }
      `}</style>
    </>
  );
}