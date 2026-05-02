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
    <>
      <style jsx global>{`
        .ai-dark-card {
          background-color: #0f172a !important;
          color: #f8fafc !important;
        }
        .ai-dark-input {
          background-color: #1e293b !important;
          color: #f8fafc !important;
          border-color: rgba(255,255,255,0.1) !important;
        }
        .ai-dark-input::placeholder {
          color: #64748b !important;
        }
        .ai-dark-input:focus {
          background-color: #0f172a !important;
          border-color: #3b82f6 !important;
          color: #f8fafc !important;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2) !important;
        }
        .ai-send-btn {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .ai-send-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(124, 58, 237, 0.4) !important;
        }
      `}</style>
      <Card className="h-100 shadow-sm border-0 ai-dark-card" style={{ borderRadius: "16px", backdropFilter: "blur(10px)" }}>
        <Card.Header className="border-0 bg-transparent py-3">
        <div className="d-flex align-items-center gap-3">
          <div style={{ padding: "10px", backgroundColor: "#3b82f6", borderRadius: "12px", color: "white" }}>
             🤖
          </div>
          <div>
            <h5 className="mb-0 fw-bold text-white">AI Clearance Assistant</h5>
            <small style={{ color: "#94a3b8" }}>Intelligent clearance guidance</small>
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
                backgroundColor: msg.sender === "user" ? "#3b82f6" : "#1e293b",
                color: "#f8fafc",
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                borderBottomRightRadius: msg.sender === "user" ? "2px" : "18px",
                borderBottomLeftRadius: msg.sender === "bot" ? "2px" : "18px",
                lineHeight: "1.5"
              }}>
                {msg.message}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="d-flex justify-content-start mb-3">
              <div className="p-2 px-3 rounded-pill small" style={{ backgroundColor: "#1e293b", color: "#94a3b8" }}>
                <Spinner animation="grow" size="sm" className="me-1" style={{ color: "#3b82f6" }} /> AI is thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-3 border-top" style={{ borderColor: "rgba(255,255,255,0.1) !important" }}>
          <Form onSubmit={handleSendMessage} className="d-flex gap-2">
            <Form.Control
              type="text"
              placeholder="Ask about timing, documents, clearance..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="ai-dark-input"
              style={{ borderRadius: "12px", padding: "12px" }}
            />
            <Button type="submit" className="px-4 ai-send-btn" style={{ borderRadius: "12px", background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)", border: "none", fontWeight: "600" }}>
              Send
            </Button>
          </Form>
        </div>
      </Card.Body>
    </Card>
    </>
  );
}
