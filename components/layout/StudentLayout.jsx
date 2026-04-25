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
                <Dropdown.Menu style={{ minWidth: 360, padding: 14, borderRadius: 24, overflow: "hidden" }} className="shadow-lg border-0">
                  <div style={{ padding: 16, background: "linear-gradient(180deg, #F8FAFF 0%, #FFFFFF 100%)" }}>
                    <div className="d-flex align-items-center gap-3 mb-3">
                      <div
                        style={{
                          width: 60,
                          height: 60,
                          borderRadius: 18,
                          background: "linear-gradient(135deg, #6366F1 0%, #A855F7 100%)",
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
                        <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {profile?.name || "Student"}
                        </div>
                        <div style={{ fontSize: 13, color: "#6B7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {profile?.email || ""}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-4 p-3 mb-3" style={{ background: "#F8FAFC", border: "1px solid #E5E7EB" }}>
                      <div className="d-flex justify-content-between mb-2">
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.6px" }}>Registration No.</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: "#111827" }}>{profile?.roll_number || "N/A"}</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.6px" }}>Department</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: "#111827" }}>{profile?.department_name || "N/A"}</span>
                      </div>
                    </div>

                    <Dropdown.Item 
                      onClick={() => router.push("/student/profile")}
                      className="rounded-3 py-2 px-3 mb-1 d-flex align-items-center gap-2 hover-bg-light"
                      style={{
                        transition: "all 0.2s",
                        borderRadius: 16,
                        color: "#1F2937",
                        backgroundColor: "transparent",
                      }}
                    >
                      <span style={{ fontSize: "1.1rem" }}>👤</span>
                      <span style={{ fontWeight: 700, fontSize: 14, color: "#1F2937" }}>My Profile</span>
                    </Dropdown.Item>
                    
                    <Dropdown.Divider style={{ opacity: 0.1 }} />
                    
                    <Dropdown.Item 
                      onClick={handleLogout}
                      className="rounded-3 py-2 px-3 d-flex align-items-center gap-2 text-danger hover-bg-danger-light"
                      style={{
                        transition: "all 0.2s",
                        borderRadius: 16,
                        color: "#DC2626",
                        backgroundColor: "transparent",
                      }}
                    >
                      <span style={{ fontSize: "1.1rem" }}>🚪</span>
                      <span style={{ fontWeight: 700, fontSize: 14, color: "#DC2626" }}>Sign Out</span>
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
    </>
  );
}