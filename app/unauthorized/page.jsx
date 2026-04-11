"use client";
import React from "react";
import { Container, Row, Col } from "react-bootstrap";
import { useRouter } from "next/navigation";

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <Container fluid className="d-flex align-items-center min-vh-100" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
      <Row className="w-100">
        <Col md={6} className="mx-auto">
          <div className="text-center text-white py-5">
            <p style={{ fontSize: "4rem", marginBottom: "1rem" }}>🚫</p>
            <h1 className="display-4 fw-bold mb-3">Access Denied</h1>
            <p className="lead mb-4">
              You don't have permission to access this resource. Your current role doesn't allow this action.
            </p>
            <div className="mt-4">
              <button
                onClick={() => router.back()}
                style={{
                  padding: "12px 30px",
                  backgroundColor: "white",
                  color: "#667eea",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "1rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  marginRight: "10px",
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = "translateY(-3px)";
                  e.target.style.boxShadow = "0 6px 20px rgba(0,0,0,0.2)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "none";
                }}
              >
                ← Go Back
              </button>
              <button
                onClick={() => router.push("/")}
                style={{
                  padding: "12px 30px",
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  color: "white",
                  border: "2px solid white",
                  borderRadius: "8px",
                  fontSize: "1rem",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "rgba(255, 255, 255, 0.3)";
                  e.target.style.transform = "translateY(-3px)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
                  e.target.style.transform = "translateY(0)";
                }}
              >
                Home
              </button>
            </div>
          </div>
        </Col>
      </Row>
    </Container>
  );
}
