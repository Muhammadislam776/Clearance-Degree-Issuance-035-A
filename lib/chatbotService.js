/**
 * Chatbot Service - Handles logic for the AI Clearance Assistant
 */

const CLEARANCE_FAQS = [
  {
    keywords: ["how long", "duration", "time"],
    answer: "The clearance process typically takes 3-7 working days, depending on how quickly each department reviews your records. You can track real-time progress on your dashboard!"
  },
  {
    keywords: ["document", "upload", "attach"],
    answer: "You usually need to upload your Transcript, Library Clearance Slip, and Fee No-Dues Certificate. Check the 'Documents' section in your request for specific requirements."
  },
  {
    keywords: ["rejected", "rejected reason", "fix"],
    answer: "If a department rejects your request, they will provide 'Remarks'. You should address those notes (e.g., pay a fine or return a book) and then the department will re-evaluate."
  },
  {
    keywords: ["whatsapp", "contact", "call", "staff"],
    answer: "You can find direct WhatsApp links for each department focal person in the sidebar of the Chat section. Just select a department to see their contact info!"
  },
  {
    keywords: ["degree", "certificate", "when receive"],
    answer: "Once all departmental clearances are 'Approved', the Examiner will perform a final review. After their approval, your degree issuance process begins automatically."
  }
];

export const getBotResponse = async (userMessage) => {
  // Simulate network delay for "thinking" feel
  await new Promise(resolve => setTimeout(resolve, 800));

  const lowerMsg = userMessage.toLowerCase();
  
  // Find matching FAQ
  const match = CLEARANCE_FAQS.find(faq => 
    faq.keywords.some(keyword => lowerMsg.includes(keyword))
  );

  if (match) {
    return match.answer;
  }

  return "I'm your Clearance Assistant. I can help with questions about timing, documents, rejections, and how to contact departments. Could you please rephrase your question?";
};

export default { getBotResponse };
