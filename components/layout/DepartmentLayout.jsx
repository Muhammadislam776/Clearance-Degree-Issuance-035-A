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

function SidebarContent({ onClose }) {
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
        <div style={{
          background: "linear-gradient(135deg, #0062FF 0%, #6366F1 60%, #8B5CF6 100%)",
          borderRadius: "16px", padding: "1.1rem 1.2rem", color: "white",
          boxShadow: "0 8px 20px rgba(0,98,255,0.25)"
        }}>
          <div style={{ fontSize: "1.3rem", marginBottom: "0.4rem" }}>🎓</div>
          <p style={{ fontSize: "0.72rem", opacity: 0.8, margin: "0 0 0.2rem" }}>Need Support?</p>
          <p style={{ fontSize: "0.82rem", fontWeight: 700, margin: 0 }}>Contact Admin Support</p>
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
    <div style={{ background: "#F4F7F9", minHeight: "100vh" }}>

      {/* ── Navbar ────────────────────────────────────────────────────── */}
      <nav className="dept-navbar">
        {/* Hamburger (mobile/tablet) */}
        <button
          className="dept-hamburger"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
        >
          <span /><span /><span />
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

            <Dropdown.Menu className="profile-dropdown-menu border-0 shadow-lg mt-2" style={{ width: "320px", borderRadius: "20px", overflow: "hidden" }}>
              <div className="p-3 text-center" style={{ background: "linear-gradient(135deg, #f8faff 0%, #ffffff 100%)" }}>
                <div className="dept-avatar mx-auto mb-2" style={{ width: "60px", height: "60px", fontSize: "1.5rem" }}>
                  {profile?.name?.charAt(0) || "S"}
                </div>
                <h6 className="mb-0 fw-bold" style={{ color: "#0F172A" }}>{profile?.name}</h6>
                <small className="text-muted">{profile?.email}</small>
              </div>

              <div className="p-3">
                <Card className="border-0 bg-light p-3" style={{ borderRadius: "15px" }}>
                  <div className="mb-2">
                    <small className="text-uppercase fw-bold text-muted" style={{ fontSize: "0.6rem" }}>Department Details</small>
                    <div className="fw-bold" style={{ color: "#1e293b" }}>{deptInfo?.name || profile?.department || "N/A"}</div>
                  </div>
                  
                  {deptInfo ? (
                    <div className="dept-mini-info" style={{ fontSize: "0.82rem", color: "#475569" }}>
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
                    <div className="text-muted small italic">No department sync info available.</div>
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
          <button className="dept-drawer-close" onClick={() => setDrawerOpen(false)}>✕</button>
        </div>
        <SidebarContent onClose={() => setDrawerOpen(false)} />
      </aside>

      {/* ── Layout Body ─────────────────────────────────────────────── */}
      <div style={{ display: "flex" }}>

        {/* Desktop Sidebar */}
        <aside className="dept-sidebar-desktop">
          <SidebarContent />
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
          background: white;
          border-bottom: 1px solid #E2E8F0;
          padding: 0.75rem 1.5rem;
          display: flex; align-items: center; gap: 0.75rem;
          box-shadow: 0 1px 8px rgba(0,0,0,0.05);
        }
        .dept-brand {
          font-family: 'Poppins', sans-serif; font-weight: 800;
          font-size: 1.2rem; cursor: pointer;
          flex: 1; white-space: nowrap;
        }
        .dept-brand-gradient {
          background: linear-gradient(135deg,#0062FF,#6366F1);
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
          background: #F8FAFC; border: 1px solid #E2E8F0;
          border-radius: 50px; transition: all 0.2s ease;
        }
        .dept-profile-badge:hover {
          background: #F1F5F9; border-color: #CBD5E1;
          transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.05);
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
          color: #0062FF;
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
          font-size: 0.82rem; font-weight: 700; color: #0F172A;
        }
        .dept-profile-details {
          display: flex; align-items: center; gap: 0.4rem; font-size: 0.68rem;
        }
        .badge-role {
          color: #6366F1; font-weight: 800; letter-spacing: 0.4px;
        }
        .dept-name {
          color: #64748B; font-weight: 500;
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

        /* ── Hamburger ── */
        .dept-hamburger {
          display: none; flex-direction: column; justify-content: center;
          gap: 5px; background: none; border: none; cursor: pointer;
          padding: 6px; border-radius: 8px;
          transition: background 0.2s ease; flex-shrink: 0;
        }
        .dept-hamburger:hover { background: rgba(0,98,255,0.08); }
        .dept-hamburger span {
          display: block; width: 22px; height: 2px;
          background: #0062FF; border-radius: 2px;
          transition: all 0.3s ease;
        }

        /* ── Overlay ── */
        .dept-overlay {
          position: fixed; inset: 0; background: rgba(15,23,42,0.45);
          z-index: 1200; backdrop-filter: blur(3px);
          animation: fadeOverlay 0.25s ease;
        }
        @keyframes fadeOverlay { from { opacity:0; } to { opacity:1; } }

        /* ── Drawer ── */
        .dept-drawer {
          position: fixed; top: 0; left: 0; bottom: 0;
          width: 280px; background: white;
          z-index: 1300; transform: translateX(-100%);
          transition: transform 0.32s cubic-bezier(0.4,0,0.2,1);
          box-shadow: 4px 0 30px rgba(0,0,0,0.12);
          border-right: 1px solid #E2E8F0;
          overflow-y: auto;
          display: flex; flex-direction: column;
        }
        .dept-drawer--open { transform: translateX(0); }
        .dept-drawer-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 1rem 1.25rem; border-bottom: 1px solid #E2E8F0;
        }
        .dept-drawer-close {
          background: rgba(0,0,0,0.05); border: none; border-radius: 8px;
          width: 32px; height: 32px; font-size: 0.9rem; cursor: pointer;
          color: #475569; display: flex; align-items: center; justify-content: center;
          transition: all 0.2s ease;
        }
        .dept-drawer-close:hover { background: rgba(220,38,38,0.1); color: #DC2626; }

        /* ── Desktop Sidebar ── */
        .dept-sidebar-desktop {
          width: 260px; flex-shrink: 0;
          background: white;
          border-right: 1px solid #E2E8F0;
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
          color: #475569; border-left: 3px solid transparent;
        }
        .dept-sidebar-item:hover { background: rgba(0,98,255,0.05); color: #0062FF; }
        .dept-sidebar-item--active {
          background: linear-gradient(135deg, rgba(0,98,255,0.1), rgba(99,102,241,0.1));
          color: #0062FF; border-left-color: #0062FF;
          box-shadow: 0 2px 10px rgba(0,98,255,0.08);
        }
        .dept-sidebar-icon {
          width: 34px; height: 34px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1rem; flex-shrink: 0; background: #F4F7F9;
          transition: all 0.2s ease;
        }
        .dept-sidebar-icon--active {
          background: linear-gradient(135deg, #0062FF, #6366F1);
          box-shadow: 0 4px 10px rgba(0,98,255,0.3);
        }

        /* ── Responsive breakpoints ── */
        @media (max-width: 991px) {
          .dept-hamburger { display: flex; }
          .dept-sidebar-desktop { display: none; }
          .dept-main { padding: 1.25rem 1rem; }
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