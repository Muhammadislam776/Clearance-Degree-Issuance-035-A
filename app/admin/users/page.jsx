"use client";
import React, { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Table, Card, Button } from "react-bootstrap";
import { supabase } from "@/lib/supabaseClient";

export default function UsersPage() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data } = await supabase.from("users").select("*");
    setUsers(data || []);
  };

  const deleteUser = async (id) => {
    if (!confirm("Are you sure to delete this user?")) return;
    await supabase.from("users").delete().eq("id", id);
    fetchUsers();
  };

  return (
    <AdminLayout>
      <h2 className="mb-4">Manage Users</h2>
      <Card className="shadow hover-card p-4">
        <Table striped bordered hover responsive>
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>
                  <Button variant="danger" size="sm" onClick={() => deleteUser(u.id)}>Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </AdminLayout>
  );
}