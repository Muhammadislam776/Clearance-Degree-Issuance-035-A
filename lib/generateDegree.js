import { jsPDF } from "jspdf";

export const generateDegreePDF = (studentName, rollNumber, cgpa = "3.8", issueDate = new Date().toLocaleDateString()) => {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4"
  });

  // Background Base
  doc.setFillColor(250, 250, 252);
  doc.rect(0, 0, 297, 210, "F");

  // Elegant Border
  doc.setDrawColor(79, 70, 229); // Indigo border
  doc.setLineWidth(2);
  doc.rect(10, 10, 277, 190, "S");
  doc.setDrawColor(200, 200, 220); // Inner secondary border
  doc.setLineWidth(0.5);
  doc.rect(15, 15, 267, 180, "S");

  // Institution Name
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(36);
  doc.text("COMSATS UNIVERSITY ISLAMABAD", 148.5, 45, { align: "center" });

  // Subtitle
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(16);
  doc.text("OFFICIAL DEGREE CERTIFICATE", 148.5, 60, { align: "center" });

  // Body text
  doc.setTextColor(51, 65, 85);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(18);
  doc.text("This is to certify that", 148.5, 90, { align: "center" });

  // Student Name
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(32);
  doc.text(studentName.toUpperCase(), 148.5, 110, { align: "center" });

  // Roll Number and Honors
  doc.setTextColor(71, 85, 105);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.text(`Registration No: ${rollNumber}`, 148.5, 125, { align: "center" });
  doc.text(`has successfully completed the requirements for the degree`, 148.5, 140, { align: "center" });

  // Degree Name
  doc.setTextColor(79, 70, 229);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("BACHELOR OF SCIENCE IN COMPUTER SCIENCE", 148.5, 155, { align: "center" });

  // Footer Details
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text(`CGPA: ${cgpa}`, 50, 185);
  doc.text(`Date of Issue: ${issueDate}`, 210, 185);

  // Signatures
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.5);
  doc.line(40, 175, 100, 175);
  doc.text("Vice Chancellor", 70, 170, { align: "center" });

  doc.line(200, 175, 260, 175);
  doc.text("Registrar", 230, 170, { align: "center" });

  // Save the document
  doc.save(`Degree_${rollNumber.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
};
