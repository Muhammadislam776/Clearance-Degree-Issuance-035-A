"use client";
import React, { useState, useEffect } from "react";
import { Card, InputGroup, Form, Button, Row, Col } from "react-bootstrap";

export default function ChatBox({ studentId, departmentId, department }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "department",
      message: "Hello! Please submit your clearance documents.",
      timestamp: new Date(Date.now() - 3600000)
    },
    {
      id: 2,
      sender: "student",
      message: "Hi! I'll submit them soon. Thank you!",
      timestamp: new Date(Date.now() - 1800000)
    }
  ]);
  const [newMessage, setNewMessage] = useState("");

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const message = {
        id: messages.length + 1,
        sender: "student",
        message: newMessage,
        timestamp: new Date()
      };
      setMessages([...messages, message]);
      setNewMessage("");
    }
  };

  return (
    <Card className="h-100 shadow-sm border-0" style={{ borderRadius: "12px", overflow: "hidden" }}>
      <Card.Header className="bg-primary text-white p-3 fw-bold d-flex align-items-center gap-2">
        <span>💬</span>
        Chat with {department}
      </Card.Header>
      <Card.Body className="p-3 d-flex flex-column" style={{ height: "400px" }}>
        <div className="overflow-auto flex-grow-1 mb-3" style={{ backgroundColor: "#f8f9fa", borderRadius: "8px", padding: "15px" }}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`d-flex mb-3 ${msg.sender === "student" ? "justify-content-end" : "justify-content-start"}`}
            >
              <div
                style={{
                  maxWidth: "75%",
                  padding: "10px 15px",
                  borderRadius: "12px",
                  backgroundColor: msg.sender === "student" ? "#0d6efd" : "#e9ecef",
                  color: msg.sender === "student" ? "white" : "black",
                  wordWrap: "break-word"
                }}
              >
                <p className="mb-1">{msg.message}</p>
                <small style={{ opacity: 0.7, fontSize: "0.75rem" }}>
                  {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </small>
              </div>
            </div>
          ))}
        </div>

        <InputGroup>
          <Form.Control
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            style={{ borderRadius: "8px 0 0 8px" }}
          />
          <Button
            variant="primary"
            onClick={handleSendMessage}
            style={{
              borderRadius: "0 8px 8px 0",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            Send
          </Button>
        </InputGroup>
      </Card.Body>
    </Card>
  );
}
