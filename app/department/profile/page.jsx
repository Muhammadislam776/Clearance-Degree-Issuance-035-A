"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Container, Row, Col, Card, Badge, Spinner } from "react-bootstrap";
import ProtectedRoute from "@/components/ProtectedRoute";
import DepartmentLayout from "@/components/layout/DepartmentLayout";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/lib/supabaseClient";

function DepartmentProfileContent() {
  const { profile, loading: authLoading } = useAuth();
  const [dept, setDept] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDepartment = async () => {
      if (authLoading) return;

      setLoading(true);
      try {
        let query = supabase.from("departments").select("*");

        if (profile?.department_id) {
          query = query.eq("id", profile.department_id);
        } else if (profile?.department) {
          query = query.eq("name", profile.department);
        }

        const { data } = await query.maybeSingle();
        setDept(data || null);
      } finally {
        setLoading(false);
      }
    };

    fetchDepartment();
  }, [authLoading, profile?.department_id, profile?.department]);

  const initials = useMemo(() => {
    const name = String(dept?.name || profile?.department || "Department").trim();
    if (!name) return "D";
    return name
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [dept?.name, profile?.department]);

  if (loading || authLoading) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: "40vh" }}>
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <Container
      fluid
      className="py-4"
      style={{
        minHeight: "calc(100vh - 80px)",
        background:
          "radial-gradient(1100px 460px at 12% -8%, rgba(37,99,235,0.18), rgba(37,99,235,0) 58%), radial-gradient(900px 420px at 88% 8%, rgba(139,92,246,0.18), rgba(139,92,246,0) 56%), linear-gradient(180deg, #0b1220 0%, #111827 100%)",
      }}
    >
      <div className="dashboard-header mb-4 shadow-sm border-0 dept-profile-hero" style={{ background: "linear-gradient(135deg, rgba(37,99,235,0.92) 0%, rgba(14,165,233,0.92) 100%)" }}>
        <Row className="align-items-center">
          <Col md={8}>
            <div className="d-flex align-items-center gap-3 mb-2">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                style={{ width: 52, height: 52, background: "rgba(255,255,255,0.16)", backdropFilter: "blur(8px)" }}
              >
                {initials}
              </div>
              <div>
                <h1 className="fw-bold mb-1 text-white">Department Profile</h1>
                <p className="text-white-50 mb-0 opacity-75">Contact and ownership details managed by admin</p>
              </div>
            </div>
          </Col>
          <Col md={4} className="text-md-end mt-3 mt-md-0">
            <Badge bg="light" text="dark" className="px-3 py-2 rounded-pill fw-bold">
              Admin Managed
            </Badge>
          </Col>
        </Row>
      </div>

      <Row className="g-4">
        <Col lg={4}>
          <Card className="border-0 shadow-sm h-100 dept-profile-panel">
            <Card.Body className="p-4 text-center">
              <div
                className="mx-auto mb-3 d-flex align-items-center justify-content-center"
                style={{ width: 94, height: 94, borderRadius: 26, background: "linear-gradient(135deg, #1E40AF 0%, #0EA5E9 100%)", color: "#fff", fontSize: "2rem", fontWeight: 800 }}
              >
                {initials}
              </div>
              <h3 className="fw-bold mb-1 dept-profile-title">{dept?.name || profile?.department || "Department"}</h3>
              <p className="dept-profile-subtitle mb-0">{dept?.email || "No department email set"}</p>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={8}>
          <Card className="border-0 shadow-sm h-100 dept-profile-panel">
            <Card.Body className="p-4">
              <h5 className="fw-bold mb-4 dept-profile-title">Profile Details</h5>

              <div className="profile-detail-item">
                <span className="label">Department Name</span>
                <span className="value">{dept?.name || profile?.department || "N/A"}</span>
              </div>
              <div className="profile-detail-item">
                <span className="label">Focal Person</span>
                <span className="value">{dept?.focal_person || "N/A"}</span>
              </div>
              <div className="profile-detail-item">
                <span className="label">Contact Phone</span>
                <span className="value">{dept?.whatsapp_number || dept?.contact || "N/A"}</span>
              </div>
              <div className="profile-detail-item">
                <span className="label">Department Email</span>
                <span className="value">{dept?.email || "N/A"}</span>
              </div>
              <div className="profile-detail-item">
                <span className="label">Department Type</span>
                <span className="value">{dept?.is_academic ? "Academic (Final Authority)" : "Support"}</span>
              </div>

              <div className="mt-4 p-3 rounded-4 dept-note-box">
                <div className="small text-uppercase fw-bold dept-note-label mb-1">How To Update</div>
                <div className="dept-note-text small">These fields are editable from the admin panel under Manage Departments.</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <style jsx>{`
        @keyframes profileRise {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .dept-profile-hero {
          animation: profileRise 0.45s ease-out;
          border-radius: 20px;
          box-shadow: 0 18px 40px rgba(15,23,42,0.26);
          border: 1px solid rgba(255,255,255,0.12);
          backdrop-filter: blur(12px);
        }

        .dept-profile-panel {
          background: linear-gradient(180deg, rgba(15,23,42,0.96) 0%, rgba(30,41,59,0.96) 100%);
          border: 1px solid rgba(148,163,184,0.14) !important;
          color: #E2E8F0;
          backdrop-filter: blur(8px);
          box-shadow: 0 12px 28px rgba(15,23,42,0.18) !important;
        }

        .dept-profile-title {
          color: #F8FAFC;
        }

        .dept-profile-subtitle {
          color: #CBD5E1;
        }

        .profile-detail-item {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          padding: 14px 0;
          border-bottom: 1px solid rgba(148,163,184,0.16);
        }
        .profile-detail-item:last-child { border-bottom: 0; }
        .profile-detail-item .label {
          color: #93C5FD;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .profile-detail-item .value {
          color: #F8FAFC;
          font-size: 14px;
          font-weight: 700;
          text-align: right;
        }

        .dept-note-box {
          background: linear-gradient(180deg, rgba(30,41,59,0.92) 0%, rgba(15,23,42,0.92) 100%);
          border: 1px solid rgba(148,163,184,0.14);
        }

        .dept-note-label {
          color: #93C5FD;
        }

        .dept-note-text {
          color: #CBD5E1;
        }
      `}</style>
    </Container>
  );
}

export default function DepartmentProfilePage() {
  return (
    <ProtectedRoute requiredRoles="department">
      <DepartmentLayout>
        <DepartmentProfileContent />
      </DepartmentLayout>
    </ProtectedRoute>
  );
}
