"use client";
import React, { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, Table, Button, Modal, Form, Badge, Row, Col } from "react-bootstrap";
import { supabase } from "@/lib/supabaseClient";

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingDeptId, setEditingDeptId] = useState(null);
  const [deptForm, setDeptForm] = useState({
    name: "",
    phone: "",
    email: "",
    focalPerson: "",
    isAcademic: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    const { data } = await supabase.from("departments").select("*").order("name");
    setDepartments(data || []);
  };

  const openCreateModal = () => {
    setEditingDeptId(null);
    setDeptForm({ name: "", phone: "", email: "", focalPerson: "", isAcademic: false });
    setError("");
    setShowModal(true);
  };

  const openEditModal = (dept) => {
    setEditingDeptId(dept.id);
    setDeptForm({
      name: dept.name || "",
      phone: dept.whatsapp_number || dept.contact || "",
      email: dept.email || "",
      focalPerson: dept.focal_person || "",
      isAcademic: !!dept.is_academic,
    });
    setError("");
    setShowModal(true);
  };

  const saveDepartment = async () => {
    const trimmed = String(deptForm.name || "").trim();
    if (!trimmed) return;

    setSaving(true);
    setError("");
    try {
      const phone = String(deptForm.phone || "").trim();
      const cleanedPhone = phone.replace(/[^0-9]/g, "");
      const email = String(deptForm.email || "").trim();

      const payload = { 
        name: trimmed, 
        contact: phone || null,
        whatsapp_number: cleanedPhone || phone || null,
        email: email || null,
        focal_person: String(deptForm.focalPerson || "").trim() || null,
        is_academic: !!deptForm.isAcademic,
      };

      if (payload.is_academic) {
        const { error: resetError } = await supabase
          .from("departments")
          .update({ is_academic: false })
          .neq("id", editingDeptId || "");
        if (resetError) throw resetError;
      }

      if (editingDeptId) {
        const { error: updateError } = await supabase
          .from("departments")
          .update(payload)
          .eq("id", editingDeptId);
        if (updateError) throw updateError;
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from("departments")
          .insert([payload])
          .select("id")
          .single();
        if (insertError) throw insertError;

        if (payload.is_academic && inserted?.id) {
          const { error: markError } = await supabase
            .from("departments")
            .update({ is_academic: true })
            .eq("id", inserted.id);
          if (markError) throw markError;
        }
      }

      setShowModal(false);
      setEditingDeptId(null);
      setDeptForm({ name: "", phone: "", email: "", focalPerson: "", isAcademic: false });
      fetchDepartments();
    } catch (e) {
      console.error(e);
      setError(e?.message || "Failed to save department");
    } finally {
      setSaving(false);
    }
  };

  const deleteDepartment = async (id) => {
    if (!confirm("Are you sure to delete this department? All associated data may be affected.")) return;
    try {
      const { error } = await supabase.from("departments").delete().eq("id", id);
      if (error) throw error;
      fetchDepartments();
    } catch (e) {
      alert("Error deleting: " + e.message);
    }
  };

  return (
    <AdminLayout>
      <div className="p-4 admin-dept-page">
        <div className="admin-dept-orb" aria-hidden="true" />
        <div className="d-flex justify-content-between align-items-center mb-4 admin-dept-header">
          <div>
            <h2 className="fw-bold mb-1 text-white">Manage Departments</h2>
            <p className="text-white-50 mb-0">Configure institutional departments, contact persons, and the single academic final-authority department</p>
          </div>
          <Button 
            className="rounded-pill px-4 border-0 shadow-sm admin-dept-add-btn"
            onClick={openCreateModal}
          >
            + Add New Department
          </Button>
        </div>

        {error ? <div className="alert alert-danger rounded-4 border-0 shadow-sm mb-4">{error}</div> : null}

        {departments.some((d) => d.is_academic) ? (
          <div className="alert rounded-4 border-0 shadow-sm mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2 admin-academic-banner">
            <div>
              <strong>Academic Department:</strong> {departments.find((d) => d.is_academic)?.name || "Set"}
            </div>
            <div className="text-white-50 small">Only one department can be marked as academic at a time.</div>
          </div>
        ) : null}

        <Card className="border-0 shadow-sm overflow-hidden admin-dept-table-card" style={{ borderRadius: "24px" }}>
          <div className="d-none d-md-block">
          <Table responsive hover className="mb-0 admin-dept-table">
            <thead>
              <tr>
                <th className="px-4 py-3 border-0">Department Name</th>
                <th className="px-4 py-3 border-0">Contact Info</th>
                <th className="px-4 py-3 border-0">Focal Person</th>
                <th className="px-4 py-3 border-0">Type</th>
                <th className="px-4 py-3 border-0 text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-5 text-white-50">No departments found. Add one to get started.</td></tr>
              ) : (
                departments.map(d => (
                  <tr key={d.id} className="align-middle transition-all">
                    <td className="px-4 py-3">
                      <div className="d-flex align-items-center gap-3">
                        <div className="dept-icon" style={{ width: "40px", height: "40px", borderRadius: "12px", background: d.is_academic ? "rgba(59,130,246,0.24)" : "rgba(148,163,184,0.2)", color: d.is_academic ? "#93C5FD" : "#CBD5E1", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
                          {d.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="fw-bold text-white">{d.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="small fw-medium text-white">📞 {d.whatsapp_number || d.contact || "-"}</div>
                      <div className="text-white-50 x-small">✉️ {d.email || "-"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-white-50 small">{d.focal_person || "Not Assigned"}</span>
                    </td>
                    <td className="px-4 py-3">
                      {d.is_academic ? (
                        <Badge className="rounded-pill px-3 py-2 dept-type-badge dept-type-academic">🎓 Academic</Badge>
                      ) : (
                        <Badge className="rounded-pill px-3 py-2 dept-type-badge dept-type-support">🏢 Support</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-end">
                      <Button 
                        variant="link"
                        className="p-0 text-decoration-none fw-bold me-3 admin-action-edit"
                        onClick={() => openEditModal(d)}
                      >
                        Edit
                      </Button>
                      <Button 
                        variant="link" 
                        className="p-0 text-decoration-none fw-bold admin-action-delete"
                        onClick={() => deleteDepartment(d.id)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
          </div>

          <div className="d-md-none p-3">
            {departments.length === 0 ? (
              <div className="text-center py-4 text-white-50">No departments found. Add one to get started.</div>
            ) : (
              <div className="dept-mobile-list">
                {departments.map((d) => (
                  <div key={`m-${d.id}`} className="dept-mobile-card">
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <div className="d-flex align-items-center gap-2">
                        <div
                          className="dept-icon"
                          style={{
                            width: "38px",
                            height: "38px",
                            borderRadius: "12px",
                            background: d.is_academic ? "rgba(59,130,246,0.24)" : "rgba(148,163,184,0.2)",
                            color: d.is_academic ? "#93C5FD" : "#CBD5E1",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: "bold",
                          }}
                        >
                          {d.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="fw-bold text-white">{d.name}</div>
                      </div>

                      {d.is_academic ? (
                        <Badge className="rounded-pill px-3 py-2 dept-type-badge dept-type-academic">🎓 Academic</Badge>
                      ) : (
                        <Badge className="rounded-pill px-3 py-2 dept-type-badge dept-type-support">🏢 Support</Badge>
                      )}
                    </div>

                    <div className="dept-mobile-line"><span>Phone</span><strong>{d.whatsapp_number || d.contact || "-"}</strong></div>
                    <div className="dept-mobile-line"><span>Email</span><strong>{d.email || "-"}</strong></div>
                    <div className="dept-mobile-line"><span>Focal Person</span><strong>{d.focal_person || "Not Assigned"}</strong></div>

                    <div className="d-flex justify-content-end gap-3 mt-3">
                      <Button
                        variant="link"
                        className="p-0 text-decoration-none fw-bold admin-action-edit"
                        onClick={() => openEditModal(d)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="link"
                        className="p-0 text-decoration-none fw-bold admin-action-delete"
                        onClick={() => deleteDepartment(d.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered className="admin-dept-modal">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold text-white">{editingDeptId ? "Edit Department" : "Add Department"}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Form>
            <Form.Group className="mb-4">
              <Form.Label className="small fw-bold text-white-50 text-uppercase">Department Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g. Accounts Department"
                className="py-3 rounded-4 dept-form-input"
                value={deptForm.name}
                onChange={e => setDeptForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </Form.Group>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-4">
                  <Form.Label className="small fw-bold text-white-50 text-uppercase">Contact (Phone/WhatsApp)</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="0312-XXXXXXX"
                    className="py-3 rounded-4 dept-form-input"
                    value={deptForm.phone}
                    onChange={e => setDeptForm(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-4">
                  <Form.Label className="small fw-bold text-white-50 text-uppercase">Focal Person</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Name"
                    className="py-3 rounded-4 dept-form-input"
                    value={deptForm.focalPerson}
                    onChange={e => setDeptForm(prev => ({ ...prev, focalPerson: e.target.value }))}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-4">
              <Form.Label className="small fw-bold text-white-50 text-uppercase">Department Email</Form.Label>
              <Form.Control
                type="email"
                placeholder="department@example.com"
                className="py-3 rounded-4 dept-form-input"
                value={deptForm.email}
                onChange={e => setDeptForm(prev => ({ ...prev, email: e.target.value }))}
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Check
                type="checkbox"
                id="academic-department-check"
                label="Mark as Academic Final Authority"
                className="text-white"
                checked={deptForm.isAcademic}
                onChange={(e) => setDeptForm(prev => ({ ...prev, isAcademic: e.target.checked }))}
              />
              <div className="text-white-50 small mt-2">
                This should be enabled for only one department. Selecting this will unmark the current academic department.
              </div>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer className="border-0 p-4 pt-0">
          <Button variant="light" className="rounded-pill px-4 py-2" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button 
            variant="primary" 
            className="rounded-pill px-5 py-2 border-0 shadow-sm admin-dept-save-btn"
            onClick={saveDepartment} 
            disabled={saving}
          >
            {saving ? "Saving..." : editingDeptId ? "Update Department" : "Create Department"}
          </Button>
        </Modal.Footer>
      </Modal>

      <style jsx global>{`
        @keyframes deptFadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .admin-dept-page {
          min-height: 100vh;
          background:
            radial-gradient(1100px 460px at 12% -8%, rgba(37,99,235,0.18), rgba(37,99,235,0) 58%),
            radial-gradient(900px 420px at 88% 8%, rgba(139,92,246,0.18), rgba(139,92,246,0) 56%),
            linear-gradient(180deg, #0b1220 0%, #111827 100%);
          animation: deptFadeUp 0.45s ease-out;
          position: relative;
          isolation: isolate;
        }

        .admin-dept-orb {
          position: fixed;
          width: 170px;
          height: 170px;
          right: 22px;
          bottom: 24px;
          border-radius: 999px;
          pointer-events: none;
          background: radial-gradient(circle, rgba(129,140,248,0.74) 0%, rgba(59,130,246,0.16) 56%, rgba(59,130,246,0) 72%);
          z-index: 0;
        }

        .admin-dept-header {
          background: linear-gradient(180deg, rgba(15,23,42,0.92) 0%, rgba(30,41,59,0.92) 100%);
          border: 1px solid rgba(148,163,184,0.16);
          border-radius: 22px;
          padding: 1.2rem 1.4rem;
          box-shadow: 0 14px 32px rgba(2,6,23,0.32);
          backdrop-filter: blur(10px);
          animation: deptFadeUp 0.35s ease-out;
          position: relative;
          z-index: 1;
        }

        .admin-dept-add-btn,
        .admin-dept-save-btn {
          background: linear-gradient(135deg, #2563EB 0%, #7C3AED 100%);
          color: #fff;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .admin-dept-add-btn:hover,
        .admin-dept-save-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 26px rgba(59,130,246,0.3);
          color: #fff;
        }

        .admin-academic-banner {
          background: linear-gradient(180deg, rgba(37,99,235,0.2) 0%, rgba(30,41,59,0.88) 100%);
          color: #dbeafe;
          border: 1px solid rgba(96,165,250,0.26);
          backdrop-filter: blur(8px);
          position: relative;
          z-index: 1;
        }

        .admin-dept-table-card {
          background: linear-gradient(180deg, #0F172A 0%, #1E293B 100%);
          border: 1px solid #334155 !important;
          box-shadow: 0 16px 34px rgba(2,6,23,0.34);
          position: relative;
          z-index: 1;
        }

        .admin-dept-page .admin-dept-table thead th {
          background: #1E293B !important;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-size: 0.74rem;
          font-weight: 800;
          border-bottom: 1px solid #334155;
        }

        .admin-dept-page .admin-dept-table tbody tr {
          transition: all 0.22s ease;
        }

        .admin-dept-page .admin-dept-table tbody tr td {
          background: #334155 !important;
          border-top: 1px solid #475569;
          border-bottom: 1px solid #475569;
          color: #E2E8F0 !important;
          transition: background-color 0.22s ease, transform 0.22s ease;
        }

        .admin-dept-page .admin-dept-table tbody tr:nth-child(odd) td {
          background: #3F4A5C !important;
        }

        .admin-dept-page .admin-dept-table tbody tr:nth-child(even) td {
          background: #384556 !important;
        }

        .admin-dept-page .admin-dept-table tbody tr td:first-child {
          border-left: 3px solid transparent;
        }

        .admin-dept-page .admin-dept-table tbody tr:hover td {
          background: #1E293B !important;
        }

        .admin-dept-page .admin-dept-table tbody tr:hover td:first-child {
          border-left-color: rgba(96,165,250,0.7);
        }

        .admin-dept-page .admin-dept-table tbody tr td span,
        .admin-dept-page .admin-dept-table tbody tr td div {
          color: inherit;
        }

        .admin-action-edit {
          color: #60A5FA !important;
        }
        .admin-action-edit:hover {
          color: #93C5FD !important;
        }

        .admin-action-delete {
          color: #F87171 !important;
        }
        .admin-action-delete:hover {
          color: #FCA5A5 !important;
        }

        .dept-type-badge {
          color: #fff !important;
          border-width: 1px;
          border-style: solid;
          font-weight: 700;
          letter-spacing: 0.01em;
          background-image: none !important;
          box-shadow: none !important;
        }

        .dept-type-support {
          background: #334155 !important;
          border-color: #64748B !important;
        }

        .dept-type-academic {
          background: #1E3A8A !important;
          border-color: #3B82F6 !important;
        }

        .admin-dept-modal :global(.modal-content) {
          background: linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(30,41,59,0.98) 100%);
          border: 1px solid rgba(148,163,184,0.2);
          border-radius: 24px;
          color: #E2E8F0;
          box-shadow: 0 20px 44px rgba(2,6,23,0.5);
        }

        .admin-dept-modal :global(.btn-close) {
          filter: invert(1) brightness(2);
        }

        .dept-form-input {
          background: rgba(15,23,42,0.78) !important;
          border: 1px solid rgba(148,163,184,0.24) !important;
          color: #F8FAFC !important;
        }

        .dept-form-input::placeholder {
          color: #94A3B8;
        }

        .dept-form-input:focus {
          border-color: rgba(96,165,250,0.52) !important;
          box-shadow: 0 0 0 0.2rem rgba(59,130,246,0.18) !important;
        }

        .admin-dept-page .admin-dept-table tr { transition: all 0.2s ease; }
        .admin-dept-page .admin-dept-table tr:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 18px rgba(2,6,23,0.24);
        }
        .x-small { font-size: 0.75rem; }
        .transition-all { transition: all 0.2s ease; }

        .dept-mobile-list {
          display: grid;
          gap: 0.85rem;
        }

        .dept-mobile-card {
          border: 1px solid rgba(148,163,184,0.18);
          background: linear-gradient(180deg, rgba(15,23,42,0.72) 0%, rgba(30,41,59,0.72) 100%);
          border-radius: 16px;
          padding: 0.9rem;
          box-shadow: 0 10px 24px rgba(2,6,23,0.28);
        }

        .dept-mobile-line {
          display: flex;
          justify-content: space-between;
          gap: 0.75rem;
          padding: 0.25rem 0;
          border-bottom: 1px dashed rgba(148,163,184,0.2);
        }

        .dept-mobile-line:last-of-type {
          border-bottom: 0;
        }

        .dept-mobile-line span {
          color: #94A3B8;
          font-size: 0.78rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 700;
        }

        .dept-mobile-line strong {
          color: #E2E8F0;
          font-size: 0.86rem;
          text-align: right;
          font-weight: 700;
        }

        @media (max-width: 991px) {
          .admin-dept-header {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 1rem;
          }

          .admin-dept-add-btn {
            width: 100%;
          }
        }

        @media (max-width: 576px) {
          .admin-dept-page {
            padding: 1rem !important;
          }

          .admin-dept-header {
            padding: 1rem;
            border-radius: 18px;
          }

          .admin-academic-banner {
            padding: 0.8rem 0.9rem;
            border-radius: 14px;
          }
        }
      `}</style>
    </AdminLayout>
  );
}