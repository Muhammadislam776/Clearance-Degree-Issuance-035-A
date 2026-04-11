"use client";
import React, { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, ListGroup } from "react-bootstrap";
import { supabase } from "@/lib/supabaseClient";

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false });
      setNotifications(data || []);
    };
    fetchNotifications();

    const subscription = supabase
      .channel("public:notifications")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, payload => {
        setNotifications(prev => [payload.new, ...prev]);
      })
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, []);

  return (
    <AdminLayout>
      <Card className="shadow hover-card p-4">
        <h3>Notifications</h3>
        <ListGroup>
          {notifications.length ? notifications.map(n => (
            <ListGroup.Item key={n.id}>{n.message}</ListGroup.Item>
          )) : <p>No notifications</p>}
        </ListGroup>
      </Card>
    </AdminLayout>
  );
}