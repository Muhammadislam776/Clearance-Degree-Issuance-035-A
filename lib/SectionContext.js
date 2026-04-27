"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./useAuth";

const SectionContext = createContext();

export const SectionProvider = ({ children }) => {
  const { profile } = useAuth();
  const [activeSection, setActiveSection] = useState(null);

  useEffect(() => {
    if (!activeSection && profile?.department_id) {
      setActiveSection({
        id: profile.department_id,
        name:
          profile.department_name ||
          profile.department_profile?.name ||
          profile.department ||
          "Default Department"
      });
    }
  }, [activeSection, profile]);

  return (
    <SectionContext.Provider value={{ activeSection, setActiveSection }}>
      {children}
    </SectionContext.Provider>
  );
};

export const useSection = () => {
  const context = useContext(SectionContext);
  if (!context) {
    throw new Error("useSection must be used within a SectionProvider");
  }
  return context;
};
