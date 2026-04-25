"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Card, Form, InputGroup, Button, Spinner } from 'react-bootstrap';

const FAQ_DATABASE = {
  "clearance": "To apply for clearance, navigate to the 'Apply Clearance' page on your dashboard. Ensure you have zero pending dues across all departments.",
  "degree": "Degrees are only issued by the Examiner once your clearance hits 100%. Once verified, it will appear under 'My Documents'.",
  "document": "You can upload your documents such as Library No-Dues or Fee Vouchers directly inside the Clearance Application form.",
  "department": "If a department rejected your clearance, check their 'Remarks' on your dashboard. You can also chat with them directly using the 'Direct Chat' feature.",
  "fee": "Fee queries should be directed to the Finance department. Ensure you upload the latest voucher receipt.",
  "library": "You cannot submit clearance unless all library books are verified as returned.",
};

const AIChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, sender: 'bot', text: "Hello! I am the Smart Campus Assistant. How can I help you today?" }
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  
  const bottomRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) {
       bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg = { id: Date.now(), sender: 'user', text: inputText };
    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    setIsTyping(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: userMsg.text }),
      });

      const data = await res.json();

      setMessages(prev => [
         ...prev, 
         { id: Date.now() + 1, sender: 'bot', text: data.reply }
      ]);
    } catch (err) {
      setMessages(prev => [
         ...prev, 
         { id: Date.now() + 1, sender: 'bot', text: "I'm offline right now." }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '30px',
          right: '30px',
          width: '65px',
          height: '65px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          border: 'none',
          boxShadow: '0 8px 25px rgba(118, 75, 162, 0.5)',
          cursor: 'pointer',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px',
          transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <i className="bi bi-robot"></i>
      </button>
    );
  }

  return (
    <Card 
      style={{
        position: 'fixed',
        bottom: '30px',
        right: '30px',
        width: '380px',
        height: '550px',
        borderRadius: '20px',
        boxShadow: '0 15px 35px rgba(0,0,0,0.2)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: 'none'
      }}
    >
      {/* Bot Header */}
      <div style={{
         background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
         padding: '20px',
         color: 'white',
         display: 'flex',
         justifyContent: 'space-between',
         alignItems: 'center'
      }}>
         <div className="d-flex align-items-center gap-3">
            <div style={{ 
               width: '40px', height: '40px', borderRadius: '50%', 
               background: 'rgba(255,255,255,0.2)', display: 'flex', 
               alignItems: 'center', justifyContent: 'center', fontSize: '20px' 
            }}>
               🤖
            </div>
            <div>
               <h5 className="mb-0 fw-bold">Campus AI Assitant</h5>
               <small style={{ opacity: 0.8 }}>Online</small>
            </div>
         </div>
         <button 
           onClick={() => setIsOpen(false)}
           style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '24px' }}
         >
            <i className="bi bi-x-circle-fill"></i>
         </button>
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, padding: '20px', backgroundColor: '#f9f9fc', overflowY: 'auto' }}>
         {messages.map(msg => {
            const isBot = msg.sender === 'bot';
            return (
               <div key={msg.id} style={{ 
                  display: 'flex', 
                  marginBottom: '15px',
                  justifyContent: isBot ? 'flex-start' : 'flex-end'
               }}>
                  <div style={{
                     maxWidth: '80%',
                     padding: '12px 18px',
                     borderRadius: '18px',
                     borderBottomLeftRadius: isBot ? '4px' : '18px',
                     borderBottomRightRadius: !isBot ? '4px' : '18px',
                     background: isBot ? 'white' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                     color: isBot ? '#333' : 'white',
                     boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
                     lineHeight: '1.4'
                  }}>
                     {msg.text}
                  </div>
               </div>
            );
         })}
         {isTyping && (
            <div style={{ display: 'flex', marginBottom: '15px', justifyContent: 'flex-start' }}>
               <div style={{
                  padding: '12px 18px',
                  borderRadius: '18px',
                  borderBottomLeftRadius: '4px',
                  background: 'white',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
               }}>
                  <Spinner animation="grow" size="sm" className="mx-1" style={{color: '#667eea'}} />
                  <Spinner animation="grow" size="sm" className="mx-1" style={{color: '#764ba2'}} />
                  <Spinner animation="grow" size="sm" className="mx-1" style={{color: '#667eea'}} />
               </div>
            </div>
         )}
         <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div style={{ padding: '15px', background: 'white', borderTop: '1px solid #eee' }}>
         <Form onSubmit={handleSend}>
            <InputGroup>
               <Form.Control
                  placeholder="Ask me anything..."
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  style={{ 
                     borderRadius: '25px 0 0 25px', 
                     paddingLeft: '20px',
                     border: '1px solid #ddd',
                     boxShadow: 'none'
                  }}
                  disabled={isTyping}
               />
               <Button 
                  type="submit"
                  disabled={isTyping || !inputText.trim()}
                  style={{ 
                     borderRadius: '0 25px 25px 0',
                     background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                     border: 'none',
                     padding: '0 20px'
                  }}
               >
                  <i className="bi bi-send-fill text-white"></i>
               </Button>
            </InputGroup>
         </Form>
      </div>
    </Card>
  );
};

export default AIChatbot;
