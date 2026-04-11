"use client";
import React, { useEffect, useRef, useState } from "react";
import { Container, Row, Col, Form, Button, Alert, Spinner, InputGroup } from "react-bootstrap";
import { useRouter } from "next/navigation";
import { signupUser, validateEmail, validatePassword, validateName, checkEmailExists, withTimeout } from "@/lib/authService";
import { supabase } from "@/lib/supabaseClient";
import { getDashboardPathForRole } from "@/lib/roleRouting";
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
  // Real-time email check state
  const [emailCheck, setEmailCheck] = useState({ status: "idle" }); // idle | checking | taken | available | error

  // Fallback departments list used when DB is unreachable or RLS blocks unauthenticated reads
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
      { name: "Computer Science" },
      { name: "Engineering" },
      { name: "Business" },
      { name: "Library" },
      { name: "Accounts & Finance" },
      { name: "Hostel" },
      { name: "IT Department" },
      { name: "Registrar Office" },
    ];

    if (!silent) {
      setSeedingDepartments(true);
      setSeedDepartmentsError("");
    }

    try {
      const inserted = await supabase.from("departments").insert(seedNameOnly);
      const insertError = inserted?.error ?? null;

      if (insertError) {
        const msg = String(insertError?.message || "").toLowerCase();
        const isDuplicate = msg.includes("duplicate") || msg.includes("unique");
        if (!isDuplicate && !silent) {
          setSeedDepartmentsError(insertError?.message || "Unable to seed departments. RLS policy may be blocking inserts.");
          return false;
        }
      }

      const reloaded = await supabase
        .from("departments")
        .select("id, name")
        .order("name", { ascending: true });

      if (!reloaded?.error && Array.isArray(reloaded?.data) && reloaded.data.length > 0) {
        setDepartments(reloaded.data);
        return true;
      }

      // Even if seeding succeeded, DB might still block reads — use fallback
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
        if (!cancelled) {
          setDepartmentsLoading(true);
          setDepartmentsLoadError("");
        }

        const { data, error } = await withTimeout(
          supabase
            .from("departments")
            .select("id, name")
            .order("name", { ascending: true }),
          5000,
          "Department Load"
        );

        if (cancelled) return;

        // No error and we have real departments from DB
        if (!error && Array.isArray(data) && data.length > 0) {
          setDepartments(data);
          return;
        }

        // RLS block or empty table — use fallback so form still works
        // Also silently try to seed if on localhost
        if (isLocalhost && !seedAttemptedRef.current) {
          seedAttemptedRef.current = true;
          await seedDefaultDepartments({ silent: true });
          // seedDefaultDepartments already sets state, just return
          return;
        }

        // Production or seeding skipped — use hardcoded fallback
        // NOTE: These IDs are placeholders; actual UUIDs will come from Supabase
        // after admin runs fix_rls_policies.sql. Signup will store the selected
        // name in user metadata until DB lookup is available.
        setDepartments(FALLBACK_DEPARTMENTS);
      } catch (e) {
        if (cancelled) return;
        // On any error, still show fallback so form isn't broken
        setDepartments(FALLBACK_DEPARTMENTS);
        setDepartmentsLoadError(""); // Clear error since fallback is available
      } finally {
        if (!cancelled) setDepartmentsLoading(false);
      }
    };

    loadDepartments();
    return () => { cancelled = true; };
  }, []);
  // Debounced real-time email check
  useEffect(() => {
    if (!email || !validateEmail(email)) {
      setEmailCheck({ status: "idle" });
      return;
    }

    setEmailCheck({ status: "checking" });
    const timer = setTimeout(async () => {
      try {
        const result = await checkEmailExists(email);
        if (result.exists) {
          setEmailCheck({ status: "taken" });
        } else if (result.checked) {
          setEmailCheck({ status: "available" });
        } else {
          setEmailCheck({ status: "idle" }); // Couldn't determine — don't block
        }
      } catch {
        setEmailCheck({ status: "idle" });
      }
    }, 700); // 700ms debounce

    return () => clearTimeout(timer);
  }, [email]);



  const getPasswordStrength = (pwd) => {
    if (!pwd) return { strength: 0, label: "None", color: "strength-weak" };
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (pwd.length >= 12) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;

    if (strength < 2) return { strength: 25, label: "Weak", color: "strength-weak" };
    if (strength < 3) return { strength: 50, label: "Fair", color: "strength-fair" };
    if (strength < 4) return { strength: 75, label: "Good", color: "strength-good" };
    return { strength: 100, label: "Strong", color: "strength-strong" };
  };

  const passwordStrength = getPasswordStrength(password);

  const validateForm = () => {
    const errors = {};

    if (!validateName(name)) errors.name = "Name must be at least 2 characters";
    if (!validateEmail(email)) errors.email = "Invalid email address";
    if (!validatePassword(password)) errors.password = "Password must be at least 8 characters";
    if (password !== confirmPassword) errors.confirmPassword = "Passwords do not match";
    if (!agreeTerms) errors.terms = "You must agree to the terms";
    if (role === "student" && !rollNumber) errors.rollNumber = "Roll number is required for students";

    const roleNeedsDepartment = role === "student" || role === "department";
    if (roleNeedsDepartment) {
      if (departmentsLoadError) {
        errors.department = "Unable to load departments from the database. Check your Supabase setup/key and try again.";
      } else if (!departmentsLoading && departments.length === 0) {
        errors.department = "No departments exist yet. Click 'Add default departments' or sign up as Admin first.";
      } else if (!departmentId) {
        errors.department = role === "student" ? "Department is required for students" : "Department is required for department staff";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!validateForm()) return;

    setLoading(true);
    let navigating = false;

    try {
      const additionalData = {};
      
      // Map department data if applicable
      if (role === "student" || role === "department") {
        const selectedDept = departments.find(d => d.id === departmentId);
        additionalData.department_id = departmentId;
        additionalData.department_name = selectedDept ? selectedDept.name : "";
        
        if (role === "student") {
          additionalData.roll_number = rollNumber;
          additionalData.session = "2023-2027"; // Default session
        }
      }

      const result = await signupUser(email, password, name, role, additionalData);

      if (result.success) {
        if (result.needsEmailConfirmation) {
          setSuccess("✓ Registration successful! Please verify your institutional email.");
          return;
        }

        setSuccess("✓ Welcome to the Smart Clearance System! Redirecting...");
        navigating = true;
        
        // Use the role from either the metadata we just sent or the result user
        const finalRole = result.user?.user_metadata?.role || role;
        
        setTimeout(() => {
          router.replace(getDashboardPathForRole(finalRole));
        }, 800);
        return;
      } else {
        setError(result.error || "Execution failed. Please verify credentials.");
      }
    } catch (err) {
      setError("A database exception occurred. Contact system administrator.");
      console.warn("Signup error:", err);
    } finally {
      if (!navigating) setLoading(false);
    }
  };

  return (
    <div className="auth-bg-enhanced d-flex align-items-center min-vh-100">
      <Container className="auth-content-enhanced">
        <Row className="align-items-center min-vh-100 g-5">
          {/* Left Side - Illustration */}
          <Col lg={6} className="auth-illustration-enhanced d-none d-lg-flex">
            <div>
              <h1 className="fw-bold display-3">Official Enrollment</h1>
              <p className="lead">Join the official Smart Clearance & Degree Issuance portal of the University.</p>

              <ul className="feature-list mt-4">
                <li>Automated Departmental Verification</li>
                <li>Instant Digital Degree Issuance</li>
                <li>Encrypted Student Data Management</li>
              </ul>
            </div>
          </Col>

          {/* Right Side - Signup Form */}
          <Col lg={6} md={10} sm={12} className="mx-auto">
            <div className="auth-card-enhanced p-5 shadow-lg">
              {/* Header */}
              <div className="auth-header-enhanced mb-4">
                <div className="display-1 mb-3">🎓</div>
                <h2 className="fw-bold">Create Profile</h2>
                <p className="text-muted">Register your institutional identity</p>
              </div>

              {/* Error Alert */}
              {error && (
                <Alert className="alert-enhanced alert-danger-enhanced mb-4" onClose={() => setError("")} dismissible>
                  <span>⚠️</span> {error}
                </Alert>
              )}

              {/* Success Alert */}
              {success && (
                <Alert className="alert-enhanced alert-success-enhanced mb-4">
                  <span>✓</span> {success}
                </Alert>
              )}

              {/* Signup Form */}
              <Form onSubmit={handleSignup}>
                {/* Name Field */}
                <div className="form-group-enhanced">
                  <Form.Label className="form-label-enhanced">Full Name</Form.Label>
                  <InputGroup className="input-group-enhanced">
                    <InputGroup.Text>👤</InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder="Your full name"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (formErrors.name) setFormErrors({ ...formErrors, name: "" });
                      }}
                      className={`input-enhanced ${formErrors.name ? "is-invalid" : ""}`}
                      disabled={loading}
                    />
                  </InputGroup>
                  {formErrors.name && <div className="form-error-enhanced">⚠️ {formErrors.name}</div>}
                </div>

                {/* Email Field */}
                <div className="form-group-enhanced">
                  <Form.Label className="form-label-enhanced">Email Address</Form.Label>
                  <InputGroup className="input-group-enhanced">
                    <InputGroup.Text>📧</InputGroup.Text>
                    <Form.Control
                      type="email"
                      placeholder="you@university.edu"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (formErrors.email) setFormErrors({ ...formErrors, email: "" });
                      }}
                      className={`input-enhanced ${
                        emailCheck.status === "taken" || formErrors.email ? "is-invalid" :
                        emailCheck.status === "available" ? "is-valid" : ""
                      }`}
                      disabled={loading}
                    />
                    {/* Real-time status indicator */}
                    {emailCheck.status === "checking" && (
                      <InputGroup.Text style={{ background: "transparent", border: "none", color: "#6c757d" }}>
                        <Spinner animation="border" size="sm" />
                      </InputGroup.Text>
                    )}
                    {emailCheck.status === "available" && (
                      <InputGroup.Text style={{ background: "transparent", border: "none", color: "#198754" }}>
                        <span style={{ fontSize: "1rem" }}>✅</span>
                      </InputGroup.Text>
                    )}
                    {emailCheck.status === "taken" && (
                      <InputGroup.Text style={{ background: "transparent", border: "none", color: "#dc3545" }}>
                        <span style={{ fontSize: "1rem" }}>❌</span>
                      </InputGroup.Text>
                    )}
                  </InputGroup>
                  {emailCheck.status === "taken" && (
                    <div style={{ color: "#dc3545", fontSize: "0.85rem", marginTop: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                      ⚠️ This email is already registered.{" "}
                      <button
                        type="button"
                        onClick={() => router.push("/login")}
                        style={{ background: "none", border: "none", color: "#4f46e5", cursor: "pointer", textDecoration: "underline", fontSize: "0.85rem", padding: 0 }}
                      >
                        Login instead →
                      </button>
                    </div>
                  )}
                  {emailCheck.status === "available" && (
                    <div style={{ color: "#198754", fontSize: "0.85rem", marginTop: "6px" }}>✓ Email is available</div>
                  )}
                  {formErrors.email && <div className="form-error-enhanced">⚠️ {formErrors.email}</div>}
                </div>

                {/* Account Type Field */}
                <div className="form-group-enhanced">
                  <Form.Label className="form-label-enhanced">Account Type</Form.Label>
                  <Form.Select
                    value={role}
                    onChange={(e) => {
                      setRole(e.target.value);
                      if (formErrors.role) setFormErrors({ ...formErrors, role: "" });
                    }}
                    className="select-enhanced"
                    disabled={loading}
                  >
                    <option value="student">👨‍🎓 Student</option>
                    <option value="department">🏢 Department Staff</option>
                    <option value="admin">🔐 Administrator</option>
                    <option value="examiner">📋 Examiner</option>
                  </Form.Select>
                  {formErrors.role && <div className="form-error-enhanced">⚠️ {formErrors.role}</div>}
                </div>

                {/* Student-specific fields */}
                {role === "student" && (
                  <>
                    <div className="form-group-enhanced">
                      <Form.Label className="form-label-enhanced">Roll Number</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="e.g., CS-2022-001"
                        value={rollNumber}
                        onChange={(e) => {
                          setRollNumber(e.target.value);
                          if (formErrors.rollNumber) setFormErrors({ ...formErrors, rollNumber: "" });
                        }}
                        className={`input-enhanced ${formErrors.rollNumber ? "is-invalid" : ""}`}
                        disabled={loading}
                      />
                      {formErrors.rollNumber && <div className="form-error-enhanced">⚠️ {formErrors.rollNumber}</div>}
                    </div>

                    <div className="form-group-enhanced">
                      <Form.Label className="form-label-enhanced">Department</Form.Label>
                      <Form.Select
                        value={departmentId}
                        onChange={(e) => {
                          setDepartmentId(e.target.value);
                          if (formErrors.department) setFormErrors({ ...formErrors, department: "" });
                        }}
                        className="select-enhanced"
                        disabled={loading || departmentsLoading || departments.length === 0}
                      >
                        {departmentsLoading ? (
                          <option value="">Loading departments...</option>
                        ) : departments.length === 0 ? (
                          <option value="">No departments available</option>
                        ) : (
                          <>
                            <option value="">Select Department</option>
                            {departments.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name}
                              </option>
                            ))}
                          </>
                        )}
                      </Form.Select>
                      {formErrors.department && <div className="form-error-enhanced">⚠️ {formErrors.department}</div>}
                      {!departmentsLoading && departments.length === 0 && !departmentsLoadError && isLocalhost && (
                        <div style={{ marginTop: "10px" }}>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline-primary"
                            disabled={seedingDepartments}
                            onClick={() => seedDefaultDepartments({ silent: false })}
                            style={{ width: "100%" }}
                          >
                            {seedingDepartments ? "Adding..." : "Add default departments"}
                          </Button>
                          {seedDepartmentsError && <div className="form-error-enhanced" style={{ marginTop: "8px" }}>⚠️ {seedDepartmentsError}</div>}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Department staff-specific fields */}
                {role === "department" && (
                  <div className="form-group-enhanced">
                    <Form.Label className="form-label-enhanced">Department</Form.Label>
                    <Form.Select
                      value={departmentId}
                      onChange={(e) => {
                        setDepartmentId(e.target.value);
                        if (formErrors.department) setFormErrors({ ...formErrors, department: "" });
                      }}
                      className="select-enhanced"
                      disabled={loading || departmentsLoading || departments.length === 0}
                    >
                      {departmentsLoading ? (
                        <option value="">Loading departments...</option>
                      ) : departments.length === 0 ? (
                        <option value="">No departments available</option>
                      ) : (
                        <>
                          <option value="">Select Department</option>
                          {departments.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))}
                        </>
                      )}
                    </Form.Select>
                    {formErrors.department && <div className="form-error-enhanced">⚠️ {formErrors.department}</div>}
                    {!departmentsLoading && departments.length === 0 && !departmentsLoadError && isLocalhost && (
                      <div style={{ marginTop: "10px" }}>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline-primary"
                          disabled={seedingDepartments}
                          onClick={() => seedDefaultDepartments({ silent: false })}
                          style={{ width: "100%" }}
                        >
                          {seedingDepartments ? "Adding..." : "Add default departments"}
                        </Button>
                        {seedDepartmentsError && <div className="form-error-enhanced" style={{ marginTop: "8px" }}>⚠️ {seedDepartmentsError}</div>}
                      </div>
                    )}
                  </div>
                )}

                {/* Password Field */}
                <div className="form-group-enhanced">
                  <Form.Label className="form-label-enhanced">Password</Form.Label>
                  <InputGroup className="input-group-enhanced">
                    <InputGroup.Text>🔒</InputGroup.Text>
                    <Form.Control
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (formErrors.password) setFormErrors({ ...formErrors, password: "" });
                      }}
                      className={`input-enhanced ${formErrors.password ? "is-invalid" : ""}`}
                      disabled={loading}
                    />
                    <Button
                      variant="light"
                      className="btn-icon-enhanced"
                      onClick={() => setShowPassword(!showPassword)}
                      type="button"
                    >
                      {showPassword ? "👁️" : "👁️‍🗨️"}
                    </Button>
                  </InputGroup>
                  {password && (
                    <div style={{ marginTop: "8px" }}>
                      <div className="password-strength-bar">
                        <div className={`password-strength-fill ${passwordStrength.color}`}></div>
                      </div>
                      <div className="strength-label" style={{ color: passwordStrength.color === "strength-weak" ? "#dc2626" : passwordStrength.color === "strength-fair" ? "#f59e0b" : passwordStrength.color === "strength-good" ? "#3b82f6" : "#10b981" }}>
                        Strength: {passwordStrength.label}
                      </div>
                    </div>
                  )}
                  {formErrors.password && <div className="form-error-enhanced">⚠️ {formErrors.password}</div>}
                </div>

                {/* Confirm Password Field */}
                <div className="form-group-enhanced">
                  <Form.Label className="form-label-enhanced">Confirm Password</Form.Label>
                  <InputGroup className="input-group-enhanced">
                    <InputGroup.Text>🔒</InputGroup.Text>
                    <Form.Control
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (formErrors.confirmPassword) setFormErrors({ ...formErrors, confirmPassword: "" });
                      }}
                      className={`input-enhanced ${formErrors.confirmPassword ? "is-invalid" : ""}`}
                      disabled={loading}
                    />
                    <Button
                      variant="light"
                      className="btn-icon-enhanced"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      type="button"
                    >
                      {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
                    </Button>
                  </InputGroup>
                  {formErrors.confirmPassword && <div className="form-error-enhanced">⚠️ {formErrors.confirmPassword}</div>}
                </div>

                {/* Terms Agreement */}
                <div className="form-group-enhanced">
                  <Form.Check
                    type="checkbox"
                    id="agreeTerms"
                    label={
                      <>
                        I agree to the <a href="#" className="link-enhanced">Terms of Service</a> and <a href="#" className="link-enhanced">Privacy Policy</a>
                      </>
                    }
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="form-check-enhanced"
                  />
                  {formErrors.terms && <div className="form-error-enhanced">⚠️ {formErrors.terms}</div>}
                </div>

                {/* Signup Button */}
                <Button
                  type="submit"
                  size="lg"
                  className="btn-auth-enhanced btn-primary-enhanced w-100 mb-3"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      ➜ Create Account
                    </>
                  )}
                </Button>

                {/* Divider */}
                <div className="divider-enhanced">
                  <span>Already have an account?</span>
                </div>

                {/* Sign In Link */}
                <Button
                  type="button"
                  size="lg"
                  className="btn-auth-enhanced btn-secondary-enhanced w-100"
                  onClick={() => router.push("/login")}
                >
                  Sign In Instead
                </Button>
              </Form>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
}
