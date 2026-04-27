"use client";
import React, { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Table, Card, Button, Badge, Form, Row, Col, Spinner } from "react-bootstrap";
import { supabase } from "@/lib/supabaseClient";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase.from("users").select("*").order("created_at", { ascending: false });
    setUsers(data || []);
    setLoading(false);
  };

  const deleteUser = async (id) => {
    if (!confirm("Are you sure to delete this user?")) return;
    await supabase.from("users").delete().eq("id", id);
    fetchUsers();
  };

  const roleTone = (role) => {
    const r = String(role || "").toLowerCase();
    if (r === "admin") return { bg: "#7C2D12", border: "#FB923C", text: "#FFFFFF" };
    if (r === "examiner") return { bg: "#1D4ED8", border: "#60A5FA", text: "#FFFFFF" };
    if (r === "department") return { bg: "#0F766E", border: "#5EEAD4", text: "#FFFFFF" };
    return { bg: "#4338CA", border: "#A5B4FC", text: "#FFFFFF" };
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const query = search.trim().toLowerCase();
      const inQuery =
        !query ||
        String(u.name || "").toLowerCase().includes(query) ||
        String(u.email || "").toLowerCase().includes(query);
      const inRole = roleFilter === "ALL" || String(u.role || "").toUpperCase() === roleFilter;
      return inQuery && inRole;
    });
  }, [users, search, roleFilter]);

  return (
    <AdminLayout>
      <div className="admin-users-page p-2 p-md-3">
        <div className="admin-users-hero mb-4">
          <Row className="align-items-center g-3">
            <Col lg={7}>
              <div className="admin-users-kicker">IDENTITY MANAGEMENT</div>
              <h2 className="mb-1 text-white fw-bold">Manage Users</h2>
              <p className="mb-0 text-white-50">Review registered identities, filter by role, and perform account actions.</p>
            </Col>
            <Col lg={5}>
              <div className="d-flex gap-2 flex-wrap justify-content-lg-end">
                <div className="users-stat-chip">Total: {users.length}</div>
                <div className="users-stat-chip">Visible: {filteredUsers.length}</div>
              </div>
            </Col>
          </Row>
        </div>

        <Card className="admin-users-panel border-0 shadow-sm overflow-hidden">
          <div className="admin-users-toolbar p-3 p-md-4 d-flex gap-2 flex-wrap align-items-center justify-content-between">
            <div className="fw-bold text-white fs-5">Identity Registry</div>
            <div className="d-flex gap-2 flex-grow-1 flex-md-grow-0 users-controls">
              <Form.Control
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="users-control"
                placeholder="Search by name or email"
              />
              <Form.Select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="users-control"
              >
                <option value="ALL">All Roles</option>
                <option value="STUDENT">Student</option>
                <option value="DEPARTMENT">Department</option>
                <option value="EXAMINER">Examiner</option>
                <option value="ADMIN">Admin</option>
              </Form.Select>
            </div>
          </div>

          <div className="d-none d-md-block">
            <Table responsive className="mb-0 users-table align-middle">
              <thead>
                <tr>
                  <th className="px-4 py-3 border-0">Name</th>
                  <th className="px-4 py-3 border-0">Email</th>
                  <th className="px-4 py-3 border-0">Role</th>
                  <th className="px-4 py-3 border-0 text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="4" className="text-center py-5 text-white-50">
                      <Spinner animation="border" size="sm" className="me-2" /> Loading users...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr><td colSpan="4" className="text-center py-5 text-white-50">No users found.</td></tr>
                ) : (
                  filteredUsers.map((u, idx) => (
                    <tr key={u.id} className="users-row">
                      <td className="px-4 py-3">
                        <div className="d-flex align-items-center gap-3">
                          <div className="users-avatar">{String(u.name || "U").charAt(0).toUpperCase()}</div>
                          <span className="text-white fw-bold">{u.name || "Unknown"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white-50">{u.email || "-"}</td>
                      <td className="px-4 py-3">
                        <Badge
                          className="users-role-badge"
                          style={{
                            background: roleTone(u.role).bg,
                            color: roleTone(u.role).text,
                            border: `1px solid ${roleTone(u.role).border}`,
                          }}
                        >
                          {String(u.role || "user").toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-end">
                        <Button variant="danger" size="sm" className="users-delete-btn" onClick={() => deleteUser(u.id)}>Delete</Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>

          <div className="d-md-none p-3">
            {loading ? (
              <div className="text-center py-4 text-white-50">
                <Spinner animation="border" size="sm" className="me-2" /> Loading users...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-4 text-white-50">No users found.</div>
            ) : (
              <div className="users-mobile-list">
                {filteredUsers.map((u) => (
                  <div key={`m-${u.id}`} className="users-mobile-card">
                    <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
                      <div className="d-flex align-items-center gap-2">
                        <div className="users-avatar">{String(u.name || "U").charAt(0).toUpperCase()}</div>
                        <strong className="text-white">{u.name || "Unknown"}</strong>
                      </div>
                      <Badge
                        className="users-role-badge"
                        style={{
                          background: roleTone(u.role).bg,
                          color: roleTone(u.role).text,
                          border: `1px solid ${roleTone(u.role).border}`,
                        }}
                      >
                        {String(u.role || "user").toUpperCase()}
                      </Badge>
                    </div>
                    <div className="small text-white-50 mb-3">{u.email || "-"}</div>
                    <div className="text-end">
                      <Button variant="danger" size="sm" className="users-delete-btn" onClick={() => deleteUser(u.id)}>Delete</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      <style jsx global>{`
        @keyframes usersFadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .admin-users-page {
          animation: usersFadeUp 0.45s ease-out;
        }

        .admin-users-hero {
          background: linear-gradient(135deg, rgba(30,58,138,0.9) 0%, rgba(67,56,202,0.9) 100%);
          border: 1px solid rgba(148,163,184,0.2);
          border-radius: 20px;
          padding: 1.2rem 1.3rem;
          box-shadow: 0 18px 36px rgba(2,6,23,0.35);
          backdrop-filter: blur(8px);
        }

        .admin-users-kicker {
          display: inline-block;
          margin-bottom: 0.4rem;
          padding: 0.24rem 0.65rem;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.24);
          background: rgba(255,255,255,0.12);
          color: #dbeafe;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.05em;
        }

        .users-stat-chip {
          border: 1px solid rgba(148,163,184,0.24);
          border-radius: 999px;
          background: rgba(15,23,42,0.7);
          color: #e2e8f0;
          font-weight: 700;
          font-size: 0.78rem;
          padding: 0.4rem 0.75rem;
        }

        .admin-users-panel {
          background: linear-gradient(180deg, rgba(15,23,42,0.94) 0%, rgba(30,41,59,0.94) 100%) !important;
          border: 1px solid rgba(148,163,184,0.16) !important;
          border-radius: 22px;
          box-shadow: 0 16px 34px rgba(2,6,23,0.34);
        }

        .admin-users-toolbar {
          border-bottom: 1px solid rgba(148,163,184,0.15);
          background: rgba(15,23,42,0.42);
        }

        .users-controls {
          min-width: min(100%, 520px);
        }

        .users-control {
          background: rgba(15,23,42,0.78) !important;
          color: #f8fafc !important;
          border: 1px solid rgba(148,163,184,0.24) !important;
          border-radius: 12px !important;
          min-height: 46px;
        }

        .users-control::placeholder {
          color: #94A3B8;
        }

        .users-control:focus {
          border-color: rgba(96,165,250,0.52) !important;
          box-shadow: 0 0 0 0.2rem rgba(59,130,246,0.18) !important;
        }

        .users-table thead th {
          background: rgba(15,23,42,0.82) !important;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-size: 0.74rem;
          font-weight: 800;
        }

        .users-table tbody tr td {
          background: #334155 !important;
          border-top: 1px solid #475569;
          border-bottom: 1px solid #475569;
          color: #E2E8F0 !important;
          transition: background-color 0.2s ease;
        }

        .users-table tbody tr:nth-child(odd) td { background: #3F4A5C !important; }
        .users-table tbody tr:nth-child(even) td { background: #384556 !important; }

        .users-row:hover td {
          background: #1E293B !important;
        }

        .users-avatar {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          background: linear-gradient(135deg, #3B82F6, #6366F1);
          color: #fff;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 18px rgba(59,130,246,0.25);
        }

        .users-role-badge {
          font-size: 0.67rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          border-radius: 999px;
          padding: 0.4rem 0.72rem;
        }

        .users-delete-btn {
          border-radius: 10px;
          border: none;
          font-weight: 700;
          background: linear-gradient(135deg, #ef4444, #b91c1c);
          box-shadow: 0 10px 22px rgba(239,68,68,0.2);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .users-delete-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 24px rgba(239,68,68,0.28);
        }

        .users-mobile-list {
          display: grid;
          gap: 0.8rem;
        }

        .users-mobile-card {
          border: 1px solid rgba(148,163,184,0.18);
          background: linear-gradient(180deg, rgba(15,23,42,0.72) 0%, rgba(30,41,59,0.72) 100%);
          border-radius: 14px;
          padding: 0.9rem;
        }

        @media (max-width: 991px) {
          .users-controls {
            width: 100%;
          }
        }
      `}</style>
    </AdminLayout>
  );
}