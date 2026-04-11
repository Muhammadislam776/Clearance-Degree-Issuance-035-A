"use client";
import React, { useState } from "react";
import { Modal, Form, Button, ProgressBar } from "react-bootstrap";

export default function UploadDocuments({ show, onClose, department }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    try {
      // Simulate upload progress
      for (let i = 0; i <= 100; i += 10) {
        setUploadProgress(i);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Here you would actually upload files to Supabase storage
      console.log("Files uploaded:", files);
      
      setFiles([]);
      setUploadProgress(0);
      onClose();
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton className="border-0">
        <Modal.Title className="fw-bold">Upload Documents</Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        <p className="text-muted mb-3">
          Upload required documents for <strong>{department}</strong>
        </p>

        <Form.Group className="mb-4">
          <Form.Label className="fw-bold mb-3">Select Files</Form.Label>
          <div
            style={{
              border: "2px dashed #0d6efd",
              borderRadius: "8px",
              padding: "30px",
              textAlign: "center",
              backgroundColor: "#f0f3ff",
              cursor: "pointer",
              transition: "all 0.3s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#e7f0ff";
              e.currentTarget.style.borderColor = "#0056b3";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#f0f3ff";
              e.currentTarget.style.borderColor = "#0d6efd";
            }}
          >
            <input
              type="file"
              multiple
              onChange={handleFileSelect}
              style={{ display: "none" }}
              id="file-input"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            />
            <label htmlFor="file-input" style={{ cursor: "pointer", marginBottom: 0 }}>
              <p className="mb-2" style={{ fontSize: "2rem" }}>📁</p>
              <p className="fw-bold mb-1">Click to upload or drag and drop</p>
              <p className="text-muted small">PDF, DOC, JPG, PNG (max 10MB)</p>
            </label>
          </div>
        </Form.Group>

        {files.length > 0 && (
          <div className="mb-4">
            <h6 className="fw-bold mb-2">Selected Files ({files.length})</h6>
            {files.map((file, idx) => (
              <div key={idx} className="d-flex align-items-center mb-2 p-2 bg-light rounded">
                <span className="me-2">📄</span>
                <small className="flex-grow-1">{file.name}</small>
                <small className="text-muted">{(file.size / 1024).toFixed(0)} KB</small>
              </div>
            ))}
          </div>
        )}

        {uploading && (
          <div className="mb-4">
            <p className="small text-muted mb-2">Uploading... {uploadProgress}%</p>
            <ProgressBar now={uploadProgress} animated />
          </div>
        )}
      </Modal.Body>
      <Modal.Footer className="border-0">
        <Button variant="secondary" onClick={onClose} disabled={uploading}>
          Cancel
        </Button>
        <Button 
          variant="primary" 
          onClick={handleUpload}
          disabled={files.length === 0 || uploading}
          className="fw-bold"
        >
          {uploading ? "Uploading..." : "Upload"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
