"use client";
import React, { useState, useEffect } from "react";
import { Container, Table, Button, Modal, Form, Row, Col, Card, ProgressBar, Badge } from "react-bootstrap";
import AdminLayout from "@/components/layout/AdminLayout";
import { supabase } from "@/lib/supabaseClient";
// import "../../styles/dashboard.css"; // Removed incorrect CSS import

export default function ManageStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [formData, setFormData] = useState({});
  const [error, setError] = useState("");

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError("");

      // Use student_profiles as the source of truth for student roll numbers + departments.
      const { data, error: fetchError } = await supabase
        .from("student_profiles")
        .select(
          `
          id,
          roll_number,
          user_id,
          department:departments ( id, name ),
          user:users ( id, name, email, status )
        `
        )
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      const normalized = (data || []).map((row) => ({
        id: row.user_id,
        profile_id: row.id,
        name: row.user?.name || "",
        email: row.user?.email || "",
        status: row.user?.status || "active",
        roll_number: row.roll_number,
        department_id: row.department?.id || null,
        department: row.department?.name || "",
      }));

      setStudents(normalized);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("Error fetching students:", error?.message || error);
      setError(error?.message || "Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (student) => {
    setSelectedStudent(student);
    setFormData(student);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this student?")) {
      try {
        // NOTE: This only deletes the public profile row. The Supabase Auth user still exists.
        await supabase.from("users").delete().eq("id", id);
        fetchStudents();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn("Error deleting student:", error?.message || error);
        setError(error?.message || "Failed to delete student");
      }
    }
  };

  const handleSave = async () => {
    try {
      if (selectedStudent) {
        setError("");

        const trimmedDepartment = String(formData.department || "").trim();
        let departmentId = formData.department_id || null;

        if (trimmedDepartment) {
          const { data: dept, error: deptError } = await supabase
            .from("departments")
            .select("id, name")
            .eq("name", trimmedDepartment)
            .maybeSingle();

          if (deptError) throw deptError;
          if (!dept?.id) throw new Error(`Department '${trimmedDepartment}' not found.`);
          departmentId = dept.id;
        }

        const { error: userError } = await supabase
          .from("users")
          .update({
            name: formData.name,
            email: formData.email,
            status: formData.status,
            department_id: departmentId,
          })
          .eq("id", selectedStudent.id);

        if (userError) throw userError;

        const { error: spError } = await supabase
          .from("student_profiles")
          .update({
            roll_number: formData.roll_number,
            department_id: departmentId,
          })
          .eq("user_id", selectedStudent.id);

        if (spError) throw spError;
      }
      setShowModal(false);
      fetchStudents();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("Error saving student:", error?.message || error);
      setError(error?.message || "Failed to save student");
    }
  };

  if (loading) return <AdminLayout><div className="text-center py-5"><p>Loading students...</p></div></AdminLayout>;

  return (
    <AdminLayout>
      <Container fluid className="py-5">
        <div className="d-flex justify-content-between align-items-center mb-5">
          <div>
            <h2 className="fw-bold mb-2">Manage Students</h2>
            <p className="text-muted">View and manage all enrolled students</p>
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
            + Add Student
          </Button>
        </div>

        {error ? (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        ) : null}

        <Row className="mb-4">
          <Col md={3}>
            <Card className="text-center shadow-sm" style={{ borderLeft: "4px solid #0d6efd", borderRadius: "10px" }}>
              <Card.Body>
                <h3 className="fw-bold text-primary mb-2">{students.length}</h3>
                <p className="text-muted mb-0">Total Students</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center shadow-sm" style={{ borderLeft: "4px solid #198754", borderRadius: "10px" }}>
              <Card.Body>
                <h3 className="fw-bold text-success mb-2">{students.filter(s => s.status === "active").length}</h3>
                <p className="text-muted mb-0">Active</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center shadow-sm" style={{ borderLeft: "4px solid #ffc107", borderRadius: "10px" }}>
              <Card.Body>
                <h3 className="fw-bold text-warning mb-2">{students.filter(s => s.status === "pending").length}</h3>
                <p className="text-muted mb-0">Pending</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center shadow-sm" style={{ borderLeft: "4px solid #dc3545", borderRadius: "10px" }}>
              <Card.Body>
                <h3 className="fw-bold text-danger mb-2">{students.filter(s => s.status === "inactive").length}</h3>
                <p className="text-muted mb-0">Inactive</p>
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
                    <th className="fw-bold text-muted">Student Name</th>
                    <th className="fw-bold text-muted">Roll Number</th>
                    <th className="fw-bold text-muted">Email</th>
                    <th className="fw-bold text-muted">Department</th>
                    <th className="fw-bold text-muted">Status</th>
                    <th className="fw-bold text-muted">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-5 text-muted">
                        No students found
                      </td>
                    </tr>
                  ) : (
                    students.map((student) => (
                      <tr key={student.id} style={{ transition: "background-color 0.2s ease" }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f8f9fa"}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}>
                        <td className="fw-500">{student.name}</td>
                        <td>{student.roll_number}</td>
                        <td className="text-primary">{student.email}</td>
                        <td>{student.department}</td>
                        <td>
                          <Badge bg={student.status === "active" ? "success" : student.status === "pending" ? "warning" : "danger"}>
                            {student.status}
                          </Badge>
                        </td>
                        <td>
                          <Button 
                            size="sm" 
                            variant="outline-primary" 
                            className="me-2"
                            onClick={() => handleEdit(student)}
                            style={{ transition: "all 0.2s ease" }}
                          >
                            Edit
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline-danger"
                            onClick={() => handleDelete(student.id)}
                            style={{ transition: "all 0.2s ease" }}
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
            <Modal.Title className="fw-bold">Edit Student</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Full Name</Form.Label>
                <Form.Control
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter student name"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Roll Number</Form.Label>
                <Form.Control
                  value={formData.roll_number || ""}
                  onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
                  placeholder="Enter roll number"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Email</Form.Label>
                <Form.Control
                  value={formData.email || ""}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter email"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Department</Form.Label>
                <Form.Control
                  value={formData.department || ""}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="Enter department"
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
