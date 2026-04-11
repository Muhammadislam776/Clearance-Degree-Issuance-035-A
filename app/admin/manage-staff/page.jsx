"use client";
import React, { useState, useEffect } from "react";
import { Container, Table, Button, Modal, Form, Row, Col, Card, Badge } from "react-bootstrap";
import AdminLayout from "@/components/layout/AdminLayout";
import { supabase } from "@/lib/supabaseClient";

export default function ManageStaff() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from("users")
        .select("*")
        .in("role", ["department", "examiner"]);
      setStaff(data || []);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("Error fetching staff:", error?.message || error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (staffMember) => {
    setSelectedStaff(staffMember);
    setFormData(staffMember);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this staff member?")) {
      try {
        await supabase.from("users").delete().eq("id", id);
        fetchStaff();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn("Error deleting staff:", error?.message || error);
      }
    }
  };

  const handleSave = async () => {
    try {
      if (selectedStaff) {
        await supabase.from("users").update(formData).eq("id", selectedStaff.id);
      }
      setShowModal(false);
      fetchStaff();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("Error saving staff:", error?.message || error);
    }
  };

  if (loading) return <AdminLayout><div className="text-center py-5"><p>Loading staff...</p></div></AdminLayout>;

  return (
    <AdminLayout>
      <Container fluid className="py-5">
        <div className="d-flex justify-content-between align-items-center mb-5">
          <div>
            <h2 className="fw-bold mb-2">Manage Staff</h2>
            <p className="text-muted">Manage department and examination staff</p>
          </div>
          <Button 
            variant="primary" 
            className="px-4 py-2 fs-6"
            style={{
              boxShadow: "0 4px 15px rgba(13, 110, 253, 0.3)",
              transition: "all 0.3s ease"
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-3px)";
              e.target.style.boxShadow = "0 6px 20px rgba(13, 110, 253, 0.5)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "0 4px 15px rgba(13, 110, 253, 0.3)";
            }}
          >
            + Add Staff
          </Button>
        </div>

        <Row className="mb-4">
          <Col md={4}>
            <Card className="text-center shadow-sm" style={{ borderLeft: "4px solid #0d6efd", borderRadius: "10px" }}>
              <Card.Body>
                <h3 className="fw-bold text-primary mb-2">{staff.length}</h3>
                <p className="text-muted mb-0">Total Staff</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="text-center shadow-sm" style={{ borderLeft: "4px solid #198754", borderRadius: "10px" }}>
              <Card.Body>
                <h3 className="fw-bold text-success mb-2">{staff.filter(s => s.role === "department").length}</h3>
                <p className="text-muted mb-0">Department</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="text-center shadow-sm" style={{ borderLeft: "4px solid #ffc107", borderRadius: "10px" }}>
              <Card.Body>
                <h3 className="fw-bold text-warning mb-2">{staff.filter(s => s.role === "examiner").length}</h3>
                <p className="text-muted mb-0">Examiners</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Card className="shadow-sm border-0">
          <Card.Body className="p-4">
            <div style={{ overflowX: "auto" }}>
              <Table hover responsive className="mb-0">
                <thead className="bg-light">
                  <tr>
                    <th className="fw-bold text-muted">Name</th>
                    <th className="fw-bold text-muted">Email</th>
                    <th className="fw-bold text-muted">Role</th>
                    <th className="fw-bold text-muted">Department</th>
                    <th className="fw-bold text-muted">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-5 text-muted">
                        No staff found
                      </td>
                    </tr>
                  ) : (
                    staff.map((member) => (
                      <tr key={member.id} style={{ transition: "background-color 0.2s ease" }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f8f9fa"}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}>
                        <td className="fw-500">{member.name}</td>
                        <td className="text-primary">{member.email}</td>
                        <td>
                          <Badge bg={member.role === "department" ? "info" : "warning"}>
                            {member.role}
                          </Badge>
                        </td>
                        <td>{member.department || "-"}</td>
                        <td>
                          <Button 
                            size="sm" 
                            variant="outline-primary" 
                            className="me-2"
                            onClick={() => handleEdit(member)}
                          >
                            Edit
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline-danger"
                            onClick={() => handleDelete(member.id)}
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
          </Card.Body>
        </Card>

        <Modal show={showModal} onHide={() => setShowModal(false)} centered>
          <Modal.Header closeButton className="border-0">
            <Modal.Title className="fw-bold">Edit Staff</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Full Name</Form.Label>
                <Form.Control
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Email</Form.Label>
                <Form.Control
                  value={formData.email || ""}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Role</Form.Label>
                <Form.Select
                  value={formData.role || ""}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option>Select Role</option>
                  <option value="department">Department</option>
                  <option value="examiner">Examiner</option>
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Department</Form.Label>
                <Form.Control
                  value={formData.department || ""}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                />
              </Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer className="border-0">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSave}>Save Changes</Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </AdminLayout>
  );
}
