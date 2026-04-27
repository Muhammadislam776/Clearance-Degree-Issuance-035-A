"use client";
import React from "react";
import Link from "next/link";
import LandingFooter from "@/components/layout/LandingFooter";
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
            COMSATS UNIVERSITY ISLAMABAD — Official Portal
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

      </div>

      {/* How It Works Section */}
      <section className="landing-workflow">
        <div className="container">
          <div className="section-header">
            <span className="section-badge">Workflow</span>
            <h2 className="section-title">How It Works</h2>
            <p className="section-subtitle">Advanced end-to-end institutional flow from request to degree issuance</p>
          </div>

          <div className="workflow-grid">
            <div className="workflow-card card-left">
              <div className="card-number">01</div>
              <div className="card-icon-box">
                <span className="card-icon">🚀</span>
              </div>
              <h3 className="card-title">Digital Initiation</h3>
              <p className="card-text">
                Students sign in, complete their profile, and launch a clearance request with a single click. No queues, no paper.
              </p>
              <div className="card-role">ROLE: STUDENT</div>
            </div>

            <div className="workflow-card card-center">
              <div className="card-number">02</div>
              <div className="card-icon-box">
                <span className="card-icon">⚡</span>
              </div>
              <h3 className="card-title">Parallel Verification</h3>
              <p className="card-text">
                Department examiners review records in real-time. Track every approval live on your high-performance dashboard.
              </p>
              <div className="card-role">ROLE: DEPARTMENTS</div>
            </div>

            <div className="workflow-card card-right">
              <div className="card-number">03</div>
              <div className="card-icon-box">
                <span className="card-icon">🎓</span>
              </div>
              <h3 className="card-title">Final Certification</h3>
              <p className="card-text">
                Once all units approve, the Academic office issues your digital degree for secure download and verification.
              </p>
              <div className="card-role">ROLE: ADMIN / ACADEMIC</div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Features Section */}
      <section className="landing-features">
        <div className="container">
          <div className="section-header">
            <span className="section-badge">Core Features</span>
            <h2 className="section-title">Platform Features</h2>
            <p className="section-subtitle">Everything you need to manage your institutional clearance efficiently</p>
          </div>

          <div className="features-grid">
            {/* Feature 1 */}
            <div className="feature-card">
              <div className="feature-icon-wrapper icon-blue">
                <span className="feature-icon">🛡️</span>
              </div>
              <h3 className="feature-title">Secure & Reliable</h3>
              <p className="feature-text">
                Enterprise-grade security with encrypted submissions and automated backups to protect your academic data.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="feature-card">
              <div className="feature-icon-wrapper icon-green">
                <span className="feature-icon">📈</span>
              </div>
              <h3 className="feature-title">Progress Tracking</h3>
              <p className="feature-text">
                Real-time progress tracking with detailed analytics. Monitor department approvals and deadlines effortlessly.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="feature-card">
              <div className="feature-icon-wrapper icon-indigo">
                <span className="feature-icon">📄</span>
              </div>
              <h3 className="feature-title">Digital Archive</h3>
              <p className="feature-text">
                Submit and manage all your documents in one place with version control and instant verification support.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="feature-card">
              <div className="feature-icon-wrapper icon-red">
                <span className="feature-icon">⭐</span>
              </div>
              <h3 className="feature-title">Transparent Review</h3>
              <p className="feature-text">
                Multi-level verification system with clear feedback loops for unbiased and transparent clearance results.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="feature-card">
              <div className="feature-icon-wrapper icon-teal">
                <span className="feature-icon">📱</span>
              </div>
              <h3 className="feature-title">Mobile Ready</h3>
              <p className="feature-text">
                Access your dashboard from any device. Fully responsive design optimized for on-the-go management.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="feature-card">
              <div className="feature-icon-wrapper icon-purple">
                <span className="feature-icon">🔔</span>
              </div>
              <h3 className="feature-title">Smart Alerts</h3>
              <p className="feature-text">
                Stay updated with real-time alerts for department approvals, message replies, and important milestones.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* System Innovation Section */}
      <section className="landing-innovation">
        <div className="container">
          <div className="section-header">
            <span className="section-badge">Innovation</span>
            <h2 className="section-title">Institutional Features</h2>
            <p className="section-subtitle">Cutting-edge modules designed to modernize academic administration</p>
          </div>

          <div className="innovation-grid">
            {/* Card 1 */}
            <div className="innovation-card">
              <div className="card-top-tags">
                <span className="tag-pill tag-blue">AI/ML</span>
                <span className="tag-pill tag-gold">Premium</span>
              </div>
              
              <h3 className="innovation-title">AI-Powered Support Desk</h3>
              <p className="innovation-description">
                Your portal includes an advanced AI-powered assistant designed to enhance efficiency and user experience for Students and Staff alike.
              </p>
              
              <div className="innovation-details-grid">
                <div className="detail-box">
                  <span className="detail-label">TYPE</span>
                  <span className="detail-value">AI Assistant</span>
                </div>
                <div className="detail-box">
                  <span className="detail-label">IMPACT</span>
                  <span className="detail-value">High</span>
                </div>
                <div className="detail-box">
                  <span className="detail-label">STATUS</span>
                  <span className="detail-value text-success">Live</span>
                </div>
                <div className="detail-box">
                  <span className="detail-label">RELEASE</span>
                  <span className="detail-value">06 Mar 2026</span>
                </div>
              </div>
            </div>

            {/* Card 2 */}
            <div className="innovation-card">
              <div className="card-top-tags">
                <span className="tag-pill tag-purple">Security</span>
                <span className="tag-pill tag-blue">Web</span>
              </div>
              
              <h3 className="innovation-title">Blockchain Verification</h3>
              <p className="innovation-description">
                Tamper-proof degree issuance using encrypted blockchain hashes to ensure global verification and institutional trust for graduates.
              </p>
              
              <div className="innovation-details-grid">
                <div className="detail-box">
                  <span className="detail-label">TYPE</span>
                  <span className="detail-value">Blockchain</span>
                </div>
                <div className="detail-box">
                  <span className="detail-label">SECURITY</span>
                  <span className="detail-value">Bank-Level</span>
                </div>
                <div className="detail-box">
                  <span className="detail-label">STATUS</span>
                  <span className="detail-value text-primary">Pending</span>
                </div>
                <div className="detail-box">
                  <span className="detail-label">NETWORK</span>
                  <span className="detail-value">Private</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* New Footer */}
      <LandingFooter />
    </div>
  );
}