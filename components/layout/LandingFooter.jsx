import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';

export default function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="landing-footer py-5">
      <Container>
        <Row className="gy-4">
          {/* Brand Section */}
          <Col lg={4} md={12} className="footer-brand-col">
            <div className="footer-logo mb-3">
              <span className="logo-icon">🎓</span>
              <span className="logo-text">Smart Clearance</span>
            </div>
            <p className="footer-description text-muted">
              The next generation of academic administration. Efficiency, transparency, and security for every student and faculty member.
            </p>
          </Col>

          {/* Services Section */}
          <Col lg={4} md={6}>
            <h5 className="footer-title">Our Services</h5>
            <ul className="footer-services-list list-unstyled">
              <li>
                <span className="service-bullet">⚡</span>
                Digital Student Clearance
              </li>
              <li>
                <span className="service-bullet">🔍</span>
                Real-time Degree Tracking
              </li>
              <li>
                <span className="service-bullet">📄</span>
                Digital Degree Issuance
              </li>
              <li>
                <span className="service-bullet">🤖</span>
                AI-Powered Support Desk
              </li>
            </ul>
          </Col>

          {/* Contact Section */}
          <Col lg={4} md={6}>
            <h5 className="footer-title">Get In Touch</h5>
            <div className="contact-links d-flex flex-column gap-3">
              <a href="mailto:support@smartclearance.edu" className="contact-link">
                <i className="bi bi-envelope-fill me-2"></i>
                support@smartclearance.edu
              </a>
              <a href="https://wa.me/1234567890" target="_blank" rel="noopener noreferrer" className="contact-link">
                <i className="bi bi-whatsapp me-2"></i>
                +1 (234) 567-890
              </a>
              <a href="https://instagram.com/smartclearance" target="_blank" rel="noopener noreferrer" className="contact-link">
                <i className="bi bi-instagram me-2"></i>
                @smartclearance
              </a>
            </div>
          </Col>
        </Row>

        <hr className="footer-divider my-5" />

        <div className="footer-bottom d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
          <p className="copyright mb-0 text-muted small">
            &copy; {currentYear} Smart Clearance System. All rights reserved.
          </p>
          <div className="footer-tagline small text-muted">
            Crafted for Excellence in Education
          </div>
        </div>
      </Container>
    </footer>
  );
}
