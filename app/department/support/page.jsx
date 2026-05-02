"use client";
import React, { useState, useEffect } from "react";
import DepartmentLayout from "@/components/layout/DepartmentLayout";
import SupportChat from "@/components/chat/SupportChat";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/lib/supabaseClient";

export default function DepartmentSupportPage() {
  const { profile } = useAuth();
  const [deptInfo, setDeptInfo] = useState(null);

  useEffect(() => {
    if (profile?.department_id) {
      async function fetchDept() {
        const { data } = await supabase
          .from("departments")
          .select("*")
          .eq("id", profile.department_id)
          .single();
        if (data) setDeptInfo(data);
      }
      fetchDept();
    }
  }, [profile?.department_id]);

  if (!profile) return null;

  return (
    <DepartmentLayout>
      <div className="container-fluid py-4">
        <div className="mb-4">
          <h2 className="fw-bold text-white mb-1">Admin Support</h2>
          <p className="text-muted">Connect with institutional administrators for any technical or process-related queries.</p>
        </div>
        
        <SupportChat 
          currentUserId={profile.id} 
          departmentInfo={deptInfo} 
          isAdmin={false}
        />
      </div>
    </DepartmentLayout>
  );
}
