'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { getDashboardPathForRole, normalizeRole } from '@/lib/roleRouting';
import { Container, Spinner, Row, Col } from 'react-bootstrap';

export default function ProtectedRoute({ 
  children, 
  requiredRoles = [], // Array of allowed roles or single role string
  fallbackPath = '/login' 
}) {
  const router = useRouter();
  const { isAuthenticated, profile, loading } = useAuth();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      // Not logged in - redirect to login
      router.push(fallbackPath);
      return;
    }

    // Check role authorization
    const allowedRoles = typeof requiredRoles === 'string' ? [requiredRoles] : requiredRoles;

    if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
      const role = normalizeRole(profile?.role);
      const normalizedAllowed = allowedRoles.map((r) => normalizeRole(r));
      const hasRequiredRole = !!role && normalizedAllowed.includes(role);

      if (!hasRequiredRole) {
        // Wrong role - redirect to proper dashboard for their role
        router.push(getDashboardPathForRole(role));
        return;
      }
    }

    setAuthorized(true);
  }, [isAuthenticated, profile, loading, requiredRoles, router, fallbackPath]);

  // Loading state
  if (loading) {
    return (
      <Container fluid className="d-flex justify-content-center align-items-center min-vh-100" style={{ backgroundColor: '#f8f9fa' }}>
        <div className="text-center">
          <Spinner animation="border" role="status" variant="primary" className="mb-3">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="text-muted mt-3">Loading your dashboard...</p>
        </div>
      </Container>
    );
  }

  // Unauthorized
  if (!authorized) {
    return (
      <Container fluid className="d-flex justify-content-center align-items-center min-vh-100">
        <Row className="w-100">
          <Col md={6} className="mx-auto text-center">
            <div style={{ padding: '40px 20px' }}>
              <Spinner animation="border" role="status" className="mb-3">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
              <p className="text-muted mt-3">Checking permissions...</p>
            </div>
          </Col>
        </Row>
      </Container>
    );
  }

  return children;
}
