"use client";
import React, { useEffect, useRef, useState } from "react";
import { Spinner } from "react-bootstrap";
import { useRouter } from "next/navigation";
import { signupUser, validateEmail, validatePassword, validateName, checkEmailExists, withTimeout } from "@/lib/authService";
import { supabase } from "@/lib/supabaseClient";
import { getDashboardPathForRole } from "@/lib/roleRouting";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import "../../styles/auth-enhanced.css";

export default function SignupPage() {
  const router = useRouter();
  const seedAttemptedRef = useRef(false);
  const isLocalhost = typeof window !== "undefined" && window.location?.hostname === "localhost";

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("student");
  const [rollNumber, setRollNumber] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [departments, setDepartments] = useState([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [departmentsLoadError, setDepartmentsLoadError] = useState("");
  const [seedingDepartments, setSeedingDepartments] = useState(false);
  const [seedDepartmentsError, setSeedDepartmentsError] = useState("");

  // UI states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [emailCheck, setEmailCheck] = useState({ status: "idle" });

  const FALLBACK_DEPARTMENTS = [
    { id: "lib", name: "Library" },
    { id: "fin", name: "Accounts & Finance" },
    { id: "hos", name: "Hostel" },
    { id: "lab", name: "Laboratory" },
    { id: "spo", name: "Sports" },
    { id: "hlt", name: "Health Center" },
    { id: "it", name: "IT Department" },
    { id: "reg", name: "Registrar Office" },
    { id: "cs", name: "Computer Science" },
    { id: "eng", name: "Engineering" },
    { id: "bus", name: "Business" },
  ];

  const seedDefaultDepartments = async ({ silent } = { silent: false }) => {
    const seedNameOnly = [
      { name: "Computer Science" }, { name: "Engineering" }, { name: "Business" },
      { name: "Library" }, { name: "Accounts & Finance" }, { name: "Hostel" },
      { name: "IT Department" }, { name: "Registrar Office" },
    ];
    if (!silent) { setSeedingDepartments(true); setSeedDepartmentsError(""); }
    try {
      const inserted = await supabase.from("departments").insert(seedNameOnly);
      const insertError = inserted?.error ?? null;
      if (insertError) {
        const msg = String(insertError?.message || "").toLowerCase();
        const isDuplicate = msg.includes("duplicate") || msg.includes("unique");
        if (!isDuplicate && !silent) { setSeedDepartmentsError(insertError?.message || "Unable to seed departments."); return false; }
      }
      const reloaded = await supabase.from("departments").select("id, name").order("name", { ascending: true });
      if (!reloaded?.error && Array.isArray(reloaded?.data) && reloaded.data.length > 0) { setDepartments(reloaded.data); return true; }
      setDepartments(FALLBACK_DEPARTMENTS);
      return true;
    } catch (e) {
      if (!silent) setSeedDepartmentsError(e?.message || "Unable to seed departments");
      setDepartments(FALLBACK_DEPARTMENTS);
      return false;
    } finally {
      if (!silent) setSeedingDepartments(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const loadDepartments = async () => {
      try {
        if (!cancelled) { setDepartmentsLoading(true); setDepartmentsLoadError(""); }
        const { data, error } = await withTimeout(
          supabase.from("departments").select("id, name").order("name", { ascending: true }),
          5000, "Department Load"
        );
        if (cancelled) return;
        if (!error && Array.isArray(data) && data.length > 0) { setDepartments(data); return; }
        if (isLocalhost && !seedAttemptedRef.current) { seedAttemptedRef.current = true; await seedDefaultDepartments({ silent: true }); return; }
        setDepartments(FALLBACK_DEPARTMENTS);
      } catch (e) {
        if (cancelled) return;
        setDepartments(FALLBACK_DEPARTMENTS);
        setDepartmentsLoadError("");
      } finally {
        if (!cancelled) setDepartmentsLoading(false);
      }
    };
    loadDepartments();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!email || !validateEmail(email)) { setEmailCheck({ status: "idle" }); return; }
    setEmailCheck({ status: "checking" });
    const timer = setTimeout(async () => {
      try {
        const result = await checkEmailExists(email);
        if (result.exists) setEmailCheck({ status: "taken" });
        else if (result.checked) setEmailCheck({ status: "available" });
        else setEmailCheck({ status: "idle" });
      } catch { setEmailCheck({ status: "idle" }); }
    }, 700);
    return () => clearTimeout(timer);
  }, [email]);

  const getPasswordStrength = (pwd) => {
    if (!pwd) return { strength: 0, label: "None", color: "#94A3B8" };
    let s = 0;
    if (pwd.length >= 8) s++;
    if (pwd.length >= 12) s++;
    if (/[0-9]/.test(pwd)) s++;
    if (/[A-Z]/.test(pwd)) s++;
    if (/[^A-Za-z0-9]/.test(pwd)) s++;
    if (s < 2) return { strength: 25, label: "Weak", color: "#DC2626" };
    if (s < 3) return { strength: 50, label: "Fair", color: "#D97706" };
    if (s < 4) return { strength: 75, label: "Good", color: "#3B82F6" };
    return { strength: 100, label: "Strong", color: "#059669" };
  };
  const pwdStrength = getPasswordStrength(password);

  /**
   * Auto-formats roll number to FA23-BCS-035 pattern.
   * Pattern: [2 alpha][2 digit] - [2-4 alpha] - [3 digit]
   * Dashes are inserted automatically as the user types.
   */
  const formatRollNumber = (input) => {
    // Strip everything except alphanumeric and uppercase
    const clean = input.replace(/[^A-Z0-9]/gi, "").toUpperCase();
    if (!clean) return "";

    // Part 1: first 4 raw chars → e.g. FA23
    const part1 = clean.slice(0, 4);
    if (clean.length <= 4) return part1;

    // Part 2: consecutive alpha chars after part1 (dept code, e.g. BCS), max 4
    let p2End = 4;
    while (p2End < clean.length && p2End < 8 && /[A-Z]/i.test(clean[p2End])) {
      p2End++;
    }
    const part2 = clean.slice(4, p2End);
    if (!part2) return part1;

    // Part 3: next 3 digit chars (roll digits, e.g. 035)
    const part3 = clean.slice(p2End, p2End + 3).replace(/[^0-9]/g, "");

    return part1 + "-" + part2 + (part3 ? "-" + part3 : "");
  };

  const ROLL_REGEX = /^[A-Z]{2}\d{2}-[A-Z]{2,4}-\d{3}$/;

  const validateForm = () => {
    const errors = {};
    if (!validateName(name)) errors.name = "Name must be at least 2 characters";
    if (!validateEmail(email)) errors.email = "Invalid email address";
    if (!validatePassword(password)) errors.password = "Password must be at least 8 characters";
    if (password !== confirmPassword) errors.confirmPassword = "Passwords do not match";
    if (!agreeTerms) errors.terms = "You must agree to the terms";
    if (role === "student") {
      if (!rollNumber) {
        errors.rollNumber = "Roll number is required for students";
      } else if (!ROLL_REGEX.test(rollNumber)) {
        errors.rollNumber = "Format must be FA23-BCS-035 (semester·year-dept-number)";
      }
    }
    const roleNeedsDepartment = role === "student" || role === "department";
    if (roleNeedsDepartment) {
      if (departmentsLoadError) errors.department = "Unable to load departments from the database.";
      else if (!departmentsLoading && departments.length === 0) errors.department = "No departments available. Contact admin.";
      else if (!departmentId) errors.department = role === "student" ? "Department is required for students" : "Department is required for staff";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!validateForm()) return;
    setLoading(true);
    let navigating = false;
    try {
      const additionalData = {};
      if (role === "student" || role === "department") {
        const selectedDept = departments.find(d => d.id === departmentId);
        additionalData.department_id = departmentId;
        additionalData.department_name = selectedDept ? selectedDept.name : "";
        if (role === "student") { additionalData.roll_number = rollNumber; additionalData.session = "2023-2027"; }
      }
      const result = await signupUser(email, password, name, role, additionalData);
      if (result.success) {
        if (result.needsEmailConfirmation) { setSuccess("Registration successful! Please verify your institutional email."); return; }
        setSuccess("Welcome to the Smart Clearance System! Redirecting...");
        navigating = true;
        const finalRole = result.user?.user_metadata?.role || role;
        setTimeout(() => { router.replace(getDashboardPathForRole(finalRole)); }, 800);
      } else {
        setError(result.error || "Registration failed. Please verify your details.");
      }
    } catch (err) {
      setError("A database exception occurred. Contact system administrator.");
    } finally {
      if (!navigating) setLoading(false);
    }
  };

  const renderDeptSelect = () => (
    <div className="lp-field">
      <label className="lp-label">Department</label>
      <div className={`lp-input-wrap ${formErrors.department ? "lp-input-error" : ""}`}>
        <select
          value={departmentId}
          onChange={(e) => { setDepartmentId(e.target.value); setFormErrors({ ...formErrors, department: "" }); }}
          disabled={loading || departmentsLoading || departments.length === 0}
          className="lp-input lp-select"
        >
          {departmentsLoading ? <option value="">Loading departments...</option>
            : departments.length === 0 ? <option value="">No departments available</option>
            : <>
                <option value="">Select Department</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </>
          }
        </select>
      </div>
      {formErrors.department && <div className="lp-field-error">{formErrors.department}</div>}
      {!departmentsLoading && departments.length === 0 && !departmentsLoadError && isLocalhost && (
        <button type="button" className="lp-seed-btn" disabled={seedingDepartments} onClick={() => seedDefaultDepartments({ silent: false })}>
          {seedingDepartments ? "Adding departments..." : "+ Add default departments"}
        </button>
      )}
      {seedDepartmentsError && <div className="lp-field-error">{seedDepartmentsError}</div>}
    </div>
  );

  return (
    <div className="lp-root">
      <div className="lp-blob lp-blob-1" />
      <div className="lp-blob lp-blob-2" />

      <div className="lp-split">
        {/* LEFT PANEL */}
        <div className="lp-left">
          <div className="lp-left-inner">
            <Link href="/" className="lp-back">← Back to home</Link>
            <div className="lp-left-badge">🎓 Official Academic Portal</div>
            <h1 className="lp-left-title">
              Join the<br />
              <span className="lp-left-gradient">Smart Clearance</span><br />
              System
            </h1>
            <p className="lp-left-desc">
              Register your institutional identity and get instant access to
              clearance management and degree issuance.
            </p>
            <div className="lp-features">
              <div className="lp-feature-item">
                <div className="lp-feature-icon">🔄</div>
                <div>
                  <div className="lp-feature-title">Automated Verification</div>
                  <div className="lp-feature-sub">Multi-department clearance tracking</div>
                </div>
              </div>
              <div className="lp-feature-item">
                <div className="lp-feature-icon">📄</div>
                <div>
                  <div className="lp-feature-title">Digital Degrees</div>
                  <div className="lp-feature-sub">Instantly issued & verifiable</div>
                </div>
              </div>
              <div className="lp-feature-item">
                <div className="lp-feature-icon">🛡️</div>
                <div>
                  <div className="lp-feature-title">Encrypted Data</div>
                  <div className="lp-feature-sub">Your records are fully secured</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="lp-right" style={{ flex: "0 0 560px" }}>
          <div className="lp-card" style={{ maxWidth: 500 }}>
            <div className="lp-card-accent" />

            <div className="lp-card-header">
              <div className="lp-card-icon">✨</div>
              <h2 className="lp-card-title">Create Account</h2>
              <p className="lp-card-sub">Register your institutional identity</p>
            </div>

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

            <form onSubmit={handleSignup} className="lp-form">
              {/* Full Name */}
              <div className="lp-field">
                <label className="lp-label">Full Name</label>
                <div className={`lp-input-wrap ${formErrors.name ? "lp-input-error" : ""}`}>
                  <span className="lp-input-icon">👤</span>
                  <input type="text" placeholder="Your full name" value={name}
                    onChange={(e) => { setName(e.target.value); setFormErrors({ ...formErrors, name: "" }); }}
                    disabled={loading} className="lp-input" />
                </div>
                {formErrors.name && <div className="lp-field-error">{formErrors.name}</div>}
              </div>

              {/* Email */}
              <div className="lp-field">
                <label className="lp-label">Email Address</label>
                <div className={`lp-input-wrap ${formErrors.email || emailCheck.status === "taken" ? "lp-input-error" : emailCheck.status === "available" ? "lp-input-ok" : ""}`}>
                  <span className="lp-input-icon">✉️</span>
                  <input type="email" placeholder="you@university.edu" value={email}
                    onChange={(e) => { setEmail(e.target.value); setFormErrors({ ...formErrors, email: "" }); }}
                    disabled={loading} className="lp-input" />
                  {emailCheck.status === "checking" && <Spinner animation="border" size="sm" style={{ color: "var(--text-muted)", flexShrink: 0 }} />}
                  {emailCheck.status === "available" && <span style={{ color: "#059669", fontSize: "1rem", flexShrink: 0 }}>✅</span>}
                  {emailCheck.status === "taken" && <span style={{ color: "#DC2626", fontSize: "1rem", flexShrink: 0 }}>❌</span>}
                </div>
                {emailCheck.status === "taken" && (
                  <div className="lp-field-error">
                    Email already registered.{" "}
                    <button type="button" onClick={() => router.push("/login")} className="lp-inline-link">Login instead →</button>
                  </div>
                )}
                {emailCheck.status === "available" && <div className="lp-field-ok">✓ Email is available</div>}
                {formErrors.email && <div className="lp-field-error">{formErrors.email}</div>}
              </div>

              {/* Account Type */}
              <div className="lp-field">
                <label className="lp-label">Account Type</label>
                <div className="lp-input-wrap">
                  <select value={role} onChange={(e) => { setRole(e.target.value); }} disabled={loading} className="lp-input lp-select">
                    <option value="student">👨‍🎓 Student</option>
                    <option value="department">🏢 Department Staff</option>
                    <option value="admin">🔐 Administrator</option>
                    <option value="examiner">📋 Examiner</option>
                  </select>
                </div>
              </div>

              {/* Student: Roll Number + Department */}
              {role === "student" && (
                <>
                  <div className="lp-field">
                    <label className="lp-label">Roll Number</label>
                    <div className={`lp-input-wrap ${formErrors.rollNumber ? "lp-input-error" : ""}`}>
                      <span className="lp-input-icon">🪪</span>
                      <input
                        type="text"
                        placeholder="e.g., FA23-BCS-035"
                        value={rollNumber}
                        onChange={(e) => {
                          const formatted = formatRollNumber(e.target.value);
                          setRollNumber(formatted);
                          setFormErrors({ ...formErrors, rollNumber: "" });
                        }}
                        maxLength={13}
                        disabled={loading}
                        className="lp-input"
                        autoCapitalize="characters"
                        spellCheck={false}
                      />
                    </div>
                    {formErrors.rollNumber && <div className="lp-field-error">{formErrors.rollNumber}</div>}
                  </div>
                  {renderDeptSelect()}
                </>
              )}

              {/* Department staff: Department only */}
              {role === "department" && renderDeptSelect()}

              {/* Password */}
              <div className="lp-field">
                <label className="lp-label">Password</label>
                <div className={`lp-input-wrap ${formErrors.password ? "lp-input-error" : ""}`}>
                  <span className="lp-input-icon">🔑</span>
                  <input type={showPassword ? "text" : "password"} placeholder="Create a strong password" value={password}
                    onChange={(e) => { setPassword(e.target.value); setFormErrors({ ...formErrors, password: "" }); }}
                    disabled={loading} className="lp-input" />
                  <button type="button" className="lp-eye-btn" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeSlashIcon style={{ width: 18, height: 18 }} /> : <EyeIcon style={{ width: 18, height: 18 }} />}
                  </button>
                </div>
                {password && (
                  <div className="lp-strength-bar-wrap">
                    <div className="lp-strength-bar">
                      <div className="lp-strength-fill" style={{ width: `${pwdStrength.strength}%`, background: pwdStrength.color }} />
                    </div>
                    <span className="lp-strength-label" style={{ color: pwdStrength.color }}>
                      {pwdStrength.label}
                    </span>
                  </div>
                )}
                {formErrors.password && <div className="lp-field-error">{formErrors.password}</div>}
              </div>

              {/* Confirm Password */}
              <div className="lp-field">
                <label className="lp-label">Confirm Password</label>
                <div className={`lp-input-wrap ${formErrors.confirmPassword ? "lp-input-error" : ""}`}>
                  <span className="lp-input-icon">🔒</span>
                  <input type={showConfirmPassword ? "text" : "password"} placeholder="Re-enter your password" value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setFormErrors({ ...formErrors, confirmPassword: "" }); }}
                    disabled={loading} className="lp-input" />
                  <button type="button" className="lp-eye-btn" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                    {showConfirmPassword ? <EyeSlashIcon style={{ width: 18, height: 18 }} /> : <EyeIcon style={{ width: 18, height: 18 }} />}
                  </button>
                </div>
                {formErrors.confirmPassword && <div className="lp-field-error">{formErrors.confirmPassword}</div>}
              </div>

              {/* Terms */}
              <div className="lp-field">
                <label className="lp-check">
                  <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} />
                  <span>I agree to the <a href="#" className="lp-link">Terms of Service</a> and <a href="#" className="lp-link">Privacy Policy</a></span>
                </label>
                {formErrors.terms && <div className="lp-field-error">{formErrors.terms}</div>}
              </div>

              {/* Submit */}
              <button type="submit" disabled={loading} className="lp-btn-primary">
                {loading ? (
                  <span className="lp-spinner">
                    <svg viewBox="0 0 24 24" fill="none" className="lp-spin" width="18" height="18">
                      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Creating Account...
                  </span>
                ) : "Create Account →"}
              </button>

              <div className="lp-divider"><span>Already have an account?</span></div>
              <button type="button" className="lp-btn-secondary" onClick={() => router.push("/login")}>
                Sign In Instead
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
