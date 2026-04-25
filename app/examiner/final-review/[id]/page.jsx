"use client";
import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Button, ProgressBar, Badge, Table, Modal, Form } from "react-bootstrap";
import { useParams } from "next/navigation";
import ExaminerLayout from "@/components/layout/ExaminerLayout";
import { supabase } from "@/lib/supabaseClient";
import "../../../../styles/dashboard.css";

export default function FinalReview() {
  const params = useParams();
  const [student, setStudent] = useState(null);
  const [clearances, setClearances] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [params.id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch student data
      const { data: studentData } = await supabase
        .from("students")
        .select("*")
        .eq("id", params.id)
        .single();
      
      setStudent(studentData);

      // Fetch clearance statuses from all departments
      const { data: clearanceData } = await supabase
        .from("clearance_status")
        .select("*")
        .eq("student_id", params.id);
      
      setClearances(clearanceData || []);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("Error fetching data:", error?.message || error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <ExaminerLayout><div className="text-center py-5"><p>Loading...</p></div></ExaminerLayout>;
  if (!student) return <ExaminerLayout><div className="text-center py-5"><p>Student not found</p></div></ExaminerLayout>;

  const allApproved = clearances.every(c => c.status === "approved");
  const approvingPercentage = (clearances.filter(c => c.status === "approved").length / clearances.length) * 100;

  return (
    <ExaminerLayout>
      <Container fluid className="py-5">
        <div className="mb-5">
          <h2 className="fw-bold mb-2">Final Review - {student.name}</h2>
          <p className="text-muted">View department approvals and clearance status</p>
        </div>

        <Row className="mb-4">
          <Col lg={8}>
            <Card className="shadow-sm border-0 mb-4">
              <Card.Body className="p-4">
                <h5 className="fw-bold mb-4">Student Information</h5>
                <Row>
                  <Col md={6}>
                    <p className="text-muted mb-2">Student Name</p>
                    <p className="fw-bold fs-5">{student.name}</p>
                  </Col>
                  <Col md={6}>
                    <p className="text-muted mb-2">Roll Number</p>
                    <p className="fw-bold fs-5">{student.roll_number}</p>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <p className="text-muted mb-2">Email</p>
                    <p className="fw-bold text-primary">{student.email}</p>
                  </Col>
                  <Col md={6}>
                    <p className="text-muted mb-2">Department</p>
                    <p className="fw-bold fs-5">{student.department}</p>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            <Card className="shadow-sm border-0">
              <Card.Body className="p-4">
                <h5 className="fw-bold mb-4">Department Approvals</h5>
                <p className="text-muted mb-3">Clearance Status from All Departments</p>
                <ProgressBar 
                  now={approvingPercentage} 
                  className="mb-4" 
                  style={{ height: "25px" }}
                  label={`${Math.round(approvingPercentage)}%`}
                />
                
                <div style={{ overflowX: "auto" }}>
                  <Table responsive className="mb-0">
                    <thead className="bg-light">
                      <tr>
                        <th className="fw-bold">Department</th>
                        <th className="fw-bold">Status</th>
                        <th className="fw-bold">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clearances.length === 0 ? (
                        <tr>
                          <td colSpan="3" className="text-center py-4 text-muted">
                            No clearance data found
                          </td>
                        </tr>
                      ) : (
                        clearances.map((clearance) => (
                          <tr key={clearance.id}>
                            <td className="fw-500">{clearance.department_name}</td>
                            <td>
                              <Badge bg={clearance.status === "approved" ? "success" : "warning"}>
                                {clearance.status}
                              </Badge>
                            </td>
                            <td className="text-muted">{clearance.remarks || "-"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={4}>
            <Card className="shadow-sm border-0 sticky-top" style={{ top: "20px" }}>
              <Card.Body className="p-4">
                <h5 className="fw-bold mb-4">Review Status</h5>
                
                {allApproved ? (
                  <div className="alert alert-success mb-4" role="alert">
                    <strong>✓ All departments approved!</strong>
                    <p className="mb-0 mt-2">Clearance complete. Academic department will issue the degree.</p>
                  </div>
                ) : (
                  <div className="alert alert-info mb-4" role="alert">
                    <strong>⏳ Awaiting Approvals</strong>
                    <p className="mb-0 mt-2">Not all departments have approved yet. Check back later.</p>
                  </div>
                )}

                <div className="mb-4">
                  <p className="text-muted mb-2">Approval Status</p>
                  <h3 className="fw-bold text-primary mb-0">
                    {clearances.filter(c => c.status === "approved").length}/{clearances.length} Approved
                  </h3>
                </div>

                <p className="text-muted small">
                  Once all departments approve, the academic department will issue the degree certificate and the student will be notified.
                </p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </ExaminerLayout>
  );
}
