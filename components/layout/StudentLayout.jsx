"use client";
import React, { useMemo } from "react";
import { Container, Navbar, Nav, Dropdown } from "react-bootstrap";
import { useRouter } from "next/navigation";
import { logoutUser } from "@/lib/authService";
import { useAuth } from "@/lib/useAuth";
import "../../styles/dashboard-premium.css";

export default function StudentLayout({ children }) {
  const router = useRouter();
  const { profile } = useAuth();

  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const handleLogout = async () => {
    const result = await logoutUser();
    if (result.success) {
      window.location.href = "/login";
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
      {/* ── Navbar ────────────────────────────────────────────────────── */}
      <nav className="student-navbar">
        <div className="student-navbar-inner">
          {/* Brand */}
          <div onClick={() => router.push("/student/dashboard")} className="student-brand">
            <span className="student-brand-gradient">Student Portal</span>
            <span className="student-brand-sub d-none d-md-inline">&nbsp;| Smart Clearance</span>
          </div>

          {/* Right side - Desktop Nav / Mobile Hamburger */}
          <div className="student-nav-right">
            {/* Desktop Links */}
            <div className="d-none d-lg-flex align-items-center gap-4 me-4">
              <span onClick={() => router.push("/student/dashboard")} className="student-nav-link">Dashboard</span>
              <span onClick={() => router.push("/student/clearance")} className="student-nav-link">Clearance</span>
              <span onClick={() => router.push("/student/chat")} className="student-nav-link">Messages</span>
              <span onClick={() => router.push("/student/notifications")} className="student-nav-link">Alerts</span>
            </div>

            {/* Profile Dropdown (Desktop) */}
            <div className="d-none d-lg-block">
              <Dropdown align="end">
                <Dropdown.Toggle as="div" style={{ cursor: "pointer" }}>
                  <div className="student-profile-badge">
                    <div className="student-avatar-small">{initials}</div>
                    <span className="fw-bold text-white-50 small">Profile</span>
                  </div>
                </Dropdown.Toggle>
                <Dropdown.Menu className="student-profile-menu-dropdown shadow-lg border-0" style={{ minWidth: 320, borderRadius: 32, overflow: "hidden" }}>
                  <div className="p-4 text-center" style={{ background: "linear-gradient(135deg, rgba(37,99,235,0.12) 0%, rgba(124,58,237,0.12) 100%)" }}>
                    <div className="student-avatar-large mx-auto mb-3">{initials}</div>
                    <h6 className="mb-1 fw-bold text-white" style={{ fontSize: "1.1rem" }}>{profile?.name || "Student"}</h6>
                    <small className="text-white-50" style={{ letterSpacing: "0.5px" }}>{profile?.email}</small>
                  </div>
                  <div className="p-4">
                    <div className="rounded-4 p-3 mb-4" style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="d-flex justify-content-between mb-2">
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#93c5fd", textTransform: "uppercase", letterSpacing: "1px" }}>Registration</span>
                        <span style={{ fontSize: 12, fontWeight: 800, color: "#f8fafc" }}>{profile?.roll_number || "N/A"}</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#93c5fd", textTransform: "uppercase", letterSpacing: "1px" }}>Department</span>
                        <span style={{ fontSize: 12, fontWeight: 800, color: "#f8fafc" }}>{profile?.department_name || "N/A"}</span>
                      </div>
                    </div>
                    <button onClick={() => router.push("/student/profile")} className="btn btn-primary w-100 rounded-pill fw-bold mb-3 py-2 shadow-sm" style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)", border: "none" }}>View Profile</button>
                    <button onClick={handleLogout} className="btn btn-link text-danger w-100 text-decoration-none fw-bold small">Sign Out</button>
                  </div>
                </Dropdown.Menu>
              </Dropdown>
            </div>

            {/* Premium Hamburger */}
            <button
              className={`student-hamburger ${drawerOpen ? 'active' : ''}`}
              onClick={() => setDrawerOpen(!drawerOpen)}
            >
              <span className="student-menu-line"></span>
              <span className="student-menu-line"></span>
              <span className="student-menu-line"></span>
            </button>
          </div>
        </div>
      </nav>

      {/* ── Mobile Drawer ───────────────────────────────────────────── */}
      <div className={`student-overlay ${drawerOpen ? 'active' : ''}`} onClick={() => setDrawerOpen(false)} />
      
      <aside className={`student-drawer ${drawerOpen ? 'active' : ''}`}>
        <div className="student-drawer-header">
          <div className="d-flex align-items-center gap-3">
            <div className="student-avatar-large" style={{ width: 48, height: 48, fontSize: "1.2rem", borderRadius: "14px" }}>{initials}</div>
            <div className="d-flex flex-column">
              <span className="fw-bold text-white" style={{ fontSize: "1rem" }}>{profile?.name}</span>
              <span style={{ fontSize: "0.75rem", color: "#94A3B8" }}>{profile?.roll_number}</span>
            </div>
          </div>
          <button className="student-drawer-close" onClick={() => setDrawerOpen(false)}>✕</button>
        </div>

        <div className="student-drawer-body">
          <div className="student-drawer-links">
            <div onClick={() => { router.push("/student/dashboard"); setDrawerOpen(false); }} className="student-drawer-link">
              <span className="icon">🏠</span> Dashboard
            </div>
            <div onClick={() => { router.push("/student/clearance"); setDrawerOpen(false); }} className="student-drawer-link">
              <span className="icon">📄</span> Clearance
            </div>
            <div onClick={() => { router.push("/student/chat"); setDrawerOpen(false); }} className="student-drawer-link">
              <span className="icon">💬</span> Messages
            </div>
            <div onClick={() => { router.push("/student/notifications"); setDrawerOpen(false); }} className="student-drawer-link">
              <span className="icon">🔔</span> Alerts
            </div>
            <div onClick={() => { router.push("/student/profile"); setDrawerOpen(false); }} className="student-drawer-link">
              <span className="icon">👤</span> My Profile
            </div>
          </div>
        </div>

        <div className="student-drawer-footer">
          <button onClick={handleLogout} className="student-logout-btn">
            Sign Out Account
          </button>
        </div>
      </aside>

      <Container fluid className="student-main-container">
        {children}
      </Container>

      <style jsx global>{`
        html { scroll-behavior: smooth; }
        
        /* Custom Scrollbar */
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.5); }
        ::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.3);
          border-radius: 10px;
        }

        .student-navbar {
          position: sticky; top: 0; z-index: 1000;
          background: rgba(15, 23, 42, 0.94);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          height: 70px;
          display: flex; align-items: center;
          padding: 0 1.5rem;
          box-shadow: 0 10px 40px -10px rgba(0,0,0,0.5);
        }
        .student-navbar-inner {
          width: 100%; max-width: 1400px; margin: 0 auto;
          display: flex; justify-content: space-between; align-items: center;
        }
        .student-brand {
          font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 1.3rem;
          cursor: pointer; display: flex; align-items: center;
          transition: transform 0.3s ease;
        }
        .student-brand:hover { transform: translateX(3px); }
        .student-brand-gradient {
          background: linear-gradient(135deg, #60A5FA, #A78BFA);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .student-brand-sub { color: #64748b; font-size: 0.9rem; font-weight: 500; }
        
        .student-nav-right { display: flex; align-items: center; }
        .student-nav-link {
          color: #94a3b8; font-weight: 600; font-size: 0.95rem; cursor: pointer;
          transition: all 0.3s ease; position: relative;
        }
        .student-nav-link:hover { color: #fff; }
        .student-nav-link::after {
          content: ''; position: absolute; bottom: -4px; left: 0; width: 0; height: 2px;
          background: #3b82f6; transition: width 0.3s ease;
        }
        .student-nav-link:hover::after { width: 100%; }

        .student-profile-badge {
          display: flex; align-items: center; gap: 0.75rem; padding: 0.4rem 1rem;
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 100px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .student-profile-badge:hover {
          background: rgba(255,255,255,0.08); border-color: #3b82f6;
          transform: translateY(-2px); box-shadow: 0 10px 20px rgba(0,0,0,0.3);
        }

        .student-avatar-small {
          width: 30px; height: 30px; border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6, #6366f1);
          color: #fff; display: flex; align-items: center; justify-content: center;
          font-weight: 800; font-size: 12px;
        }
        .student-avatar-large {
          width: 80px; height: 80px; border-radius: 20px;
          background: linear-gradient(135deg, #3b82f6, #6366f1);
          color: #fff; display: flex; align-items: center; justify-content: center;
          font-weight: 800; font-size: 28px; box-shadow: 0 15px 35px rgba(59, 130, 246, 0.4);
        }

        .student-profile-menu-dropdown {
          background: rgba(15, 23, 42, 0.98) !important;
          border: 1px solid rgba(255, 255, 255, 0.12) !important;
          backdrop-filter: blur(30px);
          padding: 0; margin-top: 15px;
          box-shadow: 0 40px 100px rgba(0,0,0,0.7) !important;
        }

        /* ── Hamburger ── */
        .student-hamburger {
          display: none; flex-direction: column; gap: 5px; cursor: pointer;
          width: 42px; height: 42px; border: none; border-radius: 12px;
          background: rgba(255,255,255,0.05); align-items: center; justify-content: center;
          transition: all 0.3s ease;
        }
        .student-hamburger:hover { background: rgba(59, 130, 246, 0.1); transform: scale(1.05); }
        .student-menu-line {
          width: 22px; height: 2px; background: #fff; border-radius: 4px;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .student-hamburger.active .student-menu-line:nth-child(1) { transform: translateY(7px) rotate(45deg); }
        .student-hamburger.active .student-menu-line:nth-child(2) { opacity: 0; transform: scale(0); }
        .student-hamburger.active .student-menu-line:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

        /* ── Mobile Drawer ── */
        .student-overlay {
          position: fixed; inset: 0; background: rgba(2, 6, 23, 0.65);
          backdrop-filter: blur(8px); z-index: 1100;
          opacity: 0; visibility: hidden; transition: all 0.4s ease;
        }
        .student-overlay.active { opacity: 1; visibility: visible; }

        .student-drawer {
          position: fixed; top: 85px; left: 1rem; right: 1rem;
          background: rgba(15, 23, 42, 0.98); backdrop-filter: blur(30px);
          z-index: 1200; border-radius: 32px; border: 1px solid rgba(255,255,255,0.12);
          box-shadow: 0 40px 100px rgba(0,0,0,0.6);
          transform: translateY(-30px) scale(0.92); opacity: 0; visibility: hidden;
          transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex; flex-direction: column; overflow: hidden;
          max-height: 80vh;
        }
        .student-drawer.active { transform: translateY(0) scale(1); opacity: 1; visibility: visible; }
        
        .student-drawer-header {
          padding: 1.5rem; display: flex; align-items: center; justify-content: space-between;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .student-drawer-close {
          width: 36px; height: 36px; border-radius: 50%; border: none;
          background: rgba(255,255,255,0.05); color: #fff;
          display: flex; align-items: center; justify-content: center;
        }
        .student-drawer-close:hover { background: rgba(239, 68, 68, 0.2); color: #ef4444; }

        .student-drawer-body { padding: 1rem; flex: 1; overflow-y: auto; }
        .student-drawer-links { display: flex; flex-direction: column; gap: 0.5rem; }
        .student-drawer-link {
          padding: 1rem 1.25rem; border-radius: 18px; color: #cbd5e1; font-weight: 600;
          display: flex; align-items: center; gap: 1rem; transition: all 0.3s ease;
        }
        .student-drawer-link:hover {
          background: rgba(59, 130, 246, 0.1); color: #fff; transform: translateX(5px);
        }
        
        .student-drawer-footer { padding: 1.5rem; border-top: 1px solid rgba(255,255,255,0.06); background: rgba(0,0,0,0.15); }
        .student-logout-btn {
          width: 100%; padding: 1rem; border-radius: 100px; border: none;
          background: linear-gradient(135deg, #ef4444, #b91c1c); color: #fff;
          font-weight: 800; font-size: 0.95rem; box-shadow: 0 12px 24px rgba(239, 68, 68, 0.25);
        }

        .student-main-container { padding: 1.5rem 1rem; max-width: 1400px; margin: 0 auto; }

        @media (max-width: 1024px) {
          .student-hamburger { display: flex; }
        }
      `}</style>
    </>
  );
}