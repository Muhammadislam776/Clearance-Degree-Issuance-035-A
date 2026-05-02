"use client";
import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { logoutUser } from "@/lib/authService";
import { useAuth } from "@/lib/useAuth";
import { SectionProvider, useSection } from "@/lib/SectionContext";
import AIChatbot from "@/components/chatbot/AIChatbot";
import "../../styles/dashboard-premium.css";

import { Dropdown, Card } from "react-bootstrap";
import { supabase } from "@/lib/supabaseClient";

function SidebarItem({ id, name, icon, active, onClick, onClose }) {
  return (
    <div
      onClick={() => { onClick({ id, name }); onClose?.(); }}
      className={`dept-sidebar-item ${active ? "dept-sidebar-item--active" : ""}`}
    >
      <span className={`dept-sidebar-icon ${active ? "dept-sidebar-icon--active" : ""}`}>
        {icon}
      </span>
      <span>{name}</span>
    </div>
  );
}

function SidebarContent({ onClose, router }) {
  const { activeSection, setActiveSection } = useSection();
  const [dynamicSections, setDynamicSections] = useState([{ id: "all", name: "Hub Overview", icon: "📁" }]);

  useEffect(() => {
    async function fetchDepts() {
      try {
        const { data, error } = await supabase
          .from("departments")
          .select("id, name")
          .order("name");

        if (error) throw error;

        const icons = {
          "Library": "📚",
          "Fee": "💰",
          "Finance": "💰",
          "Hostel": "🏨",
          "Sports": "⚽",
          "Laboratory": "🧪",
          "Lab": "🧪",
          "Admin": "🏛️",
          "Examiner": "⚖️"
        };

        const formatted = data.map(d => ({
          id: d.id,
          name: d.name,
          icon: Object.entries(icons).find(([k]) => d.name.includes(k))?.[1] || "🏢"
        }));

        setDynamicSections([{ id: "all", name: "Hub Overview", icon: "📁" }, ...formatted]);
      } catch (e) {
        console.error("Error fetching sidebar departments:", e);
      }
    }
    fetchDepts();

    // Listen for changes so new departments show up instantly
    const uniqueId = Math.random().toString(36).substring(7);
    const channelId = `dept-sidebar-${Date.now()}-${uniqueId}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'departments'
        },
        () => fetchDepts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "1.5rem 0" }}>
      <p style={{
        fontSize: "0.62rem", fontWeight: 800, letterSpacing: "1.5px",
        color: "#94A3B8", textTransform: "uppercase", padding: "0 1.4rem", marginBottom: "0.75rem"
      }}>
        Sections
      </p>
      <div style={{ flex: 1 }}>
        {dynamicSections.map(s => (
          <SidebarItem
            key={s.id} {...s}
            active={activeSection?.id === s.id}
            onClick={setActiveSection}
            onClose={onClose}
          />
        ))}
      </div>
      <div style={{ margin: "1.5rem 0.9rem 0" }}>
        <div 
          onClick={() => {
            onClose?.();
            router.push("/department/support");
          }}
          style={{
            background: "linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)",
            borderRadius: "20px", padding: "1.5rem 1.25rem", color: "white",
            boxShadow: "0 10px 30px rgba(30, 64, 175, 0.25)",
            cursor: "pointer",
            transition: "all 0.3s ease",
            border: "1px solid rgba(255,255,255,0.1)",
            display: "flex", flexDirection: "column", gap: "2px"
          }}
          className="dept-support-card"
        >
          <div style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>🛠️</div>
          <p style={{ fontSize: "0.62rem", opacity: 0.8, margin: 0, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>24/7 Service</p>
          <p style={{ fontSize: "0.85rem", fontWeight: 800, margin: 0 }}>Institutional Support</p>
          <p style={{ fontSize: "0.65rem", opacity: 0.7, margin: "0.2rem 0 0" }}>Connect with administrators</p>
        </div>
      </div>
    </div>
  );
}

function DepartmentLayoutContent({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { profile } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deptInfo, setDeptInfo] = useState(null);
  const isAcademicPortal = pathname?.startsWith("/academic");

  useEffect(() => {
    if (profile?.department_id || profile?.department) {
      const fetchDept = async () => {
        let query = supabase
          .from("departments")
          .select("id, name, focal_person, contact, whatsapp_number, email, is_academic");

        if (profile?.department_id) {
          query = query.eq("id", profile.department_id);
        } else {
          query = query.eq("name", profile.department);
        }

        const { data } = await query.maybeSingle();
        if (data) setDeptInfo(data);
      };
      fetchDept();
    }
  }, [profile?.department, profile?.department_id]);

  // Close drawer on ESC
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") setDrawerOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Lock body scroll when drawer open on mobile
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  const handleLogout = async () => {
    const result = await logoutUser();
    if (result.success) router.push("/login");
  };

  return (
    <div
      style={{
        background:
          "radial-gradient(1100px 460px at 12% -8%, rgba(37,99,235,0.18), rgba(37,99,235,0) 58%), radial-gradient(900px 420px at 88% 8%, rgba(139,92,246,0.18), rgba(139,92,246,0) 56%), linear-gradient(180deg, #0b1220 0%, #111827 100%)",
        minHeight: "100vh",
      }}
    >

      {/* ── Navbar ────────────────────────────────────────────────────── */}
      <nav className="dept-navbar">
        {/* Hamburger (mobile/tablet) */}
        <button
          className={`dept-hamburger ${drawerOpen ? "dept-hamburger--active" : ""}`}
          onClick={() => setDrawerOpen(!drawerOpen)}
          aria-label="Toggle menu"
        >
          <div className="dept-hamburger-box">
            <div className="dept-hamburger-inner"></div>
          </div>
        </button>

        {/* Brand */}
        <div
          onClick={() => router.push(isAcademicPortal ? "/academic/dashboard" : "/department/dashboard")}
          className="dept-brand"
        >
          <span className="dept-brand-gradient">{isAcademicPortal ? "Academic Portal" : "Staff Portal"}</span>
          <span className="dept-brand-sub d-none d-md-inline">&nbsp;| Hub</span>
        </div>

        {/* Right side - Profile Dropdown */}
        <div className="dept-nav-right">
          {deptInfo?.is_academic ? (
            <button
              onClick={() => router.push(isAcademicPortal ? "/department/dashboard" : "/academic/issuance")}
              className="btn btn-sm rounded-pill fw-semibold px-3 py-2 me-2"
              style={{
                background: isAcademicPortal ? "linear-gradient(135deg, #0f172a 0%, #334155 100%)" : "linear-gradient(135deg, #0062FF 0%, #6366F1 100%)",
                color: "#fff",
                border: "none",
                boxShadow: "0 8px 18px rgba(0,98,255,0.2)",
                whiteSpace: "nowrap",
              }}
            >
              {isAcademicPortal ? "Back to Department Hub" : "Academic Issuance"}
            </button>
          ) : null}

          <Dropdown align="end">
            <Dropdown.Toggle as="div" style={{ cursor: "pointer" }}>
              <div className="dept-profile-badge">
                <div className="dept-avatar">
                  {profile?.name?.charAt(0) || "S"}
                </div>
                <div className="dept-profile-info">
                  <div className="dept-profile-name">{profile?.name || "Staff Member"}</div>
                  <div className="dept-profile-details">
                    <span className="badge-role">{profile?.role?.toUpperCase() || "STAFF"}</span>
                    <span className="separator"></span>
                    <span className="dept-name">{profile?.department || "Institutional Portal"}</span>
                  </div>
                </div>
              </div>
            </Dropdown.Toggle>

            <Dropdown.Menu className="profile-dropdown-menu border-0 shadow-lg mt-2 dept-dropdown-menu" style={{ width: "320px", borderRadius: "20px", overflow: "hidden" }}>
              <div className="p-3 text-center dept-dropdown-head">
                <div className="dept-avatar mx-auto mb-2" style={{ width: "60px", height: "60px", fontSize: "1.5rem" }}>
                  {profile?.name?.charAt(0) || "S"}
                </div>
                <h6 className="mb-0 fw-bold dept-dropdown-name">{profile?.name}</h6>
                <small className="dept-dropdown-email">{profile?.email}</small>
              </div>

              <div className="p-3">
                <Card className="border-0 p-3 dept-dropdown-card" style={{ borderRadius: "15px" }}>
                  <div className="mb-2">
                    <small className="text-uppercase fw-bold dept-dropdown-kicker" style={{ fontSize: "0.6rem" }}>Department Details</small>
                    <div className="fw-bold dept-dropdown-value">{deptInfo?.name || profile?.department || "N/A"}</div>
                  </div>

                  {deptInfo ? (
                    <div className="dept-mini-info dept-mini-info--dark" style={{ fontSize: "0.82rem" }}>
                      <div className="d-flex align-items-center mb-1">
                        <span className="me-2">👤</span>
                        <span>Focal: <strong>{deptInfo.focal_person || "N/A"}</strong></span>
                      </div>
                      <div className="d-flex align-items-center mb-1">
                        <span className="me-2">📞</span>
                        <span>Contact: <strong>{deptInfo.whatsapp_number || deptInfo.contact || "N/A"}</strong></span>
                      </div>
                      <div className="d-flex align-items-center mb-1">
                        <span className="me-2">✉️</span>
                        <span>Email: <strong>{deptInfo.email || "N/A"}</strong></span>
                      </div>
                    </div>
                  ) : (
                    <div className="dept-dropdown-empty small italic">No department sync info available.</div>
                  )}
                </Card>
              </div>

              <div className="px-3 pb-3">
                <button
                  onClick={() => router.push("/department/profile")}
                  className="w-100 btn btn-outline-primary rounded-pill fw-semibold"
                >
                  View Department Profile
                </button>
              </div>

              <Dropdown.Divider className="my-0" />

              <div className="p-2">
                <button
                  onClick={handleLogout}
                  className="w-100 btn btn-link text-danger text-decoration-none d-flex align-items-center justify-content-center py-2"
                  style={{ fontWeight: 700, fontSize: "0.9rem" }}
                >
                  <span className="me-2">🚪</span> Sign Out Account
                </button>
              </div>
            </Dropdown.Menu>
          </Dropdown>
        </div>
      </nav>

      {/* ── Mobile Drawer Overlay ────────────────────────────────────── */}
      {drawerOpen && (
        <div
          className="dept-overlay"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── Drawer Sidebar (mobile/tablet) ──────────────────────────── */}
      <aside className={`dept-drawer ${drawerOpen ? "dept-drawer--open" : ""}`}>
        <div className="dept-drawer-header">
          <span className="dept-brand-gradient" style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 800, fontSize: "1.1rem" }}>
            {isAcademicPortal ? "Academic Portal" : "Staff Portal"}
          </span>
        </div>
        <SidebarContent onClose={() => setDrawerOpen(false)} router={router} />
      </aside>

      {/* ── Layout Body ─────────────────────────────────────────────── */}
      <div style={{ display: "flex" }}>

        {/* Desktop Sidebar */}
        <aside className="dept-sidebar-desktop">
          <SidebarContent router={router} />
        </aside>

        {/* Main */}
        <main className="dept-main">
          {children}
        </main>
      </div>

      <AIChatbot />

      {/* ── Responsive Styles ───────────────────────────────────────── */}
      <style jsx global>{`
        /* ── Navbar ── */
        .dept-navbar {
          position: sticky; top: 0; z-index: 1000;
          background: rgba(15,23,42,0.92);
          border-bottom: 1px solid rgba(148,163,184,0.14);
          padding: 0.75rem 1.5rem;
          display: flex; align-items: center; gap: 0.75rem;
          box-shadow: 0 10px 24px rgba(15,23,42,0.18);
          backdrop-filter: blur(12px);
        }
        .dept-brand {
          font-family: 'Poppins', sans-serif; font-weight: 800;
          font-size: 1.2rem; cursor: pointer;
          flex: 1; white-space: nowrap;
        }
        .dept-brand-gradient {
          background: linear-gradient(135deg,#60A5FA,#A78BFA);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .dept-brand-sub { color: #94A3B8; font-weight: 400; font-size: 0.9rem; }
        .dept-nav-right {
          display: flex; align-items: center; gap: 1.25rem; margin-left: auto;
        }
        .dept-profile-badge {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.4rem; padding-right: 0.75rem;
          background: rgba(15,23,42,0.72); border: 1px solid rgba(148,163,184,0.16);
          border-radius: 50px; transition: all 0.2s ease;
        }
        .dept-profile-badge:hover {
          background: rgba(30,41,59,0.86); border-color: rgba(96,165,250,0.38);
          transform: translateY(-1px); box-shadow: 0 8px 20px rgba(15,23,42,0.22);
        }
        .profile-dropdown-menu {
          animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .dept-mini-info div {
          padding: 4px 0;
          transition: all 0.2s ease;
        }
        .dept-mini-info div:hover {
          transform: translateX(3px);
          color: #93c5fd;
        }
        .dept-avatar {
          width: 36px; height: 36px; border-radius: 50%;
          background: linear-gradient(135deg, #0062FF, #6366F1);
          color: white; display: flex; align-items: center; justify-content: center;
          font-weight: 800; font-size: 0.9rem;
          box-shadow: 0 4px 10px rgba(0,98,255,0.2);
          text-transform: uppercase;
        }
        .dept-profile-info {
          display: flex; flex-direction: column; line-height: 1.2;
        }
        .dept-profile-name {
          font-size: 0.82rem; font-weight: 700; color: #F8FAFC;
        }
        .dept-profile-details {
          display: flex; align-items: center; gap: 0.4rem; font-size: 0.68rem;
        }
        .badge-role {
          color: #93C5FD; font-weight: 800; letter-spacing: 0.4px;
        }
        .dept-name {
          color: #CBD5E1; font-weight: 500;
        }
        .separator {
          width: 3px; height: 3px; border-radius: 50%; background: #CBD5E1;
        }
        .dept-signout-btn {
          background: linear-gradient(135deg, #0062FF, #6366F1);
          color: white; border: none; border-radius: 10px;
          padding: 0.42rem 1.1rem; font-weight: 700; font-size: 0.82rem;
          cursor: pointer; box-shadow: 0 4px 12px rgba(0,98,255,0.28);
          transition: all 0.2s ease; white-space: nowrap;
        }
        .dept-signout-btn:hover {
          transform: translateY(-1px); box-shadow: 0 6px 18px rgba(0,98,255,0.38);
        }

        /* ── Hamburger (mobile/tablet only) ── */
        .dept-hamburger {
          display: none !important;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          background: rgba(30,41,59,0.7);
          border: 1px solid rgba(148,163,184,0.18);
          border-radius: 12px;
          cursor: pointer;
          backdrop-filter: blur(8px);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          padding: 0;
          z-index: 1400;
        }
        .dept-hamburger:hover {
          background: rgba(30,41,59,0.9);
          border-color: rgba(96,165,250,0.6);
          transform: translateY(-1px);
          box-shadow: 0 0 15px rgba(96, 165, 250, 0.2);
        }
        .dept-hamburger:hover .dept-hamburger-inner,
        .dept-hamburger:hover .dept-hamburger-inner::before,
        .dept-hamburger:hover .dept-hamburger-inner::after {
          background-color: #93C5FD;
          box-shadow: 0 0 12px rgba(96, 165, 250, 0.8);
        }
        .dept-hamburger-box {
          width: 24px;
          height: 14px;
          display: inline-block;
          position: relative;
        }
        .dept-hamburger-inner,
        .dept-hamburger-inner::before,
        .dept-hamburger-inner::after {
          width: 24px;
          height: 2px;
          background-color: #60A5FA;
          border-radius: 4px;
          position: absolute;
          left: 0;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 0 8px rgba(96, 165, 250, 0.4);
        }
        .dept-hamburger-inner {
          top: 50%;
          transform: translateY(-50%);
        }
        .dept-hamburger-inner::before {
          content: "";
          top: -7px;
        }
        .dept-hamburger-inner::after {
          content: "";
          top: 7px;
        }
        
        /* Hamburger Active State */
        .dept-hamburger--active .dept-hamburger-inner {
          background-color: transparent;
        }
        .dept-hamburger--active .dept-hamburger-inner::before {
          transform: translateY(6px) rotate(45deg);
        }
        .dept-hamburger--active .dept-hamburger-inner::after {
          transform: translateY(-6px) rotate(-45deg);
        }

        /* ── Overlay ── */
        .dept-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15,23,42,0.6);
          z-index: 1200;
          backdrop-filter: blur(6px);
          animation: fadeOverlay 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @keyframes fadeOverlay { from { opacity:0; } to { opacity:1; } }

        /* ── Drawer ── */
        .dept-drawer {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          width: 300px;
          background: rgba(15,23,42,0.92);
          z-index: 1300;
          transform: translateX(-100%);
          transition: transform 0.4s cubic-bezier(0.4,0,0.2,1);
          box-shadow: 20px 0 50px rgba(0,0,0,0.3);
          border-right: 1px solid rgba(148,163,184,0.14);
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          backdrop-filter: blur(20px);
        }
        .dept-drawer--open { transform: translateX(0); }
        .dept-drawer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.5rem 1.25rem;
          border-bottom: 1px solid rgba(148,163,184,0.1);
        }
        .dept-drawer-close {
          display: none; /* Handled by hamburger */
        }

        /* ── Desktop Sidebar ── */
        .dept-sidebar-desktop {
          width: 260px; flex-shrink: 0;
          background: rgba(15,23,42,0.94);
          border-right: 1px solid rgba(148,163,184,0.14);
          min-height: calc(100vh - 58px);
          position: sticky; top: 58px;
          overflow-y: auto;
        }

        /* ── Main ── */
        .dept-main {
          flex: 1; padding: 1.75rem 1.5rem; min-width: 0;
        }

        /* ── Sidebar Items ── */
        .dept-sidebar-item {
          display: flex; align-items: center; gap: 0.85rem;
          padding: 0.7rem 1.1rem; margin: 0.15rem 0.5rem;
          border-radius: 12px; cursor: pointer; font-weight: 600;
          font-size: 0.875rem; transition: all 0.2s ease;
          color: #CBD5E1; border-left: 3px solid transparent;
        }
        .dept-sidebar-item:hover { background: rgba(96,165,250,0.1); color: #DBEAFE; }
        .dept-sidebar-item--active {
          background: linear-gradient(135deg, rgba(37,99,235,0.22), rgba(124,58,237,0.2));
          color: #EFF6FF; border-left-color: #60A5FA;
          box-shadow: 0 2px 10px rgba(37,99,235,0.12);
        }
        .dept-sidebar-icon {
          width: 34px; height: 34px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1rem; flex-shrink: 0; background: rgba(255,255,255,0.06);
          transition: all 0.2s ease;
        }
        .dept-sidebar-icon--active {
          background: linear-gradient(135deg, #0062FF, #6366F1);
          box-shadow: 0 4px 10px rgba(0,98,255,0.3);
        }

        .dept-dropdown-menu {
          background: linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(30,41,59,0.98) 100%);
          border: 1px solid rgba(148,163,184,0.16);
          color: #E2E8F0;
        }
        .dept-dropdown-head {
          background: linear-gradient(135deg, rgba(37,99,235,0.18) 0%, rgba(124,58,237,0.18) 100%);
        }
        .dept-dropdown-name,
        .dept-dropdown-value {
          color: #F8FAFC;
        }
        .dept-dropdown-email,
        .dept-dropdown-kicker,
        .dept-dropdown-empty {
          color: #CBD5E1;
        }
        .dept-dropdown-card {
          background: rgba(15,23,42,0.9) !important;
          border: 1px solid rgba(148,163,184,0.12) !important;
        }
        .dept-mini-info--dark {
          color: #CBD5E1;
        }
        .dept-mini-info--dark strong {
          color: #F8FAFC;
        }

        /* ── Responsive breakpoints ── */
        @media (max-width: 991px) {
          .dept-hamburger { display: flex !important; }
          .dept-sidebar-desktop { display: none; }
          .dept-main { padding: 1.25rem 1rem; }
        }
        
        .dept-support-card:hover {
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 12px 28px rgba(0,98,255,0.4);
          filter: brightness(1.1);
        }
        
        .dept-sidebar-item:active {
          transform: scale(0.98);
        }
        @media (max-width: 575px) {
          .dept-navbar { padding: 0.65rem 1rem; }
          .dept-main { padding: 1rem 0.75rem; }
          .dept-brand { font-size: 1rem; }
        }
      `}</style>
    </div>
  );
}

export default function DepartmentLayout({ children }) {
  return (
    <SectionProvider>
      <DepartmentLayoutContent>{children}</DepartmentLayoutContent>
    </SectionProvider>
  );
}