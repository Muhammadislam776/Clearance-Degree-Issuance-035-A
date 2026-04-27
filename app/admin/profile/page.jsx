"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Row, Col, Card, Badge, Spinner } from "react-bootstrap";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminLayout from "@/components/layout/AdminLayout";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/lib/supabaseClient";

function AdminProfileContent() {
  const { profile, loading: authLoading } = useAuth();
  const [loadingStats, setLoadingStats] = useState(true);
  const [stats, setStats] = useState({
    users: 0,
    departments: 0,
    students: 0,
    pendingClearance: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      setLoadingStats(true);
      try {
        const [usersRes, deptRes, studentsRes, pendingRes] = await Promise.all([
          supabase.from("users").select("id", { head: true, count: "exact" }),
          supabase.from("departments").select("id", { head: true, count: "exact" }),
          supabase.from("students").select("id", { head: true, count: "exact" }),
          supabase.from("clearance_requests").select("id", { head: true, count: "exact" }).eq("status", "pending"),
        ]);

        setStats({
          users: usersRes.count || 0,
          departments: deptRes.count || 0,
          students: studentsRes.count || 0,
          pendingClearance: pendingRes.count || 0,
        });
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, []);

  const adminName = profile?.name || "Administrator";
  const adminEmail = profile?.email || "N/A";
  const initials = useMemo(() => {
    const words = String(adminName).trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return "A";
    return words
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
  }, [adminName]);

  if (authLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <div className="admin-profile-wrap p-2 p-md-3">
      <div className="admin-profile-hero mb-4">
        <Row className="align-items-center g-3">
          <Col lg={8}>
            <div className="d-flex align-items-center gap-3">
              <div className="admin-profile-avatar-xl">{initials}</div>
              <div>
                <div className="admin-profile-kicker">ADMIN PROFILE</div>
                <h2 className="mb-1 text-white fw-bold">{adminName}</h2>
                <p className="mb-0 text-white-50">Central authority for user, department, and workflow governance.</p>
              </div>
            </div>
          </Col>
          <Col lg={4} className="text-lg-end">
            <Badge className="admin-role-pill">System Administrator</Badge>
          </Col>
        </Row>
      </div>

      <Row className="g-4">
        <Col lg={5}>
          <Card className="admin-profile-panel border-0 h-100">
            <Card.Body className="p-4">
              <h5 className="text-white fw-bold mb-3">Identity Information</h5>

              <div className="profile-row">
                <span className="label">Name</span>
                <span className="value">{adminName}</span>
              </div>
              <div className="profile-row">
                <span className="label">Email</span>
                <span className="value">{adminEmail}</span>
              </div>
              <div className="profile-row">
                <span className="label">Role</span>
                <span className="value">{String(profile?.role || "admin").toUpperCase()}</span>
              </div>
              <div className="profile-row">
                <span className="label">Account ID</span>
                <span className="value text-break">{profile?.id || "N/A"}</span>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={7}>
          <Card className="admin-profile-panel border-0 h-100">
            <Card.Body className="p-4">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h5 className="text-white fw-bold mb-0">System Snapshot</h5>
                {loadingStats && <Spinner animation="border" size="sm" />}
              </div>

              <Row className="g-3">
                <Col sm={6}>
                  <div className="stat-box">
                    <div className="stat-label">Registered Users</div>
                    <div className="stat-value">{stats.users}</div>
                  </div>
                </Col>
                <Col sm={6}>
                  <div className="stat-box">
                    <div className="stat-label">Departments</div>
                    <div className="stat-value">{stats.departments}</div>
                  </div>
                </Col>
                <Col sm={6}>
                  <div className="stat-box">
                    <div className="stat-label">Students</div>
                    <div className="stat-value">{stats.students}</div>
                  </div>
                </Col>
                <Col sm={6}>
                  <div className="stat-box stat-box-alert">
                    <div className="stat-label">Pending Requests</div>
                    <div className="stat-value">{stats.pendingClearance}</div>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <style jsx global>{`
        @keyframes riseIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 20px 40px rgba(2,6,23,0.32); }
          50% { box-shadow: 0 24px 46px rgba(37,99,235,0.28); }
        }

        .admin-profile-wrap {
          animation: riseIn 0.45s ease-out;
        }

        .admin-profile-hero {
          border: 1px solid rgba(148,163,184,0.2);
          border-radius: 22px;
          padding: 1.2rem 1.3rem;
          background: linear-gradient(135deg, rgba(37,99,235,0.9) 0%, rgba(79,70,229,0.9) 100%);
          box-shadow: 0 20px 40px rgba(2,6,23,0.32);
          backdrop-filter: blur(10px);
          animation: pulseGlow 4s ease-in-out infinite;
        }

        .admin-profile-kicker {
          display: inline-block;
          margin-bottom: 0.4rem;
          color: #dbeafe;
          border: 1px solid rgba(255,255,255,0.24);
          background: rgba(255,255,255,0.12);
          border-radius: 999px;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.06em;
          padding: 0.24rem 0.68rem;
        }

        .admin-profile-avatar-xl {
          width: 66px;
          height: 66px;
          border-radius: 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 1.22rem;
          color: #fff;
          background: linear-gradient(135deg, rgba(15,23,42,0.45) 0%, rgba(30,41,59,0.45) 100%);
          border: 1px solid rgba(255,255,255,0.2);
        }

        .admin-role-pill {
          background: linear-gradient(135deg, rgba(15,23,42,0.76) 0%, rgba(30,41,59,0.76) 100%) !important;
          color: #f8fafc !important;
          border: 1px solid rgba(255,255,255,0.24) !important;
          border-radius: 999px;
          font-size: 0.76rem;
          font-weight: 800;
          letter-spacing: 0.04em;
          padding: 0.5rem 0.85rem;
          box-shadow: 0 10px 24px rgba(2,6,23,0.22);
        }

        .admin-profile-panel {
          border-radius: 18px;
          background: linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(30,41,59,0.95) 100%) !important;
          border: 1px solid rgba(148,163,184,0.14) !important;
          box-shadow: 0 14px 30px rgba(2,6,23,0.28) !important;
          overflow: hidden;
        }

        .admin-profile-panel .card-body {
          background: transparent !important;
        }

        .admin-profile-panel:hover {
          transform: translateY(-2px);
          border-color: rgba(96,165,250,0.4) !important;
          box-shadow: 0 18px 34px rgba(2,6,23,0.32) !important;
        }

        .profile-row {
          display: flex;
          justify-content: space-between;
          gap: 0.8rem;
          padding: 0.86rem 0;
          border-bottom: 1px solid rgba(148,163,184,0.14);
        }

        .profile-row:last-child {
          border-bottom: 0;
        }

        .profile-row .label {
          color: #93c5fd;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-size: 0.72rem;
          font-weight: 800;
          min-width: 100px;
        }

        .profile-row .value {
          color: #f8fafc;
          font-weight: 700;
          text-align: right;
        }

        .stat-box {
          border: 1px solid rgba(148,163,184,0.18);
          border-radius: 14px;
          background: rgba(15,23,42,0.58);
          padding: 0.9rem;
          min-height: 104px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .stat-box:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 24px rgba(15,23,42,0.26);
          border-color: rgba(96,165,250,0.42);
        }

        .stat-box-alert {
          background: linear-gradient(135deg, rgba(127,29,29,0.35) 0%, rgba(153,27,27,0.35) 100%);
          border-color: rgba(248,113,113,0.42);
        }

        .stat-label {
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-size: 0.66rem;
          font-weight: 800;
          margin-bottom: 0.38rem;
        }

        .stat-value {
          color: #fff;
          font-size: 1.55rem;
          font-weight: 800;
          line-height: 1;
        }

        @media (max-width: 767px) {
          .profile-row {
            flex-direction: column;
            gap: 0.3rem;
          }

          .profile-row .value {
            text-align: left;
          }

          .admin-role-pill {
            display: inline-flex;
            margin-top: 0.25rem;
          }
        }
      `}</style>
    </div>
  );
}

export default function AdminProfilePage() {
  return (
    <ProtectedRoute requiredRoles="admin">
      <AdminLayout>
        <AdminProfileContent />
      </AdminLayout>
    </ProtectedRoute>
  );
}
