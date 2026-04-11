"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Container, Row, Col, Card, Form, Button, InputGroup, Spinner } from "react-bootstrap";
import DepartmentLayout from "@/components/layout/DepartmentLayout";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/lib/supabaseClient";
import ChatBox from "@/components/chat/ChatBox";

export default function DepartmentChatPage() {
  const { user, loading: authLoading } = useAuth();

  const [threadsLoading, setThreadsLoading] = useState(true);
  const [threadsError, setThreadsError] = useState("");
  const [threads, setThreads] = useState([]);

  const [activeChatId, setActiveChatId] = useState(null);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  const activeThread = useMemo(
    () => threads.find((t) => t.id === activeChatId) || null,
    [threads, activeChatId]
  );

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) {
      setThreadsLoading(false);
      return;
    }

    const loadThreads = async () => {
      setThreadsLoading(true);
      setThreadsError("");

      // Fetch all messages where I am the receiver, to see who texted me
      const { data, error } = await supabase
        .from("messages")
        .select(`
           sender_id,
           users:sender_id (id, name, email)
        `)
        .eq("receiver_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        setThreadsError(error.message || "Failed to load chats");
        setThreads([]);
        setThreadsLoading(false);
        return;
      }

      // Aggregate unique senders
      const uniqueSendersMap = new Map();
      (data || []).forEach(msg => {
         if (msg.users && !uniqueSendersMap.has(msg.sender_id)) {
            uniqueSendersMap.set(msg.sender_id, msg.users);
         }
      });

      const uniqueSenders = Array.from(uniqueSendersMap.values());
      setThreads(uniqueSenders);
      setThreadsLoading(false);

      if (!activeChatId && uniqueSenders.length > 0) {
        setActiveChatId(uniqueSenders[0].id);
      }
    };

    loadThreads();
  }, [authLoading, user?.id]);

  return (
    <DepartmentLayout>
      <Container fluid style={{ padding: "20px" }}>
        <div
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            padding: "30px",
            borderRadius: "12px",
            marginBottom: "30px",
            color: "white",
          }}
        >
          <h1 className="fw-bold mb-2">💬 Chat</h1>
          <p className="mb-0">Message students and staff in real time</p>
        </div>

        <Row>
          <Col lg={3} className="mb-4">
            <Card style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.1)", borderRadius: "12px" }}>
              <Card.Header className="bg-light fw-bold">Conversations</Card.Header>
              <Card.Body style={{ padding: 0, maxHeight: 600, overflowY: "auto" }}>
                {threadsLoading ? (
                  <div className="p-3 text-center">
                    <Spinner animation="border" size="sm" />
                  </div>
                ) : threadsError ? (
                  <div className="p-3 text-danger">{threadsError}</div>
                ) : threads.length === 0 ? (
                  <div className="p-3 text-muted">No conversations yet.</div>
                ) : (
                  threads.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setActiveChatId(t.id)}
                      style={{
                        width: "100%",
                        padding: "12px 14px",
                        border: "none",
                        borderBottom: "1px solid #eee",
                        textAlign: "left",
                        background: activeChatId === t.id ? "#f0f3ff" : "white",
                        cursor: "pointer",
                      }}
                    >
                      <div className="fw-bold">{t.name || t.email || "Student"}</div>
                    </button>
                  ))
                )}
              </Card.Body>
            </Card>
          </Col>

          <Col lg={9}>
             {activeChatId ? (
                <ChatBox 
                   currentUserId={user?.id} 
                   conversationPartnerId={activeChatId} 
                   partnerName={activeThread?.name} 
                />
             ) : (
                <Card className="h-100 flex-center text-center p-5 text-muted">
                   <p>No active chat selected.</p>
                </Card>
             )}
          </Col>
        </Row>
      </Container>
    </DepartmentLayout>
  );
}
