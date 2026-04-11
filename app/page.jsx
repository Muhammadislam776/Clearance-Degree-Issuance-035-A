"use client";
import React from "react";
import Link from "next/link";
import "../styles/landing.css";

export default function Home() {
  return (
    <div className="landing-page">
      {/* Navigation Bar */}
      <nav className="navbar-custom">
        <div className="nav-container">
          <div className="logo-section">
            <h1 className="logo-text">🎓 Smart Clearance System</h1>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">Welcome to the Smart Student Clearance & Degree Issuance System</h1>
            <p className="hero-subtitle">
              Streamline your academic journey with our innovative clearance and degree issuance platform. 
              Fast, secure, and designed for your success.
            </p>
            <p className="hero-description">
              Join thousands of students managing their academic clearance seamlessly. 
              Get your degree issued digitally in just a few clicks.
            </p>
          </div>
        </div>

        {/* Cards Section */}
        <div className="cards-wrapper">
          <div className="cards-container">
            {/* Login Card */}
            <Link href="/login">
              <div className="card-item login-card">
                <div className="card-icon">
                  <span className="icon-text">🔐</span>
                </div>
                <h2 className="card-title">Login</h2>
                <p className="card-description">
                  Access your account and manage your clearance process. 
                  Continue your academic journey with us.
                </p>
                <ul className="card-features">
                  <li>Secure Access</li>
                  <li>Track Progress</li>
                  <li>Download Certificates</li>
                </ul>
                <button className="card-button login-button">Get Started</button>
              </div>
            </Link>

            {/* Sign Up Card */}
            <Link href="/signup">
              <div className="card-item signup-card">
                <div className="card-icon">
                  <span className="icon-text">✨</span>
                </div>
                <h2 className="card-title">Sign Up</h2>
                <p className="card-description">
                  New to our platform? Create your account today and start 
                  your digital clearance journey.
                </p>
                <ul className="card-features">
                  <li>Quick Registration</li>
                  <li>Easy Setup</li>
                  <li>Instant Access</li>
                </ul>
                <button className="card-button signup-button">Create Account</button>
              </div>
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div className="features-section">
          <h2 className="features-title">Why Choose Our Platform?</h2>
          <div className="features-grid">
            <div className="feature-box">
              <div className="feature-icon">⚡</div>
              <h3>Lightning Fast</h3>
              <p>Process clearance in minutes, not days</p>
            </div>
            <div className="feature-box">
              <div className="feature-icon">🔒</div>
              <h3>100% Secure</h3>
              <p>Your data is encrypted and protected</p>
            </div>
            <div className="feature-box">
              <div className="feature-icon">📱</div>
              <h3>Mobile Ready</h3>
              <p>Access from any device, anytime</p>
            </div>
            <div className="feature-box">
              <div className="feature-icon">💬</div>
              <h3>24/7 Support</h3>
              <p>Help when you need it most</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}