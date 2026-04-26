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
          <Navbar.Brand onClick={() => router.push("/admin/dashboard")} className="navbar-brand-premium cursor-pointer">
            Administrative Control
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="ms-auto align-items-center">
              <Nav.Link 
                onClick={() => router.push("/admin/dashboard")}
                className="nav-link-premium"
              >
                Dashboard
              </Nav.Link>
              <Nav.Link 
                onClick={() => router.push("/admin/departments")}
                className="nav-link-premium"
              >
                Departments
              </Nav.Link>
              <Nav.Link 
                onClick={() => router.push("/admin/users")}
                className="nav-link-premium"
              >
                Identity
              </Nav.Link>
              <Button 
                className="btn-premium btn-premium-primary ms-lg-3"
                size="sm"
                onClick={handleLogout}
              >
                Termination/Exit
              </Button>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Container fluid className="px-4">
        {children}
      </Container>
      <AIChatbot />
    </>
  );
}