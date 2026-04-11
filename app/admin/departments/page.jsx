"use client";
import React, { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, Table, Button, Modal, Form } from "react-bootstrap";
import { supabase } from "@/lib/supabaseClient";

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newDept, setNewDept] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    const { data } = await supabase.from("departments").select("*").order("name");
    setDepartments(data || []);
  };

  const makeCodeFromName = (name) => {
    const trimmed = String(name || "").trim();
    if (!trimmed) return "";
    const parts = trimmed.split(/\s+/).filter(Boolean);
    const code = (parts.length === 1 ? parts[0].slice(0, 4) : parts.map((p) => p[0]).join(""))
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    return code || "DEPT";
  };

  const nextAvailableCode = (base, existingCodes) => {
    const taken = new Set((existingCodes || []).map((c) => String(c || "").toUpperCase()));
    if (!taken.has(base)) return base;
    for (let i = 2; i < 1000; i++) {
      const candidate = `${base}${i}`;
      if (!taken.has(candidate)) return candidate;
    }
    return `${base}${Date.now().toString().slice(-4)}`;
  };

  const addDepartment = async () => {
    const trimmed = String(newDept || "").trim();
    if (!trimmed) return;

    setSaving(true);
    setError("");
    try {
      // Attempt 1: Try with code + is_active (full schema).
      const base = makeCodeFromName(trimmed);
      const code = nextAvailableCode(base, departments.map((d) => d.code || ""));

      let insertError = null;
      let inserted = await supabase
        .from("departments")
        .insert([{ name: trimmed, code, is_active: true }]);
      insertError = inserted?.error ?? null;

      // Attempt 2: Try without is_active.
      if (insertError) {
        const msg = String(insertError?.message || "").toLowerCase();
        if (msg.includes("is_active") && msg.includes("does not exist")) {
          inserted = await supabase.from("departments").insert([{ name: trimmed, code }]);
          insertError = inserted?.error ?? null;
        }
      }

      // Attempt 3: Try name only.
      if (insertError) {
        const msg = String(insertError?.message || "").toLowerCase();
        if ((msg.includes("code") && msg.includes("does not exist")) || msg.includes("column")) {
          inserted = await supabase.from("departments").insert([{ name: trimmed }]);
          insertError = inserted?.error ?? null;
        }
      }

      if (insertError) throw insertError;

      setShowModal(false);
      setNewDept("");
      fetchDepartments();
    } catch (e) {
      setError(e?.message || "Failed to add department");
    } finally {
      setSaving(false);
    }
  };

  const deleteDepartment = async (id) => {
    if (!confirm("Are you sure to delete this department?")) return;
    await supabase.from("departments").delete().eq("id", id);
    fetchDepartments();
  };

  return (
    <AdminLayout>
      <h2 className="mb-4">Manage Departments</h2>
      <Button className="mb-3" onClick={() => setShowModal(true)}>Add Department</Button>
      {error ? <div className="alert alert-danger">{error}</div> : null}
      <Card className="shadow hover-card p-4">
        <Table striped bordered hover responsive>
          <thead>
            <tr><th>Name</th><th>Code</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {departments.map(d => (
              <tr key={d.id}>
                <td>{d.name}</td>
                <td>{d.code}</td>
                <td>
                  <Button variant="danger" size="sm" onClick={() => deleteDepartment(d.id)}>Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      {/* Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton><Modal.Title>Add Department</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Label>Department Name</Form.Label>
              <Form.Control
                type="text"
                value={newDept}
                onChange={e => setNewDept(e.target.value)}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={addDepartment} disabled={saving}>
            {saving ? "Adding..." : "Add"}
          </Button>
        </Modal.Footer>
      </Modal>
    </AdminLayout>
  );
}