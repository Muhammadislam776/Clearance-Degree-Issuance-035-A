"use client";
import React from "react";

export default function AuthLayout({ children }) {
  return (
    <div style={{ width: "100%", minHeight: "100vh" }}>
      {children}
    </div>
  );
}