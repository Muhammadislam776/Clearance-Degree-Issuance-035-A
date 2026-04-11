"use client";
import React, { useState, useEffect, useRef } from "react";
import { Card, Form, Button, Spinner } from "react-bootstrap";
import { supabase } from "@/lib/supabaseClient";

export default function ChatBox({ currentUserId, conversationPartnerId, partnerName }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    let isMounted = true;
    if (!currentUserId || !conversationPartnerId) {
       setLoading(false);
       return;
    }

    async function loadHistory() {
      try {
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${conversationPartnerId}),and(sender_id.eq.${conversationPartnerId},receiver_id.eq.${currentUserId})`)
          .order("created_at", { ascending: true });

        if (error) throw error;
        if (isMounted) setMessages(data || []);
      } catch (err) {
        console.error("Failed to load messages", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadHistory();

    // Subscribe to real-time inserts
    const channel = supabase
      .channel(`chat_${currentUserId}_${conversationPartnerId}`)
      .on('postgres_changes', { 
         event: 'INSERT', 
         schema: 'public', 
         table: 'messages'
      }, (payload) => {
         const newMsg = payload.new;
         // Verify the message belongs to this conversation
         const isRelevant = 
           (newMsg.sender_id === currentUserId && newMsg.receiver_id === conversationPartnerId) ||
           (newMsg.sender_id === conversationPartnerId && newMsg.receiver_id === currentUserId);
           
         if (isRelevant && isMounted) {
            setMessages(prev => [...prev, newMsg]);
         }
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [currentUserId, conversationPartnerId]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !currentUserId || !conversationPartnerId) return;

    const tempMsg = {
       id: `temp-${Date.now()}`,
       sender_id: currentUserId,
       receiver_id: conversationPartnerId,
       message: inputText,
       created_at: new Date().toISOString()
    };
    
    // Optimistic UI updates
    setMessages(prev => [...prev, tempMsg]);
    setInputText("");

    try {
       const { error } = await supabase.from("messages").insert([{
          sender_id: currentUserId,
          receiver_id: conversationPartnerId,
          message: tempMsg.message
       }]);
       if (error) throw error;
    } catch (err) {
       console.error("Failed to send message", err);
       // Remove optimistic message on failure
       setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
       alert("Failed to send message");
    }
  };

  if (loading) {
     return <div className="p-4 text-center"><Spinner animation="border" /></div>;
  }

  if (!conversationPartnerId) {
     return (
       <div className="p-5 text-center text-muted" style={{ backgroundColor: "#f8f9fa", borderRadius: "12px", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          Select a chat from the sidebar to start messaging.
       </div>
     );
  }

  return (
    <Card className="h-100 shadow-sm" style={{ borderRadius: "12px", overflow: "hidden", border: "none" }}>
      <Card.Header style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color: "white", padding: "16px" }}>
        <div className="d-flex align-items-center">
          <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginRight: "15px", fontWeight: "bold" }}>
             {partnerName?.charAt(0) || "?"}
          </div>
          <div>
            <h5 className="mb-0 fw-bold">{partnerName || "Unknown"}</h5>
            <small className="opacity-75">Connect securely in real-time</small>
          </div>
        </div>
      </Card.Header>
      
      <Card.Body className="d-flex flex-column p-0" style={{ backgroundColor: "#f8f9ff" }}>
        <div className="p-3" style={{ flex: 1, overflowY: "auto", maxHeight: "500px", minHeight: "400px" }}>
           {messages.length === 0 ? (
             <div className="text-center text-muted mt-5 font-italic">No messages yet. Say hello!</div>
           ) : (
             messages.map((msg) => {
               const isMe = msg.sender_id === currentUserId;
               return (
                 <div key={msg.id} className={`d-flex mb-3 ${isMe ? "justify-content-end" : "justify-content-start"}`}>
                   <div style={{
                      maxWidth: "75%",
                      padding: "10px 15px",
                      borderRadius: "15px",
                      backgroundColor: isMe ? "#667eea" : "white",
                      color: isMe ? "#fff" : "#333",
                      boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
                      borderBottomRightRadius: isMe ? "0" : "15px",
                      borderBottomLeftRadius: !isMe ? "0" : "15px",
                   }}>
                     {msg.message}
                     <div style={{ fontSize: "0.7rem", marginTop: "5px", opacity: 0.7, textAlign: isMe ? "right" : "left" }}>
                       {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                     </div>
                   </div>
                 </div>
               );
             })
           )}
           <div ref={messagesEndRef} />
        </div>
        
        <div className="p-3 bg-white border-top">
           <Form onSubmit={handleSendMessage} className="d-flex gap-2">
             <Form.Control
                type="text"
                placeholder="Type your message..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                style={{ borderRadius: "20px" }}
             />
             <Button type="submit" style={{ borderRadius: "20px", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", border: "none", padding: "8px 20px" }}>
                Send
             </Button>
           </Form>
        </div>
      </Card.Body>
    </Card>
  );
}
