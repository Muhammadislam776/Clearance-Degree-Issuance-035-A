"use client";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ExaminerLayout from "@/components/layout/ExaminerLayout";
import { Card, Table, Button } from "react-bootstrap";
import { supabase } from "@/lib/supabaseClient";

export default function PendingClearance() {
  const { id } = useParams();
  const [request, setRequest] = useState(null);
  const [student, setStudent] = useState(null);

  const [departmentStatuses, setDepartmentStatuses] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      // 1. Fetch Clearance Request
      const { data: clearance } = await supabase
        .from("clearance_requests")
        .select(`
          *,
          students (*)
        `)
        .eq("id", id)
        .single();
        
      if (!clearance) return;
      setRequest(clearance);
      setStudent(clearance.students);

      // 2. Fetch Department-wise progress
      const { data: statuses } = await supabase
        .from("clearance_status")
        .select("status, departments (name)")
        .eq("request_id", id);
      
      setDepartmentStatuses(statuses || []);
    };
    fetchData();
  }, [id]);

  const approveDegree = async () => {
    try {
      const { data, error } = await supabase
        .from("clearance_requests")
        .update({ 
          degree_issued: true,
          overall_status: 'completed',
          completion_date: new Date().toISOString()
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      
      setRequest(data);
      alert("Clearance Finalized & Degree Issued! 🎓");
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  if (!request || !student) return <p>Loading...</p>;

  return (
    <ExaminerLayout>
      <h2 className="mb-4">Pending Clearance Review</h2>

      <Card className="shadow hover-card p-4 mb-4">
        <h5>Student Info</h5>
        <Table striped bordered hover responsive>
          <tbody>
            <tr><td>Name</td><td>{student.name}</td></tr>
            <tr><td>Email</td><td>{student.email}</td></tr>
            <tr><td>Roll Number</td><td>{student.roll_number}</td></tr>
            <tr><td>Department</td><td>{student.department}</td></tr>
            <tr><td>Overall Status</td><td><Badge bg={request.overall_status === 'completed' ? 'success' : 'warning'}>{request.overall_status}</Badge></td></tr>
          </tbody>
        </Table>
      </Card>

      <Card className="shadow hover-card p-4 mb-4">
        <h5>Departmental Progress</h5>
        <Table size="sm" responsive>
          <thead>
            <tr><th>Department</th><th>Status</th></tr>
          </thead>
          <tbody>
            {departmentStatuses.map((s, idx) => (
              <tr key={idx}>
                <td>{s.departments?.name}</td>
                <td><Badge bg={s.status === 'approved' ? 'success' : 'secondary'}>{s.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      {!request.degree_issued && (
        <Button variant="success" onClick={approveDegree}>Issue Degree</Button>
      )}
      {request.degree_issued && <p className="text-success">Degree Already Issued ✅</p>}
    </ExaminerLayout>
  );
}