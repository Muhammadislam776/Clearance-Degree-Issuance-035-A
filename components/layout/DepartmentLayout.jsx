"use client";
import React from "react";
import { Container, Navbar, Nav, Button, Card } from "react-bootstrap";
import { useRouter } from "next/navigation";
import { logoutUser } from "@/lib/authService";
import { useAuth } from "@/lib/useAuth";
import { SectionProvider, useSection } from "@/lib/SectionContext";
import AIChatbot from "@/components/chatbot/AIChatbot";
import "../../styles/dashboard-premium.css";

const SidebarItem = ({ id, name, icon, active, onClick }) => (
  <div 
    className={`sidebar-item ${active ? 'active' : ''}`}
    onClick={() => onClick({ id, name })}
  >
    <div className="sidebar-icon">{icon}</div>
    <span>{name}</span>
  </div>
);

function DepartmentLayoutContent({ children }) {
  const router = useRouter();
  const { profile } = useAuth();
  const { activeSection, setActiveSection } = useSection();

  const handleLogout = async () => {
    const result = await logoutUser();
    if (result.success) {
      router.push("/login");
    }
  };

  const sections = [
    { id: "all", name: "Hub Overview", icon: "📁" },
    { id: "6d75d78a-2e63-48cc-b60b-667b65b77a28", name: "Library Section", icon: "📚" },
    { id: "9b62b5d5-bb95-422e-9a7e-af5598765b9c", name: "Fee Section", icon: "💰" },
    { id: "e7010ee1-092e-4977-9603-ce4659a742a4", name: "Hostel Dues", icon: "🏨" },
    { id: "7f5ed866-b681-4252-b6e3-3690a5679a4b", name: "Sports Section", icon: "⚽" },
    { id: "1dda4d6f-d2b9-4fab-9ad1-bab9d426bcea", name: "Laboratory", icon: "🧪" },
    { id: "713729ee-e7c0-474e-9407-8950ba3586f4", name: "Admin Office", icon: "🏛️" },
  ];

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh" }}>
      {/* Navbar */}
      <Navbar expand="lg" className="navbar-premium shadow-sm">
        <Container fluid className="px-5">
          <Navbar.Brand onClick={() => router.push("/department/dashboard")} className="navbar-brand-premium cursor-pointer">
            Staff Portal <span className="text-muted fw-normal fs-6 ms-2">| Institutional Hub</span>
          </Navbar.Brand>
          <Nav className="ms-auto align-items-center">
            <span className="me-3 text-muted small d-none d-md-inline">
              Signed in as <strong className="text-dark">{profile?.name}</strong>
            </span>
            <Button 
              className="btn-premium btn-premium-primary"
              size="sm"
              onClick={handleLogout}
            >
              Sign Out
            </Button>
          </Nav>
        </Container>
      </Navbar>

      <div className="d-flex">
        {/* Sidebar */}
        <aside className="sidebar-premium d-none d-lg-block">
          <div className="mb-4">
            <small className="text-muted text-uppercase fw-bold px-3" style={{ letterSpacing: "1px", fontSize: "0.65rem" }}>
              Sections
            </small>
          </div>
          {sections.map(section => (
            <SidebarItem 
              key={section.id}
              {...section}
              active={activeSection?.id === section.id}
              onClick={setActiveSection}
            />
          ))}
          
          <div className="mt-5 px-3">
            <Card className="border-0 shadow-sm bg-primary text-white p-3" style={{ borderRadius: "16px", background: "linear-gradient(135deg, #6366f1, #a855f7)" }}>
              <p className="x-small mb-1 opacity-75">Need Support?</p>
              <p className="small mb-0 fw-bold">Contact Admin Support</p>
            </Card>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-grow-1">
          {children}
        </main>
      </div>
      <AIChatbot />
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