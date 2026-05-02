"use client";
import React from "react";
import { Navbar, Nav, Container, NavDropdown } from "react-bootstrap";
import { useRouter } from "next/navigation";
import { logoutUser } from "@/lib/authService";
import { useAuth } from "@/lib/useAuth";
import AIChatbot from "@/components/chatbot/AIChatbot";
import "../../styles/dashboard-premium.css";

export default function ExaminerLayout({ children }) {
  const router = useRouter();
  const { profile } = useAuth();

  const profileInitials = String(profile?.name || "EX")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "EX";

  const handleLogout = async () => {
    const result = await logoutUser();
    if (result.success) {
      router.push("/login");
    }
  };

  return (
    <>
      <Navbar expand="lg" className="ex-navbar">
        <Container>
          <Navbar.Brand onClick={() => router.push("/examiner/dashboard")} className="ex-navbar-brand cursor-pointer">
            Examiner Portal
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" className="ex-navbar-toggler">
            <span className="ex-hamburger"></span>
          </Navbar.Toggle>
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="ms-auto align-items-center">
              <Nav.Link
                onClick={() => router.push("/examiner/dashboard")}
                className="ex-nav-link"
              >
                Dashboard
              </Nav.Link>
              <Nav.Link
                onClick={() => router.push("/examiner/pending")}
                className="ex-nav-link"
              >
                Pending
              </Nav.Link>
              <Nav.Link
                onClick={() => router.push("/examiner/profile")}
                className="ex-profile-dropdown ms-lg-3 d-flex align-items-center"
                style={{ cursor: "pointer" }}
              >
                <span className="ex-profile-title">
                  <span className="ex-profile-chip">{profileInitials}</span>
                  <span>Profile</span>
                </span>
              </Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <Container fluid className="px-4 pt-4 ex-shell">{children}</Container>
      <AIChatbot />

      <style jsx global>{`
        .ex-shell {
          min-height: calc(100vh - 86px);
          background:
            radial-gradient(1100px 460px at 12% -8%, rgba(37,99,235,0.18), rgba(37,99,235,0) 58%),
            radial-gradient(900px 420px at 88% 8%, rgba(139,92,246,0.18), rgba(139,92,246,0) 56%),
            linear-gradient(180deg, #0b1220 0%, #111827 100%);
        }

        .ex-navbar {
          background: rgba(15,23,42,0.94) !important;
          border-bottom: 1px solid rgba(148,163,184,0.14);
          box-shadow: 0 10px 24px rgba(15,23,42,0.18);
          backdrop-filter: blur(12px);
          margin-bottom: 0 !important;
        }

        .ex-navbar-brand {
          font-weight: 800;
          letter-spacing: -0.2px;
          font-size: 2rem;
          background: linear-gradient(135deg, #60A5FA, #A78BFA);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .ex-nav-link {
          color: #CBD5E1 !important;
          font-weight: 700;
          border-radius: 10px;
          padding: 0.45rem 0.85rem !important;
          transition: all 0.2s ease;
        }
        .ex-nav-link:hover {
          color: #F8FAFC !important;
          background: rgba(96,165,250,0.12);
        }

        .ex-profile-title {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
        }

        .ex-profile-chip {
          width: 24px;
          height: 24px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          font-size: 0.68rem;
          font-weight: 800;
          background: rgba(255,255,255,0.2);
          color: #fff;
          border: 1px solid rgba(255,255,255,0.28);
        }

        .ex-profile-dropdown {
          background: linear-gradient(135deg, rgba(37,99,235,0.96), rgba(124,58,237,0.96)) !important;
          color: #fff !important;
          border: none !important;
          border-radius: 12px !important;
          font-weight: 700 !important;
          padding: 0.52rem 1.05rem !important;
          box-shadow: 0 10px 22px rgba(37,99,235,0.22);
          transition: all 0.2s ease;
          opacity: 1 !important;
        }

        .ex-profile-dropdown:hover,
        .ex-profile-dropdown:focus,
        .ex-profile-dropdown:active {
          background: linear-gradient(135deg, rgba(59,130,246,0.96), rgba(139,92,246,0.96)) !important;
          box-shadow: 0 12px 24px rgba(59,130,246,0.28) !important;
          transform: translateY(-1px);
        }

        .ex-navbar .ex-navbar-toggler {
          border: none;
          padding: 10px;
          outline: none !important;
          box-shadow: none !important;
        }
        
        .ex-hamburger {
          display: block;
          width: 24px;
          height: 2px;
          background: #60A5FA;
          position: relative;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 0 8px rgba(96, 165, 250, 0.4);
        }
        .ex-hamburger::before, .ex-hamburger::after {
          content: "";
          position: absolute;
          width: 24px;
          height: 2px;
          background: #60A5FA;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          left: 0;
          box-shadow: 0 0 8px rgba(96, 165, 250, 0.4);
        }
        .ex-hamburger::before { top: -7px; }
        .ex-hamburger::after { bottom: -7px; }

        .ex-navbar-toggler:hover .ex-hamburger,
        .ex-navbar-toggler:hover .ex-hamburger::before,
        .ex-navbar-toggler:hover .ex-hamburger::after {
          background-color: #93C5FD;
          box-shadow: 0 0 12px rgba(96, 165, 250, 0.8);
        }

        .navbar-toggler[aria-expanded="true"] .ex-hamburger {
          background: transparent;
          box-shadow: none;
        }
        .navbar-toggler[aria-expanded="true"] .ex-hamburger::before {
          transform: translateY(7px) rotate(45deg);
        }
        .navbar-toggler[aria-expanded="true"] .ex-hamburger::after {
          transform: translateY(-7px) rotate(-45deg);
        }

        @media (max-width: 991px) {
          .ex-navbar-brand { font-size: 1.5rem; }
          .navbar-collapse {
            background: rgba(15,23,42,0.98);
            margin-top: 1rem;
            padding: 1.25rem;
            border-radius: 20px;
            border: 1px solid rgba(148,163,184,0.12);
            backdrop-filter: blur(20px);
            box-shadow: 0 20px 40px rgba(0,0,0,0.4);
          }
          .ex-nav-link {
            text-align: center;
            padding: 0.8rem !important;
            margin-bottom: 0.5rem;
          }
          .ex-profile-dropdown {
            width: 100%;
            margin-top: 0.5rem;
            text-align: center;
            justify-content: center;
          }
        }
      `}</style>
    </>
  );
}