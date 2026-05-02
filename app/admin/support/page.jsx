"use client";
import React from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import SupportChat from "@/components/chat/SupportChat";
import { useAuth } from "@/lib/useAuth";

export default function AdminSupportPage() {
  const { profile } = useAuth();

  if (!profile) return null;

  return (
    <AdminLayout>
      <div className="container-fluid py-4">
        <div className="mb-4 d-flex justify-content-between align-items-center">
          <div>
            <h2 className="fw-bold text-white mb-1">Support Management</h2>
            <p className="text-muted">Review and respond to departmental queries and support tickets.</p>
          </div>
          <div className="d-flex gap-2">
            <span className="badge bg-primary rounded-pill px-3 py-2">Real-time Enabled</span>
          </div>
        </div>
        
        <SupportChat 
          currentUserId={profile.id} 
          isAdmin={true}
        />
      </div>
    </AdminLayout>
  );
}
