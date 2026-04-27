"use client";
import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Form, Button, InputGroup } from "react-bootstrap";
import StudentLayout from "@/components/layout/StudentLayout";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/lib/supabaseClient";
import ChatBox from "@/components/chat/ChatBox";
import ClearanceAssistant from "@/components/chat/ClearanceAssistant";

export default function ChatPage() {
  const { profile } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [targetStaffId, setTargetStaffId] = useState(null);
  const [activeTab, setActiveTab] = useState("staff"); // "staff" or "ai"

  useEffect(() => {
    async function loadDepts() {
      try {
        // 1. Fetch departments (The source of truth for the list)
        const { data: deptData, error: deptError } = await supabase
          .from("departments")
          .select("*")
          .order("name");
        
        if (deptError) throw deptError;
        if (!deptData) return;

        // 2. Try to fetch staff info
        const { data: staffData } = await supabase
          .from("staff_directory")
          .select("department_id, whatsapp_number, availability_status, focal_person:user_id(name)")
          .limit(100);
          
        const enriched = deptData.map(d => {
          const staff = staffData?.find(s => s.department_id === d.id);
          const defaultWhatsapp = "03196590756"; 
          
          return {
            ...d,
            email: d.email || "department@gmail.com", 
            whatsapp_number: d.whatsapp_number || defaultWhatsapp,
            status: staff?.availability_status || "available", 
            focal_name: d.focal_person || "Staff Member"
          };
        });
        
        setDepartments(enriched);
      } catch (err) {
        console.warn("Department load warning:", err.message);
      }
    }

    loadDepts();

    // ── REAL-TIME SUBSCRIPTION ──
    const channel = supabase
      .channel("dept-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "departments" }, () => {
        loadDepts();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const handleSelectDept = async (dept) => {
    setSelectedDepartment(dept);
    setActiveTab("staff");
    setTargetStaffId(null);
    
    // Find the staff user assigned to this dept (checking staff_directory first as a preference)
    let directoryStaff = null;
    try {
      const { data } = await supabase
         .from("staff_directory")
         .select("user_id")
         .eq("department_id", dept.id)
         .maybeSingle();
      directoryStaff = data;
    } catch {
      // Quietly fail and use fallback
    }

    if (directoryStaff) {
       setTargetStaffId(directoryStaff.user_id);
    } else {
       // Primary fallback: direct user lookup via department_id match
       const { data: legacyStaff } = await supabase
          .from("users")
          .select("id")
          .eq("role", "department")
          .eq("department_id", dept.id)
          .limit(1)
          .maybeSingle();
          
       setTargetStaffId(legacyStaff?.id || "unassigned-" + dept.id);
    }
  };

  return (
    <StudentLayout>
      <Container
        fluid
        className="py-4 px-md-4"
        style={{
          minHeight: "calc(100vh - 80px)",
          background:
            "radial-gradient(1100px 460px at 12% -8%, rgba(37,99,235,0.22), rgba(37,99,235,0) 58%), radial-gradient(900px 420px at 90% 8%, rgba(139,92,246,0.2), rgba(139,92,246,0) 56%), linear-gradient(180deg, #0b1220 0%, #111827 100%)",
        }}
      >
        <Row className="g-4 animate-fade-in-up">
          <Col lg={4} xl={3}>
            {/* Sidebar Card */}
            <Card className="border-0 shadow-sm h-100 chat-panel chat-sidebar" style={{ borderRadius: "20px", overflow: "hidden" }}>
              <div className="p-4 chat-sidebar-head border-bottom">
                <h4 className="fw-bold mb-0 chat-title">Communication</h4>
                <p className="chat-subtitle small mb-0">Choose your support channel</p>
              </div>
              
              <div className="p-3 chat-sidebar-body">
                 <Button 
                   variant={activeTab === 'ai' ? 'primary' : 'outline-primary'} 
                   className="w-100 mb-4 py-3 d-flex align-items-center justify-content-center gap-3 border-0 shadow-sm chat-ai-btn"
                   style={{ 
                     borderRadius: "15px", 
                     background: activeTab === 'ai' ? 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)' : 'rgba(15, 23, 42, 0.86)', 
                     color: activeTab === 'ai' ? '#ffffff' : '#dbeafe',
                     border: '1px solid rgba(96, 165, 250, 0.22)',
                     fontWeight: "600",
                     transition: "all 0.3s"
                   }}
                   onClick={() => { setActiveTab('ai'); setSelectedDepartment(null); }}
                 >
                   <span style={{ fontSize: "1.2rem" }}>🤖</span> Talk to AI Assistant
                 </Button>
                 
                  <div className="text-uppercase small fw-bold chat-section-label mb-3 px-2" style={{ letterSpacing: "1.5px" }}>Departments</div>
                  <div className="custom-scrollbar" style={{ maxHeight: "600px", overflowY: "auto", paddingRight: "5px" }}>
                    {departments.map((dept) => (
                      <div 
                        key={dept.id}
                        onClick={() => handleSelectDept(dept)}
                        className={`p-3 mb-3 rounded-4 cursor-pointer transition-all dept-item ${selectedDepartment?.id === dept.id ? 'active-dept' : ''}`}
                        style={{ 
                          cursor: "pointer", 
                          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                          background: selectedDepartment?.id === dept.id ? 'linear-gradient(180deg, rgba(37,99,235,0.22) 0%, rgba(15,23,42,0.9) 100%)' : 'rgba(15, 23, 42, 0.82)',
                          border: selectedDepartment?.id === dept.id ? '1px solid rgba(96, 165, 250, 0.55)' : '1px solid rgba(148, 163, 184, 0.18)',
                          boxShadow: selectedDepartment?.id === dept.id ? '0 14px 28px rgba(37, 99, 235, 0.24)' : '0 8px 18px rgba(15,23,42,0.22)'
                        }}
                      >
                        <div className="d-flex align-items-center gap-3">
                          <div className="dept-avatar" style={{ 
                            minWidth: "56px", 
                            height: "56px", 
                            borderRadius: "18px", 
                            background: selectedDepartment?.id === dept.id ? 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)' : 'rgba(30, 41, 59, 0.96)', 
                            color: '#f8fafc', 
                            display: "flex", 
                            alignItems: "center", 
                            justifyContent: "center", 
                            fontWeight: "800",
                            fontSize: "1.4rem",
                            boxShadow: "inset 0 0 0 1px rgba(148,163,184,0.2)"
                          }}>
                            {dept.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-grow-1">
                            <div className="fw-bold mb-1 chat-dept-name" style={{ fontSize: "1.1rem", lineHeight: "1.2", letterSpacing: "-0.3px" }}>
                              {dept.name}
                            </div>
                            <div className="d-flex align-items-center gap-2">
                              <span className={`status-dot ${dept.status === 'available' ? 'bg-success' : 'bg-secondary'}`} 
                                    style={{ 
                                      width: "12px", 
                                      height: "12px", 
                                      borderRadius: "50%"
                                    }}></span>
                              <span className="text-muted fw-bold text-uppercase" style={{ fontSize: "0.8rem", letterSpacing: "1px" }}>
                                {dept.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
              </div>
            </Card>
          </Col>

          <Col lg={8} xl={9}>
            {activeTab === 'ai' ? (
              <ClearanceAssistant currentUserId={profile?.id} />
            ) : selectedDepartment ? (
              <div className="h-100 d-flex flex-column">
                {/* Department Info Header */}
                <Card className="border-0 shadow-sm mb-3 px-4 py-3 chat-panel" style={{ borderRadius: "16px" }}>
                  <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                    <div className="d-flex align-items-center gap-3">
                      <div>
                        <h5 className="fw-bold mb-0 chat-title">{selectedDepartment.name} Support</h5>
                        <p className="chat-subtitle small mb-0">Focal: {selectedDepartment.focal_name}</p>
                      </div>
                    </div>
                    <div className="d-flex gap-2">
                      {selectedDepartment.whatsapp_number && (
                        <a 
                          href={`https://wa.me/${selectedDepartment.whatsapp_number.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-success rounded-pill px-3 d-flex align-items-center gap-2 border-0 shadow-sm shadow-hover text-white text-decoration-none"
                        >
                          <i className="bi bi-whatsapp"></i> WhatsApp
                        </a>
                      )}
                      <a 
                        href={`mailto:${selectedDepartment.email || 'department@gmail.com'}`}
                        className="btn btn-light rounded-pill px-3 border-0 shadow-sm shadow-hover text-decoration-none"
                      >
                        <i className="bi bi-envelope"></i> Email
                      </a>
                    </div>
                  </div>
                </Card>

                {/* Main Chat Area */}
                <div className="flex-grow-1">
                  {targetStaffId?.startsWith("unassigned-") ? (
                    <Card className="h-100 border-0 shadow-sm flex-center text-center p-5 text-muted" style={{ borderRadius: "16px" }}>
                      <div className="mb-4" style={{ fontSize: "4rem" }}>📨</div>
                      <h5 className="fw-bold text-dark">No Active Staff Assigned</h5>
                      <p>Currently, there is no one available for live chat at {selectedDepartment.name}. Please use the WhatsApp contact or try the AI Assistant.</p>
                      <Button variant="primary" onClick={() => setActiveTab('ai')} className="rounded-pill px-4 mt-2 border-0" style={{ background: "#667eea" }}>Ask AI Assistant</Button>
                    </Card>
                  ) : (
                    <ChatBox 
                      currentUserId={profile?.id} 
                      conversationPartnerId={targetStaffId} 
                      partnerName={selectedDepartment.name} 
                    />
                  )}
                </div>
              </div>
            ) : (
              <Card className="border-0 shadow-sm h-100 d-flex align-items-center justify-content-center text-center p-5 chat-panel" style={{ borderRadius: "20px" }}>
                <div className="mb-4" style={{ fontSize: "5rem" }}>💬</div>
                <h3 className="fw-bold chat-title">Ready to Connect</h3>
                <p className="chat-subtitle mx-auto" style={{ maxWidth: "400px" }}>
                  Select a department to message their staff directly, or chat with our 
                  AI Clearance Assistant for instant answers to frequently asked questions.
                </p>
                <div className="d-flex gap-3 mt-3">
                  <Button variant="primary" onClick={() => setActiveTab('ai')} className="rounded-pill px-4 py-2 border-0" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>AI Assistant</Button>
                  <Button variant="outline-primary" className="rounded-pill px-4 py-2" onClick={() => { /* scroll to sidebar */ }}>Browse Departments</Button>
                </div>
              </Card>
            )}
          </Col>
        </Row>
      </Container>
      
      {/* Global CSS for some effects */}
      <style jsx>{`
        .cursor-pointer { cursor: pointer; }
        .transition-all { transition: all 0.3s ease; }
        .dept-item:hover { 
          transform: translateX(8px) scale(1.02);
          background-color: rgba(37, 99, 235, 0.25) !important;
          box-shadow: 0 14px 28px rgba(0, 0, 0, 0.4);
          border-color: rgba(96, 165, 250, 0.4) !important;
        }
        .active-dept {
          transform: translateX(12px) scale(1.04);
          background: linear-gradient(135deg, rgba(37, 99, 235, 0.3), rgba(15, 23, 42, 0.95)) !important;
          border-color: rgba(96, 165, 250, 0.6) !important;
        }
        .status-dot.bg-success {
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e0e0e0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d0d0d0;
        }
        .flex-center { display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .chat-panel {
          background: rgba(15, 23, 42, 0.4) !important;
          border: 1px solid rgba(148, 163, 184, 0.12) !important;
          color: #f8fafc;
          backdrop-filter: blur(20px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .chat-panel:hover {
          transform: translateY(-4px);
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.4);
          border-color: rgba(96, 165, 250, 0.35);
        }
        .chat-sidebar-head {
          background: linear-gradient(90deg, rgba(15, 23, 42, 0.96) 0%, rgba(30, 41, 59, 0.96) 100%);
          border-bottom: 1px solid rgba(148, 163, 184, 0.18);
        }
        .chat-sidebar-body {
          background: rgba(15, 23, 42, 0.72);
        }
        .chat-title {
          color: #f8fafc;
        }
        .chat-subtitle {
          color: #cbd5e1 !important;
        }
        .chat-section-label {
          color: #93c5fd !important;
        }
        .chat-dept-name {
          color: #f8fafc;
        }
        .chat-ai-btn:hover {
          transform: translateY(-2px);
        }
        .chat-panel .text-muted,
        .chat-panel p {
          color: #cbd5e1;
        }
        .chat-panel .btn-light {
          background: rgba(248, 250, 252, 0.92);
          color: #0f172a;
        }
      `}</style>
    </StudentLayout>
  );
}