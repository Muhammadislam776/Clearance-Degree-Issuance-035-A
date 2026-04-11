'use client';

import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Container, Spinner, Badge, ProgressBar, Button } from 'react-bootstrap';
import { useRouter } from 'next/navigation';
import StudentLayout from '@/components/layout/StudentLayout';
import { useAuth } from '@/lib/useAuth';
import { getStudentClearances, subscribeToClearanceUpdates } from '@/lib/clearanceService';
import { getUserConversations } from '@/lib/chatService';
import { getUserNotifications, subscribeToNotifications } from '@/lib/notificationService';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function StudentDashboardPage() {
  const router = useRouter();
  const { profile, loading: authLoading, user } = useAuth();
  const [clearances, setClearances] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && profile && user) {
      fetchAllData();
    }
  }, [authLoading, profile, user]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError('');

      const clearanceResult = await getStudentClearances(user.id);
      if (clearanceResult.success) {
        setClearances(clearanceResult.data || []);
      }

      const convResult = await getUserConversations(user.id, { limit: 10 });
      if (convResult.success) {
        setConversations(convResult.data || []);
      }

      const notifResult = await getUserNotifications(user.id, { limit: 10 });
      if (notifResult.success) {
        setNotifications(notifResult.data || []);
        setUnreadCount(notifResult.unreadCount || 0);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      approved: 'success', rejected: 'danger', pending: 'warning',
      submitted: 'info', under_review: 'primary', returned: 'secondary',
    };
    return colors[status] || 'secondary';
  };

  if (loading && authLoading) {
    return (
      <StudentLayout>
        <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <div className="text-center">
            <Spinner animation="border" role="status" variant="primary" className="mb-3">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
            <p className="text-muted">Loading your dashboard...</p>
          </div>
        </Container>
      </StudentLayout>
    );
  }

  return (
    <ProtectedRoute requiredRoles={['student']}>
      <StudentLayout>
        <Container fluid className="py-4">
          {/* Welcome Header */}
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '40px',
            borderRadius: '16px',
            marginBottom: '40px',
            color: 'white',
            boxShadow: '0 10px 40px rgba(102, 126, 234, 0.3)',
          }}>
            <Row className="align-items-center">
              <Col md={8}>
                <h1 className="fw-bold mb-2">Welcome back, {profile?.name}! 🎓</h1>
                <p className="lead mb-0 opacity-75">Track your clearance and manage your degree issuance</p>
              </Col>
              <Col md={4} className="text-end">
                <p className="mb-1 small">📧 {profile?.email}</p>
                <p className="mb-0 small">📍 Department</p>
              </Col>
            </Row>
          </div>

          {error && (
            <div className="alert alert-danger alert-dismissible fade show mb-4" role="alert">
              {error}
              <button type="button" className="btn-close" onClick={() => setError('')}></button>
            </div>
          )}

          {/* Stats Grid */}
          <Row className="mb-4">
            <Col md={3} className="mb-3">
              <Card className="text-center" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: 'none', borderRadius: '12px' }}>
                <Card.Body>
                  <h3 className="mb-2">📋</h3>
                  <p className="text-muted small mb-2">Total Requests</p>
                  <h2 className="fw-bold" style={{ color: '#667eea' }}>{clearances.length}</h2>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3} className="mb-3">
              <Card className="text-center" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: 'none', borderRadius: '12px' }}>
                <Card.Body>
                  <h3 className="mb-2">✅</h3>
                  <p className="text-muted small mb-2">Approved</p>
                  <h2 className="fw-bold" style={{ color: '#198754' }}>
                    {clearances.filter(c => c.status === 'approved').length}
                  </h2>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3} className="mb-3">
              <Card className="text-center" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: 'none', borderRadius: '12px' }}>
                <Card.Body>
                  <h3 className="mb-2">⏳</h3>
                  <p className="text-muted small mb-2">In Progress</p>
                  <h2 className="fw-bold" style={{ color: '#ffc107' }}>
                    {clearances.filter(c => ['pending', 'submitted', 'under_review'].includes(c.status)).length}
                  </h2>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3} className="mb-3">
              <Card className="text-center" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: 'none', borderRadius: '12px' }}>
                <Card.Body>
                  <h3 className="mb-2">💬</h3>
                  <p className="text-muted small mb-2">Conversations</p>
                  <h2 className="fw-bold" style={{ color: '#0dcaf0' }}>{conversations.length}</h2>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Action Buttons */}
          <Row className="mb-4">
            <Col md={4} className="mb-3">
              <Button variant="primary" size="lg" className="w-100" style={{ borderRadius: '12px', padding: '12px', fontWeight: 'bold' }} onClick={() => router.push('/student/clearance')}>
                📝 New Request
              </Button>
            </Col>
            <Col md={4} className="mb-3">
              <Button variant="outline-primary" size="lg" className="w-100" style={{ borderRadius: '12px', padding: '12px', fontWeight: 'bold' }} onClick={() => router.push('/student/clearance')}>
                📤 Upload Documents
              </Button>
            </Col>
            <Col md={4} className="mb-3">
              <Button variant="outline-primary" size="lg" className="w-100" style={{ borderRadius: '12px', padding: '12px', fontWeight: 'bold' }} onClick={() => router.push('/student/chat')}>
                💬 Chat
              </Button>
            </Col>
          </Row>

          {/* Recent Clearances */}
          <h5 className="fw-bold mb-3">📋 Recent Clearances</h5>
          {clearances.length > 0 ? (
            <Row className="mb-4">
              {clearances.slice(0, 3).map(clearance => (
                <Col md={6} lg={4} key={clearance.id} className="mb-3">
                  <Card style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: 'none', borderRadius: '12px' }}>
                    <Card.Body>
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <h6 className="fw-bold mb-0">{clearance.request_type.toUpperCase()} Clearance</h6>
                        <Badge bg={getStatusColor(clearance.status)}>
                          {clearance.status.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-muted small mb-2">
                        📅 {clearance.submission_date ? new Date(clearance.submission_date).toLocaleDateString() : 'Not submitted'}
                      </p>
                      <Button variant="sm" className="w-100" onClick={() => router.push(`/student/clearance?id=${clearance.id}`)}>
                        View Details
                      </Button>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          ) : (
            <Card className="mb-4" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: 'none', borderRadius: '12px', textAlign: 'center', padding: '40px' }}>
              <h5 className="text-muted mb-3">📭 No Requests Yet</h5>
              <Button variant="primary" onClick={() => router.push('/student/clearance')}>
                Submit Your First Request
              </Button>
            </Card>
          )}

          {/* Recent Notifications */}
          {notifications.length > 0 && (
            <>
              <h5 className="fw-bold mb-3">🔔 Notifications ({unreadCount} unread)</h5>
              <Card style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: 'none', borderRadius: '12px', marginBottom: '30px' }}>
                <Card.Body>
                  {notifications.slice(0, 5).map(notif => (
                    <div key={notif.id} className="mb-3 pb-3" style={{ borderBottom: '1px solid #e9ecef' }}>
                      <p className="mb-1 fw-bold small">{notif.title}</p>
                      <p className="text-muted small mb-0">{notif.message}</p>
                    </div>
                  ))}
                </Card.Body>
              </Card>
            </>
          )}
        </Container>
      </StudentLayout>
    </ProtectedRoute>
  );
}
