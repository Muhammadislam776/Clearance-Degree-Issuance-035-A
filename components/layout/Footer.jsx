import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer-enhanced mt-auto pt-5 pb-3 bg-dark text-light border-0 footer-dark">
      <Container>
        <Row className="gy-4">
          <Col lg={4} md={6}>
            <div className="d-flex align-items-center mb-3">
              <span className="fs-4 fw-bold me-2 text-primary-light">🎓</span>
              <h5 className="mb-0 fw-bold">Smart Clearance</h5>
            </div>
            <p className="text-light opacity-75 small pe-lg-4">
              Streamlining the university clearance and degree issuance process through an efficient, automated, and secure digital ecosystem.
            </p>
            <div className="social-icons d-flex gap-3 mt-3">
              <a href="#" className="text-light opacity-75 "><i className="bi bi-twitter"></i> </a>
              <a href="#" className="text-light opacity-75 "><i className="bi bi-linkedin"></i> </a>
              <a href="#" className="text-light opacity-75 "><i className="bi bi-github"></i> </a>
            </div>
          </Col>
          
          <Col lg={2} md={6}>
            <h6 className="fw-bold mb-3">Quick Links</h6>
            <ul className="list-unstyled footer-links small">
              <li className="mb-2"><Link href="/" className="text-light opacity-75 text-decoration-none">Home</Link></li>
              <li className="mb-2"><Link href="/login" className="text-light opacity-75 text-decoration-none">Portals</Link></li>
              <li className="mb-2"><Link href="/student" className="text-light opacity-75 text-decoration-none">Student Portal</Link></li>
              <li className="mb-2"><Link href="/department" className="text-light opacity-75 text-decoration-none">Department Portal</Link></li>
            </ul>
          </Col>

          <Col lg={3} md={6}>
            <h6 className="fw-bold mb-3">Support</h6>
            <ul className="list-unstyled footer-links small">
              <li className="mb-2"><a href="#" className="text-light opacity-75 text-decoration-none">Help Center</a></li>
              <li className="mb-2"><a href="#" className="text-light opacity-75 text-decoration-none">Documentation</a></li>
              <li className="mb-2"><a href="#" className="text-light opacity-75 text-decoration-none">Contact IT Desk</a></li>
              <li className="mb-2"><a href="#" className="text-light opacity-75 text-decoration-none">System Status</a></li>
            </ul>
          </Col>

          <Col lg={3} md={6}>
            <h6 className="fw-bold mb-3">Legal & Security</h6>
            <ul className="list-unstyled footer-links small">
              <li className="mb-2"><a href="#" className="text-light opacity-75 text-decoration-none">Privacy Policy</a></li>
              <li className="mb-2"><a href="#" className="text-light opacity-75 text-decoration-none">Terms of Service</a></li>
              <li className="mb-2"><a href="#" className="text-light opacity-75 text-decoration-none">Cookie Policy</a></li>
              <li className="mb-2"><a href="#" className="text-light opacity-75 text-decoration-none">Data Compliance</a></li>
            </ul>
          </Col>
        </Row>

        <hr className="my-4 text-light opacity-75" />

        <div className="d-flex flex-column flex-md-row justify-content-between align-items-center">
          <p className="mb-0 small text-light opacity-75">
            &copy; {currentYear} Smart Clearance System. All rights reserved.
          </p>
          <p className="mb-0 small text-light opacity-75 mt-2 mt-md-0">
            Designed for Excellence.
          </p>
        </div>
      </Container>

      
    </footer>
  );
}
