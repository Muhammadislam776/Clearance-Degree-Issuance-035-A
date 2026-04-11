"use client";
import React, { useEffect, useState } from "react";
import { Container, Row, Col, Form, Button, Alert, Spinner, InputGroup } from "react-bootstrap";
import { useRouter } from "next/navigation";
import { loginUser, validateEmail } from "@/lib/authService";
import { getDashboardPathForRole } from "@/lib/roleRouting";
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

  // Load remembered email
  useEffect(() => {
    const remembered = localStorage.getItem("rememberedEmail");
    if (remembered) {
      setEmail(remembered);
      setRememberMe(true);
    }
  }, []);

  const validateForm = () => {
    const errors = {};

    if (!email.trim()) {
      errors.email = "Email is required";
    } else if (!validateEmail(email)) {
      errors.email = "Invalid email address";
    }

    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 6) {
      errors.password = "Password is too short";
    }

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
        setSuccess("✓ Login successful! Redirecting...");

        if (rememberMe) {
          localStorage.setItem("rememberedEmail", email);
        } else {
          localStorage.removeItem("rememberedEmail");
        }

        navigating = true;
        
        // Use the role from Auth metadata for instantaneous routing
        const userRole = result.user?.user_metadata?.role;
        
        setTimeout(() => {
          router.replace(getDashboardPathForRole(userRole));
        }, 800);
        return;
      } else {
        let errorMsg = result.error || "Login failed. Please try again.";

        if (errorMsg.includes("rate limit") || errorMsg.includes("too many requests")) {
          errorMsg = "⏱️ Too many login attempts. Please wait a few minutes before trying again.";
        } else if (errorMsg.includes("Invalid login credentials")) {
          errorMsg = "❌ Invalid email or password. Please check and try again.";
        } else if (errorMsg.includes("Email not confirmed")) {
          errorMsg = "📧 Please confirm your email before logging in.";
        }

        setError(errorMsg);
      }
    } catch (err) {
      let errorMsg = "An unexpected error occurred. Please try again.";

      if (err.message.includes("rate limit")) {
        errorMsg = "⏱️ Too many login attempts. Please wait a few minutes before trying again.";
      }

      setError(errorMsg);
      console.warn("Login warning:", err?.message || err);
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
              <h1 className="fw-bold display-3">Institutional Login</h1>
              <p className="lead">Authorized access only for students and departmental staff members.</p>

              <ul className="feature-list mt-4">
                <li>Authenticated Database Synchronization</li>
                <li>Secure Role-Based Communication</li>
                <li>Official Degree Verification Portal</li>
              </ul>
            </div>
          </Col>

          {/* Right Side - Login Form */}
          <Col lg={6} md={10} sm={12} className="mx-auto">
            <div className="auth-card-enhanced p-5 shadow-lg">
              {/* Header */}
              <div className="auth-header-enhanced mb-4">
                <div className="display-1 mb-3">🛡️</div>
                <h2 className="fw-bold">Secure Access</h2>
                <p className="text-muted">Smart Student Clearance & Degree Issuance</p>
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

              {/* Login Form */}
              <Form onSubmit={handleLogin}>
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
                      className={`input-enhanced ${formErrors.email ? "is-invalid" : ""}`}
                      disabled={loading}
                    />
                  </InputGroup>
                  {formErrors.email && (
                    <div className="form-error-enhanced">⚠️ {formErrors.email}</div>
                  )}
                </div>

                {/* Password Field */}
                <div className="form-group-enhanced">
                  <Form.Label className="form-label-enhanced">Password</Form.Label>
                  <InputGroup className="input-group-enhanced">
                    <InputGroup.Text>🔒</InputGroup.Text>
                    <Form.Control
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
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
                  {formErrors.password && (
                    <div className="form-error-enhanced">⚠️ {formErrors.password}</div>
                  )}
                </div>

                {/* Remember Me & Forgot Password */}
                <Row className="mb-4">
                  <Col xs={6}>
                    <Form.Check
                      type="checkbox"
                      id="rememberMe"
                      label="Remember me"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="form-check-enhanced fw-500"
                    />
                  </Col>
                  <Col xs={6} className="text-end">
                    <a href="#" className="link-enhanced">Forgot password?</a>
                  </Col>
                </Row>

                {/* Login Button */}
                <Button
                  type="submit"
                  size="lg"
                  className="btn-auth-enhanced btn-primary-enhanced w-100 mb-3"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      ➜ Sign In
                    </>
                  )}
                </Button>

                {/* Divider */}
                <div className="divider-enhanced">
                  <span>Don't have an account?</span>
                </div>

                {/* Sign Up Link */}
                <Button
                  type="button"
                  size="lg"
                  className="btn-auth-enhanced btn-secondary-enhanced w-100"
                  onClick={() => router.push("/signup")}
                >
                  Create Account Now
                </Button>
              </Form>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
}
