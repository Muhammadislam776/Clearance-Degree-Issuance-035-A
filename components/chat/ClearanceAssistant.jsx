"use client";
import React, { useState, useEffect, useRef } from "react";
import { Card, Form, Button, Spinner } from "react-bootstrap";
import { getBotResponse } from "@/lib/chatbotService";

export default function ClearanceAssistant({ currentUserId }) {
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      sender: "bot",
      message: "Hello! I am your AI Clearance Assistant. How can I help you today?",
      created_at: new Date().toISOString()
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg = {
      id: Date.now().toString(),
      sender: "user",
      message: inputText,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    setIsTyping(true);

    try {
      const response = await getBotResponse(inputText);
      const botMsg = {
        id: (Date.now() + 1).toString(),
        sender: "bot",
        message: response,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
       console.error("AI Response error:", error);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <Card className="h-100 shadow-sm border-0" style={{ borderRadius: "16px", background: "rgba(255, 255, 255, 0.9)", backdropFilter: "blur(10px)" }}>
      <Card.Header className="border-0 bg-transparent py-3">
        <div className="d-flex align-items-center gap-3">
          <div style={{ padding: "10px", backgroundColor: "#667eea", borderRadius: "12px", color: "white" }}>
             🤖
          </div>
          <div>
            <h5 className="mb-0 fw-bold">AI Clearance Assistant</h5>
            <small className="text-muted">Instant answers to your queries</small>
          </div>
        </div>
      </Card.Header>

      <Card.Body className="d-flex flex-column p-0">
        <div className="p-3" style={{ flex: 1, overflowY: "auto", minHeight: "300px" }}>
          {messages.map((msg) => (
            <div key={msg.id} className={`d-flex mb-3 ${msg.sender === "user" ? "justify-content-end" : "justify-content-start"}`}>
              <div style={{
                maxWidth: "80%",
                padding: "12px 16px",
                borderRadius: "18px",
                backgroundColor: msg.sender === "user" ? "#667eea" : "#f0f2f5",
                color: msg.sender === "user" ? "white" : "#333",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                borderBottomRightRadius: msg.sender === "user" ? "2px" : "18px",
                borderBottomLeftRadius: msg.sender === "bot" ? "2px" : "18px"
              }}>
                {msg.message}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="d-flex justify-content-start mb-3">
              <div className="p-2 px-3 rounded-pill bg-light text-muted small">
                <Spinner animation="grow" size="sm" className="me-1" /> assistant is thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-3 bg-white border-top rounded-top" style={{ borderTop: "1px solid #eee" }}>
          <Form onSubmit={handleSendMessage} className="d-flex gap-2">
            <Form.Control
              type="text"
              placeholder="Ask about timing, documents, etc..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              style={{ borderRadius: "12px", padding: "12px", border: "1px solid #eee", backgroundColor: "#f9f9f9" }}
            />
            <Button type="submit" className="px-4" style={{ borderRadius: "12px", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", border: "none" }}>
              Ask
            </Button>
          </Form>
        </div>
      </Card.Body>
    </Card>
  );
}
