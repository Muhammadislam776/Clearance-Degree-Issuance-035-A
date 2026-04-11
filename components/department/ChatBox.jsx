"use client";
import React, { useState } from "react";
import { Card, InputGroup, Form, Button } from "react-bootstrap";

export default function DepartmentChatBox({ studentName, messages: initialMessages = [] }) {
  const [messages, setMessages] = useState(initialMessages.length > 0 ? initialMessages : [
    {
      id: 1,
      sender: "student",
      message: "Hi! When will I know about my clearance?",
      timestamp: new Date(Date.now() - 3600000)
    },
    {
      id: 2,
      sender: "department",
      message: "We will review and update you within 2-3 working days.",
      timestamp: new Date(Date.now() - 1800000)
    }
  ]);
  const [newMessage, setNewMessage] = useState("");

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const message = {
        id: messages.length + 1,
        sender: "department",
        message: newMessage,
        timestamp: new Date()
      };
      setMessages([...messages, message]);
      setNewMessage("");
    }
  };

  return (
    <Card className="h-100 shadow-sm border-0" style={{ borderRadius: "12px", overflow: "hidden" }}>
      <Card.Header className="bg-success text-white p-3 fw-bold d-flex align-items-center gap-2">
        <span>💭</span>
        Chat with {studentName}
      </Card.Header>
      <Card.Body className="p-3 d-flex flex-column" style={{ height: "400px" }}>
        <div className="overflow-auto flex-grow-1 mb-3" style={{ backgroundColor: "#f8f9fa", borderRadius: "8px", padding: "15px" }}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`d-flex mb-3 ${msg.sender === "department" ? "justify-content-end" : "justify-content-start"}`}
            >
              <div
                style={{
                  maxWidth: "75%",
                  padding: "10px 15px",
                  borderRadius: "12px",
                  backgroundColor: msg.sender === "department" ? "#198754" : "#e9ecef",
                  color: msg.sender === "department" ? "white" : "black",
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
            variant="success"
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
