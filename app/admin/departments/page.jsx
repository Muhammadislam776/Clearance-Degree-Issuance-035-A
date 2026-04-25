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
      <div className="p-4" style={{ background: "#f8f9fa", minHeight: "100vh" }}>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="fw-bold mb-1">Manage Departments</h2>
            <p className="text-muted">Configure institutional departments, contact persons, and the single academic final-authority department</p>
          </div>
          <Button 
            className="rounded-pill px-4 border-0 shadow-sm" 
            style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
            onClick={openCreateModal}
          >
            + Add New Department
          </Button>
        </div>

        {error ? <div className="alert alert-danger rounded-4 border-0 shadow-sm mb-4">{error}</div> : null}

        {departments.some((d) => d.is_academic) ? (
          <div className="alert alert-info rounded-4 border-0 shadow-sm mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
              <strong>Academic Department:</strong> {departments.find((d) => d.is_academic)?.name || "Set"}
            </div>
            <div className="text-muted small">Only one department can be marked as academic at a time.</div>
          </div>
        ) : null}

        <Card className="border-0 shadow-sm overflow-hidden" style={{ borderRadius: "24px" }}>
          <Table responsive hover className="mb-0 custom-table">
            <thead className="bg-light">
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
                <tr><td colSpan="5" className="text-center py-5 text-muted">No departments found. Add one to get started.</td></tr>
              ) : (
                departments.map(d => (
                  <tr key={d.id} className="align-middle transition-all">
                    <td className="px-4 py-3">
                      <div className="d-flex align-items-center gap-3">
                        <div className="dept-icon" style={{ width: "40px", height: "40px", borderRadius: "12px", background: d.is_academic ? "#e0e7ff" : "#f1f3f5", color: d.is_academic ? "#4338ca" : "#495057", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
                          {d.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="fw-bold">{d.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="small fw-medium text-dark">📞 {d.whatsapp_number || d.contact || "-"}</div>
                      <div className="text-muted x-small">✉️ {d.email || "-"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-muted small">{d.focal_person || "Not Assigned"}</span>
                    </td>
                    <td className="px-4 py-3">
                      {d.is_academic ? (
                        <Badge bg="primary" className="rounded-pill px-3 py-2" style={{ background: "rgba(102, 126, 234, 0.1)", color: "#667eea", border: "1px solid rgba(102, 126, 234, 0.2)" }}>🎓 Academic</Badge>
                      ) : (
                        <Badge bg="light" className="text-dark rounded-pill px-3 py-2 border">🏢 Support</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-end">
                      <Button 
                        variant="link"
                        className="text-primary p-0 text-decoration-none fw-bold me-3"
                        onClick={() => openEditModal(d)}
                      >
                        Edit
                      </Button>
                      <Button 
                        variant="link" 
                        className="text-danger p-0 text-decoration-none fw-bold"
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
        </Card>
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold">{editingDeptId ? "Edit Department" : "Add Department"}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Form>
            <Form.Group className="mb-4">
              <Form.Label className="small fw-bold text-muted text-uppercase">Department Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g. Accounts Department"
                className="py-3 rounded-4 border-light bg-light"
                value={deptForm.name}
                onChange={e => setDeptForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </Form.Group>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-4">
                  <Form.Label className="small fw-bold text-muted text-uppercase">Contact (Phone/WhatsApp)</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="0312-XXXXXXX"
                    className="py-3 rounded-4 border-light bg-light"
                    value={deptForm.phone}
                    onChange={e => setDeptForm(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-4">
                  <Form.Label className="small fw-bold text-muted text-uppercase">Focal Person</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Name"
                    className="py-3 rounded-4 border-light bg-light"
                    value={deptForm.focalPerson}
                    onChange={e => setDeptForm(prev => ({ ...prev, focalPerson: e.target.value }))}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-4">
              <Form.Label className="small fw-bold text-muted text-uppercase">Department Email</Form.Label>
              <Form.Control
                type="email"
                placeholder="department@example.com"
                className="py-3 rounded-4 border-light bg-light"
                value={deptForm.email}
                onChange={e => setDeptForm(prev => ({ ...prev, email: e.target.value }))}
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Check
                type="checkbox"
                id="academic-department-check"
                label="Mark as Academic Final Authority"
                checked={deptForm.isAcademic}
                onChange={(e) => setDeptForm(prev => ({ ...prev, isAcademic: e.target.checked }))}
              />
              <div className="text-muted small mt-2">
                This should be enabled for only one department. Selecting this will unmark the current academic department.
              </div>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer className="border-0 p-4 pt-0">
          <Button variant="light" className="rounded-pill px-4 py-2" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button 
            variant="primary" 
            className="rounded-pill px-5 py-2 border-0 shadow-sm" 
            style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
            onClick={saveDepartment} 
            disabled={saving}
          >
            {saving ? "Saving..." : editingDeptId ? "Update Department" : "Create Department"}
          </Button>
        </Modal.Footer>
      </Modal>

      <style jsx>{`
        .custom-table tr { transition: all 0.2s ease; border-bottom: 1px solid #f1f3f5; }
        .custom-table tr:hover { background-color: #f8f9ff !important; transform: scale(1.002); }
        .x-small { font-size: 0.75rem; }
        .transition-all { transition: all 0.2s ease; }
      `}</style>
    </AdminLayout>
  );
}