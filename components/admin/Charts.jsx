"use client";
import React from "react";
import { PieChart, Pie, Cell, Tooltip as PieTooltip, BarChart, Bar, XAxis, YAxis, Tooltip as BarTooltip, ResponsiveContainer } from "recharts";
import { Card, Row, Col } from "react-bootstrap";

export default function Charts({ stats }) {
  const pieData = [
    { name: "Approved", value: stats?.approved || 0 },
    { name: "Pending", value: stats?.pending || 0 },
    { name: "Rejected", value: stats?.rejected || 0 },
  ];

  // We add total clearance volume vs active if you want a second bar chart
  const barData = [
    { name: "Approved", value: stats?.approved || 0 },
    { name: "Pending", value: stats?.pending || 0 },
    { name: "Rejected", value: stats?.rejected || 0 },
  ];

  const COLORS = ["#10B981", "#F59E0B", "#EF4444"];

  return (
    <Row className="mt-4 g-4">
      <Col md={6}>
        <Card className="border-0 shadow-sm rounded-4 p-4 h-100">
          <h5 className="fw-bold mb-4">Request Distribution</h5>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie 
                  data={pieData} 
                  dataKey="value" 
                  nameKey="name" 
                  cx="50%" 
                  cy="50%" 
                  outerRadius={100} 
                  label 
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <PieTooltip 
                  contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </Col>

      <Col md={6}>
        <Card className="border-0 shadow-sm rounded-4 p-4 h-100">
          <h5 className="fw-bold mb-4">Pipeline Overview</h5>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <BarTooltip 
                  cursor={{ fill: "transparent" }}
                  contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </Col>
    </Row>
  );
}
