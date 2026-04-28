"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loginUser, validateEmail } from "@/lib/authService";
import { getDashboardPathForRole } from "@/lib/roleRouting";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import "../../styles/auth-enhanced.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    const remembered = localStorage.getItem("rememberedEmail");
    if (remembered) {
      setEmail(remembered);
      setRememberMe(true);
    }
  }, []);

  const validateForm = () => {
    const errors = {};
    if (!email.trim()) errors.email = "Email is required";
    else if (!validateEmail(email)) errors.email = "Invalid email address";
    if (!password) errors.password = "Password is required";
    else if (password.length < 6) errors.password = "Password is too short";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!validateForm()) return;

    setLoading(true);
    let navigating = false;

    try {
      const result = await loginUser(email, password);
      if (result.success) {
        setSuccess("Login successful! Redirecting...");
        if (rememberMe) localStorage.setItem("rememberedEmail", email);
        else localStorage.removeItem("rememberedEmail");
        navigating = true;
        const userRole = result.user?.user_metadata?.role;
        setTimeout(() => { router.replace(getDashboardPathForRole(userRole)); }, 200);
      } else {
        let msg = result.error || "Login failed. Please try again.";
        if (msg.includes("rate limit") || msg.includes("too many")) msg = "Too many attempts. Please wait a few minutes.";
        else if (msg.includes("Invalid login credentials")) msg = "Invalid email or password. Please check and try again.";
        else if (msg.includes("Email not confirmed")) msg = "Please confirm your email before logging in.";
        setError(msg);
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      if (!navigating) setLoading(false);
    }
  };

  return (
    <div className="lp-root">
      {/* Animated blobs */}
      <div className="lp-blob lp-blob-1" />
      <div className="lp-blob lp-blob-2" />

      {/* Split layout */}
      <div className="lp-split">
        {/* LEFT PANEL */}
        <div className="lp-left">
          <div className="lp-left-inner">
            <Link href="/" className="lp-back">← Back to home</Link>
            <div className="lp-left-badge">🎓 Official Academic Portal</div>
            <h1 className="lp-left-title">
              Secure &<br />
              <span className="lp-left-gradient">Smart Access</span>
            </h1>
            <p className="lp-left-desc">
              One platform for clearance, degree issuance, and academic lifecycle management.
            </p>
            <div className="lp-features">
              <div className="lp-feature-item">
                <div className="lp-feature-icon">⚡</div>
                <div>
                  <div className="lp-feature-title">Instant Clearance</div>
                  <div className="lp-feature-sub">Real-time multi-department status</div>
                </div>
              </div>
              <div className="lp-feature-item">
                <div className="lp-feature-icon">🔒</div>
                <div>
                  <div className="lp-feature-title">Bank-Grade Security</div>
                  <div className="lp-feature-sub">Encrypted & role-based access</div>
                </div>
              </div>
              <div className="lp-feature-item">
                <div className="lp-feature-icon">📄</div>
                <div>
                  <div className="lp-feature-title">Digital Degrees</div>
                  <div className="lp-feature-sub">Instantly verifiable certificates</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL - Form */}
        <div className="lp-right">
          <div className="lp-card">
            {/* Card top accent */}
            <div className="lp-card-accent" />

            <div className="lp-card-header">
              <div className="lp-card-icon">🛡️</div>
              <h2 className="lp-card-title">Welcome back</h2>
              <p className="lp-card-sub">Sign in to your institutional account</p>
            </div>

            {/* Alerts */}
            {error && (
              <div className="lp-alert lp-alert-error">
                <span>⚠️</span> {error}
                <button className="lp-alert-close" onClick={() => setError("")}>×</button>
              </div>
            )}
            {success && (
              <div className="lp-alert lp-alert-success">
                <span>✓</span> {success}
              </div>
            )}

            <form onSubmit={handleLogin} className="lp-form">
              {/* Email */}
              <div className="lp-field">
                <label className="lp-label">Email Address</label>
                <div className={`lp-input-wrap ${formErrors.email ? "lp-input-error" : ""}`}>
                  <span className="lp-input-icon">✉️</span>
                  <input
                    type="email"
                    placeholder="you@university.edu"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setFormErrors({ ...formErrors, email: "" }); }}
                    disabled={loading}
                    className="lp-input"
                  />
                </div>
                {formErrors.email && <div className="lp-field-error">{formErrors.email}</div>}
              </div>

              {/* Password */}
              <div className="lp-field">
                <label className="lp-label">Password</label>
                <div className={`lp-input-wrap ${formErrors.password ? "lp-input-error" : ""}`}>
                  <span className="lp-input-icon">🔑</span>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setFormErrors({ ...formErrors, password: "" }); }}
                    disabled={loading}
                    className="lp-input"
                  />
                  <button type="button" className="lp-eye-btn" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword
                      ? <EyeSlashIcon style={{ width: 18, height: 18 }} />
                      : <EyeIcon style={{ width: 18, height: 18 }} />}
                  </button>
                </div>
                {formErrors.password && <div className="lp-field-error">{formErrors.password}</div>}
              </div>

              {/* Remember + Forgot */}
              <div className="lp-row">
                <label className="lp-check">
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                  <span>Remember me</span>
                </label>
                <a href="#" className="lp-link">Forgot password?</a>
              </div>

              {/* Submit */}
              <button type="submit" disabled={loading} className="lp-btn-primary">
                {loading ? (
                  <span className="lp-spinner">
                    <svg viewBox="0 0 24 24" fill="none" className="lp-spin" width="18" height="18">
                      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  <>Sign In →</>
                )}
              </button>

              {/* Register link */}
              <div className="lp-divider"><span>New here?</span></div>
              <button type="button" className="lp-btn-secondary" onClick={() => router.push("/signup")}>
                Create an Account
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
