"use client";
import React from "react";
import { Navbar, Nav, Container, Button } from "react-bootstrap";
import { useRouter } from "next/navigation";
import { logoutUser } from "@/lib/authService";
import { useAuth } from "@/lib/useAuth";
import AIChatbot from "@/components/chatbot/AIChatbot";
import "../../styles/dashboard-premium.css";

export default function AdminLayout({ children }) {
  const router = useRouter();
  const { profile } = useAuth();
  const adminName = profile?.name || "Administrator";
  const adminInitial = String(adminName).trim().charAt(0).toUpperCase() || "A";

  const handleLogout = async () => {
    const result = await logoutUser();
    if (result.success) {
      router.push("/login");
    }
  };

  return (
    <>
      <Navbar expand="lg" className="admin-navbar">
        <Container>
          <Navbar.Brand onClick={() => router.push("/admin/dashboard")} className="admin-navbar-brand cursor-pointer">
            Administrative Control
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="admin-navbar-nav" />
          <Navbar.Collapse id="admin-navbar-nav">
            <Nav className="ms-auto align-items-center">
              <Nav.Link 
                onClick={() => router.push("/admin/dashboard")}
                className="admin-nav-link"
              >
                Dashboard
              </Nav.Link>
              <Nav.Link 
                onClick={() => router.push("/admin/departments")}
                className="admin-nav-link"
              >
                Departments
              </Nav.Link>
              <Nav.Link 
                onClick={() => router.push("/admin/users")}
                className="admin-nav-link"
              >
                Identity
              </Nav.Link>

              <button
                type="button"
                className="admin-profile-chip ms-lg-3"
                onClick={() => router.push("/admin/profile")}
              >
                <span className="admin-profile-avatar">{adminInitial}</span>
                <span className="admin-profile-name">{adminName}</span>
              </button>

              <Button 
                className="admin-exit-btn ms-lg-2"
                onClick={handleLogout}
              >
                Sign Out
              </Button>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Container fluid className="px-4 pt-4 admin-shell">
        {children}
      </Container>
      <AIChatbot />

      <style jsx global>{`
        .admin-shell {
          min-height: calc(100vh - 86px);
          background:
            radial-gradient(1100px 460px at 12% -8%, rgba(30,58,138,0.18), rgba(30,58,138,0) 58%),
            radial-gradient(900px 420px at 88% 8%, rgba(67,56,202,0.18), rgba(67,56,202,0) 56%),
            linear-gradient(180deg, #0b1220 0%, #0f172a 100%);
        }

        .admin-navbar {
          background: rgba(15,23,42,0.94) !important;
          border-bottom: 1px solid rgba(148,163,184,0.14);
          box-shadow: 0 10px 24px rgba(15,23,42,0.18);
          backdrop-filter: blur(12px);
          margin-bottom: 0 !important;
        }

        .admin-navbar-brand {
          font-weight: 800;
          letter-spacing: -0.5px;
          font-size: 1.8rem;
          background: linear-gradient(135deg, #60A5FA, #3B82F6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .admin-nav-link {
          color: #CBD5E1 !important;
          font-weight: 700;
          border-radius: 10px;
          padding: 0.45rem 0.85rem !important;
          transition: all 0.2s ease;
        }
        .admin-nav-link:hover {
          color: #F8FAFC !important;
          background: rgba(59,130,246,0.12);
        }

        .admin-exit-btn {
          background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
          border: none;
          color: #fff;
          border-radius: 12px;
          font-weight: 700;
          padding: 0.52rem 1.05rem;
          box-shadow: 0 10px 22px rgba(239,68,68,0.2);
          transition: all 0.2s ease;
        }
        .admin-exit-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 24px rgba(239,68,68,0.28);
          filter: brightness(1.1);
        }

        .admin-profile-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.55rem;
          border: 1px solid rgba(148,163,184,0.24);
          background: linear-gradient(135deg, rgba(30,58,138,0.34) 0%, rgba(67,56,202,0.34) 100%);
          color: #e2e8f0;
          border-radius: 14px;
          padding: 0.36rem 0.66rem;
          transition: all 0.2s ease;
          font-weight: 700;
          text-decoration: none;
        }
        .admin-profile-chip:hover {
          transform: translateY(-1px);
          border-color: rgba(96,165,250,0.52);
          box-shadow: 0 10px 22px rgba(59,130,246,0.18);
          color: #fff;
        }

        .admin-profile-avatar {
          width: 28px;
          height: 28px;
          border-radius: 9px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #3B82F6, #6366F1);
          color: #fff;
          font-weight: 800;
          font-size: 0.82rem;
          box-shadow: 0 8px 18px rgba(59,130,246,0.22);
        }

        .admin-profile-name {
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #f8fafc;
          font-size: 0.86rem;
        }

        .admin-navbar .navbar-toggler {
          border-color: rgba(148,163,184,0.24);
          background: rgba(255,255,255,0.04);
        }
        .admin-navbar .navbar-toggler-icon {
          filter: invert(1) brightness(2);
        }

        @media (max-width: 991px) {
          .admin-profile-chip {
            margin: 0.4rem 0 0.25rem;
            width: 100%;
            justify-content: center;
          }

          .admin-exit-btn {
            width: 100%;
          }

          .admin-profile-name {
            max-width: unset;
          }
        }
      `}</style>
    </>
  );
}