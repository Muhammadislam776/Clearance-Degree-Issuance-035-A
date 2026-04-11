"use client";
import React, { useState } from "react";
import { Container, Row, Col, Card, Form, Button, Alert } from "react-bootstrap";
import StudentLayout from "@/components/layout/StudentLayout";
import { useAuth } from "@/lib/useAuth";

export default function ProfilePage() {
  const { profile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [formData, setFormData] = useState({
    name: profile?.name || "",
    email: profile?.email || "",
    roll_number: profile?.roll_number || "",
    department: profile?.department || "",
    phone: profile?.phone || "",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      // TODO: Implement profile update API call
      setMessage({ type: "success", text: "Profile updated successfully!" });
      setIsEditing(false);
      setTimeout(() => setMessage(""), 5000);
    } catch (error) {
      setMessage({ type: "danger", text: "Error updating profile. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <StudentLayout>
      <Container fluid style={{ padding: "20px" }}>
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", padding: "30px", borderRadius: "12px", marginBottom: "30px", color: "white" }}>
          <h1 className="fw-bold mb-2">👤 Student Profile</h1>
          <p>Manage your profile information</p>
        </div>

        {message && (
          <Alert variant={message.type} dismissible onClose={() => setMessage("")} className="mb-4">
            {message.text}
          </Alert>
        )}

        <Row>
          <Col lg={8}>
            <Card style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.1)", borderRadius: "12px" }}>
              <Card.Body style={{ padding: "30px" }}>
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h4 className="fw-bold mb-0">Personal Information</h4>
                  <Button
                    variant={isEditing ? "secondary" : "primary"}
                    onClick={() => setIsEditing(!isEditing)}
                    style={{ background: isEditing ? "#999" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", border: "none" }}
                  >
                    {isEditing ? "Cancel" : "Edit Profile"}
                  </Button>
                </div>

                <Form onSubmit={handleSaveProfile}>
                  <Form.Group className="mb-4">
                    <Form.Label className="fw-bold">Full Name</Form.Label>
                    <Form.Control
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      style={{ backgroundColor: !isEditing ? "#f5f5f5" : "white" }}
                    />
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label className="fw-bold">Email Address</Form.Label>
                    <Form.Control
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      style={{ backgroundColor: !isEditing ? "#f5f5f5" : "white" }}
                    />
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label className="fw-bold">Roll Number</Form.Label>
                    <Form.Control
                      type="text"
                      name="roll_number"
                      value={formData.roll_number}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      style={{ backgroundColor: !isEditing ? "#f5f5f5" : "white" }}
                    />
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label className="fw-bold">Department</Form.Label>
                    <Form.Control
                      type="text"
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      style={{ backgroundColor: !isEditing ? "#f5f5f5" : "white" }}
                    />
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label className="fw-bold">Phone Number</Form.Label>
                    <Form.Control
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="Enter your phone number"
                      disabled={!isEditing}
                      style={{ backgroundColor: !isEditing ? "#f5f5f5" : "white" }}
                    />
                  </Form.Group>

                  {isEditing && (
                    <Button
                      variant="success"
                      type="submit"
                      disabled={loading}
                      className="w-100 fw-bold mt-4"
                    >
                      {loading ? "Saving..." : "Save Changes"}
                    </Button>
                  )}
                </Form>
              </Card.Body>
            </Card>
          </Col>

          {/* Profile Summary */}
          <Col lg={4}>
            <Card style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.1)", borderRadius: "12px", marginBottom: "20px" }}>
              <Card.Body className="text-center">
                <div style={{ fontSize: "3rem", marginBottom: "10px" }}>👤</div>
                <h5 className="fw-bold">{profile?.name}</h5>
                <p className="text-muted small">{profile?.email}</p>
              </Card.Body>
            </Card>

            <Card style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.1)", borderRadius: "12px" }}>
              <Card.Header className="bg-light fw-bold">Account Status</Card.Header>
              <Card.Body>
                <p><strong>Status:</strong> <span style={{ color: "#198754", fontWeight: "bold" }}>✓ Active</span></p>
                <p><strong>Role:</strong> Student</p>
                <p><strong>Joined:</strong> April 4, 2026</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </StudentLayout>
  );
}