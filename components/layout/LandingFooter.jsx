import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';

export default function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="landing-footer pt-5 pb-4">
      <Container>
        {/* Contact & Help Header */}
        <div className="footer-contact-header text-center mb-5">
          <div className="contact-badge-wrapper mb-3">
            <span className="contact-badge">
              <span className="badge-icon">📧</span> Get In Touch
            </span>
          </div>
          <h2 className="contact-title">Contact & Help</h2>
          <p className="contact-subtitle">
            Need assistance? We're here to help you with your academic journey
          </p>
        </div>

        {/* Support Card Container */}
        <div className="support-card-container mb-5">
          <Row className="g-0">
            {/* Left Column */}
            <Col md={6} className="support-col border-md-end border-bottom border-md-bottom-0">
              <div className="support-item p-4 p-lg-5">
                <div className="support-icon-box bg-purple">
                  <span className="support-icon">✉️</span>
                </div>
                <div className="support-content">
                  <h4 className="support-label">Email Support</h4>
                  <p className="support-value">islamjutt56.i@ail.com</p>
                  <p className="support-hint text-muted">Response within 24 hours</p>
                </div>
              </div>

              <div className="support-item p-4 p-lg-5">
                <div className="support-icon-box bg-teal">
                  <span className="support-icon">📍</span>
                </div>
                <div className="support-content">
                  <h4 className="support-label">Location</h4>
                  <p className="support-value">Department of Computer Science</p>
                  <p className="support-hint text-muted">COMSATS University Islamabad, Vehari Campus</p>
                </div>
              </div>
            </Col>

            {/* Right Column */}
            <Col md={6} className="support-col">
              <div className="support-item p-4 p-lg-5 border-bottom">
                <div className="support-icon-box bg-blue">
                  <span className="support-icon">🔑</span>
                </div>
                <div className="support-content">
                  <h4 className="support-label">Institutional Support</h4>
                  <p className="support-value">+92319-6590756</p>
                  <p className="support-hint text-muted">Direct line for urgent clearance issues</p>
                </div>
              </div>

              <div className="support-item p-4 p-lg-5">
                <div className="support-icon-box bg-red">
                  <span className="support-icon">🌐</span>
                </div>
                <div className="support-content">
                  <h4 className="support-label">University Website</h4>
                  <p className="support-value">www.comsats.edu.pk</p>
                  <p className="support-hint text-muted">Official university portal & resources</p>
                </div>
              </div>
            </Col>
          </Row>
        </div>

        {/* Footer Bottom Bar */}
        <div className="footer-bottom-bar d-flex flex-column flex-md-row justify-content-between align-items-center pt-4 border-top">
          <div className="footer-copyright text-muted small">
            &copy; {currentYear} Smart Clearance System. All rights reserved.
          </div>
          <div className="footer-brand-mini text-muted small">
            Crafted for Excellence in Education
          </div>
        </div>
      </Container>
    </footer>
  );
}
