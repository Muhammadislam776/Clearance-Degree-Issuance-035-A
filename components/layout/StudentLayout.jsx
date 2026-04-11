"use client";
import React from "react";
import { Container, Row, Col, Navbar, Nav, Button } from "react-bootstrap";
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
      <Container fluid style={{ paddingLeft: "20px", paddingRight: "20px" }}>
        {children}
      </Container>
      <AIChatbot />
    </>
  );
}