import React from "react";
import { Row, Col, Card, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const data = [
  { name: "Jan", completed: 40, pending: 24, rejected: 8 },
  { name: "Feb", completed: 30, pending: 13, rejected: 5 },
  { name: "Mar", completed: 20, pending: 9, rejected: 2 },
  { name: "Apr", completed: 27, pending: 39, rejected: 7 },
  { name: "May", completed: 18, pending: 48, rejected: 3 },
  { name: "Jun", completed: 23, pending: 38, rejected: 5 }
];

export default function AnalyticsChart() {
  return (
    <div>
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center shadow-sm border-0" style={{ borderLeft: "4px solid #198754" }}>
            <Card.Body>
              <h3 className="fw-bold text-success mb-2">248</h3>
              <p className="text-muted mb-0">Completed</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center shadow-sm border-0" style={{ borderLeft: "4px solid #ffc107" }}>
            <Card.Body>
              <h3 className="fw-bold text-warning mb-2">156</h3>
              <p className="text-muted mb-0">Pending</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center shadow-sm border-0" style={{ borderLeft: "4px solid #dc3545" }}>
            <Card.Body>
              <h3 className="fw-bold text-danger mb-2">34</h3>
              <p className="text-muted mb-0">Rejected</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center shadow-sm border-0" style={{ borderLeft: "4px solid #0d6efd" }}>
            <Card.Body>
              <h3 className="fw-bold text-primary mb-2">438</h3>
              <p className="text-muted mb-0">Total</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="shadow-sm border-0 mb-4">
        <Card.Header className="bg-light border-0 p-4">
          <h5 className="fw-bold mb-0">Clearance Status Trend</h5>
        </Card.Header>
        <Card.Body className="p-4">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "#f8f9fa", 
                  border: "1px solid #dee2e6",
                  borderRadius: "8px"
                }}
              />
              <Legend />
              <Bar dataKey="completed" fill="#198754" name="Completed" radius={[8, 8, 0, 0]} />
              <Bar dataKey="pending" fill="#ffc107" name="Pending" radius={[8, 8, 0, 0]} />
              <Bar dataKey="rejected" fill="#dc3545" name="Rejected" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card.Body>
      </Card>
    </div>
  );
}
