"use client";
import React from "react";
import { Navbar, Nav, Container, Button } from "react-bootstrap";
import { useRouter } from "next/navigation";
import { logoutUser } from "@/lib/authService";
import { useAuth } from "@/lib/useAuth";
import AIChatbot from "@/components/chatbot/AIChatbot";
import "../../styles/dashboard-premium.css";

export default function ExaminerLayout({ children }) {
  const router = useRouter();
  const { profile } = useAuth();

  const handleLogout = async () => {
    const result = await logoutUser();
    if (result.success) {
      router.push("/login");
    }
  };

  return (
    <>
      <Navbar expand="lg" className="ex-navbar mb-4">
        <Container>
          <Navbar.Brand onClick={() => router.push("/examiner/dashboard")} className="ex-navbar-brand cursor-pointer">
            Examiner Portal
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
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
              <Button 
                className="ex-signout-btn ms-lg-3"
                size="sm"
                onClick={handleLogout}
              >
                Sign Out
              </Button>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <Container fluid className="px-4 ex-shell">{children}</Container>
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

        .ex-signout-btn {
          background: linear-gradient(135deg, rgba(37,99,235,0.96), rgba(124,58,237,0.96));
          color: #fff;
          border: none;
          border-radius: 12px;
          font-weight: 700;
          padding: 0.52rem 1.05rem;
          box-shadow: 0 10px 22px rgba(37,99,235,0.22);
        }
        .ex-signout-btn:hover,
        .ex-signout-btn:focus,
        .ex-signout-btn:active {
          color: #fff !important;
          background: linear-gradient(135deg, rgba(59,130,246,0.96), rgba(139,92,246,0.96)) !important;
        }

        .ex-navbar .navbar-toggler {
          border-color: rgba(148,163,184,0.24);
          background: rgba(255,255,255,0.04);
        }
        .ex-navbar .navbar-toggler-icon {
          filter: invert(1) brightness(2);
        }
      `}</style>
    </>
  );
}