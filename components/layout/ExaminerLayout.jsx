"use client";
import React from "react";
import { Navbar, Nav, Container, Button } from "react-bootstrap";
import { useRouter } from "next/navigation";
import { logoutUser } from "@/lib/authService";
import { useAuth } from "@/lib/useAuth";
import AIChatbot from "@/components/chatbot/AIChatbot";
import ThemeToggle from "@/components/layout/ThemeToggle";
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
      <Navbar expand="lg" className="navbar-premium mb-4">
        <Container>
          <Navbar.Brand onClick={() => router.push("/examiner/dashboard")} className="navbar-brand-premium cursor-pointer">
            Examiner Portal
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="ms-auto align-items-center">
              <Nav.Link 
                onClick={() => router.push("/examiner/dashboard")}
                className="nav-link-premium"
              >
                Dashboard
              </Nav.Link>
              <Nav.Link 
                onClick={() => router.push("/examiner/pending")}
                className="nav-link-premium"
              >
                Pending
              </Nav.Link>
              <div className="d-flex align-items-center ms-3 me-2">
                <ThemeToggle />
              </div>
              <Button 
                className="btn-premium btn-premium-primary ms-lg-3"
                size="sm"
                onClick={handleLogout}
              >
                Sign Out
              </Button>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <Container fluid className="px-4">{children}</Container>
      <AIChatbot />
    </>
  );
}