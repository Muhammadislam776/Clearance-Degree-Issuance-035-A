"use client";
import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { loginUser, validateEmail, resetPasswordRequest, updatePassword, verifyOtpCode } from "@/lib/authService";
import { getDashboardPathForRole } from "@/lib/roleRouting";
import { EyeIcon, EyeSlashIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import "../../styles/auth-enhanced.css";

export default function LoginPage() {
  const router = useRouter();
  const [view, setView] = useState("login"); // login, forgot-email, forgot-code, forgot-reset
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetCode, setResetCode] = useState(new Array(8).fill(""));
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [timer, setTimer] = useState(90);
  const timerRef = useRef(null);

  useEffect(() => {
    const remembered = localStorage.getItem("rememberedEmail");
    if (remembered) {
      setEmail(remembered);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    if (view === "forgot-code") {
      startTimer();
    } else {
      stopTimer();
    }
    return () => stopTimer();
  }, [view]);

  const startTimer = () => {
    stopTimer();
    setTimer(90);
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          stopTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    setLoading(true);
    try {
      const result = await loginUser(email, password);
      if (result.success) {
        setSuccess("Login successful!");
        if (rememberMe) localStorage.setItem("rememberedEmail", email);
        else localStorage.removeItem("rememberedEmail");
        const userRole = result.user?.user_metadata?.role;
        setTimeout(() => router.replace(getDashboardPathForRole(userRole)), 500);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError("Unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotEmail = async (e) => {
    if (e) e.preventDefault();
    setError(""); setSuccess("");
    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    const res = await resetPasswordRequest(email);
    setLoading(true); // Keep loading until transition or error

    if (res.success) {
      setView("forgot-code");
      setSuccess("A secure 8-digit verification code has been sent to your email.");
      setResetCode(new Array(8).fill(""));
      setLoading(false);
      startTimer(); // Manually restart timer on resend
    } else {
      setLoading(false);
      // Professional Rate Limit & Registration Errors
      if (res.error?.toLowerCase().includes("rate limit") || res.error?.includes("too many")) {
        setError("Too many requests. Please try again after some time for security reasons.");
      } else if (res.error?.toLowerCase().includes("signups not allowed for otp")) {
        setError("This email address is not registered. Please verify your email or create a new account.");
      } else {
        setError(res.error || "Verification service is currently unavailable. Please try again later.");
      }
    }
  };

  const handleCodeChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...resetCode];
    newCode[index] = value.slice(-1);
    setResetCode(newCode);
    if (value && index < 7) {
      document.getElementById(`code-${index + 1}`)?.focus();
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    const fullCode = resetCode.join("");

    if (!fullCode || fullCode.length < 8) {
      setError("Please enter the complete 8-digit verification code.");
      return;
    }

    if (timer === 0) {
      setError("The verification code has expired. Please request a new code.");
      return;
    }

    setLoading(true);
    // STRICT AUTHENTICATION: Only allows code sent to user email
    const res = await verifyOtpCode(email, fullCode);
    setLoading(false);

    if (res.success) {
      setView("forgot-reset");
      setSuccess("Identity verified successfully. You may now update your password.");
      setPassword("");
      setConfirmPassword("");
    } else {
      setError("Code not match. Please enter a valid code.");
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    
    if (password.length < 8) {
      setError("Password must be at least 8 characters long for security.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify your entry.");
      return;
    }

    setLoading(true);
    const res = await updatePassword(password);
    setLoading(false);

    if (res.success) {
      setSuccess("Your password has been successfully updated.");
      setTimeout(() => setView("login"), 2000);
    } else {
      // Professional handling of duplicate password
      if (res.error?.includes("same as old")) {
        setError("New password cannot be the same as your previous password. Please choose a different one.");
      } else {
        setError(res.error || "An error occurred while updating your password. Please try again.");
      }
    }
  };

  return (
    <div className="lp-root">
      <div className="lp-blob lp-blob-1" />
      <div className="lp-blob lp-blob-2" />

      <div className="lp-split">
        <div className="lp-left">
          <div className="lp-left-inner">
            <Link href="/" className="lp-back">← Back to home</Link>
            <div className="lp-left-badge">🎓 Official Academic Portal</div>
            <h1 className="lp-left-title">
              {view === "login" ? <>Secure &<br /><span className="lp-left-gradient">Smart Access</span></> : <>Account<br /><span className="lp-left-gradient">Recovery</span></>}
            </h1>
            <p className="lp-left-desc">State-of-the-art platform for institutional clearance and academic management.</p>
          </div>
        </div>

        <div className="lp-right">
          <div className="lp-card">
            <div className="lp-card-accent" />
            {view !== "login" && (
              <button className="lp-btn-back" onClick={() => { setView("login"); setError(""); setSuccess(""); }}>
                <ArrowLeftIcon style={{ width: 20, height: 20 }} />
              </button>
            )}

            <div className="lp-card-header">
              <div className="lp-card-icon">{view === "login" ? "🛡️" : "🔑"}</div>
              <h2 className="lp-card-title">
                {view === "login" ? "Welcome back" : view === "forgot-email" ? "Forgot Password" : view === "forgot-code" ? "Identity Verification" : "Update Password"}
              </h2>
              <p className="lp-card-sub">
                {view === "login" ? "Authorized access only" : view === "forgot-email" ? "Enter registered email to receive security code" : view === "forgot-code" ? "Enter the secure 8-digit code from your email" : "Establish a new secure credential"}
              </p>
            </div>

            {error && <div className="lp-alert lp-alert-error"><span>⚠️</span> {error}</div>}
            {success && <div className="lp-alert lp-alert-success"><span>✓</span> {success}</div>}

            {view === "login" && (
              <form onSubmit={handleLogin} className="lp-form">
                <div className="lp-field">
                  <label className="lp-label">Email Address</label>
                  <div className="lp-input-wrap">
                    <span className="lp-input-icon">✉️</span>
                    <input type="email" placeholder="you@university.edu" value={email} onChange={(e) => setEmail(e.target.value)} className="lp-input" required />
                  </div>
                </div>
                <div className="lp-field">
                  <label className="lp-label">Password</label>
                  <div className="lp-input-wrap">
                    <span className="lp-input-icon">🔑</span>
                    <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="lp-input" required />
                  </div>
                </div>
                <div className="lp-row">
                  <label className="lp-check"><input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} /><span>Remember me</span></label>
                  <button type="button" className="lp-link-btn" onClick={() => setView("forgot-email")}>Forgot password?</button>
                </div>
                <button type="submit" disabled={loading} className="lp-btn-primary">{loading ? "Authenticating..." : "Sign In →"}</button>
                <div className="lp-divider"><span>Internal Access</span></div>
                <button type="button" className="lp-btn-secondary" onClick={() => router.push("/signup")}>Register New Account</button>
              </form>
            )}

            {view === "forgot-email" && (
              <form onSubmit={handleForgotEmail} className="lp-form slide-in">
                <div className="lp-field">
                  <label className="lp-label">Registered Email</label>
                  <div className="lp-input-wrap">
                    <span className="lp-input-icon">✉️</span>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="lp-input" placeholder="Enter your email" required />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="lp-btn-primary mt-3">{loading ? "Processing..." : "Generate Security Code"}</button>
              </form>
            )}

            {view === "forgot-code" && (
              <form onSubmit={handleVerifyCode} className="lp-form slide-in">
                <div className="code-inputs">
                  {resetCode.map((digit, idx) => (
                    <input key={idx} id={`code-${idx}`} type="text" maxLength="1" value={digit} onChange={(e) => handleCodeChange(idx, e.target.value)} className="code-input" autoComplete="one-time-code" />
                  ))}
                </div>
                <div className="timer-box">
                  <div className="timer-label">Code Validity</div>
                  <div className={`timer-value ${timer < 20 ? "timer-low" : ""}`}>{formatTime(timer)}</div>
                </div>
                <button type="submit" disabled={loading} className="lp-btn-primary mt-4">{loading ? "Verifying..." : "Confirm Identity"}</button>
                <div className="text-center mt-3">
                  <button type="button" className="lp-link-btn" disabled={timer > 0 || loading} onClick={handleForgotEmail}>Request New Code</button>
                </div>
              </form>
            )}

            {view === "forgot-reset" && (
              <form onSubmit={handleResetPassword} className="lp-form slide-in">
                <div className="lp-field">
                  <label className="lp-label">New Secure Password</label>
                  <div className="lp-input-wrap">
                    <span className="lp-input-icon">🔒</span>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="lp-input" placeholder="Minimum 8 characters" required />
                  </div>
                </div>
                <div className="lp-field">
                  <label className="lp-label">Verify New Password</label>
                  <div className="lp-input-wrap">
                    <span className="lp-input-icon">🔒</span>
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="lp-input" placeholder="Repeat new password" required />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="lp-btn-primary mt-4">{loading ? "Securing Account..." : "Finalize Password Update"}</button>
              </form>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .lp-btn-back { position: absolute; top: 2rem; left: 2rem; background: rgba(148, 163, 184, 0.1); border: none; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #94A3B8; transition: all 0.2s ease; cursor: pointer; }
        .lp-btn-back:hover { background: rgba(59, 130, 246, 0.1); color: #3B82F6; transform: translateX(-3px); }
        .lp-link-btn { background: none; border: none; color: #3B82F6; font-size: 0.9rem; font-weight: 600; cursor: pointer; }
        .lp-link-btn:disabled { color: #64748B; cursor: not-allowed; text-decoration: none; opacity: 0.5; }
        .slide-in { animation: slideIn 0.4s ease-out; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .code-inputs { display: flex; gap: 0.5rem; justify-content: center; margin: 1.5rem 0; flex-wrap: wrap; }
        .code-input { width: 34px; height: 44px; border-radius: 10px; border: 2px solid rgba(148, 163, 184, 0.2); background: rgba(30, 41, 59, 0.5); color: white; text-align: center; font-size: 1.2rem; font-weight: 700; }
        .code-input:focus { border-color: #3B82F6; outline: none; box-shadow: 0 0 15px rgba(59, 130, 246, 0.3); }
        .timer-box { text-align: center; }
        .timer-label { font-size: 0.7rem; color: #94A3B8; text-transform: uppercase; }
        .timer-value { font-size: 1.2rem; font-weight: 800; color: #3B82F6; }
        .timer-low { color: #EF4444; animation: pulse 1s infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        
        @media (max-width: 480px) {
          .code-input { width: 30px; height: 40px; font-size: 1.1rem; }
          .code-inputs { gap: 0.35rem; }
        }
      `}</style>
    </div>
  );
}
