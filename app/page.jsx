"use client";
import React from "react";
import Link from "next/link";
import ThemeToggle from "@/components/layout/ThemeToggle";
import "../styles/landing.css";

export default function Home() {
  return (
    <div className="landing-page">
      {/* Navbar */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-logo">
            <span className="logo-icon">🎓</span>
            <span className="logo-label">Smart Clearance</span>
          </div>
          <ThemeToggle />
        </div>
      </nav>

      {/* Hero */}
      <div className="landing-hero">
        {/* Animated background blobs */}
        <div className="hero-blob blob-1" />
        <div className="hero-blob blob-2" />
        <div className="hero-blob blob-3" />

        <div className="hero-content">
          {/* Badge */}
          <div className="hero-badge">
            <span className="badge-dot" />
            University of Excellence — Official Portal
          </div>

          {/* Headline */}
          <h1 className="hero-headline">
            Smart Student<br />
            <span className="headline-gradient">Clearance & Degree</span><br />
            Issuance System
          </h1>

          {/* Subtitle */}
          <p className="hero-sub">
            Streamline your academic journey. Apply for clearance, track
            approvals, and receive your degree — all in one secure platform.
          </p>

          {/* CTA Buttons */}
          <div className="hero-cta">
            <Link href="/login" className="cta-btn cta-primary">
              <span className="cta-icon">🔑</span>
              Sign In
              <span className="cta-arrow">→</span>
            </Link>
            <Link href="/signup" className="cta-btn cta-secondary">
              <span className="cta-icon">✨</span>
              Register
            </Link>
          </div>

          {/* Stats Row */}
          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-num">2,400+</span>
              <span className="stat-label">Students</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-num">99%</span>
              <span className="stat-label">Uptime</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-num">4 Mins</span>
              <span className="stat-label">Avg. Clearance</span>
            </div>
          </div>
        </div>

        {/* Feature pills */}
        <div className="feature-pills">
          <div className="pill">⚡ Lightning Fast</div>
          <div className="pill">🔒 Bank-Level Security</div>
          <div className="pill">📱 Mobile Ready</div>
          <div className="pill">💬 AI Assistant</div>
          <div className="pill">📄 Digital Degrees</div>
        </div>
      </div>
    </div>
  );
}