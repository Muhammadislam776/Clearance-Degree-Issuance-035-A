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
        <Row className="g-4 animate-fade-in-up chat-row" style={{ minHeight: "80vh" }}>
          <Col lg={4} xl={3} className={(selectedDepartment || activeTab === 'ai') ? "d-none d-lg-block" : ""}>
            {/* Sidebar Card */}
            <Card className="border-0 shadow-sm h-100 chat-panel chat-sidebar" style={{ borderRadius: "20px", overflow: "hidden" }}>
              <div className="p-4 chat-sidebar-head border-bottom">
                <h4 className="fw-bold mb-0 chat-title">Communication</h4>
                <p className="chat-subtitle small mb-0">Choose your support channel</p>
              </div>
              
              <div className="p-3 chat-sidebar-body">
                  <Button 
                    variant={activeTab === 'ai' ? 'primary' : 'outline-primary'} 
                    className={`w-100 mb-4 py-3 d-flex align-items-center justify-content-center gap-3 border-0 shadow-lg chat-ai-btn ${activeTab === 'ai' ? 'active-glow' : ''}`}
                    style={{ 
                      borderRadius: "18px", 
                      background: activeTab === 'ai' ? 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)' : 'rgba(30, 41, 59, 0.4)', 
                      color: '#ffffff',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      fontWeight: "700",
                      transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
                    }}
                    onClick={() => { setActiveTab('ai'); setSelectedDepartment(null); }}
                  >
                    <div className="ai-icon-pulse">
                      <span style={{ fontSize: "1.4rem" }}>🤖</span>
                    </div>
                    <span>Ask AI Assistant</span>
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

          <Col lg={8} xl={9} className={(!selectedDepartment && activeTab !== 'ai') ? "d-none d-lg-block" : "d-flex flex-column"}>
            {/* Mobile Back Button */}
            <div className="d-lg-none mb-3">
              <Button 
                variant="light" 
                className="border-0 shadow-sm rounded-pill px-4"
                onClick={() => { setActiveTab("staff"); setSelectedDepartment(null); }}
              >
                &larr; Back to Channels
              </Button>
            </div>

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
              <Card className="border-0 shadow-lg h-100 d-flex align-items-center justify-content-center text-center p-5 chat-panel welcome-gateway" style={{ borderRadius: "32px", background: "rgba(15, 23, 42, 0.6)" }}>
                <div className="gateway-icon-wrap mb-4 mx-auto" style={{ width: "140px", height: "140px", background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.2)" }}>
                  <div className="floating-msg-icons">
                    <span style={{ fontSize: "5rem" }}>💬</span>
                  </div>
                </div>
                <h2 className="fw-black chat-title mb-3" style={{ fontSize: "2.5rem" }}>Ready to Connect</h2>
                <p className="chat-subtitle mx-auto mb-5" style={{ maxWidth: "500px", fontSize: "1.1rem", lineHeight: "1.6" }}>
                  Direct lines are open. Select a department to speak with their staff, 
                  or start a conversation with our **AI Assistant** for immediate clearance guidance.
                </p>
                <div className="d-flex gap-3 mt-2 flex-wrap justify-content-center">
                  <Button size="lg" className="rounded-pill px-5 py-3 btn-premium-primary border-0 fw-bold shadow-glow" onClick={() => setActiveTab('ai')}>
                    Launch AI Chat
                  </Button>
                  <Button size="lg" variant="outline-light" className="rounded-pill px-5 py-3 border-2 fw-bold opacity-75" onClick={() => { /* scroll logic */ }}>
                    Browse Units
                  </Button>
                </div>
              </Card>

            )}
          </Col>
        </Row>
      </Container>
      
      {/* Global CSS for some effects */}
      <style jsx global>{`
        /* Communication Hub Enhancements */
        :global(body) {
          background-color: #0b1220 !important;
        }

        .fw-black { font-weight: 900; }

        .cursor-pointer { cursor: pointer; }
        .transition-all { transition: all 0.3s ease; }
        
        .dept-item {
          background: rgba(30, 41, 59, 0.4) !important;
          border: 1px solid rgba(255, 255, 255, 0.05) !important;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }

        .dept-item:hover { 
          transform: translateX(10px) scale(1.02);
          background: rgba(30, 41, 59, 0.8) !important;
          box-shadow: 0 15px 30px rgba(0, 0, 0, 0.4) !important;
          border-color: rgba(37, 99, 235, 0.4) !important;
        }

        .active-dept {
          transform: translateX(15px) scale(1.04) !important;
          background: linear-gradient(135deg, rgba(37, 99, 235, 0.2), rgba(15, 23, 42, 0.9)) !important;
          border-color: rgba(37, 99, 235, 0.6) !important;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5) !important;
        }

        .ai-icon-pulse {
          animation: iconPulse 2s infinite;
        }

        @keyframes iconPulse {
          0% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(59, 130, 246, 0)); }
          50% { transform: scale(1.15); filter: drop-shadow(0 0 10px rgba(59, 130, 246, 0.6)); }
          100% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(59, 130, 246, 0)); }
        }

        .active-glow {
          box-shadow: 0 0 25px rgba(37, 99, 235, 0.5) !important;
        }

        .status-dot.bg-success {
          animation: dotPulse 2s infinite;
          box-shadow: 0 0 10px rgba(16, 185, 129, 0.5);
        }

        @keyframes dotPulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.6; }
          100% { transform: scale(1); opacity: 1; }
        }

        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }

        .chat-panel {
          background: rgba(15, 23, 42, 0.6) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          color: #f8fafc;
          backdrop-filter: blur(20px);
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
          transition: all 0.4s ease;
        }

        .welcome-gateway {
          animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .gateway-icon-wrap {
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          animation: float 4s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }

        .shadow-glow {
          box-shadow: 0 15px 30px rgba(37, 99, 235, 0.4) !important;
        }

        .btn-premium-primary { 
          background: linear-gradient(135deg, #2563eb, #7c3aed) !important; 
          color: white; 
          border: none !important;
          transition: all 0.3s ease !important;
        }

        .btn-premium-primary:hover {
          transform: translateY(-3px);
          box-shadow: 0 20px 40px rgba(37, 99, 235, 0.5) !important;
        }

        .chat-sidebar-head {
          background: rgba(30, 41, 59, 0.5);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        
        .chat-title { color: #ffffff; }
        .chat-subtitle { color: #94a3b8 !important; }
        .chat-section-label { color: #60a5fa !important; }
        .chat-dept-name { color: #ffffff; }

      `}</style>
    </StudentLayout>
  );
}